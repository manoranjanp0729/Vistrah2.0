"""Pure V Ads targeting policy; no persistence, providers or runtime wiring."""
import math
from numbers import Real
from typing import Literal

EARTH_KM = 6371.0088
DEFAULT_DISCOVERY_RADIUS_KM = 2.0
# Same one-millimetre floating-point edge allowance as location_routes.
EDGE_KM = 0.000001
# Geometric limit, not a commercial tier: maximum shortest surface distance.
MAX_RADIUS_KM = math.pi * EARTH_KM
DEG_PER_KM = 180.0 / MAX_RADIUS_KM


def _finite(value: float) -> float:
    if isinstance(value, bool) or not isinstance(value, Real):
        raise ValueError('Expected a finite number')
    try:
        result = float(value)
    except (OverflowError, ValueError):
        raise ValueError('Expected a finite number') from None
    if not math.isfinite(result):
        raise ValueError('Expected a finite number')
    return result


def validate_point(latitude: float, longitude: float) -> tuple[float, float]:
    latitude, longitude = _finite(latitude), _finite(longitude)
    if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
        raise ValueError('Coordinates outside geographic range')
    return latitude, longitude


def validate_radius(radius_km: float) -> float:
    """Accept (0, half Earth circumference]; no product radius tiers implied."""
    radius = _finite(radius_km)
    if not 0 < radius <= MAX_RADIUS_KM:
        raise ValueError('Radius outside geometric range')
    return radius


def distance_km(latitude: float, longitude: float,
                other_latitude: float, other_longitude: float) -> float:
    """Shortest great-circle distance on the existing mean-radius Earth model."""
    latitude, longitude = validate_point(latitude, longitude)
    other_latitude, other_longitude = validate_point(other_latitude, other_longitude)
    phi, other_phi = math.radians(latitude), math.radians(other_latitude)
    delta_phi = (other_phi - phi) / 2
    delta_lambda = math.radians((other_longitude - longitude + 180) % 360 - 180) / 2
    # Exact poles have no longitude; avoid cos(pi/2) round-off there.
    cosine = 0.0 if abs(latitude) == 90 else math.cos(phi)
    other_cosine = 0.0 if abs(other_latitude) == 90 else math.cos(other_phi)
    a = math.sin(delta_phi) ** 2 + cosine * other_cosine * math.sin(delta_lambda) ** 2
    return 2 * EARTH_KM * math.asin(math.sqrt(min(1.0, max(0.0, a))))


def bounding_box(latitude: float, longitude: float,
                 radius_km: float) -> tuple[float, float, float, float]:
    """Lossless spherical (min_lat, max_lat, min_lon, max_lon) envelope."""
    lat, lon = validate_point(latitude, longitude)
    radius = validate_radius(radius_km) + EDGE_KM
    angular = radius / EARTH_KM
    if angular >= math.pi:
        return -90.0, 90.0, -180.0, 180.0
    delta_lat = math.degrees(angular) + 1e-7
    min_lat = max(-90.0, lat - delta_lat)
    max_lat = min(90.0, lat + delta_lat)
    if min_lat <= -90.0 or max_lat >= 90.0 or angular >= math.pi / 2:
        return min_lat, max_lat, -180.0, 180.0
    cos_lat = math.cos(math.radians(lat))
    sin_lon = 1.0 if cos_lat <= 0 else math.sin(angular) / cos_lat
    if sin_lon >= 1.0:
        return min_lat, max_lat, -180.0, 180.0
    delta_lon = math.degrees(math.asin(sin_lon)) + 1e-7
    min_lon = lon - delta_lon
    max_lon = lon + delta_lon
    if min_lon < -180.0 or max_lon > 180.0:
        return min_lat, max_lat, -180.0, 180.0
    return min_lat, max_lat, min_lon, max_lon


def classify_targeting(customer_latitude: float, customer_longitude: float,
                       campaign_latitude: float, campaign_longitude: float,
                       targeting_radius_km: float,
                       discovery_radius_km: float = DEFAULT_DISCOVERY_RADIUS_KM,
                       ) -> Literal['local', 'farther'] | None:
    """None means ineligible. Both inclusive edges allow only 1 mm round-off."""
    targeting_radius = validate_radius(targeting_radius_km)
    discovery_radius = validate_radius(discovery_radius_km)
    distance = distance_km(customer_latitude, customer_longitude,
                           campaign_latitude, campaign_longitude)
    if distance > targeting_radius + EDGE_KM:
        return None
    return 'local' if distance <= discovery_radius + EDGE_KM else 'farther'
