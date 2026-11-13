"""V Ads advertiser account authorization and audit tests."""
import pytest
from sqlalchemy import select, func

from app.models import User, Audit
from app.security import issue_token
from app.v_ads_models import VAdsAdvertiser


DATA = {
    "name": "Example Business",
    "handle": "example-business-vads",
    "description": "Services provided by Example Business.",
}


@pytest.fixture
def accounts(db):
    seller = User(
        name="V Ads Seller",
        email="vads-seller@example.test",
        password_hash="test-only",
        seller_enabled=True,
    )
    customer = User(
        name="V Ads Customer",
        email="vads-customer@example.test",
        password_hash="test-only",
        seller_enabled=False,
    )
    admin = User(
        name="V Ads Admin",
        email="vads-admin@example.test",
        password_hash="test-only",
        role="ADMIN",
    )
    db.add_all([seller, customer, admin])
    db.flush()

    result = {
        "seller": {"Authorization": "Bearer " + issue_token(db, seller)},
        "customer": {"Authorization": "Bearer " + issue_token(db, customer)},
        "admin": {"Authorization": "Bearer " + issue_token(db, admin)},
        "seller_id": seller.id,
        "admin_id": admin.id,
    }
    db.commit()
    return result


@pytest.fixture
def account_client(client):
    # The integrated application already registers this router. Do not remove
    # production routes from the process shared with later moderation tests.
    yield client


def test_seller_can_request_advertiser(account_client, accounts, db):
    response = account_client.post(
        "/v-ads/advertisers/request",
        headers=accounts["seller"],
        json=DATA,
    )
    assert response.status_code == 201, response.text
    assert response.json()["status"] == "PENDING"

    row = db.scalar(
        select(VAdsAdvertiser).where(
            VAdsAdvertiser.handle == DATA["handle"]
        )
    )
    assert row is not None
    assert row.owner_id == accounts["seller_id"]

    audit = db.scalar(
        select(Audit).where(
            Audit.entity == "v_ads_advertiser",
            Audit.entity_id == row.id,
        )
    )
    assert audit is not None
    assert audit.action == "V_ADS_ADVERTISER_REQUEST"


def test_customer_cannot_request_advertiser(account_client, accounts):
    response = account_client.post(
        "/v-ads/advertisers/request",
        headers=accounts["customer"],
        json=DATA,
    )
    assert response.status_code == 403


def test_anonymous_request_is_rejected(account_client):
    response = account_client.post(
        "/v-ads/advertisers/request",
        json=DATA,
    )
    assert response.status_code == 401


def test_duplicate_seller_request_rejected(account_client, accounts):
    first = account_client.post(
        "/v-ads/advertisers/request",
        headers=accounts["seller"],
        json=DATA,
    )
    assert first.status_code == 201

    second = account_client.post(
        "/v-ads/advertisers/request",
        headers=accounts["seller"],
        json={**DATA, "handle": "another-vads-handle"},
    )
    assert second.status_code == 409


def test_customer_cannot_create_official_account(account_client, accounts):
    response = account_client.post(
        "/admin/v-ads/official-advertisers",
        headers=accounts["customer"],
        json=DATA,
    )
    assert response.status_code == 403


def test_admin_can_create_official_account(account_client, accounts, db):
    response = account_client.post(
        "/admin/v-ads/official-advertisers",
        headers=accounts["admin"],
        json=DATA,
    )
    assert response.status_code == 201, response.text
    assert response.json()["status"] == "APPROVED"

    audit = db.scalar(
        select(Audit).where(
            Audit.action == "V_ADS_OFFICIAL_ADVERTISER_CREATE"
        )
    )
    assert audit is not None
    assert audit.actor_id == accounts["admin_id"]


def test_advertiser_handle_conflict(account_client, accounts):
    first = account_client.post(
        "/admin/v-ads/official-advertisers",
        headers=accounts["admin"],
        json=DATA,
    )
    assert first.status_code == 201

    second = account_client.post(
        "/admin/v-ads/official-advertisers",
        headers=accounts["admin"],
        json=DATA,
    )
    assert second.status_code == 409


def test_admin_queue_access(account_client, accounts):
    denied = account_client.get(
        "/admin/v-ads/advertisers",
        headers=accounts["customer"],
    )
    assert denied.status_code == 403

    allowed = account_client.get(
        "/admin/v-ads/advertisers",
        headers=accounts["admin"],
    )
    assert allowed.status_code == 200
    assert "items" in allowed.json()


def test_seller_signup_and_enable_auto_create_approved_v_ads_account(account_client, db):
    registered = account_client.post(
        "/auth/seller/register",
        json={
            "name": "Auto V Ads Seller",
            "email": "auto-vads-seller@example.com",
            "password": "synthetic-seller-password",
        },
    )
    assert registered.status_code == 201, registered.text
    token = registered.json()["access_token"]
    workspace = account_client.get(
        "/v-ads/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert workspace.status_code == 200, workspace.text
    accounts_list = workspace.json()["accounts"]
    assert len(accounts_list) == 1
    assert accounts_list[0]["name"] == "Auto V Ads Seller"
    assert accounts_list[0]["status"] == "APPROVED"
    assert accounts_list[0]["handle"].startswith("auto-v-ads-seller")

    customer_reg = account_client.post(
        "/auth/register",
        json={
            "name": "Upgrade Seller",
            "email": "upgrade-vads-seller@example.com",
            "password": "synthetic-seller-password",
        },
    )
    assert customer_reg.status_code == 201
    cust_headers = {"Authorization": f"Bearer {customer_reg.json()['access_token']}"}
    enable = account_client.post("/auth/seller/enable", headers=cust_headers)
    assert enable.status_code == 200
    upgraded_ws = account_client.get("/v-ads/me", headers=cust_headers)
    assert upgraded_ws.status_code == 200
    assert len(upgraded_ws.json()["accounts"]) == 1
    assert upgraded_ws.json()["accounts"][0]["status"] == "APPROVED"


def test_seller_workspace_shows_uploaded_videos_with_creator_badge(account_client, accounts, db):
    from uuid import uuid4
    from app.v_ads_models import VAdsVideo

    # Create advertiser and video for seller
    adv_id = str(uuid4())
    adv = VAdsAdvertiser(
        id=adv_id,
        owner_id=accounts["seller_id"],
        name="Seller Business Channel",
        handle=f"seller-channel-{uuid4().hex[:6]}",
        status="APPROVED",
    )
    db.add(adv)
    db.flush()

    video = VAdsVideo(
        id=str(uuid4()),
        advertiser_id=adv.id,
        title="Live Seller Ad Video",
        description="Great local services offer",
        video_url="/videos/v-ads/seller.mp4",
        status="APPROVED",
    )
    db.add(video)
    db.commit()

    # Seller accesses workspace - sees their own video with is_owner = True
    seller_ws = account_client.get("/v-ads/me", headers=accounts["seller"])
    assert seller_ws.status_code == 200
    seller_videos = seller_ws.json()["videos"]
    matching = next((v for v in seller_videos if v["id"] == video.id), None)
    assert matching is not None
    assert matching["account_name"] == "Seller Business Channel"
    assert matching["account_handle"] == adv.handle
    assert matching["video_url"] == "/videos/v-ads/seller.mp4"
    assert matching["is_owner"] is True

    # Admin accesses workspace - does NOT see seller's video (strict multi-tenant boundary in studio)
    admin_ws = account_client.get("/v-ads/me", headers=accounts["admin"])
    assert admin_ws.status_code == 200
    admin_videos = admin_ws.json()["videos"]
    admin_match = next((v for v in admin_videos if v["id"] == video.id), None)
    assert admin_match is None

@pytest.mark.parametrize("status", ["PENDING", "REJECTED", "SUSPENDED"])
def test_reenabling_seller_does_not_bypass_profile_review(account_client, db, accounts, status):
    advertiser = VAdsAdvertiser(id="review-boundary-" + status, owner_id=accounts["seller_id"],
        name="Review boundary", handle="review-boundary-" + status.lower(), status=status)
    db.add(advertiser)
    db.commit()
    response = account_client.post("/auth/seller/enable", headers=accounts["seller"])
    assert response.status_code == 200
    db.refresh(advertiser)
    assert advertiser.status == status
