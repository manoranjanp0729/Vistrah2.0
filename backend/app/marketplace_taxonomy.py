"""Read-only master taxonomy metadata (v2: 13 categories -> business types).

Older v1 slugs (14 categories / 126 subcategories / 749 listing types) are still
accepted on read through shared/marketplace-legacy-map.json, so bookmarked links
and listings created before the simplification keep resolving to the matching
business type. Stored rows are only rewritten by app.business_catalogue.
"""
import json
from functools import lru_cache
from pathlib import Path

SHARED = Path(__file__).resolve().parents[2] / "shared"
TAXONOMY_FILE = SHARED / "marketplace-taxonomy.json"
LEGACY_MAP_FILE = SHARED / "marketplace-legacy-map.json"


@lru_cache(maxsize=1)
def master_taxonomy():
    data = json.loads(TAXONOMY_FILE.read_text(encoding="utf-8"))
    categories = data["categories"]
    assert categories
    assert len({c["slug"] for c in categories}) == len(categories)
    return data


@lru_cache(maxsize=1)
def legacy_map():
    if not LEGACY_MAP_FILE.exists():
        return {"categories": {}, "subcategories": {}, "catalogue_services": {}, "retained_catalogue_categories": []}
    return json.loads(LEGACY_MAP_FILE.read_text(encoding="utf-8"))


def taxonomy_summary():
    data = master_taxonomy()
    return {
        "version": data["version"],
        "categories": len(data["categories"]),
        "subcategories": sum(len(c["subcategories"]) for c in data["categories"]),
        "listing_types": sum(len(s["listing_types"]) for c in data["categories"] for s in c["subcategories"]),
    }


def _resolve_current(category_slug: str, subcategory_slug: str, listing_type_slug: str):
    for category in master_taxonomy()["categories"]:
        if category["slug"] != category_slug:
            continue
        for subcategory in category["subcategories"]:
            if subcategory["slug"] != subcategory_slug:
                continue
            for listing_type in subcategory["listing_types"]:
                if listing_type["slug"] == listing_type_slug:
                    return {
                        "category": {"slug": category["slug"], "title": category["title"]},
                        "subcategory": {"slug": subcategory["slug"], "title": subcategory["title"]},
                        "listing_type": {"slug": listing_type["slug"], "title": listing_type["title"]},
                    }
    return None


def canonical_selection(category_slug: str, subcategory_slug: str, listing_type_slug: str):
    """Return the current (category, business type, listing type) slugs for a current or v1 selection."""
    if _resolve_current(category_slug, subcategory_slug, listing_type_slug):
        return category_slug, subcategory_slug, listing_type_slug
    mapped = legacy_map().get("subcategories", {}).get(subcategory_slug)
    if mapped and len(mapped) == 2 and legacy_map().get("categories", {}).get(category_slug):
        new_category, business_type = mapped
        if _resolve_current(new_category, business_type, business_type):
            return new_category, business_type, business_type
    return None


def resolve_selection(category_slug: str, subcategory_slug: str, listing_type_slug: str):
    """Resolve a complete selection, translating v1 slugs without touching stored rows."""
    canonical = canonical_selection(category_slug, subcategory_slug, listing_type_slug)
    return _resolve_current(*canonical) if canonical else None
