"""Public read-only V Ads feed and advertiser profiles."""
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic.fields import FieldInfo
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from .database import get_db
from .v_ads_geography import (
    DEFAULT_DISCOVERY_RADIUS_KM,
    DEG_PER_KM,
    EDGE_KM,
    bounding_box,
    classify_targeting,
    distance_km,
    validate_point,
    validate_radius,
)
from .v_ads_models import (
    VAdsAdvertiser, VAdsVideo, VAdsLike, VAdsComment
)
from .v_ads_targeting_models import VAdsTargeting, VAdsTargetingRevision

router = APIRouter(prefix="/v-ads", tags=["V Ads"])


def _opt_float(value) -> float | None:
    if value is None or isinstance(value, FieldInfo):
        return None
    return value


def _opt_bool(value) -> bool:
    if value is None or isinstance(value, FieldInfo):
        return False
    return bool(value)


def engagement_counts(db: Session, video_ids: list[str]) -> dict[str, tuple[int, int]]:
    if not video_ids:
        return {}
    likes = dict(db.execute(select(VAdsLike.video_id, func.count(VAdsLike.id))
        .where(VAdsLike.video_id.in_(video_ids)).group_by(VAdsLike.video_id)).all())
    comments = dict(db.execute(select(VAdsComment.video_id, func.count(VAdsComment.id))
        .where(VAdsComment.video_id.in_(video_ids), VAdsComment.status == "VISIBLE")
        .group_by(VAdsComment.video_id)).all())
    return {identity: (likes.get(identity, 0), comments.get(identity, 0)) for identity in video_ids}


def video_payload(db: Session, video: VAdsVideo, advertiser: VAdsAdvertiser,
                  counts: dict[str, tuple[int, int]] | None = None):
    counts = engagement_counts(db, [video.id]) if counts is None else counts
    likes, comments = counts.get(video.id, (0, 0))

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
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    latitude: float | None = Query(None),
    longitude: float | None = Query(None),
    radius_km: float | None = Query(None),
    radius: float | None = Query(None),
    local_only: bool = Query(False),
    x_user_latitude: float | None = Header(None, alias="X-User-Latitude"),
    x_user_longitude: float | None = Header(None, alias="X-User-Longitude"),
    x_user_radius_km: float | None = Header(None, alias="X-User-Radius-Km"),
    db: Session = Depends(get_db),
):
    raw_lat = next(
        (v for v in (_opt_float(lat), _opt_float(latitude), _opt_float(x_user_latitude)) if v is not None),
        None,
    )
    raw_lon = next(
        (v for v in (_opt_float(lon), _opt_float(longitude), _opt_float(x_user_longitude)) if v is not None),
        None,
    )
    raw_radius = next(
        (v for v in (_opt_float(radius_km), _opt_float(radius), _opt_float(x_user_radius_km)) if v is not None),
        None,
    )
    only_local = _opt_bool(local_only)

    if (raw_lat is None) != (raw_lon is None):
        raise HTTPException(422, "Both lat and lon are required for geographic filtering")
    if raw_lat is None and (raw_radius is not None or only_local):
        raise HTTPException(422, "Coordinates lat and lon are required when filtering by radius")

    if raw_lat is not None and raw_lon is not None:
        try:
            user_lat, user_lon = validate_point(raw_lat, raw_lon)
            discovery_radius = (
                validate_radius(raw_radius)
                if raw_radius is not None
                else DEFAULT_DISCOVERY_RADIUS_KM
            )
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from None

        lat_delta = (VAdsTargetingRevision.targeting_radius_km + EDGE_KM) * DEG_PER_KM
        spatial_stmt = (
            select(VAdsVideo, VAdsAdvertiser, VAdsTargetingRevision)
            .join(
                VAdsAdvertiser,
                VAdsVideo.advertiser_id == VAdsAdvertiser.id,
            )
            .join(
                VAdsTargeting,
                (VAdsTargeting.video_id == VAdsVideo.id)
                & (VAdsTargeting.advertiser_id == VAdsVideo.advertiser_id),
            )
            .join(
                VAdsTargetingRevision,
                (VAdsTargetingRevision.video_id == VAdsTargeting.video_id)
                & (VAdsTargetingRevision.status == "APPROVED"),
            )
            .where(
                VAdsVideo.status == "APPROVED",
                VAdsAdvertiser.status == "APPROVED",
                VAdsTargetingRevision.latitude.between(
                    user_lat - lat_delta,
                    user_lat + lat_delta,
                ),
            )
        )
        if only_local:
            min_lat, max_lat, min_lon, max_lon = bounding_box(
                user_lat, user_lon, discovery_radius
            )
            spatial_stmt = spatial_stmt.where(
                VAdsTargetingRevision.latitude.between(min_lat, max_lat),
                VAdsTargetingRevision.longitude.between(min_lon, max_lon),
            )

        candidates = db.execute(
            spatial_stmt.order_by(
                VAdsVideo.published_at.desc(),
                VAdsVideo.id.desc(),
            )
        ).all()

        matched: list[tuple[int, VAdsVideo, VAdsAdvertiser, float, str, float]] = []
        for video, advertiser, rev in candidates:
            b_min_lat, b_max_lat, b_min_lon, b_max_lon = bounding_box(
                rev.latitude, rev.longitude, rev.targeting_radius_km
            )
            if not (b_min_lat <= user_lat <= b_max_lat and b_min_lon <= user_lon <= b_max_lon):
                continue
            tier = classify_targeting(
                user_lat,
                user_lon,
                rev.latitude,
                rev.longitude,
                rev.targeting_radius_km,
                discovery_radius,
            )
            if tier is None or (only_local and tier != "local"):
                continue
            dist = distance_km(user_lat, user_lon, rev.latitude, rev.longitude)
            matched.append((
                0 if tier == "local" else 1,
                video,
                advertiser,
                round(dist, 4),
                tier,
                rev.targeting_radius_km,
            ))

        matched.sort(key=lambda item: item[0])
        start = (page - 1) * page_size
        window = matched[start : start + page_size]
        has_more = len(matched) > start + page_size
        counts = engagement_counts(db, [item[1].id for item in window])

        return {
            "items": [
                {
                    **video_payload(db, video, advertiser, counts),
                    "distance_km": dist_km,
                    "proximity": tier,
                    "targeting_radius_km": target_radius_km,
                }
                for _, video, advertiser, dist_km, tier, target_radius_km in window
            ],
            "page": page,
            "has_more": has_more,
        }

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
    counts = engagement_counts(db, [video.id for video, _ in rows[:page_size]])

    return {
        "items": [
            video_payload(db, video, advertiser, counts)
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

    counts = engagement_counts(db, [video.id for video in videos])
    products = []
    if advertiser.owner_id:
        try:
            from .commerce_models import CommerceListing
            listings = db.scalars(
                select(CommerceListing)
                .where(
                    CommerceListing.seller_id == advertiser.owner_id,
                    CommerceListing.status == "APPROVED",
                    CommerceListing.available == True,
                )
                .order_by(
                    CommerceListing.published_at.desc(),
                    CommerceListing.id.desc(),
                )
                .limit(20)
            ).all()
            products = [
                {
                    "id": item.id,
                    "title": item.title,
                    "description": item.description,
                    "unit_price_paise": item.unit_price_paise,
                    "currency": item.currency,
                    "delivery_fee_paise": item.delivery_fee_paise,
                    "fulfilment_modes": item.fulfilment_modes or [],
                }
                for item in listings
            ]
        except Exception:
            products = []

    return {
        "id": advertiser.id,
        "name": advertiser.name,
        "handle": advertiser.handle,
        "description": advertiser.description,
        "videos": [
            video_payload(db, video, advertiser, counts)
            for video in videos
        ],
        "products": products,
    }
