"""Simplified 13-category business catalogue: creation, onboarding, carry-over and idempotency."""
import uuid

from sqlalchemy import select

from app.business_catalogue import apply_business_catalogue, business_types
from app.commerce_models import CommerceListing
from app.marketplace_taxonomy import canonical_selection, resolve_selection
from app.models import Category, Provider, ProviderService, Service, User
from app.provider_models import ProviderRequirement
from app.security import issue_token, passwords

COMMON = {
    'legal_name': 'Annapoorna Tiffin Centre', 'structure': 'Individual', 'contact_name': 'Lakshmi',
    'email': 'tiffin@example.com', 'phone': '6364456776', 'address': 'MG Road, Tarikere',
    'location': 'Tarikere', 'service_areas': ['Tarikere'], 'accuracy': True, 'consent': True,
}
NEW_CATEGORY_SLUGS = [c['slug'] for c in business_types()['categories']]


def _service(db, category_slug, slug):
    category = db.scalar(select(Category).where(Category.slug == category_slug))
    return db.scalar(select(Service).where(Service.category_id == category.id, Service.slug == slug))


def test_creates_13_categories_81_business_types_and_retires_legacy_onboarding(client, seeded, db):
    summary = apply_business_catalogue(seeded)
    seeded.commit()
    assert summary['categories_created'] == 13
    assert summary['services_created'] == 81
    assert summary['requirements_published'] == 81
    assert summary['legacy_categories_retired'] == 7

    catalogue = client.get('/catalogue').json()
    slugs = [c['slug'] for c in catalogue]
    # Find Jobs keeps its existing catalogue category; every other legacy onboarding category is hidden.
    assert set(slugs) == set(NEW_CATEGORY_SLUGS) | {'jobs-careers'}
    for category in catalogue:
        if category['slug'] == 'jobs-careers':
            continue
        assert category['subcategories'] == []
        assert 4 <= len(category['services']) <= 8
    assert sum(len(c['services']) for c in catalogue if c['slug'] != 'jobs-careers') == 81
    # Legacy rows are kept (inactive), never deleted.
    assert db.scalar(select(Category).where(Category.slug == 'tax-compliance')).active is False


def test_simplified_forms_ask_documents_only_for_regulated_types(seeded, db):
    apply_business_catalogue(seeded)
    for slug, regulated in (('restaurant', True), ('salon-and-barber', False), ('clinic-and-doctor', True), ('cleaning', False)):
        category = next(c['slug'] for c in business_types()['categories'] if any(t['slug'] == slug for t in c['types']))
        service = _service(db, category, slug)
        config = db.scalar(select(ProviderRequirement).where(
            ProviderRequirement.service_id == service.id, ProviderRequirement.state == 'PUBLISHED'
        )).configuration
        fields = {f['id']: f for s in config['sections'] for f in s['fields']}
        assert not any(f['required'] for f in fields.values())
        assert ('registration_document' in fields) is regulated
        assert [d['id'] for d in config['declarations']] == ['listing_accuracy']


def test_apply_is_idempotent(seeded):
    apply_business_catalogue(seeded)
    again = apply_business_catalogue(seeded)
    assert again['categories_created'] == again['services_created'] == again['requirements_published'] == 0
    assert again['legacy_categories_retired'] == 0


def test_existing_provider_listing_and_commerce_listing_carry_over(seeded, db):
    owner = User(name='Legacy Seller', email=f'legacy-{uuid.uuid4().hex[:6]}@example.com', password_hash=passwords.hash('LegacyPassword!123'), seller_enabled=True)
    db.add(owner)
    db.flush()
    provider = Provider(slug=f'legacy-{uuid.uuid4().hex[:6]}', name='Legacy Seller', company='Legacy Tax Desk', email='desk@example.com',
                        phone='6364456776', address='Market Road, Mysuru', location='Mysuru', provenance='Test fixture',
                        owner_user_id=owner.id, verification_status='VERIFIED', active=True)
    db.add(provider)
    db.flush()
    gst = _service(db, 'tax-compliance', 'gst-filing')
    db.add(ProviderService(provider_id=provider.id, service_id=gst.id, description='GST returns', approval_status='APPROVED', coverage_radius_km=10))
    listing = CommerceListing(id=str(uuid.uuid4()), provider_id=provider.id, seller_id=owner.id, kind='SERVICE_PACKAGE',
                              taxonomy_category_slug='food-and-dining', taxonomy_subcategory_slug='restaurants-and-dining',
                              taxonomy_listing_type_slug='restaurants', title='Thali', description='Meals', unit_price_paise=15000)
    db.add(listing)
    db.flush()

    summary = apply_business_catalogue(seeded)
    assert summary['provider_listings_carried_over'] >= 1
    assert summary['commerce_listings_remapped'] == 1

    target = _service(db, 'professional-and-business-services', 'tax-gst-and-accounting')
    carried = db.get(ProviderService, (provider.id, target.id))
    assert carried is not None and carried.approval_status == 'APPROVED' and carried.coverage_radius_km == 10
    assert db.get(ProviderService, (provider.id, gst.id)) is not None  # history preserved
    assert (listing.taxonomy_category_slug, listing.taxonomy_subcategory_slug, listing.taxonomy_listing_type_slug) == ('food-and-dining', 'restaurant', 'restaurant')


def test_three_step_self_onboarding_for_a_simple_business(client, seeded, db):
    apply_business_catalogue(seeded)
    seeded.commit()
    user = User(name='Lakshmi', email=f'tiffin-{uuid.uuid4().hex[:6]}@example.com', password_hash=passwords.hash('TiffinPassword!123'))
    db.add(user)
    db.commit()
    headers = {'Authorization': 'Bearer ' + issue_token(db, user)}
    food = next(c for c in client.get('/catalogue').json() if c['slug'] == 'food-and-dining')
    tiffin = next(s for s in food['services'] if s['slug'] == 'home-food-and-tiffin')

    created = client.post('/provider-applications/batch', headers=headers, json={'groups': [{'category_id': food['id'], 'service_ids': [tiffin['id']]}]})
    assert created.status_code == 201, created.text
    app = created.json()[0]
    saved = client.put('/provider-applications/' + app['id'], headers=headers, json={
        'revision': app['revision'], 'common': COMMON, 'services': {str(tiffin['id']): {'listing_accuracy': True}},
    })
    assert saved.status_code == 200, saved.text
    submitted = client.post('/provider-applications/' + app['id'] + '/submit', headers=headers, json={'revision': saved.json()['revision'], 'acknowledge_versions': False})
    assert submitted.status_code == 200, submitted.text
    assert submitted.json()['status'] == 'SUBMITTED'


def test_legacy_marketplace_selection_resolves_to_business_type():
    assert canonical_selection('health-fitness-and-wellness', 'doctors-and-specialists', 'general-physicians') == ('health-and-fitness', 'clinic-and-doctor', 'clinic-and-doctor')
    assert resolve_selection('rental-services', 'vehicle-rentals', 'anything')['subcategory']['slug'] == 'vehicle-rental'
    assert resolve_selection('vehicles', 'driving-school', 'driving-school')['category']['title'] == 'Vehicles'
    assert resolve_selection('unknown', 'nothing', 'none') is None


def test_unified_self_onboarding_submit_with_map_pin_optional_regulated_doc_and_admin_approval(client, seeded, db):
    import base64

    applicant = User(name='Ramesh Rao', email=f'ramesh-{uuid.uuid4().hex[:6]}@example.com', password_hash=passwords.hash('RameshPassword!123'))
    reviewer = User(name='Reviewer', email=f'reviewer-{uuid.uuid4().hex[:6]}@example.com', password_hash=passwords.hash('ReviewerPassword!123'), role='ADMIN')
    db.add_all([applicant, reviewer])
    db.commit()
    user_headers = {'Authorization': 'Bearer ' + issue_token(db, applicant)}
    admin_headers = {'Authorization': 'Bearer ' + issue_token(db, reviewer)}

    cat_res = client.get('/provider-onboarding/catalogue', headers=user_headers)
    assert cat_res.status_code == 200
    cat_body = cat_res.json()
    assert len(cat_body['categories']) == 13
    assert sum(len(c['types']) for c in cat_body['categories']) == 81
    assert cat_body['max_business_types'] == 3

    # Reject > 3 business types
    too_many = client.post('/provider-onboarding/submit', headers=user_headers, json={
        'business_types': ['restaurant', 'catering', 'cleaning', 'pharmacy'],
        'business_name': 'Malnad Kitchen',
        'contact_name': 'Ramesh Rao',
        'phone': '+91 9876543210',
        'address': 'BH Road, Tarikere, Chikkamagaluru',
        'location': 'Tarikere',
        'accept_terms': True,
    })
    assert too_many.status_code == 422

    # Valid 1-shot submission across 2 categories (regulated restaurant + non-regulated event-planner)
    valid_pdf = base64.b64encode(b'%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF').decode('ascii')
    submitted = client.post('/provider-onboarding/submit', headers=user_headers, json={
        'business_types': ['restaurant', 'catering', 'event-planner'],
        'business_name': 'Malnad Kitchen & Celebrations',
        'contact_name': 'Ramesh Rao',
        'phone': '+91 9876543210',
        'whatsapp': '+91 9876543210',
        'address': 'BH Road, Tarikere, Chikkamagaluru 577228',
        'location': 'Tarikere',
        'pincode': '577228',
        'latitude': 13.7092,
        'longitude': 75.8136,
        'coverage_radius_km': 25,
        'timings': 'Mon-Sun, 7:30 AM - 10:00 PM',
        'description': 'Traditional Malnad meals, outdoor catering and function planning.',
        'regulations': {
            'restaurant': {
                'registration_number': 'FSSAI-21226000012345',
                'document': {
                    'filename': 'fssai.pdf',
                    'media_type': 'application/pdf',
                    'content_base64': valid_pdf,
                },
            },
        },
        'accept_terms': True,
        'privacy_policy_version': '2026-11-dpdp-v1',
    })
    assert submitted.status_code == 201, submitted.text
    payload = submitted.json()
    assert payload['user']['seller_enabled'] is True
    assert len(payload['applications']) == 2
    assert all(a['status'] == 'SUBMITTED' for a in payload['applications'])

    food_app = next(a for a in payload['applications'] if len(a['services']) == 2)
    assert len(food_app['documents']) == 1

    # Admin approves the first service and verifies map coordinates + coverage radius carry over to Provider / ProviderService
    svc_id = food_app['services'][0]['service_id']
    approved = client.post(
        f"/admin/provider-applications/{food_app['id']}/services/{svc_id}/review",
        headers=admin_headers,
        json={
            'revision': food_app['revision'],
            'status': 'APPROVED',
            'reason': 'Verified Malnad Kitchen location pin, basics and optional FSSAI upload.',
            'checklist': {'basic_review': True, 'registration_review': True},
        },
    )
    assert approved.status_code == 200, approved.text
    provider_id = approved.json()['provider_id']
    provider = db.get(Provider, provider_id)
    assert provider is not None
    assert provider.latitude == 13.7092 and provider.longitude == 75.8136
    grant = db.get(ProviderService, (provider.id, svc_id))
    assert grant is not None and grant.approval_status == 'APPROVED'
    assert grant.coverage_radius_km == 25.0
    assert 'Malnad meals' in grant.description
