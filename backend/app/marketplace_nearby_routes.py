"""Public hybrid spatial discovery for the 13-category / 81-type marketplace.

1. Queries local verified VISTRAH providers first (`source: "vistrah"`).
2. Whenever fewer than 5 VISTRAH providers exist within `radius_km`, enriches the
   response with cached Google Places API (New) results (`source: "google_places"`),
   including normalized `phone` and cached `/api/marketplace/place-photo?ref=...`
   shop photos (`Cache-Control: public, max-age=86400`).
Customer search coordinates are never persisted or logged. Existing membership-gated
`/services/{id}/nearby` remains untouched.
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
from .http_security import apply_security_headers
from .location_routes import EARTH_KM, EDGE_KM, distance_expression
from .maps_proxy_routes import (
    get_cached_place_photo,
    normalize_website_url,
    search_google_places_nearby_cached,
    validate_place_photo_ref,
)
from .marketplace_taxonomy import legacy_map, master_taxonomy
from .models import Category, Provider, ProviderService, Service, Subcategory, User
from .provider_models import ProviderApplication, ProviderDocument
from .provider_requirements import SafeModel

router = APIRouter(tags=["Marketplace nearby discovery"])

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
MAX_RESULTS = 50
HYBRID_THRESHOLD = 5
PUBLIC_PHOTO_FIELDS = ("shop_photo", "business_photo", "photo")


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


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    dphi = math.radians(lat2 - lat1) / 2.0
    dlambda = math.radians(lng2 - lng1) / 2.0
    a = (
        math.sin(dphi) * math.sin(dphi)
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlambda)
        * math.sin(dlambda)
    )
    bounded = min(1.0, max(0.0, a))
    return 2.0 * EARTH_KM * math.asin(math.sqrt(bounded))


def _norm_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def _short_locality(formatted_address: str) -> str:
    parts = [p.strip() for p in formatted_address.split(",") if p.strip()]
    if not parts:
        return ""
    if len(parts) >= 3:
        return ", ".join(parts[-4:-2] or parts[:2])[:150]
    return ", ".join(parts[:2])[:150]


def _safe_public_photo_url(raw_val: object) -> str | None:
    if not isinstance(raw_val, str):
        return None
    cleaned = raw_val.strip()
    if not cleaned or len(cleaned) > 500 or any(c.isspace() for c in cleaned):
        return None
    if cleaned.startswith("/images/") or cleaned.startswith("/api/marketplace/"):
        return cleaned
    if cleaned.startswith("https://"):
        return cleaned
    return None


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
    subcategory_slug: str | None,
    type_slug: str | None,
    db=None,
) -> tuple[dict, dict | None, dict | None]:
    cat_slug = _clean_slug(category_slug)
    sub_slug = _clean_slug(subcategory_slug)
    bt_slug = _clean_slug(type_slug)
    if not cat_slug and not sub_slug and not bt_slug:
        raise HTTPException(422, "Select a category, subcategory, or business type")

    cats_by_slug = {c["slug"]: c for c in business_types()["categories"]}
    tax_cats_by_slug = {c["slug"]: c for c in master_taxonomy()["categories"]}
    lm = legacy_map()

    # 1. Resolve specific business / listing type if supplied
    if bt_slug:
        found = find_business_type(
            bt_slug,
            category_slug=cat_slug,
            subcategory_slug=sub_slug,
            db=db,
        )
        if found:
            found_cat, found_bt = found
            if cat_slug and cat_slug != found_cat["slug"]:
                mapped_cat = lm.get("categories", {}).get(cat_slug)
                if mapped_cat != found_cat["slug"]:
                    raise HTTPException(422, "Business type does not belong to the selected category")
            sub_meta = None
            tax_cat = tax_cats_by_slug.get(found_cat["slug"])
            if tax_cat and found_bt.get("subcategory_slug"):
                sub_meta = next(
                    (s for s in tax_cat["subcategories"] if s["slug"] == found_bt["subcategory_slug"]),
                    None,
                )
            return found_cat, sub_meta, found_bt

        # Maybe `bt_slug` was actually a subcategory slug (e.g. `?category=...&type=<subcategory>`)
        eff_cat_slug = lm.get("categories", {}).get(cat_slug or "", cat_slug or "")
        for t_cat in master_taxonomy()["categories"]:
            if eff_cat_slug and t_cat["slug"] != eff_cat_slug:
                continue
            for t_sub in t_cat["subcategories"]:
                if t_sub["slug"] == bt_slug:
                    return cats_by_slug[t_cat["slug"]], t_sub, None

        raise HTTPException(422, "Unknown business type")

    # 2. Subcategory-level lookup (`category` + `subcategory`, no `type`)
    if sub_slug:
        eff_cat_slug = lm.get("categories", {}).get(cat_slug or "", cat_slug or "")
        for t_cat in master_taxonomy()["categories"]:
            if eff_cat_slug and t_cat["slug"] != eff_cat_slug:
                continue
            for t_sub in t_cat["subcategories"]:
                if t_sub["slug"] == sub_slug:
                    return cats_by_slug[t_cat["slug"]], t_sub, None

        mapped_v2 = lm.get("subcategories", {}).get(sub_slug)
        if mapped_v2 and len(mapped_v2) >= 4:
            found_v2 = find_business_type(mapped_v2[3])
            if found_v2:
                return found_v2[0], None, found_v2[1]

        raise HTTPException(422, "Unknown subcategory")

    # 3. Category-only lookup
    resolved_cat = cats_by_slug.get(cat_slug or "")
    if not resolved_cat and cat_slug:
        mapped_cat_slug = lm.get("categories", {}).get(cat_slug)
        if mapped_cat_slug:
            resolved_cat = cats_by_slug.get(mapped_cat_slug)
    if not resolved_cat:
        raise HTTPException(422, "Unknown category")
    return resolved_cat, None, None


def _run_marketplace_nearby(
    db: Session,
    *,
    category_slug: str | None,
    subcategory_slug: str | None = None,
    type_slug: str | None,
    lat: float,
    lng: float,
    radius_km: float,
) -> dict:
    cat_def, sub_def, bt_def = _resolve_category_and_type(category_slug, subcategory_slug, type_slug, db=db)
    lm_cats = legacy_map().get("categories", {})
    acceptable_cat_slugs = {
        cat_def["slug"],
        *(old_slug for old_slug, mapped in lm_cats.items() if mapped == cat_def["slug"]),
    }
    distance = distance_expression(lat, lng)

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
            Category.slug.in_(acceptable_cat_slugs),
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
    elif sub_def is not None:
        query = query.outerjoin(Subcategory, Subcategory.id == Service.subcategory_id).where(
            Subcategory.slug == sub_def["slug"]
        )

    rows = db.execute(query.order_by(distance.asc(), Provider.id.asc()).limit(MAX_RESULTS * 3)).all()

    deduped: list[tuple[Provider, ProviderService, Service, Category, float]] = []
    seen_provider_ids: set[int] = set()
    for provider, grant, service, category, km in rows:
        if provider.id in seen_provider_ids:
            continue
        seen_provider_ids.add(provider.id)
        deduped.append((provider, grant, service, category, float(km)))
        if len(deduped) >= MAX_RESULTS:
            break

    app_by_id: dict[str, ProviderApplication] = {}
    app_by_provider_id: dict[int, ProviderApplication] = {}
    public_doc_by_app_id: dict[str, str] = {}
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

        relevant_app_ids = list({*app_by_id.keys(), *(a.id for a in app_by_provider_id.values())})
        if relevant_app_ids:
            for doc in db.scalars(
                select(ProviderDocument)
                .where(
                    ProviderDocument.application_id.in_(relevant_app_ids),
                    ProviderDocument.field_id.in_(PUBLIC_PHOTO_FIELDS),
                    ProviderDocument.media_type.in_(("image/jpeg", "image/png")),
                )
                .order_by(ProviderDocument.created_at.desc())
            ).all():
                if doc.application_id not in public_doc_by_app_id:
                    public_doc_by_app_id[doc.application_id] = f"/api/marketplace/provider-photo/{doc.id}"

    vistrah_items: list[dict] = []
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
        photo_url = (
            _safe_public_photo_url(common.get("photo_url") or common.get("shop_photo_url"))
            or (public_doc_by_app_id.get(linked_app.id) if linked_app else None)
        )
        website_url = normalize_website_url(
            provider.website_url
            or common.get("website_url")
            or common.get("website")
            or provider.source_url
        )
        p_lat = float(provider.latitude)
        p_lng = float(provider.longitude)

        vistrah_items.append(
            {
                "source": "vistrah",
                "id": provider.id,
                "slug": provider.slug,
                "owner_user_id": provider.owner_user_id,
                "place_id": (provider.google_place_id or str(common.get("place_id") or "").strip()) or None,
                "name": provider.company or provider.name,
                "company": provider.company,
                "contact_name": provider.name,
                "category_slug": cat_def["slug"],
                "business_type": service.slug,
                "service_title": service.title,
                "description": (grant.description or "").strip(),
                "address": provider.address,
                "location": provider.location,
                "latitude": p_lat,
                "longitude": p_lng,
                "distance_km": round(km, 2),
                "coverage_radius_km": float(grant.coverage_radius_km) if grant.coverage_radius_km is not None else None,
                "verification_status": provider.verification_status,
                "phone": phone_clean,
                "whatsapp": whatsapp_clean,
                "timings": timings_clean,
                "photo_url": photo_url,
                "website_url": website_url,
                "directions_url": f"https://www.google.com/maps/dir/?api=1&destination={p_lat},{p_lng}",
            }
        )

    google_items: list[dict] = []
    if len(vistrah_items) < HYBRID_THRESHOLD:
        search_title = (
            bt_def["title"]
            if bt_def
            else sub_def["title"]
            if sub_def
            else cat_def["title"]
        )
        type_cache_key = (
            bt_def["slug"]
            if bt_def
            else f"sub:{cat_def['slug']}/{sub_def['slug']}"
            if sub_def
            else f"cat:{cat_def['slug']}"
        )
        raw_places = search_google_places_nearby_cached(
            business_type_key=type_cache_key,
            text_query=search_title,
            latitude=lat,
            longitude=lng,
            radius_km=radius_km,
        )
        for gp in raw_places:
            p_lat = float(gp["latitude"])
            p_lng = float(gp["longitude"])
            dist_km = _haversine_km(lat, lng, p_lat, p_lng)
            if dist_km > radius_km + EDGE_KM:
                continue
            gp_norm = _norm_name(gp["name"])
            if gp_norm and any(
                _norm_name(vi["company"] or vi["name"]) == gp_norm
                and _haversine_km(vi["latitude"], vi["longitude"], p_lat, p_lng) < 0.25
                for vi in vistrah_items
            ):
                continue

            addr = str(gp.get("address") or "")
            place_id = str(gp["place_id"])
            gp_phone = str(gp.get("phone") or "").strip()
            gp_photo_url = gp.get("photo_url") if isinstance(gp.get("photo_url"), str) else None
            gp_website_url = normalize_website_url(gp.get("website_url"))
            google_items.append(
                {
                    "source": "google_places",
                    "id": f"gp_{place_id}",
                    "slug": place_id,
                    "owner_user_id": None,
                    "place_id": place_id,
                    "name": gp["name"],
                    "company": gp["name"],
                    "contact_name": "",
                    "category_slug": cat_def["slug"],
                    "business_type": (
                        bt_def["slug"]
                        if bt_def
                        else sub_def["slug"]
                        if sub_def
                        else cat_def["slug"]
                    ),
                    "service_title": search_title,
                    "description": "",
                    "address": addr,
                    "location": _short_locality(addr),
                    "latitude": p_lat,
                    "longitude": p_lng,
                    "distance_km": round(dist_km, 2),
                    "coverage_radius_km": None,
                    "verification_status": "GOOGLE_PLACE",
                    "phone": gp_phone,
                    "whatsapp": "",
                    "timings": "",
                    "photo_url": gp_photo_url,
                    "website_url": gp_website_url,
                    "directions_url": gp["directions_url"],
                    "google_maps_uri": gp.get("google_maps_uri") or "",
                    "types": gp.get("types") or [],
                }
            )
        google_items.sort(key=lambda item: (item["distance_km"], str(item["id"])))

    combined = (vistrah_items + google_items)[:MAX_RESULTS]
    has_google = any(item["source"] == "google_places" for item in combined)

    return {
        "category": {"slug": cat_def["slug"], "title": cat_def["title"]},
        "subcategory": {"slug": sub_def["slug"], "title": sub_def["title"]} if sub_def else None,
        "business_type": (
            {"slug": bt_def["slug"], "title": bt_def["title"]}
            if bt_def
            else {"slug": sub_def["slug"], "title": sub_def["title"]}
            if sub_def
            else None
        ),
        "radius_km": radius_km,
        "total": len(combined),
        "has_google_places": has_google,
        "items": combined,
    }


def _serve_place_photo(ref: str) -> Response:
    try:
        valid_ref = validate_place_photo_ref(ref)
    except ValueError:
        raise HTTPException(422, "Invalid place photo reference") from None

    cached = get_cached_place_photo(valid_ref)
    if cached is None:
        raise HTTPException(404, "Place photo unavailable")

    raw_bytes, media_type = cached
    resp = Response(
        content=raw_bytes,
        media_type=media_type,
        headers={
            "Cache-Control": "public, max-age=86400",
            "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; sandbox",
        },
    )
    apply_security_headers(resp.headers)
    return resp


def _serve_public_provider_photo(doc_id: str, db: Session) -> Response:
    if not re.fullmatch(r"[0-9a-f-]{36}", doc_id):
        raise HTTPException(422, "Invalid photo identifier")
    doc = db.get(ProviderDocument, doc_id)
    if (
        not doc
        or doc.field_id not in PUBLIC_PHOTO_FIELDS
        or doc.media_type not in ("image/jpeg", "image/png")
    ):
        raise HTTPException(404, "Photo not found")
    app = db.get(ProviderApplication, doc.application_id)
    provider = db.get(Provider, app.provider_id) if (app and app.provider_id) else None
    if not provider or not provider.active or provider.verification_status != "VERIFIED":
        raise HTTPException(404, "Photo not found")
    resp = Response(
        content=doc.content,
        media_type=doc.media_type,
        headers={
            "Cache-Control": "public, max-age=86400",
            "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; sandbox",
        },
    )
    apply_security_headers(resp.headers)
    return resp


@router.get("/marketplace/place-photo")
@router.get("/api/marketplace/place-photo", include_in_schema=False)
def get_marketplace_place_photo(ref: str = Query(..., min_length=12, max_length=600)):
    return _serve_place_photo(ref)


@router.get("/marketplace/provider-photo/{doc_id}")
@router.get("/api/marketplace/provider-photo/{doc_id}", include_in_schema=False)
def get_marketplace_provider_photo(doc_id: str, db: Session = Depends(get_db)):
    return _serve_public_provider_photo(doc_id, db)


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
    resolved_type = business_type or type
    return _run_marketplace_nearby(
        db,
        category_slug=category,
        subcategory_slug=subcategory,
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
    resolved_type = data.business_type or data.type
    return _run_marketplace_nearby(
        db,
        category_slug=data.category,
        subcategory_slug=data.subcategory,
        type_slug=resolved_type,
        lat=resolved_lat,
        lng=resolved_lng,
        radius_km=resolved_radius,
    )
