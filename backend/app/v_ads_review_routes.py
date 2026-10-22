"""Administrator review of V Ads advertiser requests."""
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import Field
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from .database import get_db
from .models import User, Audit
from .security import admin_user
from .workflow_schemas import Strict
from .v_ads_models import VAdsAdvertiser, VAdsVideo
from .v_ads_account_routes import profile_token


router = APIRouter(tags=["V Ads administration"])


class AdvertiserDecision(Strict):
    status: Literal["APPROVED", "REJECTED"]
    reason: str = Field(min_length=10, max_length=2000)
    expected_revision: str | None = Field(default=None, pattern=r"^[0-9a-f]{64}$")


@router.post("/admin/v-ads/advertisers/{advertiser_id}/review")
def review_advertiser(
    advertiser_id: str,
    data: AdvertiserDecision,
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    reason = data.reason.strip()

    if len(reason) < 10:
        raise HTTPException(422, "Review reason must contain at least 10 characters")

    account = db.scalar(
        select(VAdsAdvertiser)
        .where(VAdsAdvertiser.id == advertiser_id)
        .with_for_update()
    )

    if account is None:
        raise HTTPException(404, "Advertiser account not found")

    if account.owner_id == user.id:
        raise HTTPException(
            403,
            "Another administrator must review this advertiser request",
        )

    if account.status != "PENDING":
        raise HTTPException(
            409,
            "Advertiser request has already been reviewed",
        )

    if data.expected_revision is not None and data.expected_revision != profile_token(account):
        raise HTTPException(409, "Advertiser profile changed; refresh before reviewing")
    result = db.execute(update(VAdsAdvertiser).where(
        VAdsAdvertiser.id == account.id, VAdsAdvertiser.status == "PENDING"
    ).values(status=data.status))
    if result.rowcount != 1:
        raise HTTPException(409, "Advertiser request has already been reviewed")

    db.add(Audit(
        actor_id=user.id,
        action="V_ADS_ADVERTISER_REVIEW",
        entity="v_ads_advertiser",
        entity_id=account.id,
        details={
            "previous_status": "PENDING",
            "status": data.status,
            "reason": reason,
        },
    ))

    db.commit()

    return {
        "id": account.id,
        "name": account.name,
        "handle": account.handle,
        "status": account.status,
        "review_reason": reason,
        "reviewer_id": user.id,
    }


class VideoDecision(Strict):
    status: Literal["APPROVED", "REJECTED"]
    reason: str = Field(default="", max_length=2000)


@router.post("/admin/v-ads/videos/{video_id}/review")
def review_video(
    video_id: str,
    data: VideoDecision,
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    from datetime import datetime, timezone
    from .v_ads_media_routes import media_storage
    video = db.scalar(
        select(VAdsVideo).where(VAdsVideo.id == video_id).with_for_update()
    )
    if video is None:
        raise HTTPException(404, "Video not found")

    account = db.get(VAdsAdvertiser, video.advertiser_id)
    if account and account.owner_id == user.id:
        raise HTTPException(403, "Another administrator must review this video")

    if video.status != "PENDING":
        raise HTTPException(409, "Video request has already been reviewed")

    if data.status == "APPROVED":
        media_storage()
        if not video.published_at:
            video.published_at = datetime.now(timezone.utc)
    else:
        video.published_at = None

    video.status = data.status

    db.add(Audit(
        actor_id=user.id,
        action="V_ADS_VIDEO_REVIEW",
        entity="v_ads_video",
        entity_id=video.id,
        details={"status": data.status, "reason": data.reason},
    ))
    db.commit()

    return {
        "id": video.id,
        "title": video.title,
        "status": video.status,
        "published_at": video.published_at,
        "reviewer_id": user.id,
    }
