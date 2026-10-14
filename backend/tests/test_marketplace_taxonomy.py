"""Contract checks for the complete marketplace classification.

Run with: python -m pytest backend/tests/test_marketplace_taxonomy.py
"""
from app.marketplace_taxonomy import master_taxonomy, taxonomy_summary


def test_taxonomy_complete_and_ordered():
    data = master_taxonomy()
    assert [c["title"] for c in data["categories"]] == [
        "Food & Dining", "Home & Everyday Services", "Shopping & Local Retail",
        "Beauty, Fashion & Lifestyle", "Automobiles", "Rental Services",
        "Travel, Stay & Experiences", "Health, Fitness & Wellness",
        "Education & Skills", "Jobs & Careers", "Professional Services",
        "Events & Celebrations", "Pet Care",
    ]
    assert taxonomy_summary() == {
        "version": 1, "categories": 13, "subcategories": 117, "listing_types": 695
    }
    for category in data["categories"]:
        assert category["subcategories"]
        assert len({s["slug"] for s in category["subcategories"]}) == len(category["subcategories"])
        for sub in category["subcategories"]:
            assert sub["listing_types"]
            assert len({t["slug"] for t in sub["listing_types"]}) == len(sub["listing_types"])


def test_marketing_hub_is_not_marketplace_category():
    assert "marketing" not in {c["slug"] for c in master_taxonomy()["categories"]}
