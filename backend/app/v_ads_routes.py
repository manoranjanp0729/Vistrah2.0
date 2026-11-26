"""Public read-only V Ads feed and advertiser profiles."""
import json
import re

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic.fields import FieldInfo
from sqlalchemy import exists, func, or_, select
from sqlalchemy.orm import Session

from .business_catalogue import business_types, find_business_type
from .database import get_db
from .models import Category, Provider, ProviderService, Service
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

AREA_COORDINATE_PRECISION = 2  # ~1.1 km locality grid; never expose exact seller or viewer GPS


def area_coordinates(latitude: float, longitude: float) -> dict[str, float]:
    return {
        "latitude": round(float(latitude), AREA_COORDINATE_PRECISION),
        "longitude": round(float(longitude), AREA_COORDINATE_PRECISION),
    }


def _opt_float(value) -> float | None:
    if value is None or isinstance(value, FieldInfo):
        return None
    return value


def _opt_bool(value) -> bool:
    if value is None or isinstance(value, FieldInfo):
        return False
    return bool(value)


def _opt_str(value) -> str | None:
    if value is None or isinstance(value, FieldInfo):
        return None
    cleaned = str(value).strip()
    return cleaned or None


_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
_META_START = "<!--V_AD_META:"
_META_END = ":V_AD_META-->"


def _extract_ad_taxonomy_meta(raw_description: str | None) -> tuple[str | None, str | None]:
    if not raw_description:
        return None, None
    start = raw_description.find(_META_START)
    end = raw_description.find(_META_END)
    if start == -1 or end == -1 or end <= start:
        return None, None
    try:
        parsed = json.loads(raw_description[start + len(_META_START) : end])
        if isinstance(parsed, dict):
            cat = parsed.get("category_slug")
            svc = parsed.get("service_type")
            return (
                cat if isinstance(cat, str) and cat else None,
                svc if isinstance(svc, str) and svc else None,
            )
    except Exception:
        return None, None
    return None, None


def _resolve_v_ads_taxonomy_filter(
    raw_category: str | None,
    raw_service_type: str | None,
    *,
    db: Session,
):
    if not raw_category and not raw_service_type:
        return None
    for val in (raw_category, raw_service_type):
        if val is not None and (len(val) > 100 or not _SLUG_RE.fullmatch(val)):
            raise HTTPException(422, "Select a valid category or service_type")

    if raw_service_type:
        found = find_business_type(raw_service_type, category_slug=raw_category, db=db)
        if not found:
            raise HTTPException(422, "Unknown service_type")
        found_cat, found_bt = found
        if raw_category and raw_category != found_cat["slug"]:
            raise HTTPException(422, "service_type does not belong to the selected category")
        slug = found_bt["slug"]
        title_lower = found_bt["title"].lower()
        return or_(
            VAdsVideo.description.contains(f'"service_type":"{slug}"'),
            VAdsVideo.description.contains(f'"service_type": "{slug}"'),
            func.lower(VAdsVideo.title).contains(title_lower),
            func.lower(VAdsVideo.description).contains(title_lower),
            exists(
                select(ProviderService.provider_id)
                .join(Provider, Provider.id == ProviderService.provider_id)
                .join(Service, Service.id == ProviderService.service_id)
                .where(
                    Provider.owner_user_id.is_not(None),
                    Provider.owner_user_id == VAdsAdvertiser.owner_id,
                    Provider.active.is_(True),
                    ProviderService.approval_status == "APPROVED",
                    Service.slug == slug,
                )
            ),
        )

    cats_by_slug = {c["slug"]: c for c in business_types()["categories"]}
    cat_def = cats_by_slug.get(raw_category or "")
    if not cat_def:
        raise HTTPException(422, "Unknown category")
    cat_slug = cat_def["slug"]
    return or_(
        VAdsVideo.description.contains(f'"category_slug":"{cat_slug}"'),
        VAdsVideo.description.contains(f'"category_slug": "{cat_slug}"'),
        exists(
            select(ProviderService.provider_id)
            .join(Provider, Provider.id == ProviderService.provider_id)
            .join(Service, Service.id == ProviderService.service_id)
            .join(Category, Category.id == Service.category_id)
            .where(
                Provider.owner_user_id.is_not(None),
                Provider.owner_user_id == VAdsAdvertiser.owner_id,
                Provider.active.is_(True),
                ProviderService.approval_status == "APPROVED",
                Category.slug == cat_slug,
            )
        ),
    )


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
    cat_slug, svc_slug = _extract_ad_taxonomy_meta(video.description)

    payload = {
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
    if cat_slug:
        payload["category_slug"] = cat_slug
    if svc_slug:
        payload["service_type"] = svc_slug
    return payload


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
    category: str | None = Query(None, max_length=100),
    service_type: str | None = Query(None, max_length=100),
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
    taxonomy_predicate = _resolve_v_ads_taxonomy_filter(
        _opt_str(category),
        _opt_str(service_type),
        db=db,
    )

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
            )
        )
        if taxonomy_predicate is not None:
            spatial_stmt = spatial_stmt.where(taxonomy_predicate)
        if only_local:
            lat_delta = (VAdsTargetingRevision.targeting_radius_km + EDGE_KM) * DEG_PER_KM
            min_lat, max_lat, min_lon, max_lon = bounding_box(
                user_lat, user_lon, discovery_radius
            )
            spatial_stmt = spatial_stmt.where(
                VAdsTargetingRevision.latitude.between(
                    user_lat - lat_delta,
                    user_lat + lat_delta,
                ),
                VAdsTargetingRevision.latitude.between(min_lat, max_lat),
                VAdsTargetingRevision.longitude.between(min_lon, max_lon),
            )

        candidates = db.execute(
            spatial_stmt.order_by(
                VAdsVideo.published_at.desc(),
                VAdsVideo.id.desc(),
            )
        ).all()

        matched: list[
            tuple[
                int,
                float,
                VAdsVideo,
                VAdsAdvertiser,
                float | None,
                str | None,
                float | None,
                dict[str, float] | None,
            ]
        ] = []
        for video, advertiser, rev in candidates:
            tier = classify_targeting(
                user_lat,
                user_lon,
                rev.latitude,
                rev.longitude,
                rev.targeting_radius_km,
                discovery_radius,
            )
            if only_local and tier != "local":
                continue
            dist = distance_km(user_lat, user_lon, rev.latitude, rev.longitude)
            if tier == "local":
                rank_tier, proximity = 0, "local"
            elif tier == "farther":
                rank_tier, proximity = 1, "farther"
            else:
                rank_tier, proximity = 2, "farther"
            matched.append((
                rank_tier,
                dist,
                video,
                advertiser,
                round(dist, 2),
                proximity,
                rev.targeting_radius_km,
                area_coordinates(rev.latitude, rev.longitude),
            ))

        matched.sort(key=lambda item: (item[0], item[1]))
        start = (page - 1) * page_size
        combined_slice = list(matched[start : start + page_size + 1])

        if not only_local and len(combined_slice) < page_size + 1:
            unpinned_offset = max(0, start - len(matched))
            unpinned_limit = (page_size + 1) - len(combined_slice)
            unpinned_stmt = (
                select(VAdsVideo, VAdsAdvertiser)
                .join(
                    VAdsAdvertiser,
                    VAdsVideo.advertiser_id == VAdsAdvertiser.id,
                )
                .where(
                    VAdsVideo.status == "APPROVED",
                    VAdsAdvertiser.status == "APPROVED",
                    ~exists(
                        select(VAdsTargetingRevision.video_id).where(
                            VAdsTargetingRevision.video_id == VAdsVideo.id,
                            VAdsTargetingRevision.status == "APPROVED",
                        )
                    ),
                )
            )
            if taxonomy_predicate is not None:
                unpinned_stmt = unpinned_stmt.where(taxonomy_predicate)
            unpinned_rows = db.execute(
                unpinned_stmt
                .order_by(
                    VAdsVideo.published_at.desc(),
                    VAdsVideo.id.desc(),
                )
                .offset(unpinned_offset)
                .limit(unpinned_limit)
            ).all()
            combined_slice.extend(
                (3, 0.0, video, advertiser, None, None, None, None)
                for video, advertiser in unpinned_rows
            )

        window = combined_slice[:page_size]
        has_more = len(combined_slice) > page_size
        counts = engagement_counts(db, [item[2].id for item in window])

        return {
            "items": [
                (
                    {
                        **video_payload(db, video, advertiser, counts),
                        "distance_km": dist_km,
                        "proximity": tier,
                        "targeting_radius_km": target_radius_km,
                        "area_coordinates": coarse_area,
                    }
                    if tier is not None
                    else video_payload(db, video, advertiser, counts)
                )
                for _, _, video, advertiser, dist_km, tier, target_radius_km, coarse_area in window
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
    )
    if taxonomy_predicate is not None:
        statement = statement.where(taxonomy_predicate)
    statement = (
        statement
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
