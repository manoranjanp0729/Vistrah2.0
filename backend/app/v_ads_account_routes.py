"""V Ads advertiser registration and official account management."""
from uuid import uuid4
from typing import Literal
import hashlib
import json
import re

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .database import get_db
from .models import User, Audit
from .security import seller_user, admin_user
from .workflow_schemas import Strict
from .v_ads_models import VAdsAdvertiser, VAdsVideo, VAdsMediaUpload


router = APIRouter(tags=["V Ads account management"])


@router.get("/v-ads/me")
def seller_workspace(page: int = Query(1, ge=1, le=10000),
                     user: User = Depends(seller_user), db: Session = Depends(get_db)):
    from .v_ads_media_routes import media_storage
    from .v_ads_management_routes import counts
    accounts = db.scalars(select(VAdsAdvertiser).where(
        VAdsAdvertiser.owner_id == user.id).order_by(VAdsAdvertiser.created_at.desc()).limit(30)).all()
    owned = select(VAdsAdvertiser.id).where(VAdsAdvertiser.owner_id == user.id)
    videos = db.scalars(select(VAdsVideo).where(
        VAdsVideo.advertiser_id.in_(owned), VAdsVideo.status != "REMOVED")
        .order_by(VAdsVideo.created_at.desc(), VAdsVideo.id.desc()).offset((page - 1) * 30).limit(31)).all()
    uploads = db.scalars(select(VAdsMediaUpload).where(VAdsMediaUpload.owner_id == user.id,
        VAdsMediaUpload.advertiser_id.in_(owned), VAdsMediaUpload.status == "VALIDATED")
        .order_by(VAdsMediaUpload.created_at.desc()).limit(20)).all()
    linked = dict(db.execute(select(VAdsVideo.media_upload_id, VAdsVideo.id).where(
        VAdsVideo.media_upload_id.in_([upload.id for upload in uploads]))).all())
    available = True
    try:
        media_storage()
    except HTTPException:
        available = False
    metrics = counts(db, [video.id for video in videos[:30]])
    adv_ids = list({video.advertiser_id for video in videos[:30]})
    advertisers_map = {}
    if adv_ids:
        adv_rows = db.scalars(select(VAdsAdvertiser).where(VAdsAdvertiser.id.in_(adv_ids))).all()
        advertisers_map = {adv.id: adv for adv in adv_rows}
    items = []
    for video in videos[:30]:
        review = db.scalar(select(Audit).where(Audit.entity == "v_ads_video",
            Audit.entity_id == video.id, Audit.action.in_([
                "V_ADS_VIDEO_REVIEW", "V_ADS_VIDEO_REMOVE", "V_ADS_VIDEO_WITHDRAW"]))
            .order_by(Audit.id.desc()).limit(1))
        upload = db.get(VAdsMediaUpload, video.media_upload_id) if video.media_upload_id else None
        owned_upload = upload if upload and upload.owner_id == user.id else None
        adv = advertisers_map.get(video.advertiser_id)
        is_owner = bool(adv is not None and adv.owner_id == user.id)
        items.append({"id": video.id, "advertiser_id": video.advertiser_id,
            "account_name": adv.name if adv else "",
            "account_handle": adv.handle if adv else "",
            "video_url": video.video_url,
            "is_owner": is_owner,
            "upload_id": owned_upload.id if owned_upload else None,
            "media_status": owned_upload.status if owned_upload else None,
            "title": video.title, "description": video.description, "status": video.status,
            "created_at": video.created_at, "review_reason": (review.details.get("reason", "") if review else "") if is_owner else "",
            **metrics.get(video.id, {"views": 0, "likes": 0, "comments": 0})})
    return {"accounts": [output(account) for account in accounts], "videos": items,
            "uploads": [{"id": upload.id, "advertiser_id": upload.advertiser_id,
                "size_bytes": upload.size_bytes, "video_id": linked.get(upload.id)} for upload in uploads],
            "uploads_available": available, "page": page, "has_more": len(videos) > 30}


class AdvertiserInput(Strict):
    name: str = Field(min_length=2, max_length=120)
    handle: str = Field(
        min_length=3,
        max_length=80,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
    )
    description: str = Field(default="", max_length=2000)


def cleaned(data: AdvertiserInput):
    name = data.name.strip()
    description = data.description.strip()

    if len(name) < 2:
        raise HTTPException(422, "Enter a valid advertiser name")

    return name, description


def profile_token(row: VAdsAdvertiser):
    return hashlib.sha256(json.dumps([row.id, row.name, row.handle,
        row.description, row.status], ensure_ascii=True).encode()).hexdigest()


def output(row: VAdsAdvertiser):
    return {
        "id": row.id,
        "name": row.name,
        "handle": row.handle,
        "description": row.description,
        "status": row.status,
        "created_at": row.created_at,
        "review_token": profile_token(row),
    }


def ensure_seller_v_ads_account(db: Session, user: User) -> VAdsAdvertiser:
    if user.role == "ADMIN":
        official = db.scalar(select(VAdsAdvertiser).where(VAdsAdvertiser.handle == "vistrah").limit(1))
        if official:
            if official.owner_id != user.id:
                official.owner_id = user.id
                for upload in db.scalars(select(VAdsMediaUpload).where(VAdsMediaUpload.advertiser_id == official.id)).all():
                    upload.owner_id = user.id
            official.name = "VISTRAH"
            return official
    existing = db.scalar(select(VAdsAdvertiser).where(VAdsAdvertiser.owner_id == user.id).limit(1))
    if existing:
        # Provisioning must not approve profile edits awaiting independent review.
        return existing
    is_admin = user.role == "ADMIN"
    base = "vistrah" if is_admin else re.sub(r"[^a-z0-9]+", "-", (user.name or "").lower()).strip("-")[:50]
    if len(base) < 3:
        base = f"seller-{user.id}"
    handle = base
    if db.scalar(select(VAdsAdvertiser.id).where(VAdsAdvertiser.handle == handle).limit(1)):
        handle = f"{base}-{user.id}"
    while db.scalar(select(VAdsAdvertiser.id).where(VAdsAdvertiser.handle == handle).limit(1)):
        handle = f"{base[:40]}-{uuid4().hex[:8]}"
    row = VAdsAdvertiser(
        id=str(uuid4()),
        owner_id=user.id,
        name="VISTRAH" if is_admin else ((user.name or "Seller").strip()[:120] or "Seller"),
        handle=handle,
        description="Official VISTRAH announcements." if is_admin else "",
        status="APPROVED",
    )
    db.add(row)
    db.add(Audit(
        actor_id=user.id,
        action="V_ADS_ADVERTISER_AUTO_CREATE",
        entity="v_ads_advertiser",
        entity_id=row.id,
        details={"status": "APPROVED"},
    ))
    return row


def create_account(db, user, data, status, action):
    name, description = cleaned(data)

    row = VAdsAdvertiser(
        id=str(uuid4()),
        owner_id=user.id,
        name=name,
        handle=data.handle,
        description=description,
        status=status,
    )

    db.add(row)
    db.add(Audit(
        actor_id=user.id,
        action=action,
        entity="v_ads_advertiser",
        entity_id=row.id,
        details={"status": status},
    ))

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            409,
            "Advertiser handle already exists or account conflicts with existing data",
        )

    db.refresh(row)
    return output(row)


@router.post("/v-ads/advertisers/request", status_code=201)
def request_advertiser(
    data: AdvertiserInput,
    user: User = Depends(seller_user),
    db: Session = Depends(get_db),
):
    existing = db.scalar(
        select(VAdsAdvertiser.id).where(
            VAdsAdvertiser.owner_id == user.id,
        ).limit(1)
    )

    if existing:
        raise HTTPException(
            409,
            "An advertiser account already exists for this seller",
        )

    return create_account(
        db,
        user,
        data,
        "PENDING",
        "V_ADS_ADVERTISER_REQUEST",
    )


@router.post("/admin/v-ads/official-advertisers", status_code=201)
def create_official_advertiser(
    data: AdvertiserInput,
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    return create_account(
        db,
        user,
        data,
        "APPROVED",
        "V_ADS_OFFICIAL_ADVERTISER_CREATE",
    )


@router.get("/admin/v-ads/advertisers")
def advertiser_queue(
    status: Literal["PENDING", "APPROVED", "REJECTED", "SUSPENDED"] = "PENDING",
    page: int = Query(1, ge=1, le=10000),
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    rows = db.scalars(
        select(VAdsAdvertiser)
        .where(VAdsAdvertiser.status == status)
        .order_by(
            VAdsAdvertiser.created_at.desc(),
            VAdsAdvertiser.id.desc(),
        )
        .offset((page - 1) * 30)
        .limit(31)
    ).all()

    return {
        "items": [
            {
                **output(row),
                "owner_id": row.owner_id,
            }
            for row in rows[:30]
        ],
        "page": page,
        "has_more": len(rows) > 30,
    }
