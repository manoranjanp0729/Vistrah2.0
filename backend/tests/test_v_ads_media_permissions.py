"""Isolated tests for V Ads media ownership authorization."""
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.models import User
from app.v_ads_models import VAdsAdvertiser, VAdsMediaUpload
from app.v_ads_media_permissions import (
    authorized_advertiser,
    authorized_media,
)


@pytest.fixture
def media_ownership(db):
    owner = User(
        name="Media Owner",
        email="vads-media-owner@example.test",
        password_hash="test-only",
        seller_enabled=True,
    )
    other = User(
        name="Other Seller",
        email="vads-other-owner@example.test",
        password_hash="test-only",
        seller_enabled=True,
    )

    db.add_all([owner, other])
    db.flush()

    advertiser = VAdsAdvertiser(
        id=str(uuid4()),
        owner_id=owner.id,
        name="Approved Advertiser",
        handle="approved-" + uuid4().hex[:10],
        description="Test",
        status="APPROVED",
    )

    pending = VAdsAdvertiser(
        id=str(uuid4()),
        owner_id=owner.id,
        name="Pending Advertiser",
        handle="pending-" + uuid4().hex[:10],
        description="Test",
        status="PENDING",
    )

    db.add_all([advertiser, pending])
    db.flush()

    upload = VAdsMediaUpload(
        id=str(uuid4()),
        owner_id=owner.id,
        advertiser_id=advertiser.id,
        storage_key="a" * 64 + ".mp4",
        sha256="a" * 64,
        size_bytes=1024,
        status="VALIDATED",
    )

    db.add(upload)
    db.commit()

    return {
        "owner_id": owner.id,
        "other_id": other.id,
        "advertiser_id": advertiser.id,
        "pending_id": pending.id,
        "upload_id": upload.id,
    }


def test_valid_media_ownership(db, media_ownership):
    m = media_ownership

    upload = authorized_media(
        db, m["owner_id"], m["advertiser_id"], m["upload_id"]
    )

    assert upload.id == m["upload_id"]


def test_other_user_cannot_access_advertiser(db, media_ownership):
    m = media_ownership

    with pytest.raises(HTTPException) as exc:
        authorized_advertiser(
            db, m["other_id"], m["advertiser_id"]
        )

    assert exc.value.status_code == 403


def test_other_advertiser_cannot_use_media(db, media_ownership):
    m = media_ownership

    with pytest.raises(HTTPException) as exc:
        authorized_media(
            db, m["owner_id"], m["pending_id"], m["upload_id"]
        )

    assert exc.value.status_code in {404, 409}


def test_revoked_media_is_rejected(db, media_ownership):
    m = media_ownership

    upload = db.get(VAdsMediaUpload, m["upload_id"])
    upload.status = "REVOKED"
    db.commit()

    with pytest.raises(HTTPException) as exc:
        authorized_media(
            db, m["owner_id"], m["advertiser_id"], m["upload_id"]
        )

    assert exc.value.status_code == 404


def test_pending_advertiser_cannot_use_media(db, media_ownership):
    m = media_ownership

    with pytest.raises(HTTPException) as exc:
        authorized_advertiser(
            db, m["owner_id"], m["pending_id"]
        )

    assert exc.value.status_code == 409
