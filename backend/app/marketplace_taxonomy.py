"""Read-only master taxonomy metadata; never seeds or remaps existing records.

The live catalogue remains backed by categories/subcategories/services until
an audited, separately approved reconciliation of legacy database IDs.
"""
import json
from functools import lru_cache
from pathlib import Path

TAXONOMY_FILE = Path(__file__).resolve().parents[2] / "shared" / "marketplace-taxonomy.json"

@lru_cache(maxsize=1)
def master_taxonomy():
    data = json.loads(TAXONOMY_FILE.read_text(encoding="utf-8"))
    categories = data["categories"]
    assert categories
    assert len({c["slug"] for c in categories}) == len(categories)
    return data

def taxonomy_summary():
    data = master_taxonomy()
    return {
        "version": data["version"],
        "categories": len(data["categories"]),
        "subcategories": sum(len(c["subcategories"]) for c in data["categories"]),
        "listing_types": sum(len(s["listing_types"]) for c in data["categories"] for s in c["subcategories"]),
    }

def resolve_selection(category_slug: str, subcategory_slug: str, listing_type_slug: str):
    """Resolve a complete master-taxonomy selection without touching legacy IDs."""
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
