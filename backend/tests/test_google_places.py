"""Unit checks for Google Places search boundaries and service relevance."""
from types import SimpleNamespace

from app.google_places_routes import service_query, within_radius


def test_radius_includes_center_and_excludes_distant_places():
    center = {"location": {"latitude": 12.9716, "longitude": 77.5946}}
    distant = {"location": {"latitude": 13.0827, "longitude": 80.2707}}
    assert within_radius(center, 12.9716, 77.5946, 2)
    assert not within_radius(distant, 12.9716, 77.5946, 25)


def test_radius_rejects_missing_coordinates():
    assert not within_radius({"location": {}}, 12.9716, 77.5946, 5)


def test_query_uses_specific_service_and_taxonomy():
    service = SimpleNamespace(title="Water Heater Repair", category_id=1, subcategory_id=2)
    category = SimpleNamespace(title="Home Services")
    subcategory = SimpleNamespace(title="Plumbing")
    class Database:
        def get(self, model, id):
            return {1: category, 2: subcategory}[id]
    assert service_query(Database(), service) == "Water Heater Repair Plumbing Home Services"


def test_radius_rejects_nonfinite_coordinates():
    assert not within_radius({"location": {"latitude": float("nan"), "longitude": 77.59}}, 12.97, 77.59, 5)


def test_radius_includes_small_nearby_offset():
    close = {"location": {"latitude": 12.972, "longitude": 77.595}}
    assert within_radius(close, 12.9716, 77.5946, 2)
