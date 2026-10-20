"""Isolated public V Ads API tests."""
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models import User
from app.v_ads_models import (
    VAdsAdvertiser, VAdsVideo, VAdsLike, VAdsComment, VAdsView
)
from app.v_ads_routes import router


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
            VAdsAdvertiser.__table__,
            VAdsVideo.__table__,
            VAdsLike.__table__,
            VAdsComment.__table__,
            VAdsView.__table__,
        ],
    )

    app = FastAPI()
    app.include_router(router)

    def test_db():
        with Session(engine) as db:
            yield db

    app.dependency_overrides[get_db] = test_db

    with TestClient(app) as client:
        yield client, engine

    app.dependency_overrides.clear()
    engine.dispose()


def advertiser(db, status="APPROVED"):
    record = VAdsAdvertiser(
        id=str(uuid4()),
        owner_id=None,
        name="VISTRAH Official",
        handle="vistrah-" + uuid4().hex[:12],
        description="Services. Simplified.",
        status=status,
    )
    db.add(record)
    db.flush()
    return record


def video(db, account, status="APPROVED"):
    record = VAdsVideo(
        id=str(uuid4()),
        advertiser_id=account.id,
        title="Test Reel",
        description="Discover VISTRAH services.",
        video_url="https://example.com/test-video.mp4",
        status=status,
        published_at=datetime.now(timezone.utc) if status == "APPROVED" else None,
    )
    db.add(record)
    db.flush()
    return record


def test_feed_shows_only_approved_content(setup):
    client, engine = setup

    with Session(engine) as db:
        approved = advertiser(db)
        video(db, approved)
        video(db, approved, status="PENDING")
        video(db, approved, status="REJECTED")

        suspended = advertiser(db, status="SUSPENDED")
        video(db, suspended)
        db.commit()

    response = client.get("/v-ads/reels")
    assert response.status_code == 200

    payload = response.json()
    assert len(payload["items"]) == 1
    assert payload["items"][0]["advertiser"]["name"] == "VISTRAH Official"
    assert payload["has_more"] is False


def test_public_advertiser_profile(setup):
    client, engine = setup

    with Session(engine) as db:
        account = advertiser(db)
        account_id = account.id
        video(db, account)
        video(db, account, status="PENDING")
        db.commit()

    response = client.get(f"/v-ads/advertisers/{account_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "VISTRAH Official"
    assert len(response.json()["videos"]) == 1


def test_unapproved_advertiser_is_hidden(setup):
    client, engine = setup

    with Session(engine) as db:
        account = advertiser(db, status="PENDING")
        account_id = account.id
        db.commit()

    response = client.get(f"/v-ads/advertisers/{account_id}")
    assert response.status_code == 404


def test_unknown_advertiser_returns_404(setup):
    client, _ = setup
    response = client.get(f"/v-ads/advertisers/{uuid4()}")
    assert response.status_code == 404


def test_empty_feed(setup):
    client, _ = setup
    response = client.get("/v-ads/reels")
    assert response.status_code == 200
    assert response.json()["items"] == []


def test_feed_pagination(setup):
    client, engine = setup

    with Session(engine) as db:
        account = advertiser(db)
        for _ in range(3):
            video(db, account)
        db.commit()

    first = client.get("/v-ads/reels?page=1&page_size=2")
    second = client.get("/v-ads/reels?page=2&page_size=2")

    assert first.status_code == 200
    assert len(first.json()["items"]) == 2
    assert first.json()["has_more"] is True

    assert second.status_code == 200
    assert len(second.json()["items"]) == 1
    assert second.json()["has_more"] is False
