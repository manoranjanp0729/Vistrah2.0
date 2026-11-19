"""Streamlined 3-step self-onboarding endpoints for the 10-Sector / 814-type catalogue."""
from __future__ import annotations

import copy
import hashlib
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import EmailStr, Field, model_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .business_catalogue import business_types, ensure_business_type_service
from .catalogue import serialize
from .database import get_db
from .marketplace_nearby_routes import normalize_website_url
from .marketplace_taxonomy import master_taxonomy
from .models import Audit, Provider, ProviderService, User, now
from .provider_models import (
    ProviderApplication,
    ProviderApplicationService,
    ProviderDocument,
)
from .provider_requirements import (
    Declaration,
    RequirementField,
    Requirements,
    SafeModel,
    Section,
    validate_answers,
)
from .provider_routes import detail, event, inspect_file
from .schemas import DEFAULT_PRIVACY_POLICY_VERSION
from .security import current_user, resolve_user_payload
from .v_ads_account_routes import ensure_seller_v_ads_account

router = APIRouter(tags=["Self-onboarding"])

SIMPLIFIED_COMMON = Requirements(
    sections=[
        Section(
            id="business",
            title="Business basics",
            fields=[
                RequirementField(id="legal_name", label="Business or shop name", type="text", required=True, min_length=2, max_length=150),
                RequirementField(id="contact_name", label="Contact person name", type="text", required=True, min_length=2, max_length=150),
                RequirementField(id="phone", label="Business contact number", type="text", format="phone", required=True, max_length=20),
                RequirementField(id="whatsapp", label="WhatsApp number (optional)", type="text", format="phone", required=False, max_length=20),
                RequirementField(id="email", label="Business email", type="text", format="email", required=True, max_length=254),
                RequirementField(id="address", label="Business address", type="address", required=True, min_length=5, max_length=1000),
                RequirementField(id="location", label="Primary operating locality / town", type="text", required=True, min_length=2, max_length=150),
                RequirementField(id="pincode", label="PIN code (optional)", type="text", required=False, max_length=10),
                RequirementField(id="latitude", label="Map latitude", type="number", minimum=-90, maximum=90, required=False),
                RequirementField(id="longitude", label="Map longitude", type="number", minimum=-180, maximum=180, required=False),
                RequirementField(id="coverage_radius_km", label="Service coverage radius (km)", type="number", minimum=1, maximum=200, required=False),
                RequirementField(id="timings", label="Working hours / timings (optional)", type="text", required=False, max_length=200),
                RequirementField(id="place_id", label="Google Place ID (optional)", type="text", required=False, max_length=160),
                RequirementField(id="website_url", label="Business website URL (optional)", type="text", required=False, max_length=500),
                RequirementField(id="instagram_url", label="Instagram URL (optional)", type="text", required=False, max_length=500),
                RequirementField(id="facebook_url", label="Facebook URL (optional)", type="text", required=False, max_length=500),
            ],
        )
    ],
    declarations=[
        Declaration(id="accuracy", label="I confirm these business details are accurate and I am authorized to submit them."),
        Declaration(id="consent", label="I consent to VISTRAH reviewing these details and any optional licence documents before listing."),
    ],
    checklist=[
        Declaration(id="identity", label="Applicant identity, location pin and business basics reviewed"),
    ],
)


class RegulatedDocumentUpload(SafeModel):
    filename: str = Field(min_length=1, max_length=180)
    media_type: str = Field(min_length=3, max_length=60)
    content_base64: str = Field(min_length=4, max_length=2800000)


class RegulatedInfoInput(SafeModel):
    registration_number: str = Field(default="", max_length=100)
    document: RegulatedDocumentUpload | None = None


class SelfOnboardingSubmit(SafeModel):
    business_types: list[str] = Field(min_length=1, max_length=3)
    business_name: str = Field(min_length=2, max_length=150)
    contact_name: str = Field(min_length=2, max_length=150)
    phone: str = Field(min_length=10, max_length=20, pattern=r"^\+?[0-9 ()-]{10,20}$")
    whatsapp: str = Field(default="", max_length=20)
    email: EmailStr | None = None
    address: str = Field(min_length=5, max_length=1000)
    location: str = Field(min_length=2, max_length=150)
    pincode: str = Field(default="", max_length=10, pattern=r"^(|[0-9]{6})$")
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    coverage_radius_km: float = Field(default=10, ge=1, le=200)
    timings: str = Field(default="", max_length=200)
    description: str = Field(default="", max_length=1000)
    regulations: dict[str, RegulatedInfoInput] = Field(default_factory=dict)
    accept_terms: bool
    privacy_policy_version: str | None = Field(default=None, min_length=1, max_length=32, pattern=r"^[A-Za-z0-9._-]+$")
    marketing_consent: bool | None = None
    provider_id: int | None = Field(default=None, gt=0)
    place_id: str | None = Field(default=None, max_length=160, pattern=r"^[A-Za-z0-9_-]{1,160}$")
    google_place_id: str | None = Field(default=None, max_length=160, pattern=r"^[A-Za-z0-9_-]{1,160}$")
    website_url: str = Field(default="", max_length=500)
    instagram_url: str = Field(default="", max_length=500)
    facebook_url: str = Field(default="", max_length=500)
    source_place_snapshot: dict | None = None

    @model_validator(mode="after")
    def validate_selection_and_whatsapp(self):
        if len(set(self.business_types)) != len(self.business_types):
            raise ValueError("Select each business type at most once")
        for slug in self.business_types:
            if not slug or len(slug) > 100:
                raise ValueError("Invalid business type")
        if self.whatsapp:
            import re
            if not re.fullmatch(r"\+?[0-9 ()-]{10,20}", self.whatsapp):
                raise ValueError("Enter a valid WhatsApp contact number")
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Provide both latitude and longitude together")
        if self.source_place_snapshot is not None and len(json.dumps(self.source_place_snapshot)) > 8000:
            raise ValueError("Place snapshot is too large")
        return self


@router.get("/provider-onboarding/catalogue")
def get_self_onboarding_catalogue(user: User = Depends(current_user)):
    source = business_types()
    categories = []
    for cat in source["categories"]:
        categories.append({
            "slug": cat["slug"],
            "title": cat["title"],
            "description": cat["description"],
            "types": [
                {
                    "slug": bt["slug"],
                    "listing_type_slug": bt.get("listing_type_slug", bt["slug"]),
                    "subcategory_slug": bt.get("subcategory_slug", ""),
                    "subcategory_title": bt.get("subcategory_title", cat["title"]),
                    "title": bt["title"],
                    "description": bt["description"],
                    "regulated": bt.get("regulated"),
                    "keywords": list(bt.get("keywords") or []),
                }
                for bt in cat["types"]
            ],
        })
    return {
        "categories": categories,
        "regulations": source["regulations"],
        "max_business_types": 3,
    }


@router.post("/provider-onboarding/submit", status_code=201)
@router.post("/seller/onboard", status_code=201)
@router.post("/api/seller/onboard", status_code=201)
def submit_self_onboarding(
    data: SelfOnboardingSubmit,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if not data.accept_terms:
        raise HTTPException(422, "Accept the seller terms, privacy notice and accuracy confirmation before submitting.")

    unknown_reg_keys = set(data.regulations) - set(data.business_types)
    if unknown_reg_keys:
        raise HTTPException(422, "Regulation details may only be supplied for selected business types.")

    raw_place = (data.place_id or data.google_place_id or "").strip()
    if raw_place.startswith("gp_") and len(raw_place) > 3:
        raw_place = raw_place[3:]
    effective_place_id = raw_place or None

    clean_website = None
    if data.website_url.strip():
        clean_website = normalize_website_url(data.website_url)
        if not clean_website:
            raise HTTPException(422, "Enter a valid public website URL")
    clean_instagram = None
    if data.instagram_url.strip():
        clean_instagram = normalize_website_url(data.instagram_url)
        if not clean_instagram:
            raise HTTPException(422, "Enter a valid Instagram URL")
    clean_facebook = None
    if data.facebook_url.strip():
        clean_facebook = normalize_website_url(data.facebook_url)
        if not clean_facebook:
            raise HTTPException(422, "Enter a valid Facebook URL")

    db.scalar(select(User).where(User.id == user.id).with_for_update())

    provider = None
    if data.provider_id is not None:
        provider = db.scalar(
            select(Provider).where(Provider.id == data.provider_id, Provider.owner_user_id == user.id).with_for_update()
        )
        if not provider:
            raise HTTPException(404, "Owned business not found")

    if effective_place_id:
        existing_place_provider = db.scalar(
            select(Provider).where(Provider.google_place_id == effective_place_id).with_for_update()
        )
        if existing_place_provider:
            if existing_place_provider.owner_user_id != user.id:
                raise HTTPException(
                    409,
                    "This Google Place listing has already been claimed. Contact VISTRAH support for ownership review.",
                )
            if provider is None:
                provider = existing_place_provider

    resolved_items = []
    total_new_docs = 0
    for slug in data.business_types:
        ensured = ensure_business_type_service(db, slug)
        if not ensured:
            raise HTTPException(422, f"Unknown business type: {slug}")
        category, service, requirement, _cat_def, bt_def = ensured
        if provider and db.get(ProviderService, (provider.id, service.id)):
            raise HTTPException(
                409,
                f"This business already has a record for {service.title}. Manage it from Seller Dashboard instead of creating a duplicate.",
            )
        reg_input = data.regulations.get(slug)
        if reg_input and not bt_def.get("regulated") and (reg_input.registration_number or reg_input.document):
            raise HTTPException(422, f"{service.title} does not require licence documents.")
        inspected_doc = None
        if reg_input and reg_input.document:
            inspected_doc = inspect_file(reg_input.document)
            total_new_docs += 1
        resolved_items.append((category, service, requirement, bt_def, reg_input, inspected_doc))

    if total_new_docs:
        existing_docs = db.scalar(
            select(func.count())
            .select_from(ProviderDocument)
            .join(ProviderApplication)
            .where(ProviderApplication.user_id == user.id)
        ) or 0
        if existing_docs + total_new_docs > 100:
            raise HTTPException(409, "Private document quota reached. Contact VISTRAH for review.")

    # Record seller DPDP consent & enable seller workspace so owner can immediately track status.
    consent_ts = now()
    policy_ver = data.privacy_policy_version or user.privacy_policy_version or DEFAULT_PRIVACY_POLICY_VERSION
    if not user.privacy_policy_version or data.privacy_policy_version:
        user.privacy_policy_version = policy_ver
        user.privacy_consented_at = consent_ts
    user.seller_terms_version = policy_ver
    user.seller_consented_at = consent_ts
    if data.marketing_consent is not None:
        user.marketing_consent = bool(data.marketing_consent)
        user.marketing_consented_at = consent_ts if data.marketing_consent else None
    ensure_seller_v_ads_account(db, user)
    if not user.seller_enabled:
        user.seller_enabled = True
        db.add(
            Audit(
                actor_id=user.id,
                action="SELLER_ENABLED",
                entity="user",
                entity_id=str(user.id),
                details={"seller_terms_version": policy_ver, "marketing_consent": bool(user.marketing_consent)},
            )
        )

    common_answers: dict = {
        "legal_name": data.business_name,
        "contact_name": data.contact_name,
        "phone": data.phone,
        "email": str(data.email or user.email),
        "address": data.address,
        "location": data.location,
        "coverage_radius_km": float(data.coverage_radius_km),
        "accuracy": True,
        "consent": True,
    }
    if data.whatsapp:
        common_answers["whatsapp"] = data.whatsapp
    if data.pincode:
        common_answers["pincode"] = data.pincode
    if data.latitude is not None and data.longitude is not None:
        common_answers["latitude"] = float(data.latitude)
        common_answers["longitude"] = float(data.longitude)
    if data.timings:
        common_answers["timings"] = data.timings
    if effective_place_id:
        common_answers["place_id"] = effective_place_id
    if clean_website:
        common_answers["website_url"] = clean_website
    if clean_instagram:
        common_answers["instagram_url"] = clean_instagram
    if clean_facebook:
        common_answers["facebook_url"] = clean_facebook

    common_errors = validate_answers(SIMPLIFIED_COMMON, common_answers, complete=True)
    if common_errors:
        raise HTTPException(
            422,
            {"message": "Complete the required business basics", "errors": [{**e, "field": "common." + e["field"]} for e in common_errors]},
        )

    # Create or update the seller's Provider record when claiming a Google Place (or updating an owned provider)
    # so the owner immediately unlocks their own Business Growth & Audit Landing Page while public listing stays PENDING review.
    if provider is None and effective_place_id:
        provider = Provider(
            owner_user_id=user.id,
            slug=f"seller-{uuid.uuid4()}",
            name=data.contact_name,
            company=data.business_name,
            email=str(data.email or user.email),
            phone=data.phone,
            address=data.address,
            location=data.location,
            latitude=float(data.latitude) if data.latitude is not None else None,
            longitude=float(data.longitude) if data.longitude is not None else None,
            google_place_id=effective_place_id,
            website_url=clean_website,
            instagram_url=clean_instagram,
            facebook_url=clean_facebook,
            source_place_snapshot=data.source_place_snapshot,
            provenance=f"Google Place claim via self-onboarding ({effective_place_id})",
            verification_status="PENDING",
            active=False,
        )
        db.add(provider)
        db.flush()
    elif provider is not None:
        if effective_place_id and not provider.google_place_id:
            provider.google_place_id = effective_place_id
        if clean_website:
            provider.website_url = clean_website
        if clean_instagram:
            provider.instagram_url = clean_instagram
        if clean_facebook:
            provider.facebook_url = clean_facebook
        if data.source_place_snapshot is not None:
            provider.source_place_snapshot = data.source_place_snapshot
        if provider.latitude is None and data.latitude is not None and data.longitude is not None:
            provider.latitude = float(data.latitude)
            provider.longitude = float(data.longitude)

    # Group selected business types by category_id while preserving order.
    grouped: dict[int, list] = {}
    for item in resolved_items:
        grouped.setdefault(item[0].id, []).append(item)

    created_apps: list[ProviderApplication] = []
    ts = now()
    for category_id, items in grouped.items():
        app = ProviderApplication(
            id=str(uuid.uuid4()),
            user_id=user.id,
            provider_id=provider.id if provider else None,
            category_id=category_id,
            common=copy.deepcopy(common_answers),
            common_configuration=SIMPLIFIED_COMMON.model_dump(),
            status="SUBMITTED",
            revision=2,
            submitted_at=ts,
            updated_at=ts,
        )
        db.add(app)
        db.flush()
        event(db, app, user, "CREATED", details={"flow": "self_onboarding_v2"})

        service_rows = []
        for _category, service, requirement, bt_def, reg_input, inspected_doc in items:
            answers: dict = {"listing_accuracy": True}
            if data.description:
                answers["offer_summary"] = data.description
            doc_id = None
            if bt_def.get("regulated") and reg_input:
                if reg_input.registration_number:
                    answers["registration_number"] = reg_input.registration_number
                if inspected_doc:
                    content, kind = inspected_doc
                    doc_id = str(uuid.uuid4())
                    doc = ProviderDocument(
                        id=doc_id,
                        application_id=app.id,
                        service_id=service.id,
                        field_id="registration_document",
                        filename=f"{doc_id}.{kind[0]}",
                        media_type=kind[1],
                        sha256=hashlib.sha256(content).hexdigest(),
                        content=content,
                    )
                    db.add(doc)
                    db.flush()
                    answers["registration_document"] = doc_id
                    event(db, app, user, "DOCUMENT_UPLOADED", service_id=service.id, details={"document_id": doc_id})

            cfg = Requirements.model_validate(requirement.configuration)
            svc_errors = validate_answers(
                cfg,
                answers,
                complete=True,
                document_check=lambda field_id, uploaded_id, expected=doc_id: field_id == "registration_document" and expected is not None and uploaded_id == expected,
            )
            if svc_errors:
                raise HTTPException(
                    422,
                    {"message": f"Invalid details for {service.title}", "errors": [{**e, "field": f"{service.id}.{e['field']}"} for e in svc_errors]},
                )

            row = ProviderApplicationService(
                application_id=app.id,
                service_id=service.id,
                requirement_id=requirement.id,
                answers=answers,
                status="SUBMITTED",
            )
            db.add(row)
            service_rows.append(row)
            if provider:
                db.add(
                    ProviderService(
                        provider_id=provider.id,
                        service_id=service.id,
                        description=data.description,
                        coverage_radius_km=float(data.coverage_radius_km),
                        application_id=app.id,
                        approval_status="PENDING",
                    )
                )
        db.flush()
        snapshot = {
            "common": app.common,
            "common_configuration": app.common_configuration,
            "services": [serialize(r) for r in service_rows],
        }
        event(db, app, user, "SUBMITTED", details=copy.deepcopy(snapshot))
        created_apps.append(app)

    db.commit()
    return {
        "applications": [detail(db, a, user) for a in created_apps],
        "provider": serialize(provider) if provider else None,
        "user": resolve_user_payload(user, db),
    }
