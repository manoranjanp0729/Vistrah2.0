"""Final direct catalogue and reviewed extension contracts (disposable DB only)."""
from sqlalchemy import select
from app.business_catalogue import apply_business_catalogue, business_types
from app.business_service_types import catalogue_with_custom_types
from app.marketplace_nearby_routes import _resolve_category_and_type
from app.models import Category, Service, Subcategory
from app.provider_models import ProviderRequirement

EXPECTED = {
    'Restaurants & Dining':['Restaurant','Cafes','Pubs','Street Food'],
    'Hotels & Stay':['Hotels','Homestays','Resorts'],
    'Vehicle Rentals':['Cars','Bikes'],
    'Event Management':['Wedding','Birthday'],
    'Hospitals and Labs':['Hospitals','Clinics','Laboratory'],
    'Education & Skills':['Schools','Colleges','Universities','Institutes','Tuitions'],
    'Salons & Beauty Parlour':['Salons','Beauty Parlour','Spas','Sauna'],
    'Civil & Construction':['Residential','Commercial'],
    'Fuel & Charging Stations':['Petrol Pumps','Auto Gas','EV Charging'],
    'Vibe Finder':['Theatres','Social Events'],
}

def test_exact_initial_catalogue_and_two_level_database(db, client):
    source=business_types()
    assert {c['title']:[t['title'] for t in c['types']] for c in source['categories']} == EXPECTED
    assert [c['title'] for c in source['categories']] == list(EXPECTED)
    result=apply_business_catalogue(db)
    assert result['services_created']==30
    assert result['subcategories_created']==0
    services=list(db.scalars(select(Service).where(Service.active.is_(True))))
    assert len(services)==30 and all(s.subcategory_id is None for s in services)
    public=client.get('/marketplace/service-types').json()
    assert {c['title']:[t['title'] for t in c['types']] for c in public['categories']} == EXPECTED

def test_reapply_is_idempotent_and_retains_approved_custom_types(db, client, admin):
    apply_business_catalogue(db)
    response=client.post('/admin/provider-onboarding/service-types',headers=admin,json={'category':'restaurants-and-dining','title':'Food Trucks'})
    assert response.status_code==201,response.text
    again=apply_business_catalogue(db)
    assert again['services_created']==0 and again['requirements_published']==0
    custom=db.scalar(select(Service).where(Service.slug==response.json()['slug']))
    assert custom.active and custom.subcategory_id is None

def test_licence_prompts_only_for_regulated_types(db):
    apply_business_catalogue(db)
    for slug,regulated in [('restaurant',True),('clinics',True),('cars',False),('salons',False)]:
        service=db.scalar(select(Service).where(Service.slug==slug))
        config=db.scalar(select(ProviderRequirement).where(ProviderRequirement.service_id==service.id,ProviderRequirement.state=='PUBLISHED')).configuration
        fields={f['id']:f for section in config['sections'] for f in section['fields']}
        assert ('registration_document' in fields)==regulated
        assert not any(f['required'] for f in fields.values())

def test_custom_type_requires_admin_publication(db,client,customer,admin):
    body={'custom_service_types':[{'category':'restaurants-and-dining','title':'Food Trucks'}],
        'business_name':'Test Food Truck','contact_name':'Test Owner','phone':'9876543210',
        'address':'Test Road 10','location':'Bengaluru','accept_terms':True}
    submitted=client.post('/provider-onboarding/submit',headers=customer,json=body)
    assert submitted.status_code==201,submitted.text
    service=db.scalar(select(Service).where(Service.title=='Food Trucks'))
    assert service is not None and not service.active and service.subcategory_id is None
    assert not any(t['title']=='Food Trucks' for c in catalogue_with_custom_types(db)['categories'] for t in c['types'])
    assert client.post('/admin/provider-onboarding/service-types',headers=customer,json=body['custom_service_types'][0]).status_code==403
    assert client.post('/admin/provider-onboarding/service-types',json=body['custom_service_types'][0]).status_code==401
    published=client.post('/admin/provider-onboarding/service-types',headers=admin,json=body['custom_service_types'][0])
    assert published.status_code==201,published.text
    assert any(t['title']=='Food Trucks' for c in catalogue_with_custom_types(db)['categories'] for t in c['types'])
    category,_,type_def=_resolve_category_and_type('restaurants-and-dining',service.slug,service.slug,db=db)
    assert category['title']=='Restaurants & Dining' and type_def['title']=='Food Trucks'

def test_custom_type_rejects_removed_category_and_duplicate_selection(client,customer):
    base={'business_name':'Test Shop','contact_name':'Test Owner','phone':'9876543210',
        'address':'Test Road 10','location':'Bengaluru','accept_terms':True}
    assert client.post('/provider-onboarding/submit',headers=customer,json={**base,'custom_service_types':[{'category':'legal-tax-and-business-compliance','title':'Consulting'}]}).status_code==422
    assert client.post('/provider-onboarding/submit',headers=customer,json={**base,'business_types':['restaurant'],'custom_service_types':[{'category':'restaurants-and-dining','title':'Restaurant'}]}).status_code==422
    assert client.post('/provider-onboarding/submit',headers=customer,json={**base,'business_types':['restaurant','cafes','pubs','street-food']}).status_code==422

def test_old_type_cannot_resolve_or_be_submitted(client,customer):
    assert all(c['slug']!='real-estate-and-property' for c in business_types()['categories'])
    body={'business_types':['apartment-sales-and-resale'],'business_name':'Test Shop','contact_name':'Test Owner','phone':'9876543210','address':'Test Road 10','location':'Bengaluru','accept_terms':True}
    assert client.post('/provider-onboarding/submit',headers=customer,json=body).status_code==422
