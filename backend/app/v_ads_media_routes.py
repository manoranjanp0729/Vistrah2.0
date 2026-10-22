"""Bounded raw-MP4 upload and reviewed media access. No multipart buffering."""
import asyncio
import hashlib
import os
import tempfile
from pathlib import Path
from threading import BoundedSemaphore

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy import select, func, update
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from .database import get_db
from .models import Audit, User, now
from .security import current_user, admin_user, bearer, token_session
from .v_ads_models import VAdsAdvertiser, VAdsMediaUpload, VAdsVideo
from .v_ads_media_permissions import authorized_advertiser
from .v_ads_media_registration import register_validated_upload
from .v_ads_review_routes import AdvertiserDecision
from .v_ads_video_storage import VideoStorage
from .v_ads_video_validation import MAX_VIDEO_BYTES, VideoValidationError
from .v_ads_readiness import private_root, require_headroom

router = APIRouter(tags=["V Ads private media"])
_upload_slots = BoundedSemaphore(2)


def media_storage():
    root = os.getenv("V_ADS_PRIVATE_ROOT", "")
    if os.getenv("V_ADS_MEDIA_ENABLED") != "1" or not root:
        raise HTTPException(503, "Private video storage is not enabled")
    try:
        if os.getenv("APP_ENV") == "development" and Path(root).is_absolute() and not Path(root).exists():
            Path(root).mkdir(parents=True, mode=0o700, exist_ok=True)
        storage = VideoStorage(private_root(root))
        if not storage.root.is_dir():
            raise ValueError("Provision private persistent storage first")
        return storage
    except (ValueError, OSError):
        raise HTTPException(503, "Private video storage is unavailable")


def verified_path(storage, upload):
    try:
        path = storage._path(upload.storage_key)
        if not path.is_file() and os.getenv("APP_ENV") == "development":
            mirror = os.getenv("V_ADS_DEV_MIRROR_ROOT", "").strip()
            mirror_file = Path(mirror) / upload.storage_key if mirror else None
            if mirror_file and mirror_file.is_file() and not mirror_file.is_symlink():
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(mirror_file.read_bytes())
        if path.is_symlink() or not path.is_file() or path.stat().st_size != upload.size_bytes:
            raise ValueError("Missing or changed media")
        digest = hashlib.sha256()
        with path.open("rb") as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                digest.update(chunk)
        if digest.hexdigest() != upload.sha256:
            raise ValueError("Media integrity failure")
        return path
    except (OSError, ValueError):
        raise HTTPException(409, "Stored media is unavailable or failed integrity verification")


@router.post("/v-ads/advertisers/{advertiser_id}/uploads", status_code=201)
async def upload_video(advertiser_id: str, request: Request,
                       user: User = Depends(current_user), db: Session = Depends(get_db)):
    storage = media_storage()
    authorized_advertiser(db, user.id, advertiser_id)
    if request.headers.get("content-type", "").split(";")[0] != "video/mp4":
        raise HTTPException(415, "Send a raw video/mp4 request body")
    try:
        length = int(request.headers.get("content-length", ""))
    except ValueError:
        raise HTTPException(411, "A valid Content-Length is required")
    if not 0 < length <= MAX_VIDEO_BYTES:
        raise HTTPException(413, "Video must be between 1 byte and 100 MB")
    if not _upload_slots.acquire(blocking=False):
        raise HTTPException(429, "Video processing is busy; retry later")
    temporary = None
    try:
        try:
            require_headroom(storage.root)
        except ValueError:
            raise HTTPException(503, "Private storage reserve is not configured safely")
        except OSError:
            raise HTTPException(507, "Private video storage is full; retry after operator maintenance")
        staging = storage.root / "staging"
        staging.mkdir(mode=0o700, exist_ok=True)
        if staging.is_symlink():
            raise HTTPException(503, "Unsafe staging configuration")
        descriptor, name = tempfile.mkstemp(prefix="upload-", suffix=".mp4", dir=staging)
        temporary = Path(name)

        async def receive():
            size = 0
            with os.fdopen(descriptor, "wb") as stream:
                async for chunk in request.stream():
                    size += len(chunk)
                    if size > length or size > MAX_VIDEO_BYTES:
                        raise HTTPException(413, "Upload exceeds declared size")
                    stream.write(chunk)
            if size != length:
                raise HTTPException(400, "Upload length mismatch")

        try:
            await asyncio.wait_for(receive(), timeout=60)
        except asyncio.TimeoutError:
            raise HTTPException(408, "Upload timed out")
        try:
            def process():
                # Acquire database locks in a worker AFTER receiving the body;
                # a waiting lock must never block the async request receiver.
                account = db.scalar(select(VAdsAdvertiser).where(
                    VAdsAdvertiser.id == advertiser_id).with_for_update())
                db.refresh(account)
                authorized_advertiser(db, user.id, advertiser_id)
                count = db.scalar(select(func.count()).select_from(VAdsMediaUpload).where(
                    VAdsMediaUpload.advertiser_id == advertiser_id,
                    VAdsMediaUpload.status == "VALIDATED"))
                if count >= 20:
                    raise HTTPException(429, "Advertiser upload retention limit reached")
                return register_validated_upload(db, user, advertiser_id, temporary, storage)
            upload = await run_in_threadpool(process)
        except VideoValidationError as exc:
            raise HTTPException(422, str(exc))
        return {"id": upload.id, "status": upload.status, "size_bytes": upload.size_bytes}
    finally:
        try:
            if temporary is not None:
                temporary.unlink(missing_ok=True)
        finally:
            _upload_slots.release()


@router.get("/v-ads/media/{upload_id}")
def serve_video(upload_id: str, credentials=Depends(bearer), db: Session = Depends(get_db)):
    storage = media_storage()
    upload = db.get(VAdsMediaUpload, upload_id)
    if upload is None or upload.status != "VALIDATED":
        raise HTTPException(404, "Media not found")
    advertiser = db.get(VAdsAdvertiser, upload.advertiser_id)
    published = db.scalar(select(VAdsVideo.id).where(
        VAdsVideo.media_upload_id == upload.id, VAdsVideo.status == "APPROVED"))
    if not published or advertiser.status != "APPROVED":
        if credentials is None:
            raise HTTPException(401, "Sign in to preview private media")
        user, _ = token_session(db, credentials.credentials)
        if user.id != upload.owner_id and user.role != "ADMIN":
            raise HTTPException(403, "Private media access denied")
    path = verified_path(storage, upload)
    return FileResponse(path, media_type="video/mp4", headers={
        "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
        "Content-Disposition": 'inline; filename="video.mp4"'})


@router.post("/admin/v-ads/videos/{video_id}/review")
def review_video(video_id: str, data: AdvertiserDecision,
                 user: User = Depends(admin_user), db: Session = Depends(get_db)):
    reason = data.reason.strip()
    if len(reason) < 10:
        raise HTTPException(422, "Review reason must contain at least 10 characters")
    video = db.get(VAdsVideo, video_id)
    if video is None:
        raise HTTPException(404, "Video not found")
    advertiser = db.get(VAdsAdvertiser, video.advertiser_id)
    db.scalar(select(VAdsAdvertiser).where(
        VAdsAdvertiser.id == video.advertiser_id).with_for_update())
    db.refresh(advertiser)
    if advertiser.owner_id == user.id:
        raise HTTPException(403, "Another administrator must review this video")
    upload = db.get(VAdsMediaUpload, video.media_upload_id) if video.media_upload_id else None
    if data.status == "APPROVED":
        storage = media_storage()
        if (advertiser.status != "APPROVED" or upload is None or upload.status != "VALIDATED"
                or upload.advertiser_id != advertiser.id or upload.owner_id != advertiser.owner_id
                or video.video_url != f"/v-ads/media/{upload.id}"):
            raise HTTPException(409, "Approved advertiser and owned validated media required")
        verified_path(storage, upload)
    result = db.execute(update(VAdsVideo).where(VAdsVideo.id == video_id,
        VAdsVideo.status == "PENDING").values(status=data.status,
        published_at=now() if data.status == "APPROVED" else None))
    if result.rowcount != 1:
        raise HTTPException(409, "Video has already been reviewed")
    db.add(Audit(actor_id=user.id, action="V_ADS_VIDEO_REVIEW", entity="v_ads_video",
                 entity_id=video_id, details={"previous_status": "PENDING",
                 "status": data.status, "reason": reason}))
    db.commit()
    return {"id": video_id, "status": data.status, "review_reason": reason}


@router.delete("/v-ads/uploads/{upload_id}")
def revoke_upload(upload_id: str, user: User = Depends(current_user),
                  db: Session = Depends(get_db)):
    media_storage()
    upload = db.get(VAdsMediaUpload, upload_id)
    if upload is None or upload.owner_id != user.id:
        raise HTTPException(404, "Owned upload not found")
    db.scalar(select(VAdsAdvertiser).where(
        VAdsAdvertiser.id == upload.advertiser_id).with_for_update())
    video = db.scalar(select(VAdsVideo).where(VAdsVideo.media_upload_id == upload.id))
    if video is not None and video.status in {"PENDING", "APPROVED"}:
        raise HTTPException(409, "Submitted media must finish moderation before revocation")
    result = db.execute(update(VAdsMediaUpload).where(
        VAdsMediaUpload.id == upload.id, VAdsMediaUpload.status == "VALIDATED"
    ).values(status="REVOKED"))
    if result.rowcount != 1:
        raise HTTPException(409, "Upload is already revoked")
    db.add(Audit(actor_id=user.id, action="V_ADS_MEDIA_REVOKE", entity="v_ads_media_upload",
                 entity_id=upload.id, details={"previous_status": "VALIDATED"}))
    db.commit()
    return {"id": upload.id, "status": "REVOKED"}
