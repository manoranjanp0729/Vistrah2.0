import uuid
from sqlalchemy import select

from app.models import Audit, Provider, Service, ServiceRequest, User, now
from app.security import issue_token, passwords
from app.v_ads_models import VAdsAdvertiser, VAdsVideo
from app.v_ads_targeting_models import VAdsTargeting, VAdsTargetingRevision


def test_consent_persistence_on_registration_and_seller_onboarding(client, db):
    reg = client.post(
        "/auth/register",
        json={
            "name": "Aarav Sharma",
            "email": "aarav.dpdp@example.com",
            "password": "a-secure-password-123",
            "privacy_policy_version": "2026-11-dpdp-v1",
            "marketing_consent": True,
        },
    )
    assert reg.status_code == 201, reg.text
    body = reg.json()
    token = body["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    user_payload = body["user"]
    assert user_payload["privacy_policy_version"] == "2026-11-dpdp-v1"
    assert user_payload["privacy_consented_at"] is not None
    assert user_payload["marketing_consent"] is True
    assert user_payload["seller_terms_version"] is None

    db_user = db.scalar(select(User).where(User.email == "aarav.dpdp@example.com"))
    assert db_user is not None
    assert db_user.privacy_policy_version == "2026-11-dpdp-v1"
    assert db_user.privacy_consented_at is not None
    assert db_user.marketing_consent is True
    assert db_user.marketing_consented_at is not None

    enable = client.post(
        "/auth/seller/enable",
        headers=headers,
        json={
            "privacy_policy_version": "2026-11-dpdp-v1",
            "marketing_consent": False,
        },
    )
    assert enable.status_code == 200, enable.text
    seller_payload = enable.json()
    assert seller_payload["isSeller"] is True
    assert seller_payload["seller_terms_version"] == "2026-11-dpdp-v1"
    assert seller_payload["seller_consented_at"] is not None
    assert seller_payload["marketing_consent"] is False

    db.refresh(db_user)
    assert db_user.seller_terms_version == "2026-11-dpdp-v1"
    assert db_user.seller_consented_at is not None
    assert db_user.marketing_consent is False
    assert db_user.marketing_consented_at is None


def test_account_compliance_endpoints_require_authentication(client):
    export_res = client.get("/api/account/export-data")
    assert export_res.status_code == 401

    delete_res = client.delete("/api/account")
    assert delete_res.status_code == 401


def test_export_and_delete_account_preserve_immutable_admin_audit_logs(client, seeded):
    db = seeded
    admin = User(
        name="Reviewer Admin",
        email=f"reviewer-{uuid.uuid4().hex[:6]}@vistrah.in",
        password_hash=passwords.hash("admin-secure-pass-123"),
        role="ADMIN",
    )
    db.add(admin)
    db.flush()

    reg = client.post(
        "/auth/seller/register",
        json={
            "name": "Meera Nair",
            "email": "meera.seller@example.com",
            "password": "a-secure-password-123",
            "privacy_policy_version": "2026-11-dpdp-v1",
            "marketing_consent": True,
        },
    )
    assert reg.status_code == 201, reg.text
    token = reg.json()["access_token"]
    user_id = reg.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create another user to verify strict tenant isolation on export
    other_reg = client.post(
        "/auth/register",
        json={
            "name": "Other User",
            "email": "other.dpdp@example.com",
            "password": "a-secure-password-123",
        },
    )
    assert other_reg.status_code == 201

    service = db.scalar(select(Service))
    assert service is not None
    req_row = ServiceRequest(
        user_id=user_id,
        service_id=service.id,
        requirements="Need full commercial interior turnkey fit-out in Indiranagar.",
        location="Bengaluru",
        postal_code="560038",
        service_address="12th Main, Indiranagar, Bengaluru",
        phone="+919876543210",
        status="NEW",
    )
    db.add(req_row)

    provider = Provider(
        owner_user_id=user_id,
        slug=f"meera-interiors-{uuid.uuid4().hex[:6]}",
        name="Meera Nair",
        company="Meera Studio Pvt Ltd",
        email="meera.seller@example.com",
        phone="+919876543210",
        address="100 Feet Road, Indiranagar, Bengaluru",
        location="Bengaluru",
        latitude=12.9716,
        longitude=77.6412,
        provenance="seller-onboarded",
        verification_status="VERIFIED",
        active=True,
    )
    db.add(provider)

    adv_id = str(uuid.uuid4())
    vid_id = str(uuid.uuid4())
    adv = VAdsAdvertiser(
        id=adv_id,
        owner_id=user_id,
        name="Meera Studio Channel",
        handle=f"meerastudio{uuid.uuid4().hex[:6]}",
        description="Bengaluru interiors",
        status="APPROVED",
    )
    db.add(adv)
    db.flush()

    video = VAdsVideo(
        id=vid_id,
        advertiser_id=adv_id,
        title="Modular Kitchen Walkthrough",
        description="Turnkey modular kitchen installation",
        video_url="/media/sample.mp4",
        status="APPROVED",
        published_at=now(),
    )
    db.add(video)
    db.flush()

    targeting = VAdsTargeting(video_id=vid_id, advertiser_id=adv_id)
    db.add(targeting)
    db.flush()

    revision = VAdsTargetingRevision(
        video_id=vid_id,
        revision=1,
        latitude=12.9716,
        longitude=77.6412,
        targeting_radius_km=15.0,
        status="PENDING",
    )
    db.add(revision)
    db.flush()
    revision.status = "APPROVED"
    revision.reviewed_by = admin.id
    revision.reviewed_at = now()

    admin_audit = Audit(
        actor_id=admin.id,
        action="PROVIDER_VERIFIED",
        entity="provider",
        entity_id=str(provider.id),
        details={"verified_owner": user_id},
    )
    db.add(admin_audit)
    db.commit()

    # 1. Verify DPDP Data Export
    export_res = client.get("/api/account/export-data", headers=headers)
    assert export_res.status_code == 200, export_res.text
    assert "no-store" in export_res.headers.get("cache-control", "")
    assert f"vistrah-data-export-{user_id}.json" in export_res.headers.get("content-disposition", "")

    exported = export_res.json()
    assert exported["schema_version"] == "dpdp-2023-v1"
    assert exported["data_fiduciary"]["legal_name"] == "Vistrah Groups Pvt Ltd"
    assert exported["data_fiduciary"]["domain"] == "vistrah.in"
    assert exported["data_fiduciary"]["acknowledgment_sla_hours"] == 24
    assert exported["data_fiduciary"]["resolution_sla_days"] == 15
    assert exported["personal_profile"]["email"] == "meera.seller@example.com"
    assert exported["consent_records"]["privacy_policy_version"] == "2026-11-dpdp-v1"
    assert exported["consent_records"]["seller_terms_version"] == "2026-11-dpdp-v1"
    assert len(exported["service_requests"]) == 1
    assert len(exported["seller_businesses"]) == 1
    assert exported["seller_businesses"][0]["company"] == "Meera Studio Pvt Ltd"
    assert len(exported["v_ads_accounts"]) >= 1
    assert any(
        ch["id"] == adv_id and ch["videos"][0]["id"] == vid_id
        for ch in exported["v_ads_accounts"]
    )
    assert "other.dpdp@example.com" not in export_res.text

    # 2. Verify Account Deletion / Anonymization
    del_res = client.delete("/api/account", headers=headers)
    assert del_res.status_code == 200, del_res.text
    assert del_res.json()["status"] == "anonymized"
    assert del_res.json()["user_id"] == user_id

    # Revoked session and login must both fail closed with 401
    assert client.get("/me", headers=headers).status_code == 401
    relogin = client.post(
        "/auth/login",
        json={"email": "meera.seller@example.com", "password": "a-secure-password-123"},
    )
    assert relogin.status_code == 401

    # Verify PII anonymization and seller asset deactivation
    deleted_user = db.get(User, user_id)
    assert deleted_user is not None
    assert deleted_user.deleted_at is not None
    assert deleted_user.name == "Deleted User"
    assert deleted_user.email.endswith("@deleted.vistrah.invalid")
    assert deleted_user.phone == ""
    assert deleted_user.seller_enabled is False
    assert deleted_user.marketing_consent is False

    db.refresh(req_row)
    assert req_row.phone == "0000000000"
    assert req_row.service_address is None
    assert "Redacted" in req_row.requirements

    db.refresh(provider)
    assert provider.owner_user_id is None
    assert provider.active is False
    assert provider.verification_status == "INACTIVE"
    assert provider.latitude is None and provider.longitude is None

    db.refresh(adv)
    assert adv.owner_id is None
    assert adv.status == "SUSPENDED"

    db.refresh(video)
    assert video.status == "REMOVED"

    # Immutable admin revision & audit logs remain intact
    preserved_revision = db.get(VAdsTargetingRevision, (vid_id, 1))
    assert preserved_revision is not None
    assert preserved_revision.status == "APPROVED"
    assert preserved_revision.reviewed_by == admin.id

    preserved_admin_audit = db.get(Audit, admin_audit.id)
    assert preserved_admin_audit is not None
    assert preserved_admin_audit.action == "PROVIDER_VERIFIED"

    erasure_audit = db.scalar(
        select(Audit).where(
            Audit.actor_id == user_id,
            Audit.action == "ACCOUNT_DELETED_ANONYMIZED",
        )
    )
    assert erasure_audit is not None


def test_admin_self_deletion_is_blocked(client, db):
    admin = User(
        name="Platform Admin",
        email=f"admin-dpdp-{uuid.uuid4().hex[:6]}@vistrah.in",
        password_hash=passwords.hash("admin-secure-pass-123"),
        role="ADMIN",
    )
    db.add(admin)
    db.commit()
    token = issue_token(db, admin)

    res = client.delete("/api/account", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
