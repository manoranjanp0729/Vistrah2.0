"""Administrator review of V Ads advertiser, video and targeting requests."""
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import AliasChoices, Field, model_validator
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .database import get_db
from .models import User, Audit, now
from .security import admin_user
from .workflow_schemas import Strict
from .v_ads_models import VAdsAdvertiser, VAdsVideo
from .v_ads_account_routes import profile_token
from .v_ads_targeting_models import VAdsTargeting, VAdsTargetingRevision
from .v_ads_targeting_routes import _targeting_payload


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


class TargetingDecision(Strict):
    status: Literal["APPROVED", "REJECTED", "SUPERSEDED"] = Field(
        validation_alias=AliasChoices("status", "decision")
    )
    reason: str = Field(default="", max_length=2000)
    expected_revision: int | None = Field(default=None, ge=1, strict=True)

    @model_validator(mode="after")
    def validate_rejection_reason(self):
        self.reason = self.reason.strip()
        if self.status == "REJECTED" and not self.reason:
            raise ValueError("Rejection reason is required")
        return self


@router.patch("/v-ads/admin/targeting/{rule_id}/review")
@router.post("/v-ads/admin/targeting/{rule_id}/review")
def review_targeting(
    rule_id: str,
    data: TargetingDecision,
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    reviewer_id = user.id
    reviewed_ts = now()

    targeting = db.scalar(
        select(VAdsTargeting)
        .where(VAdsTargeting.video_id == rule_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    if targeting is None:
        raise HTTPException(404, "Targeting rule not found")

    video = db.scalar(
        select(VAdsVideo)
        .where(VAdsVideo.id == targeting.video_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    if video is None:
        raise HTTPException(404, "Targeting rule not found")

    account = db.scalar(
        select(VAdsAdvertiser)
        .where(VAdsAdvertiser.id == targeting.advertiser_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    if account and account.owner_id == reviewer_id:
        raise HTTPException(
            403,
            "Another administrator must review this targeting request",
        )

    pending = db.scalar(
        select(VAdsTargetingRevision)
        .where(
            VAdsTargetingRevision.video_id == rule_id,
            VAdsTargetingRevision.status == "PENDING",
        )
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    approved = db.scalar(
        select(VAdsTargetingRevision)
        .where(
            VAdsTargetingRevision.video_id == rule_id,
            VAdsTargetingRevision.status == "APPROVED",
        )
        .with_for_update()
        .execution_options(populate_existing=True)
    )

    superseded_rev: int | None = None
    if data.status in ("APPROVED", "REJECTED"):
        if pending is None:
            raise HTTPException(409, "No pending targeting revision to review")
        target_rev = pending.revision
        if data.expected_revision is not None and data.expected_revision != target_rev:
            raise HTTPException(409, "Targeting revision changed; refresh before reviewing")
        previous_status = "PENDING"

        if data.status == "APPROVED" and approved is not None:
            superseded_rev = approved.revision
            sup_res = db.execute(
                update(VAdsTargetingRevision)
                .where(
                    VAdsTargetingRevision.video_id == rule_id,
                    VAdsTargetingRevision.revision == superseded_rev,
                    VAdsTargetingRevision.status == "APPROVED",
                )
                .values(status="SUPERSEDED")
                .execution_options(synchronize_session=False)
            )
            if sup_res.rowcount != 1:
                db.rollback()
                raise HTTPException(409, "Active targeting revision state changed; retry")

        rev_res = db.execute(
            update(VAdsTargetingRevision)
            .where(
                VAdsTargetingRevision.video_id == rule_id,
                VAdsTargetingRevision.revision == target_rev,
                VAdsTargetingRevision.status == "PENDING",
            )
            .values(
                status=data.status,
                reviewed_at=reviewed_ts,
                reviewed_by=reviewer_id,
            )
            .execution_options(synchronize_session=False)
        )
        if rev_res.rowcount != 1:
            db.rollback()
            raise HTTPException(409, "Targeting revision has already been reviewed")
    else:
        if approved is None:
            raise HTTPException(409, "No active approved targeting revision to supersede")
        target_rev = approved.revision
        if data.expected_revision is not None and data.expected_revision != target_rev:
            raise HTTPException(409, "Targeting revision changed; refresh before reviewing")
        previous_status = "APPROVED"
        superseded_rev = target_rev

        sup_res = db.execute(
            update(VAdsTargetingRevision)
            .where(
                VAdsTargetingRevision.video_id == rule_id,
                VAdsTargetingRevision.revision == target_rev,
                VAdsTargetingRevision.status == "APPROVED",
            )
            .values(status="SUPERSEDED")
            .execution_options(synchronize_session=False)
        )
        if sup_res.rowcount != 1:
            db.rollback()
            raise HTTPException(409, "Active targeting revision state changed; retry")

    db.add(Audit(
        actor_id=reviewer_id,
        action="V_ADS_TARGETING_REVIEW",
        entity="v_ads_video",
        entity_id=rule_id,
        details={
            "advertiser_id": targeting.advertiser_id,
            "revision": target_rev,
            "previous_status": previous_status,
            "status": data.status,
            "superseded_revision": superseded_rev,
            "reason": data.reason,
        },
    ))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Conflicting targeting review state; retry") from None

    db.expire_all()
    refreshed_video = db.get(VAdsVideo, rule_id)
    payload = _targeting_payload(db, refreshed_video)
    payload.update({
        "rule_id": rule_id,
        "reviewed_revision": target_rev,
        "decision": data.status,
        "superseded_revision": superseded_rev,
        "review_reason": data.reason,
        "reviewer_id": reviewer_id,
    })
    return payload
