"""Tests for V Ads Video Creator service and API endpoints."""
import os
import tempfile
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.database import get_db
from app.models import User, Audit
from app.security import issue_token
from app.v_ads_models import VAdsAdvertiser, VAdsMediaUpload, VAdsVideo
from app.v_ads_creator_routes import router as creator_router
from app.v_ads_video_submission_routes import router as submissions_router


@pytest.fixture
def creator_client(db, tmp_path, monkeypatch):
    monkeypatch.setenv("V_ADS_MEDIA_ENABLED", "1")
    monkeypatch.setenv("V_ADS_PRIVATE_ROOT", str(tmp_path))

    owner = User(
        name="Ad Creator Seller",
        email=f"creator-{uuid4()}@example.test",
        password_hash="test-only",
        role="CUSTOMER",
        seller_enabled=True,
    )
    other = User(
        name="Other Seller",
        email=f"other-{uuid4()}@example.test",
        password_hash="test-only",
        role="CUSTOMER",
        seller_enabled=True,
    )
    db.add_all([owner, other])
    db.flush()

    advertiser = VAdsAdvertiser(
        id=str(uuid4()),
        owner_id=owner.id,
        name="Grand Sweets & Bakers",
        handle=f"grandsweets-{uuid4().hex[:6]}",
        status="APPROVED",
    )
    db.add(advertiser)
    db.commit()

    app = FastAPI()
    app.include_router(creator_router)
    app.include_router(submissions_router)
    app.dependency_overrides[get_db] = lambda: db

    headers = {
        "owner": {"Authorization": "Bearer " + issue_token(db, owner)},
        "other": {"Authorization": "Bearer " + issue_token(db, other)},
    }

    with TestClient(app) as client:
        yield client, headers, advertiser, owner, other


def test_create_video_unauthorized_user(creator_client):
    client, headers, advertiser, _, _ = creator_client
    payload = {
        "template_id": "offer-sale",
        "title": "Unauthorized Ad Creation",
        "headline": "Special Offer",
        "offer_badge": "50% OFF",
        "highlights": ["Top quality"],
        "call_to_action": "Buy Now",
        "contact_info": "+91 9876543210",
        "music_mood": "upbeat",
        "images": [],
    }
    # Other seller who doesn't own this advertiser
    response = client.post(
        f"/v-ads/advertisers/{advertiser.id}/create-video",
        headers=headers["other"],
        json=payload,
    )
    assert response.status_code == 403


def test_create_video_validation_errors(creator_client):
    client, headers, advertiser, _, _ = creator_client
    # Title too short
    response = client.post(
        f"/v-ads/advertisers/{advertiser.id}/create-video",
        headers=headers["owner"],
        json={
            "template_id": "offer-sale",
            "title": "ab",
            "headline": "Good offer",
        },
    )
    assert response.status_code == 422


def test_create_video_success_and_submit(creator_client, db):
    client, headers, advertiser, owner, _ = creator_client
    payload = {
        "template_id": "offer-sale",
        "title": "Diwali Grand Sweets Festive Box",
        "headline": "Flat 30% Off On All Gift Boxes!",
        "subtitle": "Traditional pure ghee sweets & dry fruits",
        "offer_badge": "FESTIVE SALE",
        "highlights": [
            "Handcrafted pure ghee sweets",
            "Free gift packaging included",
            "Doorstep delivery across town",
        ],
        "call_to_action": "Order Now",
        "contact_info": "Call: 98765-43210 / Shop #4 Gandhi Rd",
        "music_mood": "festive",
        "images": [],  # Will generate stylized background slides
    }

    response = client.post(
        f"/v-ads/advertisers/{advertiser.id}/create-video",
        headers=headers["owner"],
        json=payload,
    )
    assert response.status_code == 201, response.text
    data = response.json()
    assert "upload_id" in data
    assert data["status"] == "VALIDATED"
    assert data["size_bytes"] > 0
    assert data["video_url"] == f"/v-ads/media/{data['upload_id']}"

    # Verify upload was persisted in database
    upload_record = db.scalar(
        select(VAdsMediaUpload).where(VAdsMediaUpload.id == data["upload_id"])
    )
    assert upload_record is not None
    assert upload_record.advertiser_id == advertiser.id
    assert upload_record.status == "VALIDATED"
    assert upload_record.size_bytes == data["size_bytes"]

    # Verify audit record
    audit_record = db.scalar(
        select(Audit).where(
            Audit.actor_id == owner.id,
            Audit.action == "V_ADS_VIDEO_CREATE",
            Audit.entity_id == data["upload_id"],
        )
    )
    assert audit_record is not None
    assert audit_record.details["template_id"] == "offer-sale"

    # Verify the created video can be submitted directly into the V Ads approval workflow
    submit_res = client.post(
        "/v-ads/videos/submit",
        headers=headers["owner"],
        json={
            "advertiser_id": advertiser.id,
            "upload_id": data["upload_id"],
            "title": "Diwali Grand Sweets Festive Box",
            "description": "Order our festival sweet hampers with special discounts.",
        },
    )
    assert submit_res.status_code == 201, submit_res.text
    submitted = submit_res.json()
    assert "id" in submitted
    assert submitted["status"] in ("PENDING", "APPROVED")

    # Verify video was created in DB and linked to upload
    video = db.scalar(select(VAdsVideo).where(VAdsVideo.id == submitted["id"]))
    assert video is not None
    assert video.media_upload_id == data["upload_id"]
    assert video.title == "Diwali Grand Sweets Festive Box"


def _make_clip(path, seconds=2):
    import subprocess
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi", "-i", f"testsrc=duration={seconds}:size=320x240:rate=25",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", str(path),
    ], check=True, capture_output=True)


def _tiny_png(tmp_path):
    import base64
    import subprocess
    path = tmp_path / "photo.png"
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=orange:s=200x300:d=1",
        "-frames:v", "1", str(path),
    ], check=True, capture_output=True)
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode()


def test_camera_clip_project_edit_and_isolation(creator_client, tmp_path):
    client, headers, advertiser, _, _ = creator_client
    clip_file = tmp_path / "clip.mp4"
    _make_clip(clip_file)

    # Another seller cannot stage clips for this advertiser
    denied = client.post(
        f"/v-ads/advertisers/{advertiser.id}/creator/clips",
        headers={**headers["other"], "Content-Type": "video/mp4"},
        content=clip_file.read_bytes(),
    )
    assert denied.status_code == 403

    # Garbage is rejected, not stored
    bad = client.post(
        f"/v-ads/advertisers/{advertiser.id}/creator/clips",
        headers={**headers["owner"], "Content-Type": "video/mp4"},
        content=b"not a video at all" * 20,
    )
    assert bad.status_code == 422

    staged = client.post(
        f"/v-ads/advertisers/{advertiser.id}/creator/clips",
        headers={**headers["owner"], "Content-Type": "video/mp4"},
        content=clip_file.read_bytes(),
    )
    assert staged.status_code == 201, staged.text
    clip_id = staged.json()["clip_id"]

    payload = {
        "template_id": "brand-launch",
        "title": "Grand Opening Clip Ad",
        "headline": "We Are Now Open!",
        "highlights": ["Meet us", "Free tasting"],
        "images": [_tiny_png(tmp_path)],
        "clip_id": clip_id,
    }
    created = client.post(
        f"/v-ads/advertisers/{advertiser.id}/create-video",
        headers=headers["owner"], json=payload,
    )
    assert created.status_code == 201, created.text
    first = created.json()
    project_id = first["project_id"]

    listed = client.get("/v-ads/creator/projects", headers=headers["owner"],
                        params={"advertiser_id": advertiser.id}).json()["items"]
    assert [item["project_id"] for item in listed] == [project_id]
    assert listed[0]["has_clip"] is True and listed[0]["upload_id"] == first["upload_id"]

    # Other sellers cannot read, edit or delete the project
    assert client.get(f"/v-ads/creator/projects/{project_id}", headers=headers["other"]).status_code == 404
    assert client.delete(f"/v-ads/creator/projects/{project_id}", headers=headers["other"]).status_code == 404

    # Re-open for editing: images and clip flag are restored
    loaded = client.get(f"/v-ads/creator/projects/{project_id}", headers=headers["owner"]).json()
    assert loaded["headline"] == "We Are Now Open!"
    assert len(loaded["images"]) == 1 and loaded["has_clip"] is True

    # Edit text, keep clip and photo, regenerate -> new upload, same project
    edited = client.post(
        f"/v-ads/advertisers/{advertiser.id}/create-video",
        headers=headers["owner"],
        json={**payload, "clip_id": None, "keep_clip": True, "images": loaded["images"],
              "project_id": project_id, "headline": "Open This Saturday!"},
    )
    assert edited.status_code == 201, edited.text
    assert edited.json()["project_id"] == project_id
    assert edited.json()["upload_id"] != first["upload_id"]
    again = client.get(f"/v-ads/creator/projects/{project_id}", headers=headers["owner"]).json()
    assert again["headline"] == "Open This Saturday!" and again["has_clip"] is True

    assert client.delete(f"/v-ads/creator/projects/{project_id}", headers=headers["owner"]).status_code == 204
    assert client.get(f"/v-ads/creator/projects/{project_id}", headers=headers["owner"]).status_code == 404
