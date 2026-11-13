"""Owned management, independent moderation and conservative signed-in analytics."""
from datetime import timedelta
from typing import Literal
from uuid import NAMESPACE_URL, uuid5

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import Field
from sqlalchemy import select, update, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .database import get_db
from .models import User, Audit, now
from .security import current_user, seller_user, admin_user
from .workflow_schemas import Strict
from .v_ads_models import VAdsAdvertiser, VAdsVideo, VAdsView, VAdsLike, VAdsComment, VAdsMediaUpload
from .v_ads_account_routes import output, profile_token
from .v_ads_engagement_routes import published_video
from .v_ads_media_routes import media_storage, verified_path

router = APIRouter(tags=["V Ads management"])


class ProfileChange(Strict):
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=2000)
    expected_revision: str = Field(pattern=r"^[0-9a-f]{64}$")


class Reason(Strict):
    reason: str = Field(min_length=10, max_length=2000)
    expected_status: str = Field(min_length=1, max_length=12)


class AccountAction(Reason):
    status: Literal["SUSPENDED", "PENDING"]


class VideoEdit(Strict):
    title: str = Field(min_length=3, max_length=160)
    description: str = Field(default="", max_length=2000)


def reason_text(data):
    value = data.reason.strip()
    if len(value) < 10:
        raise HTTPException(422, "Enter a reason of at least 10 characters")
    return value


def locked_account(db, account_id):
    row = db.scalar(select(VAdsAdvertiser).where(VAdsAdvertiser.id == account_id)
                    .with_for_update().execution_options(populate_existing=True))
    if row is None:
        raise HTTPException(404, "Advertiser not found")
    return row


def owned_account(db, user, account_id):
    row = locked_account(db, account_id)
    if row.owner_id != user.id:
        raise HTTPException(403, "Advertiser ownership required")
    return row


def audit(db, user, action, entity, entity_id, details):
    db.add(Audit(actor_id=user.id, action=action, entity=entity,
                 entity_id=entity_id, details=details))


@router.post("/v-ads/advertisers/{account_id}/profile")
def edit_profile(account_id: str, data: ProfileChange,
                 user: User = Depends(seller_user), db: Session = Depends(get_db)):
    row = owned_account(db, user, account_id)
    if row.status == "SUSPENDED":
        raise HTTPException(409, "Suspended accounts require administrator review")
    if data.expected_revision != profile_token(row):
        raise HTTPException(409, "Profile changed; refresh before editing")
    name, description = data.name.strip(), data.description.strip()
    if len(name) < 2:
        raise HTTPException(422, "Enter an advertiser name of at least two characters")
    if (name, description) == (row.name, row.description):
        return output(row)
    before = {"name": row.name, "description": row.description, "status": row.status}
    # Compare both content and status so SQLite and PostgreSQL reject stale writes.
    result = db.execute(update(VAdsAdvertiser).where(VAdsAdvertiser.id == row.id,
        VAdsAdvertiser.name == row.name, VAdsAdvertiser.description == row.description,
        VAdsAdvertiser.status == row.status).values(name=name, description=description, status="PENDING"))
    if result.rowcount != 1:
        raise HTTPException(409, "Profile changed; refresh before editing")
    audit(db, user, "V_ADS_PROFILE_EDIT", "v_ads_advertiser", row.id,
          {"before": before, "status": "PENDING", "reason": "Seller updated profile; independent review required"})
    db.commit()
    db.refresh(row)
    return output(row)


@router.post("/admin/v-ads/advertisers/{account_id}/moderate")
def moderate_account(account_id: str, data: AccountAction,
                      user: User = Depends(admin_user), db: Session = Depends(get_db)):
    reason = reason_text(data)
    row = locked_account(db, account_id)
    if row.owner_id == user.id:
        raise HTTPException(403, "Another administrator must moderate this account")
    if (data.expected_status, data.status) not in {("APPROVED", "SUSPENDED"), ("SUSPENDED", "PENDING")}:
        raise HTTPException(409, "Invalid advertiser transition")
    result = db.execute(update(VAdsAdvertiser).where(VAdsAdvertiser.id == row.id,
        VAdsAdvertiser.status == data.expected_status).values(status=data.status))
    if result.rowcount != 1:
        raise HTTPException(409, "Advertiser changed; refresh before moderation")
    audit(db, user, "V_ADS_ACCOUNT_MODERATE", "v_ads_advertiser", row.id,
          {"previous_status": data.expected_status, "status": data.status, "reason": reason})
    db.commit()
    return {"id": row.id, "status": data.status}


def change_video(db, user, video_id, data, administrator):
    reason = reason_text(data)
    video = db.get(VAdsVideo, video_id)
    if video is None:
        raise HTTPException(404, "Video not found")
    account = locked_account(db, video.advertiser_id)
    if administrator and account.owner_id == user.id:
        raise HTTPException(403, "Another administrator must moderate this video")
    if not administrator and account.owner_id != user.id:
        raise HTTPException(403, "Video ownership required")
    if data.expected_status not in {"PENDING", "APPROVED", "REJECTED"}:
        raise HTTPException(409, "Removed videos cannot be restored")
    result = db.execute(update(VAdsVideo).where(VAdsVideo.id == video.id,
        VAdsVideo.status == data.expected_status).values(status="REMOVED"))
    if result.rowcount != 1:
        raise HTTPException(409, "Video changed; refresh before moderation")
    audit(db, user, "V_ADS_VIDEO_REMOVE" if administrator else "V_ADS_VIDEO_WITHDRAW",
          "v_ads_video", video.id, {"previous_status": data.expected_status,
          "status": "REMOVED", "reason": reason})
    db.commit()
    return {"id": video.id, "status": "REMOVED"}


@router.post("/v-ads/videos/{video_id}/withdraw")
def withdraw_video(video_id: str, data: Reason, user: User = Depends(seller_user),
                   db: Session = Depends(get_db)):
    return change_video(db, user, video_id, data, False)


@router.post("/v-ads/videos/{video_id}/edit")
def edit_video(video_id: str, data: VideoEdit, user: User = Depends(seller_user),
               db: Session = Depends(get_db)):
    video = db.scalar(select(VAdsVideo).where(VAdsVideo.id == video_id).with_for_update())
    if video is None:
        raise HTTPException(404, "Video not found")
    account = locked_account(db, video.advertiser_id)
    if account.owner_id != user.id:
        raise HTTPException(403, "Video ownership required")
    if video.status == "REMOVED":
        raise HTTPException(409, "Removed videos cannot be edited")
    title, description = data.title.strip(), data.description.strip()
    if len(title) < 3:
        raise HTTPException(422, "Enter a video title of at least three characters")
    before = {"title": video.title, "description": video.description, "status": video.status}
    video.title = title
    video.description = description
    video.status = "PENDING"
    video.published_at = None
    audit(db, user, "V_ADS_VIDEO_EDIT", "v_ads_video", video.id,
          {"before": before, "status": "PENDING", "reason": "Seller edited ad; awaiting administrator approval"})
    db.commit()
    return {"id": video.id, "title": video.title, "description": video.description, "status": video.status}


@router.delete("/v-ads/videos/{video_id}")
def delete_video(video_id: str, user: User = Depends(seller_user),
                 db: Session = Depends(get_db)):
    video = db.scalar(select(VAdsVideo).where(VAdsVideo.id == video_id).with_for_update())
    if video is None:
        raise HTTPException(404, "Video not found")
    account = locked_account(db, video.advertiser_id)
    if account.owner_id != user.id:
        raise HTTPException(403, "Video ownership required")
    if video.status == "REMOVED":
        return {"id": video.id, "status": "REMOVED"}
    previous = video.status
    video.status = "REMOVED"
    video.published_at = None
    audit(db, user, "V_ADS_VIDEO_WITHDRAW", "v_ads_video", video.id,
          {"previous_status": previous, "status": "REMOVED", "reason": "Deleted by seller from V Ads studio"})
    db.commit()
    return {"id": video.id, "status": "REMOVED"}


@router.post("/admin/v-ads/videos/{video_id}/remove")
def remove_video(video_id: str, data: Reason, user: User = Depends(admin_user),
                 db: Session = Depends(get_db)):
    return change_video(db, user, video_id, data, True)


def history(db, entity, entity_id, page):
    rows = db.scalars(select(Audit).where(Audit.entity == entity, Audit.entity_id == entity_id,
        Audit.action.like("V_ADS_%")).order_by(Audit.id.desc()).offset((page - 1) * 30).limit(31)).all()
    return {"items": [{"id": row.id, "actor_id": row.actor_id, "action": row.action,
        "created_at": row.created_at, "details": row.details} for row in rows[:30]],
        "page": page, "has_more": len(rows) > 30}


@router.get("/admin/v-ads/{kind}/{entity_id}/history")
def admin_history(kind: Literal["advertisers", "videos"], entity_id: str,
                   page: int = Query(1, ge=1, le=10000), user: User = Depends(admin_user),
                   db: Session = Depends(get_db)):
    model = VAdsAdvertiser if kind == "advertisers" else VAdsVideo
    if db.get(model, entity_id) is None:
        raise HTTPException(404, "Record not found")
    return history(db, "v_ads_advertiser" if kind == "advertisers" else "v_ads_video", entity_id, page)


@router.get("/v-ads/advertisers/{account_id}/history")
def seller_history(account_id: str, page: int = Query(1, ge=1, le=10000),
                    user: User = Depends(seller_user), db: Session = Depends(get_db)):
    owned_account(db, user, account_id)
    return history(db, "v_ads_advertiser", account_id, page)


def counts(db, video_ids):
    result = {key: {"views": 0, "likes": 0, "comments": 0} for key in video_ids}
    for label, model in [("views", VAdsView), ("likes", VAdsLike), ("comments", VAdsComment)]:
        query = select(model.video_id, func.count()).where(model.video_id.in_(video_ids))
        if model is VAdsComment:
            query = query.where(VAdsComment.status == "VISIBLE")
        if model is VAdsView:
            query = query.where(VAdsView.user_id.is_not(None))
        for video_id, count in db.execute(query.group_by(model.video_id)):
            result[video_id][label] = count
    return result


@router.get("/admin/v-ads/videos")
def video_queue(status: Literal["PENDING", "APPROVED", "REJECTED", "REMOVED"] = "PENDING",
                 page: int = Query(1, ge=1, le=10000), user: User = Depends(admin_user),
                 db: Session = Depends(get_db)):
    rows = db.execute(select(VAdsVideo, VAdsAdvertiser).join(VAdsAdvertiser,
        VAdsAdvertiser.id == VAdsVideo.advertiser_id).where(VAdsVideo.status == status)
        .order_by(VAdsVideo.created_at.desc(), VAdsVideo.id.desc()).offset((page - 1) * 30).limit(31)).all()
    metrics = counts(db, [video.id for video, _ in rows[:30]])
    return {"items": [{"id": video.id, "title": video.title, "description": video.description,
        "status": video.status, "advertiser": output(account), "owner_id": account.owner_id,
        "preview_available": bool(video.media_upload_id),
        "video_url": video.video_url or (f"/v-ads/media/{video.media_upload_id}" if video.media_upload_id else ""),
        "media_upload_id": video.media_upload_id,
        **metrics[video.id]}
        for video, account in rows[:30]], "page": page, "has_more": len(rows) > 30}


@router.get("/admin/v-ads/videos/{video_id}/preview")
def preview_video(video_id: str, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    storage = media_storage()
    video = db.get(VAdsVideo, video_id)
    upload = db.get(VAdsMediaUpload, video.media_upload_id) if video and video.media_upload_id else None
    if upload is None or upload.status != "VALIDATED":
        raise HTTPException(404, "Validated private preview not available")
    return FileResponse(verified_path(storage, upload), media_type="video/mp4",
        headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"})


def analytics(db, user, advertiser_id, page, administrator):
    videos = select(VAdsVideo.id)
    if advertiser_id:
        account = db.get(VAdsAdvertiser, advertiser_id)
        if account is None or (not administrator and account.owner_id != user.id):
            raise HTTPException(404, "Owned advertiser not found")
        videos = videos.where(VAdsVideo.advertiser_id == advertiser_id)
    elif not administrator:
        videos = videos.where(VAdsVideo.advertiser_id.in_(select(VAdsAdvertiser.id).where(
            VAdsAdvertiser.owner_id == user.id)))
    totals = {"videos": db.scalar(select(func.count()).select_from(VAdsVideo).where(VAdsVideo.id.in_(videos)))}
    for label, model in [("views", VAdsView), ("likes", VAdsLike), ("comments", VAdsComment)]:
        query = select(func.count()).select_from(model).where(model.video_id.in_(videos))
        if model is VAdsComment:
            query = query.where(VAdsComment.status == "VISIBLE")
        if model is VAdsView:
            query = query.where(VAdsView.user_id.is_not(None))
        totals[label] = db.scalar(query)
    rows = db.scalars(select(VAdsVideo).where(VAdsVideo.id.in_(videos)).order_by(
        VAdsVideo.created_at.desc(), VAdsVideo.id.desc()).offset((page - 1) * 30).limit(31)).all()
    metrics = counts(db, [row.id for row in rows[:30]])
    return {"totals": totals, "items": [{"id": row.id, "title": row.title,
        "status": row.status, **metrics[row.id]} for row in rows[:30]],
        "page": page, "has_more": len(rows) > 30,
        "view_policy": "Signed-in views only; one per account/video/UTC day; excludes advertiser owners and administrators."}


@router.get("/v-ads/analytics")
def seller_analytics(advertiser_id: str | None = None, page: int = Query(1, ge=1, le=10000),
                       user: User = Depends(seller_user), db: Session = Depends(get_db)):
    return analytics(db, user, advertiser_id, page, False)


@router.get("/admin/v-ads/analytics")
def admin_analytics(advertiser_id: str | None = None, page: int = Query(1, ge=1, le=10000),
                      user: User = Depends(admin_user), db: Session = Depends(get_db)):
    return analytics(db, user, advertiser_id, page, True)


@router.post("/v-ads/reels/{video_id}/view")
def record_view(video_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    video = published_video(db, video_id)
    account = db.get(VAdsAdvertiser, video.advertiser_id)
    if user.role == "ADMIN" or account.owner_id == user.id:
        return {"counted": False}
    # Database coordination works across API processes; the primary key makes
    # duplicate counting impossible even if two requests race on SQLite.
    db.scalar(select(User.id).where(User.id == user.id).with_for_update())
    timestamp = now()
    view_id = str(uuid5(NAMESPACE_URL, f"vistrah-vads-view:{user.id}:{video_id}:{timestamp.date().isoformat()}"))
    if db.get(VAdsView, view_id) is not None:
        return {"counted": False}
    minute = db.scalar(select(func.count()).select_from(VAdsView).where(
        VAdsView.user_id == user.id, VAdsView.created_at >= timestamp - timedelta(minutes=1)))
    day = db.scalar(select(func.count()).select_from(VAdsView).where(
        VAdsView.user_id == user.id, VAdsView.created_at >= timestamp - timedelta(days=1)))
    if minute >= 30 or day >= 300:
        raise HTTPException(429, "View counting limit reached; retry later")
    db.add(VAdsView(id=view_id, video_id=video_id, user_id=user.id))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return {"counted": False}
    return {"counted": True}
