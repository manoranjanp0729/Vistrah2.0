from sqlalchemy import select
from app.models import Provider, ProviderService
from app.marketplace_taxonomy import master_taxonomy
from test_commerce_listings import merchant, create, submit, review, DATA
from test_commerce_orders import SERVICE_TERMS, order_request, move


def selection():
    category=master_taxonomy()['categories'][0]
    subcategory=category['subcategories'][0]
    return dict(taxonomy_category_slug=category['slug'],taxonomy_subcategory_slug=subcategory['slug'],
                taxonomy_listing_type_slug=subcategory['listing_types'][0]['slug'])


def public_path(data):
    from urllib.parse import urlencode
    return '/commerce/classified-services?'+urlencode(dict(category=data['taxonomy_category_slug'],
        subcategory=data['taxonomy_subcategory_slug'],type=data['taxonomy_listing_type_slug']))


def classified():
    return {**DATA,**selection(),'kind':'SERVICE_PACKAGE','service_id':None}


def test_classified_service_review_edit_and_exact_discovery(client,merchant,admin,member_customer,customer,db):
    data=classified();path,row=create(client,merchant,data);browse=public_path(data)
    assert client.get(browse).status_code==401
    assert client.get(browse,headers=merchant['other']).status_code==403
    assert client.get(browse,headers=member_customer).json()['total']==0
    assert client.get('/commerce/listings/'+row['id'],headers=member_customer).status_code==404
    assert client.get(path,headers=merchant['other']).status_code==404
    row=submit(client,merchant,path,row)
    assert client.get(browse,headers=member_customer).json()['total']==0
    approved=review(client,admin,row);assert approved.status_code==200,approved.text
    row=approved.json()
    public=client.get(browse,headers=member_customer)
    assert public.json()['items'][0]['taxonomy_listing_type_slug']==data['taxonomy_listing_type_slug']
    assert 'no-store' in public.headers['cache-control']
    assert not {'seller_id','review_note','business_verification_status'}&public.json()['items'][0].keys()
    assert client.get(browse.replace('type=','type=invalid-'),headers=member_customer).status_code==422
    category=master_taxonomy()['categories'][1];sub=category['subcategories'][0]
    other={**data,'taxonomy_category_slug':category['slug'],'taxonomy_subcategory_slug':sub['slug'],'taxonomy_listing_type_slug':sub['listing_types'][0]['slug']}
    assert client.get(public_path(other),headers=member_customer).json()['total']==0
    changed=client.patch(path+'/'+row['id'],headers=merchant['headers'],json={**data,'revision':row['revision'],'title':'Updated classified service'})
    assert changed.status_code==200,changed.text
    assert changed.json()['status']=='DRAFT'
    assert client.get(browse,headers=member_customer).json()['total']==0
    assert client.patch(path+'/'+row['id'],headers=merchant['headers'],json={**data,'revision':row['revision']}).status_code==409
    row=submit(client,merchant,path,changed.json());response=review(client,admin,row,'REJECTED')
    assert response.status_code==200
    assert client.get(browse,headers=member_customer).json()['total']==0
    changed=client.patch(path+'/'+row['id'],headers=merchant['headers'],json={**data,'revision':response.json()['revision']}).json()
    row=submit(client,merchant,path,changed);assert review(client,admin,row).status_code==200
    db.expire_all();provider=db.get(Provider,merchant['provider'].id);provider.active=False;db.commit()
    assert client.get(browse,headers=member_customer).json()['total']==0


def test_classification_is_complete_and_never_bypasses_legacy_grants(client,merchant,admin,db):
    path=f'/seller/businesses/{merchant["provider"].id}/commerce-listings'
    for data in [{**DATA,'kind':'SERVICE_PACKAGE'}, {**classified(),'taxonomy_subcategory_slug':None}, {**classified(),'taxonomy_listing_type_slug':'made-up'}, {**classified(),'service_id':merchant['service'].id,'kind':'PRODUCT'}]:
        assert client.post(path,headers=merchant['headers'],json=data).status_code==422
    _,row=create(client,merchant,{**classified(),'service_id':merchant['service'].id})
    merchant['grant'].approval_status='SUSPENDED';db.commit()
    assert client.post(path+'/'+row['id']+'/submit',headers=merchant['headers'],json={'revision':row['revision']}).status_code==409


def test_new_business_and_service_stay_private_until_both_reviews(client,merchant,admin,member_customer,customer,db):
    profile=dict(name='Test contact',company='Test classified business',phone='+91 9000000000',address='Synthetic address only',location='Test locality')
    assert client.post('/seller/businesses',headers=customer,json=profile).status_code==403
    assert client.post('/seller/businesses',headers=merchant['headers'],json={**profile,'phone':'-------'}).status_code==422
    assert client.post('/seller/businesses',headers=merchant['headers'],json={**profile,'active':True}).status_code==422
    response=client.post('/seller/businesses',headers=merchant['headers'],json=profile)
    assert response.status_code==201,response.text
    business=response.json();assert business['verification_status']=='PENDING' and not business['active']
    assert client.get('/seller/businesses/'+str(business['id']),headers=merchant['other']).status_code==404
    path=f'/seller/businesses/{business["id"]}/commerce-listings'
    response=client.post(path,headers=merchant['headers'],json=classified());assert response.status_code==201
    row=submit(client,merchant,path,response.json())
    assert review(client,admin,row).status_code==409
    assert client.get(public_path(classified()),headers=member_customer).json()['total']==0
    assert client.post(f'/admin/providers/{business["id"]}/verification',headers=admin,json={'status':'VERIFIED','evidence':'Independent evidence for a disposable test business.'}).status_code==200
    assert review(client,admin,row).status_code==409
    assert client.patch(f'/admin/providers/{business["id"]}/active',headers=admin,json={'active':True}).status_code==200
    response=review(client,admin,row);assert response.status_code==200,response.text
    assert client.get(public_path(classified()),headers=member_customer).json()['total']==1
    assert db.scalar(select(ProviderService).where(ProviderService.provider_id==business['id'])) is None


def test_classified_package_supports_existing_test_order_lifecycle(client,merchant,admin,member_customer):
    path,row=create(client,merchant,classified())
    terms=client.patch(path+'/'+row['id']+'/order-terms',headers=merchant['headers'],json={**SERVICE_TERMS,'revision':row['revision']})
    assert terms.status_code==200
    row=submit(client,merchant,path,terms.json())
    response=client.post('/admin/commerce-listings/'+row['id']+'/review',headers=admin,json={'revision':row['revision'],'status':'APPROVED','reason':'Independent classified service and terms review.','order_terms_acknowledged':True})
    assert response.status_code==200,response.text
    row=response.json();order,_=order_request(client,member_customer,row,method='SERVICE')
    assert order['service_id'] is None and order['kind']=='SERVICE_PACKAGE'
    for status in ['CONFIRMED','IN_PROGRESS','COMPLETED']:
        response=move(client,merchant,order,status);assert response.status_code==200,response.text
        order=response.json()
