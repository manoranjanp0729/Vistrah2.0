"""Defensive security regression suite covering RBAC, IDOR, mass-assignment, PII masking, JWT, CORS & headers."""
from __future__ import annotations

import uuid
import jwt
import pytest
from sqlalchemy import select

from app.config import JWT_SECRET
from app.models import Audit, Payment, Plan, Provider, User
from app.security import issue_token, passwords
from app.v_ads_models import VAdsAdvertiser, VAdsVideo


def _create_user(db, role: str = "CUSTOMER", *, seller_enabled: bool = False) -> tuple[User, dict[str, str]]:
    user = User(
        name=f"{role.title()} SecUser",
        email=f"sec-{role.lower()}-{uuid.uuid4().hex[:8]}@vistrah.in",
        password_hash=passwords.hash("StrongPass!12345"),
        role=role,
        seller_enabled=seller_enabled,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    issued = issue_token(db, user)
    token = issued[0] if isinstance(issued, tuple) else issued
    return user, {"Authorization": f"Bearer {token}"}


def test_non_admin_blocked_across_all_admin_and_hr_routes(client, db):
    _, cust_headers = _create_user(db, "CUSTOMER")
    _, seller_headers = _create_user(db, "CUSTOMER", seller_enabled=True)

    protected_get_endpoints = [
        "/admin/overview",
        "/api/admin/console/summary",
        "/api/admin/moderation/v-ads",
        "/api/admin/moderation/sellers",
        "/api/admin/moderation/users",
        "/api/admin/compliance-summary",
        "/api/admin/pricing",
        "/api/admin/employees",
        "/api/admin/employees/salary-credits?pay_month=2026-11",
        "/admin/audit",
        "/admin/providers",
        "/admin/payments",
    ]
    for endpoint in protected_get_endpoints:
        unauth_res = client.get(endpoint)
        assert unauth_res.status_code == 401, f"Expected 401 on {endpoint}, got {unauth_res.status_code}"
        cust_res = client.get(endpoint, headers=cust_headers)
        assert cust_res.status_code == 403, f"Expected 403 for customer on {endpoint}, got {cust_res.status_code}"
        seller_res = client.get(endpoint, headers=seller_headers)
        assert seller_res.status_code == 403, f"Expected 403 for seller on {endpoint}, got {seller_res.status_code}"

    # Mutation endpoints also reject unauthenticated (401) and non-admin (403)
    assert client.post("/api/admin/employees", json={}).status_code == 401
    assert client.post("/api/admin/employees", headers=cust_headers, json={}).status_code == 403
    assert client.patch("/api/admin/employees/1", headers=seller_headers, json={}).status_code == 403
    assert client.delete("/api/admin/employees/1", headers=seller_headers).status_code == 403
    assert (
        client.post(
            "/api/admin/employees/salary-credits",
            headers=seller_headers,
            json={"pay_month": "2026-11"},
        ).status_code
        == 403
    )


def test_cross_user_idor_attempts_rejected_on_seller_and_payment_resources(client, db):
    owner, owner_headers = _create_user(db, "CUSTOMER", seller_enabled=True)
    attacker, attacker_headers = _create_user(db, "CUSTOMER", seller_enabled=True)

    # 1. Seller Business ownership isolation
    biz = Provider(
        slug=f"sec-biz-{uuid.uuid4().hex[:6]}",
        name="Owner Studio",
        company="Owner Studio Pvt Ltd",
        email="owner@vistrah.in",
        phone="+919900112233",
        address="MG Road, Bengaluru",
        location="Bengaluru",
        provenance="Security test fixture",
        owner_user_id=owner.id,
        verification_status="VERIFIED",
        active=True,
    )
    db.add(biz)
    db.flush()

    # Attacker cannot view or create application against owner's business
    attacker_biz_get = client.get(f"/seller/businesses/{biz.id}", headers=attacker_headers)
    assert attacker_biz_get.status_code in (403, 404)

    # 2. V Ads Advertiser & Video Targeting IDOR isolation
    adv = VAdsAdvertiser(
        id=f"adv-{uuid.uuid4().hex[:8]}",
        owner_id=owner.id,
        name="Owner Channel",
        handle=f"owner_{uuid.uuid4().hex[:6]}",
        status="APPROVED",
    )
    db.add(adv)
    db.flush()
    video = VAdsVideo(
        id=f"vid-{uuid.uuid4().hex[:8]}",
        advertiser_id=adv.id,
        title="Owner Promo Reel",
        description="Official promo",
        video_url="/videos/sample.mp4",
        status="APPROVED",
    )
    db.add(video)
    db.commit()

    # Attacker cannot read or submit targeting revisions on owner's V Ad
    idor_target_get = client.get(f"/v-ads/seller/targeting/{video.id}", headers=attacker_headers)
    assert idor_target_get.status_code in (403, 404)
    idor_target_post = client.post(
        f"/v-ads/seller/targeting/{video.id}",
        headers=attacker_headers,
        json={"latitude": 12.9716, "longitude": 77.5946, "targeting_radius_km": 5},
    )
    assert idor_target_post.status_code in (403, 404)

    # Owner CAN read their own targeting endpoint
    owner_target_get = client.get(f"/v-ads/seller/targeting/{video.id}", headers=owner_headers)
    assert owner_target_get.status_code == 200

    # 3. Payment simulation IDOR isolation
    plan = db.scalar(select(Plan).where(Plan.name == "VISTRAH Membership"))
    if plan is None:
        plan = Plan(name="VISTRAH Membership", amount=99900, currency="INR", days=365)
        db.add(plan)
        db.flush()
    payment = Payment(
        id=f"pay-{uuid.uuid4().hex[:10]}",
        user_id=owner.id,
        plan_id=plan.id,
        amount=99900,
        currency="INR",
        status="PENDING",
        mode="SANDBOX",
        idempotency_key=f"idem-{uuid.uuid4().hex[:8]}",
    )
    db.add(payment)
    db.commit()

    idor_pay = client.post(
        f"/payments/{payment.id}/simulate",
        headers=attacker_headers,
        json={"outcome": "SUCCEEDED"},
    )
    assert idor_pay.status_code == 404


def test_mass_assignment_of_privileged_fields_rejected(client, db):
    # 1. Registering with role='ADMIN' or is_admin=True is rejected by extra='forbid'
    reg_role = client.post(
        "/auth/register",
        json={
            "name": "Escalation Attempt",
            "email": f"escalate-{uuid.uuid4().hex[:6]}@vistrah.in",
            "password": "StrongPassword!123",
            "role": "ADMIN",
        },
    )
    assert reg_role.status_code == 422

    reg_flag = client.post(
        "/auth/register",
        json={
            "name": "Escalation Attempt",
            "email": f"escalate2-{uuid.uuid4().hex[:6]}@vistrah.in",
            "password": "StrongPassword!123",
            "is_admin": True,
        },
    )
    assert reg_flag.status_code == 422

    # 2. Updating /me with role='ADMIN' or seller_enabled=True is rejected
    user, user_headers = _create_user(db, "CUSTOMER")
    patch_role = client.patch(
        "/me",
        headers=user_headers,
        json={"name": "Updated Name", "phone": "+919876543210", "role": "ADMIN"},
    )
    assert patch_role.status_code == 422
    db.refresh(user)
    assert user.role == "CUSTOMER"


def test_jwt_alg_none_and_tampered_claims_rejected(client, db):
    user, _ = _create_user(db, "ADMIN")
    # alg: none token must be rejected with 401
    none_token = jwt.encode(
        {"sub": str(user.id), "sid": "fakesid", "iss": "vistrah", "aud": "vistrah-api"},
        "",
        algorithm="none",
    )
    res_none = client.get("/me", headers={"Authorization": f"Bearer {none_token}"})
    assert res_none.status_code == 401

    # Wrong audience token signed with valid secret must be rejected with 401
    wrong_aud = jwt.encode(
        {"sub": str(user.id), "sid": "fakesid", "iss": "vistrah", "aud": "other-service"},
        JWT_SECRET,
        algorithm="HS256",
    )
    res_aud = client.get("/me", headers={"Authorization": f"Bearer {wrong_aud}"})
    assert res_aud.status_code == 401


def test_hr_pii_masked_by_default_and_audited_on_sensitive_export(client, db):
    admin, admin_headers = _create_user(db, "ADMIN")
    created = client.post(
        "/api/admin/employees",
        headers=admin_headers,
        json={
            "full_name": "Meera Nair",
            "email": f"meera-{uuid.uuid4().hex[:6]}@vistrah.in",
            "designation": "Finance Lead",
            "division": "Finance",
            "joining_date": "2026-08-01",
            "annual_ctc_inr": 1500000,
            "bank_account_holder": "Meera Nair",
            "bank_name": "ICICI Bank",
            "bank_account_number": "00040500998877",
            "bank_ifsc": "ICIC0000004",
            "pan_number": "BNZPM2501F",
        },
    )
    assert created.status_code == 201, created.text

    # Default list endpoint masks both bank_account_number and pan_number
    listed = client.get("/api/admin/employees", headers=admin_headers)
    assert listed.status_code == 200
    raw_text = listed.text
    assert "00040500998877" not in raw_text
    assert "BNZPM2501F" not in raw_text
    emp_item = listed.json()["items"][0]
    assert emp_item["bank_account_number"] == "••••8877"
    assert emp_item["pan_number"] == "BN•••••01F"

    # Prepare salary credits and verify default salary-credits list also masks PII
    client.post(
        "/api/admin/employees/salary-credits",
        headers=admin_headers,
        json={"pay_month": "2026-11", "prepare_active": True},
    )
    credits_masked = client.get(
        "/api/admin/employees/salary-credits?pay_month=2026-11", headers=admin_headers
    )
    assert "00040500998877" not in credits_masked.text

    # Explicit include_sensitive_payout=true returns full account number for CSV export & logs Audit
    credits_export = client.get(
        "/api/admin/employees/salary-credits?pay_month=2026-11&include_sensitive_payout=true",
        headers=admin_headers,
    )
    assert credits_export.status_code == 200
    assert credits_export.json()["items"][0]["employee"]["bank_account_number"] == "00040500998877"

    export_audit = db.scalar(
        select(Audit).where(
            Audit.actor_id == admin.id,
            Audit.action == "HR_PAYOUT_SENSITIVE_EXPORT",
        )
    )
    assert export_audit is not None


def test_cors_security_headers_validation_redaction_and_production_docs_lock(
    client, monkeypatch
):
    # 1. Security headers present & untrusted CORS origin blocked
    evil_res = client.get("/health", headers={"Origin": "https://evil.example.com"})
    assert evil_res.status_code == 200
    assert "access-control-allow-origin" not in {k.lower() for k in evil_res.headers.keys()}
    assert evil_res.headers["X-Content-Type-Options"] == "nosniff"
    assert evil_res.headers["X-Frame-Options"] == "DENY"
    assert "max-age=" in evil_res.headers["Strict-Transport-Security"]

    # Approved origin receives exact origin echo (never '*')
    good_res = client.get("/health", headers={"Origin": "https://vistrah.in"})
    assert good_res.headers.get("access-control-allow-origin") == "https://vistrah.in"

    # 2. Validation 422 response never echoes raw submitted sensitive input values
    secret_probe = "SUPER_SECRET_RAW_INPUT_998877"
    bad_login = client.post(
        "/auth/login",
        json={"email": secret_probe, "password": "pw"},
    )
    assert bad_login.status_code == 422
    assert secret_probe not in bad_login.text
    assert "Traceback" not in bad_login.text

    # 3. Production ENVIRONMENT=production locks /docs, /redoc, and /openapi.json (404)
    monkeypatch.setenv("ENVIRONMENT", "production")
    for doc_path in ("/docs", "/redoc", "/openapi.json"):
        doc_res = client.get(doc_path)
        assert doc_res.status_code == 404, f"Expected 404 on {doc_path} in production"
        assert doc_res.headers["X-Content-Type-Options"] == "nosniff"
