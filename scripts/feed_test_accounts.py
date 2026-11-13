"""Seed script to feed 5 complete test accounts with distinct businesses, services and V Ads."""
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from uuid import uuid4

from sqlalchemy import select
from app.database import SessionLocal
from app import models, provider_models, commerce_models, v_ads_models
from app.models import User, Provider, ProviderService, Service, Category, Subcategory, Audit, Membership, Payment, Plan
from app.security import passwords
from app.commerce_models import CommerceListing
from app.v_ads_models import VAdsAdvertiser, VAdsVideo, VAdsMediaUpload, VAdsView, VAdsLike
from app.v_ads_media_routes import media_storage
from app.v_ads_media_registration import register_validated_upload

TEST_ACCOUNTS = [
    {
        "user": {
            "email": "greenscape@test.vistrah.com",
            "name": "Aarav Sharma",
            "password": "TestPass123!",
        },
        "provider": {
            "company": "GreenScape Architecture & Landscapes",
            "slug": "greenscape-landscapes",
            "phone": "+91 98451 22334",
            "address": "14 Indiranagar 100ft Road, Bengaluru, Karnataka 560038",
            "location": "Bengaluru",
            "latitude": 12.9784,
            "longitude": 77.6408,
            "service_ids": [15, 26, 24],  # Architecture & Design, Outdoor Structures, Bioclimatic Pergolas
        },
        "listing": {
            "title": "GreenScape 3D Landscape & Terrace Garden Architecture Plan",
            "description": "Comprehensive landscape architecture package with site survey, 3D design rendering, and pergola material specifications.",
            "service_id": 15,
            "unit_price_paise": 1850000,  # ₹18,500
        },
        "v_ads": {
            "advertiser_name": "GreenScape Studio",
            "handle": "greenscape",
            "description": "Modern biophilic architectural design, terrace garden pergolas, and lush urban outdoor living.",
            "video_title": "GreenScape: Designing Sustainable Living Landscapes",
            "video_desc": "Transforming urban spaces into sustainable architectural retreats with biophilic design and pergolas.",
            "source_file": "/data/v-ads-e/5e6db89e36a23163af177bd5a92dffa61ee2cedbd4607fb7ca29e8428bea5bff.mp4",
            "views": 24,
            "likes": 6,
        },
    },
    {
        "user": {
            "email": "techsphere@test.vistrah.com",
            "name": "Priya Patel",
            "password": "TestPass123!",
        },
        "provider": {
            "company": "TechSphere Mobile & Cloud Systems",
            "slug": "techsphere-systems",
            "phone": "+91 98201 55667",
            "address": "Tower B, Outer Ring Road, Bellandur, Bengaluru, Karnataka 560103",
            "location": "Bengaluru",
            "latitude": 12.9304,
            "longitude": 77.6784,
            "service_ids": [42, 41, 43],  # Mobile App Dev, Website Dev, Cloud Services
        },
        "listing": {
            "title": "TechSphere Native iOS & Android MVP Architecture Sprint",
            "description": "Rapid 3-week production-ready mobile MVP sprint with clean reactive UI, robust authentication, and cloud API integration.",
            "service_id": 42,
            "unit_price_paise": 4500000,  # ₹45,000
        },
        "v_ads": {
            "advertiser_name": "TechSphere Solutions",
            "handle": "techsphere",
            "description": "Scalable software engineering, robust cloud APIs, and cross-platform native apps built to scale.",
            "video_title": "TechSphere: Fast, High-Performance Mobile & Cloud Apps",
            "video_desc": "End-to-end modern digital engineering for startups and growing enterprises. Connect on Vistrah!",
            "source_file": "/data/v-ads-e/d494858c62e047828ba9d12381bf918b02887436f5307ba0ca2d23ab2a643207.mp4",
            "views": 38,
            "likes": 9,
        },
    },
    {
        "user": {
            "email": "apexprime@test.vistrah.com",
            "name": "Vikram Singh",
            "password": "TestPass123!",
        },
        "provider": {
            "company": "ApexPrime Property & Valuation Group",
            "slug": "apexprime-realty",
            "phone": "+91 97112 88990",
            "address": "501 Brigade Towers, MG Road, Bengaluru, Karnataka 560001",
            "location": "Bengaluru",
            "latitude": 12.9738,
            "longitude": 77.6094,
            "service_ids": [8, 9, 7],  # Property Verification, Property Valuation, Property Search
        },
        "listing": {
            "title": "ApexPrime Commercial & Residential Legal Title Verification",
            "description": "Thorough 30-year title deed verification, encumbrance check, municipal approval validation, and legal opinion certificate.",
            "service_id": 8,
            "unit_price_paise": 950000,  # ₹9,500
        },
        "v_ads": {
            "advertiser_name": "ApexPrime Realty",
            "handle": "apexprime",
            "description": "Certified real estate verification, property valuation, and RERA legal advisory.",
            "video_title": "ApexPrime: Certified Property Verification & Valuation",
            "video_desc": "Protect your investments with licensed legal due diligence and accurate property valuation reports.",
            "source_file": "/data/v-ads-e/df78462767faaf45eeb9824d70f2095199f1c46cdc54380f65f7d004e73b22d9.mp4",
            "views": 19,
            "likes": 5,
        },
    },
    {
        "user": {
            "email": "lumina@test.vistrah.com",
            "name": "Neha Reddy",
            "password": "TestPass123!",
        },
        "provider": {
            "company": "Lumina Brand & Digital Studio",
            "slug": "lumina-brand-studio",
            "phone": "+91 99001 44221",
            "address": "22 17th Cross, Koramangala 4th Block, Bengaluru, Karnataka 560034",
            "location": "Bengaluru",
            "latitude": 12.9345,
            "longitude": 77.6265,
            "service_ids": [27, 30, 32],  # Digital Marketing, Signage & Branding, Events & Promotions
        },
        "listing": {
            "title": "Lumina Omnichannel Visual Identity & Growth Campaign Package",
            "description": "High-impact visual branding bundle including brand guidelines, social media assets, commercial reel script, and ad spend strategy.",
            "service_id": 27,
            "unit_price_paise": 2400000,  # ₹24,000
        },
        "v_ads": {
            "advertiser_name": "Lumina Creative",
            "handle": "luminacreative",
            "description": "Cinematic brand stories, social media video production, and high-ROI digital campaigns.",
            "video_title": "Lumina Creative: Visual Identity & Storytelling That Sells",
            "video_desc": "Engaging commercial reels, high-converting brand stories, and performance marketing designed for growth.",
            "source_file": "/data/v-ads-e/9b68a01e22b71a9c547c2f01c33aae0bd90a9eccffadbdfba3caf3bb1986c7f7.mp4",
            "views": 42,
            "likes": 12,
        },
    },
    {
        "user": {
            "email": "zenith@test.vistrah.com",
            "name": "Kabir Mehta",
            "password": "TestPass123!",
        },
        "provider": {
            "company": "Zenith Luxury Interiors & Spaces",
            "slug": "zenith-luxury-interiors",
            "phone": "+91 97401 77332",
            "address": "74 Lavelle Road, Shanthala Nagar, Bengaluru, Karnataka 560001",
            "location": "Bengaluru",
            "latitude": 12.9719,
            "longitude": 77.5991,
            "service_ids": [59, 53, 25],  # Interior Design, Home Services, Glass Systems
        },
        "listing": {
            "title": "Zenith Turnkey Luxury Modular Living Room & Kitchen Redesign",
            "description": "Complete contemporary interior makeover with 3D walk-through, modular fittings, mood lighting design, and execution supervision.",
            "service_id": 59,
            "unit_price_paise": 3800000,  # ₹38,000
        },
        "v_ads": {
            "advertiser_name": "Zenith Interiors",
            "handle": "zenithinteriors",
            "description": "Bespoke interior architecture, Italian modular fittings, and ambient lighting craftsmanship.",
            "video_title": "Zenith Interiors: Crafting Spaces of Modern Elegance",
            "video_desc": "Contemporary interior remodeling, luxury residential styling, and space optimization tailored to your lifestyle.",
            "source_file": "/data/v-ads-e/e4ebb1b2a6ce13b2c68d804d669cb983f4b93286a38d7b2ab1ac5dc913d85c17.mp4",
            "views": 31,
            "likes": 8,
        },
    },
]


def feed():
    os.environ["V_ADS_DEV_MIRROR_ROOT"] = ""
    db = SessionLocal()
    storage = media_storage()
    now_utc = datetime.now(timezone.utc)

    admin = db.scalar(select(User).where(User.role == "ADMIN").limit(1))
    admin_id = admin.id if admin else None

    print(f"Beginning seed of 5 test accounts, businesses, services, and V Ads...")

    for account_data in TEST_ACCOUNTS:
        u_data = account_data["user"]
        p_data = account_data["provider"]
        l_data = account_data["listing"]
        v_data = account_data["v_ads"]

        # 1. User Account
        user = db.scalar(select(User).where(User.email == u_data["email"]).limit(1))
        if not user:
            user = User(
                email=u_data["email"],
                name=u_data["name"],
                password_hash=passwords.hash(u_data["password"]),
                role="CUSTOMER",
                seller_enabled=True,
            )
            db.add(user)
            db.flush()
            print(f"✓ Created user: {user.name} ({user.email})")
        else:
            user.name = u_data["name"]
            user.seller_enabled = True
            db.flush()
            print(f"• Existing user updated: {user.name} ({user.email})")

        # 1b. Active Membership
        payment = db.scalar(select(Payment).where(Payment.user_id == user.id, Payment.status == "SUCCEEDED").limit(1))
        if not payment:
            payment_id = f"pay_{uuid4().hex[:16]}"
            payment = Payment(
                id=payment_id,
                user_id=user.id,
                plan_id=1,
                amount=12900,
                currency="INR",
                status="SUCCEEDED",
                mode="SANDBOX",
                idempotency_key=str(uuid4()),
                created_at=now_utc,
            )
            db.add(payment)
            db.flush()

        membership = db.scalar(select(Membership).where(Membership.user_id == user.id, Membership.revoked == False).limit(1))
        if not membership:
            membership = Membership(
                user_id=user.id,
                payment_id=payment.id,
                starts_at=now_utc,
                expires_at=now_utc + timedelta(days=365),
                revoked=False,
            )
            db.add(membership)
            db.flush()
            print(f"  ✓ Active membership provisioned for {user.name}")

        # 2. Provider (Business)
        provider = db.scalar(select(Provider).where(Provider.owner_user_id == user.id).limit(1))
        if not provider:
            provider = db.scalar(select(Provider).where(Provider.slug == p_data["slug"]).limit(1))
        if not provider:
            provider = Provider(
                owner_user_id=user.id,
                slug=p_data["slug"],
                name=user.name,
                company=p_data["company"],
                email=user.email,
                phone=p_data["phone"],
                address=p_data["address"],
                location=p_data["location"],
                latitude=p_data["latitude"],
                longitude=p_data["longitude"],
                provenance="Verified professional business on Vistrah platform.",
                verification_status="VERIFIED",
                active=True,
                publication_revision=1,
            )
            db.add(provider)
            db.flush()
            print(f"  ✓ Created business provider: {provider.company}")
        else:
            provider.owner_user_id = user.id
            provider.name = user.name
            provider.company = p_data["company"]
            provider.phone = p_data["phone"]
            provider.address = p_data["address"]
            provider.location = p_data["location"]
            provider.latitude = p_data["latitude"]
            provider.longitude = p_data["longitude"]
            provider.provenance = "Verified professional business on Vistrah platform."
            provider.verification_status = "VERIFIED"
            provider.active = True
            db.flush()
            print(f"  • Existing business updated: {provider.company}")

        # 3. Provider Services Offered
        for sid in p_data["service_ids"]:
            service = db.get(Service, sid)
            if not service:
                continue
            grant = db.get(ProviderService, (provider.id, sid))
            if not grant:
                grant = ProviderService(
                    provider_id=provider.id,
                    service_id=sid,
                    description=f"{service.title} provided by {provider.company}. Verified professional service.",
                    coverage_radius_km=50,
                    approval_status="APPROVED",
                    publication_revision=1,
                )
                db.add(grant)
            else:
                grant.approval_status = "APPROVED"
                grant.coverage_radius_km = 50
        db.flush()
        print(f"  ✓ Linked services: {p_data['service_ids']}")

        # 4. Commerce Marketplace Listing
        target_service = db.get(Service, l_data["service_id"])
        target_category = db.get(Category, target_service.category_id) if target_service else None
        target_sub = db.get(Subcategory, target_service.subcategory_id) if (target_service and target_service.subcategory_id) else None

        existing_listing = db.scalar(
            select(CommerceListing).where(
                CommerceListing.provider_id == provider.id,
                CommerceListing.service_id == l_data["service_id"],
            ).limit(1)
        )
        if not existing_listing:
            listing = CommerceListing(
                id=str(uuid4()),
                provider_id=provider.id,
                seller_id=user.id,
                kind="SERVICE_PACKAGE",
                service_id=l_data["service_id"],
                taxonomy_category_slug=target_category.slug if target_category else None,
                taxonomy_subcategory_slug=target_sub.slug if target_sub else (target_category.slug if target_category else None),
                taxonomy_listing_type_slug="service",
                title=l_data["title"],
                description=l_data["description"],
                unit_price_paise=l_data["unit_price_paise"],
                currency="INR",
                available=True,
                status="APPROVED",
                fulfilment_operator="SELLER",
                published_at=now_utc,
            )
            db.add(listing)
            db.flush()
            print(f"  ✓ Created commerce listing: {listing.title}")
        else:
            existing_listing.title = l_data["title"]
            existing_listing.description = l_data["description"]
            existing_listing.unit_price_paise = l_data["unit_price_paise"]
            existing_listing.status = "APPROVED"
            existing_listing.available = True
            db.flush()
            print(f"  • Existing commerce listing updated: {existing_listing.title}")

        # 5. V Ads Advertiser Account
        advertiser = db.scalar(select(VAdsAdvertiser).where(VAdsAdvertiser.owner_id == user.id).limit(1))
        if not advertiser:
            advertiser = db.scalar(select(VAdsAdvertiser).where(VAdsAdvertiser.handle == v_data["handle"]).limit(1))
        if not advertiser:
            advertiser = VAdsAdvertiser(
                id=str(uuid4()),
                owner_id=user.id,
                name=v_data["advertiser_name"],
                handle=v_data["handle"],
                description=v_data["description"],
                status="APPROVED",
                created_at=now_utc,
            )
            db.add(advertiser)
            db.flush()
            print(f"  ✓ Created V Ads advertiser: {advertiser.name} (@{advertiser.handle})")
        else:
            advertiser.owner_id = user.id
            advertiser.name = v_data["advertiser_name"]
            advertiser.description = v_data["description"]
            advertiser.status = "APPROVED"
            db.flush()
            print(f"  • Existing advertiser updated: {advertiser.name} (@{advertiser.handle})")

        # 6. V Ads Media Upload and Video Publication
        existing_video = db.scalar(
            select(VAdsVideo).where(
                VAdsVideo.advertiser_id == advertiser.id,
                VAdsVideo.title == v_data["video_title"],
            ).limit(1)
        )
        if not existing_video:
            source_path = Path(v_data["source_file"])
            if not source_path.is_file():
                print(f"  ⚠️ Warning: Source video file not found at {source_path}")
            else:
                upload = register_validated_upload(db, user, advertiser.id, source_path, storage)
                db.flush()

                video = VAdsVideo(
                    id=str(uuid4()),
                    advertiser_id=advertiser.id,
                    media_upload_id=upload.id,
                    title=v_data["video_title"],
                    description=v_data["video_desc"],
                    video_url=f"/v-ads/media/{upload.id}",
                    status="APPROVED",
                    created_at=now_utc,
                    published_at=now_utc,
                )
                db.add(video)
                db.flush()
                print(f"  ✓ Uploaded & approved V Ad: {video.title}")

                # Initial views
                for _ in range(v_data.get("views", 15)):
                    db.add(VAdsView(id=str(uuid4()), video_id=video.id, user_id=None, created_at=now_utc))

                # Initial likes
                if admin_id and v_data.get("likes", 0) > 0:
                    db.add(VAdsLike(id=str(uuid4()), video_id=video.id, user_id=admin_id, created_at=now_utc))
                if user.id:
                    try:
                        db.add(VAdsLike(id=str(uuid4()), video_id=video.id, user_id=user.id, created_at=now_utc))
                    except Exception:
                        pass
        else:
            existing_video.status = "APPROVED"
            existing_video.published_at = now_utc
            db.flush()
            print(f"  • Existing V Ad confirmed approved: {existing_video.title}")

    db.commit()
    db.close()
    print("\n✓ Successfully populated all 5 test accounts, businesses, services, and V Ads!")


if __name__ == "__main__":
    feed()
