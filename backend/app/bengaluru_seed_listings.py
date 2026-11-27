"""Idempotent local development Bengaluru verified business seed across all 10 categories & 60 subcategories.

Covers Begur, Bommanahalli, HSR Layout, Koramangala, Indiranagar, MG Road, Jayanagar, and Whitefield
so every category and subcategory displays rich verified local listings out of the box in local dev.
Strictly fail-closed outside local development (`is_production_env()` refuses execution).
"""
from __future__ import annotations

import argparse
import json
import re
import uuid

from sqlalchemy import select

from .business_catalogue import apply_business_catalogue, business_types
from .http_security import is_production_env
from .models import Audit, BootstrapState, Category, Provider, ProviderService, Service, User
from .provider_models import ProviderApplication
from .security import DUMMY_HASH

DEV_LISTINGS_BOOTSTRAP_KEY = "bengaluru-dev-listings-v1"
DEV_DIRECTORY_OWNER_EMAIL = "bengaluru-directory@sample.vistrah.local"

BENGALURU_NEIGHBOURHOODS: tuple[dict[str, object], ...] = (
    {
        "area": "Begur",
        "locality": "Begur, Bengaluru",
        "street": "Begur Main Road, Near Begur Fort",
        "pincode": "560068",
        "latitude": 12.8837,
        "longitude": 77.6258,
    },
    {
        "area": "Bommanahalli",
        "locality": "Bommanahalli, Bengaluru",
        "street": "Hosur Main Road, Bommanahalli",
        "pincode": "560068",
        "latitude": 12.9010,
        "longitude": 77.6228,
    },
    {
        "area": "HSR Layout",
        "locality": "HSR Layout, Bengaluru",
        "street": "27th Main Road, Sector 1, HSR Layout",
        "pincode": "560102",
        "latitude": 12.9121,
        "longitude": 77.6446,
    },
    {
        "area": "Koramangala",
        "locality": "Koramangala, Bengaluru",
        "street": "80 Feet Road, 4th Block, Koramangala",
        "pincode": "560034",
        "latitude": 12.9352,
        "longitude": 77.6245,
    },
    {
        "area": "Indiranagar",
        "locality": "Indiranagar, Bengaluru",
        "street": "100 Feet Road, HAL 2nd Stage, Indiranagar",
        "pincode": "560038",
        "latitude": 12.9784,
        "longitude": 77.6408,
    },
    {
        "area": "MG Road",
        "locality": "MG Road, Bengaluru",
        "street": "Mahatma Gandhi Road, Near Trinity Circle",
        "pincode": "560001",
        "latitude": 12.9756,
        "longitude": 77.6066,
    },
    {
        "area": "Jayanagar",
        "locality": "Jayanagar, Bengaluru",
        "street": "11th Main, 4th Block, Jayanagar",
        "pincode": "560011",
        "latitude": 12.9250,
        "longitude": 77.5938,
    },
    {
        "area": "Whitefield",
        "locality": "Whitefield, Bengaluru",
        "street": "ITPL Main Road, Whitefield",
        "pincode": "560066",
        "latitude": 12.9698,
        "longitude": 77.7500,
    },
)

BRAND_PREFIXES: tuple[str, ...] = (
    "Namma",
    "Cauvery",
    "Sahyadri",
    "Dakshin",
    "Karavali",
    "Lalbagh",
    "Cubbon",
    "Malnad",
    "Kaveri",
    "Vidhana",
)


def _slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def _deterministic_offset(index: int) -> tuple[float, float]:
    lat_delta = ((index % 5) - 2) * 0.0012
    lng_delta = (((index // 5) % 5) - 2) * 0.0012
    return lat_delta, lng_delta


def seed_bengaluru_dev_listings(db, *, force_recheck: bool = False) -> dict:
    """Seed verified Bengaluru sample listings across all 10 categories & 60 subcategories."""
    if is_production_env():
        raise RuntimeError("Bengaluru sample listings seed is restricted to local development.")

    apply_business_catalogue(db)

    if not force_recheck and db.get(BootstrapState, DEV_LISTINGS_BOOTSTRAP_KEY):
        return {
            "providers_created": 0,
            "services_linked": 0,
            "already_seeded": True,
        }

    seed_owner = db.scalar(select(User).where(User.email == DEV_DIRECTORY_OWNER_EMAIL))
    if not seed_owner:
        seed_owner = User(
            name="VISTRAH Bengaluru Directory",
            email=DEV_DIRECTORY_OWNER_EMAIL,
            password_hash=DUMMY_HASH,
            seller_enabled=True,
        )
        db.add(seed_owner)
        db.flush()
    elif not seed_owner.seller_enabled:
        seed_owner.seller_enabled = True
        db.flush()

    cats_by_slug = {c.slug: c for c in db.scalars(select(Category)).all()}
    services_by_key = {
        (sv.category_id, sv.slug): sv for sv in db.scalars(select(Service)).all()
    }
    existing_slugs = set(db.scalars(select(Provider.slug)).all())

    providers_created = 0
    services_linked = 0
    seq = 0

    for cat_idx, cat_def in enumerate(business_types()["categories"]):
        cat_row = cats_by_slug.get(cat_def["slug"])
        if not cat_row:
            continue

        for type_idx, bt_def in enumerate(cat_def["types"]):
            svc_row = services_by_key.get((cat_row.id, bt_def["slug"]))
            if not svc_row:
                continue

            # Primary neighbourhood + extra neighbourhood for flagship first subcategory of each category
            hood_indices = [(cat_idx * 3 + type_idx) % len(BENGALURU_NEIGHBOURHOODS)]
            if type_idx == 0:
                hood_indices.append((hood_indices[0] + 4) % len(BENGALURU_NEIGHBOURHOODS))

            for variant_idx, hood_idx in enumerate(hood_indices):
                seq += 1
                hood = BENGALURU_NEIGHBOURHOODS[hood_idx]
                area_name = str(hood["area"])
                area_slug = _slugify(area_name)
                slug = f"blr-seed-{bt_def['slug']}-{area_slug}"
                if slug in existing_slugs:
                    continue

                prefix = BRAND_PREFIXES[(seq + cat_idx) % len(BRAND_PREFIXES)]
                company = f"{prefix} {bt_def['title']} — {area_name}"
                lat_off, lng_off = _deterministic_offset(seq + variant_idx)
                lat = round(float(hood["latitude"]) + lat_off, 6)
                lng = round(float(hood["longitude"]) + lng_off, 6)
                phone = f"+9198450{10000 + seq:05d}"
                address = f"{hood['street']}, Bengaluru, Karnataka {hood['pincode']}"
                locality = str(hood["locality"])
                photo_url = f"/images/catalogue/{bt_def['slug']}.webp"
                description = (
                    f"Verified {bt_def['title'].lower()} serving {area_name} and nearby Bengaluru neighbourhoods."
                )

                app_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"vistrah.{slug}"))
                common = {
                    "legal_name": company,
                    "contact_name": f"{prefix} Operations",
                    "phone": phone,
                    "whatsapp": phone,
                    "email": f"{slug[:40]}@sample.vistrah.local",
                    "address": address,
                    "location": locality,
                    "latitude": lat,
                    "longitude": lng,
                    "coverage_radius_km": 25.0,
                    "timings": "8:30 AM - 9:30 PM",
                    "photo_url": photo_url,
                    "accuracy": True,
                    "consent": True,
                }
                if db.get(ProviderApplication, app_id) is None:
                    app_row = ProviderApplication(
                        id=app_id,
                        user_id=seed_owner.id,
                        category_id=cat_row.id,
                        common=common,
                        common_configuration={},
                        status="APPROVED",
                        revision=1,
                    )
                    db.add(app_row)
                    db.flush()
                else:
                    app_row = db.get(ProviderApplication, app_id)

                provider = Provider(
                    owner_user_id=seed_owner.id,
                    slug=slug,
                    name=f"{prefix} Manager",
                    company=company,
                    email=f"{slug[:40]}@sample.vistrah.local",
                    phone=phone,
                    address=address,
                    location=locality,
                    latitude=lat,
                    longitude=lng,
                    provenance="Local dev Bengaluru verified directory seed",
                    verification_status="VERIFIED",
                    active=True,
                )
                db.add(provider)
                db.flush()
                existing_slugs.add(slug)
                providers_created += 1

                if app_row is not None:
                    app_row.provider_id = provider.id

                db.add(
                    ProviderService(
                        provider_id=provider.id,
                        service_id=svc_row.id,
                        description=description,
                        coverage_radius_km=25.0,
                        approval_status="APPROVED",
                        application_id=app_id,
                    )
                )
                services_linked += 1

    if not db.get(BootstrapState, DEV_LISTINGS_BOOTSTRAP_KEY):
        db.add(BootstrapState(key=DEV_LISTINGS_BOOTSTRAP_KEY))
    db.add(
        Audit(
            actor_id=None,
            action="DEV_BENGALURU_LISTINGS_SEEDED",
            entity="catalogue",
            entity_id=DEV_LISTINGS_BOOTSTRAP_KEY,
            details={
                "providers_created": providers_created,
                "services_linked": services_linked,
                "neighbourhoods": [str(h["area"]) for h in BENGALURU_NEIGHBOURHOODS],
            },
        )
    )
    db.flush()
    return {
        "providers_created": providers_created,
        "services_linked": services_linked,
        "already_seeded": False,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed local dev Bengaluru verified listings.")
    parser.add_argument("--dry-run", action="store_true", help="Report counts and roll back.")
    parser.add_argument("--force", action="store_true", help="Recheck missing slugs even if bootstrap marker exists.")
    args = parser.parse_args()
    from .database import SessionLocal

    with SessionLocal() as db:
        result = seed_bengaluru_dev_listings(db, force_recheck=args.force)
        if args.dry_run:
            db.rollback()
        else:
            db.commit()
    print(json.dumps({"dry_run": args.dry_run, **result}))


if __name__ == "__main__":
    main()
