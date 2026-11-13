"""Classification validation on commerce seller inputs; no database required."""
import pytest
from pydantic import ValidationError
from app.marketplace_taxonomy import master_taxonomy
from app.commerce_routes import ListingInput

def payload(**extra):
    return dict(kind='PRODUCT',title='Example product',description='An example item for reviewed marketplace listing.',unit_price_paise=10000,**extra)

def test_legacy_listing_input_still_allowed():
    assert ListingInput(**payload()).taxonomy_category_slug is None

def test_valid_selection_accepted():
    cat = master_taxonomy()['categories'][0]
    sub = cat['subcategories'][0]
    item = sub['listing_types'][0]
    data = ListingInput(**payload(taxonomy_category_slug=cat['slug'],taxonomy_subcategory_slug=sub['slug'],taxonomy_listing_type_slug=item['slug']))
    assert data.taxonomy_listing_type_slug == item['slug']

def test_partial_and_invalid_selection_rejected():
    with pytest.raises(ValidationError):
        ListingInput(**payload(taxonomy_category_slug='unknown'))
    with pytest.raises(ValidationError):
        ListingInput(**payload(taxonomy_category_slug='unknown',taxonomy_subcategory_slug='unknown',taxonomy_listing_type_slug='unknown'))
