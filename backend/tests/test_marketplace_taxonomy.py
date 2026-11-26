"""Contract checks for the 10-category, 60-subcategory 2-level VISTRAH marketplace classification."""
import json
from pathlib import Path

from app.marketplace_taxonomy import legacy_map, master_taxonomy, taxonomy_summary

SHARED = Path(__file__).resolve().parents[2] / "shared"


def test_taxonomy_complete_and_ordered():
    data = master_taxonomy()
    assert [c["slug"] for c in data["categories"]] == [
        "restaurants-and-dining",
        "hotels-and-stay",
        "vehicle-rentals",
        "event-management",
        "hospitals-and-labs",
        "education-and-skills",
        "salons-and-beauty-parlour",
        "civil-and-construction",
        "fuel-and-charging-stations",
        "vibe-finder",
    ]
    assert taxonomy_summary() == {
        "version": 6,
        "categories": 10,
        "subcategories": 60,
        "listing_types": 60,
    }
    seen_slugs: set[str] = set()
    imagery = json.loads((SHARED / "marketplace-imagery.json").read_text(encoding="utf-8"))
    for category in data["categories"]:
        assert len(category["subcategories"]) >= 5
        assert f"category/{category['slug']}" in imagery["items"]
        for sub in category["subcategories"]:
            assert sub["slug"] not in seen_slugs
            seen_slugs.add(sub["slug"])
            assert sub["listing_types"] == [{"slug": sub["slug"], "title": sub["title"]}]
            assert f"subcategory/{category['slug']}/{sub['slug']}" in imagery["items"]
            assert f"type/{category['slug']}/{sub['slug']}/{sub['slug']}" in imagery["items"]
            assert sub["slug"] in imagery["assets"]


def test_removed_verticals_never_present():
    forbidden = {
        "v-essentials",
        "agri-connect",
        "agriconnect",
        "health-connect",
        "healthconnect",
        "agriculture-and-farming",
        "marketing",
    }
    all_slugs = {
        c["slug"] for c in master_taxonomy()["categories"]
    } | {
        s["slug"]
        for c in master_taxonomy()["categories"]
        for s in c["subcategories"]
    }
    assert all_slugs.isdisjoint(forbidden)
    assert isinstance(legacy_map()["subcategories"], dict)
