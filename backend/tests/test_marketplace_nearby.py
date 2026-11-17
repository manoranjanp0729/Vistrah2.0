"""Public hybrid spatial discovery & cached place-photo proxy tests."""
import io
import json
import math
import uuid

from sqlalchemy import select

from app import maps_proxy_routes
from app.business_catalogue import apply_business_catalogue
from app.location_routes import EARTH_KM
from app.models import Category, Provider, ProviderService, Service
from app.provider_models import ProviderApplication, ProviderDocument
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
    photo_url: str = "",
    website: str = "",
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
    if photo_url:
        common["photo_url"] = photo_url
    if website:
        common["website"] = website

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
    return provider, app


def test_public_marketplace_nearby_vistrah_photo_phone_and_skips_google_when_five_exist(
    client, seeded, db, monkeypatch
):
    maps_proxy_routes.clear_maps_proxy_state()
    monkeypatch.delenv("GOOGLE_MAPS_SERVER_API_KEY", raising=False)

    apply_business_catalogue(seeded)
    seeded.commit()

    owner_headers = seller(client, "nearby-owner@example.com")
    owner_id = client.get("/me", headers=owner_headers).json()["id"]

    cat = db.scalar(select(Category).where(Category.slug == "food-and-dining"))
    svc_rest = db.scalar(select(Service).where(Service.category_id == cat.id, Service.slug == "restaurants"))
    svc_other = db.scalar(select(Service).where(Service.category_id == cat.id, Service.slug != "restaurants").limit(1))

    base_lat, base_lng = 13.7091, 75.8132  # Tarikere

    near_biz, near_app = _make_approved_business(
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
    # Private KYC registration_document must NEVER be exposed as photo_url
    kyc_doc_id = str(uuid.uuid4())
    db.add(
        ProviderDocument(
            id=kyc_doc_id,
            application_id=near_app.id,
            service_id=svc_rest.id,
            field_id="registration_document",
            filename="licence.jpg",
            media_type="image/jpeg",
            sha256="0" * 64,
            content=b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xd9",
        )
    )
    db.commit()

    mid_biz, _ = _make_approved_business(
        db,
        owner_id=owner_id,
        service_id=svc_rest.id,
        category_id=cat.id,
        company="Malnad Spice Mess",
        lat=base_lat + math.degrees(12.4 / EARTH_KM),
        lng=base_lng,
        phone="+919845033333",
        whatsapp="",
        photo_url="/images/marketplace/food.jpg",
        website="www.malnadspice.in",
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
    body5 = r5.json()
    assert body5["total"] == 1
    first = body5["items"][0]
    assert first["source"] == "vistrah"
    assert first["id"] == near_biz.id
    assert first["phone"] == "+919845011111"
    assert first["whatsapp"] == "+919845022222"
    assert first["photo_url"] is None  # KYC registration_document remained strictly private!
    assert first["website_url"] is None
    assert client.get(f"/api/marketplace/provider-photo/{kyc_doc_id}").status_code == 404

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
    assert body25["items"][1]["photo_url"] == "/images/marketplace/food.jpg"
    assert body25["items"][1]["website_url"] == "https://www.malnadspice.in"

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


def test_hybrid_google_places_phone_photo_fieldmask_and_60_min_cache(
    client, seeded, db, monkeypatch
):
    maps_proxy_routes.clear_maps_proxy_state()
    assert maps_proxy_routes.PLACES_SEARCH_TTL_SECONDS == 3600.0
    monkeypatch.setenv("GOOGLE_MAPS_SERVER_API_KEY", "test-server-maps-key")

    apply_business_catalogue(seeded)
    seeded.commit()

    owner_headers = seller(client, "hybrid-owner@example.com")
    owner_id = client.get("/me", headers=owner_headers).json()["id"]
    cat = db.scalar(select(Category).where(Category.slug == "home-and-everyday-services"))
    svc = db.scalar(select(Service).where(Service.category_id == cat.id).order_by(Service.id).limit(1))

    base_lat, base_lng = 12.9716, 77.5946
    vistrah_biz, _ = _make_approved_business(
        db,
        owner_id=owner_id,
        service_id=svc.id,
        category_id=cat.id,
        company="Namma Spark Services",
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
                        {
                            "id": "ChIJ_place_near_08",
                            "displayName": {"text": "Cubbon Quick Services"},
                            "formattedAddress": "Cubbonpet, Bengaluru, Karnataka 560002",
                            "location": {
                                "latitude": base_lat + math.degrees(0.8 / EARTH_KM),
                                "longitude": base_lng,
                            },
                            "types": ["point_of_interest"],
                            "googleMapsUri": "https://maps.google.com/?cid=3",
                            "nationalPhoneNumber": "080 2221 9988",
                            "websiteUri": "https://cubbonservices.in",
                            "photos": [
                                {"name": "places/ChIJ_place_near_08/photos/AUc7tX_photo_abc123"}
                            ],
                        },
                        {
                            "id": "ChIJ_place_nophone_35",
                            "displayName": {"text": "Indiranagar Hub"},
                            "formattedAddress": "Indiranagar, Bengaluru, Karnataka 560038",
                            "location": {
                                "latitude": base_lat + math.degrees(3.5 / EARTH_KM),
                                "longitude": base_lng,
                            },
                            "types": ["point_of_interest"],
                            "googleMapsUri": "https://maps.google.com/?cid=4",
                        },
                    ]
                }
            )

    monkeypatch.setattr(maps_proxy_routes, "build_opener", lambda *a, **kw: _FakeOpener())

    resp1 = client.get(
        "/marketplace/nearby",
        params={
            "category": "home-and-everyday-services",
            "business_type": svc.slug,
            "lat": base_lat,
            "lng": base_lng,
            "radius_km": 10,
        },
    )
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert len(captured_requests) == 1

    sent = captured_requests[0]
    assert sent["url"] == "https://places.googleapis.com/v1/places:searchText"
    assert sent["body"]["maxResultCount"] == 10
    assert (
        sent["headers"]["x-goog-fieldmask"]
        == "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.googleMapsUri,places.nationalPhoneNumber,places.photos,places.websiteUri"
    )

    assert data1["has_google_places"] is True
    assert data1["total"] == 3
    assert data1["items"][0]["id"] == vistrah_biz.id
    gp1 = data1["items"][1]
    assert gp1["source"] == "google_places"
    assert gp1["phone"] == "08022219988"
    assert gp1["website_url"] == "https://cubbonservices.in"
    assert (
        gp1["photo_url"]
        == "/api/marketplace/place-photo?ref=places%2FChIJ_place_near_08%2Fphotos%2FAUc7tX_photo_abc123"
    )
    gp2 = data1["items"][2]
    assert gp2["phone"] == ""
    assert gp2["photo_url"] is None
    assert gp2["website_url"] is None

    # Second lookup in same 0.01° rounded grid hits 60-minute cache
    resp2 = client.get(
        "/marketplace/nearby",
        params={
            "category": "home-and-everyday-services",
            "business_type": svc.slug,
            "lat": base_lat + 0.002,
            "lng": base_lng - 0.002,
            "radius_km": 10,
        },
    )
    assert resp2.status_code == 200
    assert len(captured_requests) == 1
    maps_proxy_routes.clear_maps_proxy_state()


def test_place_photo_proxy_validation_and_24h_caching(client, monkeypatch):
    maps_proxy_routes.clear_maps_proxy_state()
    monkeypatch.setenv("GOOGLE_MAPS_SERVER_API_KEY", "secret-server-photo-key")

    # 1. Invalid `ref` patterns fail closed with 422
    for bad_ref in [
        "invalid-ref",
        "places/only-one-segment",
        "places/ChIJ123/photos/abc/extra",
        "places/../photos/abc12345",
        "places/ChIJ123/photos/abc?key=leak",
    ]:
        r_bad = client.get("/api/marketplace/place-photo", params={"ref": bad_ref})
        assert r_bad.status_code == 422, bad_ref

    # 2. Valid `ref` fetches binary JPEG (`maxWidthPx=480`), never leaks key, caches 24h on disk + memory
    fake_jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xd9"
    photo_calls: list[dict] = []

    class _PhotoResp:
        def read(self, n: int = -1) -> bytes:
            return fake_jpeg

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    class _PhotoOpener:
        def open(self, req, timeout=8):
            photo_calls.append(
                {
                    "url": req.full_url,
                    "headers": {k.lower(): v for k, v in req.header_items()},
                }
            )
            return _PhotoResp()

    monkeypatch.setattr(maps_proxy_routes, "build_opener", lambda *a, **kw: _PhotoOpener())

    valid_ref = "places/ChIJ_test_shop_99/photos/AUc7tX_shop_banner_001"
    r_ok = client.get("/api/marketplace/place-photo", params={"ref": valid_ref})
    assert r_ok.status_code == 200
    assert r_ok.content == fake_jpeg
    assert r_ok.headers["content-type"] == "image/jpeg"
    assert r_ok.headers["cache-control"] == "public, max-age=86400"
    assert r_ok.headers["x-content-type-options"] == "nosniff"
    assert "secret-server-photo-key" not in str(r_ok.headers)
    assert len(photo_calls) == 1
    assert (
        photo_calls[0]["url"]
        == f"https://places.googleapis.com/v1/{valid_ref}/media?maxWidthPx=480"
    )
    assert photo_calls[0]["headers"]["x-goog-api-key"] == "secret-server-photo-key"

    # Memory cache hit -> 0 upstream calls
    r_mem = client.get("/marketplace/place-photo", params={"ref": valid_ref})
    assert r_mem.status_code == 200
    assert r_mem.content == fake_jpeg
    assert len(photo_calls) == 1

    # Clear memory cache only -> disk cache hit still serves in 0 upstream calls
    with maps_proxy_routes._cache_lock:
        maps_proxy_routes._photo_mem_cache.clear()
    r_disk = client.get("/api/marketplace/place-photo", params={"ref": valid_ref})
    assert r_disk.status_code == 200
    assert r_disk.content == fake_jpeg
    assert len(photo_calls) == 1

    maps_proxy_routes.clear_maps_proxy_state()
