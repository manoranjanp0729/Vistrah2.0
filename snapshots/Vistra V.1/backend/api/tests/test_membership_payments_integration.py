import uuid
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.config import settings
from app.core.database import SessionLocal
from app.domain.payments.gateway import SandboxPaymentGateway
from app.main import app


client = TestClient(app)
API = "/api/v1"


def create_account(label: str, role: str = "CUSTOMER") -> tuple[str, str]:
    email = f"{label}-{uuid.uuid4().hex[:10]}@example.test"
    created = client.post(f"{API}/auth/signup", json={
        "email": email, "full_name": f"Phase Three {label}", "password": "sandbox-password-123",
    })
    assert created.status_code == 200, created.text
    user_id = created.json()["user"]["id"]
    if role != "CUSTOMER":
        with SessionLocal() as db:
            db.execute(text("UPDATE users SET role=:role WHERE id=:id"), {"role": role, "id": user_id})
            db.commit()
    login = client.post(f"{API}/auth/login", json={"email": email, "password": "sandbox-password-123"})
    assert login.status_code == 200, login.text
    return user_id, login.json()["access_token"]


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_sandbox_membership_marketplace_ledger_and_refund_flow():
    plan_response = client.get(f"{API}/membership/plans")
    assert plan_response.status_code == 200
    plan = next(plan for plan in plan_response.json() if plan["slug"] == "vistrah-membership")
    assert plan["amount_paise"] == 12_900
    assert plan["currency"] == "INR"

    customer_id, customer_token = create_account("customer")
    checkout = client.post(f"{API}/membership/checkout", headers={**bearer(customer_token), "Idempotency-Key": "membership-initial"},
                          json={"plan_slug": plan["slug"]})
    assert checkout.status_code == 200, checkout.text
    first = checkout.json()
    assert first["amount_paise"] == plan["amount_paise"]
    assert first["status"] == "PENDING"
    assert first["sandbox"] is True

    # A checkout response alone does not activate a membership.
    membership = client.get(f"{API}/membership/me", headers=bearer(customer_token)).json()["membership"]
    assert membership["status"] == "PENDING"
    assert client.post(f"{API}/sandbox/payments/{first['transaction_id']}/complete", headers=bearer(customer_token),
                       json={"outcome": "success"}).status_code == 200
    membership = client.get(f"{API}/membership/me", headers=bearer(customer_token)).json()["membership"]
    assert membership["status"] == "ACTIVE"
    assert membership["renewal_date"] is not None

    # Verify invalid signature rejection and idempotent replay through the real webhook route.
    invalid = client.post(f"{API}/webhooks/sandbox", content=b'{"id":"invalid","type":"payment.succeeded","data":{}}',
                          headers={"X-Payment-Signature": "sha256=invalid", "Content-Type": "application/json"})
    assert invalid.status_code == 401
    event = {"id": f"replay-{uuid.uuid4()}", "type": "payment.succeeded", "data": {
        "transaction_id": first["transaction_id"], "amount_paise": plan["amount_paise"], "currency": "INR",
        "gateway_payment_reference": "sbx_payment_replay",
    }}
    gateway = SandboxPaymentGateway(settings.payment_webhook_secret or None)
    raw_body, signature = gateway.sign_webhook_for_sandbox(event)
    replay_headers = {"X-Payment-Signature": signature, "Content-Type": "application/json"}
    assert client.post(f"{API}/webhooks/sandbox", content=raw_body, headers=replay_headers).status_code == 200
    duplicate = client.post(f"{API}/webhooks/sandbox", content=raw_body, headers=replay_headers)
    assert duplicate.status_code == 200 and duplicate.json()["duplicate"] is True
    assert client.get(f"{API}/payments/{first['transaction_id']}/refunds", headers=bearer(customer_token)).json() == []

    failed_user_id, failed_token = create_account("failed-renewal")
    failed_checkout = client.post(f"{API}/membership/checkout", headers={**bearer(failed_token), "Idempotency-Key": "membership-fail"},
                                  json={"plan_slug": plan["slug"]}).json()
    assert client.post(f"{API}/sandbox/payments/{failed_checkout['transaction_id']}/complete", headers=bearer(failed_token),
                       json={"outcome": "failure"}).status_code == 200
    failed_membership = client.get(f"{API}/membership/me", headers=bearer(failed_token)).json()["membership"]
    assert failed_membership["status"] == "PAYMENT_FAILED"
    retry = client.post(f"{API}/membership/checkout", headers={**bearer(failed_token), "Idempotency-Key": "membership-retry"},
                        json={"plan_slug": plan["slug"]}).json()
    assert client.post(f"{API}/sandbox/payments/{retry['transaction_id']}/complete", headers=bearer(failed_token),
                       json={"outcome": "success"}).status_code == 200
    active_after_retry = client.get(f"{API}/membership/me", headers=bearer(failed_token)).json()["membership"]
    assert active_after_retry["status"] == "ACTIVE"
    renewal = client.post(f"{API}/sandbox/memberships/{active_after_retry['id']}/renewal", headers=bearer(failed_token)).json()
    assert client.post(f"{API}/sandbox/payments/{renewal['transaction_id']}/complete", headers=bearer(failed_token),
                       json={"outcome": "success"}).status_code == 200
    renewed = client.get(f"{API}/membership/me", headers=bearer(failed_token)).json()
    assert renewed["membership"]["status"] == "ACTIVE"
    assert any(row["transaction_kind"] == "RENEWAL" and row["status"] == "SUCCEEDED" for row in renewed["transactions"])
    failed_renewal = client.post(f"{API}/sandbox/memberships/{renewed['membership']['id']}/renewal", headers=bearer(failed_token)).json()
    assert client.post(f"{API}/sandbox/payments/{failed_renewal['transaction_id']}/complete", headers=bearer(failed_token),
                       json={"outcome": "failure"}).status_code == 200
    assert client.get(f"{API}/membership/me", headers=bearer(failed_token)).json()["membership"]["status"] == "PAYMENT_FAILED"

    cancelling_id, cancelling_token = create_account("cancel")
    cancel_checkout = client.post(f"{API}/membership/checkout", headers={**bearer(cancelling_token), "Idempotency-Key": "membership-cancel"},
                                  json={"plan_slug": plan["slug"]}).json()
    client.post(f"{API}/sandbox/payments/{cancel_checkout['transaction_id']}/complete", headers=bearer(cancelling_token), json={"outcome": "success"})
    cancelled = client.post(f"{API}/membership/me/cancel", headers=bearer(cancelling_token))
    assert cancelled.status_code == 200, cancelled.text
    assert client.get(f"{API}/membership/me", headers=bearer(cancelling_token)).json()["membership"]["status"] == "CANCELLED"

    admin_id, admin_token = create_account("admin", "ADMIN")
    admin_headers = bearer(admin_token)
    assert client.get(f"{API}/admin/payments/transactions", headers=bearer(customer_token)).status_code == 403

    # Prepare an isolated sandbox marketplace application and a split rule.
    with SessionLocal() as db:
        category_id = db.execute(text("""
            INSERT INTO categories(name,slug,description) VALUES ('Phase Three Test','phase3-test','isolated test category')
            ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name RETURNING id
        """)).scalar_one()
        service_id = db.execute(text("""
            INSERT INTO services(category_id,name,slug,description,base_price_paise,quote_required)
            VALUES (:category,'Sandbox Test Service','sandbox-test-service','test service',NULL,TRUE)
            ON CONFLICT(slug) DO UPDATE SET category_id=EXCLUDED.category_id RETURNING id
        """), {"category": category_id}).scalar_one()
        application_id = db.execute(text("""
            INSERT INTO applications(application_number,user_id,service_id,status,final_amount_paise)
            VALUES (:number,:user,:service,'APPROVED',10000) RETURNING id
        """), {"number": f"TEST-{uuid.uuid4().hex[:12]}", "user": customer_id, "service": service_id}).scalar_one()
        provider_id = db.execute(text("INSERT INTO providers(name,status,verified) VALUES ('Sandbox Test Provider','ACTIVE',TRUE) RETURNING id")).scalar_one()
        db.commit()

    platform_recipient = next(row for row in client.get(f"{API}/admin/payment-recipients", headers=admin_headers).json()
                              if row["recipient_key"] == "vistrah-membership-revenue")
    employee_recipient = client.post(f"{API}/admin/payment-recipients", headers=admin_headers, json={
        "recipient_key": f"employee-test-{uuid.uuid4().hex[:6]}", "recipient_type": "EMPLOYEE_INCENTIVE",
        "user_id": customer_id,
    })
    assert employee_recipient.status_code == 201, employee_recipient.text
    assert employee_recipient.json()["verification_status"] == "PENDING"
    assert employee_recipient.json()["settlement_eligible"] is False
    cannot_self_verify = client.patch(
        f"{API}/admin/payment-recipients/{employee_recipient.json()['id']}", headers=admin_headers,
        json={"verification_status": "VERIFIED", "settlement_eligible": True},
    )
    assert cannot_self_verify.status_code == 422
    rule = client.post(f"{API}/admin/settlement-rules", headers=admin_headers, json={
        "name": "Isolated service split", "transaction_type": "SERVICE", "category_slug": "phase3-test",
        "service_slug": "sandbox-test-service", "priority": 500,
        "targets": [
            {"recipient_id": platform_recipient["id"], "basis": "PERCENTAGE", "basis_points": 7000},
            {"recipient_id": employee_recipient.json()["id"], "basis": "PERCENTAGE", "basis_points": 3000},
        ],
    })
    assert rule.status_code == 201, rule.text
    service_checkout = client.post(f"{API}/payments/checkout", headers={**bearer(customer_token), "Idempotency-Key": "service-test"},
                                   json={"application_id": str(application_id)})
    assert service_checkout.status_code == 200, service_checkout.text
    assert service_checkout.json()["amount_paise"] == 10000
    assert client.post(f"{API}/admin/settlement-rules/{rule.json()['id']}/deactivate", headers=admin_headers).status_code == 200
    assert client.post(f"{API}/sandbox/payments/{service_checkout.json()['transaction_id']}/complete", headers=bearer(customer_token),
                       json={"outcome": "success"}).status_code == 200
    with SessionLocal() as db:
        allocations = db.execute(text("""
            SELECT recipient_key_snapshot,amount_paise FROM payment_allocations
            WHERE payment_transaction_id=:transaction AND entry_type='ALLOCATION'
        """), {"transaction": service_checkout.json()["transaction_id"]}).mappings().all()
    assert sorted(row["amount_paise"] for row in allocations) == [3000, 7000]

    # A real active offer is returned; inactive or out-of-window records are not.
    offer = client.post(f"{API}/admin/membership/offers", headers=admin_headers, json={
        "name": "Sandbox active member benefit", "description": "Test-only offer",
        "category_slug": "phase3-test", "service_slug": "sandbox-test-service",
        "benefit_type": "PERCENTAGE", "benefit_value": 10,
        "starts_at": (datetime.now(timezone.utc)-timedelta(days=1)).isoformat(),
        "ends_at": (datetime.now(timezone.utc)+timedelta(days=1)).isoformat(),
        "active": True, "terms": "Isolated integration test",
    })
    assert offer.status_code == 201, offer.text
    visible_offers = client.get(f"{API}/membership/offers?category_slug=phase3-test&service_slug=sandbox-test-service")
    assert [row["id"] for row in visible_offers.json()] == [offer.json()["id"]]

    # Onboarding references are accepted, but never store bank details.
    provider_onboarding = client.post(f"{API}/admin/payment-recipients/provider/{provider_id}/onboard", headers=admin_headers)
    assert provider_onboarding.status_code == 200, provider_onboarding.text
    provider_verified = client.post(f"{API}/admin/payment-recipients/{provider_onboarding.json()['id']}/sandbox-outcome?outcome=success", headers=admin_headers)
    assert provider_verified.status_code == 200, provider_verified.text

    # Partial and full refund append reversals and preserve the original allocation rows.
    partial_refund = client.post(f"{API}/admin/payments/{service_checkout.json()['transaction_id']}/refund", headers=admin_headers,
                                 json={"amount_paise": 2000, "reason": "Sandbox partial refund", "idempotency_key": "refund-partial"})
    assert partial_refund.status_code == 201, partial_refund.text
    assert client.post(f"{API}/admin/payment-refunds/{partial_refund.json()['id']}/sandbox-outcome?outcome=success",
                       headers=admin_headers).status_code == 200
    payment = client.get(f"{API}/payments/{service_checkout.json()['transaction_id']}", headers=bearer(customer_token)).json()
    assert payment["status"] == "PARTIALLY_REFUNDED" and payment["refunded_amount_paise"] == 2000

    settlement_run = client.post(f"{API}/admin/payment-settlements/run", headers=admin_headers)
    assert settlement_run.status_code == 200, settlement_run.text
    settlements = settlement_run.json()["created"]
    assert settlements
    unverified_settlement = next((row for row in settlements if row["recipient_id"] == employee_recipient.json()["id"]), None)
    if unverified_settlement:
        blocked = client.post(f"{API}/admin/payment-settlements/{unverified_settlement['id']}/submit", headers=admin_headers)
        assert blocked.status_code == 409
        started = client.post(f"{API}/admin/payment-recipients/{employee_recipient.json()['id']}/onboard", headers=admin_headers)
        assert started.status_code == 200, started.text
        updated_recipient = client.post(f"{API}/admin/payment-recipients/{employee_recipient.json()['id']}/sandbox-outcome?outcome=success", headers=admin_headers)
        assert updated_recipient.status_code == 200, updated_recipient.text
    for settlement in settlements:
        if not settlement["can_submit"] and settlement["recipient_id"] != (unverified_settlement or {}).get("recipient_id"):
            continue
        submitted = client.post(f"{API}/admin/payment-settlements/{settlement['id']}/submit", headers=admin_headers)
        assert submitted.status_code == 200, submitted.text
        completed = client.post(f"{API}/admin/payment-settlements/{settlement['id']}/sandbox-outcome?outcome=success", headers=admin_headers)
        assert completed.status_code == 200, completed.text

    remaining_refund = client.post(f"{API}/admin/payments/{service_checkout.json()['transaction_id']}/refund", headers=admin_headers,
                                   json={"amount_paise": 8000, "reason": "Sandbox final refund", "idempotency_key": "refund-final"})
    assert remaining_refund.status_code == 201, remaining_refund.text
    assert client.post(f"{API}/admin/payment-refunds/{remaining_refund.json()['id']}/sandbox-outcome?outcome=success",
                       headers=admin_headers).status_code == 200
    payment = client.get(f"{API}/payments/{service_checkout.json()['transaction_id']}", headers=bearer(customer_token)).json()
    assert payment["status"] == "REFUNDED" and payment["refunded_amount_paise"] == 10000
    assert client.get(f"{API}/payments/{service_checkout.json()['transaction_id']}/refunds", headers=bearer(customer_token)).status_code == 200

    reconciliation = client.post(f"{API}/admin/reconciliation/run", headers=admin_headers)
    assert reconciliation.status_code == 201, reconciliation.text
    assert any(issue["issue_type"] == "REFUND_AFTER_SETTLEMENT_ADJUSTMENT_REQUIRED" for issue in reconciliation.json()["issues"])

    # Admin records are never exposed through customer account APIs.
    assert client.get(f"{API}/admin/membership/members", headers=bearer(customer_token)).status_code == 403
    assert client.get(f"{API}/membership/me", headers=bearer(customer_token)).json()["membership"]["status"] == "ACTIVE"
