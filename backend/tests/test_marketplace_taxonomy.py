"""Contract checks for the full 800+ marketplace classification (15 categories, 132 subcategories, 808 listing types)."""
from app.marketplace_taxonomy import legacy_map, master_taxonomy, taxonomy_summary


def test_taxonomy_complete_and_ordered():
    data = master_taxonomy()
    assert [c["slug"] for c in data["categories"]] == [
        "food-and-dining",
        "home-and-everyday-services",
        "shopping-and-local-retail",
        "beauty-fashion-and-lifestyle",
        "automobiles",
        "rental-services",
        "travel-stay-and-experiences",
        "health-fitness-and-wellness",
        "education-and-skills",
        "jobs-and-careers",
        "professional-services",
        "events-and-celebrations",
        "pet-care",
        "agriculture-and-farming",
        "property-and-construction",
    ]
    assert taxonomy_summary() == {
        "version": 1,
        "categories": 15,
        "subcategories": 132,
        "listing_types": 808,
    }
    for category in data["categories"]:
        assert len(category["subcategories"]) >= 3
        for sub in category["subcategories"]:
            assert len(sub["listing_types"]) >= 1
            for lt in sub["listing_types"]:
                assert lt["slug"] and lt["title"]


def test_every_legacy_v2_slug_maps_to_a_current_classification():
    current_triples = {
        (c["slug"], s["slug"], lt["slug"])
        for c in master_taxonomy()["categories"]
        for s in c["subcategories"]
        for lt in s["listing_types"]
    }
    mapping = legacy_map()["subcategories"]
    assert len(mapping) == 81
    assert all(tuple(target[:3]) in current_triples for target in mapping.values())


def test_marketing_hub_is_not_marketplace_category():
    assert "marketing" not in {c["slug"] for c in master_taxonomy()["categories"]}
