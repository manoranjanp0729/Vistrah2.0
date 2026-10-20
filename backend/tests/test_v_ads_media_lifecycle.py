"""Disposable database API checks for the owned-media publication boundary."""
import os
import time
import shutil
import subprocess
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select, func

from app.database import get_db
from app.models import User, Audit
from app.security import issue_token
from app.v_ads_models import VAdsAdvertiser, VAdsMediaUpload, VAdsVideo
from app.v_ads_media_routes import router, _upload_slots
from app.v_ads_video_submission_routes import router as submissions
from app.v_ads_media_cleanup import cleanup_media
from app.v_ads_video_storage import VideoStorage
from app.v_ads_account_routes import router as accounts
from app.v_ads_engagement_routes import router as engagement


@pytest.fixture
def media(db, tmp_path, monkeypatch):
    monkeypatch.setenv("V_ADS_MEDIA_ENABLED", "1")
    monkeypatch.setenv("V_ADS_PRIVATE_ROOT", str(tmp_path))
    monkeypatch.setattr("app.v_ads_video_service.validate_video", lambda path: {
        "size_bytes": path.stat().st_size, "duration_seconds": 1, "width": 100, "height": 200})
    users = [User(name=role, email=f"{uuid4()}@example.test", password_hash="test-only",
                  role="ADMIN" if role == "admin" else "CUSTOMER", seller_enabled=True)
             for role in ("owner", "other", "admin")]
    db.add_all(users)
    db.flush()
    advertiser = VAdsAdvertiser(id=str(uuid4()), owner_id=users[0].id,
        name="Media Test", handle=uuid4().hex, status="APPROVED")
    db.add(advertiser)
    db.commit()
    app = FastAPI()
    app.include_router(router)
    app.include_router(submissions)
    app.include_router(accounts)
    app.include_router(engagement)
    app.dependency_overrides[get_db] = lambda: db
    headers = {role: {"Authorization": "Bearer " + issue_token(db, user)}
               for role, user in zip(("owner", "other", "admin"), users)}
    with TestClient(app) as client:
        yield client, headers, advertiser, tmp_path


def upload(media, role="owner", content=b"test-video"):
    client, headers, advertiser, _ = media
    return client.post(f"/v-ads/advertisers/{advertiser.id}/uploads",
        headers={**headers[role], "Content-Type": "video/mp4"}, content=content)


def submit(media, upload_id, role="owner", **extra):
    client, headers, advertiser, _ = media
    return client.post("/v-ads/videos/submit", headers=headers[role], json={
        "advertiser_id": advertiser.id, "upload_id": upload_id, "title": "Test video", **extra})


def review(media, video_id, role="admin", status="APPROVED"):
    client, headers, _, _ = media
    return client.post(f"/admin/v-ads/videos/{video_id}/review", headers=headers[role], json={
        "status": status, "reason": "Reviewed against advertising requirements"})


def test_complete_publication_and_range(media, db):
    client, headers, _, root = media
    result = upload(media)
    assert result.status_code == 201, result.text
    upload_id = result.json()["id"]
    path = f"/v-ads/media/{upload_id}"
    assert client.get(path).status_code == 401
    assert client.get(path, headers=headers["other"]).status_code == 403
    assert client.get(path, headers=headers["owner"]).content == b"test-video"
    result = submit(media, upload_id)
    assert result.status_code == 201, result.text
    video_id = result.json()["id"]
    assert result.json()["status"] == "PENDING"
    assert client.get(path).status_code == 401
    assert submit(media, upload_id).status_code == 409
    assert review(media, video_id, role="owner").status_code == 403
    result = review(media, video_id)
    assert result.status_code == 200, result.text
    assert review(media, video_id).status_code == 409
    response = client.get(path, headers={"Range": "bytes=0-3"})
    assert response.status_code == 206
    assert response.content == b"test"
    assert response.headers["cache-control"] == "private, no-store"
    assert client.get(path, headers={"Range": "bytes=100-200"}).status_code == 416
    assert client.delete(f"/v-ads/uploads/{upload_id}", headers=headers["owner"]).status_code == 409
    assert db.scalar(select(func.count()).select_from(Audit).where(
        Audit.action == "V_ADS_VIDEO_REVIEW", Audit.entity_id == video_id)) == 1
    assert list((root / "staging").iterdir()) == []


def test_ownership_and_unapproved_advertiser(media, db):
    assert upload(media, role="other").status_code == 403
    upload_id = upload(media).json()["id"]
    assert submit(media, upload_id, role="other").status_code == 403
    media[2].status = "PENDING"
    db.commit()
    assert upload(media).status_code == 409
    assert submit(media, upload_id).status_code == 409


def test_rejection_revocation_and_shared_object_retention(media, db):
    client, headers, _, root = media
    first = upload(media).json()["id"]
    second = upload(media).json()["id"]
    video_id = submit(media, first).json()["id"]
    assert review(media, video_id, status="REJECTED").status_code == 200
    assert client.get(f"/v-ads/media/{first}").status_code == 401
    assert client.delete(f"/v-ads/uploads/{first}", headers=headers["other"]).status_code == 404
    assert client.delete(f"/v-ads/uploads/{first}", headers=headers["owner"]).status_code == 200
    assert client.get(f"/v-ads/media/{first}", headers=headers["owner"]).status_code == 404
    storage = VideoStorage(root)
    obj = storage._path(db.get(VAdsMediaUpload, first).storage_key)
    os.utime(obj, (time.time() - 90000,) * 2)
    assert cleanup_media(db, storage, offline=True, apply=True) == []
    assert client.delete(f"/v-ads/uploads/{second}", headers=headers["owner"]).status_code == 200
    candidates = cleanup_media(db, storage, offline=True)
    assert len(candidates) == 1 and obj.exists()
    cleanup_media(db, storage, offline=True, apply=True)
    assert not obj.exists()


def test_corruption_cannot_be_submitted_or_served(media, db):
    client, headers, _, root = media
    upload_id = upload(media).json()["id"]
    obj = VideoStorage(root)._path(db.get(VAdsMediaUpload, upload_id).storage_key)
    obj.write_bytes(b"bad!-video")
    assert submit(media, upload_id).status_code == 409
    assert client.get(f"/v-ads/media/{upload_id}", headers=headers["owner"]).status_code == 409


def test_validation_failure_cleans_staging(media, monkeypatch):
    from app.v_ads_video_validation import VideoValidationError
    def fail(path):
        raise VideoValidationError("Invalid MP4")
    monkeypatch.setattr("app.v_ads_video_service.validate_video", fail)
    assert upload(media).status_code == 422
    assert list((media[3] / "staging").iterdir()) == []


@pytest.mark.parametrize("length,status", [("104857601", 413), ("-1", 413), ("invalid", 411), ("1", 413), ("100", 400)])
def test_upload_size_bounds(media, length, status):
    client, headers, advertiser, _ = media
    result = client.post(f"/v-ads/advertisers/{advertiser.id}/uploads", content=b"video",
        headers={**headers["owner"], "Content-Type": "video/mp4", "Content-Length": length})
    assert result.status_code == status


def test_limits_and_no_external_url(media, monkeypatch):
    client, headers, advertiser, _ = media
    assert client.post(f"/v-ads/advertisers/{advertiser.id}/uploads", content=b"video").status_code == 401
    assert client.post(f"/v-ads/advertisers/{advertiser.id}/uploads", headers=headers["owner"],
                       content=b"video").status_code == 415
    assert submit(media, "missing", video_url="https://example.test/video.mp4").status_code == 422
    _upload_slots.acquire()
    _upload_slots.acquire()
    try:
        assert upload(media).status_code == 429
    finally:
        _upload_slots.release()
        _upload_slots.release()
    monkeypatch.delenv("V_ADS_MEDIA_ENABLED")
    assert upload(media).status_code == 503


def test_cleanup_requires_offline_and_grace(media, db):
    storage = VideoStorage(media[3])
    with pytest.raises(ValueError):
        cleanup_media(db, storage)
    with pytest.raises(ValueError):
        cleanup_media(db, storage, offline=True, grace_seconds=0)


def test_quota_rejects_before_validation(media, db, monkeypatch):
    _, _, advertiser, root = media
    for _ in range(20):
        db.add(VAdsMediaUpload(id=str(uuid4()), owner_id=advertiser.owner_id,
            advertiser_id=advertiser.id, storage_key="a" * 64 + ".mp4",
            sha256="a" * 64, size_bytes=1, status="VALIDATED"))
    db.commit()
    def should_not_probe(path):
        raise AssertionError("Quota rejection must precede probing")
    monkeypatch.setattr("app.v_ads_video_service.validate_video", should_not_probe)
    assert upload(media).status_code == 429
    assert list((root / "staging").iterdir()) == []


def test_suspended_advertiser_and_self_review(media, db):
    client, headers, advertiser, _ = media
    upload_id = upload(media).json()["id"]
    video_id = submit(media, upload_id).json()["id"]
    advertiser.status = "SUSPENDED"
    db.commit()
    assert review(media, video_id).status_code == 409
    advertiser.status = "APPROVED"
    advertiser.owner_id = db.scalar(select(User.id).where(User.role == "ADMIN"))
    db.commit()
    assert review(media, video_id).status_code == 403


def test_stale_staging_and_registration_failure_recovery(media, db, monkeypatch):
    from sqlalchemy.exc import SQLAlchemyError
    _, _, _, root = media
    def fail_commit():
        raise SQLAlchemyError("Synthetic database commit failure")
    with monkeypatch.context() as patch:
        patch.setattr(db, "commit", fail_commit)
        with pytest.raises(SQLAlchemyError):
            upload(media)
    db.rollback()
    assert list((root / "staging").iterdir()) == []
    staging = root / "staging" / "upload-stale.mp4"
    staging.write_bytes(b"stale")
    os.utime(staging, (time.time() - 90000,) * 2)
    for obj in (root / "objects").glob("*/*.mp4"):
        os.utime(obj, (time.time() - 90000,) * 2)
    candidates = cleanup_media(db, VideoStorage(root), offline=True)
    assert len(candidates) == 2
    cleanup_media(db, VideoStorage(root), offline=True, apply=True)
    assert not staging.exists()


@pytest.mark.skipif(not shutil.which("ffmpeg") or not shutil.which("ffprobe"),
                    reason="Real media tools required; exercised in isolated V Ads image")
def test_real_mp4_upload_to_publication(media, monkeypatch):
    from app.v_ads_video_validation import validate_video
    monkeypatch.setattr("app.v_ads_video_service.validate_video", validate_video)
    candidate = media[3] / "generated.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i",
                    "color=c=black:s=160x240:d=1", "-c:v", "libx264",
                    "-pix_fmt", "yuv420p", str(candidate)], check=True, timeout=15)
    result = upload(media, content=candidate.read_bytes())
    assert result.status_code == 201, result.text
    upload_id = result.json()["id"]
    video_id = submit(media, upload_id).json()["id"]
    assert review(media, video_id).status_code == 200
    response = media[0].get(f"/v-ads/media/{upload_id}", headers={"Range": "bytes=0-31"})
    assert response.status_code == 206 and response.content == candidate.read_bytes()[:32]


def test_seller_workspace_is_private_and_recovers_uploads(media, db, monkeypatch):
    client, headers, advertiser, _ = media
    assert client.get('/v-ads/me').status_code == 401
    upload_id = upload(media).json()['id']
    workspace = client.get('/v-ads/me', headers=headers['owner']).json()
    assert workspace['accounts'][0]['id'] == advertiser.id
    assert workspace['uploads'][0]['id'] == upload_id
    assert workspace['uploads'][0]['video_id'] is None
    assert workspace['uploads_available'] is True
    assert 'storage_key' not in workspace['uploads'][0]
    other = client.get('/v-ads/me', headers=headers['other']).json()
    assert other['accounts'] == other['uploads'] == other['videos'] == []
    video_id = submit(media, upload_id).json()['id']
    assert review(media, video_id, status='REJECTED').status_code == 200
    workspace = client.get('/v-ads/me', headers=headers['owner']).json()
    assert workspace['videos'][0]['status'] == 'REJECTED'
    assert workspace['videos'][0]['review_reason'] == 'Reviewed against advertising requirements'
    assert workspace['uploads'][0]['video_id'] == video_id
    monkeypatch.delenv('V_ADS_MEDIA_ENABLED')
    assert client.get('/v-ads/me', headers=headers['owner']).json()['uploads_available'] is False


def test_shared_reel_visibility_and_saved_like_state(media, db):
    client, headers, advertiser, _ = media
    upload_id = upload(media).json()['id']
    video_id = submit(media, upload_id).json()['id']
    path = '/v-ads/reels/' + video_id
    assert client.get(path).status_code == 404
    assert review(media, video_id).status_code == 200
    assert client.get(path).json()['advertiser']['id'] == advertiser.id
    assert client.get(path+'/engagement').status_code == 401
    assert client.get(path+'/engagement', headers=headers['owner']).json() == {'liked':False,'likes_count':0}
    assert client.post(path+'/like', headers=headers['owner']).status_code == 200
    assert client.get(path+'/engagement', headers=headers['owner']).json() == {'liked':True,'likes_count':1}
    assert client.get(path+'/engagement', headers=headers['other']).json() == {'liked':False,'likes_count':1}
    advertiser.status = 'SUSPENDED'
    db.commit()
    assert client.get(path).status_code == 404
