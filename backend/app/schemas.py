import re
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

class Schema(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)

class Register(Schema):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)

class Login(Schema):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

class GoogleAuth(Schema):
    credential: str | None = Field(default=None, max_length=4096)
    id_token: str | None = Field(default=None, max_length=4096)

class Profile(Schema):
    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(default='', max_length=20, pattern=r'^[+\d\s-]*$')

class RequestCreate(Schema):
    service_id: int = Field(gt=0)
    requirements: str = Field(min_length=20, max_length=5000)
    location: str = Field(min_length=2, max_length=200)
    postal_code: str = Field(default='', pattern=r'^(|[0-9]{6})$')
    service_address: str | None = Field(default=None, min_length=3, max_length=1000)
    phone: str = Field(min_length=10, max_length=20, pattern=r'^\+?[\d\s-]+$')

class StatusUpdate(Schema):
    status: Literal['NEW','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED']

class ProviderInput(Schema):
    slug: str = Field(pattern=r'^[a-z0-9]+(?:-[a-z0-9]+)*$', max_length=100)
    name: str = Field(min_length=2, max_length=150)
    company: str = Field(min_length=2, max_length=150)
    email: EmailStr
    phone: str = Field(min_length=10, max_length=20, pattern=r'^\+?[\d\s-]+$')
    address: str = Field(min_length=3, max_length=1000)
    location: str = Field(min_length=2, max_length=150)
    source_url: str = Field(default='', max_length=2000)
    provenance: str = Field(min_length=5, max_length=2000)
    @field_validator('source_url')
    @classmethod
    def safe_url(cls, value):
        if value and not re.match(r'^https?://[^\s]+$', value):
            raise ValueError('Use a http or https source URL')
        return value

class ProviderTransition(Schema):
    status: Literal['PENDING','VERIFIED','REJECTED','INACTIVE']
    evidence: str = Field(min_length=10, max_length=3000)

class ActiveUpdate(Schema):
    active: bool

class Association(Schema):
    service_ids: list[int] = Field(max_length=100)

class CatalogueInput(Schema):
    slug: str = Field(pattern=r'^[a-z0-9]+(?:-[a-z0-9]+)*$', max_length=100)
    title: str = Field(min_length=2, max_length=150)
    description: str = Field(min_length=10, max_length=3000)
    active: bool = True
    category_id: int | None = None
    subcategory_id: int | None = None
    image: str = '/images/service.svg'
    includes: list[str] = Field(default_factory=list, max_length=20)
    member_information: list[str] | None = Field(default=None, max_length=20)
    popular: bool = False
    @field_validator('image')
    @classmethod
    def local_image(cls, value):
        if value not in {f'/images/{name}.svg' for name in ['service','career','property','construction','marketing','finance','technology','business','home','outdoor']}:
            raise ValueError('Select an inventoried local illustration')
        return value
    @field_validator('slug')
    @classmethod
    def reserved_slug(cls, value):
        if value in {'service','companies','request'}:
            raise ValueError('This route segment is reserved')
        return value

class OfferInput(Schema):
    title: str = Field(min_length=2, max_length=150)
    scope: Literal['ALL','CATEGORY','SERVICE','PROVIDER']
    target_id: int | None = None
    type: Literal['PERCENT','FIXED']
    value: int = Field(gt=0, le=10000000)
    terms: str = Field(min_length=10, max_length=3000)
    starts_at: datetime
    ends_at: datetime
    active: bool = True
    @model_validator(mode='after')
    def validate_dates(self):
        if self.starts_at.tzinfo is None or self.ends_at.tzinfo is None:
            raise ValueError('Dates must include a timezone')
        if self.ends_at <= self.starts_at:
            raise ValueError('End date must follow start date')
        if self.type == 'PERCENT' and self.value > 100:
            raise ValueError('Percentage must be at most 100')
        if (self.scope == 'ALL') != (self.target_id is None):
            raise ValueError('Select a target for scoped offers; ALL has no target')
        return self

class CheckoutInput(Schema):
    idempotency_key: str = Field(min_length=16, max_length=100, pattern=r'^[a-zA-Z0-9_-]+$')

class SandboxOutcome(Schema):
    outcome: Literal['SUCCEEDED','FAILED']

class PaymentEvent(Schema):
    event_id: str = Field(min_length=10, max_length=100)
    payment_id: str = Field(max_length=64)
    amount: int = Field(gt=0)
    currency: Literal['INR']
    status: Literal['SUCCEEDED','FAILED']
    timestamp: int

class RefundInput(Schema):
    reason: str = Field(min_length=10, max_length=1000)
