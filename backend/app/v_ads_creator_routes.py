"""V Ads Video Creation API - Template-driven marketing ad generation."""
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import Field
from sqlalchemy.orm import Session

from .database import get_db
from .models import User, Audit
from .security import seller_user
from .workflow_schemas import Strict
from .v_ads_media_permissions import authorized_advertiser
from .v_ads_media_routes import media_storage
from .v_ads_creator_service import generate_marketing_video

router = APIRouter(tags=["V Ads video creator"])


class CreateVideoRequest(Strict):
    template_id: Literal["offer-sale", "service-showcase", "brand-launch", "customer-review"] = "offer-sale"
    title: str = Field(min_length=3, max_length=160)
    headline: str = Field(min_length=3, max_length=160)
    subtitle: str = Field(default="", max_length=200)
    offer_badge: str = Field(default="SPECIAL DEAL", max_length=40)
    highlights: list[str] = Field(default_factory=list, max_length=5)
    call_to_action: str = Field(default="Call Now", max_length=40)
    contact_info: str = Field(default="", max_length=120)
    music_mood: Literal["upbeat", "festive", "corporate", "ambient"] = "upbeat"
    images: list[str] = Field(default_factory=list, max_length=4)


@router.post("/v-ads/advertisers/{advertiser_id}/create-video", status_code=201)
def create_video_ad(
    advertiser_id: str,
    data: CreateVideoRequest,
    user: User = Depends(seller_user),
    db: Session = Depends(get_db),
):
    storage = media_storage()
    advertiser = authorized_advertiser(db, user.id, advertiser_id)

    # Clean text inputs
    payload = data.model_dump()
    payload["title"] = data.title.strip()
    payload["headline"] = data.headline.strip()
    payload["subtitle"] = data.subtitle.strip()
    payload["offer_badge"] = data.offer_badge.strip()
    payload["call_to_action"] = data.call_to_action.strip()
    payload["contact_info"] = data.contact_info.strip()

    upload = generate_marketing_video(db, user, advertiser, payload, storage)

    db.add(Audit(
        actor_id=user.id,
        action="V_ADS_VIDEO_CREATE",
        entity="v_ads_media_upload",
        entity_id=upload.id,
        details={
            "template_id": data.template_id,
            "title": data.title,
            "size_bytes": upload.size_bytes,
        },
    ))
    db.commit()

    return {
        "upload_id": upload.id,
        "video_url": f"/v-ads/media/{upload.id}",
        "status": "VALIDATED",
        "size_bytes": upload.size_bytes,
    }

