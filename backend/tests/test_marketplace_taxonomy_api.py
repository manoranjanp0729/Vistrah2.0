"""API contract: taxonomy is public and does not mutate existing catalogue data."""
from fastapi.testclient import TestClient
from app.main import app

def test_marketplace_taxonomy_public_and_complete():
    response = TestClient(app).get("/marketplace/taxonomy")
    assert response.status_code == 200
    payload = response.json()
    assert payload["version"] == 1
    assert len(payload["categories"]) == 13
    assert sum(len(c["subcategories"]) for c in payload["categories"]) == 117
    assert sum(len(s["listing_types"]) for c in payload["categories"] for s in c["subcategories"]) == 695
    assert all("id" not in c for c in payload["categories"])
