"""Deterministically build VISTRAH's Unified 10-Sector marketplace & self-onboarding taxonomy.

Restructures all 132 existing subcategories (808 listing types) plus dedicated Overseas Study &
Immigration types (6 listing types) into VISTRAH's 10 Unified Sectors:
  1. real-estate-and-property             — Real Estate & Property
  2. interior-design-and-exteriors        — Interior Design & Exteriors
  3. civil-construction-and-contractors   — Civil Construction & Contractors
  4. healthconnect-and-clinics            — HealthConnect & Clinics
  5. hospitality-restaurants-and-cafes    — Hospitality, Restaurants & Cafés
  6. salons-bridal-and-wellness           — Salons, Bridal & Wellness
  7. events-weddings-and-media            — Events, Weddings & Media
  8. automobiles-and-garages              — Automobiles & Garages
  9. legal-tax-and-business-compliance    — Legal, Tax & Business Compliance
 10. overseas-education-and-skill-academies — Overseas, Education & Skill Academies

Total: 10 Unified Sectors, 133 subcategories, 814 service/listing types, with 100% carry-over for
v3 (15-category), v2 (13-category / 81-type), and v0 (`catalogue.json`) slugs and DB records.

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

PROPERTY_AND_CONSTRUCTION_SUBCATEGORIES = [
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
]

OVERSEAS_STUDY_SUBCATEGORY = {
    "slug": "overseas-study-and-immigration",
    "title": "Overseas Study, Visa & Immigration",
    "photo": "education-and-skills",
    "types": [
        ("study-abroad-consultants", "Study Abroad Consultants", "education-and-skills"),
        ("overseas-visa-and-immigration-advisors", "Overseas Visa & Immigration Advisors", "accountant-consultation"),
        ("ielts-toefl-and-pte-coaching", "IELTS, TOEFL & PTE Coaching", "education-and-skills"),
        ("foreign-university-admissions", "Foreign University Admissions Guidance", "education-and-skills"),
        ("overseas-career-and-work-permit-guidance", "Overseas Career & Work Permit Guidance", "career-workplace"),
        ("education-loan-and-forex-assistance", "Education Loan & Student Forex Support", "accountant-consultation"),
    ],
}

# Canonical 10 Unified Sectors in exact display order (1..10)
UNIFIED_10_SECTORS = [
    {
        "order": 1,
        "slug": "real-estate-and-property",
        "title": "Real Estate & Property",
        "photo": "commercial-building",
        "description": "Residential plots, apartments, commercial leasing, property valuation, PG stays, and verified real estate advisors.",
        "subcategories": [
            "residential-and-commercial-real-estate",
            "property-management-and-valuation",
            "residential-property-rentals",
            "commercial-property-rentals",
            "real-estate-professionals",
        ],
    },
    {
        "order": 2,
        "slug": "interior-design-and-exteriors",
        "title": "Interior Design & Exteriors",
        "photo": "home-and-everyday-services",
        "description": "Modular kitchens, turnkey home & office interiors, exterior facades, painting, landscaping, carpentry, and home upkeep.",
        "subcategories": [
            "interiors-and-woodwork-execution",
            "home-improvement",
            "gardening-and-outdoor-care",
            "home-and-furniture",
            "furniture-rentals",
            "home-appliance-rentals",
            "home-installation",
            "repairs-and-maintenance",
            "appliance-services",
            "cleaning-services",
            "pest-control",
            "moving-and-relocation",
            "laundry-and-care",
            "domestic-help",
        ],
    },
    {
        "order": 3,
        "slug": "civil-construction-and-contractors",
        "title": "Civil Construction & Contractors",
        "photo": "construction-equipment",
        "description": "Architects, civil engineers, turnkey building contractors, construction materials, heavy equipment, borewell, and rural land works.",
        "subcategories": [
            "architecture-and-civil-engineering",
            "building-contractors-and-turnkey",
            "construction-materials-and-supplies",
            "engineering-and-technical-consultancy",
            "tools-and-construction-equipment",
            "business-and-industrial-rentals",
            "other-rentals",
            "farming-and-agricultural-services",
            "farm-equipment-and-machinery",
            "irrigation-and-water-management",
            "seeds-plants-and-nurseries",
            "soil-testing-and-crop-care",
            "agricultural-labour-and-farm-maintenance",
            "livestock-and-dairy-farming",
            "organic-and-sustainable-farming",
            "agricultural-consulting-and-technology",
        ],
    },
    {
        "order": 4,
        "slug": "healthconnect-and-clinics",
        "title": "HealthConnect & Clinics",
        "photo": "health-fitness-and-wellness",
        "description": "Hospitals, specialist clinics, dental care, diagnostic labs, pharmacies, physiotherapy, fitness centres, and veterinary care.",
        "subcategories": [
            "hospitals-and-clinics",
            "doctors-and-specialists",
            "diagnostic-services",
            "pharmacies-and-medical-supplies",
            "physiotherapy-and-rehabilitation",
            "nutrition-and-diet",
            "mental-wellbeing",
            "fitness-centres",
            "yoga-and-mind-body-fitness",
            "sports-coaching-and-facilities",
            "health-and-personal-care-products",
            "sports-and-recreation-rentals",
            "veterinary-services",
            "grooming",
            "boarding-and-daycare",
            "training",
            "pet-walking-and-sitting",
            "pet-supplies",
            "pet-adoption-and-welfare",
        ],
    },
    {
        "order": 5,
        "slug": "hospitality-restaurants-and-cafes",
        "title": "Hospitality, Restaurants & Cafés",
        "photo": "food-and-dining",
        "description": "Family restaurants, specialty cafés, bakeries, cloud kitchens, catering, hotels, resorts, homestays, and curated tours.",
        "subcategories": [
            "restaurants-and-dining",
            "caf-s-and-beverages",
            "quick-bites-and-street-food",
            "sweets-and-desserts",
            "catering-and-bulk-orders",
            "home-cooked-food",
            "food-delivery-and-takeaway",
            "grocery-and-food-essentials",
            "hotels-and-accommodation",
            "travel-planning",
            "tours-and-guided-experiences",
            "adventure-activities",
            "attractions-and-entertainment",
            "travel-and-adventure-equipment",
            "grocery-and-daily-needs",
        ],
    },
    {
        "order": 6,
        "slug": "salons-bridal-and-wellness",
        "title": "Salons, Bridal & Wellness",
        "photo": "beauty-fashion-and-lifestyle",
        "description": "Unisex salons, bridal makeup studios, skin & hair aesthetics, spas, designer boutiques, bespoke tailoring, and jewellery.",
        "subcategories": [
            "salons-and-haircare",
            "beauty-and-skincare",
            "makeup-and-styling",
            "spa-and-relaxation",
            "fashion-services",
            "fashion-and-clothing",
            "jewellery-and-accessories",
            "fashion-and-occasion-rentals",
            "tattoos-and-body-art",
        ],
    },
    {
        "order": 7,
        "slug": "events-weddings-and-media",
        "title": "Events, Weddings & Media",
        "photo": "events",
        "description": "Convention halls, wedding planners, stage & floral decor, candid photography, commercial film production, branding, and sound/LED setups.",
        "subcategories": [
            "venues",
            "weddings",
            "event-planning-services",
            "decorations-and-equipment",
            "event-professionals",
            "birthday-and-private-parties",
            "corporate-events",
            "tickets-and-experiences",
            "event-and-party-rentals",
            "photography-and-personal-portfolios",
            "marketing-and-branding",
            "design-and-creative-services",
            "electronics-and-gadget-rentals",
            "electronics",
            "books-gifts-and-stationery",
            "specialty-stores",
            "local-manufacturers-and-sellers",
            "shopping-deals",
        ],
    },
    {
        "order": 8,
        "slug": "automobiles-and-garages",
        "title": "Automobiles & Garages",
        "photo": "automobiles",
        "description": "Multi-brand car & bike garages, EV servicing, ceramic detailing, tyres & batteries, showrooms, rentals, and 24x7 roadside assistance.",
        "subcategories": [
            "vehicle-servicing-and-repairs",
            "car-care-and-detailing",
            "spare-parts-and-accessories",
            "roadside-assistance",
            "new-vehicles",
            "used-vehicles",
            "vehicle-dealers-and-showrooms",
            "vehicle-insurance-and-finance",
            "driving-and-vehicle-documentation",
            "commercial-and-fleet-services",
            "vehicle-rentals",
            "transport-and-transfers",
        ],
    },
    {
        "order": 9,
        "slug": "legal-tax-and-business-compliance",
        "title": "Legal, Tax & Business Compliance",
        "photo": "professional-advice",
        "description": "Chartered accountants, GST & income tax filing, company registration, advocates, property documentation, insurance, and IT advisory.",
        "subcategories": [
            "legal-services",
            "accounting-and-taxation",
            "financial-services",
            "documentation-and-administrative-services",
            "business-consulting",
            "it-and-technology-services",
        ],
    },
    {
        "order": 10,
        "slug": "overseas-education-and-skill-academies",
        "title": "Overseas, Education & Skill Academies",
        "photo": "education-and-skills",
        "description": "Study abroad & visa consultants, IELTS/PTE coaching, schools, competitive exam academies, coding & skill institutes, and career placement.",
        "subcategories": [
            "overseas-study-and-immigration",
            "travel-assistance",
            "schools-and-academic-education",
            "tutors-and-coaching",
            "professional-courses",
            "vocational-training",
            "language-learning",
            "creative-skills",
            "career-development",
            "certifications-and-exam-preparation",
            "online-learning",
            "jobs-by-industry",
            "jobs-by-employment-type",
            "jobs-by-experience",
            "government-and-public-sector",
            "gig-and-freelance-work",
            "employer-profiles",
            "career-support",
            "recruitment-services",
        ],
    },
]

# Maps all legacy v2 (13-category) AND v3 (15-category) slugs -> canonical 10-Sector slugs
LEGACY_CATEGORY_ALIASES = {
    # v3 (15-category) slugs
    "property-and-construction": "real-estate-and-property",
    "home-and-everyday-services": "interior-design-and-exteriors",
    "agriculture-and-farming": "civil-construction-and-contractors",
    "rental-services": "civil-construction-and-contractors",
    "health-fitness-and-wellness": "healthconnect-and-clinics",
    "pet-care": "healthconnect-and-clinics",
    "food-and-dining": "hospitality-restaurants-and-cafes",
    "travel-stay-and-experiences": "hospitality-restaurants-and-cafes",
    "beauty-fashion-and-lifestyle": "salons-bridal-and-wellness",
    "events-and-celebrations": "events-weddings-and-media",
    "shopping-and-local-retail": "events-weddings-and-media",
    "automobiles": "automobiles-and-garages",
    "professional-services": "legal-tax-and-business-compliance",
    "education-and-skills": "overseas-education-and-skill-academies",
    "jobs-and-careers": "overseas-education-and-skill-academies",
    # v2 (13-category) slugs
    "home-services": "interior-design-and-exteriors",
    "shops-and-retail": "events-weddings-and-media",
    "beauty-and-personal-care": "salons-bridal-and-wellness",
    "health-and-fitness": "healthconnect-and-clinics",
    "vehicles": "automobiles-and-garages",
    "rentals": "civil-construction-and-contractors",
    "travel-and-stay": "hospitality-restaurants-and-cafes",
    "education-and-training": "overseas-education-and-skill-academies",
    "professional-and-business-services": "legal-tax-and-business-compliance",
}

FOOD_SUBCATEGORIES = {
    "restaurants-and-dining",
    "caf-s-and-beverages",
    "quick-bites-and-street-food",
    "sweets-and-desserts",
    "catering-and-bulk-orders",
    "home-cooked-food",
    "food-delivery-and-takeaway",
    "grocery-and-food-essentials",
}


def _infer_regulation(cat_slug: str, sub_slug: str, type_slug: str) -> str | None:
    if sub_slug in FOOD_SUBCATEGORIES:
        return "fssai"
    if cat_slug == "healthconnect-and-clinics":
        if "pharmac" in sub_slug or "medical-stores" in type_slug or "chemist" in type_slug:
            return "pharmacy"
        if sub_slug in (
            "doctors-and-specialists",
            "hospitals-and-clinics",
            "dental-and-eye-care",
            "diagnostic-services",
        ):
            return "medical"
        if "veterinary" in sub_slug:
            return "veterinary"
    if cat_slug == "legal-tax-and-business-compliance":
        if "legal" in sub_slug or "lawyer" in type_slug or "advocate" in type_slug:
            return "legal"
        if "accounting" in sub_slug or "tax" in sub_slug or "chartered-accountant" in type_slug or "gst" in type_slug:
            return "ca_tax"
    if cat_slug == "real-estate-and-property" and "rera" in type_slug:
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
    base_imagery = _load_base_v1_imagery()
    assets = base_imagery["assets"]
    old_items = base_imagery["items"]

    # Index all v1 + property-and-construction + overseas subcategories by slug -> (old_cat_slug, sub_dict, photo_map)
    sub_pool: dict[str, tuple[str, dict]] = {}
    for old_cat in v1["categories"]:
        old_cat_slug = old_cat["slug"]
        for sub in old_cat["subcategories"]:
            assert sub["slug"] not in sub_pool, f"Duplicate subcategory slug: {sub['slug']}"
            sub_pool[sub["slug"]] = (old_cat_slug, json.loads(json.dumps(sub)))

    custom_sub_photos: dict[str, str] = {}
    custom_type_photos: dict[tuple[str, str], str] = {}
    for custom_cat_slug, custom_subs in (
        ("property-and-construction", PROPERTY_AND_CONSTRUCTION_SUBCATEGORIES),
        ("overseas-education-and-skill-academies", [OVERSEAS_STUDY_SUBCATEGORY]),
    ):
        for sub in custom_subs:
            s_slug = sub["slug"]
            assert s_slug not in sub_pool, f"Duplicate custom subcategory slug: {s_slug}"
            assert sub["photo"] in assets, f"Missing photo asset: {sub['photo']}"
            custom_sub_photos[s_slug] = sub["photo"]
            lt_out = []
            for t_slug, t_title, t_photo in sub["types"]:
                assert SLUG_RE.fullmatch(t_slug), f"Invalid slug: {t_slug}"
                assert t_photo in assets, f"Missing photo asset: {t_photo}"
                custom_type_photos[(s_slug, t_slug)] = t_photo
                lt_out.append({"slug": t_slug, "title": t_title})
            sub_pool[s_slug] = (
                custom_cat_slug,
                {
                    "slug": s_slug,
                    "title": sub["title"],
                    "order": 1,
                    "listing_types": lt_out,
                },
            )

    # Assemble the 10 Unified Sectors and build clean imagery items
    new_items: dict[str, dict] = {}
    categories_out: list[dict] = []
    seen_subs: set[str] = set()
    sub_to_old_cat: dict[str, str] = {}

    for sector in UNIFIED_10_SECTORS:
        sec_slug = sector["slug"]
        sec_title = sector["title"]
        sec_photo = sector["photo"]
        assert sec_photo in assets, f"Missing sector photo: {sec_photo}"
        new_items[f"category/{sec_slug}"] = {
            "photo": sec_photo,
            "subject": sec_title,
        }
        sec_subs_out: list[dict] = []
        for s_idx, s_slug in enumerate(sector["subcategories"], start=1):
            assert s_slug in sub_pool, f"Unknown subcategory slug in sector {sec_slug}: {s_slug}"
            assert s_slug not in seen_subs, f"Subcategory assigned twice: {s_slug}"
            seen_subs.add(s_slug)

            old_cat_slug, sub_obj = sub_pool[s_slug]
            sub_to_old_cat[s_slug] = old_cat_slug
            sub_obj["order"] = s_idx
            sec_subs_out.append(sub_obj)

            # Map subcategory imagery
            if s_slug in custom_sub_photos:
                new_items[f"subcategory/{sec_slug}/{s_slug}"] = {
                    "photo": custom_sub_photos[s_slug],
                    "subject": sub_obj["title"],
                }
            else:
                old_sub_item = old_items[f"subcategory/{old_cat_slug}/{s_slug}"]
                new_items[f"subcategory/{sec_slug}/{s_slug}"] = dict(old_sub_item)

            # Map listing-type imagery
            for lt in sub_obj["listing_types"]:
                t_slug = lt["slug"]
                if (s_slug, t_slug) in custom_type_photos:
                    new_items[f"type/{sec_slug}/{s_slug}/{t_slug}"] = {
                        "photo": custom_type_photos[(s_slug, t_slug)],
                        "subject": lt["title"],
                    }
                else:
                    old_type_item = old_items[f"type/{old_cat_slug}/{s_slug}/{t_slug}"]
                    new_items[f"type/{sec_slug}/{s_slug}/{t_slug}"] = dict(old_type_item)

        categories_out.append(
            {
                "slug": sec_slug,
                "title": sec_title,
                "order": sector["order"],
                "subcategories": sec_subs_out,
            }
        )

    assert seen_subs == set(sub_pool.keys()), (
        f"Unassigned subcategories: {set(sub_pool.keys()) - seen_subs}"
    )
    assert len(categories_out) == 10

    taxonomy_out = {"version": 2, "categories": categories_out}
    imagery_out = {"assets": assets, "items": new_items}

    # Build globally-unique self-onboarding & DB catalogue business types across the 10 Unified Sectors
    # IMPORTANT: Preserve exact v3 unique slugs for all 808 existing types so existing DB Service slugs match!
    v3_snapshot = json.loads(
        subprocess.check_output(
            ["git", "show", "HEAD:shared/business-types.json"],
            cwd=str(ROOT),
        ).decode("utf-8")
    )
    v3_unique_by_sub_lt: dict[tuple[str, str], str] = {}
    v3_cat_by_unique_slug: dict[str, str] = {}
    for v3_cat in v3_snapshot["categories"]:
        for v3_bt in v3_cat["types"]:
            v3_unique_by_sub_lt[(v3_bt["subcategory_slug"], v3_bt["listing_type_slug"])] = v3_bt["slug"]
            v3_cat_by_unique_slug[v3_bt["slug"]] = v3_cat["slug"]

    used_global_slugs: set[str] = set()
    bt_categories_out = []
    triple_to_unique_slug: dict[str, str] = {}

    for sector_meta, cat in zip(UNIFIED_10_SECTORS, categories_out):
        cat_slug = cat["slug"]
        cat_title = cat["title"]
        used_in_category: set[str] = set()
        cat_types = []
        cat_desc = sector_meta["description"]

        for sub in cat["subcategories"]:
            sub_slug = sub["slug"]
            sub_title = sub["title"]
            old_cat_slug = sub_to_old_cat[sub_slug]
            for lt in sub["listing_types"]:
                raw_slug = lt["slug"]
                preserved = v3_unique_by_sub_lt.get((sub_slug, raw_slug))
                if preserved and preserved not in used_global_slugs:
                    unique_slug = preserved
                else:
                    unique_slug = _disambiguate_slug(
                        raw_slug,
                        sub_slug,
                        cat_slug,
                        used_global_slugs | used_in_category,
                    )
                assert SLUG_RE.fullmatch(unique_slug), unique_slug
                used_global_slugs.add(unique_slug)
                used_in_category.add(unique_slug)

                triple_key = f"{cat_slug}/{sub_slug}/{raw_slug}"
                triple_to_unique_slug[triple_key] = unique_slug
                # Also record legacy v3 triple -> unique_slug for CommerceListing remapping
                old_triple = f"{old_cat_slug}/{sub_slug}/{raw_slug}"
                triple_to_unique_slug[old_triple] = unique_slug

                reg = _infer_regulation(cat_slug, sub_slug, raw_slug)
                kw = [sub_title, cat_title, raw_slug.replace("-", " ")]
                if old_cat_slug != cat_slug:
                    kw.append(old_cat_slug.replace("-", " "))
                entry: dict = {
                    "slug": unique_slug,
                    "listing_type_slug": raw_slug,
                    "subcategory_slug": sub_slug,
                    "subcategory_title": sub_title,
                    "title": lt["title"],
                    "description": f"{lt['title']} under {sub_title} ({cat_title}).",
                    "keywords": kw,
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
    assert total_types == 814, f"Expected 814 business types, got {total_types}"

    # Build legacy carry-over map so v3 (15-cat), v2 (13-cat / 81-type), and v0 (`catalogue.json`) resolve cleanly
    sub_redirects: dict[str, list[str]] = {}
    service_carryover: dict[str, list[str]] = {}

    sub_index: dict[str, tuple[str, str, str]] = {}
    unique_to_new_cat: dict[str, str] = {}
    for cat in bt_categories_out:
        for bt in cat["types"]:
            unique_to_new_cat[bt["slug"]] = cat["slug"]

    for cat in categories_out:
        for sub in cat["subcategories"]:
            first_lt = sub["listing_types"][0]["slug"]
            t_key = f"{cat['slug']}/{sub['slug']}/{first_lt}"
            u_slug = triple_to_unique_slug[t_key]
            sub_index[sub["slug"]] = (cat["slug"], first_lt, u_slug)
            # Every subcategory slug itself redirects cleanly when used from a legacy category URL
            sub_redirects[sub["slug"]] = [cat["slug"], sub["slug"], first_lt, u_slug]

    # Carry over all 808 v3 `<v3_cat>/<unique_slug>` services to `[new_10sector_slug, unique_slug]`
    for u_slug, old_v3_cat in v3_cat_by_unique_slug.items():
        new_sec = unique_to_new_cat[u_slug]
        if old_v3_cat != new_sec:
            service_carryover[f"{old_v3_cat}/{u_slug}"] = [new_sec, u_slug]

    v2_snapshot = json.loads(
        subprocess.check_output(
            ["git", "show", "6407b76:shared/business-types.json"],
            cwd=str(ROOT),
        ).decode("utf-8")
    )
    prop_fallbacks = {
        "property-buy-sell": ("real-estate-and-property", "residential-and-commercial-real-estate", "apartment-sales-and-resale"),
        "house-pg-and-room-rentals": ("real-estate-and-property", "residential-and-commercial-real-estate", "paying-guest-and-hostel-rentals"),
        "shop-and-office-space": ("real-estate-and-property", "residential-and-commercial-real-estate", "commercial-office-and-shop-spaces"),
        "contractors-and-civil-work": ("civil-construction-and-contractors", "building-contractors-and-turnkey", "turnkey-home-construction-contractors"),
        "architect-and-interior-designer": ("civil-construction-and-contractors", "architecture-and-civil-engineering", "residential-architects"),
        "building-materials": ("civil-construction-and-contractors", "construction-materials-and-supplies", "cement-and-ready-mix-concrete"),
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
                    t_cat = LEGACY_CATEGORY_ALIASES[v2_cat["slug"]]
                    first_sub = next(c for c in categories_out if c["slug"] == t_cat)["subcategories"][0]
                    t_sub = first_sub["slug"]
                    t_lt = first_sub["listing_types"][0]["slug"]
                    u_slug = triple_to_unique_slug[f"{t_cat}/{t_sub}/{t_lt}"]
            sub_redirects[v2_slug] = [t_cat, t_sub, t_lt, u_slug]
            service_carryover[f"{v2_cat['slug']}/{v2_slug}"] = [t_cat, u_slug]
            for old_svc_key in v2_bt.get("legacy_services") or []:
                service_carryover[old_svc_key] = [t_cat, u_slug]

    assert all(
        pair[1] in used_global_slugs for pair in service_carryover.values()
    ), "Every carry-over service target must exist in the 10-Sector catalogue"

    business_types_data = {
        "version": 4,
        "regulations": REGULATIONS,
        "categories": bt_categories_out,
    }

    legacy_map_data = {
        "version": 3,
        "note": "Generated by scripts/build-business-types.py. Maps v3 (15-cat), v2 (13-cat/81-type), and v0 slugs onto the 10-Sector taxonomy.",
        "categories": LEGACY_CATEGORY_ALIASES,
        "subcategories": sub_redirects,
        "triples": triple_to_unique_slug,
        "catalogue_services": service_carryover,
        "retained_catalogue_categories": ["jobs-careers"],
    }

    return {
        TAXONOMY_OUT: json.dumps(taxonomy_out, ensure_ascii=False, separators=(",", ":")) + "\n",
        IMAGERY_OUT: json.dumps(imagery_out, ensure_ascii=False, indent=2) + "\n",
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
