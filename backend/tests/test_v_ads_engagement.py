"""Isolated tests for authenticated V Ads engagement."""
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models import User
from app.security import current_user
from app.v_ads_models import (
    VAdsAdvertiser, VAdsVideo, VAdsLike, VAdsComment
)
from app.v_ads_engagement_routes import router


@pytest.fixture
def setup():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    Base.metadata.create_all(
        engine,
        tables=[
            User.__table__,
            VAdsAdvertiser.__table__,
            VAdsVideo.__table__,
            VAdsLike.__table__,
            VAdsComment.__table__,
        ],
    )

    app = FastAPI()
    app.include_router(router)

    def test_db():
        with Session(engine) as db:
            yield db

    app.dependency_overrides[get_db] = test_db

    with Session(engine) as db:
        first = User(
            email="first-vads@example.test",
            name="First User",
            password_hash="not-used",
            role="CUSTOMER",
        )
        second = User(
            email="second-vads@example.test",
            name="Second User",
            password_hash="not-used",
            role="CUSTOMER",
        )
        db.add_all([first, second])
        db.flush()

        advertiser = VAdsAdvertiser(
            id=str(uuid4()),
            owner_id=None,
            name="VISTRAH Official",
            handle="vistrah-official-test",
            description="Services. Simplified.",
            status="APPROVED",
        )
        db.add(advertiser)
        db.flush()

        approved = VAdsVideo(
            id=str(uuid4()),
            advertiser_id=advertiser.id,
            title="Approved Reel",
            description="Published advertisement.",
            video_url="https://example.com/approved.mp4",
            status="APPROVED",
        )
        pending = VAdsVideo(
            id=str(uuid4()),
            advertiser_id=advertiser.id,
            title="Pending Reel",
            description="Unpublished advertisement.",
            video_url="https://example.com/pending.mp4",
            status="PENDING",
        )
        db.add_all([approved, pending])
        db.commit()

        ids = {
            "first": first.id,
            "second": second.id,
            "approved": approved.id,
            "pending": pending.id,
        }

    identity = {"user_id": None}

    def test_user():
        if identity["user_id"] is None:
            from fastapi import HTTPException
            raise HTTPException(401, "Please sign in to continue")
        with Session(engine) as db:
            return db.get(User, identity["user_id"])

    app.dependency_overrides[current_user] = test_user

    with TestClient(app) as client:
        yield client, engine, ids, identity

    app.dependency_overrides.clear()
    engine.dispose()


def test_anonymous_like_is_rejected(setup):
    client, _, ids, _ = setup
    response = client.post(f"/v-ads/reels/{ids['approved']}/like")
    assert response.status_code == 401


def test_duplicate_like_is_idempotent(setup):
    client, engine, ids, identity = setup
    identity["user_id"] = ids["first"]

    url = f"/v-ads/reels/{ids['approved']}/like"
    first = client.post(url)
    second = client.post(url)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["likes_count"] == 1
    assert second.json()["likes_count"] == 1

    with Session(engine) as db:
        assert db.query(VAdsLike).count() == 1


def test_unlike_removes_like(setup):
    client, _, ids, identity = setup
    identity["user_id"] = ids["first"]

    url = f"/v-ads/reels/{ids['approved']}/like"
    client.post(url)
    response = client.delete(url)

    assert response.status_code == 200
    assert response.json()["liked"] is False
    assert response.json()["likes_count"] == 0


def test_pending_video_cannot_be_liked(setup):
    client, _, ids, identity = setup
    identity["user_id"] = ids["first"]

    response = client.post(f"/v-ads/reels/{ids['pending']}/like")
    assert response.status_code == 404


def test_anonymous_comment_is_rejected(setup):
    client, _, ids, _ = setup
    response = client.post(
        f"/v-ads/reels/{ids['approved']}/comments",
        json={"body": "A useful service"},
    )
    assert response.status_code == 401


def test_comment_creation_and_listing(setup):
    client, _, ids, identity = setup
    identity["user_id"] = ids["first"]

    url = f"/v-ads/reels/{ids['approved']}/comments"
    created = client.post(url, json={"body": "Great video!"})

    assert created.status_code == 201
    assert created.json()["body"] == "Great video!"

    listed = client.get(url)
    assert listed.status_code == 200
    assert len(listed.json()["items"]) == 1


def test_blank_comment_is_rejected(setup):
    client, _, ids, identity = setup
    identity["user_id"] = ids["first"]

    response = client.post(
        f"/v-ads/reels/{ids['approved']}/comments",
        json={"body": "   "},
    )
    assert response.status_code == 422


def test_user_cannot_delete_other_users_comment(setup):
    client, _, ids, identity = setup
    identity["user_id"] = ids["first"]

    created = client.post(
        f"/v-ads/reels/{ids['approved']}/comments",
        json={"body": "My comment"},
    )
    assert created.status_code == 201
    comment_id = created.json()["id"]

    identity["user_id"] = ids["second"]
    denied = client.delete(f"/v-ads/comments/{comment_id}")

    assert denied.status_code == 403

    identity["user_id"] = ids["first"]
    removed = client.delete(f"/v-ads/comments/{comment_id}")
    assert removed.status_code == 200
    assert removed.json()["deleted"] is True


def test_pending_video_comments_are_hidden(setup):
    client, _, ids, identity = setup
    identity["user_id"] = ids["first"]

    response = client.get(f"/v-ads/reels/{ids['pending']}/comments")
    assert response.status_code == 404
