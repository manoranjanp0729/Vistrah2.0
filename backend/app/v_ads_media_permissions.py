"""Authorization checks for private V Ads media references."""
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .v_ads_models import VAdsAdvertiser, VAdsMediaUpload


def authorized_advertiser(
    db: Session,
    user_id: int,
    advertiser_id: str,
) -> VAdsAdvertiser:
    advertiser = db.scalar(
        select(VAdsAdvertiser).where(
            VAdsAdvertiser.id == advertiser_id,
        )
    )

    if advertiser is None:
        raise HTTPException(404, "Advertiser account not found")

    if advertiser.owner_id != user_id:
        raise HTTPException(403, "Advertiser ownership required")

    if advertiser.status != "APPROVED":
        raise HTTPException(409, "Advertiser account is not approved")

    return advertiser


def authorized_media(
    db: Session,
    user_id: int,
    advertiser_id: str,
    upload_id: str,
) -> VAdsMediaUpload:
    authorized_advertiser(db, user_id, advertiser_id)

    upload = db.scalar(
        select(VAdsMediaUpload).where(
            VAdsMediaUpload.id == upload_id,
            VAdsMediaUpload.owner_id == user_id,
            VAdsMediaUpload.advertiser_id == advertiser_id,
            VAdsMediaUpload.status == "VALIDATED",
        )
    )

    if upload is None:
        raise HTTPException(
            404,
            "Validated media upload not found for this advertiser",
        )

    return upload
