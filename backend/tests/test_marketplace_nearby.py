"""Public hybrid spatial discovery tests for `/marketplace/nearby` (VISTRAH + Google Places Pro cache)."""
import io
import json
import math
import uuid

from sqlalchemy import select

from app import maps_proxy_routes
from app.business_catalogue import apply_business_catalogue
from app.location_routes import EARTH_KM
from app.models import Category, Provider, ProviderService, Service
from app.provider_models import ProviderApplication
from test_seller_ownership import seller


def _make_approved_business(
    db,
    *,
    owner_id: int,
    service_id: int,
    category_id: int,
    company: str,
    lat: float,
    lng: float,
    phone: str = "+919876543210",
    whatsapp: str = "",
    timings: str = "9:00 AM - 8:00 PM",
    description: str = "Verified hyperlocal service",
    active: bool = True,
    verification_status: str = "VERIFIED",
    approval_status: str = "APPROVED",
):
    app_id = str(uuid.uuid4())
    common = {
        "legal_name": company,
        "contact_name": "Owner",
        "phone": phone,
        "email": f"{app_id[:8]}@example.com",
        "address": "MG Road, Tarikere",
        "location": "Tarikere",
        "latitude": lat,
        "longitude": lng,
        "coverage_radius_km": 15.0,
        "accuracy": True,
        "consent": True,
    }
    if whatsapp:
        common["whatsapp"] = whatsapp
    if timings:
        common["timings"] = timings

    app = ProviderApplication(
        id=app_id,
        user_id=owner_id,
        category_id=category_id,
        common=common,
        common_configuration={},
        status="APPROVED",
        revision=2,
    )
    db.add(app)
    db.flush()

    provider = Provider(
        owner_user_id=owner_id,
        slug="biz-" + str(uuid.uuid4())[:12],
        name="Owner",
        company=company,
        email=f"{app_id[:8]}@example.com",
        phone=phone,
        address="MG Road, Tarikere",
        location="Tarikere",
        latitude=lat,
        longitude=lng,
        provenance="test",
        verification_status=verification_status,
        active=active,
    )
    db.add(provider)
    db.flush()
    app.provider_id = provider.id

    db.add(
        ProviderService(
            provider_id=provider.id,
            service_id=service_id,
            description=description,
            coverage_radius_km=15.0,
            approval_status=approval_status,
            application_id=app_id,
        )
    )
    db.commit()
    return provider


def test_public_marketplace_nearby_sorts_by_distance_and_skips_google_when_five_vistrah_exist(
    client, seeded, db, monkeypatch
):
    maps_proxy_routes.clear_maps_proxy_state()
    monkeypatch.delenv("GOOGLE_MAPS_SERVER_API_KEY", raising=False)

    apply_business_catalogue(seeded)
    seeded.commit()

    owner_headers = seller(client, "nearby-owner@example.com")
    owner_id = client.get("/me", headers=owner_headers).json()["id"]

    cat = db.scalar(select(Category).where(Category.slug == "food-and-dining"))
    svc_rest = db.scalar(select(Service).where(Service.category_id == cat.id, Service.slug == "restaurant"))
    svc_other = db.scalar(select(Service).where(Service.category_id == cat.id, Service.slug != "restaurant").limit(1))

    base_lat, base_lng = 13.7091, 75.8132  # Tarikere

    near_biz = _make_approved_business(
        db,
        owner_id=owner_id,
        service_id=svc_rest.id,
        category_id=cat.id,
        company="Sri Krishna Darshini",
        lat=base_lat + math.degrees(1.8 / EARTH_KM),
        lng=base_lng,
        phone="+919845011111",
        whatsapp="+919845022222",
    )
    mid_biz = _make_approved_business(
        db,
        owner_id=owner_id,
        service_id=svc_rest.id,
        category_id=cat.id,
        company="Malnad Spice Mess",
        lat=base_lat + math.degrees(12.4 / EARTH_KM),
        lng=base_lng,
        phone="+919845033333",
        whatsapp="",
    )
    _make_approved_business(
        db,
        owner_id=owner_id,
        service_id=svc_other.id,
        category_id=cat.id,
        company="Sweet Corner Bakery",
        lat=base_lat + math.degrees(0.9 / EARTH_KM),
        lng=base_lng,
        phone="+919845044444",
    )
    _make_approved_business(
        db,
        owner_id=owner_id,
        service_id=svc_rest.id,
        category_id=cat.id,
        company="Pending Cafe",
        lat=base_lat + math.degrees(0.5 / EARTH_KM),
        lng=base_lng,
        approval_status="PENDING",
    )
    _make_approved_business(
        db,
        owner_id=owner_id,
        service_id=svc_rest.id,
        category_id=cat.id,
        company="Inactive Cafe",
        lat=base_lat + math.degrees(0.6 / EARTH_KM),
        lng=base_lng,
        active=False,
    )

    # 1. Within 5 km -> only near_biz (`source: "vistrah"`)
    r5 = client.get(
        "/marketplace/nearby",
        params={
            "category": "food-and-dining",
            "business_type": "restaurant",
            "lat": base_lat,
            "lng": base_lng,
            "radius_km": 5,
        },
    )
    assert r5.status_code == 200
    assert r5.headers["cache-control"] == "private, no-store"
    body5 = r5.json()
    assert body5["total"] == 1
    assert body5["has_google_places"] is False
    first = body5["items"][0]
    assert first["source"] == "vistrah"
    assert first["id"] == near_biz.id
    assert first["phone"] == "+919845011111"
    assert first["whatsapp"] == "+919845022222"
    assert first["directions_url"].startswith("https://www.google.com/maps/dir/")
    assert 1.7 <= first["distance_km"] <= 1.9

    # 2. Within 25 km -> near_biz first, then mid_biz
    r25 = client.post(
        "/marketplace/nearby",
        json={
            "category": "food-and-dining",
            "business_type": "restaurant",
            "lat": base_lat,
            "lng": base_lng,
            "radius_km": 25,
        },
    )
    assert r25.status_code == 200
    body25 = r25.json()
    assert [row["id"] for row in body25["items"]] == [near_biz.id, mid_biz.id]
    assert body25["items"][1]["whatsapp"] == "+919845033333"

    # 3. Add 3 more restaurants so 5 local VISTRAH providers exist -> Google Places is NOT called
    for idx in range(3):
        _make_approved_business(
            db,
            owner_id=owner_id,
            service_id=svc_rest.id,
            category_id=cat.id,
            company=f"Local Hotel {idx + 3}",
            lat=base_lat + math.degrees((2.5 + idx) / EARTH_KM),
            lng=base_lng,
        )

    monkeypatch.setenv("GOOGLE_MAPS_SERVER_API_KEY", "fake-server-key")
    upstream_calls = []
    monkeypatch.setattr(
        maps_proxy_routes,
        "fetch_google_places_text_search",
        lambda *a, **kw: upstream_calls.append(1) or [],
    )
    r_full = client.get(
        "/marketplace/nearby",
        params={
            "category": "food-and-dining",
            "business_type": "restaurant",
            "lat": base_lat,
            "lng": base_lng,
            "radius_km": 25,
        },
    )
    assert r_full.status_code == 200
    assert r_full.json()["total"] == 5
    assert upstream_calls == []


def test_hybrid_google_places_fallback_pro_field_mask_and_30_minute_cache(
    client, seeded, db, monkeypatch
):
    maps_proxy_routes.clear_maps_proxy_state()
    monkeypatch.setenv("GOOGLE_MAPS_SERVER_API_KEY", "test-server-maps-key")

    apply_business_catalogue(seeded)
    seeded.commit()

    owner_headers = seller(client, "hybrid-owner@example.com")
    owner_id = client.get("/me", headers=owner_headers).json()["id"]
    cat = db.scalar(select(Category).where(Category.slug == "home-services"))
    svc_elec = db.scalar(select(Service).where(Service.category_id == cat.id).order_by(Service.id).limit(1))

    base_lat, base_lng = 12.9716, 77.5946
    vistrah_biz = _make_approved_business(
        db,
        owner_id=owner_id,
        service_id=svc_elec.id,
        category_id=cat.id,
        company="Namma Spark Electricals",
        lat=base_lat + math.degrees(1.2 / EARTH_KM),
        lng=base_lng,
        phone="+919900112233",
    )

    captured_requests: list[dict] = []

    class _FakeResp:
        def __init__(self, payload: dict):
            self._buf = io.BytesIO(json.dumps(payload).encode("utf-8"))

        def read(self, n: int = -1) -> bytes:
            return self._buf.read(n)

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    class _FakeOpener:
        def open(self, req, timeout=6):
            headers_lower = {k.lower(): v for k, v in req.header_items()}
            captured_requests.append(
                {
                    "url": req.full_url,
                    "headers": headers_lower,
                    "body": json.loads(req.data.decode("utf-8")),
                }
            )
            return _FakeResp(
                {
                    "places": [
                        # Duplicate of the local VISTRAH provider within 100m -> should be deduplicated
                        {
                            "id": "ChIJ_dup_vistrah_1",
                            "displayName": {"text": "Namma Spark Electricals"},
                            "formattedAddress": "MG Road, Bengaluru, Karnataka",
                            "location": {
                                "latitude": base_lat + math.degrees(1.22 / EARTH_KM),
                                "longitude": base_lng,
                            },
                            "types": ["electrician"],
                            "googleMapsUri": "https://maps.google.com/?cid=1",
                        },
                        # Farther valid Google Place (4.5 km)
                        {
                            "id": "ChIJ_place_far_45",
                            "displayName": {"text": "Cauvery Power Works"},
                            "formattedAddress": "Indiranagar, Bengaluru, Karnataka 560038",
                            "location": {
                                "latitude": base_lat + math.degrees(4.5 / EARTH_KM),
                                "longitude": base_lng,
                            },
                            "types": ["electrician", "point_of_interest"],
                            "googleMapsUri": "https://maps.google.com/?cid=2",
                        },
                        # Closer valid Google Place (0.8 km)
                        {
                            "id": "ChIJ_place_near_08",
                            "displayName": {"text": " Cubbon Quick Electric "},
                            "formattedAddress": "Cubbonpet, Bengaluru, Karnataka 560002",
                            "location": {
                                "latitude": base_lat + math.degrees(0.8 / EARTH_KM),
                                "longitude": base_lng,
                            },
                            "types": ["electrician"],
                            "googleMapsUri": "https://maps.google.com/?cid=3",
                        },
                        # Outside requested 10 km radius (16 km) -> must be filtered out
                        {
                            "id": "ChIJ_place_outside_16",
                            "displayName": {"text": "Outskirts Electricals"},
                            "formattedAddress": "Yelahanka, Bengaluru, Karnataka",
                            "location": {
                                "latitude": base_lat + math.degrees(16.0 / EARTH_KM),
                                "longitude": base_lng,
                            },
                            "types": ["electrician"],
                            "googleMapsUri": "https://maps.google.com/?cid=4",
                        },
                    ]
                }
            )

    monkeypatch.setattr(maps_proxy_routes, "build_opener", lambda *a, **kw: _FakeOpener())

    resp1 = client.get(
        "/marketplace/nearby",
        params={
            "category": "home-services",
            "business_type": svc_elec.slug,
            "lat": base_lat,
            "lng": base_lng,
            "radius_km": 10,
        },
    )
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert len(captured_requests) == 1

    # Verify strict Pro-tier FieldMask (never reviews, photos, or ratings)
    sent = captured_requests[0]
    assert sent["url"] == "https://places.googleapis.com/v1/places:searchText"
    assert (
        sent["headers"]["x-goog-fieldmask"]
        == "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.googleMapsUri"
    )
    for forbidden in ("reviews", "photos", "rating"):
        assert forbidden not in sent["headers"]["x-goog-fieldmask"]

    # Verify VISTRAH item comes first, followed by distance-sorted in-radius Google Places
    assert data1["has_google_places"] is True
    assert data1["total"] == 3
    assert [item["source"] for item in data1["items"]] == [
        "vistrah",
        "google_places",
        "google_places",
    ]
    assert data1["items"][0]["id"] == vistrah_biz.id
    assert data1["items"][1]["id"] == "gp_ChIJ_place_near_08"
    assert data1["items"][1]["name"] == "Cubbon Quick Electric"
    assert "destination_place_id=ChIJ_place_near_08" in data1["items"][1]["directions_url"]
    assert data1["items"][2]["id"] == "gp_ChIJ_place_far_45"
    assert data1["items"][1]["distance_km"] < data1["items"][2]["distance_km"]

    # Repeat query within the same 0.01° rounded cache cell hits the 30-min in-memory cache (0 new upstream calls)
    resp2 = client.get(
        "/marketplace/nearby",
        params={
            "category": "home-services",
            "business_type": svc_elec.slug,
            "lat": base_lat + 0.001,
            "lng": base_lng - 0.001,
            "radius_km": 10,
        },
    )
    assert resp2.status_code == 200
    assert resp2.json()["total"] == 3
    assert len(captured_requests) == 1

    maps_proxy_routes.clear_maps_proxy_state()


def test_marketplace_nearby_validation_and_legacy_slugs(client, seeded, monkeypatch):
    maps_proxy_routes.clear_maps_proxy_state()
    monkeypatch.delenv("GOOGLE_MAPS_SERVER_API_KEY", raising=False)
    apply_business_catalogue(seeded)
    seeded.commit()

    legacy_resp = client.get(
        "/marketplace/nearby",
        params={"category": "pet-care", "type": "grooming", "lat": 12.9716, "lng": 77.5946, "radius_km": 10},
    )
    assert legacy_resp.status_code == 200
    assert legacy_resp.json()["category"]["slug"] == "home-services"
    assert legacy_resp.json()["business_type"]["slug"] == "pet-care"

    bad_coord = client.get(
        "/marketplace/nearby",
        params={"category": "food-and-dining", "business_type": "restaurant", "lat": 95.123456, "lng": 77.5946, "radius_km": 10},
    )
    assert bad_coord.status_code == 422
    assert "95.123456" not in bad_coord.text

    bad_slug = client.get(
        "/marketplace/nearby",
        params={"category": "food-and-dining", "business_type": "not-a-real-type", "lat": 12.97, "lng": 77.59, "radius_km": 10},
    )
    assert bad_slug.status_code == 422
