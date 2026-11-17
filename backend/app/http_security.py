"""Phase 1 HTTP security hardening: strict CORS allowlist, standard security headers, and rate limiting."""
from __future__ import annotations

import os
import threading
import time
from collections import deque
from urllib.parse import urlsplit

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

DEFAULT_PRODUCTION_ORIGINS: tuple[str, ...] = (
    "https://vistrah.in",
    "https://www.vistrah.in",
    "https://admin.vistrah.in",
)

DEFAULT_DEVELOPMENT_ORIGINS: tuple[str, ...] = (
    "http://localhost:3000",
    "http://localhost:3100",
    "http://localhost:3200",
    "http://localhost:8081",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3100",
    "http://127.0.0.1:3200",
    "http://127.0.0.1:8081",
)

SECURITY_HEADERS: dict[str, str] = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
    "Referrer-Policy": "strict-origin-when-cross-origin",
}

PUBLIC_SEARCH_PREFIXES: tuple[str, ...] = (
    "/v-ads/reels",
    "/v-ads/advertisers/",
    "/jobs",
    "/catalogue",
    "/marketplace/taxonomy",
    "/commerce/products",
    "/commerce/service-packages",
    "/commerce/classified-services",
    "/marketing-pricing/catalogue",
)

WINDOW_SECONDS = 60.0
MAX_TRACKED_KEYS = 4096
_rate_lock = threading.Lock()
_rate_windows: dict[str, deque[float]] = {}


def _normalize_origin(raw: str) -> str | None:
    candidate = raw.strip().rstrip("/")
    if not candidate:
        return None
    if candidate == "*":
        raise ValueError("Wildcard '*' is not permitted in CORS allowed origins")
    parsed = urlsplit(candidate)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return None
    if parsed.path or parsed.query or parsed.fragment or parsed.username or parsed.password:
        return None
    return f"{parsed.scheme}://{parsed.netloc}"


def allowed_cors_origins() -> list[str]:
    configured_raw = ",".join(
        value
        for value in (
            os.getenv("CORS_ALLOWED_ORIGINS", ""),
            os.getenv("ALLOWED_ORIGINS", ""),
            os.getenv("ADMIN_ALLOWED_ORIGINS", ""),
        )
        if value.strip()
    )
    origins: list[str] = []
    if configured_raw:
        for part in configured_raw.split(","):
            normalized = _normalize_origin(part)
            if normalized and normalized not in origins:
                origins.append(normalized)
    else:
        origins.extend(DEFAULT_PRODUCTION_ORIGINS)
        if os.getenv("APP_ENV", "production") == "development":
            for dev_origin in DEFAULT_DEVELOPMENT_ORIGINS:
                if dev_origin not in origins:
                    origins.append(dev_origin)
    return origins


class StrictAllowlistCORSMiddleware(CORSMiddleware):
    """Evaluates CORS origin allowlist against environment settings without allowing wildcards."""

    def is_allowed_origin(self, origin: str) -> bool:
        normalized = origin.strip().rstrip("/")
        if not normalized or normalized == "*":
            return False
        try:
            return normalized in set(allowed_cors_origins())
        except ValueError:
            return False


def _positive_int_env(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        parsed = int(raw)
        return parsed if parsed > 0 else default
    except ValueError:
        return default


def is_production_env() -> bool:
    return (
        os.getenv("ENVIRONMENT", "").strip().lower() == "production"
        or os.getenv("APP_ENV", "").strip().lower() == "production"
    )


def _rate_bucket(request: Request) -> tuple[str, int] | None:
    if request.method == "OPTIONS":
        return None
    path = request.url.path
    if path.startswith(("/auth/", "/recovery/", "/password-reset")):
        return ("auth", _positive_int_env("AUTH_RATE_LIMIT_PER_MINUTE", 60))
    if request.method == "GET" and (
        path in ("/v-ads/reels", "/jobs", "/catalogue", "/marketplace/taxonomy")
        or path.startswith(PUBLIC_SEARCH_PREFIXES)
    ):
        return ("search", _positive_int_env("PUBLIC_SEARCH_RATE_LIMIT_PER_MINUTE", 120))
    return None


def _client_identifier(request: Request) -> str:
    return request.client.host if request.client and request.client.host else "unknown"


def _allow_request(bucket: str, client_id: str, limit: int) -> bool:
    now_mono = time.monotonic()
    cutoff = now_mono - WINDOW_SECONDS
    key = f"{bucket}:{client_id}"
    with _rate_lock:
        if key not in _rate_windows and len(_rate_windows) >= MAX_TRACKED_KEYS:
            stale = [
                existing_key
                for existing_key, stamps in _rate_windows.items()
                if not stamps or stamps[-1] <= cutoff
            ]
            for existing_key in stale:
                _rate_windows.pop(existing_key, None)
            if len(_rate_windows) >= MAX_TRACKED_KEYS:
                _rate_windows.pop(next(iter(_rate_windows)), None)
        stamps = _rate_windows.setdefault(key, deque())
        while stamps and stamps[0] <= cutoff:
            stamps.popleft()
        if len(stamps) >= limit:
            return False
        stamps.append(now_mono)
        return True


def reset_rate_limits() -> None:
    with _rate_lock:
        _rate_windows.clear()


def apply_security_headers(headers) -> None:
    for header_name, header_value in SECURITY_HEADERS.items():
        if header_name not in headers:
            headers[header_name] = header_value


def configure_http_security(app: FastAPI) -> None:
    @app.middleware("http")
    async def security_headers_and_rate_limit(request: Request, call_next):
        if is_production_env() and request.url.path in ("/docs", "/docs/oauth2-redirect", "/redoc", "/openapi.json"):
            denied_docs = JSONResponse(status_code=404, content={"detail": "Not found"})
            apply_security_headers(denied_docs.headers)
            return denied_docs
        bucket_info = _rate_bucket(request)
        if bucket_info is not None:
            bucket, limit = bucket_info
            if not _allow_request(bucket, _client_identifier(request), limit):
                denied = JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please try again shortly."},
                    headers={"Retry-After": "60"},
                )
                apply_security_headers(denied.headers)
                return denied
        response = await call_next(request)
        apply_security_headers(response.headers)
        return response

    app.add_middleware(
        StrictAllowlistCORSMiddleware,
        allow_origins=allowed_cors_origins(),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "Accept",
            "X-User-Latitude",
            "X-User-Longitude",
            "X-User-Radius-Km",
            "Idempotency-Key",
        ],
    )
