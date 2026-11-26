"""Final direct catalogue and reviewed extension contracts (disposable DB only)."""
import math
from uuid import uuid4

from sqlalchemy import select

from app import maps_proxy_routes
from app.business_catalogue import apply_business_catalogue, business_types
from app.business_service_types import catalogue_with_custom_types
from app.location_routes import EARTH_KM
from app.marketplace_nearby_routes import _resolve_category_and_type
from app.models import Category, Provider, ProviderService, Service
from app.provider_models import ProviderRequirement

EXPECTED = {
    'Restaurants & Dining': [
        'Restaurant',
        'Cafes',
        'Pubs',
        'Street Food',
        'Bakeries & Desserts',
        'Cloud Kitchens & Tiffins',
        'Juice & Ice Cream Bars',
    ],
    'Hotels & Stay': [
        'Hotels',
        'Homestays',
        'Resorts',
        'PGs & Hostels',
        'Service Apartments',
        'Guest Houses & Lodges',
    ],
    'Vehicle Rentals': [
        'Cars',
        'Bikes',
        'Tempo Travellers & Vans',
        'Outstation Cabs & Taxis',
        'Goods & Mini Trucks',
    ],
    'Event Management': [
        'Wedding',
        'Birthday',
        'Banquet & Event Venues',
        'Catering & Live Counters',
        'Photography & Videography',
    ],
    'Hospitals and Labs': [
        'Hospitals',
        'Clinics',
        'Laboratory',
        'Dental Clinics',
        'Physiotherapy & Rehab',
        'Eye & Skin Clinics',
    ],
    'Education & Skills': [
        'Schools',
        'Colleges',
        'Universities',
        'Institutes',
        'Tuitions',
        'Competitive Exam Coaching',
        'Music, Dance & Arts',
        'Preschools & Daycare',
    ],
    'Salons & Beauty Parlour': [
        'Salons',
        'Beauty Parlour',
        'Spas',
        'Sauna',
        'Bridal Makeup & Mehendi',
        "Men's Grooming & Barbers",
        'Nail & Lash Studios',
    ],
    'Civil & Construction': [
        'Residential',
        'Commercial',
        'Plumbing & Electrical Repairs',
        'Waterproofing & Painting',
        'Architecture & Interiors',
    ],
    'Fuel & Charging Stations': [
        'Petrol Pumps',
        'Auto Gas',
        'EV Charging',
        'Car & Bike Wash / Detailing',
        'Tyre, Battery & Puncture Care',
        'EV Service & Battery Swap',
    ],
    'Vibe Finder': [
        'Theatres',
        'Social Events',
        'Gaming & Bowling Zones',
        'Turf & Sports Arenas',
        'Live Music & Comedy Clubs',
    ],
}


def test_exact_initial_catalogue_and_two_level_database(db, client):
    source = business_types()
    assert {c['title']: [t['title'] for t in c['types']] for c in source['categories']} == EXPECTED
    assert [c['title'] for c in source['categories']] == list(EXPECTED)
    result = apply_business_catalogue(db)
    assert result['services_created'] == 60
    assert result['subcategories_created'] == 0
    services = list(db.scalars(select(Service).where(Service.active.is_(True))))
    assert len(services) == 60 and all(s.subcategory_id is None for s in services)
    public = client.get('/marketplace/service-types').json()
    assert {c['title']: [t['title'] for t in c['types']] for c in public['categories']} == EXPECTED


def test_marketplace_listings_filters_accurately_by_new_service_types_and_radius(db, client, monkeypatch):
    maps_proxy_routes.clear_maps_proxy_state()
    monkeypatch.delenv('GOOGLE_MAPS_SERVER_API_KEY', raising=False)
    apply_business_catalogue(db)
    db.commit()

    base_lat, base_lng = 12.9716, 77.5946
    cat_hosp = db.scalar(select(Category).where(Category.slug == 'hospitals-and-labs'))
    svc_dental = db.scalar(select(Service).where(Service.slug == 'dental-clinics'))
    svc_physio = db.scalar(select(Service).where(Service.slug == 'physiotherapy-and-rehab'))

    near_dental = Provider(
        slug='near-dental-' + uuid4().hex[:8],
        name='Dr Rao',
        company='Indiranagar Smile Care',
        email=f'{uuid4().hex[:8]}@example.test',
        phone='+919845012345',
        address='100ft Road, Indiranagar',
        location='Bengaluru',
        latitude=base_lat + math.degrees(2.0 / EARTH_KM),
        longitude=base_lng,
        provenance='test',
        verification_status='VERIFIED',
        active=True,
    )
    far_dental = Provider(
        slug='far-dental-' + uuid4().hex[:8],
        name='Dr Shetty',
        company='Outskirts Dental Studio',
        email=f'{uuid4().hex[:8]}@example.test',
        phone='+919845054321',
        address='Highway Road',
        location='Bengaluru',
        latitude=base_lat + math.degrees(18.0 / EARTH_KM),
        longitude=base_lng,
        provenance='test',
        verification_status='VERIFIED',
        active=True,
    )
    near_physio = Provider(
        slug='near-physio-' + uuid4().hex[:8],
        name='Dr Nair',
        company='Active Spine Physio',
        email=f'{uuid4().hex[:8]}@example.test',
        phone='+919845099999',
        address='CMH Road, Indiranagar',
        location='Bengaluru',
        latitude=base_lat + math.degrees(1.5 / EARTH_KM),
        longitude=base_lng,
        provenance='test',
        verification_status='VERIFIED',
        active=True,
    )
    db.add_all([near_dental, far_dental, near_physio])
    db.flush()
    db.add_all([
        ProviderService(provider_id=near_dental.id, service_id=svc_dental.id, approval_status='APPROVED'),
        ProviderService(provider_id=far_dental.id, service_id=svc_dental.id, approval_status='APPROVED'),
        ProviderService(provider_id=near_physio.id, service_id=svc_physio.id, approval_status='APPROVED'),
    ])
    db.commit()

    res_5km = client.get(
        f'/marketplace/listings?category={cat_hosp.slug}&service_type=dental-clinics&lat={base_lat}&lng={base_lng}&radius_km=5'
    )
    assert res_5km.status_code == 200, res_5km.text
    items_5km = res_5km.json()['items']
    assert [i['company'] for i in items_5km] == ['Indiranagar Smile Care']

    res_25km = client.get(
        f'/marketplace/listings?category={cat_hosp.slug}&service_type=dental-clinics&lat={base_lat}&lng={base_lng}&radius_km=25'
    )
    assert res_25km.status_code == 200
    assert [i['company'] for i in res_25km.json()['items']] == [
        'Indiranagar Smile Care',
        'Outskirts Dental Studio',
    ]

    # Every single subcategory across all 10 categories resolves cleanly on /marketplace/listings
    for cat in business_types()['categories']:
        for bt in cat['types']:
            check = client.get(
                f"/marketplace/listings?category={cat['slug']}&service_type={bt['slug']}&lat={base_lat}&lng={base_lng}&radius_km=10"
            )
            assert check.status_code == 200, f"Failed for {cat['slug']}/{bt['slug']}: {check.text}"
            assert check.json()['business_type']['slug'] == bt['slug']


def test_reapply_is_idempotent_and_retains_approved_custom_types(db, client, admin):
    apply_business_catalogue(db)
    response = client.post(
        '/admin/provider-onboarding/service-types',
        headers=admin,
        json={'category': 'restaurants-and-dining', 'title': 'Food Trucks'},
    )
    assert response.status_code == 201, response.text
    again = apply_business_catalogue(db)
    assert again['services_created'] == 0 and again['requirements_published'] == 0
    custom = db.scalar(select(Service).where(Service.slug == response.json()['slug']))
    assert custom.active and custom.subcategory_id is None


def test_licence_prompts_only_for_regulated_types(db):
    apply_business_catalogue(db)
    for slug, regulated in [
        ('restaurant', True),
        ('bakeries-and-desserts', True),
        ('clinics', True),
        ('dental-clinics', True),
        ('cars', False),
        ('salons', False),
        ('plumbing-and-electrical-repairs', False),
    ]:
        service = db.scalar(select(Service).where(Service.slug == slug))
        config = db.scalar(
            select(ProviderRequirement).where(
                ProviderRequirement.service_id == service.id,
                ProviderRequirement.state == 'PUBLISHED',
            )
        ).configuration
        fields = {f['id']: f for section in config['sections'] for f in section['fields']}
        assert ('registration_document' in fields) == regulated
        assert not any(f['required'] for f in fields.values())


def test_custom_type_requires_admin_publication(db, client, customer, admin):
    body = {
        'custom_service_types': [{'category': 'restaurants-and-dining', 'title': 'Food Trucks'}],
        'business_name': 'Test Food Truck',
        'contact_name': 'Test Owner',
        'phone': '9876543210',
        'address': 'Test Road 10',
        'location': 'Bengaluru',
        'accept_terms': True,
    }
    submitted = client.post('/provider-onboarding/submit', headers=customer, json=body)
    assert submitted.status_code == 201, submitted.text
    service = db.scalar(select(Service).where(Service.title == 'Food Trucks'))
    assert service is not None and not service.active and service.subcategory_id is None
    assert not any(
        t['title'] == 'Food Trucks'
        for c in catalogue_with_custom_types(db)['categories']
        for t in c['types']
    )
    assert (
        client.post(
            '/admin/provider-onboarding/service-types',
            headers=customer,
            json=body['custom_service_types'][0],
        ).status_code
        == 403
    )
    assert (
        client.post(
            '/admin/provider-onboarding/service-types',
            json=body['custom_service_types'][0],
        ).status_code
        == 401
    )
    published = client.post(
        '/admin/provider-onboarding/service-types',
        headers=admin,
        json=body['custom_service_types'][0],
    )
    assert published.status_code == 201, published.text
    assert any(
        t['title'] == 'Food Trucks'
        for c in catalogue_with_custom_types(db)['categories']
        for t in c['types']
    )
    category, _, type_def = _resolve_category_and_type(
        'restaurants-and-dining', service.slug, service.slug, db=db
    )
    assert category['title'] == 'Restaurants & Dining' and type_def['title'] == 'Food Trucks'


def test_custom_type_rejects_removed_category_and_duplicate_selection(client, customer):
    base = {
        'business_name': 'Test Shop',
        'contact_name': 'Test Owner',
        'phone': '9876543210',
        'address': 'Test Road 10',
        'location': 'Bengaluru',
        'accept_terms': True,
    }
    assert (
        client.post(
            '/provider-onboarding/submit',
            headers=customer,
            json={
                **base,
                'custom_service_types': [
                    {'category': 'legal-tax-and-business-compliance', 'title': 'Consulting'}
                ],
            },
        ).status_code
        == 422
    )
    assert (
        client.post(
            '/provider-onboarding/submit',
            headers=customer,
            json={
                **base,
                'business_types': ['restaurant'],
                'custom_service_types': [
                    {'category': 'restaurants-and-dining', 'title': 'Restaurant'}
                ],
            },
        ).status_code
        == 422
    )
    assert (
        client.post(
            '/provider-onboarding/submit',
            headers=customer,
            json={**base, 'business_types': ['restaurant', 'cafes', 'pubs', 'street-food']},
        ).status_code
        == 422
    )


def test_old_type_cannot_resolve_or_be_submitted(client, customer):
    assert all(c['slug'] != 'real-estate-and-property' for c in business_types()['categories'])
    body = {
        'business_types': ['apartment-sales-and-resale'],
        'business_name': 'Test Shop',
        'contact_name': 'Test Owner',
        'phone': '9876543210',
        'address': 'Test Road 10',
        'location': 'Bengaluru',
        'accept_terms': True,
    }
    assert client.post('/provider-onboarding/submit', headers=customer, json=body).status_code == 422
