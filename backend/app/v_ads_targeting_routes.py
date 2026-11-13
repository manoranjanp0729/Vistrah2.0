"""Seller geographic targeting routes for V Ads videos."""
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import AliasChoices, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .database import get_db
from .models import Audit, User
from .security import seller_user
from .v_ads_geography import validate_point, validate_radius
from .v_ads_models import VAdsAdvertiser, VAdsVideo
from .v_ads_targeting_models import VAdsTargeting, VAdsTargetingRevision
from .workflow_schemas import Strict

router = APIRouter(prefix="/v-ads/seller", tags=["V Ads targeting"])

MAX_TARGET_REGIONS = 50
MAX_REGION_LENGTH = 120


class TargetingSubmission(Strict):
    latitude: float
    longitude: float
    radius_km: float = Field(validation_alias=AliasChoices("radius_km", "targeting_radius_km"))
    target_regions: list[str] = Field(default_factory=list)

    @field_validator("latitude", mode="before")
    @classmethod
    def check_latitude(cls, value: Any) -> float:
        lat, _ = validate_point(value, 0.0)
        return lat

    @field_validator("longitude", mode="before")
    @classmethod
    def check_longitude(cls, value: Any) -> float:
        _, lon = validate_point(0.0, value)
        return lon

    @field_validator("radius_km", mode="before")
    @classmethod
    def check_radius(cls, value: Any) -> float:
        return validate_radius(value)

    @field_validator("target_regions", mode="before")
    @classmethod
    def check_target_regions(cls, value: Any) -> list[str]:
        if value is None:
            return []
        if not isinstance(value, list):
            raise ValueError("target_regions must be a list of region names")
        if len(value) > MAX_TARGET_REGIONS:
            raise ValueError(f"At most {MAX_TARGET_REGIONS} target regions are allowed")
        cleaned: list[str] = []
        seen: set[str] = set()
        for item in value:
            if not isinstance(item, str):
                raise ValueError("Each target region must be a string")
            region = item.strip()
            if not region or len(region) > MAX_REGION_LENGTH:
                raise ValueError(f"Each target region must be 1 to {MAX_REGION_LENGTH} characters")
            key = region.casefold()
            if key not in seen:
                seen.add(key)
                cleaned.append(region)
        return cleaned


def _owned_video(db: Session, user: User, ad_id: str, *, lock: bool = False) -> tuple[VAdsVideo, VAdsAdvertiser]:
    video_stmt = select(VAdsVideo).where(VAdsVideo.id == ad_id)
    if lock:
        video_stmt = video_stmt.with_for_update().execution_options(populate_existing=True)
    video = db.scalar(video_stmt)
    if video is None:
        raise HTTPException(404, "Ad video not found")

    account_stmt = select(VAdsAdvertiser).where(VAdsAdvertiser.id == video.advertiser_id)
    if lock:
        account_stmt = account_stmt.with_for_update().execution_options(populate_existing=True)
    account = db.scalar(account_stmt)
    if account is None:
        raise HTTPException(404, "Advertiser account not found")
    if account.owner_id != user.id:
        raise HTTPException(403, "Video ownership required")
    return video, account


def _regions_by_revision(db: Session, video_id: str) -> dict[int, list[str]]:
    rows = db.scalars(
        select(Audit)
        .where(
            Audit.entity == "v_ads_video",
            Audit.entity_id == video_id,
            Audit.action == "V_ADS_TARGETING_SUBMIT",
        )
        .order_by(Audit.id.asc())
    ).all()
    mapping: dict[int, list[str]] = {}
    for row in rows:
        details = row.details if isinstance(row.details, dict) else {}
        rev = details.get("revision")
        regions = details.get("target_regions")
        if isinstance(rev, int) and isinstance(regions, list):
            mapping[rev] = [r for r in regions if isinstance(r, str)]
    return mapping


def _serialize_revision(row: VAdsTargetingRevision, regions_map: dict[int, list[str]]) -> dict[str, Any]:
    return {
        "revision": row.revision,
        "latitude": row.latitude,
        "longitude": row.longitude,
        "radius_km": row.targeting_radius_km,
        "targeting_radius_km": row.targeting_radius_km,
        "target_regions": regions_map.get(row.revision, []),
        "status": row.status,
        "created_at": row.created_at,
        "reviewed_at": row.reviewed_at,
        "reviewed_by": row.reviewed_by,
    }


def _targeting_payload(db: Session, video: VAdsVideo) -> dict[str, Any]:
    targeting = db.get(VAdsTargeting, video.id)
    if targeting is None:
        return {
            "ad_id": video.id,
            "video_id": video.id,
            "advertiser_id": video.advertiser_id,
            "configured": False,
            "created_at": None,
            "active_revision": None,
            "pending_revision": None,
            "latest_revision": None,
            "revisions": [],
        }

    revisions = db.scalars(
        select(VAdsTargetingRevision)
        .where(VAdsTargetingRevision.video_id == video.id)
        .order_by(VAdsTargetingRevision.revision.desc())
    ).all()
    regions_map = _regions_by_revision(db, video.id)
    items = [_serialize_revision(r, regions_map) for r in revisions]
    active = next((item for item in items if item["status"] == "APPROVED"), None)
    pending = next((item for item in items if item["status"] == "PENDING"), None)
    return {
        "ad_id": video.id,
        "video_id": video.id,
        "advertiser_id": video.advertiser_id,
        "configured": True,
        "created_at": targeting.created_at,
        "active_revision": active,
        "pending_revision": pending,
        "latest_revision": items[0] if items else None,
        "revisions": items,
    }


@router.get("/targeting/{ad_id}")
def get_ad_targeting(
    ad_id: str,
    user: User = Depends(seller_user),
    db: Session = Depends(get_db),
):
    video, _ = _owned_video(db, user, ad_id, lock=False)
    return _targeting_payload(db, video)


@router.post("/targeting/{ad_id}", status_code=201)
def submit_ad_targeting(
    ad_id: str,
    data: TargetingSubmission,
    user: User = Depends(seller_user),
    db: Session = Depends(get_db),
):
    video, account = _owned_video(db, user, ad_id, lock=True)
    if account.status == "SUSPENDED":
        raise HTTPException(409, "Suspended accounts require administrator review")
    if video.status == "REMOVED":
        raise HTTPException(409, "Removed videos cannot be edited")

    targeting = db.scalar(
        select(VAdsTargeting)
        .where(VAdsTargeting.video_id == video.id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    if targeting is None:
        targeting = VAdsTargeting(video_id=video.id, advertiser_id=video.advertiser_id)
        db.add(targeting)
        db.flush()

    existing_pending = db.scalar(
        select(VAdsTargetingRevision).where(
            VAdsTargetingRevision.video_id == video.id,
            VAdsTargetingRevision.status == "PENDING",
        )
    )
    if existing_pending is not None:
        raise HTTPException(409, "A pending targeting revision is already awaiting administrator review")

    max_rev = db.scalar(
        select(func.max(VAdsTargetingRevision.revision)).where(
            VAdsTargetingRevision.video_id == video.id
        )
    )
    next_revision = (max_rev or 0) + 1

    revision_row = VAdsTargetingRevision(
        video_id=video.id,
        revision=next_revision,
        latitude=data.latitude,
        longitude=data.longitude,
        targeting_radius_km=data.radius_km,
        status="PENDING",
    )
    db.add(revision_row)
    db.add(
        Audit(
            actor_id=user.id,
            action="V_ADS_TARGETING_SUBMIT",
            entity="v_ads_video",
            entity_id=video.id,
            details={
                "advertiser_id": video.advertiser_id,
                "revision": next_revision,
                "latitude": data.latitude,
                "longitude": data.longitude,
                "radius_km": data.radius_km,
                "target_regions": data.target_regions,
                "status": "PENDING",
            },
        )
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Targeting revision conflict; refresh and try again") from None

    payload = _targeting_payload(db, video)
    payload["submitted_revision"] = payload["pending_revision"]
    return payload

