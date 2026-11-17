"""Public spatial discovery for the 13-category / 81-type marketplace.

Read-only Haversine + bounding-box query; customer search coordinates are never
persisted or logged. Existing membership-gated `/services/{id}/nearby` remains
untouched.
"""
from __future__ import annotations

import math
import re

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import Field
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from .business_catalogue import business_types, find_business_type
from .database import get_db
from .location_routes import EARTH_KM, EDGE_KM, distance_expression
from .marketplace_taxonomy import legacy_map
from .models import Category, Provider, ProviderService, Service, User
from .provider_models import ProviderApplication
from .provider_requirements import SafeModel

router = APIRouter(tags=["Marketplace nearby discovery"])

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
MAX_RESULTS = 50


class MarketplaceNearbyBody(SafeModel):
    category: str | None = Field(default=None, max_length=100)
    business_type: str | None = Field(default=None, max_length=100)
    type: str | None = Field(default=None, max_length=100)
    subcategory: str | None = Field(default=None, max_length=100)
    lat: float | None = Field(default=None, strict=True)
    lng: float | None = Field(default=None, strict=True)
    latitude: float | None = Field(default=None, strict=True)
    longitude: float | None = Field(default=None, strict=True)
    radius_km: float = Field(default=10.0, strict=True)


def _clean_slug(raw: str | None) -> str | None:
    if raw is None:
        return None
    val = raw.strip()
    if not val:
        return None
    if len(val) > 100 or not SLUG_RE.fullmatch(val):
        raise HTTPException(422, "Select a valid category or business type")
    return val


def _validate_coordinates(
    raw_lat: float | None,
    raw_lng: float | None,
    raw_radius: float,
) -> tuple[float, float, float]:
    if raw_lat is None or raw_lng is None:
        raise HTTPException(422, "Provide both lat and lng coordinates")
    if isinstance(raw_lat, bool) or isinstance(raw_lng, bool) or isinstance(raw_radius, bool):
        raise HTTPException(422, "Invalid numeric coordinate or radius")
    lat = float(raw_lat)
    lng = float(raw_lng)
    radius_km = float(raw_radius)
    if not (math.isfinite(lat) and -90.0 <= lat <= 90.0):
        raise HTTPException(422, "Latitude must be between -90 and 90")
    if not (math.isfinite(lng) and -180.0 <= lng <= 180.0):
        raise HTTPException(422, "Longitude must be between -180 and 180")
    if not (math.isfinite(radius_km) and 1.0 <= radius_km <= 200.0):
        raise HTTPException(422, "Radius must be between 1 and 200 km")
    return lat, lng, radius_km


def _resolve_category_and_type(
    category_slug: str | None,
    type_slug: str | None,
) -> tuple[dict, dict | None]:
    cat_slug = _clean_slug(category_slug)
    bt_slug = _clean_slug(type_slug)
    if not cat_slug and not bt_slug:
        raise HTTPException(422, "Select a category or business type")

    cats_by_slug = {c["slug"]: c for c in business_types()["categories"]}

    # Direct current v2 lookup
    if bt_slug:
        found = find_business_type(bt_slug)
        if found:
            found_cat, found_bt = found
            if cat_slug and cat_slug != found_cat["slug"]:
                # Allow legacy category slug paired with mapped business type
                mapped_cat = legacy_map().get("categories", {}).get(cat_slug)
                if mapped_cat != found_cat["slug"]:
                    raise HTTPException(422, "Business type does not belong to the selected category")
            return found_cat, found_bt

        # Legacy v1 subcategory -> v2 (category, business_type) fallback
        mapped_pair = legacy_map().get("subcategories", {}).get(bt_slug)
        if mapped_pair and len(mapped_pair) == 2:
            new_cat_slug, new_bt_slug = mapped_pair
            if cat_slug:
                allowed_cat = cats_by_slug.get(cat_slug) or cats_by_slug.get(
                    legacy_map().get("categories", {}).get(cat_slug, "")
                )
                if not allowed_cat or allowed_cat["slug"] != new_cat_slug:
                    raise HTTPException(422, "Select a valid category and business type")
            found_legacy = find_business_type(new_bt_slug)
            if found_legacy:
                return found_legacy

        raise HTTPException(422, "Unknown business type")

    # Category-only lookup
    resolved_cat = cats_by_slug.get(cat_slug or "")
    if not resolved_cat and cat_slug:
        mapped_cat_slug = legacy_map().get("categories", {}).get(cat_slug)
        if mapped_cat_slug:
            resolved_cat = cats_by_slug.get(mapped_cat_slug)
    if not resolved_cat:
        raise HTTPException(422, "Unknown category")
    return resolved_cat, None


def _run_marketplace_nearby(
    db: Session,
    *,
    category_slug: str | None,
    type_slug: str | None,
    lat: float,
    lng: float,
    radius_km: float,
) -> dict:
    cat_def, bt_def = _resolve_category_and_type(category_slug, type_slug)
    distance = distance_expression(lat, lng)

    # Bounding-box pre-filter before exact Haversine check
    deg_lat = math.degrees(radius_km / EARTH_KM) + 0.01
    min_lat = max(-90.0, lat - deg_lat)
    max_lat = min(90.0, lat + deg_lat)

    query = (
        select(
            Provider,
            ProviderService,
            Service,
            Category,
            distance.label("distance_km"),
        )
        .join(ProviderService, ProviderService.provider_id == Provider.id)
        .join(Service, Service.id == ProviderService.service_id)
        .join(Category, Category.id == Service.category_id)
        .outerjoin(User, User.id == Provider.owner_user_id)
        .where(
            Provider.active.is_(True),
            Provider.verification_status == "VERIFIED",
            Provider.latitude.is_not(None),
            Provider.longitude.is_not(None),
            Provider.latitude.between(min_lat, max_lat),
            ProviderService.approval_status == "APPROVED",
            Service.active.is_(True),
            Category.active.is_(True),
            Category.slug == cat_def["slug"],
            or_(
                Provider.owner_user_id.is_(None),
                and_(User.deleted_at.is_(None), User.seller_enabled.is_(True)),
            ),
            distance <= radius_km + EDGE_KM,
        )
    )

    if abs(lat) < 85.0:
        cos_lat = max(math.cos(math.radians(lat)), 0.087)
        deg_lng = math.degrees(radius_km / (EARTH_KM * cos_lat)) + 0.02
        if deg_lng < 179.0:
            min_lng = lng - deg_lng
            max_lng = lng + deg_lng
            if min_lng < -180.0:
                query = query.where(
                    or_(
                        Provider.longitude >= min_lng + 360.0,
                        Provider.longitude <= max_lng,
                    )
                )
            elif max_lng > 180.0:
                query = query.where(
                    or_(
                        Provider.longitude >= min_lng,
                        Provider.longitude <= max_lng - 360.0,
                    )
                )
            else:
                query = query.where(Provider.longitude.between(min_lng, max_lng))

    if bt_def is not None:
        query = query.where(Service.slug == bt_def["slug"])

    rows = db.execute(query.order_by(distance.asc(), Provider.id.asc()).limit(MAX_RESULTS * 3)).all()

    # Deduplicate by Provider.id when browsing an entire category
    deduped: list[tuple[Provider, ProviderService, Service, Category, float]] = []
    seen_provider_ids: set[int] = set()
    for provider, grant, service, category, km in rows:
        if provider.id in seen_provider_ids:
            continue
        seen_provider_ids.add(provider.id)
        deduped.append((provider, grant, service, category, float(km)))
        if len(deduped) >= MAX_RESULTS:
            break

    # Batch-fetch linked ProviderApplication common metadata (whatsapp, timings)
    app_by_id: dict[str, ProviderApplication] = {}
    app_by_provider_id: dict[int, ProviderApplication] = {}
    if deduped:
        app_ids = [grant.application_id for _, grant, _, _, _ in deduped if grant.application_id]
        provider_ids = [provider.id for provider, _, _, _, _ in deduped]
        if app_ids:
            for app in db.scalars(select(ProviderApplication).where(ProviderApplication.id.in_(app_ids))).all():
                app_by_id[app.id] = app
        for app in db.scalars(
            select(ProviderApplication)
            .where(ProviderApplication.provider_id.in_(provider_ids))
            .order_by(ProviderApplication.updated_at.desc())
        ).all():
            if app.provider_id is not None and app.provider_id not in app_by_provider_id:
                app_by_provider_id[app.provider_id] = app

    items = []
    for provider, grant, service, category, km in deduped:
        linked_app = (
            (app_by_id.get(grant.application_id) if grant.application_id else None)
            or app_by_provider_id.get(provider.id)
        )
        common = linked_app.common if (linked_app and isinstance(linked_app.common, dict)) else {}
        phone_clean = (provider.phone or "").strip()
        explicit_whatsapp = str(common.get("whatsapp") or "").strip()
        whatsapp_clean = explicit_whatsapp or phone_clean
        timings_clean = str(common.get("timings") or "").strip()

        items.append(
            {
                "id": provider.id,
                "slug": provider.slug,
                "name": provider.company or provider.name,
                "company": provider.company,
                "contact_name": provider.name,
                "category_slug": category.slug,
                "business_type": service.slug,
                "service_title": service.title,
                "description": (grant.description or "").strip(),
                "address": provider.address,
                "location": provider.location,
                "latitude": float(provider.latitude),
                "longitude": float(provider.longitude),
                "distance_km": round(km, 2),
                "coverage_radius_km": float(grant.coverage_radius_km) if grant.coverage_radius_km is not None else None,
                "verification_status": provider.verification_status,
                "phone": phone_clean,
                "whatsapp": whatsapp_clean,
                "timings": timings_clean,
            }
        )

    return {
        "category": {"slug": cat_def["slug"], "title": cat_def["title"]},
        "business_type": {"slug": bt_def["slug"], "title": bt_def["title"]} if bt_def else None,
        "radius_km": radius_km,
        "total": len(items),
        "items": items,
    }


@router.get("/marketplace/nearby")
def get_marketplace_nearby(
    response: Response,
    category: str | None = Query(default=None, max_length=100),
    business_type: str | None = Query(default=None, max_length=100),
    type: str | None = Query(default=None, max_length=100),
    subcategory: str | None = Query(default=None, max_length=100),
    lat: float | None = Query(default=None),
    lng: float | None = Query(default=None),
    latitude: float | None = Query(default=None),
    longitude: float | None = Query(default=None),
    radius_km: float = Query(default=10.0),
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = "private, no-store"
    resolved_lat, resolved_lng, resolved_radius = _validate_coordinates(
        lat if lat is not None else latitude,
        lng if lng is not None else longitude,
        radius_km,
    )
    resolved_type = business_type or type or subcategory
    return _run_marketplace_nearby(
        db,
        category_slug=category,
        type_slug=resolved_type,
        lat=resolved_lat,
        lng=resolved_lng,
        radius_km=resolved_radius,
    )


@router.post("/marketplace/nearby")
def post_marketplace_nearby(
    data: MarketplaceNearbyBody,
    response: Response,
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = "private, no-store"
    resolved_lat, resolved_lng, resolved_radius = _validate_coordinates(
        data.lat if data.lat is not None else data.latitude,
        data.lng if data.lng is not None else data.longitude,
        data.radius_km,
    )
    resolved_type = data.business_type or data.type or data.subcategory
    return _run_marketplace_nearby(
        db,
        category_slug=data.category,
        type_slug=resolved_type,
        lat=resolved_lat,
        lng=resolved_lng,
        radius_km=resolved_radius,
    )
