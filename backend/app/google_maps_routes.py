"""Opt-in, bounded Google geocoding. No database, saved points or request logs."""
import asyncio
import json
import os
import time
from collections import OrderedDict
from urllib.parse import quote
from urllib.request import Request as UrlRequest, build_opener, HTTPRedirectHandler

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from .v_ads_geography import validate_point

router = APIRouter()
_peers = OrderedDict()
_global = []
_slots = asyncio.Semaphore(2)


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def parse_query(data):
    if not isinstance(data, dict):
        raise ValueError()
    if set(data) == {'query'} and isinstance(data['query'], str) and 2 <= len(data['query'].strip()) <= 250:
        return 'address/' + quote(data['query'].strip(), safe='')
    if set(data) == {'latitude', 'longitude'}:
        latitude, longitude = validate_point(data['latitude'], data['longitude'])
        return f'location/{latitude},{longitude}'
    raise ValueError()


def results(data):
    items = []
    for row in data.get('results', [])[:5]:
        point = row.get('location', {})
        try:
            latitude, longitude = validate_point(point.get('latitude'), point.get('longitude'))
        except ValueError:
            continue
        components = row.get('addressComponents', [])
        def name(kind):
            return next((r.get('longText', '') for r in components if kind in r.get('types', [])), '')
        area = name('sublocality_level_1') or name('sublocality') or name('neighborhood')
        city = name('locality') or name('administrative_area_level_2')
        label = ', '.join(dict.fromkeys(part for part in (area, city) if part))[:150]
        if len(label) < 2:
            continue
        postal = name('postal_code')
        items.append({'latitude': latitude, 'longitude': longitude, 'label': label,
                      'postal_code': postal if len(postal) == 6 and postal.isascii() and postal.isdigit() else ''})
    return items


def fetch_google(path, key):
    # urllib does not emit httpx INFO URL logs containing private address searches.
    request = UrlRequest('https://geocode.googleapis.com/v4/geocode/' + path,
                         headers={'X-Goog-Api-Key': key,
                                  'X-Goog-FieldMask': 'results.location,results.addressComponents'})
    with build_opener(NoRedirect()).open(request, timeout=8) as response:
        body = response.read(131073)
        if len(body) > 131072:
            raise ValueError()
        return results(json.loads(body))


def allow(peer):
    # Technical caps per API process, not commercial tiers or a billing guarantee.
    now = time.monotonic()
    _global[:] = [stamp for stamp in _global if now - stamp < 3600]
    bucket = [stamp for stamp in _peers.get(peer, []) if now - stamp < 60]
    if len(_global) >= 100 or len(bucket) >= 10:
        return False
    _global.append(now)
    _peers[peer] = [*bucket, now]
    _peers.move_to_end(peer)
    while len(_peers) > 1024:
        _peers.popitem(last=False)
    return True


@router.post('/locations/geocode')
async def geocode(request: Request):
    def reply(body, status=200):
        return JSONResponse(body, status_code=status, headers={'Cache-Control': 'private, no-store'})
    key = os.getenv('GOOGLE_MAPS_GEOCODING_API_KEY', '').strip()
    if os.getenv('GOOGLE_MAPS_GEOCODING_ENABLED') != '1' or not key:
        return reply({'detail': 'Google place lookup is not configured. Use manual location.'}, 503)
    if request.headers.get('content-type', '').split(';')[0].strip().lower() != 'application/json':
        return reply({'detail': 'Send a JSON location search.'}, 415)
    try:
        body = b''
        async for chunk in request.stream():
            body += chunk
            if len(body) > 2048:
                return reply({'detail': 'Location search is too large.'}, 413)
        path = parse_query(json.loads(body))
    except (ValueError, TypeError, OverflowError):
        return reply({'detail': 'Enter a valid address or geographic coordinates.'}, 422)
    # Do not trust X-Forwarded-For supplied by callers.
    if not allow(request.client.host if request.client else 'unknown'):
        return reply({'detail': 'Place lookup limit reached. Use manual location or try later.'}, 429)
    try:
        async with _slots:
            items = await asyncio.to_thread(fetch_google, path, key)
        return reply({'items': items, 'source': 'google', 'temporary_only': True})
    except Exception:
        return reply({'detail': 'Place lookup is unavailable. Use manual location.'}, 503)
