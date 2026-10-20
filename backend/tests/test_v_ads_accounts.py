"""V Ads advertiser account authorization and audit tests."""
import pytest
from sqlalchemy import select, func

from app.models import User, Audit
from app.security import issue_token
from app.v_ads_models import VAdsAdvertiser
from app.v_ads_account_routes import router


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
    from app.main import app
    app.include_router(router)
    yield client
    # Router is installed only for this isolated test process.
    app.router.routes[:] = [
        route for route in app.router.routes
        if route not in router.routes
    ]


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
