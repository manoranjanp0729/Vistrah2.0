"""Public hybrid spatial discovery for the 10-category / 60-subcategory marketplace.

1. Queries local verified VISTRAH providers first (`source: "vistrah"`), sorting
   GPS-pinned listings nearest-first by Haversine distance and preserving city/area-matched
   verified listings whose exact `(latitude, longitude)` are `null` right after GPS-pinned matches.
2. Automatically expands tight empty search radii (`5 km -> 15 km -> 50 km -> city-wide`)
   and supports explicit `city_wide=true` browsing (`Show All in City`), returning
   `expanded_radius` and `effective_radius_km` metadata so valid places are never hidden.
3. Normalizes canonical and legacy category/subcategory/service-type slugs & labels
   case-insensitively across both query params and stored database rows.
4. Enriches sparse results (`< 5` VISTRAH providers) with cached Google Places API (New)
   results (`source: "google_places"`).
Customer search coordinates are never persisted or logged. Existing membership-gated
`/services/{id}/nearby` remains untouched.
"""
from __future__ import annotations

import math
import re
from urllib.parse import quote_plus

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import Field
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from .business_catalogue import (
    business_types,
    find_business_type,
    normalize_taxonomy_slug,
    resolve_canonical_category_slug,
)
from .database import get_db
from .http_security import apply_security_headers
from .location_routes import EARTH_KM, distance_expression
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
FORBIDDEN_RAW_SLUG_RE = re.compile(r"(?:\.\.|[<>\\\x00-\x1f;])")
MAX_RESULTS = 50
HYBRID_THRESHOLD = 5
CITY_WIDE_RADIUS_KM = 100.0
RADIUS_EXPANSION_STEPS_KM: tuple[float, ...] = (5.0, 15.0, 50.0, CITY_WIDE_RADIUS_KM)
PUBLIC_PHOTO_FIELDS = ("shop_photo", "business_photo", "photo")

CITY_METRO_ZONES: tuple[tuple[float, float, float, float, tuple[str, ...]], ...] = (
    (
        12.70,
        13.25,
        77.35,
        77.88,
        (
            "bengaluru",
            "bangalore",
            "begur",
            "bommanahalli",
            "hsr layout",
            "hsr",
            "koramangala",
            "indiranagar",
            "mg road",
            "jayanagar",
            "whitefield",
            "electronic city",
            "marathahalli",
            "btm layout",
            "jp nagar",
            "malleshwaram",
            "hebbal",
            "yelahanka",
            "rajajinagar",
            "banashankari",
            "bellandur",
            "sarjapur",
        ),
    ),
    (12.15, 12.45, 76.50, 76.80, ("mysuru", "mysore")),
    (13.60, 13.82, 75.70, 75.95, ("tarikere",)),
    (13.20, 13.45, 75.65, 75.90, ("chikkamagaluru", "chikmagalur")),
    (13.82, 14.05, 75.45, 75.70, ("shivamogga", "shimoga")),
    (12.78, 13.05, 74.75, 75.02, ("mangaluru", "mangalore")),
    (15.28, 15.55, 74.95, 75.25, ("hubballi", "hubli", "dharwad")),
    (13.25, 13.45, 77.00, 77.22, ("tumakuru", "tumkur")),
)


class MarketplaceNearbyBody(SafeModel):
    category: str | None = Field(default=None, max_length=100)
    business_type: str | None = Field(default=None, max_length=100)
    service_type: str | None = Field(default=None, max_length=100)
    type: str | None = Field(default=None, max_length=100)
    subcategory: str | None = Field(default=None, max_length=100)
    lat: float | None = Field(default=None, strict=True)
    lng: float | None = Field(default=None, strict=True)
    latitude: float | None = Field(default=None, strict=True)
    longitude: float | None = Field(default=None, strict=True)
    radius_km: float = Field(default=10.0, strict=True)
    city_wide: bool = Field(default=False)
    city: str | None = Field(default=None, max_length=80)


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
    if len(val) > 100 or FORBIDDEN_RAW_SLUG_RE.search(val):
        raise HTTPException(422, "Select a valid category or business type")
    norm = normalize_taxonomy_slug(val)
    if not norm or not any(ch.isalpha() for ch in norm) or not SLUG_RE.fullmatch(norm):
        raise HTTPException(422, "Select a valid category or business type")
    return norm


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


def _infer_city_tokens(lat: float, lng: float, raw_city: str | None = None) -> tuple[str, ...]:
    tokens: list[str] = []
    for min_lat, max_lat, min_lng, max_lng, zone_tokens in CITY_METRO_ZONES:
        if min_lat <= lat <= max_lat and min_lng <= lng <= max_lng:
            tokens.extend(zone_tokens)
    if raw_city and isinstance(raw_city, str):
        cleaned = re.sub(r"[^a-z0-9\s]+", " ", raw_city.lower()).strip()
        if len(cleaned) >= 3:
            tokens.append(cleaned)
    return tuple(dict.fromkeys(tokens))


def _provider_matches_city_tokens(provider: Provider, city_tokens: tuple[str, ...]) -> bool:
    if not city_tokens:
        return False
    haystack = f" {provider.location or ''} {provider.address or ''} ".lower()
    haystack_clean = re.sub(r"[^a-z0-9]+", " ", haystack)
    active_set = set(city_tokens)
    # Reject street-name false positives (e.g. "MG Road, Tarikere" when searching Bengaluru)
    for _min_lat, _max_lat, _min_lng, _max_lng, zone_tokens in CITY_METRO_ZONES:
        primary_city = zone_tokens[0]
        if primary_city not in active_set:
            for city_alias in zone_tokens[:2]:
                if len(city_alias) >= 4 and f" {city_alias} " in haystack_clean:
                    return False
    for token in city_tokens:
        if f" {token} " in haystack_clean:
            return True
    return False


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
    canonical_cat_slug = resolve_canonical_category_slug(cat_slug) if cat_slug else None

    # 1. Resolve specific business / listing type if supplied
    if bt_slug:
        found = find_business_type(
            bt_slug,
            category_slug=canonical_cat_slug or cat_slug,
            subcategory_slug=sub_slug,
            db=db,
        )
        if not found and canonical_cat_slug:
            # Allow cross-category legacy bookmark where a subcategory moved or was aliased
            found_any = find_business_type(bt_slug, subcategory_slug=sub_slug, db=db)
            if found_any and (
                cat_slug in lm.get("categories", {}) or bt_slug in lm.get("subcategories", {})
            ):
                found = found_any
        if found:
            found_cat, found_bt = found
            if canonical_cat_slug and canonical_cat_slug != found_cat["slug"]:
                if bt_slug not in lm.get("subcategories", {}):
                    raise HTTPException(422, "Business type does not belong to the selected category")
            sub_meta = None
            tax_cat = tax_cats_by_slug.get(found_cat["slug"])
            target_sub_slug = found_bt.get("subcategory_slug") or found_bt["slug"]
            if tax_cat:
                sub_meta = next(
                    (s for s in tax_cat["subcategories"] if s["slug"] == target_sub_slug),
                    None,
                )
            return found_cat, sub_meta, found_bt

        eff_cat_slug = canonical_cat_slug or (cat_slug or "")
        for t_cat in master_taxonomy()["categories"]:
            if eff_cat_slug and t_cat["slug"] != eff_cat_slug:
                continue
            for t_sub in t_cat["subcategories"]:
                if t_sub["slug"] == bt_slug or normalize_taxonomy_slug(t_sub["title"]) == bt_slug:
                    return cats_by_slug[t_cat["slug"]], t_sub, None

        raise HTTPException(422, "Unknown business type")

    # 2. Subcategory-level lookup (`category` + `subcategory`, no `type`)
    if sub_slug:
        found_sub_bt = find_business_type(
            sub_slug,
            category_slug=canonical_cat_slug or cat_slug,
            db=db,
        )
        eff_cat_slug = canonical_cat_slug or (cat_slug or "")
        for t_cat in master_taxonomy()["categories"]:
            if eff_cat_slug and t_cat["slug"] != eff_cat_slug:
                continue
            for t_sub in t_cat["subcategories"]:
                if t_sub["slug"] == sub_slug or normalize_taxonomy_slug(t_sub["title"]) == sub_slug:
                    return cats_by_slug[t_cat["slug"]], t_sub, found_sub_bt[1] if found_sub_bt else None

        if found_sub_bt:
            return found_sub_bt[0], None, found_sub_bt[1]

        mapped_v2 = lm.get("subcategories", {}).get(sub_slug)
        if mapped_v2 and len(mapped_v2) >= 4:
            found_v2 = find_business_type(mapped_v2[3], db=db)
            if found_v2:
                return found_v2[0], None, found_v2[1]

        raise HTTPException(422, "Unknown subcategory")

    # 3. Category-only lookup
    resolved_cat = cats_by_slug.get(canonical_cat_slug or "")
    if not resolved_cat:
        raise HTTPException(422, "Unknown category")
    return resolved_cat, None, None


def _acceptable_category_slugs(canonical_cat_slug: str) -> set[str]:
    lm = legacy_map()
    slugs = {canonical_cat_slug}
    for old_slug, mapped in lm.get("categories", {}).items():
        if mapped == canonical_cat_slug:
            slugs.add(old_slug.lower())
    for alias, vals in lm.get("subcategories", {}).items():
        if vals and vals[0] == canonical_cat_slug:
            pass
    return {s.lower() for s in slugs if s}


def _acceptable_service_slugs(bt_def: dict) -> set[str]:
    target = bt_def["slug"].lower()
    slugs = {target}
    lt = (bt_def.get("listing_type_slug") or "").strip().lower()
    if lt:
        slugs.add(lt)
    norm_title = normalize_taxonomy_slug(bt_def.get("title", ""))
    if norm_title:
        slugs.add(norm_title)
    if target.endswith("s") and len(target) > 3:
        slugs.add(target[:-1])
    else:
        slugs.add(f"{target}s")
    for alias, vals in legacy_map().get("subcategories", {}).items():
        if len(vals) >= 4 and vals[3].lower() == target:
            slugs.add(alias.lower())
    for old_key, pair in legacy_map().get("catalogue_services", {}).items():
        if len(pair) == 2 and pair[1].lower() == target:
            slugs.add(old_key.split("/")[-1].lower())
    return slugs


def _run_marketplace_nearby(
    db: Session,
    *,
    category_slug: str | None,
    subcategory_slug: str | None = None,
    type_slug: str | None,
    lat: float,
    lng: float,
    radius_km: float,
    city_wide: bool = False,
    raw_city: str | None = None,
) -> dict:
    cat_def, sub_def, bt_def = _resolve_category_and_type(
        category_slug, subcategory_slug, type_slug, db=db
    )
    acceptable_cat_slugs = _acceptable_category_slugs(cat_def["slug"])
    acceptable_bt_slugs = _acceptable_service_slugs(bt_def) if bt_def is not None else None
    bt_title_lower = bt_def["title"].strip().lower() if bt_def is not None else None

    def _apply_classification_filters(stmt):
        if bt_def is not None and acceptable_bt_slugs:
            # Match canonical or legacy service slug/title; allow legacy category when service slug matches
            stmt = stmt.where(
                or_(
                    and_(
                        func.lower(Category.slug).in_(acceptable_cat_slugs),
                        or_(
                            func.lower(Service.slug).in_(acceptable_bt_slugs),
                            func.lower(Service.title) == bt_title_lower,
                        ),
                    ),
                    func.lower(Service.slug).in_(acceptable_bt_slugs),
                )
            )
        elif sub_def is not None:
            sub_target = sub_def["slug"].lower()
            stmt = stmt.outerjoin(Subcategory, Subcategory.id == Service.subcategory_id).where(
                func.lower(Category.slug).in_(acceptable_cat_slugs),
                or_(
                    func.lower(Subcategory.slug) == sub_target,
                    func.lower(Service.slug) == sub_target,
                ),
            )
        else:
            stmt = stmt.where(func.lower(Category.slug).in_(acceptable_cat_slugs))
        return stmt

    def _query_pinned_within(search_radius_km: float) -> list[tuple[Provider, ProviderService, Service, Category, float]]:
        distance = distance_expression(lat, lng)
        deg_lat = math.degrees(search_radius_km / EARTH_KM) + 0.01
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
                or_(
                    Provider.owner_user_id.is_(None),
                    and_(User.deleted_at.is_(None), User.seller_enabled.is_(True)),
                ),
                distance <= search_radius_km,
            )
        )

        if abs(lat) < 85.0:
            cos_lat = max(math.cos(math.radians(lat)), 0.087)
            deg_lng = math.degrees(search_radius_km / (EARTH_KM * cos_lat)) + 0.02
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

        query = _apply_classification_filters(query)
        rows = db.execute(query.order_by(distance.asc(), Provider.id.asc()).limit(MAX_RESULTS * 3)).all()

        results: list[tuple[Provider, ProviderService, Service, Category, float]] = []
        seen_ids: set[int] = set()
        for provider, grant, service, category, _sql_km in rows:
            if provider.id in seen_ids:
                continue
            if provider.latitude is None or provider.longitude is None:
                continue
            p_lat_val = float(provider.latitude)
            p_lng_val = float(provider.longitude)
            if not (math.isfinite(p_lat_val) and math.isfinite(p_lng_val)):
                continue
            exact_km = _haversine_km(lat, lng, p_lat_val, p_lng_val)
            if exact_km > search_radius_km:
                continue
            seen_ids.add(provider.id)
            results.append((provider, grant, service, category, exact_km))
            if len(results) >= MAX_RESULTS:
                break
        results.sort(key=lambda entry: (entry[4], entry[0].id))
        return results

    def _query_null_coord_city_matches(include_all_if_city_wide: bool) -> list[tuple[Provider, ProviderService, Service, Category, None]]:
        city_tokens = _infer_city_tokens(lat, lng, raw_city)
        if not city_tokens and not include_all_if_city_wide:
            return []
        null_query = (
            select(Provider, ProviderService, Service, Category)
            .join(ProviderService, ProviderService.provider_id == Provider.id)
            .join(Service, Service.id == ProviderService.service_id)
            .join(Category, Category.id == Service.category_id)
            .outerjoin(User, User.id == Provider.owner_user_id)
            .where(
                Provider.active.is_(True),
                Provider.verification_status == "VERIFIED",
                or_(Provider.latitude.is_(None), Provider.longitude.is_(None)),
                ProviderService.approval_status == "APPROVED",
                or_(
                    Provider.owner_user_id.is_(None),
                    and_(User.deleted_at.is_(None), User.seller_enabled.is_(True)),
                ),
            )
        )
        null_query = _apply_classification_filters(null_query)
        null_rows = db.execute(null_query.order_by(Provider.id.asc()).limit(MAX_RESULTS * 2)).all()

        matched: list[tuple[Provider, ProviderService, Service, Category, None]] = []
        seen_ids: set[int] = set()
        for provider, grant, service, category in null_rows:
            if provider.id in seen_ids:
                continue
            if city_tokens:
                if not _provider_matches_city_tokens(provider, city_tokens):
                    continue
            elif not include_all_if_city_wide:
                continue
            seen_ids.add(provider.id)
            matched.append((provider, grant, service, category, None))
            if len(matched) >= MAX_RESULTS:
                break
        return matched

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

    def _query_google_within(search_radius_km: float, pinned_vistrah: list[tuple[Provider, ProviderService, Service, Category, float]]) -> list[dict]:
        if len(pinned_vistrah) >= HYBRID_THRESHOLD:
            return []
        capped_gp_radius = min(search_radius_km, 50.0)
        raw_places = search_google_places_nearby_cached(
            business_type_key=type_cache_key,
            text_query=search_title,
            latitude=lat,
            longitude=lng,
            radius_km=capped_gp_radius,
        )
        found_gp: list[dict] = []
        for gp in raw_places:
            raw_p_lat = gp.get("latitude")
            raw_p_lng = gp.get("longitude")
            if raw_p_lat is None or raw_p_lng is None:
                continue
            p_lat = float(raw_p_lat)
            p_lng = float(raw_p_lng)
            if not (math.isfinite(p_lat) and math.isfinite(p_lng)):
                continue
            dist_km = _haversine_km(lat, lng, p_lat, p_lng)
            if dist_km > search_radius_km:
                continue
            gp_norm = _norm_name(gp["name"])
            if gp_norm and any(
                _norm_name(pv.company or pv.name) == gp_norm
                and pv.latitude is not None
                and pv.longitude is not None
                and _haversine_km(float(pv.latitude), float(pv.longitude), p_lat, p_lng) < 0.25
                for pv, _, _, _, _ in pinned_vistrah
            ):
                continue

            addr = str(gp.get("address") or "")
            place_id = str(gp["place_id"])
            gp_phone = str(gp.get("phone") or "").strip()
            gp_photo_url = gp.get("photo_url") if isinstance(gp.get("photo_url"), str) else None
            gp_website_url = normalize_website_url(gp.get("website_url"))
            found_gp.append(
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
        found_gp.sort(key=lambda item: (item["distance_km"], str(item["id"])))
        return found_gp

    requested_radius_km = radius_km
    effective_radius_km = radius_km
    expanded_radius = False
    city_wide_used = bool(city_wide)

    if city_wide:
        effective_radius_km = max(radius_km, CITY_WIDE_RADIUS_KM)
        expanded_radius = True
        pinned_rows = _query_pinned_within(effective_radius_km)
        google_items = _query_google_within(effective_radius_km, pinned_rows)
        null_coord_rows = _query_null_coord_city_matches(include_all_if_city_wide=True)
    else:
        pinned_rows = _query_pinned_within(requested_radius_km)
        google_items = _query_google_within(requested_radius_km, pinned_rows)
        null_coord_rows = _query_null_coord_city_matches(include_all_if_city_wide=False)

        # Automatic Radius Expansion Fallback (5 km -> 15 km -> 50 km -> city-wide) when 0 GPS-pinned places exist in requested radius
        if not pinned_rows and not google_items:
            for step_km in RADIUS_EXPANSION_STEPS_KM:
                if step_km <= requested_radius_km:
                    continue
                step_pinned = _query_pinned_within(step_km)
                step_google = _query_google_within(step_km, step_pinned)
                if step_pinned or step_google:
                    pinned_rows = step_pinned
                    google_items = step_google
                    effective_radius_km = step_km
                    expanded_radius = True
                    city_wide_used = step_km >= CITY_WIDE_RADIUS_KM
                    break
            if not pinned_rows and not google_items and null_coord_rows:
                effective_radius_km = CITY_WIDE_RADIUS_KM
                expanded_radius = True
                city_wide_used = True

    seen_provider_ids = {p.id for p, _, _, _, _ in pinned_rows}
    all_vistrah_rows: list[tuple[Provider, ProviderService, Service, Category, float | None]] = [
        *pinned_rows,
        *(row for row in null_coord_rows if row[0].id not in seen_provider_ids),
    ][:MAX_RESULTS]

    app_by_id: dict[str, ProviderApplication] = {}
    app_by_provider_id: dict[int, ProviderApplication] = {}
    public_doc_by_app_id: dict[str, str] = {}
    if all_vistrah_rows:
        app_ids = [grant.application_id for _, grant, _, _, _ in all_vistrah_rows if grant.application_id]
        provider_ids = [provider.id for provider, _, _, _, _ in all_vistrah_rows]
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

    vistrah_pinned_items: list[dict] = []
    vistrah_city_items: list[dict] = []
    for provider, grant, service, category, km in all_vistrah_rows:
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
        has_coords = (
            km is not None
            and provider.latitude is not None
            and provider.longitude is not None
        )
        p_lat = float(provider.latitude) if has_coords else None
        p_lng = float(provider.longitude) if has_coords else None
        if has_coords and p_lat is not None and p_lng is not None:
            directions_url = f"https://www.google.com/maps/dir/?api=1&destination={p_lat},{p_lng}"
        else:
            dest_query = ", ".join(
                part
                for part in (provider.company or provider.name, provider.address or provider.location)
                if part
            )
            directions_url = f"https://www.google.com/maps/search/?api=1&query={quote_plus(dest_query or cat_def['title'])}"

        canonical_bt_slug = bt_def["slug"] if bt_def else service.slug
        item_payload = {
            "source": "vistrah",
            "id": provider.id,
            "slug": provider.slug,
            "owner_user_id": provider.owner_user_id,
            "place_id": (provider.google_place_id or str(common.get("place_id") or "").strip()) or None,
            "name": provider.company or provider.name,
            "company": provider.company,
            "contact_name": provider.name,
            "category_slug": cat_def["slug"],
            "business_type": canonical_bt_slug,
            "service_title": bt_def["title"] if bt_def else service.title,
            "description": (grant.description or "").strip(),
            "address": provider.address,
            "location": provider.location,
            "latitude": p_lat,
            "longitude": p_lng,
            "distance_km": round(km, 2) if km is not None else None,
            "has_exact_coordinates": has_coords,
            "coverage_radius_km": float(grant.coverage_radius_km) if grant.coverage_radius_km is not None else None,
            "verification_status": provider.verification_status,
            "phone": phone_clean,
            "whatsapp": whatsapp_clean,
            "timings": timings_clean,
            "photo_url": photo_url,
            "website_url": website_url,
            "directions_url": directions_url,
        }
        if km is not None:
            vistrah_pinned_items.append(item_payload)
        else:
            vistrah_city_items.append(item_payload)

    pinned_combined = sorted(
        vistrah_pinned_items + google_items,
        key=lambda item: (
            item["distance_km"] if item["distance_km"] is not None else float("inf"),
            0 if item["source"] == "vistrah" else 1,
            str(item["id"]),
        ),
    )
    combined = (pinned_combined + vistrah_city_items)[:MAX_RESULTS]
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
        "radius_km": requested_radius_km,
        "requested_radius_km": requested_radius_km,
        "effective_radius_km": effective_radius_km,
        "expanded_radius": expanded_radius,
        "city_wide": city_wide_used,
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
@router.get("/marketplace/listings")
@router.get("/api/marketplace/listings", include_in_schema=False)
def get_marketplace_nearby(
    response: Response,
    category: str | None = Query(default=None, max_length=100),
    business_type: str | None = Query(default=None, max_length=100),
    service_type: str | None = Query(default=None, max_length=100),
    type: str | None = Query(default=None, max_length=100),
    subcategory: str | None = Query(default=None, max_length=100),
    lat: float | None = Query(default=None),
    lng: float | None = Query(default=None),
    latitude: float | None = Query(default=None),
    longitude: float | None = Query(default=None),
    radius_km: float = Query(default=10.0),
    city_wide: bool = Query(default=False),
    city: str | None = Query(default=None, max_length=80),
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = "private, no-store"
    resolved_lat, resolved_lng, resolved_radius = _validate_coordinates(
        lat if lat is not None else latitude,
        lng if lng is not None else longitude,
        radius_km,
    )
    resolved_type = service_type or business_type or type
    return _run_marketplace_nearby(
        db,
        category_slug=category,
        subcategory_slug=subcategory,
        type_slug=resolved_type,
        lat=resolved_lat,
        lng=resolved_lng,
        radius_km=resolved_radius,
        city_wide=city_wide,
        raw_city=city,
    )


@router.post("/marketplace/nearby")
@router.post("/marketplace/listings")
@router.post("/api/marketplace/listings", include_in_schema=False)
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
    resolved_type = data.service_type or data.business_type or data.type
    return _run_marketplace_nearby(
        db,
        category_slug=data.category,
        subcategory_slug=data.subcategory,
        type_slug=resolved_type,
        lat=resolved_lat,
        lng=resolved_lng,
        radius_km=resolved_radius,
        city_wide=data.city_wide,
        raw_city=data.city,
    )
