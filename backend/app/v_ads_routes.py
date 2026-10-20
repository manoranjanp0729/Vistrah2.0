"""Public read-only V Ads feed and advertiser profiles."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from .database import get_db
from .v_ads_models import (
    VAdsAdvertiser, VAdsVideo, VAdsLike, VAdsComment
)

router = APIRouter(prefix="/v-ads", tags=["V Ads"])


def video_payload(db: Session, video: VAdsVideo, advertiser: VAdsAdvertiser):
    likes = db.scalar(
        select(func.count(VAdsLike.id)).where(VAdsLike.video_id == video.id)
    ) or 0

    comments = db.scalar(
        select(func.count(VAdsComment.id)).where(
            VAdsComment.video_id == video.id,
            VAdsComment.status == "VISIBLE",
        )
    ) or 0

    return {
        "id": video.id,
        "title": video.title,
        "description": video.description,
        "video_url": video.video_url,
        "published_at": video.published_at,
        "advertiser": {
            "id": advertiser.id,
            "name": advertiser.name,
            "handle": advertiser.handle,
        },
        "likes_count": likes,
        "comments_count": comments,
    }


@router.get("/reels")
def list_reels(
    page: int = Query(1, ge=1, le=10000),
    page_size: int = Query(10, ge=1, le=30),
    db: Session = Depends(get_db),
):
    statement = (
        select(VAdsVideo, VAdsAdvertiser)
        .join(
            VAdsAdvertiser,
            VAdsVideo.advertiser_id == VAdsAdvertiser.id,
        )
        .where(
            VAdsVideo.status == "APPROVED",
            VAdsAdvertiser.status == "APPROVED",
        )
        .order_by(
            VAdsVideo.published_at.desc(),
            VAdsVideo.id.desc(),
        )
        .offset((page - 1) * page_size)
        .limit(page_size + 1)
    )

    rows = db.execute(statement).all()
    has_more = len(rows) > page_size

    return {
        "items": [
            video_payload(db, video, advertiser)
            for video, advertiser in rows[:page_size]
        ],
        "page": page,
        "has_more": has_more,
    }


@router.get("/advertisers/{advertiser_id}")
def advertiser_profile(
    advertiser_id: str,
    db: Session = Depends(get_db),
):
    advertiser = db.scalar(
        select(VAdsAdvertiser).where(
            VAdsAdvertiser.id == advertiser_id,
            VAdsAdvertiser.status == "APPROVED",
        )
    )

    if advertiser is None:
        raise HTTPException(404, "Advertiser not found")

    videos = db.scalars(
        select(VAdsVideo)
        .where(
            VAdsVideo.advertiser_id == advertiser.id,
            VAdsVideo.status == "APPROVED",
        )
        .order_by(
            VAdsVideo.published_at.desc(),
            VAdsVideo.id.desc(),
        )
        .limit(30)
    ).all()

    return {
        "id": advertiser.id,
        "name": advertiser.name,
        "handle": advertiser.handle,
        "description": advertiser.description,
        "videos": [
            video_payload(db, video, advertiser)
            for video in videos
        ],
    }
