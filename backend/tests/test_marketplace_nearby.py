"""Public spatial discovery tests for `/marketplace/nearby`."""
import math
import uuid

from sqlalchemy import select

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


def test_public_marketplace_nearby_sorts_by_distance_and_returns_contact_fields(client, seeded, db):
    apply_business_catalogue(seeded)
    seeded.commit()

    owner_headers = seller(client, "nearby-owner@example.com")
    owner_id = client.get("/me", headers=owner_headers).json()["id"]

    cat = db.scalar(select(Category).where(Category.slug == "food-and-dining"))
    svc_rest = db.scalar(select(Service).where(Service.category_id == cat.id, Service.slug == "restaurant"))
    svc_bakery = db.scalar(select(Service).where(Service.category_id == cat.id, Service.slug != "restaurant").limit(1))

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
        whatsapp="",  # Falls back cleanly to phone
    )
    # Different business type in same category (should not appear when filtering by restaurant)
    _make_approved_business(
        db,
        owner_id=owner_id,
        service_id=svc_bakery.id,
        category_id=cat.id,
        company="Sweet Corner Bakery",
        lat=base_lat + math.degrees(0.9 / EARTH_KM),
        lng=base_lng,
        phone="+919845044444",
    )
    # Unapproved / unverified businesses must never leak publicly
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

    # 1. Within 5 km -> only near_biz
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
    assert [row["id"] for row in body5["items"]] == [near_biz.id]
    first = body5["items"][0]
    assert first["phone"] == "+919845011111"
    assert first["whatsapp"] == "+919845022222"
    assert 1.7 <= first["distance_km"] <= 1.9
    assert first["latitude"] == near_biz.latitude
    assert first["longitude"] == near_biz.longitude

    # 2. Within 25 km -> near_biz first, then mid_biz (sorted by distance_km)
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
    assert body25["items"][0]["distance_km"] < body25["items"][1]["distance_km"]
    # Fallback whatsapp uses phone cleanly when whatsapp was omitted
    assert body25["items"][1]["whatsapp"] == "+919845033333"

    # 3. Category-only filter returns both bakery and restaurants sorted by distance
    rcat = client.get(
        "/marketplace/nearby",
        params={"category": "food-and-dining", "lat": base_lat, "lng": base_lng, "radius_km": 50},
    )
    assert rcat.status_code == 200
    assert rcat.json()["total"] == 3


def test_marketplace_nearby_validation_and_legacy_slugs(client, seeded):
    apply_business_catalogue(seeded)
    seeded.commit()

    # Legacy v1 category/subcategory resolves cleanly
    legacy_resp = client.get(
        "/marketplace/nearby",
        params={"category": "pet-care", "type": "grooming", "lat": 12.9716, "lng": 77.5946, "radius_km": 10},
    )
    assert legacy_resp.status_code == 200
    assert legacy_resp.json()["category"]["slug"] == "home-services"
    assert legacy_resp.json()["business_type"]["slug"] == "pet-care"

    # Invalid coordinates / radius / unknown type fail closed with 422 and never echo private input
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
