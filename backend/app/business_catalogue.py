"""Simplified business catalogue (13 categories -> business types) for self-onboarding.

`apply_business_catalogue` is idempotent and safe to re-run. It:
  1. creates the 13 categories and their business types as catalogue services
     (no subcategories) from shared/business-types.json;
  2. publishes a short onboarding form for each new type; documents are optional
     and are only requested for regulated types (for a Verified badge);
  3. with retire_legacy=True, hides the old onboarding categories (rows are kept),
     carries existing provider listings over to the mapped business type with the
     same approval status, and rewrites commerce listings to the current slugs.

Never run against the normal database as routine verification. Live usage:
    python -m app.business_catalogue --dry-run   # report only, rolls back
    python -m app.business_catalogue             # apply
"""
from __future__ import annotations

import argparse
import json
from functools import lru_cache
from pathlib import Path

from sqlalchemy import select

from .commerce_models import CommerceListing
from .marketplace_taxonomy import canonical_selection, legacy_map
from .models import Audit, BootstrapState, Category, ProviderService, Service, Subcategory, now
from .provider_models import ProviderRequirement
from .provider_requirements import Requirements

SOURCE_FILE = Path(__file__).resolve().parents[2] / "shared" / "business-types.json"
BOOTSTRAP_KEY = "business-catalogue-v2"
MAX_INCLUDES = 5


@lru_cache(maxsize=1)
def business_types() -> dict:
    data = json.loads(SOURCE_FILE.read_text(encoding="utf-8"))
    assert len(data["categories"]) == 13
    return data


def find_business_type(type_slug: str) -> tuple[dict, dict] | None:
    for cat in business_types()["categories"]:
        for bt in cat["types"]:
            if bt["slug"] == type_slug:
                return cat, bt
    return None


def ensure_business_type_service(db, type_slug: str, *, actor_id: int | None = None) -> tuple[Category, Service, ProviderRequirement, dict, dict] | None:
    found = find_business_type(type_slug)
    if not found:
        return None
    cat, bt = found
    category = db.scalar(select(Category).where(Category.slug == cat["slug"]))
    if not category:
        category = Category(slug=cat["slug"], title=cat["title"], description=cat["description"], active=True)
        db.add(category)
        db.flush()
    elif not category.active:
        category.active = True
        db.flush()
    service = db.scalar(select(Service).where(
        Service.category_id == category.id, Service.slug == bt["slug"], Service.subcategory_id.is_(None)
    ))
    if not service:
        service = Service(
            category_id=category.id,
            subcategory_id=None,
            slug=bt["slug"],
            title=bt["title"],
            description=bt["description"],
            includes=_includes(bt),
            active=True,
        )
        db.add(service)
        db.flush()
    elif not service.active:
        service.active = True
        db.flush()
    requirement = db.scalar(select(ProviderRequirement).where(
        ProviderRequirement.service_id == service.id, ProviderRequirement.state == "PUBLISHED"
    ).order_by(ProviderRequirement.version.desc()))
    if not requirement:
        latest = db.scalar(select(ProviderRequirement.version).where(
            ProviderRequirement.service_id == service.id
        ).order_by(ProviderRequirement.version.desc()))
        requirement = ProviderRequirement(
            service_id=service.id,
            version=(latest or 0) + 1,
            state="PUBLISHED",
            configuration=simplified_requirements(bt),
            effective_at=now(),
            published_at=now(),
            actor_id=actor_id,
            change_note="Simplified VISTRAH business-type onboarding form.",
        )
        db.add(requirement)
        db.flush()
    return category, service, requirement, cat, bt


def simplified_requirements(business_type: dict) -> dict:
    """Short per-type form. Regulated types get optional registration fields only."""
    regulation = business_types()["regulations"].get(business_type.get("regulated") or "")
    fields = [{
        "id": "offer_summary",
        "label": "What do you offer? (optional)",
        "type": "textarea",
        "max_length": 1000,
        "help": "One or two lines customers will see, for example: \"South Indian meals, parcel available\".",
    }]
    checklist = [{"id": "basic_review", "label": "Business details, location and photos reviewed"}]
    if regulation:
        fields += [
            {
                "id": "registration_number",
                "label": f"{regulation['label']} (optional)",
                "type": "text",
                "max_length": 100,
                "help": "Optional now. Add it later to get the Verified badge.",
            },
            {
                "id": "registration_document",
                "label": f"{regulation['document']} (optional)",
                "type": "file",
                "help": "PDF, JPEG or PNG up to 2 MB. Stored privately for VISTRAH review only.",
            },
        ]
        checklist.append({"id": "registration_review", "label": "Registration checked before showing the Verified badge", "required": False})
    config = {
        "sections": [{"id": "offer", "title": f"About your {business_type['title']}", "fields": fields}],
        "declarations": [{
            "id": "listing_accuracy",
            "label": "I confirm these details are accurate and I accept VISTRAH review before my business is listed.",
        }],
        "checklist": checklist,
        "notes": "Simplified VISTRAH onboarding. Documents are optional and only needed for a Verified badge on regulated business types.",
    }
    return Requirements.model_validate(config).model_dump()


def _includes(business_type: dict) -> list[str]:
    taxonomy_keywords: list[str] = []
    from .marketplace_taxonomy import master_taxonomy

    for category in master_taxonomy()["categories"]:
        for sub in category["subcategories"]:
            if sub["slug"] == business_type["slug"]:
                taxonomy_keywords = list(sub.get("keywords", []))
    return taxonomy_keywords[:MAX_INCLUDES]


def _legacy_service(db, key: str) -> Service | None:
    parts = key.split("/")
    category = db.scalar(select(Category).where(Category.slug == parts[0]))
    if not category:
        return None
    sub_id = None
    if len(parts) == 3:
        sub = db.scalar(select(Subcategory).where(Subcategory.category_id == category.id, Subcategory.slug == parts[1]))
        if not sub:
            return None
        sub_id = sub.id
    return db.scalar(select(Service).where(Service.category_id == category.id, Service.slug == parts[-1], Service.subcategory_id == sub_id))


def apply_business_catalogue(db, *, retire_legacy: bool = True, actor_id: int | None = None) -> dict:
    summary = {
        "categories_created": 0,
        "services_created": 0,
        "requirements_published": 0,
        "legacy_categories_retired": 0,
        "provider_listings_carried_over": 0,
        "commerce_listings_remapped": 0,
    }
    new_services: dict[str, Service] = {}
    for c_order, cat in enumerate(business_types()["categories"], start=1):
        category = db.scalar(select(Category).where(Category.slug == cat["slug"]))
        if not category:
            category = Category(slug=cat["slug"], title=cat["title"], description=cat["description"], active=True)
            db.add(category)
            db.flush()
            summary["categories_created"] += 1
        for bt in cat["types"]:
            service = db.scalar(select(Service).where(
                Service.category_id == category.id, Service.slug == bt["slug"], Service.subcategory_id.is_(None)
            ))
            if not service:
                service = Service(
                    category_id=category.id,
                    subcategory_id=None,
                    slug=bt["slug"],
                    title=bt["title"],
                    description=bt["description"],
                    includes=_includes(bt),
                    active=True,
                )
                db.add(service)
                db.flush()
                summary["services_created"] += 1
            new_services[bt["slug"]] = service
            has_published = db.scalar(select(ProviderRequirement.id).where(
                ProviderRequirement.service_id == service.id, ProviderRequirement.state == "PUBLISHED"
            ))
            if not has_published:
                latest = db.scalar(select(ProviderRequirement.version).where(
                    ProviderRequirement.service_id == service.id
                ).order_by(ProviderRequirement.version.desc()))
                db.add(ProviderRequirement(
                    service_id=service.id,
                    version=(latest or 0) + 1,
                    state="PUBLISHED",
                    configuration=simplified_requirements(bt),
                    effective_at=now(),
                    published_at=now(),
                    actor_id=actor_id,
                    change_note="Simplified VISTRAH business-type onboarding form.",
                ))
                summary["requirements_published"] += 1

    if retire_legacy:
        mapping = legacy_map()
        retained = set(mapping.get("retained_catalogue_categories", []))
        legacy_slugs = {key.split("/")[0] for key in mapping.get("catalogue_services", {})} - retained
        for slug in sorted(legacy_slugs):
            category = db.scalar(select(Category).where(Category.slug == slug))
            if category and category.active:
                category.active = False
                summary["legacy_categories_retired"] += 1

        for key, (_, business_type) in mapping.get("catalogue_services", {}).items():
            old = _legacy_service(db, key)
            target = new_services.get(business_type)
            if not old or not target or old.id == target.id:
                continue
            for row in db.scalars(select(ProviderService).where(ProviderService.service_id == old.id)).all():
                exists = db.get(ProviderService, (row.provider_id, target.id))
                if exists:
                    continue
                db.add(ProviderService(
                    provider_id=row.provider_id,
                    service_id=target.id,
                    description=row.description,
                    publication_revision=row.publication_revision,
                    coverage_radius_km=row.coverage_radius_km,
                    approval_status=row.approval_status,
                    application_id=row.application_id,
                ))
                summary["provider_listings_carried_over"] += 1
            for listing in db.scalars(select(CommerceListing).where(CommerceListing.service_id == old.id)).all():
                listing.service_id = target.id

        for listing in db.scalars(select(CommerceListing).where(
            CommerceListing.taxonomy_category_slug.is_not(None),
            CommerceListing.taxonomy_subcategory_slug.is_not(None),
            CommerceListing.taxonomy_listing_type_slug.is_not(None),
        )).all():
            current = (listing.taxonomy_category_slug, listing.taxonomy_subcategory_slug, listing.taxonomy_listing_type_slug)
            canonical = canonical_selection(*current)
            if canonical and canonical != current:
                listing.taxonomy_category_slug, listing.taxonomy_subcategory_slug, listing.taxonomy_listing_type_slug = canonical
                summary["commerce_listings_remapped"] += 1

    if not db.get(BootstrapState, BOOTSTRAP_KEY):
        db.add(BootstrapState(key=BOOTSTRAP_KEY))
    db.add(Audit(actor_id=actor_id, action="CATALOGUE_SIMPLIFIED", entity="catalogue", entity_id=BOOTSTRAP_KEY, details=summary))
    db.flush()
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Apply VISTRAH's simplified business catalogue.")
    parser.add_argument("--dry-run", action="store_true", help="Report changes and roll back.")
    parser.add_argument("--keep-legacy", action="store_true", help="Add new types without retiring old onboarding categories.")
    args = parser.parse_args()
    from .database import SessionLocal

    with SessionLocal() as db:
        summary = apply_business_catalogue(db, retire_legacy=not args.keep_legacy)
        if args.dry_run:
            db.rollback()
        else:
            db.commit()
    print(json.dumps({"dry_run": args.dry_run, **summary}))


if __name__ == "__main__":
    main()
