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

def get_score_tier_label(score: int) -> str:
    s = max(0, min(100, int(score)))
    if s >= 90:
        return "Top Choice in Your Area"
    if s >= 70:
        return "Good Local Reach"
    if s >= 40:
        return "Seen, But Losing Customers"
    return "Hard to Find Online"


AUDIT_PILLARS: tuple[dict, ...] = (
    {
        "id": "vistrah_presence",
        "product_title": "Get Listed on VISTRAH",
        "short_title": "Get Listed on VISTRAH",
        "max_points": 20,
        "unit_price_inr": 0,
        "billing_type": "free_forever",
        "billing_label": "₹0 — Free Forever",
        "gap_code": "unclaimed_vistrah",
        "description": "Let nearby customers find your shop, call you, and get directions on VISTRAH.",
        "active_summary": "Let nearby customers find your shop, call you, and get directions on VISTRAH.",
        "gap_summary": "Not listed on VISTRAH yet — nearby customers can't find you here.",
        "deliverable_highlights": [
            "Verified business badge for your shop in your local area",
            "Direct phone call, WhatsApp, and map directions with zero commission",
            "Full access to your Online Presence & Customer Growth Check page",
        ],
    },
    {
        "id": "dedicated_website",
        "product_title": "Your Own Business Website",
        "short_title": "Your Own Business Website",
        "max_points": 20,
        "unit_price_inr": 4999,
        "billing_type": "one_time",
        "billing_label": "₹4,999 One-Time",
        "gap_code": "missing_website",
        "description": "A clean website showing your photos, services, and a direct WhatsApp inquiry button.",
        "active_summary": "A clean website showing your photos, services, and a direct WhatsApp inquiry button.",
        "gap_summary": "No website yet — customers can't check your full work, prices, or book online.",
        "deliverable_highlights": [
            "Works smoothly on phones and computers, tailored to your business",
            "One-tap WhatsApp inquiry, direct call button, and Google Maps pin",
            "Fast, secure website setup ready to share on WhatsApp & visiting cards",
        ],
    },
    {
        "id": "hyperlocal_v_ads",
        "product_title": "Free Local Area Ads (V Ads)",
        "short_title": "Free Local Area Ads (V Ads)",
        "max_points": 15,
        "unit_price_inr": 0,
        "billing_type": "free_forever",
        "billing_label": "₹0 — Free Forever",
        "gap_code": "no_v_ad",
        "description": "Show your offer video to people living and traveling near your business.",
        "active_summary": "Show your offer video to people living and traveling near your business.",
        "gap_summary": "No free local V Ad running — you're missing free visibility in your area.",
        "deliverable_highlights": [
            "Short vertical video shown to local people on the VISTRAH V Ads feed",
            "Reach 2 km, 10 km, 25 km, 50 km+ or any distance at ₹0 forever",
            "Direct call and shop details shown right below your video",
        ],
    },
    {
        "id": "social_media_reach",
        "product_title": "Instagram & Facebook Reels + Page Care",
        "short_title": "Instagram & Facebook Reels",
        "max_points": 15,
        "unit_price_inr": 4999,
        "billing_type": "monthly",
        "billing_label": "₹4,999 / month",
        "gap_code": "missing_social_media",
        "description": "We create short videos and post regularly so local customers remember you.",
        "active_summary": "We create short videos and post regularly so local customers remember you.",
        "gap_summary": "Low Instagram & Facebook activity — customers rarely see updates from you.",
        "deliverable_highlights": [
            "Regular short Reels, photo posts, and festival greetings for your business",
            "Clean video editing, simple captions, and local area tags",
            "Complete monthly care of your Instagram and Facebook pages",
        ],
    },
    {
        "id": "paid_ad_campaigns",
        "product_title": "Instagram & Facebook Customer Ads",
        "short_title": "Instagram & Facebook Ads",
        "max_points": 10,
        "unit_price_inr": 3999,
        "billing_type": "monthly",
        "billing_label": "₹3,999 / month",
        "gap_code": "no_paid_campaigns",
        "description": "Run local ads that bring daily phone calls and WhatsApp messages.",
        "active_summary": "Run local ads that bring daily phone calls and WhatsApp messages.",
        "gap_summary": "Not running local Instagram/Facebook ads — competitors are capturing nearby leads.",
        "deliverable_highlights": [
            "Local ads shown to families and buyers near your shop or city",
            "Direct WhatsApp message and phone call buttons on every ad",
            "Zero extra markup on ad budget paid to Instagram & Facebook",
        ],
    },
    {
        "id": "visual_brand_media",
        "product_title": "Professional Shop & Work Photos/Videos",
        "short_title": "Shop & Work Photos/Videos",
        "max_points": 10,
        "unit_price_inr": 2999,
        "billing_type": "one_time",
        "billing_label": "₹2,999 One-Time",
        "gap_code": "missing_visual_media",
        "description": "Clear, attractive photos and videos of your shop and work that build instant trust.",
        "active_summary": "Clear, attractive photos and videos of your shop and work that build instant trust.",
        "gap_summary": "Missing good shop & work photos — customers hesitate without seeing your place.",
        "deliverable_highlights": [
            "Bright, clear photos of your shopfront, team, and real work",
            "Ready-to-share short video for Free V Ads, WhatsApp, and Instagram",
            "Photos sized cleanly for your VISTRAH listing, Google Maps, and website",
        ],
    },
    {
        "id": "google_local_seo",
        "product_title": "Rank Higher on Google Search & Maps",
        "short_title": "Google Search & Maps Boost",
        "max_points": 10,
        "unit_price_inr": 2499,
        "billing_type": "one_time",
        "billing_label": "₹2,499 One-Time",
        "gap_code": "weak_local_seo",
        "description": "Help your business appear at the top when people search on Google near you.",
        "active_summary": "Help your business appear at the top when people search on Google near you.",
        "gap_summary": "Few Google reviews or weak Google Maps profile — harder to rank in top local searches.",
        "deliverable_highlights": [
            "Proper setup of your Google Business services, timings, and search words",
            "Exact Google Map pin, phone number, and address check",
            "Simple steps to collect more genuine 5-star customer reviews",
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
            "pattern_title": "Property Photos, Plot Details & Site Visit Website",
            "layout_archetype": "Shows your available plots, flats, and commercial spaces with photos, prices, approvals, map location, and a one-tap site visit button.",
            "hero_headline_template": "Verified Plots, Homes & Commercial Spaces by {business_name} in {city}",
            "key_sections": [
                "Available Plots, Flats & Shops (Size, Area & Price Range)",
                "Approval Details (RERA / Clear Title) & Nearby Facilities",
                "Google Map Pin & Main Road Connectivity",
                "One-Tap WhatsApp Brochure & Free Site Visit Booking",
            ],
            "conversion_cta": "Book a Free Site Visit",
        },
        "vertical_strategy": {
            "plan_heading": "Simple 3-Step Plan to Get More Site Visits",
            "summary": "Help serious property buyers see your plots and buildings clearly and message you directly on WhatsApp without middleman commission.",
            "funnel_steps": [
                "List your business free on VISTRAH and post a short property walkthrough video on Free V Ads.",
                "Launch your Property & Site Visit website so buyers can check photos, approvals, and download brochures.",
                "Run local Instagram & Facebook ads to bring buyer calls and site-visit bookings straight to your WhatsApp.",
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
            "pattern_title": "Room Photo Gallery & Home Budget Estimate Website",
            "layout_archetype": "Shows your finished kitchens, wardrobes, living rooms, and exterior work with simple package rates and a free home visit button.",
            "hero_headline_template": "Beautiful Home Interiors & Exterior Work by {business_name} in {city}",
            "key_sections": [
                "Before & After Photos (Kitchen, Hall, Bedroom & Elevation)",
                "Simple 1BHK, 2BHK, 3BHK & Independent House Price Guide",
                "Materials Used, Branded Fittings & Warranty Promise",
                "Book a Free Home Visit & Design Discussion",
            ],
            "conversion_cta": "Get a Free Room Estimate",
        },
        "vertical_strategy": {
            "plan_heading": "Simple 3-Step Plan to Get More Home Owners",
            "summary": "Homeowners trust interior designers whose finished rooms they can actually see. Show your real work and make it easy to ask for an estimate.",
            "funnel_steps": [
                "Post short videos of your completed kitchens and rooms on Free V Ads.",
                "Share your Room Photo Gallery & Estimate website whenever customers ask for sample work.",
                "Post regular room makeover Reels on Instagram & Facebook so new flat and house owners call you first.",
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
            "pattern_title": "Completed Buildings & Construction Rate Website",
            "layout_archetype": "Shows houses and buildings you have built, clear per-sq.ft rates, materials used, and a button to request a free plot inspection.",
            "hero_headline_template": "Trusted House Construction & Civil Work by {business_name} in {city}",
            "key_sections": [
                "Photos of Completed Houses, Commercial Buildings & Site Work",
                "Clear Per-Sq.Ft Construction Packages & Material List",
                "Step-by-Step Work Quality & On-Time Handover Promise",
                "Request a Free Plot Visit & Cost Quote on WhatsApp",
            ],
            "conversion_cta": "Ask for Construction Quote",
        },
        "vertical_strategy": {
            "plan_heading": "Simple 3-Step Plan to Win More Building Contracts",
            "summary": "Plot owners choose contractors who show real site photos, clear per-sq.ft rates, and a strong local reputation.",
            "funnel_steps": [
                "Get listed free on VISTRAH and rank higher on Google Maps across nearby towns.",
                "Show your completed buildings and per-sq.ft packages clearly on your own website.",
                "Share ongoing site progress videos on Free V Ads to reach plot owners within 25–50 km.",
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
            "pattern_title": "Doctor Profile, Timings & Appointment Website",
            "layout_archetype": "Shows your doctors, treatments, lab tests, clinic timings, map directions, and an easy appointment booking button.",
            "hero_headline_template": "Trusted Care & Specialist Treatment at {business_name}, {city}",
            "key_sections": [
                "Doctors, Qualifications & Years of Experience",
                "Treatments, Health Checkups & Home Sample Pickup",
                "Clinic Timings, Emergency Number & Insurance Accepted",
                "Easy WhatsApp or Phone Appointment Booking",
            ],
            "conversion_cta": "Book an Appointment",
        },
        "vertical_strategy": {
            "plan_heading": "Simple 3-Step Plan to Get More Patients",
            "summary": "Families check clinic timings, doctor details, and Google reviews near home before visiting. Make your clinic easy to find and trust.",
            "funnel_steps": [
                "List your clinic free on VISTRAH with clear timings and direct phone numbers.",
                "Launch your Doctor Profile & Appointment website so patients book directly without middleman apps.",
                "Improve your Google Maps profile and share short 60-second doctor health tips on Free V Ads.",
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
            "pattern_title": "Photo Menu, Table Booking & Direct Order Website",
            "layout_archetype": "Shows mouth-watering photos of your best dishes or rooms, full menu prices, party catering, and direct WhatsApp ordering with zero commission.",
            "hero_headline_template": "Fresh Taste & Warm Welcome at {business_name}, {city}",
            "key_sections": [
                "Best-Selling Dishes or Rooms with Clear Photos & Prices",
                "Direct WhatsApp Food Order, Table Booking or Room Stay Inquiry",
                "Party Catering, Family Packs & Hall Booking Details",
                "Google Map Directions, Opening Hours & Hygiene Standards",
            ],
            "conversion_cta": "Order Direct / Book a Table",
        },
        "vertical_strategy": {
            "plan_heading": "Simple 3-Step Plan to Get More Table & Direct Orders",
            "summary": "Keep 100% of your food and room earnings by showing hungry nearby customers your best items on video and letting them order directly.",
            "funnel_steps": [
                "Post short kitchen and food videos on Free V Ads to reach customers within 5–10 km.",
                "Use your Photo Menu & Direct Order website so regulars order on WhatsApp with zero commission.",
                "Share weekend specials, catering packs, and room offers on Instagram & Facebook every week.",
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
            "pattern_title": "Makeover Photos, Price List & Slot Booking Website",
            "layout_archetype": "Shows your bridal, hair, and skin makeover photos, clear service price list, combo offers, and a quick appointment button.",
            "hero_headline_template": "Hair, Beauty, Bridal Makeovers & Wellness at {business_name}",
            "key_sections": [
                "Real Bridal, Haircut & Facial Makeover Photos",
                "Clear Service Price List & Festive Combo Offers",
                "Experienced Stylists, Genuine Products & Clean Salon Care",
                "One-Tap WhatsApp Appointment or Bridal Trial Booking",
            ],
            "conversion_cta": "Book Your Slot",
        },
        "vertical_strategy": {
            "plan_heading": "Simple 3-Step Plan to Get More Salon & Bridal Bookings",
            "summary": "Customers book salons and bridal studios after seeing real makeover photos and clear package rates on their phone.",
            "funnel_steps": [
                "Share hair and bridal makeover videos on Free V Ads across your area.",
                "Show your full price list and makeover photo gallery on your own booking website.",
                "Run festive and wedding-season Instagram & Facebook ads to fill daily and bridal slots.",
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
            "pattern_title": "Event Highlight Videos, Packages & Date Check Website",
            "layout_archetype": "Shows your best wedding and event photos/videos, decoration or hall packages, and a quick button to check if an event date is free.",
            "hero_headline_template": "Memorable Weddings, Events & Photography by {business_name}",
            "key_sections": [
                "Best Wedding, Stage Decor & Event Photo/Video Highlights",
                "Clear Hall, Decor, Catering or Photography Packages",
                "Happy Family Reviews & Smooth Event Promise",
                "Check Wedding / Event Date Availability on WhatsApp",
            ],
            "conversion_cta": "Check If Your Date Is Free",
        },
        "vertical_strategy": {
            "plan_heading": "Simple 3-Step Plan to Book More Event Dates",
            "summary": "Families book wedding halls, decorators, and photographers months early when they see great highlight videos and can quickly check free dates.",
            "funnel_steps": [
                "Upload a 30-second highlight video of your best event on Free V Ads.",
                "Send families to your Event Highlights & Date Check website to view packages.",
                "Run wedding-season Instagram & Facebook ads so families call you first to lock dates.",
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
            "pattern_title": "Vehicle Service Rates, Detailing & Pickup Booking Website",
            "layout_archetype": "Shows your car and bike service packages, washing/detailing photos, emergency breakdown phone button, and doorstep pickup booking.",
            "hero_headline_template": "Trusted Car, Bike & EV Servicing at {business_name}, {city}",
            "key_sections": [
                "Service, Oil Change, AC, Tyre & Washing Rates by Vehicle",
                "Garage Photos, Genuine Spare Parts & Skilled Mechanics",
                "Emergency Breakdown Call Button & Exact Google Map Pin",
                "Book Garage Slot or Doorstep Vehicle Pickup",
            ],
            "conversion_cta": "Book Vehicle Service",
        },
        "vertical_strategy": {
            "plan_heading": "Simple 3-Step Plan to Get More Garage & Service Vehicles",
            "summary": "Vehicle owners search Google Maps during breakdowns and trust garages that show clean workshop bays and upfront service prices.",
            "funnel_steps": [
                "Pin your garage on VISTRAH and boost your Google Maps profile for urgent nearby searches.",
                "Post short videos of servicing, denting/painting, or detailing on Free V Ads.",
                "Use your Vehicle Service & Pickup website so owners can check rates and book slots.",
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
            "pattern_title": "Tax, Legal Services & Consultation Booking Website",
            "layout_archetype": "Shows the filings and legal matters you handle, simple document checklists for clients, your qualifications, and an appointment button.",
            "hero_headline_template": "Clear Tax, GST, Company & Legal Help — {business_name}, {city}",
            "key_sections": [
                "Services Offered (GST, Income Tax, Shop/Company Registration, Legal)",
                "Simple List of Documents Needed & Important Due Dates",
                "Qualifications, Years of Practice & Privacy Assurance",
                "Book a Phone or Office Consultation",
            ],
            "conversion_cta": "Book a Consultation",
        },
        "vertical_strategy": {
            "plan_heading": "Simple 3-Step Plan to Get More Regular Clients",
            "summary": "Shopkeepers, salaried families, and local companies stay for years with advisors who explain tax and legal steps simply.",
            "funnel_steps": [
                "List your office free on VISTRAH and rank higher on Google Search & Maps.",
                "Share your Services & Document Checklist website so clients know what papers to bring.",
                "Post short 60-second GST and tax due-date reminders on Free V Ads and Instagram.",
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
            "pattern_title": "Courses, Student Results & Free Counseling Website",
            "layout_archetype": "Shows your courses or study-abroad countries, batch timings, student results/visas, and a button to book a free demo class or counseling call.",
            "hero_headline_template": "Coaching, Skills & Study Abroad Guidance at {business_name}",
            "key_sections": [
                "Courses, Study-Abroad Countries & Upcoming Batch Timings",
                "Student Visa Successes, Exam Toppers & Job Placements",
                "Fee Structure, Scholarships & Documents Needed",
                "Book a Free Demo Class or Parent Counseling Session",
            ],
            "conversion_cta": "Book Free Demo / Counseling",
        },
        "vertical_strategy": {
            "plan_heading": "Simple 3-Step Plan to Fill Your Next Batch",
            "summary": "Students and parents join institutes that show real student results, clear batch details, and an easy free counseling call.",
            "funnel_steps": [
                "List your courses free on VISTRAH and post student success videos on Free V Ads.",
                "Share your Courses & Free Counseling website with parents and students.",
                "Run admission-season Instagram & Facebook ads to fill seats before batches start.",
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
                "description": pillar["description"],
                "summary": pillar["description"],
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
        "score_tier_label": get_score_tier_label(clamped_baseline),
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
        "projected_tier_label": get_score_tier_label(projected),
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
