from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class MembershipCheckoutRequest(BaseModel):
    plan_slug: str = Field(min_length=1, max_length=100)


class ServiceCheckoutRequest(BaseModel):
    application_id: UUID


class SandboxOutcomeRequest(BaseModel):
    outcome: Literal["success", "failure"]


class MembershipPlanCreate(BaseModel):
    slug: str = Field(min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")
    name: str = Field(min_length=2, max_length=160)
    description: str = ""
    amount_paise: int = Field(gt=0, le=100_000_000)
    billing_interval: Literal["MONTHLY"] = "MONTHLY"
    status: Literal["ACTIVE", "INACTIVE"] = "ACTIVE"


class MembershipPlanUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = None
    amount_paise: int | None = Field(default=None, gt=0, le=100_000_000)
    status: Literal["ACTIVE", "INACTIVE"] | None = None


class OfferCreate(BaseModel):
    name: str = Field(min_length=2, max_length=180)
    description: str = ""
    category_slug: str | None = None
    subcategory_slug: str | None = None
    service_slug: str | None = None
    provider_id: UUID | None = None
    benefit_type: Literal["PERCENTAGE", "FIXED_AMOUNT", "MEMBER_PRICE"]
    benefit_value: int = Field(gt=0)
    starts_at: datetime
    ends_at: datetime | None = None
    active: bool = False
    terms: str = ""

    @model_validator(mode="after")
    def validate_offer_scope(self):
        if not any((self.category_slug, self.subcategory_slug, self.service_slug, self.provider_id)):
            raise ValueError("An offer must target at least one category, subcategory, service, or provider")
        if self.benefit_type == "PERCENTAGE" and self.benefit_value > 100:
            raise ValueError("Percentage offer cannot exceed 100")
        return self


class OfferUpdate(BaseModel):
    active: bool | None = None
    ends_at: datetime | None = None
    terms: str | None = None


class SettlementRuleTargetInput(BaseModel):
    recipient_id: UUID
    basis: Literal["PERCENTAGE", "FIXED_AMOUNT"]
    basis_points: int | None = Field(default=None, ge=1, le=10000)
    fixed_amount_paise: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def validate_basis(self):
        if self.basis == "PERCENTAGE" and (self.basis_points is None or self.fixed_amount_paise is not None):
            raise ValueError("Percentage targets require basis_points only")
        if self.basis == "FIXED_AMOUNT" and (self.fixed_amount_paise is None or self.basis_points is not None):
            raise ValueError("Fixed targets require fixed_amount_paise only")
        return self


class SettlementRuleCreate(BaseModel):
    name: str = Field(min_length=2, max_length=180)
    transaction_type: Literal["MEMBERSHIP", "SERVICE"]
    category_slug: str | None = None
    subcategory_slug: str | None = None
    service_slug: str | None = None
    provider_id: UUID | None = None
    priority: int = Field(default=0, ge=0, le=10000)
    effective_from: datetime | None = None
    effective_until: datetime | None = None
    targets: list[SettlementRuleTargetInput] = Field(min_length=1, max_length=20)


class RecipientCreate(BaseModel):
    recipient_key: str = Field(min_length=2, max_length=180, pattern=r"^[a-zA-Z0-9._:-]+$")
    recipient_type: Literal["VISTRAH", "SERVICE_PROVIDER", "EMPLOYEE_INCENTIVE", "OTHER_APPROVED_RECIPIENT"]
    provider_id: UUID | None = None
    user_id: UUID | None = None
    onboarding_status: Literal["NOT_STARTED"] = "NOT_STARTED"
    verification_status: Literal["PENDING"] = "PENDING"
    settlement_eligible: Literal[False] = False
    active: bool = True

    @model_validator(mode="after")
    def validate_identity(self):
        if self.recipient_type == "SERVICE_PROVIDER" and self.provider_id is None:
            raise ValueError("Service provider recipients require provider_id")
        if self.recipient_type == "EMPLOYEE_INCENTIVE" and self.user_id is None:
            raise ValueError("Employee incentive recipients require user_id")
        return self


class RecipientUpdate(BaseModel):
    active: bool | None = None


class RefundRequest(BaseModel):
    amount_paise: int = Field(gt=0)
    reason: str = Field(min_length=2, max_length=500)
    idempotency_key: str | None = Field(default=None, max_length=180)


