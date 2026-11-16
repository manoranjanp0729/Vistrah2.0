import uuid
from sqlalchemy import select

from app.models import Audit, User
from app.security import issue_token, passwords


def _auth_headers(db, role: str) -> tuple[User, dict[str, str]]:
    user = User(
        name=f"{role.title()} Tester",
        email=f"pricing-{role.lower()}-{uuid.uuid4().hex[:6]}@vistrah.in",
        password_hash=passwords.hash("secure-password-123"),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    issued = issue_token(db, user)
    token = issued[0] if isinstance(issued, tuple) else issued
    return user, {"Authorization": f"Bearer {token}"}


def test_public_pricing_returns_seeded_sections_promo_tiers_pillars_and_faqs(client):
    res = client.get("/api/pricing")
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["currency"] == "INR"
    assert body["promo"]["id"] == "v_ads_promo"
    assert body["promo"]["title"] == "Launch V Ads Free for Your First Month"
    assert body["promo"]["promo_enabled"] is True
    assert body["promo"]["free_trial_days"] == 30

    assert len(body["v_ads_tiers"]) == 4
    assert [t["id"] for t in body["v_ads_tiers"]] == [
        "v-ads-2km",
        "v-ads-5km",
        "v-ads-10km",
        "v-ads-25km",
    ]
    assert body["v_ads_tiers"][1]["price_paise"] == 25000
    assert body["v_ads_tiers"][1]["monthly_price_paise"] == 750000
    assert body["v_ads_tiers"][1]["free_trial_enabled"] is True
    assert body["v_ads_tiers"][1]["free_trial_days"] == 30

    assert len(body["pillars"]) == 4
    assert len(body["services"]) == 34
    assert len(body["packages"]) == 4
    assert len(body["faqs"]) == 5
    assert body["faqs"][0]["question"] == "How does the Free First Month of V Ads work?"


def test_admin_pricing_endpoints_enforce_authentication_and_admin_role(client, db):
    assert client.get("/api/admin/pricing").status_code == 401
    assert client.put("/api/admin/pricing/landing-page", json={"price_paise": 599900}).status_code == 401
    assert client.put("/api/admin/pricing/sections/v_ads_promo", json={"free_trial_days": 15}).status_code == 401

    _, customer_headers = _auth_headers(db, "CUSTOMER")
    assert client.get("/api/admin/pricing", headers=customer_headers).status_code == 403
    assert (
        client.put(
            "/api/admin/pricing/landing-page",
            headers=customer_headers,
            json={"price_paise": 599900},
        ).status_code
        == 403
    )
    assert (
        client.put(
            "/api/admin/pricing/sections/v_ads_promo",
            headers=customer_headers,
            json={"free_trial_days": 15},
        ).status_code
        == 403
    )


def test_admin_can_update_prices_promos_and_faqs_with_audit_trail(client, db):
    admin, admin_headers = _auth_headers(db, "ADMIN")

    admin_view = client.get("/api/admin/pricing", headers=admin_headers)
    assert admin_view.status_code == 200, admin_view.text
    assert len(admin_view.json()["items"]) == 47

    # 1. Update Studio service price + deliverables
    update_item = client.put(
        "/api/admin/pricing/landing-page",
        headers=admin_headers,
        json={
            "title": "High-Conversion Landing Page",
            "price_paise": 599900,
            "gst_label": "One-time build · +18% GST",
            "deliverables": [
                "Responsive single-page design",
                "Lead capture + WhatsApp CTA",
                "Analytics setup",
            ],
        },
    )
    assert update_item.status_code == 200, update_item.text
    updated_item_json = update_item.json()
    assert updated_item_json["price_paise"] == 599900
    assert updated_item_json["revision"] == 2

    # 2. Update V Ads Promo banner / free-trial days
    update_promo = client.put(
        "/api/admin/pricing/sections/v_ads_promo",
        headers=admin_headers,
        json={
            "title": "Launch V Ads Free for 45 Days",
            "free_trial_days": 45,
            "promo_enabled": True,
            "active": True,
        },
    )
    assert update_promo.status_code == 200, update_promo.text
    assert update_promo.json()["free_trial_days"] == 45

    # 3. Create new FAQ item
    create_faq = client.post(
        "/api/admin/pricing/items",
        headers=admin_headers,
        json={
            "id": "faq-enterprise-gst",
            "section_id": "faqs",
            "item_type": "faq",
            "title": "Can multi-city enterprise brands request consolidated GST billing?",
            "description": "Yes, Vistrah India Pvt Limited supports state-wise GSTIN invoicing for multi-outlet campaigns.",
            "billing_interval": "none",
            "active": True,
        },
    )
    assert create_faq.status_code == 201, create_faq.text

    # 4. Verify live public API & quote catalogue reflect updates immediately
    public_after = client.get("/api/pricing").json()
    assert public_after["promo"]["title"] == "Launch V Ads Free for 45 Days"
    assert public_after["promo"]["free_trial_days"] == 45
    landing_public = next(s for s in public_after["services"] if s["id"] == "landing-page")
    assert landing_public["starting_price_paise"] == 599900
    assert landing_public["name"] == "High-Conversion Landing Page"
    assert len(public_after["faqs"]) == 6

    quote_cat = client.get("/marketing-pricing/catalogue").json()
    landing_cat = next(s for s in quote_cat["services"] if s["id"] == "landing-page")
    assert landing_cat["starting_price_paise"] == 599900

    # 5. Deactivate a service and ensure public hides it while admin retains it
    deactivate = client.put(
        "/api/admin/pricing/landing-page",
        headers=admin_headers,
        json={
            "title": "High-Conversion Landing Page",
            "price_paise": 599900,
            "deliverables": ["Responsive single-page design"],
            "active": False,
        },
    )
    assert deactivate.status_code == 200, deactivate.text
    public_hidden = client.get("/api/pricing").json()
    assert all(s["id"] != "landing-page" for s in public_hidden["services"])

    # 6. Verify immutable Audit trail entries
    audits = db.scalars(select(Audit).where(Audit.actor_id == admin.id)).all()
    actions = {a.action for a in audits}
    assert "PRICING_ITEM_UPDATED" in actions
    assert "PRICING_SECTION_UPDATED" in actions
    assert "PRICING_ITEM_CREATED" in actions
