"""V Ads advertiser approval and rejection tests."""
from uuid import uuid4

import pytest
from sqlalchemy import select

from app.models import User, Audit
from app.security import issue_token
from app.v_ads_models import VAdsAdvertiser
from app.v_ads_review_routes import router


@pytest.fixture
def review_client(client):
    from app.main import app
    app.include_router(router)
    try:
        yield client
    finally:
        app.router.routes[:] = [
            route for route in app.router.routes
            if route not in router.routes
        ]


@pytest.fixture
def review_data(db):
    seller = User(
        name="Review Seller",
        email="vads-review-seller@example.test",
        password_hash="test-only",
        seller_enabled=True,
    )
    admin = User(
        name="Review Admin",
        email="vads-review-admin@example.test",
        password_hash="test-only",
        role="ADMIN",
    )
    other = User(
        name="Review Customer",
        email="vads-review-customer@example.test",
        password_hash="test-only",
    )
    db.add_all([seller, admin, other])
    db.flush()

    account = VAdsAdvertiser(
        id=str(uuid4()),
        owner_id=seller.id,
        name="Review Business",
        handle="review-business-" + uuid4().hex[:8],
        description="Test advertiser",
        status="PENDING",
    )
    own_account = VAdsAdvertiser(
        id=str(uuid4()),
        owner_id=admin.id,
        name="Admin Owned Request",
        handle="admin-owned-" + uuid4().hex[:8],
        description="Test advertiser",
        status="PENDING",
    )

    db.add_all([account, own_account])
    db.flush()

    result = {
        "account_id": account.id,
        "own_account_id": own_account.id,
        "admin": {
            "Authorization": "Bearer " + issue_token(db, admin)
        },
        "customer": {
            "Authorization": "Bearer " + issue_token(db, other)
        },
    }
    db.commit()
    return result


def review(client, account_id, headers, status="APPROVED"):
    return client.post(
        f"/admin/v-ads/advertisers/{account_id}/review",
        headers=headers,
        json={
            "status": status,
            "reason": "Reviewed against VISTRAH advertising requirements.",
        },
    )


def test_admin_approves_request(review_client, review_data, db):
    response = review(
        review_client,
        review_data["account_id"],
        review_data["admin"],
    )

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "APPROVED"

    account = db.get(VAdsAdvertiser, review_data["account_id"])
    assert account.status == "APPROVED"

    audit = db.scalar(
        select(Audit).where(
            Audit.action == "V_ADS_ADVERTISER_REVIEW",
            Audit.entity_id == account.id,
        )
    )
    assert audit is not None
    assert audit.details["status"] == "APPROVED"


def test_admin_rejects_request(review_client, review_data, db):
    response = review(
        review_client,
        review_data["account_id"],
        review_data["admin"],
        "REJECTED",
    )
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "REJECTED"

    account = db.get(VAdsAdvertiser, review_data["account_id"])
    assert account.status == "REJECTED"


def test_customer_cannot_review(review_client, review_data):
    response = review(
        review_client,
        review_data["account_id"],
        review_data["customer"],
    )
    assert response.status_code == 403


def test_admin_cannot_review_own_request(review_client, review_data):
    response = review(
        review_client,
        review_data["own_account_id"],
        review_data["admin"],
    )
    assert response.status_code == 403


def test_second_review_is_rejected(review_client, review_data):
    first = review(
        review_client,
        review_data["account_id"],
        review_data["admin"],
    )
    assert first.status_code == 200

    second = review(
        review_client,
        review_data["account_id"],
        review_data["admin"],
        "REJECTED",
    )
    assert second.status_code == 409
