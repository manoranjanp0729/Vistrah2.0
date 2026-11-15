"""Consolidated editorial admin console APIs (Overview KPIs, V Ads & Sellers drawer, Users/DPDP, Audit & Health)."""
from __future__ import annotations

from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from .catalogue import serialize
from .compliance_routes import DATA_FIDUCIARY
from .database import get_db
from .models import Audit, Payment, Provider, ProviderService, Service, ServiceRequest, User
from .security import admin_user
from .v_ads_account_routes import output as advertiser_output
from .v_ads_management_routes import counts as v_ads_counts
from .v_ads_models import VAdsAdvertiser, VAdsVideo
from .v_ads_targeting_models import VAdsTargetingRevision

router = APIRouter(tags=["Admin Console"])


def _iso(value):
    return value.isoformat() if hasattr(value, "isoformat") and value is not None else value


def _safe_count(db: Session, stmt) -> int:
    try:
        return int(db.scalar(stmt) or 0)
    except Exception:
        return 0


def build_admin_overview(db: Session) -> dict:
    customers = _safe_count(
        db,
        select(func.count()).select_from(User).where(User.role == "CUSTOMER"),
    )
    verified_users = _safe_count(
        db,
        select(func.count()).select_from(User).where(User.deleted_at.is_(None)),
    )
    dpdp_consented_users = _safe_count(
        db,
        select(func.count())
        .select_from(User)
        .where(User.deleted_at.is_(None), User.privacy_consented_at.is_not(None)),
    )
    anonymized_users = _safe_count(
        db,
        select(func.count()).select_from(User).where(User.deleted_at.is_not(None)),
    )
    requests_total = _safe_count(db, select(func.count()).select_from(ServiceRequest))
    new_requests = _safe_count(
        db,
        select(func.count())
        .select_from(ServiceRequest)
        .where(ServiceRequest.status == "NEW"),
    )
    providers_total = _safe_count(db, select(func.count()).select_from(Provider))
    active_sellers = _safe_count(
        db,
        select(func.count())
        .select_from(Provider)
        .where(Provider.verification_status == "VERIFIED", Provider.active.is_(True)),
    )
    pending_sellers = _safe_count(
        db,
        select(func.count())
        .select_from(Provider)
        .where(Provider.verification_status == "PENDING"),
    )
    services_total = _safe_count(db, select(func.count()).select_from(Service))
    payments_total = _safe_count(db, select(func.count()).select_from(Payment))

    pending_videos = _safe_count(
        db,
        select(func.count())
        .select_from(VAdsVideo)
        .where(VAdsVideo.status == "PENDING"),
    )
    pending_advertisers = _safe_count(
        db,
        select(func.count())
        .select_from(VAdsAdvertiser)
        .where(VAdsAdvertiser.status == "PENDING"),
    )
    pending_targeting = _safe_count(
        db,
        select(func.count())
        .select_from(VAdsTargetingRevision)
        .where(VAdsTargetingRevision.status == "PENDING"),
    )
    pending_v_ads = pending_videos + pending_targeting + pending_advertisers

    # Optional domain queues
    pending_applications = 0
    pending_drafts = 0
    pending_claims = 0
    pending_listings = 0
    pending_jobs = 0
    try:
        from .provider_models import ProviderApplication

        pending_applications = _safe_count(
            db,
            select(func.count())
            .select_from(ProviderApplication)
            .where(ProviderApplication.status == "SUBMITTED"),
        )
    except Exception:
        pass
    try:
        from .publication_models import PublicationDraft

        pending_drafts = _safe_count(
            db,
            select(func.count())
            .select_from(PublicationDraft)
            .where(PublicationDraft.status == "SUBMITTED"),
        )
    except Exception:
        pass
    try:
        from .seller_models import OwnershipClaim

        pending_claims = _safe_count(
            db,
            select(func.count())
            .select_from(OwnershipClaim)
            .where(OwnershipClaim.status == "PENDING"),
        )
    except Exception:
        pass
    try:
        from .commerce_models import CommerceListing

        pending_listings = _safe_count(
            db,
            select(func.count())
            .select_from(CommerceListing)
            .where(CommerceListing.status == "SUBMITTED"),
        )
    except Exception:
        pass
    try:
        from .employer_job_models import EmployerJob

        pending_jobs = _safe_count(
            db,
            select(func.count())
            .select_from(EmployerJob)
            .where(EmployerJob.status == "SUBMITTED"),
        )
    except Exception:
        pass

    needs_review = [
        {
            "id": "v-ads-videos",
            "label": "Pending V Ads Videos",
            "detail": "9:16 Reels awaiting private preview & moderation",
            "count": pending_videos,
            "href": "/admin/moderation?tab=pending",
        },
        {
            "id": "v-ads-targeting",
            "label": "Pending Spatial Targeting Revisions",
            "detail": "Migration 024 geo-pin & km radius updates",
            "count": pending_targeting,
            "href": "/admin/moderation?tab=pending",
        },
        {
            "id": "v-ads-advertisers",
            "label": "Pending Advertiser Channels",
            "detail": "New V Ads advertiser handles awaiting verification",
            "count": pending_advertisers,
            "href": "/admin/moderation?tab=pending",
        },
        {
            "id": "pending-sellers",
            "label": "Unverified Seller Businesses",
            "detail": "Businesses awaiting verification & marketplace activation",
            "count": pending_sellers,
            "href": "/admin/moderation?tab=sellers",
        },
        {
            "id": "new-requests",
            "label": "New Customer Enquiries",
            "detail": "Incoming service & estimate enquiries in NEW state",
            "count": new_requests,
            "href": "/admin/requests",
        },
        {
            "id": "publication-drafts",
            "label": "Submitted Publication Changes",
            "detail": "Business profile & listing revisions awaiting approval",
            "count": pending_drafts,
            "href": "/admin/publication-drafts",
        },
        {
            "id": "provider-applications",
            "label": "Provider Onboarding Applications",
            "detail": "Submitted category & document verification dossiers",
            "count": pending_applications,
            "href": "/admin/provider-applications",
        },
        {
            "id": "ownership-claims",
            "label": "Business Ownership Claims",
            "detail": "Evidence-backed claims for existing listings",
            "count": pending_claims,
            "href": "/admin/ownership-claims",
        },
        {
            "id": "commerce-listings",
            "label": "Submitted Products & Packages",
            "detail": "Seller commerce items awaiting publication review",
            "count": pending_listings,
            "href": "/admin/commerce-listings",
        },
        {
            "id": "employer-jobs",
            "label": "Submitted Employer Job Postings",
            "detail": "Employer vacancies awaiting publication approval",
            "count": pending_jobs,
            "href": "/admin/employer-jobs",
        },
    ]

    return {
        "customers": customers,
        "requests": requests_total,
        "providers": providers_total,
        "services": services_total,
        "payments": payments_total,
        "new_requests": new_requests,
        "payment_mode": "SANDBOX",
        "system_status": "ok",
        "pending_v_ads": pending_v_ads,
        "pending_videos": pending_videos,
        "pending_targeting": pending_targeting,
        "pending_advertisers": pending_advertisers,
        "active_sellers": active_sellers,
        "pending_sellers": pending_sellers,
        "verified_users": verified_users,
        "dpdp_consented_users": dpdp_consented_users,
        "anonymized_users": anonymized_users,
        "needs_review": needs_review,
    }


def _user_consent_summary(u: User | None) -> dict | None:
    if u is None:
        return None
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "phone": u.phone,
        "role": u.role,
        "seller_enabled": bool(u.seller_enabled),
        "privacy_policy_version": u.privacy_policy_version,
        "privacy_consented_at": _iso(u.privacy_consented_at),
        "marketing_consent": bool(u.marketing_consent),
        "marketing_consented_at": _iso(u.marketing_consented_at),
        "seller_terms_version": u.seller_terms_version,
        "seller_consented_at": _iso(u.seller_consented_at),
        "deleted_at": _iso(u.deleted_at),
        "created_at": _iso(u.created_at),
    }


@router.get("/admin/console/summary")
@router.get("/api/admin/console/summary")
def get_admin_console_summary(
    response: Response,
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = "private, no-store"
    return build_admin_overview(db)


@router.get("/admin/moderation/v-ads")
@router.get("/api/admin/moderation/v-ads")
def get_moderation_v_ads(
    response: Response,
    scope: Literal["pending", "all", "approved", "rejected", "removed"] = "pending",
    q: str = Query("", max_length=160),
    page: int = Query(1, ge=1, le=10000),
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = "private, no-store"
    needle = q.strip()

    pending_targeting_video_ids = select(VAdsTargetingRevision.video_id).where(
        VAdsTargetingRevision.status == "PENDING"
    )

    stmt = select(VAdsVideo, VAdsAdvertiser).join(
        VAdsAdvertiser, VAdsAdvertiser.id == VAdsVideo.advertiser_id
    )
    if scope == "pending":
        stmt = stmt.where(
            or_(
                VAdsVideo.status == "PENDING",
                VAdsAdvertiser.status == "PENDING",
                VAdsVideo.id.in_(pending_targeting_video_ids),
            )
        )
    elif scope in ("approved", "rejected", "removed"):
        stmt = stmt.where(VAdsVideo.status == scope.upper())

    if needle:
        pattern = f"%{needle}%"
        stmt = stmt.where(
            or_(
                VAdsVideo.title.ilike(pattern),
                VAdsVideo.id.ilike(pattern),
                VAdsAdvertiser.name.ilike(pattern),
                VAdsAdvertiser.handle.ilike(pattern),
            )
        )

    rows = db.execute(
        stmt.order_by(VAdsVideo.created_at.desc(), VAdsVideo.id.desc())
        .offset((page - 1) * 30)
        .limit(31)
    ).all()
    page_rows = rows[:30]
    video_ids = [v.id for v, _ in page_rows]
    adv_ids = list({a.id for _, a in page_rows})
    owner_ids = list({a.owner_id for _, a in page_rows if a.owner_id is not None})

    metrics = v_ads_counts(db, video_ids) if video_ids else {}
    owners_by_id = (
        {
            u.id: u
            for u in db.scalars(select(User).where(User.id.in_(owner_ids))).all()
        }
        if owner_ids
        else {}
    )

    revisions_by_video: dict[str, list[dict]] = {}
    if video_ids:
        rev_rows = db.scalars(
            select(VAdsTargetingRevision)
            .where(VAdsTargetingRevision.video_id.in_(video_ids))
            .order_by(
                VAdsTargetingRevision.video_id.asc(),
                VAdsTargetingRevision.revision.desc(),
            )
        ).all()
        for rev in rev_rows:
            revisions_by_video.setdefault(rev.video_id, []).append(
                {
                    "id": f"{rev.video_id}:{rev.revision}",
                    "rule_id": rev.video_id,
                    "video_id": rev.video_id,
                    "revision": rev.revision,
                    "latitude": rev.latitude,
                    "longitude": rev.longitude,
                    "radius_km": rev.targeting_radius_km,
                    "status": rev.status,
                    "created_at": _iso(rev.created_at),
                    "reviewed_at": _iso(rev.reviewed_at),
                    "reviewed_by": rev.reviewed_by,
                }
            )

    audits_by_entity: dict[str, list[dict]] = {}
    if video_ids or adv_ids:
        entity_ids = video_ids + adv_ids
        audit_rows = db.scalars(
            select(Audit)
            .where(
                Audit.entity.in_(["v_ads_video", "v_ads_advertiser"]),
                Audit.entity_id.in_(entity_ids),
            )
            .order_by(Audit.id.desc())
            .limit(200)
        ).all()
        for a_row in audit_rows:
            bucket = audits_by_entity.setdefault(a_row.entity_id, [])
            if len(bucket) < 12:
                bucket.append(
                    {
                        "id": a_row.id,
                        "actor_id": a_row.actor_id,
                        "action": a_row.action,
                        "entity": a_row.entity,
                        "created_at": _iso(a_row.created_at),
                        "details": a_row.details or {},
                    }
                )

    items = []
    for video, account in page_rows:
        revs = revisions_by_video.get(video.id, [])
        active_rev = next((r for r in revs if r["status"] == "APPROVED"), None)
        pending_rev = next((r for r in revs if r["status"] == "PENDING"), None)
        combined_audit = sorted(
            audits_by_entity.get(video.id, []) + audits_by_entity.get(account.id, []),
            key=lambda x: x["id"],
            reverse=True,
        )[:15]
        items.append(
            {
                "id": video.id,
                "title": video.title,
                "description": video.description,
                "status": video.status,
                "created_at": _iso(video.created_at),
                "published_at": _iso(video.published_at),
                "preview_available": bool(video.media_upload_id),
                "media_upload_id": video.media_upload_id,
                "video_url": video.video_url
                or (
                    f"/v-ads/media/{video.media_upload_id}"
                    if video.media_upload_id
                    else ""
                ),
                **(metrics.get(video.id) or {"views": 0, "likes": 0, "comments": 0}),
                "advertiser": {
                    **advertiser_output(account),
                    "owner_id": account.owner_id,
                },
                "owner_id": account.owner_id,
                "owner": _user_consent_summary(owners_by_id.get(account.owner_id))
                if account.owner_id is not None
                else None,
                "active_targeting": active_rev,
                "pending_targeting": pending_rev,
                "targeting_revisions": revs,
                "audit_history": combined_audit,
            }
        )

    # Also include standalone pending advertiser accounts that have 0 videos yet when viewing Pending
    standalone_advertisers = []
    if scope == "pending" and page == 1:
        adv_with_videos = select(VAdsVideo.advertiser_id)
        adv_stmt = select(VAdsAdvertiser).where(
            VAdsAdvertiser.status == "PENDING",
            ~VAdsAdvertiser.id.in_(adv_with_videos),
        )
        if needle:
            pattern = f"%{needle}%"
            adv_stmt = adv_stmt.where(
                or_(
                    VAdsAdvertiser.name.ilike(pattern),
                    VAdsAdvertiser.handle.ilike(pattern),
                )
            )
        standalone_rows = db.scalars(
            adv_stmt.order_by(VAdsAdvertiser.created_at.desc()).limit(25)
        ).all()
        st_owner_ids = [a.owner_id for a in standalone_rows if a.owner_id is not None]
        st_owners = (
            {
                u.id: u
                for u in db.scalars(select(User).where(User.id.in_(st_owner_ids))).all()
            }
            if st_owner_ids
            else {}
        )
        for acc in standalone_rows:
            standalone_advertisers.append(
                {
                    **advertiser_output(acc),
                    "owner_id": acc.owner_id,
                    "owner": _user_consent_summary(st_owners.get(acc.owner_id))
                    if acc.owner_id is not None
                    else None,
                }
            )

    return {
        "items": items,
        "standalone_pending_advertisers": standalone_advertisers,
        "page": page,
        "has_more": len(rows) > 30,
    }


@router.get("/admin/moderation/sellers")
@router.get("/api/admin/moderation/sellers")
def get_moderation_sellers(
    response: Response,
    status: str = Query("", max_length=20),
    q: str = Query("", max_length=160),
    page: int = Query(1, ge=1, le=10000),
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = "private, no-store"
    stmt = select(Provider)
    if status in ("PENDING", "VERIFIED", "REJECTED", "INACTIVE"):
        stmt = stmt.where(Provider.verification_status == status)
    needle = q.strip()
    if needle:
        pattern = f"%{needle}%"
        stmt = stmt.where(
            or_(
                Provider.company.ilike(pattern),
                Provider.name.ilike(pattern),
                Provider.email.ilike(pattern),
                Provider.location.ilike(pattern),
                Provider.slug.ilike(pattern),
            )
        )

    total = _safe_count(db, select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(
        stmt.order_by(Provider.id.desc()).offset((page - 1) * 30).limit(30)
    ).all()
    owner_ids = list({p.owner_user_id for p in rows if p.owner_user_id is not None})
    owners = (
        {
            u.id: u
            for u in db.scalars(select(User).where(User.id.in_(owner_ids))).all()
        }
        if owner_ids
        else {}
    )
    adv_by_owner: dict[int, list[dict]] = {}
    if owner_ids:
        for adv in db.scalars(
            select(VAdsAdvertiser).where(VAdsAdvertiser.owner_id.in_(owner_ids))
        ).all():
            if adv.owner_id is not None:
                adv_by_owner.setdefault(adv.owner_id, []).append(
                    {
                        "id": adv.id,
                        "name": adv.name,
                        "handle": adv.handle,
                        "status": adv.status,
                    }
                )

    provider_ids = [p.id for p in rows]
    services_by_provider: dict[int, list[int]] = {}
    if provider_ids:
        for pid, sid in db.execute(
            select(ProviderService.provider_id, ProviderService.service_id).where(
                ProviderService.provider_id.in_(provider_ids),
                ProviderService.approval_status != "SUSPENDED",
            )
        ):
            services_by_provider.setdefault(pid, []).append(sid)

    items = []
    for p in rows:
        items.append(
            {
                **serialize(p),
                "service_ids": services_by_provider.get(p.id, []),
                "owner": _user_consent_summary(owners.get(p.owner_user_id))
                if p.owner_user_id is not None
                else None,
                "v_ads_channels": adv_by_owner.get(p.owner_user_id, [])
                if p.owner_user_id is not None
                else [],
            }
        )

    return {
        "items": items,
        "total": total,
        "page": page,
        "has_more": page * 30 < total,
    }


@router.get("/admin/moderation/users")
@router.get("/api/admin/moderation/users")
def get_moderation_users(
    response: Response,
    segment: Literal["all", "sellers", "consented", "anonymized"] = "all",
    q: str = Query("", max_length=160),
    page: int = Query(1, ge=1, le=10000),
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = "private, no-store"
    stmt = select(User)
    if segment == "sellers":
        stmt = stmt.where(User.deleted_at.is_(None), User.seller_enabled.is_(True))
    elif segment == "consented":
        stmt = stmt.where(
            User.deleted_at.is_(None), User.privacy_consented_at.is_not(None)
        )
    elif segment == "anonymized":
        stmt = stmt.where(User.deleted_at.is_not(None))

    needle = q.strip()
    if needle:
        pattern = f"%{needle}%"
        stmt = stmt.where(
            or_(
                User.name.ilike(pattern),
                User.email.ilike(pattern),
                User.phone.ilike(pattern),
            )
        )

    total = _safe_count(db, select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(
        stmt.order_by(User.id.desc()).offset((page - 1) * 30).limit(30)
    ).all()
    uids = [u.id for u in rows]

    biz_counts: dict[int, int] = {}
    adv_counts: dict[int, int] = {}
    if uids:
        for uid, cnt in db.execute(
            select(Provider.owner_user_id, func.count())
            .where(Provider.owner_user_id.in_(uids))
            .group_by(Provider.owner_user_id)
        ):
            if uid is not None:
                biz_counts[int(uid)] = int(cnt)
        for uid, cnt in db.execute(
            select(VAdsAdvertiser.owner_id, func.count())
            .where(VAdsAdvertiser.owner_id.in_(uids))
            .group_by(VAdsAdvertiser.owner_id)
        ):
            if uid is not None:
                adv_counts[int(uid)] = int(cnt)

    return {
        "items": [
            {
                **_user_consent_summary(u),
                "businesses_count": biz_counts.get(u.id, 0),
                "v_ads_channels_count": adv_counts.get(u.id, 0),
            }
            for u in rows
        ],
        "total": total,
        "page": page,
        "has_more": page * 30 < total,
    }


@router.get("/admin/compliance-summary")
@router.get("/api/admin/compliance-summary")
def get_admin_compliance_summary(
    response: Response,
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = "private, no-store"
    active_users = _safe_count(
        db, select(func.count()).select_from(User).where(User.deleted_at.is_(None))
    )
    privacy_consented = _safe_count(
        db,
        select(func.count())
        .select_from(User)
        .where(User.deleted_at.is_(None), User.privacy_consented_at.is_not(None)),
    )
    seller_consented = _safe_count(
        db,
        select(func.count())
        .select_from(User)
        .where(User.deleted_at.is_(None), User.seller_consented_at.is_not(None)),
    )
    marketing_opted_in = _safe_count(
        db,
        select(func.count())
        .select_from(User)
        .where(User.deleted_at.is_(None), User.marketing_consent.is_(True)),
    )
    anonymized_erased = _safe_count(
        db, select(func.count()).select_from(User).where(User.deleted_at.is_not(None))
    )
    export_events = _safe_count(
        db,
        select(func.count())
        .select_from(Audit)
        .where(Audit.action == "ACCOUNT_DATA_EXPORTED"),
    )
    erasure_events = _safe_count(
        db,
        select(func.count())
        .select_from(Audit)
        .where(Audit.action == "ACCOUNT_DELETED_ANONYMIZED"),
    )

    dpdp_events = [
        {
            "id": a.id,
            "actor_id": a.actor_id,
            "action": a.action,
            "entity": a.entity,
            "entity_id": a.entity_id,
            "created_at": _iso(a.created_at),
            "details": a.details or {},
        }
        for a in db.scalars(
            select(Audit)
            .where(
                Audit.action.in_(
                    ["ACCOUNT_DATA_EXPORTED", "ACCOUNT_DELETED_ANONYMIZED"]
                )
            )
            .order_by(Audit.id.desc())
            .limit(25)
        ).all()
    ]

    v_ads_rev_rows = db.execute(
        select(VAdsTargetingRevision, VAdsVideo, VAdsAdvertiser)
        .join(VAdsVideo, VAdsVideo.id == VAdsTargetingRevision.video_id)
        .join(VAdsAdvertiser, VAdsAdvertiser.id == VAdsVideo.advertiser_id)
        .order_by(
            VAdsTargetingRevision.created_at.desc(),
            VAdsTargetingRevision.video_id.desc(),
            VAdsTargetingRevision.revision.desc(),
        )
        .limit(50)
    ).all()

    v_ads_revisions = [
        {
            "id": f"{video.id}:{rev.revision}",
            "video_id": video.id,
            "video_title": video.title,
            "advertiser_id": account.id,
            "advertiser_name": account.name,
            "advertiser_handle": account.handle,
            "revision": rev.revision,
            "latitude": rev.latitude,
            "longitude": rev.longitude,
            "radius_km": rev.targeting_radius_km,
            "status": rev.status,
            "created_at": _iso(rev.created_at),
            "reviewed_at": _iso(rev.reviewed_at),
            "reviewed_by": rev.reviewed_by,
        }
        for rev, video, account in v_ads_rev_rows
    ]

    return {
        "dpdp": {
            "fiduciary": DATA_FIDUCIARY,
            "active_users": active_users,
            "privacy_consented": privacy_consented,
            "seller_consented": seller_consented,
            "marketing_opted_in": marketing_opted_in,
            "anonymized_erased": anonymized_erased,
            "export_events_count": export_events,
            "erasure_events_count": erasure_events,
            "recent_events": dpdp_events,
        },
        "v_ads_revisions": v_ads_revisions,
    }
