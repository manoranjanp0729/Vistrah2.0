import uuid
from datetime import datetime, timezone

from app.models import Audit, Provider, User
from app.security import issue_token, passwords
from app.v_ads_models import VAdsAdvertiser, VAdsVideo
from app.v_ads_targeting_models import VAdsTargeting, VAdsTargetingRevision


def _auth_headers(db, role: str) -> tuple[User, dict[str, str]]:
    user = User(
        name=f"{role.title()} Principal",
        email=f"console-{role.lower()}-{uuid.uuid4().hex[:6]}@vistrah.in",
        password_hash=passwords.hash("secure-password-123"),
        role=role,
        privacy_policy_version="2026.1-dpdp",
        privacy_consented_at=datetime.now(timezone.utc),
        marketing_consent=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    issued = issue_token(db, user)
    token = issued[0] if isinstance(issued, tuple) else issued
    return user, {"Authorization": f"Bearer {token}"}


def test_admin_console_endpoints_require_admin_role(client, db):
    for path in (
        "/admin/overview",
        "/admin/moderation/v-ads",
        "/admin/moderation/sellers",
        "/admin/moderation/users",
        "/admin/compliance-summary",
    ):
        assert client.get(path).status_code == 401

    _, customer_headers = _auth_headers(db, "CUSTOMER")
    for path in (
        "/admin/overview",
        "/admin/moderation/v-ads",
        "/admin/moderation/sellers",
        "/admin/moderation/users",
        "/admin/compliance-summary",
    ):
        assert client.get(path, headers=customer_headers).status_code == 403


def test_admin_console_overview_moderation_and_compliance_summary(client, db):
    _, admin_headers = _auth_headers(db, "ADMIN")
    seller_user, _ = _auth_headers(db, "CUSTOMER")
    seller_user.seller_enabled = True
    seller_user.seller_terms_version = "2026.1-seller"
    seller_user.seller_consented_at = datetime.now(timezone.utc)
    db.commit()

    suffix = uuid.uuid4().hex[:6]
    provider = Provider(
        name="Rohan Verma",
        company=f"Verma Studio {suffix}",
        slug=f"verma-studio-{suffix}",
        email=f"studio-{suffix}@vistrah.in",
        phone="9876543210",
        address="Indiranagar, Bengaluru",
        location="Bengaluru",
        provenance="Seller self-onboarding",
        verification_status="PENDING",
        active=False,
        owner_user_id=seller_user.id,
    )
    db.add(provider)
    db.flush()

    adv = VAdsAdvertiser(
        id=f"adv-{suffix}",
        owner_id=seller_user.id,
        name=f"Verma Studio Reels {suffix}",
        handle=f"vermastudio{suffix}",
        description="Local design studio",
        status="APPROVED",
    )
    db.add(adv)
    db.flush()

    vid = VAdsVideo(
        id=f"vid-{suffix}",
        advertiser_id=adv.id,
        title=f"Studio Tour {suffix}",
        description="9:16 hyperlocal showcase",
        video_url="https://vistrah.in/demo.mp4",
        status="PENDING",
    )
    db.add(vid)
    db.flush()

    targeting = VAdsTargeting(
        video_id=vid.id,
        advertiser_id=adv.id,
    )
    db.add(targeting)
    db.flush()
    db.add(
        VAdsTargetingRevision(
            video_id=vid.id,
            revision=1,
            latitude=12.9716,
            longitude=77.5946,
            targeting_radius_km=5,
            status="PENDING",
        )
    )
    db.add(
        Audit(
            actor_id=seller_user.id,
            action="ACCOUNT_DATA_EXPORTED",
            entity="user",
            entity_id=str(seller_user.id),
            details={"policy": "2026.1-dpdp"},
        )
    )
    db.commit()

    # 1. Enriched Overview KPIs + Needs Review queue
    ov = client.get("/admin/overview", headers=admin_headers)
    assert ov.status_code == 200, ov.text
    ov_data = ov.json()
    assert ov_data["pending_v_ads"] >= 2  # 1 pending video + 1 pending targeting
    assert ov_data["pending_sellers"] >= 1
    assert ov_data["verified_users"] >= 2
    assert ov_data["payment_mode"] == "SANDBOX"
    assert isinstance(ov_data["needs_review"], list)
    assert any(item["id"] == "v-ads-videos" and item["count"] >= 1 for item in ov_data["needs_review"])

    # 2. Moderation V Ads (drawer payload with 024 spatial revisions & DPDP consent)
    v_res = client.get(f"/admin/moderation/v-ads?scope=pending&q={suffix}", headers=admin_headers)
    assert v_res.status_code == 200, v_res.text
    v_items = v_res.json()["items"]
    assert len(v_items) == 1
    assert v_items[0]["id"] == vid.id
    assert v_items[0]["pending_targeting"]["revision"] == 1
    assert v_items[0]["pending_targeting"]["radius_km"] == 5
    assert len(v_items[0]["targeting_revisions"]) == 1
    assert v_items[0]["owner"]["privacy_policy_version"] == "2026.1-dpdp"

    # 3. Moderation Sellers
    s_res = client.get(f"/admin/moderation/sellers?q={suffix}", headers=admin_headers)
    assert s_res.status_code == 200, s_res.text
    s_items = s_res.json()["items"]
    assert len(s_items) == 1
    assert s_items[0]["company"] == f"Verma Studio {suffix}"
    assert s_items[0]["owner"]["seller_terms_version"] == "2026.1-seller"
    assert len(s_items[0]["v_ads_channels"]) == 1

    # 4. Moderation Users (no password_hash leakage)
    u_res = client.get(f"/admin/moderation/users?segment=sellers&q={seller_user.email}", headers=admin_headers)
    assert u_res.status_code == 200, u_res.text
    u_items = u_res.json()["items"]
    assert len(u_items) == 1
    assert "password_hash" not in u_items[0]
    assert u_items[0]["privacy_policy_version"] == "2026.1-dpdp"
    assert u_items[0]["businesses_count"] == 1
    assert u_items[0]["v_ads_channels_count"] == 1

    # 5. Consolidated Audit & Compliance Summary
    c_res = client.get("/admin/compliance-summary", headers=admin_headers)
    assert c_res.status_code == 200, c_res.text
    c_data = c_res.json()
    assert c_data["dpdp"]["fiduciary"]["legal_name"] == "Vistrah Groups Pvt Ltd"
    assert c_data["dpdp"]["privacy_consented"] >= 2
    assert c_data["dpdp"]["export_events_count"] >= 1
    assert any(r["video_id"] == vid.id and r["radius_km"] == 5 for r in c_data["v_ads_revisions"])
