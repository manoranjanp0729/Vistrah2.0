"""Authenticated/rate-limited, cached Google Maps autocomplete, Place Details & reverse-geocoding proxy.

Uses GOOGLE_MAPS_SERVER_API_KEY strictly server-side with minimal Essentials SKU field masks
(`formattedAddress`, `location`, `addressComponents`) and an in-memory bounded LRU+TTL cache
so repeat coordinate, query, or place lookups cost 0 upstream API calls.
"""
from __future__ import annotations

import asyncio
from collections import OrderedDict
import json
import os
import re
import threading
import time
from typing import Any
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, Request as UrlRequest, build_opener

from fastapi import APIRouter, Depends, Query, Request, Response
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import Field, field_validator
from sqlalchemy.orm import Session

from . import config
from .database import get_db
from .http_security import apply_security_headers
from .models import User
from .schemas import Schema
from .security import bearer, token_session
from .v_ads_geography import validate_point

router = APIRouter(tags=["Google Maps Proxy"])

PLACE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{4,256}$")
SESSION_TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{8,128}$")

# Essentials-only field masks (avoids Pro/Enterprise SKU charges)
REVERSE_GEOCODE_FIELD_MASK = "results.formattedAddress,results.location,results.addressComponents"
PLACE_DETAILS_FIELD_MASK = "formattedAddress,location,addressComponents"
AUTOCOMPLETE_FIELD_MASK = (
    "suggestions.placePrediction.placeId,"
    "suggestions.placePrediction.text.text,"
    "suggestions.placePrediction.structuredFormat.mainText.text,"
    "suggestions.placePrediction.structuredFormat.secondaryText.text"
)
# Strict Pro-tier-only field mask for Text Search (New) — never request reviews, photos, or ratings
PLACES_TEXT_SEARCH_PRO_FIELD_MASK = (
    "places.id,places.displayName,places.formattedAddress,"
    "places.location,places.types,places.googleMapsUri"
)

MAX_CACHE_ENTRIES = 2048
CACHE_TTL_SECONDS = 86400.0  # 24 hours
PLACES_SEARCH_TTL_SECONDS = 1800.0  # 30 minutes
PER_ACTOR_LIMIT_PER_MINUTE = 30
GLOBAL_LIMIT_PER_HOUR = 600

_cache_lock = threading.Lock()
_cache: OrderedDict[str, tuple[float, dict[str, Any]]] = OrderedDict()
_places_search_cache: OrderedDict[tuple[str, float, float, float], tuple[float, list[dict[str, Any]]]] = OrderedDict()

_rate_lock = threading.Lock()
_user_windows: OrderedDict[str, list[float]] = OrderedDict()
_global_window: list[float] = []
_upstream_slots = asyncio.Semaphore(4)


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class ReverseGeocodePayload(Schema):
    latitude: float
    longitude: float

    @field_validator("latitude", mode="before")
    @classmethod
    def _check_lat(cls, value: Any) -> float:
        if isinstance(value, bool):
            raise ValueError("Latitude must be a finite coordinate")
        lat, _ = validate_point(value, 0.0)
        return lat

    @field_validator("longitude", mode="before")
    @classmethod
    def _check_lon(cls, value: Any) -> float:
        if isinstance(value, bool):
            raise ValueError("Longitude must be a finite coordinate")
        _, lon = validate_point(0.0, value)
        return lon


class PlaceDetailsPayload(Schema):
    place_id: str = Field(min_length=4, max_length=256)
    session_token: str | None = Field(default=None, max_length=128)

    @field_validator("place_id", mode="before")
    @classmethod
    def _check_place_id(cls, value: Any) -> str:
        if not isinstance(value, str):
            raise ValueError("place_id must be a string")
        cleaned = value.strip()
        if cleaned.startswith("places/"):
            cleaned = cleaned[len("places/") :]
        if not PLACE_ID_RE.match(cleaned):
            raise ValueError("Invalid Google place_id format")
        return cleaned

    @field_validator("session_token", mode="before")
    @classmethod
    def _check_session_token(cls, value: Any) -> str | None:
        if value is None:
            return None
        if not isinstance(value, str):
            raise ValueError("session_token must be a string")
        cleaned = value.strip()
        if not cleaned:
            return None
        if not SESSION_TOKEN_RE.match(cleaned):
            raise ValueError("Invalid session_token format")
        return cleaned


class AutocompletePayload(Schema):
    query: str = Field(min_length=2, max_length=200)
    session_token: str | None = Field(default=None, max_length=128)

    @field_validator("query", mode="before")
    @classmethod
    def _check_query(cls, value: Any) -> str:
        if not isinstance(value, str):
            raise ValueError("query must be a string")
        cleaned = " ".join(value.strip().split())
        if len(cleaned) < 2 or len(cleaned) > 200:
            raise ValueError("query must be 2 to 200 characters")
        return cleaned

    @field_validator("session_token", mode="before")
    @classmethod
    def _check_session_token(cls, value: Any) -> str | None:
        if value is None:
            return None
        if not isinstance(value, str):
            raise ValueError("session_token must be a string")
        cleaned = value.strip()
        if not cleaned:
            return None
        if not SESSION_TOKEN_RE.match(cleaned):
            raise ValueError("Invalid session_token format")
        return cleaned


def clear_maps_proxy_state() -> None:
    """Test helper to clear cache and rate-limit state deterministically."""
    with _cache_lock:
        _cache.clear()
        _places_search_cache.clear()
    with _rate_lock:
        _user_windows.clear()
        _global_window.clear()


def _cache_get(key: str) -> dict[str, Any] | None:
    now_mono = time.monotonic()
    with _cache_lock:
        entry = _cache.get(key)
        if entry is None:
            return None
        expires_at, payload = entry
        if expires_at <= now_mono:
            _cache.pop(key, None)
            return None
        _cache.move_to_end(key)
        return dict(payload)


def _cache_set(key: str, payload: dict[str, Any], ttl: float = CACHE_TTL_SECONDS) -> None:
    expires_at = time.monotonic() + ttl
    with _cache_lock:
        _cache[key] = (expires_at, dict(payload))
        _cache.move_to_end(key)
        while len(_cache) > MAX_CACHE_ENTRIES:
            _cache.popitem(last=False)


def _allow_lookup(actor_key: str) -> bool:
    per_min = int(
        os.getenv("MAPS_PROXY_RATE_LIMIT_PER_MINUTE", str(PER_ACTOR_LIMIT_PER_MINUTE))
        or PER_ACTOR_LIMIT_PER_MINUTE
    )
    now_mono = time.monotonic()
    with _rate_lock:
        _global_window[:] = [t for t in _global_window if now_mono - t < 3600.0]
        bucket = [t for t in _user_windows.get(actor_key, []) if now_mono - t < 60.0]
        if len(_global_window) >= GLOBAL_LIMIT_PER_HOUR or len(bucket) >= per_min:
            return False
        _global_window.append(now_mono)
        _user_windows[actor_key] = [*bucket, now_mono]
        _user_windows.move_to_end(actor_key)
        while len(_user_windows) > 2048:
            _user_windows.popitem(last=False)
        return True


def _structured_error(status_code: int, code: str, detail: str) -> JSONResponse:
    resp = JSONResponse(
        status_code=status_code,
        content={
            "code": code,
            "detail": detail,
            "fallback": True,
        },
        headers={"Cache-Control": "private, no-store"},
    )
    apply_security_headers(resp.headers)
    return resp


def _normalize_components(raw_components: Any) -> tuple[list[dict[str, Any]], dict[str, str]]:
    if not isinstance(raw_components, list):
        return [], {"locality": "", "city": "", "state": "", "postal_code": ""}
    normalized: list[dict[str, Any]] = []

    def _find(*kinds: str) -> str:
        for kind in kinds:
            for comp in raw_components:
                if isinstance(comp, dict) and kind in (comp.get("types") or []):
                    text = str(comp.get("longText") or comp.get("shortText") or "").strip()
                    if text:
                        return text
        return ""

    for comp in raw_components[:20]:
        if not isinstance(comp, dict):
            continue
        long_text = str(comp.get("longText") or "").strip()
        short_text = str(comp.get("shortText") or "").strip()
        types = [str(t) for t in (comp.get("types") or []) if isinstance(t, str)]
        if long_text or short_text:
            normalized.append({"longText": long_text, "shortText": short_text, "types": types[:8]})

    area = _find("sublocality_level_1", "sublocality", "neighborhood", "route")
    city = _find("locality", "administrative_area_level_2")
    state = _find("administrative_area_level_1")
    postal_raw = _find("postal_code")
    postal = postal_raw if len(postal_raw) == 6 and postal_raw.isascii() and postal_raw.isdigit() else ""
    locality_label = ", ".join(dict.fromkeys(p for p in (area, city) if p))[:150] or city or state
    return normalized, {
        "locality": locality_label[:150],
        "city": city[:120],
        "state": state[:120],
        "postal_code": postal,
    }


def fetch_google_reverse_geocode(latitude: float, longitude: float, api_key: str) -> dict[str, Any]:
    url = f"https://geocode.googleapis.com/v4/geocode/location/{latitude},{longitude}"
    req = UrlRequest(
        url,
        headers={
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": REVERSE_GEOCODE_FIELD_MASK,
            "Accept": "application/json",
        },
    )
    with build_opener(_NoRedirect()).open(req, timeout=8) as resp:
        raw = resp.read(131073)
        if len(raw) > 131072:
            raise ValueError("Upstream geocode response too large")
        data = json.loads(raw)

    rows = data.get("results") if isinstance(data, dict) else None
    if not rows or not isinstance(rows, list):
        return {
            "formatted_address": "",
            "locality": "",
            "city": "",
            "state": "",
            "postal_code": "",
            "latitude": latitude,
            "longitude": longitude,
            "address_components": [],
        }

    top = rows[0] if isinstance(rows[0], dict) else {}
    loc = top.get("location") if isinstance(top.get("location"), dict) else {}
    try:
        res_lat, res_lon = validate_point(loc.get("latitude", latitude), loc.get("longitude", longitude))
    except ValueError:
        res_lat, res_lon = latitude, longitude

    formatted = str(top.get("formattedAddress") or "").strip()[:500]
    comps, summary = _normalize_components(top.get("addressComponents"))
    return {
        "formatted_address": formatted,
        "locality": summary["locality"] or formatted[:150],
        "city": summary["city"],
        "state": summary["state"],
        "postal_code": summary["postal_code"],
        "latitude": res_lat,
        "longitude": res_lon,
        "address_components": comps,
    }


def fetch_google_place_details(place_id: str, session_token: str | None, api_key: str) -> dict[str, Any]:
    query = f"?{urlencode({'sessionToken': session_token})}" if session_token else ""
    url = f"https://places.googleapis.com/v1/places/{place_id}{query}"
    req = UrlRequest(
        url,
        headers={
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": PLACE_DETAILS_FIELD_MASK,
            "Accept": "application/json",
        },
    )
    with build_opener(_NoRedirect()).open(req, timeout=8) as resp:
        raw = resp.read(131073)
        if len(raw) > 131072:
            raise ValueError("Upstream place details response too large")
        top = json.loads(raw)

    if not isinstance(top, dict):
        raise ValueError("Invalid place details payload")
    loc = top.get("location") if isinstance(top.get("location"), dict) else {}
    res_lat, res_lon = validate_point(loc.get("latitude"), loc.get("longitude"))
    formatted = str(top.get("formattedAddress") or "").strip()[:500]
    comps, summary = _normalize_components(top.get("addressComponents"))
    return {
        "place_id": place_id,
        "formatted_address": formatted,
        "locality": summary["locality"] or formatted[:150],
        "city": summary["city"],
        "state": summary["state"],
        "postal_code": summary["postal_code"],
        "latitude": res_lat,
        "longitude": res_lon,
        "address_components": comps,
    }


def fetch_google_autocomplete(query: str, session_token: str | None, api_key: str) -> dict[str, Any]:
    url = "https://places.googleapis.com/v1/places:autocomplete"
    payload: dict[str, Any] = {
        "input": query,
        "includedRegionCodes": ["in"],
    }
    if session_token:
        payload["sessionToken"] = session_token
    req = UrlRequest(
        url,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": AUTOCOMPLETE_FIELD_MASK,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    with build_opener(_NoRedirect()).open(req, timeout=8) as resp:
        raw = resp.read(131073)
        if len(raw) > 131072:
            raise ValueError("Upstream autocomplete response too large")
        data = json.loads(raw)

    suggestions = data.get("suggestions") if isinstance(data, dict) else []
    items: list[dict[str, str]] = []
    if isinstance(suggestions, list):
        for entry in suggestions[:6]:
            pred = entry.get("placePrediction") if isinstance(entry, dict) else None
            if not isinstance(pred, dict):
                continue
            place_id = str(pred.get("placeId") or "").strip()
            if not PLACE_ID_RE.match(place_id):
                continue
            full_text = str((pred.get("text") or {}).get("text") or "").strip()
            struct = pred.get("structuredFormat") if isinstance(pred.get("structuredFormat"), dict) else {}
            main_text = str((struct.get("mainText") or {}).get("text") or full_text).strip()
            sec_text = str((struct.get("secondaryText") or {}).get("text") or "").strip()
            if main_text:
                items.append(
                    {
                        "place_id": place_id,
                        "main_text": main_text[:160],
                        "secondary_text": sec_text[:200],
                        "description": (full_text or main_text)[:300],
                    }
                )
    return {"suggestions": items}


def fetch_google_places_text_search(
    text_query: str,
    latitude: float,
    longitude: float,
    radius_km: float,
    api_key: str,
) -> list[dict[str, Any]]:
    """Query Google Places API (New) `places:searchText` using strictly Pro-tier fields."""
    url = "https://places.googleapis.com/v1/places:searchText"
    clean_query = re.sub(r"\s*/\s*", ", ", text_query.strip())
    radius_meters = min(max(float(radius_km) * 1000.0, 500.0), 50000.0)
    payload: dict[str, Any] = {
        "textQuery": clean_query,
        "regionCode": "IN",
        "maxResultCount": 15,
        "locationBias": {
            "circle": {
                "center": {"latitude": float(latitude), "longitude": float(longitude)},
                "radius": radius_meters,
            }
        },
    }
    req = UrlRequest(
        url,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": PLACES_TEXT_SEARCH_PRO_FIELD_MASK,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    with build_opener(_NoRedirect()).open(req, timeout=6) as resp:
        raw = resp.read(262145)
        if len(raw) > 262144:
            raise ValueError("Upstream Places Text Search response too large")
        data = json.loads(raw)

    raw_places = data.get("places") if isinstance(data, dict) else []
    if not isinstance(raw_places, list):
        return []

    parsed: list[dict[str, Any]] = []
    for entry in raw_places[:20]:
        if not isinstance(entry, dict):
            continue
        raw_id = str(entry.get("id") or "").strip()
        if raw_id.startswith("places/"):
            raw_id = raw_id[len("places/") :]
        if not PLACE_ID_RE.match(raw_id):
            continue
        display_obj = entry.get("displayName")
        name = (
            str(display_obj.get("text") or "").strip()
            if isinstance(display_obj, dict)
            else str(display_obj or "").strip()
        )
        if not name:
            continue
        loc = entry.get("location") if isinstance(entry.get("location"), dict) else {}
        try:
            p_lat, p_lon = validate_point(loc.get("latitude"), loc.get("longitude"))
        except ValueError:
            continue
        formatted_addr = str(entry.get("formattedAddress") or "").strip()[:400]
        raw_types = entry.get("types") if isinstance(entry.get("types"), list) else []
        types = [str(t) for t in raw_types if isinstance(t, str)][:6]
        gmaps_uri_raw = str(entry.get("googleMapsUri") or "").strip()
        gmaps_uri = gmaps_uri_raw if gmaps_uri_raw.startswith("https://") else ""
        directions_url = (
            f"https://www.google.com/maps/dir/?api=1&destination={p_lat},{p_lon}"
            f"&destination_place_id={raw_id}"
        )
        parsed.append(
            {
                "place_id": raw_id,
                "name": name[:150],
                "address": formatted_addr,
                "latitude": p_lat,
                "longitude": p_lon,
                "types": types,
                "google_maps_uri": gmaps_uri,
                "directions_url": directions_url,
            }
        )
    return parsed


def search_google_places_nearby_cached(
    *,
    business_type_key: str,
    text_query: str,
    latitude: float,
    longitude: float,
    radius_km: float,
) -> list[dict[str, Any]]:
    """Cached 30-minute hybrid fallback search keyed by `(business_type, round(lat, 2), round(lng, 2), radius_km)`."""
    api_key = config.get_google_maps_server_api_key()
    if not api_key:
        return []

    cache_key = (
        business_type_key,
        round(float(latitude), 2),
        round(float(longitude), 2),
        round(float(radius_km), 2),
    )
    now_mono = time.monotonic()
    with _cache_lock:
        cached = _places_search_cache.get(cache_key)
        if cached is not None:
            expires_at, rows = cached
            if expires_at > now_mono:
                _places_search_cache.move_to_end(cache_key)
                return [dict(r) for r in rows]
            _places_search_cache.pop(cache_key, None)

    try:
        rows = fetch_google_places_text_search(
            text_query=text_query,
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
            api_key=api_key,
        )
    except Exception:
        return []

    with _cache_lock:
        _places_search_cache[cache_key] = (
            time.monotonic() + PLACES_SEARCH_TTL_SECONDS,
            [dict(r) for r in rows],
        )
        _places_search_cache.move_to_end(cache_key)
        while len(_places_search_cache) > MAX_CACHE_ENTRIES:
            _places_search_cache.popitem(last=False)

    return [dict(r) for r in rows]


def _optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User | None:
    if not credentials or credentials.scheme.lower() != "bearer":
        return None
    try:
        user, _ = token_session(credentials.credentials, db)
        return user
    except Exception:
        return None


def _actor_key(request: Request, user: User | None) -> str:
    if user is not None:
        return f"user:{user.id}"
    peer = request.client.host if request.client and request.client.host else "unknown"
    return f"ip:{peer}"


def _set_private_headers(response: Response) -> None:
    response.headers["Cache-Control"] = "private, no-store"
    apply_security_headers(response.headers)


async def _handle_reverse_geocode(
    latitude: float,
    longitude: float,
    request: Request,
    user: User | None,
    response: Response,
):
    _set_private_headers(response)
    cache_key = f"rev:{round(latitude, 5):.5f}:{round(longitude, 5):.5f}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return {**cached, "cached": True, "temporary_only": True}

    api_key = config.get_google_maps_server_api_key()
    if not api_key:
        return _structured_error(
            503,
            "MAPS_KEY_UNCONFIGURED",
            "Google Maps server API key is not configured. Use manual coordinates or locality.",
        )
    if not _allow_lookup(_actor_key(request, user)):
        return _structured_error(
            429,
            "MAPS_RATE_LIMITED",
            "Map lookup rate limit reached. Try again shortly or enter coordinates manually.",
        )

    try:
        async with _upstream_slots:
            result = await asyncio.to_thread(fetch_google_reverse_geocode, latitude, longitude, api_key)
    except Exception:
        return _structured_error(
            503,
            "MAPS_UPSTREAM_UNAVAILABLE",
            "Reverse geocoding is temporarily unavailable. Enter locality manually.",
        )

    _cache_set(cache_key, result)
    return {**result, "cached": False, "temporary_only": True}


async def _handle_place_details(
    place_id: str,
    session_token: str | None,
    request: Request,
    user: User | None,
    response: Response,
):
    _set_private_headers(response)
    cache_key = f"place:{place_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return {**cached, "cached": True, "temporary_only": True}

    api_key = config.get_google_maps_server_api_key()
    if not api_key:
        return _structured_error(
            503,
            "MAPS_KEY_UNCONFIGURED",
            "Google Maps server API key is not configured. Use manual coordinates or locality.",
        )
    if not _allow_lookup(_actor_key(request, user)):
        return _structured_error(
            429,
            "MAPS_RATE_LIMITED",
            "Place lookup rate limit reached. Try again shortly or enter coordinates manually.",
        )

    try:
        async with _upstream_slots:
            result = await asyncio.to_thread(fetch_google_place_details, place_id, session_token, api_key)
    except Exception:
        return _structured_error(
            503,
            "MAPS_UPSTREAM_UNAVAILABLE",
            "Place details lookup is temporarily unavailable. Enter locality manually.",
        )

    _cache_set(cache_key, result)
    return {**result, "cached": False, "temporary_only": True}


async def _handle_autocomplete(query: str, session_token: str | None, request: Request, response: Response):
    _set_private_headers(response)
    cache_key = f"auto:{query.casefold()}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return {**cached, "cached": True, "temporary_only": True}

    api_key = config.get_google_maps_server_api_key()
    if not api_key:
        return _structured_error(
            503,
            "MAPS_KEY_UNCONFIGURED",
            "Google Maps server API key is not configured. Use city chips or manual entry.",
        )
    peer = request.client.host if request.client and request.client.host else "unknown"
    if not _allow_lookup(f"ip:{peer}"):
        return _structured_error(
            429,
            "MAPS_RATE_LIMITED",
            "Autocomplete rate limit reached. Select a city chip or enter locality manually.",
        )

    try:
        async with _upstream_slots:
            result = await asyncio.to_thread(fetch_google_autocomplete, query, session_token, api_key)
    except Exception:
        return _structured_error(
            503,
            "MAPS_UPSTREAM_UNAVAILABLE",
            "Place autocomplete is temporarily unavailable. Select a city chip or enter locality manually.",
        )

    _cache_set(cache_key, result, ttl=3600.0)
    return {**result, "cached": False, "temporary_only": True}


@router.post("/maps/reverse-geocode")
@router.post("/api/maps/reverse-geocode")
async def reverse_geocode_post(
    payload: ReverseGeocodePayload,
    request: Request,
    response: Response,
    user: User | None = Depends(_optional_user),
):
    return await _handle_reverse_geocode(payload.latitude, payload.longitude, request, user, response)


@router.get("/maps/reverse-geocode")
@router.get("/api/maps/reverse-geocode")
async def reverse_geocode_get(
    request: Request,
    response: Response,
    lat: float = Query(..., description="Latitude (-90 to 90)"),
    lng: float = Query(..., description="Longitude (-180 to 180)"),
    user: User | None = Depends(_optional_user),
):
    validated = ReverseGeocodePayload(latitude=lat, longitude=lng)
    return await _handle_reverse_geocode(validated.latitude, validated.longitude, request, user, response)


@router.post("/maps/place-details")
@router.post("/api/maps/place-details")
async def place_details_post(
    payload: PlaceDetailsPayload,
    request: Request,
    response: Response,
    user: User | None = Depends(_optional_user),
):
    return await _handle_place_details(payload.place_id, payload.session_token, request, user, response)


@router.get("/maps/place-details")
@router.get("/api/maps/place-details")
async def place_details_get(
    request: Request,
    response: Response,
    place_id: str = Query(..., min_length=4, max_length=256),
    session_token: str | None = Query(default=None, max_length=128),
    user: User | None = Depends(_optional_user),
):
    validated = PlaceDetailsPayload(place_id=place_id, session_token=session_token)
    return await _handle_place_details(validated.place_id, validated.session_token, request, user, response)


@router.post("/maps/autocomplete")
@router.post("/api/maps/autocomplete")
async def autocomplete_post(
    payload: AutocompletePayload,
    request: Request,
    response: Response,
):
    return await _handle_autocomplete(payload.query, payload.session_token, request, response)


@router.get("/maps/autocomplete")
@router.get("/api/maps/autocomplete")
async def autocomplete_get(
    request: Request,
    response: Response,
    q: str = Query(..., min_length=2, max_length=200),
    session_token: str | None = Query(default=None, max_length=128),
):
    validated = AutocompletePayload(query=q, session_token=session_token)
    return await _handle_autocomplete(validated.query, validated.session_token, request, response)
