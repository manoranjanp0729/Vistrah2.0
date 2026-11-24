"""Unified 10-Category 2-level business & service catalogue (10 main categories -> direct service types).

`apply_business_catalogue` is idempotent and safe to re-run. It:
  1. upserts all 10 Main Categories and their direct service types from
     `shared/business-types.json` into PostgreSQL `categories`, `subcategories`,
     and `services`;
  2. publishes a concise self-onboarding form for every service (licence fields
     remain optional and are only shown on regulated business types);
  3. with `retire_legacy=True`, carries existing `ProviderService` and
     `CommerceListing` records over from v0 (`catalogue.json`), v2 (81-type),
     and v3 (15-category) services onto their mapped canonical 10-Sector service
     with zero data loss, while keeping `jobs-careers` active for Find Jobs.

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
from .models import (
    Audit,
    BootstrapState,
    Category,
    ProviderService,
    Service,
    Subcategory,
    now,
)
from .provider_models import ProviderRequirement
from .provider_requirements import Requirements

SOURCE_FILE = Path(__file__).resolve().parents[2] / "shared" / "business-types.json"
BOOTSTRAP_KEY = "business-catalogue-v5-direct-types"
MAX_INCLUDES = 5


@lru_cache(maxsize=1)
def business_types() -> dict:
    data = json.loads(SOURCE_FILE.read_text(encoding="utf-8"))
    assert len(data["categories"]) == 10
    assert all(c["types"] for c in data["categories"])
    return data


@lru_cache(maxsize=1)
def _type_lookup_maps() -> tuple[dict[str, tuple[dict, dict]], dict[tuple[str, str], tuple[dict, dict]]]:
    by_slug: dict[str, tuple[dict, dict]] = {}
    by_cat_and_lt: dict[tuple[str, str], tuple[dict, dict]] = {}
    for cat in business_types()["categories"]:
        for bt in cat["types"]:
            by_slug[bt["slug"]] = (cat, bt)
            lt_slug = bt.get("listing_type_slug") or bt["slug"]
            by_cat_and_lt.setdefault((cat["slug"], lt_slug), (cat, bt))
    return by_slug, by_cat_and_lt


def find_business_type(
    type_slug: str,
    *,
    category_slug: str | None = None,
    subcategory_slug: str | None = None,
    db=None,
) -> tuple[dict, dict] | None:
    by_slug, by_cat_and_lt = _type_lookup_maps()
    lm = legacy_map()

    if category_slug and subcategory_slug:
        triple_u = lm.get("triples", {}).get(f"{category_slug}/{subcategory_slug}/{type_slug}")
        if triple_u and triple_u in by_slug:
            return by_slug[triple_u]

    if type_slug in by_slug:
        hit_cat, hit_bt = by_slug[type_slug]
        if not category_slug or category_slug == hit_cat["slug"] or lm.get("categories", {}).get(category_slug) == hit_cat["slug"]:
            return hit_cat, hit_bt

    if category_slug:
        resolved_cat = lm.get("categories", {}).get(category_slug, category_slug)
        cat_lt_hit = by_cat_and_lt.get((resolved_cat, type_slug))
        if cat_lt_hit:
            return cat_lt_hit

    mapped_v2 = lm.get("subcategories", {}).get(type_slug)
    if mapped_v2 and len(mapped_v2) >= 4:
        u_slug = mapped_v2[3]
        if u_slug in by_slug:
            return by_slug[u_slug]

    if db is not None:
        from .business_service_types import find_dynamic_type
        return find_dynamic_type(db, type_slug, category_slug)
    return None


def ensure_business_type_service(
    db,
    type_slug: str,
    *,
    actor_id: int | None = None,
    custom_definition=None,
) -> tuple[Category, Service, ProviderRequirement, dict, dict] | None:
    found = custom_definition or find_business_type(type_slug, db=db)
    if not found:
        return None
    cat, bt = found

    category = db.scalar(select(Category).where(Category.slug == cat["slug"]))
    if not category:
        category = Category(
            slug=cat["slug"],
            title=cat["title"],
            description=cat["description"],
            active=True,
        )
        db.add(category)
        db.flush()
    elif not category.active:
        category.active = True
        db.flush()

    subcategory = None
    sub_slug = bt.get("subcategory_slug")
    sub_title = bt.get("subcategory_title") or cat["title"]
    if sub_slug:
        subcategory = db.scalar(
            select(Subcategory).where(
                Subcategory.category_id == category.id,
                Subcategory.slug == sub_slug,
            )
        )
        if not subcategory:
            subcategory = Subcategory(
                category_id=category.id,
                slug=sub_slug,
                title=sub_title,
                description=f"{sub_title} services under {cat['title']}.",
                active=True,
            )
            db.add(subcategory)
            db.flush()
        elif not subcategory.active:
            subcategory.active = True
            db.flush()

    service = db.scalar(
        select(Service).where(
            Service.category_id == category.id,
            Service.slug == bt["slug"],
        )
    )
    if not service:
        service = Service(
            category_id=category.id,
            subcategory_id=subcategory.id if subcategory else None,
            slug=bt["slug"],
            title=bt["title"],
            description=bt["description"],
            includes=_includes(bt),
            active=True,
        )
        db.add(service)
        db.flush()
    else:
        changed = False
        if not service.active and not bt.get('custom'):
            service.active = True
            changed = True
        if subcategory and service.subcategory_id != subcategory.id:
            service.subcategory_id = subcategory.id
            changed = True
        if changed:
            db.flush()

    requirement = db.scalar(
        select(ProviderRequirement)
        .where(
            ProviderRequirement.service_id == service.id,
            ProviderRequirement.state == "PUBLISHED",
        )
        .order_by(ProviderRequirement.version.desc())
    )
    if not requirement:
        latest = db.scalar(
            select(ProviderRequirement.version)
            .where(ProviderRequirement.service_id == service.id)
            .order_by(ProviderRequirement.version.desc())
        )
        requirement = ProviderRequirement(
            service_id=service.id,
            version=(latest or 0) + 1,
            state="PUBLISHED",
            configuration=simplified_requirements(bt),
            effective_at=now(),
            published_at=now(),
            actor_id=actor_id,
            change_note="VISTRAH 3-step self-onboarding form.",
        )
        db.add(requirement)
        db.flush()

    return category, service, requirement, cat, bt


def simplified_requirements(business_type: dict) -> dict:
    """Short per-type form. Regulated types get optional registration fields only."""
    regulation = business_types()["regulations"].get(business_type.get("regulated") or "")
    fields = [
        {
            "id": "offer_summary",
            "label": "What do you offer? (optional)",
            "type": "textarea",
            "max_length": 1000,
            "help": 'One or two lines customers will see, for example: "South Indian meals, parcel available".',
        }
    ]
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
        checklist.append(
            {
                "id": "registration_review",
                "label": "Registration checked before showing the Verified badge",
                "required": False,
            }
        )
    config = {
        "sections": [
            {"id": "offer", "title": f"About your {business_type['title']}", "fields": fields}
        ],
        "declarations": [
            {
                "id": "listing_accuracy",
                "label": "I confirm these details are accurate and I accept VISTRAH review before my business is listed.",
            }
        ],
        "checklist": checklist,
        "notes": "Streamlined VISTRAH onboarding. Documents are optional and only needed for a Verified badge on regulated business types.",
    }
    return Requirements.model_validate(config).model_dump()


def _includes(business_type: dict) -> list[str]:
    kws = [str(k) for k in (business_type.get("keywords") or []) if k]
    return kws[:MAX_INCLUDES]


def apply_business_catalogue(
    db,
    *,
    retire_legacy: bool = True,
    actor_id: int | None = None,
) -> dict:
    summary = {
        "categories_created": 0,
        "subcategories_created": 0,
        "services_created": 0,
        "requirements_published": 0,
        "legacy_categories_retired": 0,
        "provider_listings_carried_over": 0,
        "commerce_listings_remapped": 0,
    }

    source = business_types()
    active_cat_slugs = {c["slug"] for c in source["categories"]}

    categories_by_slug: dict[str, Category] = {
        c.slug: c for c in db.scalars(select(Category)).all()
    }
    for cat in source["categories"]:
        category = categories_by_slug.get(cat["slug"])
        if not category:
            category = Category(
                slug=cat["slug"],
                title=cat["title"],
                description=cat["description"],
                active=True,
            )
            db.add(category)
            categories_by_slug[cat["slug"]] = category
            summary["categories_created"] += 1
        else:
            category.title = cat["title"]
            category.description = cat["description"]
            category.active = True
    db.flush()

    subs_by_key: dict[tuple[int, str], Subcategory] = {
        (s.category_id, s.slug): s for s in db.scalars(select(Subcategory)).all()
    }
    for cat in source["categories"]:
        category = categories_by_slug[cat["slug"]]
        seen_subs: set[str] = set()
        for bt in cat["types"]:
            sub_slug = bt.get("subcategory_slug")
            if not sub_slug or sub_slug in seen_subs:
                continue
            seen_subs.add(sub_slug)
            sub_title = bt.get("subcategory_title") or cat["title"]
            sub_row = subs_by_key.get((category.id, sub_slug))
            if not sub_row:
                sub_row = Subcategory(
                    category_id=category.id,
                    slug=sub_slug,
                    title=sub_title,
                    description=f"{sub_title} services under {cat['title']}.",
                    active=True,
                )
                db.add(sub_row)
                subs_by_key[(category.id, sub_slug)] = sub_row
                summary["subcategories_created"] += 1
            else:
                sub_row.title = sub_title
                sub_row.active = True
    db.flush()

    services_by_key: dict[tuple[int, str], Service] = {
        (sv.category_id, sv.slug): sv for sv in db.scalars(select(Service)).all()
    }
    canonical_services_by_slug: dict[str, Service] = {}
    canonical_service_ids: set[int] = set()

    for cat in source["categories"]:
        category = categories_by_slug[cat["slug"]]
        for bt in cat["types"]:
            sub_slug = bt.get("subcategory_slug")
            sub_row = subs_by_key.get((category.id, sub_slug)) if sub_slug else None
            svc = services_by_key.get((category.id, bt["slug"]))
            if not svc:
                svc = Service(
                    category_id=category.id,
                    subcategory_id=sub_row.id if sub_row else None,
                    slug=bt["slug"],
                    title=bt["title"],
                    description=bt["description"],
                    includes=_includes(bt),
                    active=True,
                )
                db.add(svc)
                services_by_key[(category.id, bt["slug"])] = svc
                summary["services_created"] += 1
            else:
                svc.subcategory_id = sub_row.id if sub_row else None
                svc.title = bt["title"]
                svc.description = bt["description"]
                svc.active = True
            canonical_services_by_slug[bt["slug"]] = svc
    db.flush()
    for svc in canonical_services_by_slug.values():
        canonical_service_ids.add(svc.id)

    published_req_sids: set[int] = set(
        db.scalars(
            select(ProviderRequirement.service_id).where(
                ProviderRequirement.state == "PUBLISHED"
            )
        ).all()
    )
    max_ver_by_sid: dict[int, int] = {}
    missing_req_sids = canonical_service_ids - published_req_sids
    if missing_req_sids:
        for req_sid, req_ver in db.execute(
            select(ProviderRequirement.service_id, ProviderRequirement.version).where(
                ProviderRequirement.service_id.in_(missing_req_sids)
            )
        ).all():
            if req_ver > max_ver_by_sid.get(req_sid, 0):
                max_ver_by_sid[req_sid] = req_ver

    ts = now()
    for cat in source["categories"]:
        for bt in cat["types"]:
            svc = canonical_services_by_slug[bt["slug"]]
            if svc.id not in published_req_sids:
                db.add(
                    ProviderRequirement(
                        service_id=svc.id,
                        version=max_ver_by_sid.get(svc.id, 0) + 1,
                        state="PUBLISHED",
                        configuration=simplified_requirements(bt),
                        effective_at=ts,
                        published_at=ts,
                        actor_id=actor_id,
                        change_note="VISTRAH 808-type self-onboarding form.",
                    )
                )
                published_req_sids.add(svc.id)
                summary["requirements_published"] += 1
    db.flush()

    if retire_legacy:
        mapping = legacy_map()
        retained = set(mapping.get("retained_catalogue_categories", []))

        # Carry over provider_services and commerce_listings from non-canonical v0/v2 services
        cat_by_id = {c.id: c for c in categories_by_slug.values()}
        sub_by_id = {s.id: s for s in subs_by_key.values()}
        carry_map = mapping.get("catalogue_services", {})

        for (cid, s_slug), old_svc in list(services_by_key.items()):
            if old_svc.id in canonical_service_ids:
                continue
            old_cat = cat_by_id.get(cid)
            if not old_cat or old_cat.slug in retained:
                continue
            # Runtime-approved custom types belong directly to a final category.
            if old_cat.slug in active_cat_slugs:
                continue

            old_sub = sub_by_id.get(old_svc.subcategory_id) if old_svc.subcategory_id else None
            lookup_keys = []
            if old_sub:
                lookup_keys.append(f"{old_cat.slug}/{old_sub.slug}/{s_slug}")
            lookup_keys.append(f"{old_cat.slug}/{s_slug}")

            target_svc = None
            for lk in lookup_keys:
                pair = carry_map.get(lk)
                if pair and len(pair) == 2:
                    target_svc = canonical_services_by_slug.get(pair[1])
                    if target_svc:
                        break
            if not target_svc:
                v2_sub = mapping.get("subcategories", {}).get(s_slug)
                if v2_sub and len(v2_sub) >= 4:
                    target_svc = canonical_services_by_slug.get(v2_sub[3])

            if target_svc and target_svc.id != old_svc.id:
                for ps in db.scalars(
                    select(ProviderService).where(ProviderService.service_id == old_svc.id)
                ).all():
                    if not db.get(ProviderService, (ps.provider_id, target_svc.id)):
                        db.add(
                            ProviderService(
                                provider_id=ps.provider_id,
                                service_id=target_svc.id,
                                description=ps.description,
                                publication_revision=ps.publication_revision,
                                coverage_radius_km=ps.coverage_radius_km,
                                approval_status=ps.approval_status,
                                application_id=ps.application_id,
                            )
                        )
                        summary["provider_listings_carried_over"] += 1
                for cl in db.scalars(
                    select(CommerceListing).where(CommerceListing.service_id == old_svc.id)
                ).all():
                    cl.service_id = target_svc.id

            if old_svc.active:
                old_svc.active = False

        # Retire obsolete non-canonical categories (keeping `jobs-careers` active)
        for slug, cat_row in categories_by_slug.items():
            if slug not in active_cat_slugs and slug not in retained and cat_row.active:
                cat_row.active = False
                summary["legacy_categories_retired"] += 1

        # Remap any v2 taxonomy slugs on CommerceListing rows
        for listing in db.scalars(
            select(CommerceListing).where(
                CommerceListing.taxonomy_category_slug.is_not(None),
                CommerceListing.taxonomy_subcategory_slug.is_not(None),
                CommerceListing.taxonomy_listing_type_slug.is_not(None),
            )
        ).all():
            current = (
                listing.taxonomy_category_slug,
                listing.taxonomy_subcategory_slug,
                listing.taxonomy_listing_type_slug,
            )
            canonical = canonical_selection(*current)
            if canonical and canonical != current:
                (
                    listing.taxonomy_category_slug,
                    listing.taxonomy_subcategory_slug,
                    listing.taxonomy_listing_type_slug,
                ) = canonical
                summary["commerce_listings_remapped"] += 1

    if not db.get(BootstrapState, BOOTSTRAP_KEY):
        db.add(BootstrapState(key=BOOTSTRAP_KEY))
    db.add(
        Audit(
            actor_id=actor_id,
            action="CATALOGUE_RESTORED_808",
            entity="catalogue",
            entity_id=BOOTSTRAP_KEY,
            details=summary,
        )
    )
    db.flush()
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Apply VISTRAH's 10-category business catalogue.")
    parser.add_argument("--dry-run", action="store_true", help="Report changes and roll back.")
    parser.add_argument(
        "--keep-legacy",
        action="store_true",
        help="Add direct service types without retiring old intermediate categories.",
    )
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
