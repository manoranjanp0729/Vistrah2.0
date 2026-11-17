"""Contract checks for the simplified marketplace classification (v2).

Run with: python -m pytest backend/tests/test_marketplace_taxonomy.py
"""
from app.marketplace_taxonomy import legacy_map, master_taxonomy, taxonomy_summary


def test_taxonomy_complete_and_ordered():
    data = master_taxonomy()
    assert [c["title"] for c in data["categories"]] == [
        "Food & Dining", "Home Services", "Shops & Retail", "Beauty & Personal Care",
        "Health & Fitness", "Vehicles", "Property & Construction", "Rentals",
        "Travel & Stay", "Education & Training", "Events & Celebrations",
        "Professional & Business Services", "Agriculture & Farming",
    ]
    assert taxonomy_summary() == {"version": 2, "categories": 13, "subcategories": 81, "listing_types": 81}
    all_types = set()
    for category in data["categories"]:
        assert 4 <= len(category["subcategories"]) <= 8
        for sub in category["subcategories"]:
            # Two levels for customers: each business type carries exactly one implicit listing type.
            assert sub["listing_types"] == [{"slug": sub["slug"], "title": sub["title"]}]
            assert sub["slug"] not in all_types
            all_types.add(sub["slug"])


def test_every_legacy_subcategory_maps_to_a_current_business_type():
    current = {(c["slug"], s["slug"]) for c in master_taxonomy()["categories"] for s in c["subcategories"]}
    mapping = legacy_map()["subcategories"]
    assert len(mapping) == 126
    assert all(tuple(target) in current for target in mapping.values())


def test_marketing_hub_is_not_marketplace_category():
    assert "marketing" not in {c["slug"] for c in master_taxonomy()["categories"]}
