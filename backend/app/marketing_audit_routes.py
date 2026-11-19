"""Role-gated Business Growth & Audit engine, 7-Pillar = 7-Product scoring, Admin Lead Explorer, and Website Requests."""
from __future__ import annotations

import math
import re
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from .business_catalogue import business_types, find_business_type
from .database import get_db
from .maps_proxy_routes import search_google_places_nearby_cached
from .marketing_audit_models import (
    LEAD_STATUSES,
    MarketingAuditLead,
    WebsiteRequest,
)
from .marketplace_nearby_routes import normalize_website_url
from .marketplace_taxonomy import legacy_map
from .models import Audit, Category, Provider, ProviderService, Service, User, now
from .provider_models import ProviderApplication
from .provider_requirements import SafeModel
from .security import admin_user, current_user
from .v_ads_models import VAdsAdvertiser, VAdsVideo

router = APIRouter(tags=["Business Audit & Growth"])

GST_RATE_PERCENT = 18
TOTAL_AUDIT_POINTS = 100
EARTH_KM = 6371.0
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
BIZ_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,160}$")

AUDIT_PILLARS: tuple[dict, ...] = (
    {
        "id": "vistrah_presence",
        "product_title": "VISTRAH Verified Business Listing",
        "short_title": "VISTRAH Listing",
        "max_points": 20,
        "unit_price_inr": 0,
        "billing_type": "free_forever",
        "billing_label": "₹0 Free Forever",
        "gap_code": "unclaimed_vistrah",
        "active_summary": "Verified on VISTRAH with direct owner Call, WhatsApp & zero-commission discovery.",
        "gap_summary": "Not yet claimed as a verified VISTRAH business owner — missing direct zero-broker inquiries.",
        "deliverable_highlights": [
            "Verified owner badge across your sector & child service types",
            "Direct Call, WhatsApp & map pin with 0% lead commission",
            "Instant access to My Business Growth & Audit dashboard",
        ],
    },
    {
        "id": "dedicated_website",
        "product_title": "Vertical Custom Website Build",
        "short_title": "Custom Website",
        "max_points": 20,
        "unit_price_inr": 4999,
        "billing_type": "one_time",
        "billing_label": "₹4,999 One-Time",
        "gap_code": "missing_website",
        "active_summary": "Dedicated business website linked for high-intent customer trust & conversions.",
        "gap_summary": "No dedicated business website detected — losing high-intent searchers comparing credibility.",
        "deliverable_highlights": [
            "Mobile-first sector blueprint tailored to your exact industry",
            "WhatsApp & tap-to-call lead capture + Google Maps embed",
            "SEO-ready pages with fast SSL hosting setup",
        ],
    },
    {
        "id": "hyperlocal_v_ads",
        "product_title": "Any-Radius Hyperlocal V Ad (9:16)",
        "short_title": "Free Hyperlocal V Ad",
        "max_points": 15,
        "unit_price_inr": 0,
        "billing_type": "free_forever",
        "billing_label": "₹0 Free Forever",
        "gap_code": "no_v_ad",
        "active_summary": "Active 9:16 hyperlocal V Ad broadcasting to nearby customers on VISTRAH.",
        "gap_summary": "No active 9:16 V Ad running — missing free any-radius video discovery inside VISTRAH.",
        "deliverable_highlights": [
            "9:16 vertical video Reel placement in VISTRAH V Ads feed",
            "Target 2 km, 10 km, 25 km, 50 km+ or any radius at ₹0 forever",
            "Direct profile & call CTA right below your video ad",
        ],
    },
    {
        "id": "social_media_reach",
        "product_title": "Social Media Marketing & Reels Production",
        "short_title": "Social & Reels Studio",
        "max_points": 15,
        "unit_price_inr": 4999,
        "billing_type": "monthly",
        "billing_label": "₹4,999/month",
        "gap_code": "missing_social_media",
        "active_summary": "Active Instagram/Facebook brand presence engaging local followers.",
        "gap_summary": "Weak or unlinked Instagram/Facebook Reels presence — missing recurring local recall.",
        "deliverable_highlights": [
            "Monthly calendar of branded Reels, carousels & festival creatives",
            "Scriptwriting, editing & local hashtag optimization",
            "Consistent Instagram & Facebook page management",
        ],
    },
    {
        "id": "paid_ad_campaigns",
        "product_title": "Instagram & Facebook Paid Lead Ads",
        "short_title": "Paid Meta Lead Ads",
        "max_points": 10,
        "unit_price_inr": 3999,
        "billing_type": "monthly",
        "billing_label": "₹3,999/month",
        "gap_code": "no_paid_campaigns",
        "active_summary": "Managed paid Meta/digital lead-generation campaigns driving targeted inquiries.",
        "gap_summary": "No structured hyperlocal Meta paid lead funnel — relying only on walk-in or word-of-mouth.",
        "deliverable_highlights": [
            "Geo-fenced Instagram & Facebook lead generation campaigns",
            "Audience targeting, ad creative A/B testing & WhatsApp click-to-chat",
            "Zero markup on external Meta ad spend (paid at actuals)",
        ],
    },
    {
        "id": "visual_brand_media",
        "product_title": "Commercial Photo & Video Brand Shoot",
        "short_title": "Commercial Brand Shoot",
        "max_points": 10,
        "unit_price_inr": 2999,
        "billing_type": "one_time",
        "billing_label": "₹2,999 One-Time",
        "gap_code": "missing_visual_media",
        "active_summary": "Verified storefront/work showcase photography published on listing.",
        "gap_summary": "Missing crisp storefront, team, or portfolio visuals — reducing first-impression trust.",
        "deliverable_highlights": [
            "High-conversion storefront, product/service & founder showcase visuals",
            "Edited 9:16 commercial Reel cut ready for V Ads & Instagram",
            "Web-optimized gallery assets for listing, GBP & website",
        ],
    },
    {
        "id": "google_local_seo",
        "product_title": "Google Business Profile & Local SEO Boost",
        "short_title": "Google Local SEO",
        "max_points": 10,
        "unit_price_inr": 2499,
        "billing_type": "one_time",
        "billing_label": "₹2,499 One-Time",
        "gap_code": "weak_local_seo",
        "active_summary": "Complete local map coordinates, contact phone & searchable address indexing.",
        "gap_summary": "Incomplete local map SEO signals (missing verified phone, pin accuracy, or keyword optimization).",
        "deliverable_highlights": [
            "Google Business Profile category, service & keyword optimization",
            "NAP (Name, Address, Phone) & map pin accuracy alignment",
            "Review response playbook & local citation cleanup",
        ],
    },
)

AUDIT_PILLAR_BY_ID: dict[str, dict] = {p["id"]: p for p in AUDIT_PILLARS}

FLAGSHIP_SECTORS: tuple[dict, ...] = (
    {
        "order": 1,
        "slug": "real-estate-and-property",
        "title": "Real Estate & Property",
        "shortTitle": "Real Estate",
        "defaultSubcategorySlug": "residential-and-commercial-real-estate",
        "defaultTypeSlug": "apartment-sales-and-resale",
        "website_pattern": {
            "pattern_id": "project-showcase-plot-explorer",
            "pattern_title": "Project Showcase & Plot Explorer",
            "layout_archetype": "Interactive inventory grid with RERA badges, plot/unit availability, location map & site-visit scheduler",
            "hero_headline_template": "Verified Plots, Homes & Commercial Spaces by {business_name} in {city}",
            "key_sections": [
                "Featured Projects & Plot/Unit Filter (BHK, Sq.ft, Budget)",
                "RERA / Title Approvals & Amenities Highlights",
                "Interactive Neighbourhood Connectivity Map",
                "1-Click WhatsApp Brochure Download & Site Visit Booking",
            ],
            "conversion_cta": "Schedule a Free Site Visit",
        },
        "vertical_strategy": {
            "summary": "Capture serious property buyers directly without portal broker leakage using drone/walkthrough V Ads, a RERA-ready project microsite, and geo-targeted Meta lead forms.",
            "funnel_steps": [
                "Claim free VISTRAH listing + upload 9:16 plot/apartment walkthrough V Ad",
                "Launch Project Showcase & Plot Explorer website with instant brochure capture",
                "Run NRI + city-investor Meta Lead Ads directly to your sales WhatsApp",
            ],
            "recommended_pillar_ids": [
                "vistrah_presence",
                "dedicated_website",
                "hyperlocal_v_ads",
                "visual_brand_media",
                "paid_ad_campaigns",
            ],
        },
    },
    {
        "order": 2,
        "slug": "interior-design-and-exteriors",
        "title": "Interior Design & Exteriors",
        "shortTitle": "Interiors & Exteriors",
        "defaultSubcategorySlug": "interiors-and-woodwork-execution",
        "defaultTypeSlug": "full-home-interior-designers",
        "website_pattern": {
            "pattern_id": "visual-lookbook-room-estimator",
            "pattern_title": "Visual Lookbook & Room Cost Estimator",
            "layout_archetype": "Before/after room gallery with modular finish tiers, 2BHK/3BHK budget estimator & consultation booking",
            "hero_headline_template": "Bespoke Modular Interiors & Exterior Finishes by {business_name}",
            "key_sections": [
                "Room-by-Room Lookbook (Kitchen, Living, Wardrobe, Facade)",
                "Interactive 1BHK / 2BHK / 3BHK / Villa Estimate Calculator",
                "Material & Hardware Brand Partners + Warranty Promise",
                "Book Free 3D Design Consultation CTA",
            ],
            "conversion_cta": "Calculate Room Estimate",
        },
        "vertical_strategy": {
            "summary": "Win high-ticket homeowners with before/after transformation Reels, an interactive room budget estimator website, and newly-handed-over apartment targeting.",
            "funnel_steps": [
                "Publish completed handover walkthroughs as free 9:16 V Ads",
                "Convert curious homeowners via the Room Cost Estimator website",
                "Retarget local apartment corridors with Instagram transformation Reels",
            ],
            "recommended_pillar_ids": [
                "vistrah_presence",
                "dedicated_website",
                "hyperlocal_v_ads",
                "visual_brand_media",
                "social_media_reach",
            ],
        },
    },
    {
        "order": 3,
        "slug": "civil-construction-and-contractors",
        "title": "Civil Construction & Contractors",
        "shortTitle": "Civil & Contractors",
        "defaultSubcategorySlug": "building-contractors-and-turnkey",
        "defaultTypeSlug": "turnkey-home-construction-contractors",
        "website_pattern": {
            "pattern_id": "turnkey-portfolio-milestone-tracker",
            "pattern_title": "Turnkey Portfolio & Milestone Tracker",
            "layout_archetype": "Completed structure showcase with per-sq.ft package specs, BOQ transparency & site inspection booking",
            "hero_headline_template": "Trusted Civil Construction & Engineering by {business_name} in {city}",
            "key_sections": [
                "Completed Residential, Commercial & Land Projects Portfolio",
                "Transparent Per-Sq.ft Package Comparison (Standard / Premium / Turnkey)",
                "Stage-Wise Quality & Structural Engineering Checklist",
                "Request Free Plot Assessment & BOQ Quotation",
            ],
            "conversion_cta": "Request BOQ Estimate",
        },
        "vertical_strategy": {
            "summary": "Build engineering authority and win turnkey contracts by showcasing live site quality, transparent per-sq.ft specs, and strong local map visibility.",
            "funnel_steps": [
                "Verify your contractor/supplier listing + coverage radius on VISTRAH",
                "Showcase completed structures & per-sq.ft packages on your website",
                "Capture plot owners searching Google & VISTRAH within 25–50 km",
            ],
            "recommended_pillar_ids": [
                "vistrah_presence",
                "dedicated_website",
                "hyperlocal_v_ads",
                "google_local_seo",
                "visual_brand_media",
            ],
        },
    },
    {
        "order": 4,
        "slug": "healthconnect-and-clinics",
        "title": "HealthConnect & Clinics",
        "shortTitle": "HealthConnect",
        "defaultSubcategorySlug": "hospitals-and-clinics",
        "defaultTypeSlug": "multi-specialty-hospitals",
        "website_pattern": {
            "pattern_id": "patient-trust-slot-booking",
            "pattern_title": "Patient Trust & Slot Booking Portal",
            "layout_archetype": "Doctor credentials, treatment/test directory, clinic timings & instant WhatsApp/call appointment slot booking",
            "hero_headline_template": "Compassionate Specialist Care at {business_name}, {city}",
            "key_sections": [
                "Specialist Doctors, Qualifications & Registration Credentials",
                "Treatments, Preventive Health Packages & Home Sample Collection",
                "OPD Timings, Emergency Contact & Insurance / Cashless Info",
                "Instant Appointment / Home Lab Slot Booking",
            ],
            "conversion_cta": "Book Clinic Appointment",
        },
        "vertical_strategy": {
            "summary": "Establish patient trust in your 5–15 km catchment with doctor-led educational V Ads, a credentialed appointment portal, and top Google Maps clinic visibility.",
            "funnel_steps": [
                "Claim verified VISTRAH HealthConnect profile with OPD timings",
                "Launch Patient Trust & Slot Booking website for zero-aggregator bookings",
                "Share 60-second doctor health tips on V Ads & Google Business Profile",
            ],
            "recommended_pillar_ids": [
                "vistrah_presence",
                "dedicated_website",
                "google_local_seo",
                "hyperlocal_v_ads",
                "social_media_reach",
            ],
        },
    },
    {
        "order": 5,
        "slug": "hospitality-restaurants-and-cafes",
        "title": "Hospitality, Restaurants & Cafés",
        "shortTitle": "Hospitality & Dining",
        "defaultSubcategorySlug": "restaurants-and-dining",
        "defaultTypeSlug": "restaurants",
        "website_pattern": {
            "pattern_id": "visual-menu-direct-ordering",
            "pattern_title": "Visual Menu & Direct Zero-Commission Ordering",
            "layout_archetype": "Appetising signature dishes/rooms showcase with digital QR menu, table/stay booking & direct WhatsApp ordering",
            "hero_headline_template": "Signature Flavours & Warm Hospitality at {business_name}",
            "key_sections": [
                "Bestseller Dishes / Stay Suites with Crisp Photography & Pricing",
                "Zero-Commission Direct Order / Table Reservation / Room Inquiry",
                "Party Catering, Bulk Orders & Banquet Packages",
                "Live Map Directions, Opening Hours & Hygiene Promise",
            ],
            "conversion_cta": "Order Direct / Reserve Table",
        },
        "vertical_strategy": {
            "summary": "Keep 100% of your food and stay margins by pairing mouth-watering 9:16 Reels & V Ads with a direct digital menu/reservation website.",
            "funnel_steps": [
                "Upload sizzling kitchen/ambience V Ads for 5–10 km diners at ₹0",
                "Launch Visual Menu & Direct Zero-Commission Ordering website",
                "Run weekend dining, catering & staycation Reels across Instagram",
            ],
            "recommended_pillar_ids": [
                "vistrah_presence",
                "hyperlocal_v_ads",
                "dedicated_website",
                "visual_brand_media",
                "social_media_reach",
            ],
        },
    },
    {
        "order": 6,
        "slug": "salons-bridal-and-wellness",
        "title": "Salons, Bridal & Wellness",
        "shortTitle": "Salons & Bridal",
        "defaultSubcategorySlug": "salons-and-haircare",
        "defaultTypeSlug": "unisex-salons",
        "website_pattern": {
            "pattern_id": "transformation-gallery-package-booking",
            "pattern_title": "Transformation Gallery & Package Booking",
            "layout_archetype": "Editorial bridal/makeover lookbook, transparent service menu cards, combo offers & stylist appointment booking",
            "hero_headline_template": "Luxury Styling, Bridal Makeovers & Wellness at {business_name}",
            "key_sections": [
                "Bridal, Hair & Skin Transformation Lookbook",
                "Service Rate Card & Seasonal Grooming / Spa Packages",
                "Lead Stylists, Genuine Product Brands & Hygiene Standards",
                "1-Tap Stylist / Bridal Trial Slot Booking",
            ],
            "conversion_cta": "Book Appointment / Bridal Trial",
        },
        "vertical_strategy": {
            "summary": "Turn local beauty browsers into loyal repeat clients and high-value bridal bookings through makeover Reels, combo packages, and instant slot booking.",
            "funnel_steps": [
                "Broadcast bridal & hair makeover 9:16 V Ads across your city at ₹0",
                "Publish service menu & Transformation Gallery booking website",
                "Run seasonal bridal & festive glow paid Instagram Lead Ads",
            ],
            "recommended_pillar_ids": [
                "vistrah_presence",
                "hyperlocal_v_ads",
                "social_media_reach",
                "dedicated_website",
                "paid_ad_campaigns",
            ],
        },
    },
    {
        "order": 7,
        "slug": "events-weddings-and-media",
        "title": "Events, Weddings & Media",
        "shortTitle": "Events & Media",
        "defaultSubcategorySlug": "weddings",
        "defaultTypeSlug": "wedding-planners",
        "website_pattern": {
            "pattern_id": "cinematic-showreel-date-checker",
            "pattern_title": "Cinematic Showreel & Date Availability Checker",
            "layout_archetype": "Widescreen highlight reel, wedding/corporate event packages, capacity specs & muhurtham/event date availability form",
            "hero_headline_template": "Unforgettable Weddings, Events & Visual Stories by {business_name}",
            "key_sections": [
                "Cinematic Showreel & Real Wedding / Corporate Event Albums",
                "Curated Decor, Photography, Venue or Production Packages",
                "Client Testimonials & Event Execution Timeline",
                "Check Muhurtham / Event Date Availability & Get Custom Quote",
            ],
            "conversion_cta": "Check Date Availability",
        },
        "vertical_strategy": {
            "summary": "Lock in wedding and corporate event dates months in advance with emotional highlight V Ads, a cinematic portfolio site, and targeted engagement-season ads.",
            "funnel_steps": [
                "Feature your best 30-second event highlight Reel on VISTRAH V Ads",
                "Capture date-check inquiries on your Cinematic Showreel website",
                "Run wedding-season Instagram & Facebook Lead Ads across nearby districts",
            ],
            "recommended_pillar_ids": [
                "vistrah_presence",
                "visual_brand_media",
                "dedicated_website",
                "hyperlocal_v_ads",
                "paid_ad_campaigns",
            ],
        },
    },
    {
        "order": 8,
        "slug": "automobiles-and-garages",
        "title": "Automobiles & Garages",
        "shortTitle": "Automobiles",
        "defaultSubcategorySlug": "vehicle-servicing-and-repairs",
        "defaultTypeSlug": "scheduled-servicing",
        "website_pattern": {
            "pattern_id": "service-bay-detailing-configurator",
            "pattern_title": "Service Bay & Detailing Package Configurator",
            "layout_archetype": "Hatchback/Sedan/SUV/Bike service matrix, ceramic/PPF detailing showcase, pickup-drop booking & 24x7 SOS button",
            "hero_headline_template": "Expert Multi-Brand Car, Bike & EV Care at {business_name}, {city}",
            "key_sections": [
                "Periodic Service, Detailing, Tyre & AC Packages by Vehicle Type",
                "Workshop Bay Photos, Genuine OEM Parts & Diagnostic Tools",
                "24x7 Breakdown / Towing Emergency Call & Live Map Pin",
                "Book Doorstep Pickup & Service Slot",
            ],
            "conversion_cta": "Book Service Bay Slot",
        },
        "vertical_strategy": {
            "summary": "Dominate urgent breakdown searches and high-margin detailing/periodic service bookings with strong Google Local SEO, bay-tour V Ads, and clear package pricing.",
            "funnel_steps": [
                "Pin your garage & emergency contact on VISTRAH + Google Maps SEO",
                "Show live ceramic coating / service bay quality via free 9:16 V Ads",
                "Convert vehicle owners via your Service Bay Configurator website",
            ],
            "recommended_pillar_ids": [
                "vistrah_presence",
                "google_local_seo",
                "dedicated_website",
                "hyperlocal_v_ads",
                "visual_brand_media",
            ],
        },
    },
    {
        "order": 9,
        "slug": "legal-tax-and-business-compliance",
        "title": "Legal, Tax & Business Compliance",
        "shortTitle": "Legal & Tax",
        "defaultSubcategorySlug": "accounting-and-taxation",
        "defaultTypeSlug": "chartered-accountants",
        "website_pattern": {
            "pattern_id": "authority-advisory-compliance-hub",
            "pattern_title": "Authority Advisory & Compliance Checklist Hub",
            "layout_archetype": "Structured practice areas, document checklists (GST, ITR, Pvt Ltd, Property), partner credentials & consultation scheduler",
            "hero_headline_template": "Trusted Tax, Legal & Business Compliance Advisory — {business_name}",
            "key_sections": [
                "Core Practice Areas (GST, Income Tax, Company Setup, Legal, Audit)",
                "Downloadable Client Document Checklists & Compliance Deadlines",
                "Advisor Credentials, Experience & Confidentiality Commitment",
                "Book Confidential Phone / Office Consultation",
            ],
            "conversion_cta": "Schedule Advisory Call",
        },
        "vertical_strategy": {
            "summary": "Attract high-LTV business retainers and compliance filings by projecting institutional credibility through an Authority Advisory website and deadline-driven explainer Reels.",
            "funnel_steps": [
                "Verify professional credentials on VISTRAH for zero-middleman B2B leads",
                "Launch Authority Advisory & Compliance Checklist Hub website",
                "Publish 60-second GST/ITR/compliance deadline updates on V Ads & Social",
            ],
            "recommended_pillar_ids": [
                "vistrah_presence",
                "dedicated_website",
                "google_local_seo",
                "hyperlocal_v_ads",
                "social_media_reach",
            ],
        },
    },
    {
        "order": 10,
        "slug": "overseas-education-and-skill-academies",
        "title": "Overseas, Education & Skill Academies",
        "shortTitle": "Overseas & Education",
        "defaultSubcategorySlug": "overseas-study-and-immigration",
        "defaultTypeSlug": "study-abroad-consultants",
        "website_pattern": {
            "pattern_id": "course-catalog-counseling-funnel",
            "pattern_title": "Course Catalog & Admission Counseling Funnel",
            "layout_archetype": "Country/course explorer, batch schedules, student visa/exam success stories & 1-on-1 counseling registration",
            "hero_headline_template": "Global Admissions, Coaching & Career Pathways with {business_name}",
            "key_sections": [
                "Study Abroad Countries / Coaching Programs & Batch Calendar",
                "Student Visa Approvals, Topper Scores & Placement Track Record",
                "Scholarship, Eligibility & Document Readiness Guide",
                "Book Free 1-on-1 Profile Evaluation / Demo Class",
            ],
            "conversion_cta": "Book Free Counseling Session",
        },
        "vertical_strategy": {
            "summary": "Fill upcoming intake batches and study-abroad pipelines with student success Reels, a structured Course & Counseling website, and intake-season Meta Lead Ads.",
            "funnel_steps": [
                "List courses & visa specialties free on VISTRAH + upload student story V Ads",
                "Capture student & parent inquiries on your Course & Counseling Funnel site",
                "Scale batch enrollments with targeted Instagram & Facebook Lead Ads",
            ],
            "recommended_pillar_ids": [
                "vistrah_presence",
                "dedicated_website",
                "hyperlocal_v_ads",
                "paid_ad_campaigns",
                "social_media_reach",
            ],
        },
    },
)

SECTOR_BY_SLUG: dict[str, dict] = {s["slug"]: s for s in FLAGSHIP_SECTORS}

CITY_COORDINATE_FALLBACKS: dict[str, tuple[float, float]] = {
    "bengaluru": (12.9716, 77.5946),
    "bangalore": (12.9716, 77.5946),
    "mysuru": (12.2958, 76.6394),
    "mysore": (12.2958, 76.6394),
    "mangaluru": (12.9141, 74.8560),
    "hubballi": (15.3647, 75.1240),
    "shivamogga": (13.9299, 75.5681),
    "tarikere": (13.7091, 75.8132),
    "chikkamagaluru": (13.3161, 75.7720),
    "tumakuru": (13.3379, 77.1173),
    "belagavi": (15.8497, 74.4977),
}


def _non_empty(val: object) -> bool:
    return isinstance(val, str) and bool(val.strip())


def resolve_flagship_sector(raw_slug: str | None) -> dict:
    if raw_slug:
        cleaned = raw_slug.strip().lower()
        if cleaned in SECTOR_BY_SLUG:
            return SECTOR_BY_SLUG[cleaned]
        mapped = legacy_map().get("categories", {}).get(cleaned)
        if mapped and mapped in SECTOR_BY_SLUG:
            return SECTOR_BY_SLUG[mapped]
    return FLAGSHIP_SECTORS[0]


def calculate_business_audit_score(signals: dict) -> dict:
    has_website = bool(signals.get("has_website") or _non_empty(signals.get("website_url")))
    has_social = bool(
        signals.get("has_social_presence")
        or _non_empty(signals.get("instagram_url"))
        or _non_empty(signals.get("facebook_url"))
    )
    has_media = bool(signals.get("has_visual_media") or _non_empty(signals.get("photo_url")))
    if "has_google_local_seo" in signals and signals["has_google_local_seo"] is not None:
        has_local_seo = bool(signals["has_google_local_seo"])
    else:
        has_local_seo = bool(
            _non_empty(signals.get("google_place_id"))
            or (_non_empty(signals.get("phone")) and bool(signals.get("has_coordinates")))
        )

    active_map = {
        "vistrah_presence": bool(signals.get("is_vistrah_claimed")),
        "dedicated_website": has_website,
        "hyperlocal_v_ads": bool(signals.get("has_active_v_ad")),
        "social_media_reach": has_social,
        "paid_ad_campaigns": bool(signals.get("has_paid_campaigns")),
        "visual_brand_media": has_media,
        "google_local_seo": has_local_seo,
    }

    baseline = 0
    breakdown: list[dict] = []
    gaps: list[dict] = []

    for pillar in AUDIT_PILLARS:
        is_active = active_map[pillar["id"]]
        earned = pillar["max_points"] if is_active else 0
        baseline += earned
        breakdown.append(
            {
                "pillar_id": pillar["id"],
                "product_title": pillar["product_title"],
                "short_title": pillar["short_title"],
                "max_points": pillar["max_points"],
                "earned_points": earned,
                "status": "active" if is_active else "lacking",
                "active_in_baseline": is_active,
                "unit_price_inr": pillar["unit_price_inr"],
                "billing_type": pillar["billing_type"],
                "billing_label": pillar["billing_label"],
                "gap_code": pillar["gap_code"],
                "summary": pillar["active_summary"] if is_active else pillar["gap_summary"],
                "deliverable_highlights": list(pillar["deliverable_highlights"]),
            }
        )
        if not is_active:
            gaps.append(
                {
                    "pillar_id": pillar["id"],
                    "gap_code": pillar["gap_code"],
                    "product_title": pillar["product_title"],
                    "missing_points": pillar["max_points"],
                    "unit_price_inr": pillar["unit_price_inr"],
                    "billing_type": pillar["billing_type"],
                    "billing_label": pillar["billing_label"],
                    "summary": pillar["gap_summary"],
                }
            )

    clamped_baseline = max(0, min(TOTAL_AUDIT_POINTS, baseline))
    return {
        "baseline_score": clamped_baseline,
        "max_score": TOTAL_AUDIT_POINTS,
        "pillar_breakdown": breakdown,
        "identified_gaps": gaps,
        "gap_codes": [g["gap_code"] for g in gaps],
    }


def _js_round(value: float) -> int:
    return math.floor(value + 0.5)


def simulate_ticked_plan(
    audit_or_signals: dict,
    ticked_pillar_ids: list[str] | tuple[str, ...],
    *,
    gst_included: bool = True,
) -> dict:
    audit = (
        audit_or_signals
        if "pillar_breakdown" in audit_or_signals
        else calculate_business_audit_score(audit_or_signals)
    )
    seen: set[str] = set()
    valid_ticked: list[str] = []
    for raw in ticked_pillar_ids:
        if raw in AUDIT_PILLAR_BY_ID and raw not in seen:
            seen.add(raw)
            valid_ticked.append(raw)

    active_ids = {
        p["pillar_id"] for p in audit["pillar_breakdown"] if p["active_in_baseline"]
    }

    added_points = 0
    free_items_count = 0
    one_time_total = 0
    monthly_total = 0
    newly_added: list[str] = []

    for pid in valid_ticked:
        if pid in active_ids:
            continue
        defn = AUDIT_PILLAR_BY_ID[pid]
        newly_added.append(pid)
        added_points += defn["max_points"]
        if defn["billing_type"] == "free_forever":
            free_items_count += 1
        elif defn["billing_type"] == "one_time":
            one_time_total += defn["unit_price_inr"]
        elif defn["billing_type"] == "monthly":
            monthly_total += defn["unit_price_inr"]

    projected = min(TOTAL_AUDIT_POINTS, audit["baseline_score"] + added_points)
    subtotal = one_time_total + monthly_total
    one_time_gst = _js_round((one_time_total * GST_RATE_PERCENT) / 100.0) if gst_included else 0
    monthly_gst = _js_round((monthly_total * GST_RATE_PERCENT) / 100.0) if gst_included else 0
    gst_amount = _js_round((subtotal * GST_RATE_PERCENT) / 100.0) if gst_included else 0

    return {
        "baseline_score": audit["baseline_score"],
        "projected_score": projected,
        "score_gain": projected - audit["baseline_score"],
        "ticked_pillar_ids": valid_ticked,
        "newly_added_pillar_ids": newly_added,
        "free_items_count": free_items_count,
        "one_time_total_inr": one_time_total,
        "monthly_total_inr": monthly_total,
        "subtotal_before_gst_inr": subtotal,
        "gst_included": gst_included,
        "gst_rate_percent": GST_RATE_PERCENT,
        "gst_amount_inr": gst_amount,
        "one_time_gst_inr": one_time_gst,
        "monthly_gst_inr": monthly_gst,
        "grand_total_with_gst_inr": subtotal + gst_amount,
    }


def _active_v_ad_owner_ids(db: Session, owner_ids: set[int]) -> set[int]:
    if not owner_ids:
        return set()
    rows = db.scalars(
        select(VAdsAdvertiser.owner_id)
        .join(VAdsVideo, VAdsVideo.advertiser_id == VAdsAdvertiser.id)
        .where(
            VAdsAdvertiser.owner_id.in_(owner_ids),
            VAdsVideo.status == "APPROVED",
        )
    ).all()
    return {uid for uid in rows if uid is not None}


def _provider_common_snapshot(db: Session, provider_id: int) -> dict:
    app = db.scalar(
        select(ProviderApplication)
        .where(ProviderApplication.provider_id == provider_id)
        .order_by(ProviderApplication.updated_at.desc())
        .limit(1)
    )
    return app.common if (app and isinstance(app.common, dict)) else {}


def _provider_sector_and_service(db: Session, provider_id: int) -> tuple[dict, str, str]:
    row = db.execute(
        select(Category.slug, Service.slug, Service.title)
        .join(Service, Service.category_id == Category.id)
        .join(ProviderService, ProviderService.service_id == Service.id)
        .where(ProviderService.provider_id == provider_id)
        .order_by(ProviderService.approval_status.asc(), Service.id.asc())
        .limit(1)
    ).first()
    if row:
        cat_slug, svc_slug, svc_title = row
        return resolve_flagship_sector(cat_slug), svc_slug, svc_title
    return FLAGSHIP_SECTORS[0], FLAGSHIP_SECTORS[0]["defaultTypeSlug"], FLAGSHIP_SECTORS[0]["title"]


def _build_provider_signals(
    provider: Provider,
    common: dict,
    *,
    has_active_v_ad: bool,
) -> dict:
    website = normalize_website_url(
        provider.website_url
        or common.get("website_url")
        or common.get("website")
        or provider.source_url
    )
    insta = normalize_website_url(provider.instagram_url or common.get("instagram_url"))
    fb = normalize_website_url(provider.facebook_url or common.get("facebook_url"))
    photo = common.get("photo_url") or common.get("shop_photo_url") or None
    place_id = provider.google_place_id or str(common.get("place_id") or "").strip() or None
    return {
        "is_vistrah_claimed": provider.owner_user_id is not None or provider.verification_status == "VERIFIED",
        "website_url": website,
        "instagram_url": insta,
        "facebook_url": fb,
        "has_active_v_ad": has_active_v_ad,
        "has_paid_campaigns": False,
        "photo_url": photo if isinstance(photo, str) and photo.strip() else None,
        "google_place_id": place_id,
        "phone": (provider.phone or "").strip(),
        "has_coordinates": provider.latitude is not None and provider.longitude is not None,
    }


def _serialize_lead(lead: MarketingAuditLead) -> dict:
    subtotal = int(lead.one_time_total_inr) + int(lead.monthly_total_inr)
    gst_amt = _js_round((subtotal * GST_RATE_PERCENT) / 100.0) if lead.gst_included else 0
    return {
        "id": lead.id,
        "business_id": lead.business_id,
        "google_place_id": lead.google_place_id,
        "provider_id": lead.provider_id,
        "business_name": lead.business_name,
        "sector_slug": lead.sector_slug,
        "service_type": lead.service_type,
        "city": lead.city,
        "phone": lead.phone,
        "baseline_score": lead.baseline_score,
        "projected_score": lead.projected_score,
        "ticked_pillar_ids": list(lead.ticked_pillar_ids or []),
        "one_time_total_inr": lead.one_time_total_inr,
        "monthly_total_inr": lead.monthly_total_inr,
        "gst_included": bool(lead.gst_included),
        "gst_amount_inr": gst_amt,
        "grand_total_with_gst_inr": subtotal + gst_amt,
        "lead_status": lead.lead_status,
        "notes": lead.notes,
        "created_by_user_id": lead.created_by_user_id,
        "created_at": lead.created_at.isoformat() if lead.created_at else None,
        "updated_at": lead.updated_at.isoformat() if lead.updated_at else None,
    }


def _serialize_website_request(req: WebsiteRequest) -> dict:
    return {
        "id": req.id,
        "business_id": req.business_id,
        "business_name": req.business_name,
        "sector_slug": req.sector_slug,
        "pattern_id": req.pattern_id,
        "phone": req.phone,
        "city": req.city,
        "requested_by_user_id": req.requested_by_user_id,
        "status": req.status,
        "notes": req.notes,
        "created_at": req.created_at.isoformat() if req.created_at else None,
        "updated_at": req.updated_at.isoformat() if req.updated_at else None,
    }


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    rlat1, rlng1 = math.radians(lat1), math.radians(lng1)
    rlat2, rlng2 = math.radians(lat2), math.radians(lng2)
    dlat = rlat2 - rlat1
    dlng = rlng2 - rlng1
    a = math.sin(dlat / 2) ** 2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlng / 2) ** 2
    return 2.0 * EARTH_KM * math.asin(min(1.0, math.sqrt(a)))


def _matches_missing_filters(item_audit: dict, raw_filter: str | None) -> bool:
    if not raw_filter:
        return True
    tokens = [tok.strip().lower() for tok in raw_filter.split(",") if tok.strip()]
    if not tokens:
        return True
    gap_codes = set(item_audit["gap_codes"])
    for tok in tokens:
        if tok == "score_below_50":
            if item_audit["baseline_score"] >= 50:
                return False
        elif tok in ("missing_website", "unclaimed_vistrah", "no_v_ad", "missing_social_media", "no_paid_campaigns", "missing_visual_media", "weak_local_seo"):
            if tok not in gap_codes:
                return False
    return True


@router.get("/marketing-audit/explore")
@router.get("/api/marketing-audit/explore")
def explore_marketing_audit_businesses(
    sector: str | None = Query(default=None, max_length=100),
    service_type: str | None = Query(default=None, max_length=100),
    city: str | None = Query(default=None, max_length=120),
    lat: float | None = Query(default=None, ge=-90, le=90),
    lng: float | None = Query(default=None, ge=-180, le=180),
    radius_km: float = Query(default=25.0, ge=1.0, le=200.0),
    source: Literal["all", "vistrah", "google"] = Query(default="all"),
    missing: str | None = Query(default=None, max_length=200),
    limit: int = Query(default=40, ge=1, le=100),
    _admin: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    sector_filter_obj = None
    if sector and sector.strip().lower() != "all":
        cleaned_sec = sector.strip().lower()
        if cleaned_sec in SECTOR_BY_SLUG:
            sector_filter_obj = SECTOR_BY_SLUG[cleaned_sec]
        else:
            mapped_sec = legacy_map().get("categories", {}).get(cleaned_sec)
            if mapped_sec and mapped_sec in SECTOR_BY_SLUG:
                sector_filter_obj = SECTOR_BY_SLUG[mapped_sec]
            else:
                raise HTTPException(422, "Unknown flagship sector")

    bt_def = None
    if service_type and service_type.strip():
        found = find_business_type(
            service_type.strip(),
            category_slug=sector_filter_obj["slug"] if sector_filter_obj else None,
        )
        if found:
            sec_cat, bt_def = found
            if sector_filter_obj is None:
                sector_filter_obj = resolve_flagship_sector(sec_cat["slug"])

    city_clean = (city or "").strip()
    eff_lat, eff_lng = lat, lng
    if (eff_lat is None or eff_lng is None) and city_clean:
        fallback_coords = CITY_COORDINATE_FALLBACKS.get(city_clean.lower())
        if fallback_coords:
            eff_lat, eff_lng = fallback_coords

    results: list[dict] = []
    claimed_place_ids: set[str] = set()

    # 1. Internal VISTRAH Providers
    if source in ("all", "vistrah"):
        prov_query = (
            select(Provider, Category.slug, Service.slug, Service.title)
            .outerjoin(ProviderService, ProviderService.provider_id == Provider.id)
            .outerjoin(Service, Service.id == ProviderService.service_id)
            .outerjoin(Category, Category.id == Service.category_id)
            .where(Provider.verification_status.in_(("VERIFIED", "PENDING")))
            .order_by(Provider.id.desc())
            .limit(limit * 4)
        )
        if city_clean and (lat is None or lng is None):
            like_pat = f"%{city_clean}%"
            prov_query = prov_query.where(
                or_(Provider.location.ilike(like_pat), Provider.address.ilike(like_pat))
            )
        rows = db.execute(prov_query).all()
        seen_pids: set[int] = set()
        deduped_rows: list[tuple[Provider, str | None, str | None, str | None]] = []
        for prov, cat_slug, svc_slug, svc_title in rows:
            if prov.id in seen_pids:
                continue
            seen_pids.add(prov.id)
            if prov.google_place_id:
                claimed_place_ids.add(prov.google_place_id)
            sec_obj = resolve_flagship_sector(cat_slug)
            if sector_filter_obj and sec_obj["slug"] != sector_filter_obj["slug"]:
                continue
            if bt_def and svc_slug and svc_slug != bt_def["slug"]:
                continue
            if lat is not None and lng is not None and prov.latitude is not None and prov.longitude is not None:
                if _haversine_km(lat, lng, float(prov.latitude), float(prov.longitude)) > radius_km + 0.5:
                    continue
            deduped_rows.append((prov, sec_obj["slug"], svc_slug or sec_obj["defaultTypeSlug"], svc_title or sec_obj["title"]))

        owner_ids = {p.owner_user_id for p, _, _, _ in deduped_rows if p.owner_user_id is not None}
        active_vad_owners = _active_v_ad_owner_ids(db, owner_ids)

        for prov, sec_slug, svc_slug, svc_title in deduped_rows:
            common = _provider_common_snapshot(db, prov.id)
            signals = _build_provider_signals(
                prov,
                common,
                has_active_v_ad=bool(prov.owner_user_id and prov.owner_user_id in active_vad_owners),
            )
            audit = calculate_business_audit_score(signals)
            if not _matches_missing_filters(audit, missing):
                continue
            results.append(
                {
                    "business_id": str(prov.id),
                    "source": "vistrah",
                    "provider_id": prov.id,
                    "google_place_id": signals["google_place_id"],
                    "owner_user_id": prov.owner_user_id,
                    "business_name": prov.company or prov.name,
                    "sector_slug": sec_slug,
                    "sector_title": SECTOR_BY_SLUG[sec_slug]["title"],
                    "service_type": svc_slug,
                    "service_title": svc_title,
                    "city": prov.location,
                    "address": prov.address,
                    "phone": signals["phone"],
                    "website_url": signals["website_url"],
                    "photo_url": signals["photo_url"],
                    "latitude": prov.latitude,
                    "longitude": prov.longitude,
                    "baseline_score": audit["baseline_score"],
                    "identified_gaps": audit["identified_gaps"],
                    "gap_codes": audit["gap_codes"],
                }
            )

    # 2. Google Places Prospect Discovery (when coordinates or mapped city available)
    if source in ("all", "google"):
        if claimed_place_ids == set() and source == "google":
            claimed_place_ids = {
                pid
                for pid in db.scalars(
                    select(Provider.google_place_id).where(Provider.google_place_id.is_not(None))
                ).all()
                if pid
            }
        target_sector = sector_filter_obj or FLAGSHIP_SECTORS[0]
        search_lat, search_lng = eff_lat if eff_lat is not None else 12.9716, eff_lng if eff_lng is not None else 77.5946
        search_title = bt_def["title"] if bt_def else target_sector["title"]
        cache_key = bt_def["slug"] if bt_def else f"cat:{target_sector['slug']}"
        raw_places = search_google_places_nearby_cached(
            business_type_key=cache_key,
            text_query=f"{search_title} {city_clean}".strip() if city_clean else search_title,
            latitude=search_lat,
            longitude=search_lng,
            radius_km=radius_km,
        )
        for gp in raw_places:
            place_id = str(gp.get("place_id") or "").strip()
            if not place_id or place_id in claimed_place_ids:
                continue
            gp_website = normalize_website_url(gp.get("website_url"))
            gp_phone = str(gp.get("phone") or "").strip()
            gp_photo = gp.get("photo_url") if isinstance(gp.get("photo_url"), str) else None
            addr = str(gp.get("address") or "")
            locality_guess = city_clean or (addr.split(",")[-2].strip() if "," in addr else addr[:80])
            signals = {
                "is_vistrah_claimed": False,
                "website_url": gp_website,
                "has_active_v_ad": False,
                "has_social_presence": False,
                "has_paid_campaigns": False,
                "photo_url": gp_photo,
                "google_place_id": place_id,
                "phone": gp_phone,
                "has_coordinates": True,
            }
            audit = calculate_business_audit_score(signals)
            if not _matches_missing_filters(audit, missing):
                continue
            results.append(
                {
                    "business_id": f"gp_{place_id}",
                    "source": "google_places",
                    "provider_id": None,
                    "google_place_id": place_id,
                    "owner_user_id": None,
                    "business_name": gp.get("name") or "Local Business",
                    "sector_slug": target_sector["slug"],
                    "sector_title": target_sector["title"],
                    "service_type": bt_def["slug"] if bt_def else target_sector["defaultTypeSlug"],
                    "service_title": search_title,
                    "city": locality_guess[:150],
                    "address": addr,
                    "phone": gp_phone,
                    "website_url": gp_website,
                    "photo_url": gp_photo,
                    "latitude": gp.get("latitude"),
                    "longitude": gp.get("longitude"),
                    "baseline_score": audit["baseline_score"],
                    "identified_gaps": audit["identified_gaps"],
                    "gap_codes": audit["gap_codes"],
                }
            )

    # Enrich with saved CRM lead status when present
    if results:
        biz_ids = [r["business_id"] for r in results]
        place_ids = [r["google_place_id"] for r in results if r["google_place_id"]]
        lead_conds = [MarketingAuditLead.business_id.in_(biz_ids)]
        if place_ids:
            lead_conds.append(MarketingAuditLead.google_place_id.in_(place_ids))
        saved_leads = db.scalars(select(MarketingAuditLead).where(or_(*lead_conds))).all()
        lead_by_biz = {ld.business_id: ld for ld in saved_leads}
        lead_by_place = {ld.google_place_id: ld for ld in saved_leads if ld.google_place_id}
        for item in results:
            matched_lead = lead_by_biz.get(item["business_id"]) or (
                lead_by_place.get(item["google_place_id"]) if item["google_place_id"] else None
            )
            item["lead_id"] = matched_lead.id if matched_lead else None
            item["lead_status"] = matched_lead.lead_status if matched_lead else None

    trimmed = results[:limit]
    return {
        "total": len(trimmed),
        "sector": sector_filter_obj["slug"] if sector_filter_obj else "all",
        "items": trimmed,
    }


class CreateMarketingAuditLeadInput(SafeModel):
    business_id: str = Field(min_length=1, max_length=160, pattern=r"^[A-Za-z0-9_-]{1,160}$")
    google_place_id: str | None = Field(default=None, max_length=160, pattern=r"^[A-Za-z0-9_-]{1,160}$")
    provider_id: int | None = Field(default=None, gt=0)
    business_name: str = Field(min_length=2, max_length=200)
    sector_slug: str = Field(min_length=2, max_length=100)
    service_type: str = Field(default="", max_length=120)
    city: str = Field(default="", max_length=150)
    phone: str = Field(default="", max_length=30)
    website_url: str | None = Field(default=None, max_length=500)
    photo_url: str | None = Field(default=None, max_length=500)
    is_vistrah_claimed: bool = False
    has_active_v_ad: bool = False
    baseline_score: int | None = Field(default=None, ge=0, le=100)
    ticked_pillar_ids: list[str] = Field(default_factory=list, max_length=10)
    gst_included: bool = True
    lead_status: Literal["new", "audit_shared", "follow_up", "website_requested", "closed"] = "new"
    notes: str = Field(default="", max_length=4000)


class PatchMarketingAuditLeadInput(SafeModel):
    lead_status: Literal["new", "audit_shared", "follow_up", "website_requested", "closed"] | None = None
    notes: str | None = Field(default=None, max_length=4000)
    phone: str | None = Field(default=None, max_length=30)
    city: str | None = Field(default=None, max_length=150)
    ticked_pillar_ids: list[str] | None = Field(default=None, max_length=10)
    gst_included: bool | None = None


@router.get("/marketing-audit/leads")
@router.get("/api/marketing-audit/leads")
def list_marketing_audit_leads(
    sector: str | None = Query(default=None, max_length=100),
    lead_status: str | None = Query(default=None, max_length=32),
    city: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=50, ge=1, le=200),
    _admin: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    query = select(MarketingAuditLead).order_by(
        MarketingAuditLead.updated_at.desc(), MarketingAuditLead.id.desc()
    )
    if sector and sector.strip().lower() != "all":
        sec_obj = resolve_flagship_sector(sector)
        query = query.where(MarketingAuditLead.sector_slug == sec_obj["slug"])
    if lead_status:
        if lead_status not in LEAD_STATUSES:
            raise HTTPException(422, "Invalid lead_status filter")
        query = query.where(MarketingAuditLead.lead_status == lead_status)
    if city and city.strip():
        query = query.where(MarketingAuditLead.city.ilike(f"%{city.strip()}%"))

    rows = db.scalars(query.limit(limit)).all()
    return {
        "total": len(rows),
        "items": [_serialize_lead(r) for r in rows],
    }


@router.post("/marketing-audit/leads", status_code=201)
@router.post("/api/marketing-audit/leads", status_code=201)
def create_or_upsert_marketing_audit_lead(
    data: CreateMarketingAuditLeadInput,
    admin: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    sec_obj = resolve_flagship_sector(data.sector_slug)
    clean_place = data.google_place_id
    if not clean_place and data.business_id.startswith("gp_") and len(data.business_id) > 3:
        clean_place = data.business_id[3:]

    provider = None
    if data.provider_id:
        provider = db.get(Provider, data.provider_id)
    elif data.business_id.isdigit():
        provider = db.get(Provider, int(data.business_id))
    elif clean_place:
        provider = db.scalar(select(Provider).where(Provider.google_place_id == clean_place))

    if provider:
        common = _provider_common_snapshot(db, provider.id)
        has_vad = bool(
            provider.owner_user_id
            and provider.owner_user_id in _active_v_ad_owner_ids(db, {provider.owner_user_id})
        )
        signals = _build_provider_signals(provider, common, has_active_v_ad=has_vad)
    else:
        signals = {
            "is_vistrah_claimed": data.is_vistrah_claimed,
            "website_url": normalize_website_url(data.website_url),
            "has_active_v_ad": data.has_active_v_ad,
            "photo_url": data.photo_url,
            "google_place_id": clean_place,
            "phone": data.phone.strip(),
            "has_coordinates": True,
        }

    audit = calculate_business_audit_score(signals)
    if data.baseline_score is not None and provider is None:
        # Still compute ticked additions deterministically over baseline
        sim = simulate_ticked_plan(audit, data.ticked_pillar_ids, gst_included=data.gst_included)
        baseline_val = data.baseline_score
        projected_val = min(TOTAL_AUDIT_POINTS, baseline_val + sim["score_gain"])
    else:
        sim = simulate_ticked_plan(audit, data.ticked_pillar_ids, gst_included=data.gst_included)
        baseline_val = sim["baseline_score"]
        projected_val = sim["projected_score"]

    existing = db.scalar(
        select(MarketingAuditLead).where(MarketingAuditLead.business_id == data.business_id)
    )
    ts = now()
    if existing:
        existing.google_place_id = clean_place or existing.google_place_id
        existing.provider_id = provider.id if provider else existing.provider_id
        existing.business_name = data.business_name.strip()
        existing.sector_slug = sec_obj["slug"]
        existing.service_type = data.service_type.strip()
        existing.city = data.city.strip()
        existing.phone = data.phone.strip()
        existing.baseline_score = baseline_val
        existing.projected_score = projected_val
        existing.ticked_pillar_ids = sim["ticked_pillar_ids"]
        existing.one_time_total_inr = sim["one_time_total_inr"]
        existing.monthly_total_inr = sim["monthly_total_inr"]
        existing.gst_included = data.gst_included
        existing.lead_status = data.lead_status
        existing.notes = data.notes.strip()
        existing.updated_at = ts
        lead = existing
    else:
        lead = MarketingAuditLead(
            business_id=data.business_id,
            google_place_id=clean_place,
            provider_id=provider.id if provider else data.provider_id,
            business_name=data.business_name.strip(),
            sector_slug=sec_obj["slug"],
            service_type=data.service_type.strip(),
            city=data.city.strip(),
            phone=data.phone.strip(),
            baseline_score=baseline_val,
            projected_score=projected_val,
            ticked_pillar_ids=sim["ticked_pillar_ids"],
            one_time_total_inr=sim["one_time_total_inr"],
            monthly_total_inr=sim["monthly_total_inr"],
            gst_included=data.gst_included,
            lead_status=data.lead_status,
            notes=data.notes.strip(),
            created_by_user_id=admin.id,
            created_at=ts,
            updated_at=ts,
        )
        db.add(lead)
        db.flush()

    db.add(
        Audit(
            actor_id=admin.id,
            action="MARKETING_AUDIT_LEAD_SAVED",
            entity="marketing_audit_lead",
            entity_id=str(lead.id),
            details={"business_id": lead.business_id, "lead_status": lead.lead_status},
        )
    )
    db.commit()
    db.refresh(lead)
    return _serialize_lead(lead)


@router.patch("/marketing-audit/leads/{lead_id}")
@router.patch("/api/marketing-audit/leads/{lead_id}")
def update_marketing_audit_lead(
    lead_id: int,
    data: PatchMarketingAuditLeadInput,
    admin: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    lead = db.scalar(
        select(MarketingAuditLead).where(MarketingAuditLead.id == lead_id).with_for_update()
    )
    if not lead:
        raise HTTPException(404, "Audit lead not found")

    if data.lead_status is not None:
        lead.lead_status = data.lead_status
    if data.notes is not None:
        lead.notes = data.notes.strip()
    if data.phone is not None:
        lead.phone = data.phone.strip()
    if data.city is not None:
        lead.city = data.city.strip()
    if data.gst_included is not None:
        lead.gst_included = data.gst_included

    if data.ticked_pillar_ids is not None:
        provider = db.get(Provider, lead.provider_id) if lead.provider_id else None
        if provider:
            common = _provider_common_snapshot(db, provider.id)
            has_vad = bool(
                provider.owner_user_id
                and provider.owner_user_id in _active_v_ad_owner_ids(db, {provider.owner_user_id})
            )
            signals = _build_provider_signals(provider, common, has_active_v_ad=has_vad)
            sim = simulate_ticked_plan(signals, data.ticked_pillar_ids, gst_included=lead.gst_included)
            lead.baseline_score = sim["baseline_score"]
            lead.projected_score = sim["projected_score"]
        else:
            valid_ids = [pid for pid in dict.fromkeys(data.ticked_pillar_ids) if pid in AUDIT_PILLAR_BY_ID]
            added_pts = sum(AUDIT_PILLAR_BY_ID[pid]["max_points"] for pid in valid_ids)
            lead.projected_score = min(TOTAL_AUDIT_POINTS, lead.baseline_score + added_pts)
            sim = {
                "ticked_pillar_ids": valid_ids,
                "one_time_total_inr": sum(
                    AUDIT_PILLAR_BY_ID[pid]["unit_price_inr"]
                    for pid in valid_ids
                    if AUDIT_PILLAR_BY_ID[pid]["billing_type"] == "one_time"
                ),
                "monthly_total_inr": sum(
                    AUDIT_PILLAR_BY_ID[pid]["unit_price_inr"]
                    for pid in valid_ids
                    if AUDIT_PILLAR_BY_ID[pid]["billing_type"] == "monthly"
                ),
            }
        lead.ticked_pillar_ids = sim["ticked_pillar_ids"]
        lead.one_time_total_inr = sim["one_time_total_inr"]
        lead.monthly_total_inr = sim["monthly_total_inr"]

    lead.updated_at = now()
    db.add(
        Audit(
            actor_id=admin.id,
            action="MARKETING_AUDIT_LEAD_UPDATED",
            entity="marketing_audit_lead",
            entity_id=str(lead.id),
            details={"lead_status": lead.lead_status},
        )
    )
    db.commit()
    db.refresh(lead)
    return _serialize_lead(lead)


def _compute_sector_benchmark(
    db: Session,
    sector_slug: str,
    locality: str,
    exclude_provider_id: int | None = None,
) -> dict:
    lm_cats = legacy_map().get("categories", {})
    acceptable_cat_slugs = {
        sector_slug,
        *(old_slug for old_slug, mapped in lm_cats.items() if mapped == sector_slug),
    }
    peer_rows = db.scalars(
        select(Provider)
        .join(ProviderService, ProviderService.provider_id == Provider.id)
        .join(Service, Service.id == ProviderService.service_id)
        .join(Category, Category.id == Service.category_id)
        .where(
            Provider.active.is_(True),
            Provider.verification_status == "VERIFIED",
            Category.slug.in_(acceptable_cat_slugs),
        )
        .limit(30)
    ).all()

    deduped_peers: list[Provider] = []
    seen: set[int] = set()
    for p in peer_rows:
        if p.id in seen or (exclude_provider_id is not None and p.id == exclude_provider_id):
            continue
        seen.add(p.id)
        deduped_peers.append(p)

    if deduped_peers:
        owner_ids = {p.owner_user_id for p in deduped_peers if p.owner_user_id is not None}
        vad_owners = _active_v_ad_owner_ids(db, owner_ids)
        peer_scores = []
        for p in deduped_peers:
            common = _provider_common_snapshot(db, p.id)
            sig = _build_provider_signals(
                p,
                common,
                has_active_v_ad=bool(p.owner_user_id and p.owner_user_id in vad_owners),
            )
            peer_scores.append(calculate_business_audit_score(sig)["baseline_score"])
        avg_score = round(sum(peer_scores) / len(peer_scores))
        top_score = max(peer_scores)
        return {
            "average_score": avg_score,
            "top_performer_score": max(top_score, 75),
            "sample_size": len(peer_scores),
            "sector_slug": sector_slug,
            "locality": locality or "Local Market",
        }

    return {
        "average_score": 52,
        "top_performer_score": 85,
        "sample_size": 0,
        "sector_slug": sector_slug,
        "locality": locality or "Local Market",
    }


@router.get("/business-profile/{business_id}")
@router.get("/api/business-profile/{business_id}")
def get_business_audit_profile(
    business_id: str,
    name: str | None = Query(default=None, max_length=200),
    sector: str | None = Query(default=None, max_length=100),
    service_type: str | None = Query(default=None, max_length=120),
    city: str | None = Query(default=None, max_length=150),
    address: str | None = Query(default=None, max_length=500),
    phone: str | None = Query(default=None, max_length=30),
    website_url: str | None = Query(default=None, max_length=500),
    photo_url: str | None = Query(default=None, max_length=500),
    lat: float | None = Query(default=None, ge=-90, le=90),
    lng: float | None = Query(default=None, ge=-180, le=180),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    raw_id = business_id.strip()
    if not BIZ_ID_RE.fullmatch(raw_id):
        raise HTTPException(422, "Invalid business identifier")

    is_admin = user.role == "ADMIN"
    provider: Provider | None = None
    clean_place_id: str | None = None

    if raw_id.isdigit() and int(raw_id) > 0:
        provider = db.get(Provider, int(raw_id))
        if not provider:
            # Fail closed with 403 for non-admins so user IDs / provider IDs cannot be enumerated!
            if not is_admin:
                raise HTTPException(403, "You are not authorized to view this business profile.")
            raise HTTPException(404, "Business profile not found")
    else:
        clean_place_id = raw_id[3:] if raw_id.startswith("gp_") and len(raw_id) > 3 else raw_id
        provider = db.scalar(
            select(Provider).where(Provider.google_place_id == clean_place_id)
        )

    # STRICT ROLE ENFORCEMENT:
    # - Admin can inspect ANY business (claimed VISTRAH provider or unclaimed Google Place).
    # - Joined Seller can inspect ONLY their own business (`provider.owner_user_id == user.id`).
    # - Normal users & non-owner sellers receive 403 Forbidden.
    if provider is not None:
        if not is_admin and (provider.owner_user_id is None or provider.owner_user_id != user.id):
            raise HTTPException(403, "You are not authorized to view another business's audit profile.")

        common = _provider_common_snapshot(db, provider.id)
        sec_obj, svc_slug, svc_title = _provider_sector_and_service(db, provider.id)
        if sector:
            sec_obj = resolve_flagship_sector(sector)
        has_vad = bool(
            provider.owner_user_id
            and provider.owner_user_id in _active_v_ad_owner_ids(db, {provider.owner_user_id})
        )
        signals = _build_provider_signals(provider, common, has_active_v_ad=has_vad)
        audit = calculate_business_audit_score(signals)
        default_plan = simulate_ticked_plan(
            audit, sec_obj["vertical_strategy"]["recommended_pillar_ids"]
        )
        benchmark = _compute_sector_benchmark(
            db, sec_obj["slug"], provider.location, exclude_provider_id=provider.id
        )
        existing_lead = (
            db.scalar(
                select(MarketingAuditLead).where(
                    or_(
                        MarketingAuditLead.provider_id == provider.id,
                        MarketingAuditLead.business_id == str(provider.id),
                        *(
                            [MarketingAuditLead.google_place_id == provider.google_place_id]
                            if provider.google_place_id
                            else []
                        ),
                    )
                )
            )
            if is_admin
            else None
        )

        return {
            "business": {
                "business_id": str(provider.id),
                "source": "vistrah",
                "provider_id": provider.id,
                "google_place_id": signals["google_place_id"],
                "owner_user_id": provider.owner_user_id,
                "is_claimed": provider.owner_user_id is not None,
                "verification_status": provider.verification_status,
                "name": provider.company or provider.name,
                "company": provider.company,
                "contact_name": provider.name,
                "sector_slug": sec_obj["slug"],
                "sector_title": sec_obj["title"],
                "service_type": svc_slug,
                "service_title": svc_title,
                "address": provider.address,
                "city": provider.location,
                "phone": signals["phone"],
                "whatsapp": str(common.get("whatsapp") or provider.phone or "").strip(),
                "website_url": signals["website_url"],
                "instagram_url": signals["instagram_url"],
                "facebook_url": signals["facebook_url"],
                "photo_url": signals["photo_url"],
                "latitude": provider.latitude,
                "longitude": provider.longitude,
            },
            "audit": audit,
            "default_plan": default_plan,
            "flagship_sector": sec_obj,
            "pillars_catalog": list(AUDIT_PILLARS),
            "competitor_benchmark": benchmark,
            "saved_lead": _serialize_lead(existing_lead) if existing_lead else None,
        }

    # Unclaimed Google Place -> strictly Admin-only!
    if not is_admin:
        raise HTTPException(
            403,
            "Only VISTRAH administrators or the verified owner who claimed this listing can view its audit profile.",
        )

    sec_obj = resolve_flagship_sector(sector)
    bt_title = sec_obj["title"]
    bt_slug = service_type or sec_obj["defaultTypeSlug"]
    if service_type:
        found = find_business_type(service_type)
        if found:
            sec_cat, bt_def = found
            if not sector:
                sec_obj = resolve_flagship_sector(sec_cat["slug"])
            bt_slug = bt_def["slug"]
            bt_title = bt_def["title"]

    existing_lead = db.scalar(
        select(MarketingAuditLead).where(
            or_(
                MarketingAuditLead.business_id == raw_id,
                MarketingAuditLead.google_place_id == clean_place_id,
            )
        )
    )
    resolved_name = (
        (name or "").strip()
        or (existing_lead.business_name if existing_lead else "")
        or f"Business ({clean_place_id})"
    )
    resolved_city = (
        (city or "").strip()
        or (existing_lead.city if existing_lead else "")
        or "Bengaluru"
    )
    resolved_phone = (phone or "").strip() or (existing_lead.phone if existing_lead else "")
    resolved_website = normalize_website_url(website_url)

    signals = {
        "is_vistrah_claimed": False,
        "website_url": resolved_website,
        "has_active_v_ad": False,
        "has_social_presence": False,
        "has_paid_campaigns": False,
        "photo_url": photo_url.strip() if photo_url and photo_url.strip() else None,
        "google_place_id": clean_place_id,
        "phone": resolved_phone,
        "has_coordinates": True,
    }
    audit = calculate_business_audit_score(signals)
    default_plan = simulate_ticked_plan(
        audit, sec_obj["vertical_strategy"]["recommended_pillar_ids"]
    )
    benchmark = _compute_sector_benchmark(db, sec_obj["slug"], resolved_city)

    return {
        "business": {
            "business_id": f"gp_{clean_place_id}",
            "source": "google_places",
            "provider_id": None,
            "google_place_id": clean_place_id,
            "owner_user_id": None,
            "is_claimed": False,
            "verification_status": "GOOGLE_PLACE",
            "name": resolved_name,
            "company": resolved_name,
            "contact_name": "",
            "sector_slug": sec_obj["slug"],
            "sector_title": sec_obj["title"],
            "service_type": bt_slug,
            "service_title": bt_title,
            "address": (address or resolved_city).strip(),
            "city": resolved_city,
            "phone": resolved_phone,
            "whatsapp": "",
            "website_url": resolved_website,
            "instagram_url": None,
            "facebook_url": None,
            "photo_url": signals["photo_url"],
            "latitude": lat,
            "longitude": lng,
        },
        "audit": audit,
        "default_plan": default_plan,
        "flagship_sector": sec_obj,
        "pillars_catalog": list(AUDIT_PILLARS),
        "competitor_benchmark": benchmark,
        "saved_lead": _serialize_lead(existing_lead) if existing_lead else None,
    }


class CreateWebsiteRequestInput(SafeModel):
    business_id: str = Field(default="inquiry", min_length=1, max_length=160, pattern=r"^[A-Za-z0-9_-]{1,160}$")
    business_name: str = Field(min_length=2, max_length=200)
    sector_slug: str = Field(min_length=2, max_length=100)
    pattern_id: str | None = Field(default=None, max_length=120, pattern=r"^[a-z0-9-]+$")
    phone: str = Field(default="", max_length=30)
    city: str = Field(default="", max_length=150)
    notes: str = Field(default="", max_length=2000)


@router.post("/website-requests", status_code=201)
@router.post("/api/website-requests", status_code=201)
def create_website_request(
    data: CreateWebsiteRequestInput,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    is_admin = user.role == "ADMIN"
    sec_obj = resolve_flagship_sector(data.sector_slug)
    effective_pattern_id = data.pattern_id or sec_obj["website_pattern"]["pattern_id"]

    raw_biz_id = data.business_id.strip()
    provider: Provider | None = None
    if raw_biz_id.isdigit() and int(raw_biz_id) > 0:
        provider = db.get(Provider, int(raw_biz_id))
        if not provider and not is_admin:
            raise HTTPException(403, "You can only request a website for your own verified business.")
    elif raw_biz_id != "inquiry":
        clean_place = raw_biz_id[3:] if raw_biz_id.startswith("gp_") and len(raw_biz_id) > 3 else raw_biz_id
        provider = db.scalar(select(Provider).where(Provider.google_place_id == clean_place))

    # If the target business is a claimed VISTRAH provider, ONLY its owner or Admin can log a request against it.
    if provider is not None and not is_admin and provider.owner_user_id != user.id:
        raise HTTPException(
            403,
            "Only the verified business owner or a VISTRAH administrator can request a website build for this claimed business.",
        )

    ts = now()
    req = WebsiteRequest(
        business_id=str(provider.id) if provider else raw_biz_id,
        business_name=data.business_name.strip(),
        sector_slug=sec_obj["slug"],
        pattern_id=effective_pattern_id,
        phone=(data.phone.strip() or (provider.phone if provider else user.phone or "")).strip()[:30],
        city=(data.city.strip() or (provider.location if provider else "")).strip()[:150],
        requested_by_user_id=user.id,
        status="new",
        notes=data.notes.strip(),
        created_at=ts,
        updated_at=ts,
    )
    db.add(req)
    db.flush()

    # Sync matching CRM lead status if one exists
    matching_lead = db.scalar(
        select(MarketingAuditLead).where(
            or_(
                MarketingAuditLead.business_id == raw_biz_id,
                *(
                    [MarketingAuditLead.provider_id == provider.id]
                    if provider is not None
                    else []
                ),
            )
        )
    )
    if matching_lead and matching_lead.lead_status in ("new", "audit_shared", "follow_up"):
        matching_lead.lead_status = "website_requested"
        matching_lead.updated_at = ts

    db.add(
        Audit(
            actor_id=user.id,
            action="WEBSITE_REQUEST_CREATED",
            entity="website_request",
            entity_id=str(req.id),
            details={
                "business_id": req.business_id,
                "sector_slug": req.sector_slug,
                "pattern_id": req.pattern_id,
            },
        )
    )
    db.commit()
    db.refresh(req)
    return {
        "request": _serialize_website_request(req),
        "website_pattern": sec_obj["website_pattern"],
    }
