"""Submission of previously validated owned media; no external video URLs."""
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db
from .models import User, Audit
from .security import current_user
from .workflow_schemas import Strict
from .v_ads_media_permissions import authorized_media
from .v_ads_models import VAdsVideo, VAdsAdvertiser

router = APIRouter(tags=["V Ads video submissions"])


class VideoSubmission(Strict):
    advertiser_id: str
    title: str = Field(min_length=3, max_length=160)
    description: str = Field(default="", max_length=4000)
    upload_id: str = Field(min_length=1, max_length=36)


@router.post("/v-ads/videos/submit", status_code=201)
def submit_video(data: VideoSubmission, user: User = Depends(current_user),
                 db: Session = Depends(get_db)):
    from .v_ads_media_routes import media_storage, verified_path
    storage = media_storage()
    if len(data.title.strip()) < 3:
        raise HTTPException(422, "Enter a video title of at least three characters")
    db.scalar(select(VAdsAdvertiser).where(
        VAdsAdvertiser.id == data.advertiser_id).with_for_update())
    upload = authorized_media(db, user.id, data.advertiser_id, data.upload_id)
    verified_path(storage, upload)
    import os
    from datetime import datetime, timezone
    auto_approve = user.role == "ADMIN" or os.getenv("V_ADS_AUTO_APPROVE", "").lower() in ("1", "true")
    status = "APPROVED" if auto_approve else "PENDING"
    published_at = datetime.now(timezone.utc) if auto_approve else None
    video = VAdsVideo(id=str(uuid4()), advertiser_id=data.advertiser_id,
                     media_upload_id=upload.id, title=data.title,
                     description=data.description,
                     video_url=f"/v-ads/media/{upload.id}", status=status,
                     published_at=published_at)
    db.add(video)
    db.add(Audit(actor_id=user.id, action="V_ADS_VIDEO_SUBMIT",
                 entity="v_ads_video", entity_id=video.id,
                 details={"upload_id": upload.id}))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "This upload has already been submitted")
    return {"id": video.id, "status": video.status}
