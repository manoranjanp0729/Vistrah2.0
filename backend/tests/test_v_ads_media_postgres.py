"""Opt-in concurrency checks: only an explicitly named disposable PostgreSQL DB."""
import os
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, func
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Audit
from app.security import current_user
from app.v_ads_models import VAdsAdvertiser, VAdsMediaUpload, VAdsVideo
from app.v_ads_media_routes import router, review_video
from app.v_ads_video_submission_routes import submit_video, VideoSubmission
from app.v_ads_review_routes import AdvertiserDecision
from app.v_ads_video_storage import VideoStorage


@pytest.fixture
def postgres_media(tmp_path, monkeypatch):
    value = os.getenv("V_ADS_DISPOSABLE_POSTGRES_URL", "")
    if not value:
        pytest.skip("Explicit disposable PostgreSQL URL required")
    url = make_url(value)
    if url.get_backend_name() != "postgresql" or not (url.database or "").startswith("vads_disposable_"):
        pytest.fail("Refusing a database without the vads_disposable_ prefix")
    engine = create_engine(url, hide_parameters=True)
    monkeypatch.setenv("V_ADS_MEDIA_ENABLED", "1")
    monkeypatch.setenv("V_ADS_PRIVATE_ROOT", str(tmp_path))
    monkeypatch.setattr("app.v_ads_video_service.validate_video", lambda path: {
        "size_bytes": path.stat().st_size, "duration_seconds": 1, "width": 100, "height": 200})
    with Session(engine) as db:
        owner = User(name="Concurrent Owner", email=f"{uuid4()}@example.test", password_hash="test", seller_enabled=True)
        admin = User(name="Concurrent Admin", email=f"{uuid4()}@example.test", password_hash="test", role="ADMIN")
        db.add_all([owner, admin])
        db.flush()
        advertiser = VAdsAdvertiser(id=str(uuid4()), owner_id=owner.id, name="Concurrent",
                                    handle=uuid4().hex, status="APPROVED")
        db.add(advertiser)
        db.flush()
        stored = VideoStorage(tmp_path).store_validated(b"concurrent-test")
        upload = VAdsMediaUpload(id=str(uuid4()), owner_id=owner.id, advertiser_id=advertiser.id,
            storage_key=stored.key, sha256=stored.sha256, size_bytes=stored.size, status="VALIDATED")
        db.add(upload)
        db.commit()
        ids = (owner.id, admin.id, advertiser.id, upload.id)
    yield engine, ids
    engine.dispose()


def test_postgres_duplicate_submission_and_review(postgres_media):
    engine, (owner_id, admin_id, advertiser_id, upload_id) = postgres_media
    def submit(_):
        with Session(engine) as db:
            try:
                result = submit_video(VideoSubmission(advertiser_id=advertiser_id,
                    upload_id=upload_id, title="Concurrent submission"), db.get(User, owner_id), db)
                return 201, result["id"]
            except HTTPException as exc:
                return exc.status_code, None
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(submit, range(2)))
    assert sorted(code for code, _ in results) == [201, 409]
    video_id = next(identifier for code, identifier in results if code == 201)
    def review(_):
        with Session(engine) as db:
            try:
                review_video(video_id, AdvertiserDecision(status="APPROVED",
                    reason="Independent concurrent review verification"), db.get(User, admin_id), db)
                return 200
            except HTTPException as exc:
                return exc.status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(review, range(2))) == [200, 409]
    with Session(engine) as db:
        assert db.get(VAdsVideo, video_id).status == "APPROVED"
        assert db.scalar(select(func.count()).select_from(Audit).where(
            Audit.entity_id == video_id, Audit.action == "V_ADS_VIDEO_REVIEW")) == 1


def test_postgres_concurrent_upload_quota(postgres_media):
    engine, (owner_id, _, advertiser_id, _) = postgres_media
    with Session(engine) as db:
        for _ in range(18):
            db.add(VAdsMediaUpload(id=str(uuid4()), owner_id=owner_id, advertiser_id=advertiser_id,
                storage_key="a" * 64 + ".mp4", sha256="a" * 64, size_bytes=1, status="VALIDATED"))
        db.commit()
    app = FastAPI()
    app.include_router(router)
    def database():
        with Session(engine) as db:
            yield db
    def owner():
        with Session(engine) as db:
            return db.get(User, owner_id)
    app.dependency_overrides[get_db] = database
    app.dependency_overrides[current_user] = owner
    def upload(_):
        with TestClient(app) as client:
            return client.post(f"/v-ads/advertisers/{advertiser_id}/uploads",
                headers={"Content-Type": "video/mp4"}, content=b"quota-test").status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(upload, range(2))) == [201, 429]
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(VAdsMediaUpload).where(
            VAdsMediaUpload.advertiser_id == advertiser_id)) == 20
