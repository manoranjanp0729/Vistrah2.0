"""Regression tests for authenticated, cached, Essentials-only Google Maps proxy routes."""
from __future__ import annotations

import json
from unittest.mock import MagicMock, Mock, patch
import uuid

from app import maps_proxy_routes as maps_proxy
from app.models import User
from app.security import issue_token, passwords


def _auth_headers(db) -> dict[str, str]:
    user = User(
        name="Maps Tester",
        email=f"maps-{uuid.uuid4().hex[:8]}@vistrah.in",
        role="CUSTOMER",
        password_hash=passwords.hash("MapsTestPassword!123"),
        seller_enabled=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = issue_token(db, user)
    return {"Authorization": f"Bearer {token}"}


def test_maps_proxy_requires_authentication(client):
    maps_proxy.clear_maps_proxy_state()
    assert client.post("/api/maps/reverse-geocode", json={"latitude": 12.9716, "longitude": 77.5946}).status_code == 401
    assert client.get("/api/maps/reverse-geocode?lat=12.9716&lng=77.5946").status_code == 401
    assert client.post("/api/maps/place-details", json={"place_id": "ChIJbU60yXAWrjsR4E9-UejD3_g"}).status_code == 401
    assert client.get("/api/maps/place-details?place_id=ChIJbU60yXAWrjsR4E9-UejD3_g").status_code == 401


def test_maps_proxy_unconfigured_key_fails_closed_without_upstream_call(client, db, monkeypatch):
    maps_proxy.clear_maps_proxy_state()
    monkeypatch.setenv("GOOGLE_MAPS_SERVER_API_KEY", "")
    monkeypatch.setenv("GOOGLE_MAPS_GEOCODING_API_KEY", "")
    monkeypatch.setattr("app.config.GOOGLE_MAPS_SERVER_API_KEY", "")
    headers = _auth_headers(db)

    with patch.object(maps_proxy, "fetch_google_reverse_geocode") as rev_mock:
        res = client.post(
            "/api/maps/reverse-geocode",
            headers=headers,
            json={"latitude": 12.9716, "longitude": 77.5946},
        )
        assert res.status_code == 503
        assert res.headers.get("cache-control") == "private, no-store"
        rev_mock.assert_not_called()


def test_reverse_geocode_uses_essentials_field_mask_and_zero_cost_cache(client, db, monkeypatch):
    maps_proxy.clear_maps_proxy_state()
    monkeypatch.setenv("GOOGLE_MAPS_SERVER_API_KEY", "srv-secret-maps-key-do-not-expose")
    headers = _auth_headers(db)

    upstream_body = json.dumps(
        {
            "results": [
                {
                    "formattedAddress": "100 Feet Rd, Indiranagar, Bengaluru, Karnataka 560038, India",
                    "location": {"latitude": 12.978369, "longitude": 77.640836},
                    "addressComponents": [
                        {"longText": "Indiranagar", "shortText": "Indiranagar", "types": ["sublocality_level_1"]},
                        {"longText": "Bengaluru", "shortText": "Bengaluru", "types": ["locality"]},
                        {"longText": "Karnataka", "shortText": "KA", "types": ["administrative_area_level_1"]},
                        {"longText": "560038", "shortText": "560038", "types": ["postal_code"]},
                    ],
                }
            ]
        }
    ).encode("utf-8")

    fake_http_resp = MagicMock()
    fake_http_resp.__enter__.return_value.read.return_value = upstream_body
    opener = Mock()
    opener.open.return_value = fake_http_resp

    with patch.object(maps_proxy, "build_opener", return_value=opener):
        first = client.post(
            "/api/maps/reverse-geocode",
            headers=headers,
            json={"latitude": 12.978371, "longitude": 77.640839},
        )
        assert first.status_code == 200
        body1 = first.json()
        assert body1["cached"] is False
        assert body1["locality"] == "Indiranagar, Bengaluru"
        assert body1["postal_code"] == "560038"
        assert "srv-secret-maps-key-do-not-expose" not in first.text

        # Verify Essentials-only field mask and header-based key (never in URL)
        sent_req = opener.open.call_args.args[0]
        assert "srv-secret-maps-key-do-not-expose" not in sent_req.full_url
        assert sent_req.get_header("X-goog-api-key") == "srv-secret-maps-key-do-not-expose"
        assert sent_req.get_header("X-goog-fieldmask") == "results.formattedAddress,results.location,results.addressComponents"
        assert opener.open.call_count == 1

        # Repeat lookup within 5-decimal quantized cell hits cache (0 extra upstream calls!)
        second = client.post(
            "/api/maps/reverse-geocode",
            headers=headers,
            json={"latitude": 12.978372, "longitude": 77.640841},
        )
        assert second.status_code == 200
        assert second.json()["cached"] is True
        assert opener.open.call_count == 1


def test_place_details_validates_place_id_uses_session_token_and_caches(client, db, monkeypatch):
    maps_proxy.clear_maps_proxy_state()
    monkeypatch.setenv("GOOGLE_MAPS_SERVER_API_KEY", "srv-secret-places-key")
    headers = _auth_headers(db)

    # Path traversal / malformed place_id rejected with 422 without leaking raw input
    bad = client.post(
        "/api/maps/place-details",
        headers=headers,
        json={"place_id": "../../etc/passwd?secret=1"},
    )
    assert bad.status_code == 422
    assert "passwd" not in bad.text

    upstream_place = json.dumps(
        {
            "formattedAddress": "MG Road, Bengaluru, Karnataka 560001, India",
            "location": {"latitude": 12.9756, "longitude": 77.6066},
            "addressComponents": [
                {"longText": "MG Road", "shortText": "MG Rd", "types": ["route"]},
                {"longText": "Bengaluru", "shortText": "Bengaluru", "types": ["locality"]},
                {"longText": "560001", "shortText": "560001", "types": ["postal_code"]},
            ],
        }
    ).encode("utf-8")

    fake_http_resp = MagicMock()
    fake_http_resp.__enter__.return_value.read.return_value = upstream_place
    opener = Mock()
    opener.open.return_value = fake_http_resp

    with patch.object(maps_proxy, "build_opener", return_value=opener):
        res1 = client.post(
            "/api/maps/place-details",
            headers=headers,
            json={
                "place_id": "ChIJbU60yXAWrjsR4E9-UejD3_g",
                "session_token": "vst_session_1234567890",
            },
        )
        assert res1.status_code == 200
        d1 = res1.json()
        assert d1["cached"] is False
        assert d1["latitude"] == 12.9756
        assert d1["longitude"] == 77.6066
        assert d1["postal_code"] == "560001"

        sent_req = opener.open.call_args.args[0]
        assert "sessionToken=vst_session_1234567890" in sent_req.full_url
        assert "srv-secret-places-key" not in sent_req.full_url
        assert sent_req.get_header("X-goog-fieldmask") == "formattedAddress,location,addressComponents"
        assert opener.open.call_count == 1

        # Repeat lookup for same place_id costs 0 API calls
        res2 = client.get(
            "/api/maps/place-details?place_id=ChIJbU60yXAWrjsR4E9-UejD3_g",
            headers=headers,
        )
        assert res2.status_code == 200
        assert res2.json()["cached"] is True
        assert opener.open.call_count == 1


def test_maps_proxy_rate_limit_enforced(client, db, monkeypatch):
    maps_proxy.clear_maps_proxy_state()
    monkeypatch.setenv("GOOGLE_MAPS_SERVER_API_KEY", "srv-secret-rate-key")
    monkeypatch.setenv("MAPS_PROXY_RATE_LIMIT_PER_MINUTE", "2")
    headers = _auth_headers(db)

    with patch.object(
        maps_proxy,
        "fetch_google_reverse_geocode",
        side_effect=lambda lat, lon, _k: {
            "formatted_address": "Bengaluru",
            "locality": "Bengaluru",
            "city": "Bengaluru",
            "state": "Karnataka",
            "postal_code": "560001",
            "latitude": lat,
            "longitude": lon,
            "address_components": [],
        },
    ):
        assert client.post("/api/maps/reverse-geocode", headers=headers, json={"latitude": 12.91, "longitude": 77.51}).status_code == 200
        assert client.post("/api/maps/reverse-geocode", headers=headers, json={"latitude": 12.92, "longitude": 77.52}).status_code == 200
        limited = client.post("/api/maps/reverse-geocode", headers=headers, json={"latitude": 12.93, "longitude": 77.53})
        assert limited.status_code == 429
