"""Authenticated, rate-limited, cached Google Maps reverse-geocoding & Place Details proxy.

Uses GOOGLE_MAPS_SERVER_API_KEY strictly server-side with minimal Essentials SKU field masks
(`formattedAddress`, `location`, `addressComponents`) and an in-memory bounded LRU+TTL cache
so repeat coordinate or place lookups cost 0 upstream API calls.
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

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import Field, field_validator

from . import config
from .http_security import apply_security_headers
from .models import User
from .schemas import Schema
from .security import current_user
from .v_ads_geography import validate_point

router = APIRouter(tags=["Google Maps Proxy"])

PLACE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{4,256}$")
SESSION_TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{8,128}$")

# Essentials-only field masks (avoids Pro/Enterprise SKU charges)
REVERSE_GEOCODE_FIELD_MASK = "results.formattedAddress,results.location,results.addressComponents"
PLACE_DETAILS_FIELD_MASK = "formattedAddress,location,addressComponents"

MAX_CACHE_ENTRIES = 2048
CACHE_TTL_SECONDS = 86400.0  # 24 hours
PER_USER_LIMIT_PER_MINUTE = 30
GLOBAL_LIMIT_PER_HOUR = 600

_cache_lock = threading.Lock()
_cache: OrderedDict[str, tuple[float, dict[str, Any]]] = OrderedDict()

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


def clear_maps_proxy_state() -> None:
    """Test helper to clear cache and rate-limit state deterministically."""
    with _cache_lock:
        _cache.clear()
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


def _cache_set(key: str, payload: dict[str, Any]) -> None:
    expires_at = time.monotonic() + CACHE_TTL_SECONDS
    with _cache_lock:
        _cache[key] = (expires_at, dict(payload))
        _cache.move_to_end(key)
        while len(_cache) > MAX_CACHE_ENTRIES:
            _cache.popitem(last=False)


def _allow_lookup(actor_key: str) -> bool:
    per_min = int(os.getenv("MAPS_PROXY_RATE_LIMIT_PER_MINUTE", str(PER_USER_LIMIT_PER_MINUTE)) or PER_USER_LIMIT_PER_MINUTE)
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


def _require_server_key() -> str:
    key = config.get_google_maps_server_api_key()
    if not key:
        raise HTTPException(
            status_code=503,
            detail="Google Maps server API key is not configured. Use manual coordinates or locality.",
        )
    return key


def _set_private_headers(response: Response) -> None:
    response.headers["Cache-Control"] = "private, no-store"
    apply_security_headers(response.headers)


async def _handle_reverse_geocode(latitude: float, longitude: float, user: User, response: Response) -> dict[str, Any]:
    _set_private_headers(response)
    cache_key = f"rev:{round(latitude, 5):.5f}:{round(longitude, 5):.5f}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return {**cached, "cached": True, "temporary_only": True}

    api_key = _require_server_key()
    if not _allow_lookup(f"user:{user.id}"):
        raise HTTPException(status_code=429, detail="Map lookup rate limit reached. Try again shortly or enter coordinates manually.")

    try:
        async with _upstream_slots:
            result = await asyncio.to_thread(fetch_google_reverse_geocode, latitude, longitude, api_key)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=503, detail="Reverse geocoding is temporarily unavailable. Enter locality manually.") from None

    _cache_set(cache_key, result)
    return {**result, "cached": False, "temporary_only": True}


async def _handle_place_details(place_id: str, session_token: str | None, user: User, response: Response) -> dict[str, Any]:
    _set_private_headers(response)
    cache_key = f"place:{place_id}"
    # Note: if a session_token is present and not yet cached, calling Google terminates the billing session cleanly.
    cached = _cache_get(cache_key)
    if cached is not None:
        return {**cached, "cached": True, "temporary_only": True}

    api_key = _require_server_key()
    if not _allow_lookup(f"user:{user.id}"):
        raise HTTPException(status_code=429, detail="Place lookup rate limit reached. Try again shortly or enter coordinates manually.")

    try:
        async with _upstream_slots:
            result = await asyncio.to_thread(fetch_google_place_details, place_id, session_token, api_key)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=503, detail="Place details lookup is temporarily unavailable. Enter locality manually.") from None

    _cache_set(cache_key, result)
    return {**result, "cached": False, "temporary_only": True}


@router.post("/maps/reverse-geocode")
@router.post("/api/maps/reverse-geocode")
async def reverse_geocode_post(
    payload: ReverseGeocodePayload,
    response: Response,
    user: User = Depends(current_user),
):
    return await _handle_reverse_geocode(payload.latitude, payload.longitude, user, response)


@router.get("/maps/reverse-geocode")
@router.get("/api/maps/reverse-geocode")
async def reverse_geocode_get(
    response: Response,
    lat: float = Query(..., description="Latitude (-90 to 90)"),
    lng: float = Query(..., description="Longitude (-180 to 180)"),
    user: User = Depends(current_user),
):
    validated = ReverseGeocodePayload(latitude=lat, longitude=lng)
    return await _handle_reverse_geocode(validated.latitude, validated.longitude, user, response)


@router.post("/maps/place-details")
@router.post("/api/maps/place-details")
async def place_details_post(
    payload: PlaceDetailsPayload,
    response: Response,
    user: User = Depends(current_user),
):
    return await _handle_place_details(payload.place_id, payload.session_token, user, response)


@router.get("/maps/place-details")
@router.get("/api/maps/place-details")
async def place_details_get(
    response: Response,
    place_id: str = Query(..., min_length=4, max_length=256),
    session_token: str | None = Query(default=None, max_length=128),
    user: User = Depends(current_user),
):
    validated = PlaceDetailsPayload(place_id=place_id, session_token=session_token)
    return await _handle_place_details(validated.place_id, validated.session_token, user, response)
