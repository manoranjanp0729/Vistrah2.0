"""Deterministically build VISTRAH's full 800+ marketplace & self-onboarding taxonomy.

Combines:
  1. `shared/legacy/marketplace-taxonomy-v1.json` (14 categories, 126 subcategories, 749 listing types)
  2. Category 15: `property-and-construction` (6 subcategories, 59 listing types covering Real Estate,
     Property Management, Architecture, Civil Engineering, Turnkey Contractors, Interiors & Building Materials)
Total: 15 categories, 132 subcategories, 808 service/listing types (955 total classifications).

Outputs:
  - `shared/marketplace-taxonomy.json`
  - `shared/marketplace-imagery.json`
  - `shared/business-types.json`
  - `shared/marketplace-legacy-map.json`
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHARED = ROOT / "shared"
LEGACY_V1_TAXONOMY = SHARED / "legacy" / "marketplace-taxonomy-v1.json"
TAXONOMY_OUT = SHARED / "marketplace-taxonomy.json"
IMAGERY_OUT = SHARED / "marketplace-imagery.json"
BUSINESS_TYPES_OUT = SHARED / "business-types.json"
LEGACY_MAP_OUT = SHARED / "marketplace-legacy-map.json"
CATALOGUE_V0 = SHARED / "catalogue.json"

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

REGULATIONS = {
    "fssai": {
        "label": "FSSAI Registration / Licence Number",
        "document": "FSSAI Certificate",
    },
    "medical": {
        "label": "Medical Council / Clinical Establishment Registration",
        "document": "Clinical Registration Certificate",
    },
    "pharmacy": {
        "label": "Drug Licence Number (Form 20 / 21)",
        "document": "Drug Licence Copy",
    },
    "veterinary": {
        "label": "State Veterinary Council Registration Number",
        "document": "Veterinary Practice Registration",
    },
    "legal": {
        "label": "Bar Council Enrollment Number",
        "document": "Bar Council Certificate / ID",
    },
    "ca_tax": {
        "label": "ICAI Membership / GST Practitioner Number",
        "document": "Membership / Practitioner Certificate",
    },
    "rera": {
        "label": "State RERA Registration Number",
        "document": "RERA Registration Certificate",
    },
}

PROPERTY_AND_CONSTRUCTION_CATEGORY = {
    "slug": "property-and-construction",
    "title": "Property, Real Estate & Construction",
    "order": 15,
    "photo": "commercial-building",
    "description": "Real estate, plots, property management, architects, civil contractors, interiors and building materials.",
    "subcategories": [
        {
            "slug": "residential-and-commercial-real-estate",
            "title": "Residential & Commercial Real Estate",
            "photo": "commercial-building",
            "types": [
                ("apartment-sales-and-resale", "Apartment Sales & Resale", "commercial-building"),
                ("independent-house-and-villa-sales", "Independent House & Villa Sales", "home-and-everyday-services"),
                ("residential-plots-and-layouts", "Residential Plots & Layouts", "garden"),
                ("commercial-office-and-shop-spaces", "Commercial Office & Shop Spaces", "commercial-building"),
                ("industrial-sheds-and-warehouses", "Industrial Sheds & Warehouses", "truck"),
                ("farmland-and-agricultural-plots", "Farmland & Agricultural Plots", "agriculture-farm-land-preparation"),
                ("paying-guest-and-hostel-rentals", "Paying Guest & Hostel Spaces", "interior"),
                ("flatmate-and-co-living-spaces", "Flatmate & Co-Living Spaces", "interior"),
                ("real-estate-agents-and-advisors", "Real Estate Agents & Advisors", "accountant-consultation"),
                ("rera-builders-and-developers", "RERA Builders & Developers", "architecture"),
            ],
        },
        {
            "slug": "property-management-and-valuation",
            "title": "Property Management & Valuation",
            "photo": "accountant-consultation",
            "types": [
                ("property-management-and-tenant-care", "Property Management & Tenant Care", "home-maintenance"),
                ("rental-agreement-and-lease-drafting", "Rental Agreement & Lease Drafting", "accountant-consultation"),
                ("property-valuation-and-appraisal", "Property Valuation & Appraisal", "architecture"),
                ("khata-transfer-and-property-tax", "Khata Transfer & Property Tax Support", "accountant-consultation"),
                ("land-conversion-and-revenue-records", "Land Conversion & Revenue Records", "garden"),
                ("encumbrance-and-title-verification", "Encumbrance & Title Verification", "accountant-consultation"),
                ("housing-society-and-rwa-management", "Housing Society & RWA Management", "commercial-building"),
                ("commercial-facility-management", "Commercial Facility Management", "commercial-building"),
                ("nri-property-caretaking", "NRI Property Caretaking", "home-and-everyday-services"),
            ],
        },
        {
            "slug": "architecture-and-civil-engineering",
            "title": "Architecture & Civil Engineering",
            "photo": "architecture",
            "types": [
                ("residential-architects", "Residential Architects", "architecture"),
                ("commercial-and-industrial-architects", "Commercial & Industrial Architects", "commercial-building"),
                ("structural-engineering-consultants", "Structural Engineering Consultants", "architecture"),
                ("civil-engineering-and-site-supervision", "Civil Engineering & Site Supervision", "home-maintenance"),
                ("land-surveying-and-total-station", "Land Surveying & Total Station Mapping", "agriculture-farm-land-preparation"),
                ("soil-testing-and-geotechnical", "Soil Testing & Geotechnical Investigation", "agriculture-farm-soil-improvement"),
                ("building-plan-sanction-and-approvals", "Building Plan Sanction & Approvals", "accountant-consultation"),
                ("estimation-boq-and-quantity-surveying", "Estimation, BOQ & Quantity Surveying", "architecture"),
                ("vastu-and-space-planning", "Vastu & Space Planning Consultants", "interior"),
                ("green-building-and-solar-rooftop-design", "Green Building & Solar Rooftop Design", "electrical"),
            ],
        },
        {
            "slug": "building-contractors-and-turnkey",
            "title": "Building Contractors & Turnkey Construction",
            "photo": "home-maintenance",
            "types": [
                ("turnkey-home-construction-contractors", "Turnkey Home Construction Contractors", "home-and-everyday-services"),
                ("commercial-building-contractors", "Commercial Building Contractors", "commercial-building"),
                ("rcc-masonry-and-brickwork-contractors", "RCC, Masonry & Brickwork Contractors", "home-maintenance"),
                ("renovation-and-structural-repair", "Renovation, Remodelling & Structural Repair", "wall-painting"),
                ("waterproofing-and-terrace-sealing", "Waterproofing & Terrace Sealing", "home-maintenance"),
                ("borewell-drilling-and-flushing", "Borewell Drilling & Flushing", "agriculture-farm-irrigation-pump-repair"),
                ("earthmoving-excavation-and-jcb", "Earthmoving, Excavation & JCB Contractors", "truck"),
                ("compound-wall-precast-and-fencing", "Compound Wall, Precast & Fencing", "agriculture-farm-boundary-maintenance"),
                ("roofing-truss-and-fabrication-works", "Roofing, Truss & Fabrication Works", "home-maintenance"),
                ("road-paver-block-and-drainage-works", "Road, Paver Block & Drainage Works", "agriculture-farm-drainage-clearing"),
            ],
        },
        {
            "slug": "interiors-and-woodwork-execution",
            "title": "Interiors & Modular Woodwork",
            "photo": "interior",
            "types": [
                ("full-home-interior-designers", "Full-Home Interior Designers", "interior"),
                ("modular-kitchen-manufacturers", "Modular Kitchen Manufacturers", "interior"),
                ("wardrobe-and-custom-carpentry", "Wardrobe & Custom Carpentry", "home-maintenance"),
                ("false-ceiling-pop-and-gypsum", "False Ceiling, POP & Gypsum Works", "wall-painting"),
                ("tiles-marble-and-granite-laying", "Tiles, Marble & Granite Laying", "interior"),
                ("texture-painting-putty-and-polishing", "Texture Painting, Putty & Polishing", "wall-painting"),
                ("upvc-aluminium-windows-and-glass", "UPVC, Aluminium Windows & Toughened Glass", "commercial-building"),
                ("electrical-wiring-and-smart-automation", "Electrical Wiring & Smart Automation", "electrical"),
                ("plumbing-sanitary-and-solar-heaters", "Plumbing, Sanitary & Solar Water Heaters", "home-maintenance"),
                ("iron-grills-gates-and-ss-railings", "Iron Grills, Gates & SS Railings", "home-maintenance"),
            ],
        },
        {
            "slug": "construction-materials-and-supplies",
            "title": "Construction Materials & Supplies",
            "photo": "truck",
            "types": [
                ("cement-and-ready-mix-concrete", "Cement & Ready-Mix Concrete Suppliers", "truck"),
                ("tmt-steel-bars-and-structural-metal", "TMT Steel Bars & Structural Metal", "commercial-building"),
                ("bricks-solid-blocks-and-aac-blocks", "Bricks, Solid Blocks & AAC Blocks", "home-maintenance"),
                ("m-sand-p-sand-and-aggregates", "M-Sand, P-Sand & Jelly Aggregates", "truck"),
                ("tiles-sanitaryware-and-bath-fittings", "Tiles, Sanitaryware & Bath Fittings", "interior"),
                ("plywood-laminates-and-timber-dealers", "Plywood, Laminates & Timber Dealers", "shopping-and-local-retail"),
                ("paints-and-construction-chemicals", "Paints, Waterproofing & Construction Chemicals", "wall-painting"),
                ("electrical-cables-switches-and-lighting", "Electrical Cables, Switches & Lighting Wholesale", "electrical"),
                ("plumbing-pipes-tanks-and-pumps", "Plumbing Pipes, Tanks & Submersible Pumps", "agriculture-farm-irrigation-pump-repair"),
                ("scaffolding-centering-and-shuttering", "Scaffolding, Centering & Shuttering Supply", "home-maintenance"),
            ],
        },
    ],
}

# Maps v2 simplified category slugs -> canonical v1/v3 category slugs
V2_CATEGORY_ALIASES = {
    "home-services": "home-and-everyday-services",
    "shops-and-retail": "shopping-and-local-retail",
    "beauty-and-personal-care": "beauty-fashion-and-lifestyle",
    "health-and-fitness": "health-fitness-and-wellness",
    "vehicles": "automobiles",
    "rentals": "rental-services",
    "travel-and-stay": "travel-stay-and-experiences",
    "education-and-training": "education-and-skills",
    "professional-and-business-services": "professional-services",
    "property-and-construction": "property-and-construction",
    "food-and-dining": "food-and-dining",
    "events-and-celebrations": "events-and-celebrations",
    "agriculture-and-farming": "agriculture-and-farming",
}

# Maps all 81 v2 simplified slugs -> canonical (category, subcategory, listing_type)
V2_TYPE_ALIASES: dict[str, tuple[str, str, str]] = {
    # Food & Dining
    "restaurant": ("food-and-dining", "restaurants-and-dining", "restaurants"),
    "cafe-and-bakery": ("food-and-dining", "cafes-and-beverages", "cafes"),
    "sweets-and-snacks": ("food-and-dining", "bakeries-and-desserts", "sweet-shops"),
    "catering": ("food-and-dining", "catering-and-bulk-food", "event-catering"),
    "home-food-and-tiffin": ("food-and-dining", "home-food-and-meal-services", "tiffin-services"),
    "cloud-kitchen-and-delivery": ("food-and-dining", "cloud-kitchens-and-food-delivery", "cloud-kitchens"),
    # Home Services
    "cleaning": ("home-and-everyday-services", "cleaning-services", "home-deep-cleaning"),
    "electrician-and-plumber": ("home-and-everyday-services", "repairs-and-handyman", "electricians"),
    "appliance-repair": ("home-and-everyday-services", "appliance-repair-and-servicing", "ac-repair-and-servicing"),
    "painting-and-interiors": ("home-and-everyday-services", "painting-and-surface-work", "interior-painting"),
    "pest-control": ("home-and-everyday-services", "pest-and-hygiene-control", "general-pest-control"),
    "packers-and-movers": ("home-and-everyday-services", "shifting-and-relocation", "local-packers-and-movers"),
    "domestic-help": ("home-and-everyday-services", "domestic-support-services", "house-maids"),
    "pet-care": ("pet-care", "grooming", "dog-grooming"),
    # Shops & Retail
    "grocery-and-daily-needs": ("shopping-and-local-retail", "groceries-and-essentials", "kirana-and-general-stores"),
    "mobiles-and-electronics": ("shopping-and-local-retail", "electronics-and-appliances", "mobile-phone-stores"),
    "clothing-and-footwear": ("shopping-and-local-retail", "fashion-and-apparel", "menswear-stores"),
    "furniture-and-home-decor": ("shopping-and-local-retail", "home-and-living-stores", "furniture-stores"),
    "gifts-books-and-stationery": ("shopping-and-local-retail", "stationery-books-and-gifts", "stationery-shops"),
    "hardware-and-tools": ("shopping-and-local-retail", "hardware-and-building-supplies", "hardware-stores"),
    "local-makers-and-wholesalers": ("shopping-and-local-retail", "specialty-and-local-sellers", "local-wholesalers"),
    # Beauty & Personal Care
    "salon-and-barber": ("beauty-fashion-and-lifestyle", "salons-and-grooming", "mens-salons-and-barbers"),
    "beauty-parlour-and-makeup": ("beauty-fashion-and-lifestyle", "bridal-and-occasion-beauty", "bridal-makeup-artists"),
    "spa-and-massage": ("beauty-fashion-and-lifestyle", "spa-and-relaxation", "body-spas"),
    "tailoring-and-boutique": ("beauty-fashion-and-lifestyle", "tailoring-and-custom-wear", "boutiques"),
    "jewellery-and-accessories": ("beauty-fashion-and-lifestyle", "fashion-accessories-and-jewellery", "jewellery-stores"),
    "tattoo-and-body-art": ("beauty-fashion-and-lifestyle", "personal-styling-and-care", "tattoo-studios"),
    # Health & Fitness
    "clinic-and-doctor": ("health-fitness-and-wellness", "doctors-and-specialists", "general-physicians"),
    "hospital": ("health-fitness-and-wellness", "hospitals-and-clinics", "multi-specialty-hospitals"),
    "diagnostic-lab": ("health-fitness-and-wellness", "diagnostic-services", "blood-test-labs"),
    "pharmacy": ("health-fitness-and-wellness", "pharmacies-and-medical-supplies", "medical-stores"),
    "gym-and-yoga": ("health-fitness-and-wellness", "fitness-centres", "gyms"),
    "physiotherapy": ("health-fitness-and-wellness", "physiotherapy-and-rehabilitation", "physiotherapy-clinics"),
    "diet-and-counselling": ("health-fitness-and-wellness", "mental-and-holistic-wellness", "dietitians-and-nutritionists"),
    "veterinary-clinic": ("pet-care", "veterinary-and-pet-health", "veterinary-clinics"),
    # Vehicles
    "car-and-bike-sales": ("automobiles", "vehicle-dealers", "car-dealers"),
    "service-and-repair": ("automobiles", "repair-and-maintenance", "car-garages"),
    "car-wash-and-detailing": ("automobiles", "cleaning-and-detailing", "car-wash-centres"),
    "spare-parts-and-accessories": ("automobiles", "tyres-batteries-and-parts", "auto-spare-parts-shops"),
    "driving-school": ("automobiles", "driving-and-documentation", "driving-schools"),
    "towing-and-roadside-help": ("automobiles", "roadside-and-emergency-support", "towing-services"),
    # Property & Construction
    "property-buy-sell": ("property-and-construction", "residential-and-commercial-real-estate", "apartment-sales-and-resale"),
    "house-pg-and-room-rentals": ("property-and-construction", "residential-and-commercial-real-estate", "paying-guest-and-hostel-rentals"),
    "shop-and-office-space": ("property-and-construction", "residential-and-commercial-real-estate", "commercial-office-and-shop-spaces"),
    "contractors-and-civil-work": ("property-and-construction", "building-contractors-and-turnkey", "turnkey-home-construction-contractors"),
    "architect-and-interior-designer": ("property-and-construction", "architecture-and-civil-engineering", "residential-architects"),
    "building-materials": ("property-and-construction", "construction-materials-and-supplies", "cement-and-ready-mix-concrete"),
    # Rentals
    "vehicle-rental": ("rental-services", "vehicle-rentals", "self-drive-car-rentals"),
    "equipment-and-tools-rental": ("rental-services", "equipment-and-tool-rentals", "power-tool-rentals"),
    "furniture-and-appliance-rental": ("rental-services", "home-and-appliance-rentals", "furniture-rentals"),
    "event-and-party-items": ("rental-services", "event-and-party-rentals", "tent-and-canopy-rentals"),
    "costume-and-outfit-rental": ("rental-services", "fashion-and-lifestyle-rentals", "ethnic-wear-rentals"),
    # Travel & Stay
    "hotel-and-homestay": ("travel-stay-and-experiences", "stays-and-accommodation", "hotels"),
    "travel-agent-and-tours": ("travel-stay-and-experiences", "tour-and-travel-services", "travel-agencies"),
    "taxi-and-transport": ("travel-stay-and-experiences", "local-transport-and-transfers", "local-cab-services"),
    "adventure-and-activities": ("travel-stay-and-experiences", "experiences-and-activities", "trekking-organizers"),
    # Education & Training
    "school-and-college": ("education-and-skills", "schools-and-academic-institutions", "preschools-and-playschools"),
    "tuition-and-coaching": ("education-and-skills", "tuition-and-exam-coaching", "school-tuition-centres"),
    "skill-and-vocational-training": ("education-and-skills", "professional-and-technical-courses", "computer-training-institutes"),
    "language-classes": ("education-and-skills", "language-and-communication", "spoken-english-classes"),
    "music-dance-and-arts": ("education-and-skills", "arts-music-and-creative-learning", "music-classes"),
    "exam-preparation": ("education-and-skills", "competitive-exam-preparation", "banking-and-govt-exam-coaching"),
    # Events & Celebrations
    "venue-and-function-hall": ("events-and-celebrations", "venues-and-spaces", "marriage-halls"),
    "decorator": ("events-and-celebrations", "event-decoration", "stage-and-floral-decorators"),
    "photographer-and-videographer": ("events-and-celebrations", "photography-and-videography", "wedding-photographers"),
    "event-planner": ("events-and-celebrations", "event-planning", "wedding-planners"),
    "dj-music-and-entertainment": ("events-and-celebrations", "entertainment-and-performers", "djs"),
    "tent-sound-and-lighting": ("events-and-celebrations", "sound-lighting-and-setup", "sound-system-providers"),
    # Professional Services
    "legal-advocate": ("professional-services", "legal-and-compliance", "civil-lawyers"),
    "tax-gst-and-accounting": ("professional-services", "accounting-and-tax", "chartered-accountants"),
    "marketing-and-design": ("professional-services", "marketing-and-branding", "digital-marketing-agencies"),
    "it-and-software": ("professional-services", "it-and-digital-services", "website-development"),
    "insurance-and-finance": ("professional-services", "financial-and-insurance-advisory", "insurance-advisors"),
    "printing-and-documentation": ("professional-services", "documentation-and-printing", "printing-presses"),
    "recruitment-and-staffing": ("jobs-and-careers", "recruitment-and-placement", "placement-agencies"),
    # Agriculture & Farming
    "farm-equipment-and-machinery": ("agriculture-and-farming", "farm-equipment-and-machinery", "tractor-rental"),
    "seeds-fertiliser-and-nursery": ("agriculture-and-farming", "seeds-plants-and-nurseries", "crop-seed-suppliers"),
    "irrigation-and-borewell": ("agriculture-and-farming", "irrigation-and-water-systems", "drip-irrigation-installation"),
    "farm-labour-and-services": ("agriculture-and-farming", "farming-and-agricultural-services", "farm-land-preparation"),
    "dairy-and-livestock": ("agriculture-and-farming", "livestock-and-dairy-farming", "dairy-farm-setup"),
    "agri-produce-sellers": ("agriculture-and-farming", "organic-and-sustainable-farming", "farm-compost-supply"),
}


def _infer_regulation(cat_slug: str, sub_slug: str, type_slug: str) -> str | None:
    if cat_slug == "food-and-dining":
        return "fssai"
    if cat_slug == "health-fitness-and-wellness":
        if "pharmac" in sub_slug or "medical-stores" in type_slug or "chemist" in type_slug:
            return "pharmacy"
        if sub_slug in (
            "doctors-and-specialists",
            "hospitals-and-clinics",
            "dental-and-eye-care",
            "diagnostic-services",
        ):
            return "medical"
    if cat_slug == "pet-care" and "veterinary" in sub_slug:
        return "veterinary"
    if cat_slug == "professional-services":
        if "legal" in sub_slug or "lawyer" in type_slug or "advocate" in type_slug:
            return "legal"
        if "accounting" in sub_slug or "tax" in sub_slug or "chartered-accountant" in type_slug or "gst" in type_slug:
            return "ca_tax"
    if cat_slug == "property-and-construction" and "rera" in type_slug:
        return "rera"
    return None


def _load_base_v1_imagery() -> dict:
    raw = subprocess.check_output(
        ["git", "show", "6407b76~1:shared/marketplace-imagery.json"],
        cwd=str(ROOT),
    ).decode("utf-8")
    return json.loads(raw)


def _disambiguate_slug(base_slug: str, sub_slug: str, cat_slug: str, used: set[str]) -> str:
    if base_slug not in used:
        return base_slug
    sub_prefix = sub_slug.split("-")[0]
    candidate = f"{sub_prefix}-{base_slug}"[:100].strip("-")
    if candidate not in used:
        return candidate
    candidate2 = f"{sub_slug}-{base_slug}"[:100].strip("-")
    if candidate2 not in used:
        return candidate2
    candidate3 = f"{cat_slug.split('-')[0]}-{sub_slug.split('-')[0]}-{base_slug}"[:100].strip("-")
    idx = 2
    out = candidate3
    while out in used:
        out = f"{candidate}-{idx}"[:100]
        idx += 1
    return out


def build() -> dict[Path, str]:
    v1 = json.loads(LEGACY_V1_TAXONOMY.read_text(encoding="utf-8"))
    imagery = _load_base_v1_imagery()
    assets = imagery["assets"]
    items = imagery["items"]

    categories = [json.loads(json.dumps(c)) for c in v1["categories"]]

    # Append Category 15: Property, Real Estate & Construction (59 types)
    prop_cat = PROPERTY_AND_CONSTRUCTION_CATEGORY
    assert prop_cat["photo"] in assets
    items[f"category/{prop_cat['slug']}"] = {
        "photo": prop_cat["photo"],
        "subject": prop_cat["title"],
    }
    prop_subs_out = []
    for s_idx, sub in enumerate(prop_cat["subcategories"], start=1):
        assert sub["photo"] in assets
        items[f"subcategory/{prop_cat['slug']}/{sub['slug']}"] = {
            "photo": sub["photo"],
            "subject": sub["title"],
        }
        lt_out = []
        for t_slug, t_title, t_photo in sub["types"]:
            assert SLUG_RE.fullmatch(t_slug), f"Invalid slug: {t_slug}"
            assert t_photo in assets, f"Missing photo asset: {t_photo}"
            lt_out.append({"slug": t_slug, "title": t_title})
            items[f"type/{prop_cat['slug']}/{sub['slug']}/{t_slug}"] = {
                "photo": t_photo,
                "subject": t_title,
            }
        prop_subs_out.append(
            {
                "slug": sub["slug"],
                "title": sub["title"],
                "order": s_idx,
                "listing_types": lt_out,
            }
        )

    categories.append(
        {
            "slug": prop_cat["slug"],
            "title": prop_cat["title"],
            "order": prop_cat["order"],
            "subcategories": prop_subs_out,
        }
    )

    taxonomy_out = {"version": 1, "categories": categories}

    # Build 808 globally-unique self-onboarding & DB catalogue business types
    used_global_slugs: set[str] = set()
    bt_categories_out = []
    triple_to_unique_slug: dict[str, str] = {}

    for cat in categories:
        cat_slug = cat["slug"]
        cat_title = cat["title"]
        used_in_category: set[str] = set()
        cat_types = []
        sub_titles = [s["title"] for s in cat["subcategories"]]
        cat_desc = ", ".join(sub_titles[:4]) + (" and more." if len(sub_titles) > 4 else ".")

        for sub in cat["subcategories"]:
            sub_slug = sub["slug"]
            sub_title = sub["title"]
            for lt in sub["listing_types"]:
                raw_slug = lt["slug"]
                unique_slug = _disambiguate_slug(raw_slug, sub_slug, cat_slug, used_global_slugs | used_in_category)
                assert SLUG_RE.fullmatch(unique_slug), unique_slug
                used_global_slugs.add(unique_slug)
                used_in_category.add(unique_slug)

                triple_key = f"{cat_slug}/{sub_slug}/{raw_slug}"
                triple_to_unique_slug[triple_key] = unique_slug

                reg = _infer_regulation(cat_slug, sub_slug, raw_slug)
                entry: dict = {
                    "slug": unique_slug,
                    "listing_type_slug": raw_slug,
                    "subcategory_slug": sub_slug,
                    "subcategory_title": sub_title,
                    "title": lt["title"],
                    "description": f"{lt['title']} under {sub_title} ({cat_title}).",
                    "keywords": [sub_title, cat_title, raw_slug.replace("-", " ")],
                }
                if reg:
                    entry["regulated"] = reg
                cat_types.append(entry)

        bt_categories_out.append(
            {
                "slug": cat_slug,
                "title": cat_title,
                "description": cat_desc,
                "types": cat_types,
            }
        )

    total_types = sum(len(c["types"]) for c in bt_categories_out)
    assert total_types >= 800, f"Expected 800+ business types, got {total_types}"

    # Build legacy carry-over map so both v0 (`catalogue.json`) and v2 (81 simplified types) resolve cleanly
    v2_sub_redirects: dict[str, list[str]] = {}
    v2_service_carryover: dict[str, list[str]] = {}

    sub_index: dict[str, tuple[str, str, str]] = {}
    for cat in categories:
        for sub in cat["subcategories"]:
            first_lt = sub["listing_types"][0]["slug"]
            t_key = f"{cat['slug']}/{sub['slug']}/{first_lt}"
            sub_index[sub["slug"]] = (cat["slug"], first_lt, triple_to_unique_slug[t_key])

    v2_snapshot = json.loads(
        subprocess.check_output(
            ["git", "show", "6407b76:shared/business-types.json"],
            cwd=str(ROOT),
        ).decode("utf-8")
    )
    prop_fallbacks = {
        "property-buy-sell": ("property-and-construction", "residential-and-commercial-real-estate", "apartment-sales-and-resale"),
        "house-pg-and-room-rentals": ("property-and-construction", "residential-and-commercial-real-estate", "paying-guest-and-hostel-rentals"),
        "shop-and-office-space": ("property-and-construction", "residential-and-commercial-real-estate", "commercial-office-and-shop-spaces"),
        "contractors-and-civil-work": ("property-and-construction", "building-contractors-and-turnkey", "turnkey-home-construction-contractors"),
        "architect-and-interior-designer": ("property-and-construction", "architecture-and-civil-engineering", "residential-architects"),
        "building-materials": ("property-and-construction", "construction-materials-and-supplies", "cement-and-ready-mix-concrete"),
    }
    for v2_cat in v2_snapshot["categories"]:
        for v2_bt in v2_cat["types"]:
            v2_slug = v2_bt["slug"]
            if v2_slug in prop_fallbacks:
                t_cat, t_sub, t_lt = prop_fallbacks[v2_slug]
                u_slug = triple_to_unique_slug[f"{t_cat}/{t_sub}/{t_lt}"]
            else:
                legacy_subs = v2_bt.get("legacy_subcategories") or []
                matched_sub = next((s for s in legacy_subs if s in sub_index), None)
                if matched_sub:
                    t_cat, t_lt, u_slug = sub_index[matched_sub]
                    t_sub = matched_sub
                else:
                    t_cat = V2_CATEGORY_ALIASES[v2_cat["slug"]]
                    first_sub = next(c for c in categories if c["slug"] == t_cat)["subcategories"][0]
                    t_sub = first_sub["slug"]
                    t_lt = first_sub["listing_types"][0]["slug"]
                    u_slug = triple_to_unique_slug[f"{t_cat}/{t_sub}/{t_lt}"]
            v2_sub_redirects[v2_slug] = [t_cat, t_sub, t_lt, u_slug]
            v2_service_carryover[f"{v2_cat['slug']}/{v2_slug}"] = [t_cat, u_slug]
            for old_svc_key in v2_bt.get("legacy_services") or []:
                v2_service_carryover[old_svc_key] = [t_cat, u_slug]

    assert all(
        pair[1] in used_global_slugs for pair in v2_service_carryover.values()
    ), "Every carry-over service target must exist in the 808-type catalogue"

    business_types_data = {
        "version": 3,
        "regulations": REGULATIONS,
        "categories": bt_categories_out,
    }

    legacy_map_data = {
        "version": 2,
        "note": "Generated by scripts/build-business-types.py. Maps simplified v2 and v0 slugs onto the 808-type taxonomy.",
        "categories": V2_CATEGORY_ALIASES,
        "subcategories": v2_sub_redirects,
        "triples": triple_to_unique_slug,
        "catalogue_services": v2_service_carryover,
        "retained_catalogue_categories": ["jobs-careers"],
    }

    return {
        TAXONOMY_OUT: json.dumps(taxonomy_out, ensure_ascii=False, separators=(",", ":")) + "\n",
        IMAGERY_OUT: json.dumps(imagery, ensure_ascii=False, indent=2) + "\n",
        BUSINESS_TYPES_OUT: json.dumps(business_types_data, ensure_ascii=False, indent=2) + "\n",
        LEGACY_MAP_OUT: json.dumps(legacy_map_data, ensure_ascii=False, indent=2) + "\n",
    }


def main() -> None:
    outputs = build()
    check = "--check" in sys.argv
    stale = []
    for path, content in outputs.items():
        existing = path.read_text(encoding="utf-8") if path.exists() else ""
        if existing != content:
            stale.append(path.relative_to(ROOT).as_posix())
            if not check:
                path.write_text(content, encoding="utf-8")
    tax = json.loads(outputs[TAXONOMY_OUT])
    n_cats = len(tax["categories"])
    n_subs = sum(len(c["subcategories"]) for c in tax["categories"])
    n_types = sum(len(s["listing_types"]) for c in tax["categories"] for s in c["subcategories"])
    print(f"categories={n_cats} subcategories={n_subs} listing_types={n_types}")
    if check and stale:
        raise SystemExit("Stale generated files: " + ", ".join(stale))


if __name__ == "__main__":
    main()
