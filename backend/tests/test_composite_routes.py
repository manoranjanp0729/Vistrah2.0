"""Tests for composite endpoints ensuring low-latency data aggregation without breaking public access."""
import pytest


def test_anonymous_bootstrap(client, seeded):
    """Anonymous visitors receive catalogue and homepage structure without 401."""
    response = client.get('/bootstrap')
    assert response.status_code == 200
    data = response.json()

    assert 'catalogue' in data
    assert isinstance(data['catalogue'], list)
    assert len(data['catalogue']) > 0

    assert 'homepage' in data
    assert 'layout' in data['homepage']
    assert 'sections' in data['homepage']['layout']

    assert data['user'] is None
    assert data['membership'] is None
    assert data['location'] is None
    assert data['business'] is None


def test_authenticated_customer_bootstrap(client, seeded, member_customer):
    """Authenticated member receives catalogue, homepage, profile and active membership status."""
    response = client.get('/bootstrap', headers=member_customer)
    assert response.status_code == 200
    data = response.json()

    assert data['user'] is not None
    assert data['user']['email'] == 'customer@example.com'
    assert data['user']['role'] == 'CUSTOMER'

    assert data['membership'] is not None
    assert data['membership']['active'] is True

    assert 'catalogue' in data
    assert 'homepage' in data


def test_invalid_token_fails_open(client, seeded):
    """Corrupted or expired tokens safely fall back to guest payload rather than raising 401."""
    response = client.get('/bootstrap', headers={'Authorization': 'Bearer bad-token-here'})
    assert response.status_code == 200
    data = response.json()

    assert data['user'] is None
    assert data['membership'] is None
    assert 'catalogue' in data
    assert len(data['catalogue']) > 0


def test_seller_hub_requires_seller_auth(client, customer):
    """Non-sellers or unauthenticated users cannot access seller hub."""
    assert client.get('/seller/hub').status_code in (401, 403)
    assert client.get('/seller/hub', headers=customer).status_code == 403


def test_seller_hub_returns_aggregated_data(client, db, seeded):
    """Authenticated seller receives owned businesses, recent listings, and V Ads summary."""
    from app.models import User, Provider
    from app.security import passwords, issue_token
    from app.commerce_models import CommerceListing

    user = User(name='Hub Seller', email='hubseller@example.com', password_hash=passwords.hash('testpass'), seller_enabled=True)
    db.add(user); db.flush()
    provider = Provider(
        owner_user_id=user.id,
        slug='hub-test-biz',
        name='Hub Test Business',
        company='Hub Company Ltd',
        email=user.email,
        phone='+919876543210',
        address='123 Studio Way',
        location='Bengaluru',
        provenance='Test fixture',
        verification_status='VERIFIED',
        active=True,
    )
    db.add(provider); db.flush()

    listing = CommerceListing(
        id='hub-listing-1',
        provider_id=provider.id,
        seller_id=user.id,
        kind='PRODUCT',
        title='Hub Product Sample',
        description='A test product description for seller hub composite endpoint.',
        unit_price_paise=15000,
        currency='INR',
        available=True,
        fulfilment_operator='SELLER',
        status='DRAFT',
    )
    db.add(listing)
    db.commit()

    headers = {'Authorization': 'Bearer ' + issue_token(db, user)}
    response = client.get('/seller/hub', headers=headers)
    assert response.status_code == 200
    data = response.json()

    assert 'businesses' in data
    assert len(data['businesses']) == 1
    biz = data['businesses'][0]
    assert biz['company'] == 'Hub Company Ltd'
    assert 'recent_listings' in biz
    assert biz['recent_listings']['total'] == 1
    assert len(biz['recent_listings']['items']) == 1
    assert biz['recent_listings']['items'][0]['title'] == 'Hub Product Sample'

    assert 'v_ads_summary' in data
    assert data['v_ads_summary']['total_ads'] == 0
    assert data['v_ads_summary']['accounts_count'] == 0

    assert 'membership' in data


