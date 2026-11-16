"""Phase 3 Indian DPDP Act 2023 & IT Rules 2021 Data Principal rights endpoints."""
from __future__ import annotations

import secrets
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from .catalogue import serialize
from .database import get_db
from .models import (
    Audit,
    AuthSession,
    GoogleIdentity,
    Membership,
    PasswordReset,
    Payment,
    Provider,
    ServiceRequest,
    User,
    now,
)
from .security import current_user, passwords

router = APIRouter(tags=["DPDP Account Compliance"])

DATA_FIDUCIARY = {
    "legal_name": "Vistrah India Pvt Limited",
    "domain": "vistrah.in",
    "contact_email": "info@vistrah.in",
    "grievance_officer_email": "grievance@vistrah.in",
    "grievance_url": "https://vistrah.in/grievance-officer",
    "acknowledgment_sla_hours": 24,
    "resolution_sla_days": 15,
}


def _iso(value):
    return value.isoformat() if hasattr(value, "isoformat") and value is not None else value


def _build_export_payload(db: Session, user: User) -> dict:
    from .v_ads_models import VAdsAdvertiser, VAdsVideo

    requests = db.scalars(
        select(ServiceRequest)
        .where(ServiceRequest.user_id == user.id)
        .order_by(ServiceRequest.id.desc())
    ).all()

    memberships = db.scalars(
        select(Membership)
        .where(Membership.user_id == user.id)
        .order_by(Membership.id.desc())
    ).all()

    payments_rows = db.scalars(
        select(Payment)
        .where(Payment.user_id == user.id)
        .order_by(Payment.created_at.desc())
    ).all()

    businesses = db.scalars(
        select(Provider)
        .where(Provider.owner_user_id == user.id)
        .order_by(Provider.id)
    ).all()

    advertisers = db.scalars(
        select(VAdsAdvertiser)
        .where(VAdsAdvertiser.owner_id == user.id)
        .order_by(VAdsAdvertiser.created_at)
    ).all()

    v_ads_accounts = []
    for adv in advertisers:
        videos = db.scalars(
            select(VAdsVideo)
            .where(VAdsVideo.advertiser_id == adv.id)
            .order_by(VAdsVideo.created_at.desc())
        ).all()
        v_ads_accounts.append(
            {
                "id": adv.id,
                "name": adv.name,
                "handle": adv.handle,
                "description": adv.description,
                "status": adv.status,
                "created_at": _iso(adv.created_at),
                "videos": [
                    {
                        "id": v.id,
                        "title": v.title,
                        "description": v.description,
                        "status": v.status,
                        "created_at": _iso(v.created_at),
                        "published_at": _iso(v.published_at),
                    }
                    for v in videos
                ],
            }
        )

    commerce_items = []
    try:
        from .commerce_models import CommerceListing

        listings = db.scalars(
            select(CommerceListing)
            .where(CommerceListing.seller_id == user.id)
            .order_by(CommerceListing.created_at.desc())
        ).all()
        commerce_items = [
            {
                "id": item.id,
                "provider_id": item.provider_id,
                "kind": item.kind,
                "title": item.title,
                "status": item.status,
                "available": bool(item.available),
                "unit_price_paise": item.unit_price_paise,
                "currency": item.currency,
                "created_at": _iso(item.created_at),
            }
            for item in listings
        ]
    except Exception:
        commerce_items = []

    applications_export = []
    try:
        from .provider_models import ProviderApplication

        apps = db.scalars(
            select(ProviderApplication)
            .where(ProviderApplication.user_id == user.id)
            .order_by(ProviderApplication.created_at.desc())
        ).all()
        applications_export = [
            {
                "id": app_row.id,
                "category_id": app_row.category_id,
                "status": app_row.status,
                "common": app_row.common,
                "created_at": _iso(app_row.created_at),
                "submitted_at": _iso(getattr(app_row, "submitted_at", None)),
            }
            for app_row in apps
        ]
    except Exception:
        applications_export = []

    exported_ts = now()
    db.add(
        Audit(
            actor_id=user.id,
            action="ACCOUNT_DATA_EXPORTED",
            entity="user",
            entity_id=str(user.id),
            details={"schema_version": "dpdp-2023-v1"},
        )
    )
    db.commit()

    return {
        "schema_version": "dpdp-2023-v1",
        "exported_at": exported_ts.isoformat(),
        "data_fiduciary": DATA_FIDUCIARY,
        "personal_profile": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "seller_enabled": bool(user.seller_enabled),
            "saved_location": user.saved_location,
            "created_at": _iso(user.created_at),
        },
        "consent_records": {
            "privacy_policy_version": user.privacy_policy_version,
            "privacy_consented_at": _iso(user.privacy_consented_at),
            "marketing_consent": bool(user.marketing_consent),
            "marketing_consented_at": _iso(user.marketing_consented_at),
            "seller_terms_version": user.seller_terms_version,
            "seller_consented_at": _iso(user.seller_consented_at),
        },
        "service_requests": [serialize(r) for r in requests],
        "memberships": [serialize(m) for m in memberships],
        "payments": [
            {
                "id": p.id,
                "plan_id": p.plan_id,
                "amount": p.amount,
                "currency": p.currency,
                "status": p.status,
                "mode": p.mode,
                "created_at": _iso(p.created_at),
            }
            for p in payments_rows
        ],
        "seller_businesses": [
            {
                "id": b.id,
                "slug": b.slug,
                "name": b.name,
                "company": b.company,
                "email": b.email,
                "phone": b.phone,
                "address": b.address,
                "location": b.location,
                "verification_status": b.verification_status,
                "active": bool(b.active),
                "publication_revision": b.publication_revision,
                "created_at": _iso(b.created_at),
            }
            for b in businesses
        ],
        "provider_applications": applications_export,
        "v_ads_accounts": v_ads_accounts,
        "commerce_listings": commerce_items,
    }


@router.get("/account/export-data")
@router.get("/api/account/export-data")
def export_account_data(
    response: Response,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = "private, no-store"
    response.headers["Content-Disposition"] = f'attachment; filename="vistrah-data-export-{user.id}.json"'
    return _build_export_payload(db, user)


def _anonymize_account(db: Session, user: User) -> dict:
    if user.role == "ADMIN":
        raise HTTPException(
            403,
            "Administrator accounts cannot be self-deleted; use platform security governance.",
        )

    from .v_ads_models import VAdsAdvertiser, VAdsVideo

    erasure_ts = now()
    anon_tag = f"deleted-{user.id}-{secrets.token_hex(6)}"
    anon_email = f"{anon_tag}@deleted.vistrah.invalid"

    # 1. Revoke all active sessions, password resets, and third-party OAuth bindings
    db.execute(
        update(AuthSession).where(AuthSession.user_id == user.id).values(revoked=True)
    )
    db.execute(
        update(PasswordReset).where(PasswordReset.user_id == user.id).values(used=True)
    )
    db.execute(delete(GoogleIdentity).where(GoogleIdentity.user_id == user.id))

    # 2. Redact personal contact details on customer service requests while retaining non-PII status
    db.execute(
        update(ServiceRequest)
        .where(ServiceRequest.user_id == user.id)
        .values(
            phone="0000000000",
            service_address=None,
            requirements="[Redacted upon DPDP Act 2023 erasure request]",
        )
    )

    # 3. Deactivate & detach owned business profiles without deleting revision history
    owned_providers = db.scalars(
        select(Provider).where(Provider.owner_user_id == user.id)
    ).all()
    detached_provider_ids = []
    for provider in owned_providers:
        detached_provider_ids.append(provider.id)
        provider.owner_user_id = None
        provider.active = False
        provider.verification_status = "INACTIVE"
        provider.name = "Redacted Seller"
        provider.email = anon_email
        provider.phone = "0000000000"
        provider.address = "[Redacted upon account deletion]"
        provider.latitude = None
        provider.longitude = None

    # 4. Suspend owned V Ads channels & remove public videos while preserving immutable 024 targeting revisions
    owned_advertisers = db.scalars(
        select(VAdsAdvertiser).where(VAdsAdvertiser.owner_id == user.id)
    ).all()
    suspended_advertiser_ids = []
    for adv in owned_advertisers:
        suspended_advertiser_ids.append(adv.id)
        adv.owner_id = None
        adv.status = "SUSPENDED"
        adv.name = "Deleted Advertiser"
        adv.description = ""
        db.execute(
            update(VAdsVideo)
            .where(VAdsVideo.advertiser_id == adv.id)
            .values(status="REMOVED")
        )

    # 5. Unpublish seller commerce listings while preserving historical order/review audit records
    try:
        from .commerce_models import CommerceListing

        db.execute(
            update(CommerceListing)
            .where(CommerceListing.seller_id == user.id)
            .values(available=False, status="ARCHIVED")
        )
    except Exception:
        pass

    # 6. Redact draft/pending provider onboarding PII while keeping immutable review history rows intact
    try:
        from .provider_models import ProviderApplication

        user_apps = db.scalars(
            select(ProviderApplication).where(ProviderApplication.user_id == user.id)
        ).all()
        for app_row in user_apps:
            app_row.common = {"redacted": True, "deleted_at": erasure_ts.isoformat()}
    except Exception:
        pass

    # 7. Anonymize User row in place (preserving users.id FK integrity for immutable admin audit logs)
    user.email = anon_email
    user.name = "Deleted User"
    user.phone = ""
    user.saved_location = None
    user.password_hash = passwords.hash(secrets.token_urlsafe(32))
    user.seller_enabled = False
    user.marketing_consent = False
    user.marketing_consented_at = None
    user.deleted_at = erasure_ts

    # 8. Append immutable erasure audit log without altering any prior admin/revision audit entries
    db.add(
        Audit(
            actor_id=user.id,
            action="ACCOUNT_DELETED_ANONYMIZED",
            entity="user",
            entity_id=str(user.id),
            details={
                "detached_providers": detached_provider_ids,
                "suspended_advertisers": suspended_advertiser_ids,
                "audit_logs_preserved": True,
            },
        )
    )
    db.commit()

    return {
        "status": "anonymized",
        "user_id": user.id,
        "deleted_at": erasure_ts.isoformat(),
        "message": (
            "Your account and personal identifiers have been anonymized in accordance with "
            "the Digital Personal Data Protection Act, 2023. Immutable administrative audit "
            "and statutory records remain preserved without personal contact details."
        ),
    }


@router.delete("/account")
@router.delete("/api/account")
def delete_account(
    response: Response,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = "private, no-store"
    return _anonymize_account(db, user)
