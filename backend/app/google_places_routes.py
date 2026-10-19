"""Google Places discovery for exact catalogue services; no Google data is persisted."""
import json
import os
import math
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .catalogue import active_service
from .database import get_db
from .models import Category, Subcategory, User
from .location_schemas import NearbySearch
from .security import member_user

router = APIRouter(tags=["Google Places discovery"])
GOOGLE_ENDPOINT = "https://places.googleapis.com/v1/places:searchText"


def service_query(db, service):
    category = db.get(Category, service.category_id)
    subcategory = db.get(Subcategory, service.subcategory_id) if service.subcategory_id else None
    # The specific service is the primary search intent; category context disambiguates.
    return " ".join(part for part in (service.title, subcategory.title if subcategory else None, category.title if category else None) if part)


def within_radius(place, latitude, longitude, radius_km):
    point = place.get("location") or {}
    lat, lon = point.get("latitude"), point.get("longitude")
    if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
        return False
    p1, p2 = math.radians(latitude), math.radians(lat)
    dlat, dlon = p2 - p1, math.radians(lon - longitude)
    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlon / 2) ** 2
    return 6371.0088 * 2 * math.asin(min(1, math.sqrt(max(0, a)))) <= radius_km


def google_search(query, latitude, longitude, radius_km, key):
    body = json.dumps({
        "textQuery": query,
        "locationBias": {"circle": {
            "center": {"latitude": latitude, "longitude": longitude},
            "radius": min(radius_km * 1000, 50000)
        }},
        "pageSize": 15,
        "languageCode": "en",
    }).encode("utf-8")
    request = Request(GOOGLE_ENDPOINT, data=body, method="POST", headers={
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.rating,places.userRatingCount",
    })
    with urlopen(request, timeout=5) as response:
        return json.load(response).get("places", [])


@router.post("/services/{service_id}/google-places")
def service_google_places(service_id: int, location: NearbySearch, user: User = Depends(member_user), db: Session = Depends(get_db)):
    service = active_service(db, service_id)
    key = os.environ.get("GOOGLE_PLACES_API_KEY", "").strip()
    if not key:
        return {"status": "unconfigured", "source": "google_places", "places": []}
    try:
        places = google_search(service_query(db, service), location.latitude, location.longitude, location.radius_km, key)
    except (HTTPError, URLError, TimeoutError, ValueError, OSError):
        return {"status": "unavailable", "source": "google_places", "places": []}
    return {"status": "ok", "source": "google_places", "places": [
        {"place_id": p["id"], "name": p.get("displayName", {}).get("text", ""),
         "address": p.get("formattedAddress", ""),
         "latitude": p.get("location", {}).get("latitude"),
         "longitude": p.get("location", {}).get("longitude"),
         "google_maps_url": p.get("googleMapsUri"),
         "rating": p.get("rating"), "rating_count": p.get("userRatingCount"),
         "source": "Google Maps", "verified_service": False}
        for p in places if p.get("id") and p.get("displayName", {}).get("text") and within_radius(p, location.latitude, location.longitude, location.radius_km)
    ]}
