"""Location values never enter URL query parameters or enquiry coordinates."""
from typing import Literal
from pydantic import Field
from .provider_requirements import SafeModel


class BusinessPin(SafeModel):
    latitude: float = Field(ge=-90, le=90, strict=True)
    longitude: float = Field(ge=-180, le=180, strict=True)


class ServiceCoverage(SafeModel):
    # First geometry: a reviewed geodesic circle around the physical business pin.
    coverage_radius_km: float = Field(gt=0, le=500, strict=True)


class CustomerLocation(BusinessPin):
    locality: str = Field(min_length=2, max_length=150)
    postal_code: str = Field(default='', pattern=r'^(|[0-9]{6})$')
    address: str = Field(default='', max_length=500)
    landmark: str = Field(default='', max_length=200)


class NearbySearch(BusinessPin):
    radius_km: Literal[2, 5, 10, 25] = 5
    page: int = Field(default=1, ge=1, le=1000)
