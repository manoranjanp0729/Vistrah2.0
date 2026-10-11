"""Authoritative radius AND coverage search; no customer point is stored or logged."""
import math

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, case
from sqlalchemy.orm import Session

from .database import get_db
from .security import current_user, member_user
from .models import User, Provider, ProviderService
from .catalogue import active_service
from .provider_routes import eligible_query
from .location_schemas import CustomerLocation, NearbySearch

router = APIRouter(tags=['Location services'])
EARTH_KM = 6371.0088
PAGE_SIZE = 50
# One millimetre absorbs only floating-point error at an inclusive circle edge.
EDGE_KM = 0.000001


def distance_expression(latitude, longitude):
    phi = func.radians(Provider.latitude)
    dphi = func.radians(Provider.latitude - latitude) / 2
    dlambda = func.radians(Provider.longitude - longitude) / 2
    a = func.sin(dphi) * func.sin(dphi) + math.cos(math.radians(latitude)) * func.cos(phi) * func.sin(dlambda) * func.sin(dlambda)
    bounded = case((a > 1, 1.0), (a < 0, 0.0), else_=a)
    return 2 * EARTH_KM * func.asin(func.sqrt(bounded))


@router.get('/me/location')
def saved_location(user: User = Depends(current_user)):
    return {'location': user.saved_location}


@router.put('/me/location')
def save_location(data: CustomerLocation, user: User = Depends(current_user), db: Session = Depends(get_db)):
    user.saved_location = data.model_dump()
    db.commit()
    return {'location': user.saved_location}


@router.delete('/me/location')
def clear_location(user: User = Depends(current_user), db: Session = Depends(get_db)):
    user.saved_location = None
    db.commit()
    return {'location': None}


@router.post('/services/{service_id}/nearby')
def nearby(service_id: int, data: NearbySearch, user: User = Depends(member_user), db: Session = Depends(get_db)):
    active_service(db, service_id)
    distance = distance_expression(data.latitude, data.longitude)
    # Conservative maximum-coverage latitude envelope reduces candidates even for
    # farther businesses. Longitude is intentionally unrestricted at date line/poles.
    envelope = math.degrees(500 / EARTH_KM) + 0.000001
    query = eligible_query(service_id).add_columns(ProviderService.description, distance.label('distance_km')).where(
        Provider.latitude.is_not(None), Provider.longitude.is_not(None),
        Provider.latitude.between(max(-90, data.latitude-envelope), min(90, data.latitude+envelope)),
        ProviderService.coverage_radius_km > 0,
        ProviderService.coverage_radius_km <= 500,
        distance <= ProviderService.coverage_radius_km + EDGE_KM,
    )
    # New nearby discovery also requires a current explicitly owned seller; old
    # member directory remains compatible for legacy businesses without geo data.
    query = query.join(User, User.id == Provider.owner_user_id).where(User.seller_enabled.is_(True))

    def group(near):
        predicate = distance <= data.radius_km + EDGE_KM if near else distance > data.radius_km + EDGE_KM
        rows = db.execute(query.where(predicate).order_by(distance, Provider.id)
            .offset((data.page-1)*PAGE_SIZE).limit(PAGE_SIZE+1)).all()
        items = [{**{key: getattr(p, key) for key in ('id','slug','name','company','location','verification_status','latitude','longitude')},
                  'description': description, 'distance_km': km} for p, description, km in rows[:PAGE_SIZE]]
        return items, len(rows) > PAGE_SIZE

    standard, more_standard = group(True)
    farther, more_farther = group(False)
    return {'nearby': standard, 'also_serves': farther, 'distance_kind': 'straight-line',
            'page': data.page, 'has_more_nearby': more_standard, 'has_more_also_serves': more_farther}
