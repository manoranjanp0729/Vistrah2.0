import uuid

import bcrypt
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.database import engine
from app.main import app


def test_admin_endpoints_query_fresh_database_and_enforce_roles():
    suffix = uuid.uuid4().hex
    password = "Local-Admin-Test-Only-482!"
    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    users = [
        {
            "id": str(uuid.uuid4()),
            "email": f"admin-{suffix}@test.invalid",
            "full_name": "Disposable Admin Test",
            "referral_code": f"ADM-{suffix[:12]}",
            "role": "ADMIN",
        },
        {
            "id": str(uuid.uuid4()),
            "email": f"customer-{suffix}@test.invalid",
            "full_name": "Disposable Customer Test",
            "referral_code": f"CUS-{suffix[:12]}",
            "role": "CUSTOMER",
        },
    ]

    with engine.begin() as connection:
        for user in users:
            connection.execute(
                text("""
                    INSERT INTO users
                        (id, email, full_name, referral_code, password_hash, role)
                    VALUES
                        (:id, :email, :full_name, :referral_code, :password_hash, :role)
                """),
                {**user, "password_hash": password_hash},
            )

    paths = [
        "/api/v1/admin/overview",
        "/api/v1/admin/data-sources",
        "/api/v1/admin/acquisition-jobs",
        "/api/v1/admin/source-records",
        "/api/v1/admin/providers",
        "/api/v1/admin/provider-services",
        "/api/v1/admin/service-categories",
        "/api/v1/admin/service-subcategories",
        "/api/v1/admin/master-services",
        "/api/v1/admin/payments",
        "/api/v1/admin/payment-refunds",
        "/api/v1/admin/payment-settlements",
        "/api/v1/admin/company-profile",
        "/api/v1/admin/company-shareholders",
        "/api/v1/admin/company-bank-accounts",
        "/api/v1/admin/company-employees",
        "/api/v1/admin/review-queue",
        "/api/v1/admin/audit-logs",
    ]

    try:
        with TestClient(app) as client:
            admin_login = client.post(
                "/api/v1/auth/login",
                json={"email": users[0]["email"], "password": password},
            )
            assert admin_login.status_code == 200, admin_login.text
            admin_headers = {
                "Authorization": f"Bearer {admin_login.json()['access_token']}"
            }

            customer_login = client.post(
                "/api/v1/auth/login",
                json={"email": users[1]["email"], "password": password},
            )
            assert customer_login.status_code == 200, customer_login.text
            customer_headers = {
                "Authorization": f"Bearer {customer_login.json()['access_token']}"
            }

            assert client.get(paths[0]).status_code == 401
            assert client.get(paths[0], headers=customer_headers).status_code == 403

            for path in paths:
                response = client.get(path, headers=admin_headers)
                assert response.status_code == 200, f"{path}: {response.text}"
                response.json()

            tables = connectionless_table_names()
            required = {
                "users", "categories", "services", "requirement_fields",
                "applications", "documents", "payments", "referrals",
                "application_status_history", "service_categories",
                "service_subcategories", "master_services", "data_sources",
                "acquisition_jobs", "source_records", "providers",
                "provider_services", "review_queue", "audit_logs",
                "payment_transactions", "payment_refunds", "payment_settlements",
                "company_profile", "company_shareholders",
                "company_bank_accounts", "company_employees",
            }
            assert required <= tables, f"Missing tables: {sorted(required - tables)}"

            with engine.connect() as connection:
                provenance_columns = set(connection.execute(text("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'source_records'
                """)).scalars().all())
            required_provenance = {
                "data_source_id", "acquisition_job_id", "external_id", "source_name",
                "source_url", "record_url", "raw_data", "extracted_data",
                "content_hash", "status", "collected_at", "reviewed_at",
            }
            assert required_provenance <= provenance_columns, (
                f"Missing acquisition provenance columns: "
                f"{sorted(required_provenance - provenance_columns)}"
            )
    finally:
        with engine.begin() as connection:
            connection.execute(
                text("DELETE FROM users WHERE id = ANY(CAST(:ids AS UUID[]))"),
                {"ids": [user["id"] for user in users]},
            )


def connectionless_table_names():
    with engine.connect() as connection:
        rows = connection.execute(text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
        """)).scalars().all()
    return set(rows)
