import pytest
from sqlalchemy import select
from app.models import User,Provider,ProviderService,Service,Audit
from app.security import passwords,issue_token
from conftest import activate_test_membership

DATA={'kind':'PRODUCT','title':'Synthetic test product','description':'A product description for disposable marketplace tests only.','unit_price_paise':25000,'currency':'INR','available':True,'service_id':None}


@pytest.fixture
def merchant(db,seeded):
    user=User(name='Merchant',email='merchant@example.com',password_hash=passwords.hash('fixture-only'),seller_enabled=True)
    other=User(name='Other merchant',email='other-merchant@example.com',password_hash=passwords.hash('fixture-only'),seller_enabled=True)
    db.add_all([user,other]);db.flush()
    provider=Provider(owner_user_id=user.id,slug='commerce-test-business',name='Merchant',company='Synthetic test business',email=user.email,phone='',address='Test only',location='Test only',provenance='Disposable fixture',verification_status='VERIFIED',active=True)
    db.add(provider);db.flush()
    service=db.scalar(select(Service).where(Service.active.is_(True),Service.subcategory_id.is_(None)).order_by(Service.id))
    grant=ProviderService(provider_id=provider.id,service_id=service.id,approval_status='APPROVED')
    db.add(grant);db.commit()
    return {'user':user,'provider':provider,'service':service,'grant':grant,'other_user':other,
        'headers':{'Authorization':'Bearer '+issue_token(db,user)},'other':{'Authorization':'Bearer '+issue_token(db,other)}}


def create(client,merchant,data=None):
    path=f'/seller/businesses/{merchant["provider"].id}/commerce-listings'
    response=client.post(path,headers=merchant['headers'],json=data or DATA)
    assert response.status_code==201,response.text
    return path,response.json()


def submit(client,merchant,path,row):
    response=client.post(path+'/'+row['id']+'/submit',headers=merchant['headers'],json={'revision':row['revision']})
    assert response.status_code==200,response.text
    return response.json()


def review(client,admin,row,status='APPROVED'):
    return client.post('/admin/commerce-listings/'+row['id']+'/review',headers=admin,json={'revision':row['revision'],'status':status,'reason':'Independent review of business and published unit price.'})


def approve(client,merchant,admin,data=None):
    path,row=create(client,merchant,data);row=submit(client,merchant,path,row)
    response=review(client,admin,row);assert response.status_code==200,response.text
    return path,response.json()


def test_ownership_role_and_draft_privacy(client,merchant,customer,admin):
    path,row=create(client,merchant)
    assert client.get('/commerce/products').json()['total']==0
    assert client.get('/commerce/listings/'+row['id']).status_code==404
    assert client.get(path,headers=merchant['other']).status_code==404
    assert client.get(path,headers=customer).status_code==403
    assert client.get('/admin/commerce-listings').status_code==401
    forbidden=client.get('/admin/commerce-listings',headers=merchant['headers'])
    assert forbidden.status_code==403 and 'no-store' in forbidden.headers['cache-control']
    assert client.post(path,headers=merchant['other'],json=DATA).status_code==404
    assert client.get('/admin/commerce-listings?status=DRAFT',headers=admin).json()['total']==1
    assert review(client,admin,row).status_code==409


def test_approval_price_edits_unpublish_and_require_reapproval(client,merchant,admin,db):
    path,row=approve(client,merchant,admin)
    public=client.get('/commerce/products').json()['items'][0]
    assert public['unit_price_paise']==25000
    assert not {'seller_id','reviewer_id','review_note','provider_id','status'}&public.keys()
    edited=client.patch(path+'/'+row['id'],headers=merchant['headers'],json={**DATA,'revision':row['revision'],'unit_price_paise':30000})
    assert edited.status_code==200
    assert edited.json()['status']=='DRAFT'
    assert client.get('/commerce/products').json()['total']==0
    assert client.get('/commerce/listings/'+row['id']).status_code==404
    assert review(client,admin,edited.json()).status_code==409
    stale=client.patch(path+'/'+row['id'],headers=merchant['headers'],json={**DATA,'revision':row['revision']})
    assert stale.status_code==409
    submitted=submit(client,merchant,path,edited.json())
    assert review(client,admin,submitted).status_code==200
    assert client.get('/commerce/products').json()['items'][0]['unit_price_paise']==30000
    assert db.scalar(select(Audit.id).where(Audit.action=='COMMERCE_LISTING_EDITED')) is not None


def test_service_packages_preserve_membership_and_grant_gates(client,merchant,admin,member_customer,db):
    data={**DATA,'kind':'SERVICE_PACKAGE','service_id':merchant['service'].id}
    _,row=approve(client,merchant,admin,data)
    assert client.get('/commerce/products').json()['total']==0
    assert client.get('/commerce/service-packages').status_code==401
    assert client.get('/commerce/listings/'+row['id']).status_code==401
    assert client.get('/commerce/service-packages',headers=member_customer).json()['total']==1
    assert client.get('/commerce/listings/'+row['id'],headers=member_customer).status_code==200
    merchant['grant'].approval_status='SUSPENDED';db.commit()
    assert client.get('/commerce/service-packages',headers=member_customer).json()['total']==0
    assert client.get('/commerce/listings/'+row['id'],headers=member_customer).status_code==404


def test_nonmember_and_production_cannot_bypass_service_gate(client,merchant,admin,customer,db,monkeypatch):
    _,row=approve(client,merchant,admin,{**DATA,'kind':'SERVICE_PACKAGE','service_id':merchant['service'].id})
    assert client.get('/commerce/service-packages',headers=customer).status_code==403
    assert client.get('/commerce/listings/'+row['id'],headers=customer).status_code==403
    activate_test_membership(client,customer)
    assert client.get('/commerce/service-packages',headers=customer).status_code==200
    monkeypatch.setenv('APP_ENV','production')
    assert client.get('/commerce/service-packages',headers=customer).status_code==403
    assert client.get('/commerce/listings/'+row['id'],headers=customer).status_code==403


@pytest.mark.parametrize('field,value',[('unit_price_paise',0),('unit_price_paise',-1),('unit_price_paise',12.5),('unit_price_paise',True),('unit_price_paise','100'),('currency','USD'),('available','true'),('kind','BOOKING'),('service_id',123),('html','<script>private</script>')])
def test_strict_price_and_kind_validation(client,merchant,field,value):
    path=f'/seller/businesses/{merchant["provider"].id}/commerce-listings'
    response=client.post(path,headers=merchant['headers'],json={**DATA,field:value})
    assert response.status_code==422
    assert '<script>' not in response.text


def test_package_requires_existing_approved_service_and_available_business(client,merchant,admin,db):
    path,row=create(client,merchant,{**DATA,'kind':'SERVICE_PACKAGE','service_id':merchant['service'].id})
    merchant['grant'].approval_status='PENDING';db.commit()
    assert client.post(path+'/'+row['id']+'/submit',headers=merchant['headers'],json={'revision':row['revision']}).status_code==409
    merchant['grant'].approval_status='APPROVED';merchant['provider'].active=False;db.commit()
    assert client.post(path+'/'+row['id']+'/submit',headers=merchant['headers'],json={'revision':row['revision']}).status_code==409
    assert client.post(path,headers=merchant['headers'],json={**DATA,'kind':'SERVICE_PACKAGE','service_id':999999}).status_code==422


@pytest.mark.parametrize('mutation',['inactive','unverified','ownership','unavailable','archive'])
def test_published_eligibility_changes_hide_listings(client,merchant,admin,db,mutation):
    path,row=approve(client,merchant,admin,{**DATA,'available':mutation!='unavailable'})
    if mutation=='inactive':merchant['provider'].active=False
    if mutation=='unverified':merchant['provider'].verification_status='REJECTED'
    if mutation=='ownership':merchant['provider'].owner_user_id=merchant['other_user'].id
    if mutation=='archive':
        response=client.post(path+'/'+row['id']+'/archive',headers=merchant['headers'],json={'revision':row['revision']})
        assert response.status_code==200
    db.commit()
    assert client.get('/commerce/products').json()['total']==0
    assert client.get('/commerce/listings/'+row['id']).status_code==404


def test_independent_review_and_rejection(client,merchant,admin,db):
    path,row=create(client,merchant);submitted=submit(client,merchant,path,row)
    merchant['user'].role='ADMIN';db.commit()
    assert review(client,merchant['headers'],submitted).status_code==403
    rejected=review(client,admin,submitted,'REJECTED')
    assert rejected.status_code==200 and rejected.json()['status']=='REJECTED'
    edited=client.patch(path+'/'+row['id'],headers=merchant['headers'],json={**DATA,'revision':rejected.json()['revision']})
    assert edited.status_code==200 and edited.json()['reviewer_id'] is None
    assert client.get('/commerce/products?page=0').status_code==422
