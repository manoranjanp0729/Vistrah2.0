"""Read-only taxonomy selection contract tests."""
from app.marketplace_taxonomy import master_taxonomy, resolve_selection

def test_every_master_listing_type_resolves():
    count = 0
    for category in master_taxonomy()["categories"]:
        for subcategory in category["subcategories"]:
            for listing_type in subcategory["listing_types"]:
                resolved = resolve_selection(category["slug"], subcategory["slug"], listing_type["slug"])
                assert resolved is not None
                assert resolved["listing_type"]["title"] == listing_type["title"]
                count += 1
    assert count == 695

def test_unknown_or_cross_category_selection_rejected():
    categories = master_taxonomy()["categories"]
    first = categories[0]
    second = categories[1]
    sub = first["subcategories"][0]
    item = sub["listing_types"][0]
    assert resolve_selection(first["slug"], sub["slug"], item["slug"]) is not None
    assert resolve_selection(second["slug"], sub["slug"], item["slug"]) is None
    assert resolve_selection(first["slug"], sub["slug"], "not-a-listing-type") is None
