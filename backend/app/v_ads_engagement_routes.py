"""Authenticated V Ads likes and comments."""
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import Field
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .database import get_db
from .models import User
from .security import current_user
from .workflow_schemas import Strict
from .v_ads_models import (
    VAdsAdvertiser, VAdsVideo, VAdsLike, VAdsComment
)

router = APIRouter(prefix="/v-ads", tags=["V Ads engagement"])


class CommentInput(Strict):
    body: str = Field(min_length=1, max_length=500)


def published_video(db: Session, video_id: str):
    video = db.scalar(
        select(VAdsVideo)
        .join(
            VAdsAdvertiser,
            VAdsVideo.advertiser_id == VAdsAdvertiser.id,
        )
        .where(
            VAdsVideo.id == video_id,
            VAdsVideo.status == "APPROVED",
            VAdsAdvertiser.status == "APPROVED",
        )
    )
    if video is None:
        raise HTTPException(404, "Reel not found")
    return video


def count_likes(db: Session, video_id: str):
    return db.scalar(
        select(func.count(VAdsLike.id))
        .where(VAdsLike.video_id == video_id)
    ) or 0


@router.get("/reels/{video_id}")
def get_reel(video_id: str, db: Session = Depends(get_db)):
    from .v_ads_routes import video_payload
    video = published_video(db, video_id)
    return video_payload(db, video, db.get(VAdsAdvertiser, video.advertiser_id))


@router.get("/reels/{video_id}/engagement")
def get_engagement(video_id: str, user: User = Depends(current_user),
                   db: Session = Depends(get_db)):
    published_video(db, video_id)
    liked = db.scalar(select(VAdsLike.id).where(
        VAdsLike.video_id == video_id, VAdsLike.user_id == user.id)) is not None
    return {"liked": liked, "likes_count": count_likes(db, video_id)}


@router.post("/reels/{video_id}/like")
def like_reel(
    video_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    published_video(db, video_id)

    existing = db.scalar(
        select(VAdsLike).where(
            VAdsLike.video_id == video_id,
            VAdsLike.user_id == user.id,
        )
    )

    if existing is None:
        db.add(VAdsLike(
            id=str(uuid4()),
            video_id=video_id,
            user_id=user.id,
        ))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()

    return {
        "liked": True,
        "likes_count": count_likes(db, video_id),
    }


@router.delete("/reels/{video_id}/like")
def unlike_reel(
    video_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    published_video(db, video_id)

    existing = db.scalar(
        select(VAdsLike).where(
            VAdsLike.video_id == video_id,
            VAdsLike.user_id == user.id,
        )
    )

    if existing:
        db.delete(existing)
        db.commit()

    return {
        "liked": False,
        "likes_count": count_likes(db, video_id),
    }


@router.get("/reels/{video_id}/comments")
def list_comments(
    video_id: str,
    page: int = Query(1, ge=1, le=10000),
    page_size: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    published_video(db, video_id)

    comments = db.scalars(
        select(VAdsComment)
        .where(
            VAdsComment.video_id == video_id,
            VAdsComment.status == "VISIBLE",
        )
        .order_by(
            VAdsComment.created_at.desc(),
            VAdsComment.id.desc(),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return {
        "items": [
            {
                "id": comment.id,
                "user_id": comment.user_id,
                "body": comment.body,
                "created_at": comment.created_at,
            }
            for comment in comments
        ],
        "page": page,
    }


@router.post("/reels/{video_id}/comments", status_code=201)
def create_comment(
    video_id: str,
    data: CommentInput,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    published_video(db, video_id)

    body = data.body.strip()
    if not body:
        raise HTTPException(422, "Comment cannot be empty")

    comment = VAdsComment(
        id=str(uuid4()),
        video_id=video_id,
        user_id=user.id,
        body=body,
        status="VISIBLE",
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return {
        "id": comment.id,
        "video_id": video_id,
        "user_id": user.id,
        "body": comment.body,
        "created_at": comment.created_at,
    }


@router.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    comment = db.scalar(
        select(VAdsComment).where(
            VAdsComment.id == comment_id,
            VAdsComment.status == "VISIBLE",
        )
    )

    if comment is None:
        raise HTTPException(404, "Comment not found")

    if comment.user_id != user.id and user.role != "ADMIN":
        raise HTTPException(403, "Cannot delete another user's comment")

    comment.status = "DELETED"
    db.commit()

    return {"deleted": True}
