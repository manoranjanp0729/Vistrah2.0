"""Composite endpoints aggregating multi-resource responses to minimize mobile latency."""
from fastapi import APIRouter, Depends, Response
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from .database import get_db
from .security import bearer, token_session, eligible_memberships, seller_user
from .catalogue import catalogue, serialize
from .homepage_models import HomepageState, HomepageRelease
from .homepage_routes import Layout
from .models import Membership, Provider, User
from .commerce_models import CommerceListing
from .commerce_routes import output as commerce_output
from .v_ads_models import VAdsAdvertiser, VAdsVideo
from .v_ads_management_routes import counts as v_ads_metrics

router = APIRouter(tags=['Composite endpoints'])


@router.get('/bootstrap')
def app_bootstrap(
    response: Response,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
):
    """Deliver master catalogue, published homepage layout, and optional user profile in a single atomic response."""
    response.headers['Cache-Control'] = 'no-store'

    # 1. Master Service Catalogue
    cat = catalogue(db)

    # 2. Public Homepage Layout
    state = db.get(HomepageState, 1)
    release = db.get(HomepageRelease, state.published_version) if state and state.published_version else None
    homepage = {
        'version': release.version if release else None,
        'layout': release.layout if release else Layout().model_dump(),
    }

    # 3. Authenticated Context (Graceful / Optional)
    user_data = None
    membership_data = None
    location_data = None
    business_data = None

    if credentials and credentials.credentials:
        try:
            user, session = token_session(db, credentials.credentials)
            user_data = {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'phone': user.phone,
                'role': user.role,
                'seller_enabled': user.seller_enabled,
            }

            # Membership status
            rows = db.scalars(
                select(Membership)
                .where(Membership.user_id == user.id, Membership.revoked.is_(False))
                .order_by(Membership.expires_at.desc())
            ).all()
            eligible = eligible_memberships(db, user)
            membership_data = {
                'active': bool(eligible),
                'expires_at': eligible[0].expires_at if eligible else None,
                'records': [serialize(r) for r in rows],
            }

            # Saved location
            location_data = user.saved_location

            # Primary owned business (for sellers)
            if user.seller_enabled:
                biz = db.scalar(
                    select(Provider)
                    .where(Provider.owner_user_id == user.id)
                    .order_by(Provider.id)
                )
                if biz:
                    business_data = serialize(biz)
        except Exception:
            # Expired session or invalid token: fail open to guest payload
            user_data = None
            membership_data = None
            location_data = None
            business_data = None

    return {
        'catalogue': cat,
        'homepage': homepage,
        'user': user_data,
        'membership': membership_data,
        'location': location_data,
        'business': business_data,
    }


@router.get('/seller/hub')
def seller_hub(
    response: Response,
    user: User = Depends(seller_user),
    db: Session = Depends(get_db),
):
    """Aggregate seller businesses, recent commerce listings, and V Ads summary in a single atomic payload."""
    response.headers['Cache-Control'] = 'no-store'

    # 1. Owned Businesses & Recent Commerce Listings
    providers = db.scalars(
        select(Provider)
        .where(Provider.owner_user_id == user.id)
        .order_by(Provider.id)
    ).all()

    businesses_data = []
    for provider in providers:
        biz_dict = serialize(provider)

        # Paginated commerce listings (page 1)
        listings_query = select(CommerceListing).where(
            CommerceListing.provider_id == provider.id,
            CommerceListing.seller_id == user.id,
            CommerceListing.fulfilment_operator == 'SELLER',
        )
        listing_rows = db.scalars(
            listings_query.order_by(CommerceListing.updated_at.desc(), CommerceListing.id).limit(20)
        ).all()
        total_listings = db.scalar(select(func.count()).select_from(listings_query.subquery())) or 0

        biz_dict['recent_listings'] = {
            'items': [commerce_output(row, provider, True) for row in listing_rows],
            'total': total_listings,
            'page': 1,
            'page_size': 20,
        }
        businesses_data.append(biz_dict)

    # 2. V Ads Performance & Account Summary
    owned_advs = select(VAdsAdvertiser.id).where(VAdsAdvertiser.owner_id == user.id)
    adv_count = db.scalar(
        select(func.count()).select_from(
            select(VAdsAdvertiser.id).where(VAdsAdvertiser.owner_id == user.id).subquery()
        )
    ) or 0

    video_rows = db.scalars(
        select(VAdsVideo).where(
            VAdsVideo.advertiser_id.in_(owned_advs),
            VAdsVideo.status != 'REMOVED',
        ).order_by(VAdsVideo.created_at.desc(), VAdsVideo.id.desc()).limit(30)
    ).all()

    metrics = v_ads_metrics(db, [v.id for v in video_rows]) if video_rows else {}
    total_views = sum(m.get('views', 0) for m in metrics.values())
    active_approved = sum(1 for v in video_rows if v.status == 'APPROVED')
    pending_review = sum(1 for v in video_rows if v.status in ('PENDING', 'VALIDATED'))
    rejected = sum(1 for v in video_rows if v.status == 'REJECTED')

    v_ads_summary = {
        'accounts_count': adv_count,
        'total_ads': len(video_rows),
        'active_approved': active_approved,
        'pending_review': pending_review,
        'rejected': rejected,
        'total_views': total_views,
    }

    # 3. Membership Status
    eligible = eligible_memberships(db, user)
    membership_data = {
        'active': bool(eligible),
        'expires_at': eligible[0].expires_at if eligible else None,
    }

    return {
        'businesses': businesses_data,
        'v_ads_summary': v_ads_summary,
        'membership': membership_data,
    }


