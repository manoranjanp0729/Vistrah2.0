"""Tests for Step 2: 7-Pillar Audit Engine, Google Place Claim Linking, Role Enforcement & Lead/Website APIs."""
from __future__ import annotations

import uuid

from sqlalchemy import inspect, select

from app import maps_proxy_routes
from app.business_catalogue import apply_business_catalogue
from app.marketing_audit_models import MarketingAuditLead, WebsiteRequest
from app.marketing_audit_routes import (
    AUDIT_PILLARS,
    FLAGSHIP_SECTORS,
    calculate_business_audit_score,
    simulate_ticked_plan,
)
from app.models import Provider, User
from app.security import issue_token, passwords
from app.v_ads_models import VAdsAdvertiser, VAdsVideo


def _make_user_headers(db, email: str, *, role: str = "CUSTOMER", seller_enabled: bool = False):
    user = User(
        name=email.split("@")[0].title(),
        email=email,
        role=role,
        seller_enabled=seller_enabled,
        password_hash=passwords.hash("SecurePass!12345"),
    )
    db.add(user)
    db.commit()
    return user, {"Authorization": f"Bearer {issue_token(db, user)}"}


def test_seven_pillar_catalog_ten_sector_blueprints_and_deterministic_scoring():
    # 1. Verify exact 7-pillar = 7-product matrix totaling 100 points
    assert len(AUDIT_PILLARS) == 7
    assert sum(p["max_points"] for p in AUDIT_PILLARS) == 100
    expected_pillars = [
        ("vistrah_presence", 20, 0, "free_forever", "₹0 — Free Forever"),
        ("dedicated_website", 20, 4999, "one_time", "₹4,999 One-Time"),
        ("hyperlocal_v_ads", 15, 0, "free_forever", "₹0 — Free Forever"),
        ("social_media_reach", 15, 4999, "monthly", "₹4,999 / month"),
        ("paid_ad_campaigns", 10, 3999, "monthly", "₹3,999 / month"),
        ("visual_brand_media", 10, 2999, "one_time", "₹2,999 One-Time"),
        ("google_local_seo", 10, 2499, "one_time", "₹2,499 One-Time"),
    ]
    assert [
        (p["id"], p["max_points"], p["unit_price_inr"], p["billing_type"], p["billing_label"])
        for p in AUDIT_PILLARS
    ] == expected_pillars

    # 2. Verify all 10 Flagship Sector Website Pattern Blueprints & Growth Strategies
    assert len(FLAGSHIP_SECTORS) == 10
    expected_patterns = [
        ("real-estate-and-property", "Property Photos, Plot Details & Site Visit Website"),
        ("interior-design-and-exteriors", "Room Photo Gallery & Home Budget Estimate Website"),
        ("civil-construction-and-contractors", "Completed Buildings & Construction Rate Website"),
        ("healthconnect-and-clinics", "Doctor Profile, Timings & Appointment Website"),
        ("hospitality-restaurants-and-cafes", "Photo Menu, Table Booking & Direct Order Website"),
        ("salons-bridal-and-wellness", "Makeover Photos, Price List & Slot Booking Website"),
        ("events-weddings-and-media", "Event Highlight Videos, Packages & Date Check Website"),
        ("automobiles-and-garages", "Vehicle Service Rates, Detailing & Pickup Booking Website"),
        ("legal-tax-and-business-compliance", "Tax, Legal Services & Consultation Booking Website"),
        ("overseas-education-and-skill-academies", "Courses, Student Results & Free Counseling Website"),
    ]
    assert [
        (s["slug"], s["website_pattern"]["pattern_title"]) for s in FLAGSHIP_SECTORS
    ] == expected_patterns
    for sector in FLAGSHIP_SECTORS:
        assert len(sector["website_pattern"]["key_sections"]) >= 3
        assert sector["website_pattern"]["conversion_cta"]
        assert len(sector["vertical_strategy"]["funnel_steps"]) >= 3
        assert len(sector["vertical_strategy"]["recommended_pillar_ids"]) >= 4

    # 3. Verify baseline scoring & gap detection for an unclaimed Google Place with photo + local SEO only
    audit = calculate_business_audit_score(
        {
            "is_vistrah_claimed": False,
            "website_url": None,
            "has_active_v_ad": False,
            "has_social_presence": False,
            "has_paid_campaigns": False,
            "photo_url": "/api/marketplace/place-photo?ref=places%2FChIJ1%2Fphotos%2F1",
            "google_place_id": "ChIJ_demo_1",
            "phone": "08022219988",
            "has_coordinates": True,
        }
    )
    assert audit["baseline_score"] == 20  # visual_brand_media (10) + google_local_seo (10)
    assert set(audit["gap_codes"]) == {
        "unclaimed_vistrah",
        "missing_website",
        "no_v_ad",
        "missing_social_media",
        "no_paid_campaigns",
    }

    # 4. Simulate ticking free + one-time + monthly + an already-active pillar (never double-counted!)
    sim = simulate_ticked_plan(
        audit,
        [
            "vistrah_presence",    # +20 pts, ₹0 free_forever
            "hyperlocal_v_ads",    # +15 pts, ₹0 free_forever
            "dedicated_website",   # +20 pts, ₹4,999 one_time
            "social_media_reach",  # +15 pts, ₹4,999 monthly
            "paid_ad_campaigns",   # +10 pts, ₹3,999 monthly
            "google_local_seo",    # ALREADY active in baseline -> +0 pts, ₹0!
        ],
        gst_included=True,
    )
    assert sim["baseline_score"] == 20
    assert sim["projected_score"] == 100
    assert sim["free_items_count"] == 2
    assert sim["one_time_total_inr"] == 4999
    assert sim["monthly_total_inr"] == 8998  # 4999 + 3999
    assert sim["subtotal_before_gst_inr"] == 13997
    assert sim["gst_amount_inr"] == round(13997 * 0.18)  # 2519
    assert sim["grand_total_with_gst_inr"] == 13997 + 2519

    # Unticking GST sets gst_amount_inr to 0
    sim_no_gst = simulate_ticked_plan(
        audit,
        ["dedicated_website"],
        gst_included=False,
    )
    assert sim_no_gst["projected_score"] == 40
    assert sim_no_gst["one_time_total_inr"] == 4999
    assert sim_no_gst["monthly_total_inr"] == 0
    assert sim_no_gst["gst_amount_inr"] == 0


def test_migration_029_columns_and_tables_present(db):
    insp = inspect(db.get_bind())
    tables = set(insp.get_table_names())
    assert "marketing_audit_leads" in tables
    assert "website_requests" in tables

    prov_cols = {col["name"] for col in insp.get_columns("providers")}
    for expected_col in (
        "google_place_id",
        "website_url",
        "instagram_url",
        "facebook_url",
        "source_place_snapshot",
    ):
        assert expected_col in prov_cols


def test_google_place_claim_onboarding_and_strict_role_gated_business_profile(
    client, seeded, db
):
    apply_business_catalogue(seeded)
    seeded.commit()

    normal_user, normal_headers = _make_user_headers(db, "public-reader@example.com")
    seller_a, seller_a_headers = _make_user_headers(db, "clinic-owner@example.com")
    seller_b, seller_b_headers = _make_user_headers(db, "other-seller@example.com", seller_enabled=True)
    admin_user_obj, admin_headers = _make_user_headers(db, "audit-admin@example.com", role="ADMIN")

    # Seller B has their own separate business
    other_provider = Provider(
        owner_user_id=seller_b.id,
        slug=f"other-{uuid.uuid4().hex[:8]}",
        name="Seller B",
        company="Other Town Garage",
        email=seller_b.email,
        phone="9845099999",
        address="BM Road, Mysuru",
        location="Mysuru",
        latitude=12.2958,
        longitude=76.6394,
        verification_status="VERIFIED",
        active=True,
        provenance="Fixture",
    )
    db.add(other_provider)
    db.commit()

    # 1. Before claiming: Seller A and Normal User both receive 403 on unclaimed Google Place
    unclaimed_place_id = "ChIJ_sri_krishna_dental_001"
    assert (
        client.get(
            f"/api/business-profile/gp_{unclaimed_place_id}",
            headers=normal_headers,
        ).status_code
        == 403
    )
    assert (
        client.get(
            f"/api/business-profile/gp_{unclaimed_place_id}",
            headers=seller_a_headers,
        ).status_code
        == 403
    )

    # Admin CAN inspect the unclaimed Google Place with query context fallback
    admin_unclaimed = client.get(
        f"/api/business-profile/gp_{unclaimed_place_id}",
        params={
            "name": "Sri Krishna Dental Studio",
            "sector": "healthconnect-and-clinics",
            "service_type": "dental-clinics",
            "city": "Indiranagar, Bengaluru",
            "phone": "08025251234",
        },
        headers=admin_headers,
    )
    assert admin_unclaimed.status_code == 200, admin_unclaimed.text
    unclaimed_body = admin_unclaimed.json()
    assert unclaimed_body["business"]["is_claimed"] is False
    assert unclaimed_body["business"]["google_place_id"] == unclaimed_place_id
    assert (
        unclaimed_body["flagship_sector"]["website_pattern"]["pattern_title"]
        == "Doctor Profile, Timings & Appointment Website"
    )
    assert "unclaimed_vistrah" in unclaimed_body["audit"]["gap_codes"]
    assert "missing_website" in unclaimed_body["audit"]["gap_codes"]

    # 2. Seller A joins VISTRAH via `POST /api/seller/onboard` with `place_id` + social link
    onboard_resp = client.post(
        "/api/seller/onboard",
        headers=seller_a_headers,
        json={
            "business_types": ["dental-clinics"],
            "business_name": "Sri Krishna Dental Studio",
            "contact_name": "Dr. Kavitha Rao",
            "phone": "+91 9845012345",
            "whatsapp": "+91 9845012345",
            "address": "100 Feet Road, Indiranagar, Bengaluru 560038",
            "location": "Bengaluru",
            "pincode": "560038",
            "latitude": 12.9784,
            "longitude": 77.6408,
            "coverage_radius_km": 15,
            "place_id": unclaimed_place_id,
            "website_url": "www.srikrishnadental.in",
            "instagram_url": "instagram.com/srikrishnadental",
            "source_place_snapshot": {"rating_hint": 4.8, "locality": "Indiranagar"},
            "accept_terms": True,
        },
    )
    assert onboard_resp.status_code == 201, onboard_resp.text
    claimed_provider = onboard_resp.json()["provider"]
    assert claimed_provider is not None
    assert claimed_provider["google_place_id"] == unclaimed_place_id
    assert claimed_provider["owner_user_id"] == seller_a.id
    assert claimed_provider["website_url"] == "https://www.srikrishnadental.in"

    # Duplicate claim by Seller B on the same Google Place is rejected with 409
    dup_claim = client.post(
        "/api/seller/onboard",
        headers=seller_b_headers,
        json={
            "business_types": ["dental-clinics"],
            "business_name": "Impersonated Clinic",
            "contact_name": "Seller B",
            "phone": "+91 9845099999",
            "address": "100 Feet Road, Indiranagar, Bengaluru",
            "location": "Bengaluru",
            "place_id": unclaimed_place_id,
            "accept_terms": True,
        },
    )
    assert dup_claim.status_code == 409

    # Also give Seller A an approved V Ad to verify active V Ad pillar detection (+15 pts)
    adv = db.scalar(select(VAdsAdvertiser).where(VAdsAdvertiser.owner_id == seller_a.id))
    assert adv is not None
    db.add(
        VAdsVideo(
            id=str(uuid.uuid4()),
            advertiser_id=adv.id,
            title="Smile Makeover Tour",
            description="Clinic tour",
            video_url="https://vistrah.in/media/reel.mp4",
            status="APPROVED",
        )
    )
    db.commit()

    # 3. Seller A IMMEDIATELY unlocks their own Business Growth & Audit profile (by provider_id AND by place_id!)
    for target_id in (str(claimed_provider["id"]), unclaimed_place_id, f"gp_{unclaimed_place_id}"):
        own_profile = client.get(f"/api/business-profile/{target_id}", headers=seller_a_headers)
        assert own_profile.status_code == 200, own_profile.text
        prof_data = own_profile.json()
        assert prof_data["business"]["provider_id"] == claimed_provider["id"]
        assert prof_data["business"]["is_claimed"] is True
        # Active pillars: vistrah_presence(20) + dedicated_website(20) + hyperlocal_v_ads(15)
        # + social_media_reach(15) + google_local_seo(10) = 80 points!
        assert prof_data["audit"]["baseline_score"] == 80
        assert "competitor_benchmark" in prof_data
        assert "average_score" in prof_data["competitor_benchmark"]

    # 4. Seller A gets 403 on Seller B's business; Seller B & Normal User get 403 on Seller A's business
    assert (
        client.get(f"/api/business-profile/{other_provider.id}", headers=seller_a_headers).status_code
        == 403
    )
    assert (
        client.get(f"/api/business-profile/{claimed_provider['id']}", headers=seller_b_headers).status_code
        == 403
    )
    assert (
        client.get(f"/api/business-profile/{claimed_provider['id']}", headers=normal_headers).status_code
        == 403
    )


def test_admin_explore_lead_crm_and_website_requests_role_enforcement(
    client, seeded, db, monkeypatch
):
    maps_proxy_routes.clear_maps_proxy_state()
    apply_business_catalogue(seeded)
    seeded.commit()

    normal_user, normal_headers = _make_user_headers(db, "customer-audit@example.com")
    seller_user_obj, seller_headers = _make_user_headers(
        db, "interior-owner@example.com", seller_enabled=True
    )
    other_seller_obj, other_seller_headers = _make_user_headers(
        db, "rival-seller@example.com", seller_enabled=True
    )
    admin_obj, admin_headers = _make_user_headers(db, "crm-admin@example.com", role="ADMIN")

    owned_prov = Provider(
        owner_user_id=seller_user_obj.id,
        slug=f"interiors-{uuid.uuid4().hex[:6]}",
        name="Rohan Shetty",
        company="Malnad Modular Interiors",
        email=seller_user_obj.email,
        phone="9845077777",
        address="BH Road, Tarikere",
        location="Tarikere",
        latitude=13.7091,
        longitude=75.8132,
        verification_status="VERIFIED",
        active=True,
        provenance="Fixture",
    )
    db.add(owned_prov)
    db.commit()

    # 1. Explore & Leads endpoints strictly reject normal users and non-admin sellers with 403
    for hdrs in (normal_headers, seller_headers):
        assert client.get("/api/marketing-audit/explore", headers=hdrs).status_code == 403
        assert client.get("/api/marketing-audit/leads", headers=hdrs).status_code == 403
        assert (
            client.post(
                "/api/marketing-audit/leads",
                headers=hdrs,
                json={
                    "business_id": "gp_ChIJ_test",
                    "business_name": "Blocked",
                    "sector_slug": "real-estate-and-property",
                },
            ).status_code
            == 403
        )

    # 2. Mock Google Places prospects and verify Admin Explore filtering (`missing_website`, `unclaimed_vistrah`, `score_below_50`)
    monkeypatch.setattr(
        maps_proxy_routes,
        "fetch_google_places_text_search",
        lambda *a, **kw: [
            {
                "place_id": "ChIJ_prospect_noweb",
                "name": "Apex Timber & Interiors",
                "address": "MG Road, Tarikere, Karnataka",
                "latitude": 13.7105,
                "longitude": 75.8140,
                "phone": "08261222333",
                "photo_url": None,
                "website_url": None,
                "directions_url": "https://www.google.com/maps/dir/?api=1&destination=13.7105,75.814",
                "google_maps_uri": "https://maps.google.com/?cid=10",
                "types": ["general_contractor"],
            },
            {
                "place_id": "ChIJ_prospect_hasweb",
                "name": "Elite Decor Studio",
                "address": "IG Road, Chikkamagaluru, Karnataka",
                "latitude": 13.3161,
                "longitude": 75.7720,
                "phone": "08262222444",
                "photo_url": "/api/marketplace/place-photo?ref=places%2FChIJ2%2Fphotos%2F1",
                "website_url": "https://elitedecor.in",
                "directions_url": "https://www.google.com/maps/dir/?api=1&destination=13.3161,75.772",
                "google_maps_uri": "https://maps.google.com/?cid=11",
                "types": ["interior_designer"],
            },
        ],
    )
    monkeypatch.setenv("GOOGLE_MAPS_SERVER_API_KEY", "test-audit-maps-key")

    exp_res = client.get(
        "/api/marketing-audit/explore",
        params={
            "sector": "interior-design-and-exteriors",
            "city": "Tarikere",
            "source": "google",
            "missing": "missing_website,unclaimed_vistrah,score_below_50",
        },
        headers=admin_headers,
    )
    assert exp_res.status_code == 200, exp_res.text
    exp_items = exp_res.json()["items"]
    assert len(exp_items) == 1
    assert exp_items[0]["google_place_id"] == "ChIJ_prospect_noweb"
    assert exp_items[0]["baseline_score"] == 10  # Only google_local_seo active!

    # 3. Admin saves Audit Lead & updates status via PATCH
    lead_created = client.post(
        "/api/marketing-audit/leads",
        headers=admin_headers,
        json={
            "business_id": "gp_ChIJ_prospect_noweb",
            "google_place_id": "ChIJ_prospect_noweb",
            "business_name": "Apex Timber & Interiors",
            "sector_slug": "interior-design-and-exteriors",
            "service_type": "full-home-interior-designers",
            "city": "Tarikere",
            "phone": "08261222333",
            "ticked_pillar_ids": ["vistrah_presence", "dedicated_website", "social_media_reach"],
            "gst_included": True,
            "lead_status": "audit_shared",
            "notes": "Shared room cost estimator demo on WhatsApp.",
        },
    )
    assert lead_created.status_code == 201, lead_created.text
    lead_body = lead_created.json()
    assert lead_body["baseline_score"] == 10
    assert lead_body["projected_score"] == 65  # 10 + 20 + 20 + 15
    assert lead_body["one_time_total_inr"] == 4999
    assert lead_body["monthly_total_inr"] == 4999
    assert lead_body["gst_amount_inr"] == round(9998 * 0.18)

    lead_id = lead_body["id"]
    patched = client.patch(
        f"/api/marketing-audit/leads/{lead_id}",
        headers=admin_headers,
        json={"lead_status": "follow_up", "notes": "Owner requested callback Friday."},
    )
    assert patched.status_code == 200
    assert patched.json()["lead_status"] == "follow_up"

    listed = client.get(
        "/api/marketing-audit/leads",
        params={"lead_status": "follow_up"},
        headers=admin_headers,
    )
    assert listed.status_code == 200
    assert listed.json()["total"] == 1

    # 4. Website Request authorization & CRM lead status sync
    # Joined seller CAN request a website for their own business
    own_web_req = client.post(
        "/api/website-requests",
        headers=seller_headers,
        json={
            "business_id": str(owned_prov.id),
            "business_name": owned_prov.company,
            "sector_slug": "interior-design-and-exteriors",
            "city": "Tarikere",
            "notes": "Need Visual Lookbook & 2BHK/3BHK Estimator.",
        },
    )
    assert own_web_req.status_code == 201, own_web_req.text
    assert (
        own_web_req.json()["request"]["pattern_id"] == "visual-lookbook-room-estimator"
    )

    # Rival seller CANNOT request a website against Seller's claimed business
    assert (
        client.post(
            "/api/website-requests",
            headers=other_seller_headers,
            json={
                "business_id": str(owned_prov.id),
                "business_name": owned_prov.company,
                "sector_slug": "interior-design-and-exteriors",
            },
        ).status_code
        == 403
    )

    # Admin requesting a website for the prospect lead transitions `lead_status` -> `website_requested`
    admin_web_req = client.post(
        "/api/website-requests",
        headers=admin_headers,
        json={
            "business_id": "gp_ChIJ_prospect_noweb",
            "business_name": "Apex Timber & Interiors",
            "sector_slug": "interior-design-and-exteriors",
            "phone": "08261222333",
            "city": "Tarikere",
        },
    )
    assert admin_web_req.status_code == 201
    updated_lead = db.get(MarketingAuditLead, lead_id)
    assert updated_lead.lead_status == "website_requested"
    assert db.scalar(select(WebsiteRequest).where(WebsiteRequest.id == admin_web_req.json()["request"]["id"])) is not None

    maps_proxy_routes.clear_maps_proxy_state()
