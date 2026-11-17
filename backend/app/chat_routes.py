"""Grounded Ask VISTRAH Gemini chatbot endpoint (`POST /chat` and `POST /api/chat`)."""
from __future__ import annotations

from collections import deque
from functools import lru_cache
import ipaddress
import json
import logging
import os
import re
import threading
import time
from typing import Literal
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request as UrlRequest, build_opener

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from . import config
from .business_catalogue import business_types
from .http_security import apply_security_headers

logger = logging.getLogger("vistrah.chat")
router = APIRouter(tags=["Ask VISTRAH Chat"])

GEMINI_MODELS: tuple[str, ...] = (
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
)
GEMINI_TIMEOUT_SECONDS = 9.0
CHAT_WINDOW_SECONDS = 60.0
MAX_TRACKED_CHAT_IPS = 4096

SAFE_ACTION_PREFIXES: tuple[str, ...] = (
    "/services",
    "/seller/onboard",
    "/seller",
    "/v-ads",
    "/location",
    "/membership",
    "/marketing-pricing",
    "/marketing-solutions",
    "/commerce",
    "/jobs",
    "/agri-connect",
    "/health-connect",
    "/contact",
    "/about",
    "/pricing",
)

_chat_lock = threading.Lock()
_chat_windows: dict[str, deque[float]] = {}


class ChatHistoryTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=800)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=600)
    history: list[ChatHistoryTurn] = Field(default_factory=list, max_length=8)


class SuggestedAction(BaseModel):
    label: str
    href: str


class ChatResponse(BaseModel):
    reply: str
    suggestedActions: list[SuggestedAction]


def clear_chat_rate_limits() -> None:
    with _chat_lock:
        _chat_windows.clear()


def _chat_limit_per_minute() -> int:
    raw = os.getenv("CHAT_RATE_LIMIT_PER_MINUTE", "").strip()
    if raw.isdigit() and int(raw) > 0:
        return int(raw)
    return 15


def _is_internal_hop(host: str) -> bool:
    try:
        addr = ipaddress.ip_address(host)
        return addr.is_loopback or addr.is_private
    except ValueError:
        return host in ("localhost", "testclient")


def _extract_client_ip(request: Request) -> str:
    direct = request.client.host if request.client and request.client.host else "unknown"
    if _is_internal_hop(direct):
        xff = request.headers.get("x-forwarded-for", "").strip()
        if xff:
            first_hop = xff.split(",")[0].strip()
            if first_hop:
                return first_hop[:64]
    return direct[:64]


def _allow_chat_ip(client_ip: str) -> bool:
    limit = _chat_limit_per_minute()
    now = time.monotonic()
    cutoff = now - CHAT_WINDOW_SECONDS
    with _chat_lock:
        if client_ip not in _chat_windows and len(_chat_windows) >= MAX_TRACKED_CHAT_IPS:
            stale = [
                ip for ip, stamps in _chat_windows.items() if not stamps or stamps[-1] <= cutoff
            ]
            for ip in stale:
                _chat_windows.pop(ip, None)
            if len(_chat_windows) >= MAX_TRACKED_CHAT_IPS:
                _chat_windows.pop(next(iter(_chat_windows)), None)
        stamps = _chat_windows.setdefault(client_ip, deque())
        while stamps and stamps[0] <= cutoff:
            stamps.popleft()
        if len(stamps) >= limit:
            return False
        stamps.append(now)
        return True


def _sanitize_action_href(raw_href: object) -> str | None:
    if not isinstance(raw_href, str):
        return None
    href = raw_href.strip()
    if not href.startswith("/") or href.startswith("//") or "\\" in href or len(href) > 240:
        return None
    pathname = re.split(r"[?#]", href, maxsplit=1)[0]
    if any(pathname == p or pathname.startswith(p + "/") for p in SAFE_ACTION_PREFIXES):
        return href
    return None


def _clean_actions(raw_actions: object) -> list[dict[str, str]]:
    if not isinstance(raw_actions, list):
        return []
    cleaned: list[dict[str, str]] = []
    seen: set[str] = set()
    for entry in raw_actions:
        if not isinstance(entry, dict):
            continue
        label = str(entry.get("label") or "").strip()[:48]
        href = _sanitize_action_href(entry.get("href"))
        if not label or not href or href in seen:
            continue
        seen.add(href)
        cleaned.append({"label": label, "href": href})
        if len(cleaned) >= 4:
            break
    return cleaned


@lru_cache(maxsize=1)
def _catalogue_grounding() -> tuple[str, list[dict[str, str]]]:
    data = business_types()
    categories = data.get("categories", [])
    total_types = sum(len(cat.get("types", [])) for cat in categories)
    division_lines: list[str] = []
    search_index: list[dict[str, str]] = []

    for idx, cat in enumerate(categories, start=1):
        cat_slug = cat["slug"]
        cat_title = cat["title"]
        types = cat.get("types", [])
        subs_seen: list[str] = []
        for bt in types:
            sub_title = bt.get("subcategory_title") or ""
            if sub_title and sub_title not in subs_seen:
                subs_seen.append(sub_title)
            lt_slug = bt.get("listing_type_slug") or bt["slug"]
            sub_slug = bt.get("subcategory_slug") or lt_slug
            haystack = " ".join(
                [
                    bt["title"],
                    cat_title,
                    sub_title,
                    bt.get("description", ""),
                    " ".join(bt.get("keywords", [])[:12]),
                ]
            ).lower()
            search_index.append(
                {
                    "slug": bt["slug"],
                    "title": bt["title"],
                    "category_slug": cat_slug,
                    "category_title": cat_title,
                    "subcategory_slug": sub_slug,
                    "subcategory_title": sub_title,
                    "listing_type_slug": lt_slug,
                    "haystack": haystack,
                    "words": " " + " ".join(re.findall(r"[a-z0-9]+", haystack)) + " ",
                }
            )
        sample_subs = ", ".join(subs_seen[:6])
        division_lines.append(
            f"{idx}. {cat_title} (`{cat_slug}`, {len(types)} services — e.g. {sample_subs})"
        )

    base_prompt = (
        "You are Ask VISTRAH, the official helpful AI guide for Vistrah India Pvt Limited (https://vistrah.in).\n"
        "Always be warm, concise (2 to 4 short sentences or compact bullet points), accurate, and India-focused.\n"
        "Never invent phone numbers, prices, external links, or unverified claims.\n\n"
        "GROUNDED VISTRAH PLATFORM FACTS:\n"
        f"- Marketplace Taxonomy: {len(categories)} major divisions covering {total_types}+ service & business types:\n  "
        + "\n  ".join(division_lines)
        + "\n"
        "- In-App Nearby Service Discovery (`/services/nearby`): Clicking any service type opens an interactive map + distance-sorted nearby businesses (`5 km`, `10 km`, `25 km`, `50 km`), shop photos, tap-to-call `Call`, `WhatsApp` (for VISTRAH Verified businesses), and `Directions`.\n"
        "- Free 3-Step Seller Self-Onboarding (`/seller/onboard`): Any shop, professional, or service provider can list in ~3 minutes: "
        "(1) Search & pick up to 3 business types from 800+ services, "
        "(2) Enter shop name, phone/WhatsApp, drop map pin + coverage radius (`5/10/25/50 km`), with optional licence upload ONLY for regulated professions (doctors, pharmacies, food/FSSAI, legal/CA), "
        "(3) Accept terms & submit.\n"
        "- V Ads Hyperlocal Reels (`/v-ads` & `/marketing-pricing`): Short vertical video ads targeted by locality/GPS radius and service category so local businesses reach nearby customers.\n\n"
        "OUTPUT FORMAT (STRICT JSON ONLY):\n"
        'Return a JSON object with exact keys: {"reply": "<concise helpful answer>", "suggestedActions": [{"label": "<short button text>", "href": "<valid internal path>"}]}.\n'
        "Allowed `href` patterns ONLY: `/services`, `/services?category=<cat_slug>`, "
        "`/services/nearby?category=<cat_slug>&subcategory=<sub_slug>&type=<lt_slug>`, "
        "`/seller/onboard`, `/seller/onboard?category=<cat_slug>&subcategory=<sub_slug>&type=<slug>`, "
        "`/v-ads`, `/marketing-pricing`, `/location`, `/agri-connect`, `/health-connect`, `/jobs`, `/contact`.\n"
        "Include 1 to 3 relevant `suggestedActions`."
    )
    return base_prompt, search_index


def _match_relevant_services(query: str, limit: int = 6) -> list[dict[str, str]]:
    _, index = _catalogue_grounding()
    tokens = [
        tok
        for tok in re.findall(r"[a-z0-9]{2,}", query.lower())
        if tok
        not in {
            "how",
            "what",
            "where",
            "find",
            "near",
            "nearby",
            "the",
            "and",
            "for",
            "with",
            "can",
            "you",
            "list",
            "my",
            "business",
            "services",
            "service",
            "vistrah",
            "explore",
            "divisions",
            "categories",
            "india",
            "want",
            "need",
            "me",
            "in",
            "to",
            "on",
            "at",
            "of",
            "is",
            "are",
        }
    ]
    if not tokens:
        return []

    generic_venue_words = {
        "clinic",
        "clinics",
        "shop",
        "shops",
        "store",
        "stores",
        "centre",
        "centres",
        "center",
        "centers",
        "agency",
        "agencies",
        "office",
        "offices",
    }
    scored: list[tuple[int, dict[str, str]]] = []
    for item in index:
        title_words = re.findall(r"[a-z0-9]+", item["title"].lower())
        words_padded = item["words"]
        score = 0
        specific_hit = False
        for tok in tokens:
            is_generic = tok in generic_venue_words
            weight = 1 if is_generic else 5
            stem = tok[:4] if len(tok) >= 5 else tok
            if f" {tok}" in words_padded or f" {stem}" in words_padded:
                score += weight
                if not is_generic:
                    specific_hit = True
            if any(tw == tok for tw in title_words):
                score += 2 if is_generic else 14
            elif any(tw.startswith(stem) for tw in title_words):
                score += 1 if is_generic else 4
        if score == 0 or (any(t not in generic_venue_words for t in tokens) and not specific_hit):
            continue
        scored.append((score, item))

    scored.sort(key=lambda pair: (-pair[0], pair[1]["title"]))
    return [pair[1] for pair in scored[:limit]]


def _nearby_href(item: dict[str, str]) -> str:
    return (
        "/services/nearby?"
        + urlencode(
            {
                "category": item["category_slug"],
                "subcategory": item["subcategory_slug"],
                "type": item["listing_type_slug"],
            }
        )
    )


def _onboard_href(item: dict[str, str]) -> str:
    return (
        "/seller/onboard?"
        + urlencode(
            {
                "category": item["category_slug"],
                "subcategory": item["subcategory_slug"],
                "type": item["slug"],
            }
        )
    )


def _deterministic_grounded_reply(message: str) -> dict[str, object]:
    lower = message.lower()
    matches = _match_relevant_services(message, limit=3)

    if any(k in lower for k in ("list my business", "onboard", "become a seller", "register shop", "add my business", "add service")):
        actions: list[dict[str, str]] = [{"label": "Start 3-Step Onboarding", "href": "/seller/onboard"}]
        if matches:
            top = matches[0]
            actions.insert(
                0,
                {"label": f"List {top['title']}", "href": _onboard_href(top)},
            )
        actions.append({"label": "Explore V Ads", "href": "/v-ads"})
        return {
            "reply": (
                "You can list your business for free on VISTRAH in ~3 minutes at `/seller/onboard`: "
                "(1) Search and select up to 3 services from our 800+ catalogue, "
                "(2) Add your business name, phone/WhatsApp, and drop your map pin + coverage radius (`5–50 km`), "
                "(3) Accept terms and submit (optional licence upload is only shown for regulated professions)."
            ),
            "suggestedActions": actions[:3],
        }

    if any(k in lower for k in ("division", "categories", "13 division", "15 division", "what services", "explore")):
        cats = business_types().get("categories", [])
        names = ", ".join(c["title"] for c in cats[:8])
        return {
            "reply": (
                f"Vistrah India organizes 800+ hyperlocal services across {len(cats)} major divisions — including {names}, "
                "Agriculture & Farming, Pet Care, and Property & Construction. Tap any service to view nearby providers on an interactive map with shop photos, Call, and Directions."
            ),
            "suggestedActions": [
                {"label": "Browse All Divisions", "href": "/services"},
                {"label": "AgriConnect", "href": "/agri-connect"},
                {"label": "List Your Business", "href": "/seller/onboard"},
            ],
        }

    if any(k in lower for k in ("v ads", "v-ads", "video ad", "promote", "marketing", "boost")):
        return {
            "reply": (
                "V Ads lets local businesses publish short hyperlocal video reels targeted by customer locality, GPS radius, and service category. "
                "You can watch live local reels on `/v-ads` or review transparent promotional plans on `/marketing-pricing`."
            ),
            "suggestedActions": [
                {"label": "Watch V Ads", "href": "/v-ads"},
                {"label": "V Ads Plans", "href": "/marketing-pricing"},
                {"label": "List Your Business", "href": "/seller/onboard"},
            ],
        }

    if matches:
        top = matches[0]
        others = ", ".join(m["title"] for m in matches[1:3])
        extra = f" (plus related options like {others})" if others else ""
        actions = [
            {"label": f"Nearby {top['title']}", "href": _nearby_href(top)},
            {"label": f"Offer {top['title']}", "href": _onboard_href(top)},
            {"label": top["category_title"], "href": f"/services?category={top['category_slug']}"},
        ]
        return {
            "reply": (
                f"You can find nearby **{top['title']}** under {top['category_title']}{extra} right inside VISTRAH's interactive map and list view — "
                "with `5–50 km` radius filters, shop photos, tap-to-call `Call`, and `Directions`."
            ),
            "suggestedActions": actions,
        }

    return {
        "reply": (
            "I can help you discover nearby local businesses across 800+ service types (`5–50 km` map + tap-to-call listings), "
            "list your business in 3 quick steps on VISTRAH, or explore hyperlocal V Ads reels. What service or business are you looking for?"
        ),
        "suggestedActions": [
            {"label": "Find Nearby Services", "href": "/services"},
            {"label": "Set My Location", "href": "/location"},
            {"label": "List Your Business", "href": "/seller/onboard"},
        ],
    }


def _extract_gemini_json(text: str) -> dict[str, object] | None:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict) and isinstance(parsed.get("reply"), str) and parsed["reply"].strip():
            return parsed
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group(0))
                if isinstance(parsed, dict) and isinstance(parsed.get("reply"), str) and parsed["reply"].strip():
                    return parsed
            except json.JSONDecodeError:
                return None
    return None


def call_gemini_grounded(message: str, history: list[ChatHistoryTurn], api_key: str) -> dict[str, object] | None:
    base_prompt, _ = _catalogue_grounding()
    matches = _match_relevant_services(message, limit=6)
    dynamic_context = ""
    if matches:
        lines = [
            f"- {m['title']} ({m['category_title']} > {m['subcategory_title']}): nearby=`{_nearby_href(m)}`, onboard=`{_onboard_href(m)}`"
            for m in matches
        ]
        dynamic_context = "\n\nMATCHING VISTRAH SERVICES FOR THIS USER QUERY:\n" + "\n".join(lines)

    contents: list[dict[str, object]] = []
    for turn in history[-6:]:
        role = "model" if turn.role == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": turn.content.strip()}]})
    contents.append({"role": "user", "parts": [{"text": message.strip()}]})

    payload_bytes = json.dumps(
        {
            "systemInstruction": {
                "parts": [{"text": base_prompt + dynamic_context}],
            },
            "contents": contents,
            "generationConfig": {
                "temperature": 0.25,
                "maxOutputTokens": 450,
                "responseMimeType": "application/json",
            },
        }
    ).encode("utf-8")

    opener = build_opener()
    for model_name in GEMINI_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
        req = UrlRequest(
            url,
            data=payload_bytes,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": api_key,
            },
        )
        try:
            with opener.open(req, timeout=GEMINI_TIMEOUT_SECONDS) as resp:
                raw_body = resp.read(65536).decode("utf-8", errors="replace")
            body = json.loads(raw_body)
            candidates = body.get("candidates") or []
            if not candidates:
                continue
            parts = ((candidates[0].get("content") or {}).get("parts")) or []
            text_out = "".join(str(p.get("text") or "") for p in parts if isinstance(p, dict))
            extracted = _extract_gemini_json(text_out)
            if extracted:
                return extracted
            if text_out.strip():
                return {"reply": text_out.strip()[:900], "suggestedActions": []}
        except HTTPError as exc:
            logger.warning("Gemini model %s returned HTTP %s", model_name, exc.code)
            if exc.code in (400, 401, 403):
                break
            continue
        except (URLError, TimeoutError, ValueError, KeyError) as exc:
            logger.warning("Gemini model %s call failed: %s", model_name, type(exc).__name__)
            continue
    return None


def _handle_chat(payload: ChatRequest, request: Request, response: Response):
    response.headers["Cache-Control"] = "private, no-store"
    client_ip = _extract_client_ip(request)
    if not _allow_chat_ip(client_ip):
        limited = JSONResponse(
            status_code=429,
            content={
                "detail": "Ask VISTRAH has reached the per-minute message limit for your connection. Please wait a few seconds or use the quick links below.",
                "code": "CHAT_RATE_LIMITED",
                "reply": "You have sent several messages quickly — please pause ~30 seconds, or jump straight to our services below.",
                "suggestedActions": [
                    {"label": "Browse Services", "href": "/services"},
                    {"label": "List Your Business", "href": "/seller/onboard"},
                ],
            },
        )
        limited.headers["Cache-Control"] = "private, no-store"
        limited.headers["Retry-After"] = "30"
        apply_security_headers(limited.headers)
        return limited

    fallback = _deterministic_grounded_reply(payload.message)
    api_key = config.get_gemini_api_key()
    gemini_result = (
        call_gemini_grounded(payload.message, payload.history, api_key) if api_key else None
    )

    if gemini_result:
        reply_text = str(gemini_result.get("reply") or "").strip()[:1200]
        actions = _clean_actions(gemini_result.get("suggestedActions"))
        if not actions:
            actions = _clean_actions(fallback.get("suggestedActions"))
        return {"reply": reply_text, "suggestedActions": actions}

    return {
        "reply": str(fallback["reply"]),
        "suggestedActions": _clean_actions(fallback.get("suggestedActions")),
    }


@router.post("/chat", response_model=ChatResponse)
def post_chat_direct(payload: ChatRequest, request: Request, response: Response):
    return _handle_chat(payload, request, response)


@router.post("/api/chat", response_model=ChatResponse)
def post_chat_api_prefixed(payload: ChatRequest, request: Request, response: Response):
    return _handle_chat(payload, request, response)
