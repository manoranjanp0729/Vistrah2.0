from uuid import uuid4
import pytest
from sqlalchemy import select
from app.models import User,Audit
from app.commerce_models import CommerceListing
from app.commerce_order_models import CommerceOrder
from conftest import activate_test_membership
from test_commerce_listings import merchant,create,submit,review as listing_review,DATA

def review(client,admin,row,status='APPROVED'):
    return client.post('/admin/commerce-listings/'+row['id']+'/review',headers=admin,json={'revision':row['revision'],'status':status,'reason':'Independent review of the listing price and order terms.','order_terms_acknowledged':True})


PRODUCT_TERMS={'stock_quantity':5,'fulfilment_modes':['PICKUP','DELIVERY'],'delivery_fee_paise':5000,'cancellation_rule':'BEFORE_DISPATCH'}
SERVICE_TERMS={'stock_quantity':None,'fulfilment_modes':['SERVICE'],'delivery_fee_paise':None,'cancellation_rule':'BEFORE_SERVICE_START'}


def configured(client,merchant,admin,terms=None,package=False):
    path,row=create(client,merchant,{**DATA,'kind':'SERVICE_PACKAGE','service_id':merchant['service'].id} if package else DATA)
    response=client.patch(path+'/'+row['id']+'/order-terms',headers=merchant['headers'],json={**(terms or (SERVICE_TERMS if package else PRODUCT_TERMS)),'revision':row['revision']})
    assert response.status_code==200,response.text
    row=submit(client,merchant,path,response.json());response=review(client,admin,row)
    assert response.status_code==200,response.text
    return path,response.json()


def add(client,customer,row,quantity=1):
    result=client.put('/commerce/cart/items/'+row['id'],headers=customer,json={'quantity':quantity,'revision':0})
    assert result.status_code==200,result.text
    return result.json()


def order_request(client,customer,row,quantity=1,method='PICKUP'):
    line=add(client,customer,row,quantity)
    data={'listing_id':row['id'],'listing_revision':row['revision'],'cart_revision':line['revision'],'fulfilment_method':method,'phone':'+91 9000000000','idempotency_key':str(uuid4())}
    if method=='DELIVERY':data['delivery_address']='Synthetic test address only'
    response=client.post('/commerce/orders',headers=customer,json=data)
    assert response.status_code==201,response.text
    return response.json(),data


def move(client,merchant,row,status):
    return client.post(f'/seller/businesses/{merchant["provider"].id}/commerce-orders/{row["id"]}/transition',headers=merchant['headers'],json={'revision':row['revision'],'status':status})


def cancel(client,customer,row):
    return client.post('/commerce/orders/'+row['id']+'/cancel',headers=customer,json={'revision':row['revision']})


def test_reviewed_terms_are_required_and_edits_unpublish(client,merchant,admin,customer):
    path,row=create(client,merchant);row=submit(client,merchant,path,row);row=review(client,admin,row).json()
    assert client.put('/commerce/cart/items/'+row['id'],headers=customer,json={'revision':0,'quantity':1}).status_code==409
    response=client.patch(path+'/'+row['id']+'/order-terms',headers=merchant['headers'],json={**PRODUCT_TERMS,'revision':row['revision']})
    assert response.status_code==200 and response.json()['status']=='DRAFT'
    assert client.get('/commerce/products').json()['total']==0
    assert client.patch(path+'/'+row['id']+'/order-terms',headers=merchant['headers'],json={**PRODUCT_TERMS,'revision':row['revision']}).status_code==409


def test_cart_price_privacy_revision_and_removal(client,merchant,admin,customer):
    _,row=configured(client,merchant,admin);line=add(client,customer,row,2)
    response=client.get('/commerce/cart',headers=customer)
    assert 'no-store' in response.headers['cache-control']
    assert response.json()['items'][0]['subtotal_paise']==50000
    assert client.get('/commerce/cart',headers=merchant['other']).json()['items']==[]
    assert client.put('/commerce/cart/items/'+row['id'],headers=customer,json={'quantity':3,'revision':0}).status_code==409
    assert client.delete('/commerce/cart/items/'+row['id']+'?revision=2',headers=customer).status_code==409
    assert client.delete('/commerce/cart/items/'+row['id']+'?revision='+str(line['revision']),headers=customer).status_code==200
    assert client.get('/commerce/cart',headers=customer).json()['items']==[]


def test_server_quote_idempotency_and_price_change(client,merchant,admin,customer,db):
    path,row=configured(client,merchant,admin)
    order,data=order_request(client,customer,row,2,'DELIVERY')
    assert order['quoted_total_paise']==55000 and order['mode']=='TEST' and order['payment_status']=='NOT_STARTED'
    assert client.get('/commerce/cart',headers=customer).json()['items']==[]
    retry=client.post('/commerce/orders',headers=customer,json=data)
    assert retry.status_code==201 and retry.json()['id']==order['id']
    assert client.post('/commerce/orders',headers=customer,json={**data,'phone':'9000000001'}).status_code==409
    assert len(db.scalars(select(CommerceOrder)).all())==1
    assert client.post('/commerce/orders',headers=customer,json={**data,'quoted_total_paise':1}).status_code==422
    edited=client.patch(path+'/'+row['id'],headers=merchant['headers'],json={**DATA,'unit_price_paise':30000,'revision':row['revision']})
    assert edited.status_code==200
    assert move(client,merchant,order,'CONFIRMED').status_code==409
    assert client.get('/commerce/orders/'+order['id'],headers=customer).json()['quoted_total_paise']==55000


def test_atomic_stock_confirm_cancel_and_non_overselling(client,merchant,admin,customer,db):
    _,row=configured(client,merchant,admin,{**PRODUCT_TERMS,'stock_quantity':2})
    first,_=order_request(client,customer,row,2);second,_=order_request(client,customer,row,2)
    assert db.get(CommerceListing,row['id']).allocated_quantity==0
    confirmed=move(client,merchant,first,'CONFIRMED');assert confirmed.status_code==200
    confirmed=confirmed.json()
    assert move(client,merchant,second,'CONFIRMED').status_code==409
    cancelled=cancel(client,customer,confirmed);assert cancelled.status_code==200
    assert cancel(client,customer,cancelled.json()).status_code==409
    assert move(client,merchant,second,'CONFIRMED').status_code==200
    db.expire_all();assert db.get(CommerceListing,row['id']).allocated_quantity==2
    assert db.scalar(select(Audit.id).where(Audit.action=='COMMERCE_ORDER_CANCELLED'))


def test_product_delivery_and_cancellation_cutoff(client,merchant,admin,customer):
    _,row=configured(client,merchant,admin)
    order,_=order_request(client,customer,row,method='DELIVERY')
    assert move(client,merchant,order,'DISPATCHED').status_code==409
    order=move(client,merchant,order,'CONFIRMED').json()
    assert move(client,merchant,order,'COMPLETED').status_code==409
    shipped=move(client,merchant,order,'DISPATCHED').json()
    assert cancel(client,customer,shipped).status_code==409
    assert move(client,merchant,order,'DISPATCHED').status_code==409
    completed=move(client,merchant,shipped,'COMPLETED');assert completed.status_code==200
    assert move(client,merchant,completed.json(),'CONFIRMED').status_code==409


def test_build_cancellation_stops_when_build_begins(client,merchant,admin,customer):
    _,row=configured(client,merchant,admin,{**PRODUCT_TERMS,'cancellation_rule':'BEFORE_BUILD'})
    order,_=order_request(client,customer,row)
    order=move(client,merchant,order,'CONFIRMED').json()
    building=move(client,merchant,order,'BUILDING');assert building.status_code==200
    assert cancel(client,customer,building.json()).status_code==409
    assert move(client,merchant,building.json(),'COMPLETED').status_code==200


def test_service_confirmation_membership_and_start_cutoff(client,merchant,admin,customer,monkeypatch):
    _,row=configured(client,merchant,admin,package=True)
    assert client.put('/commerce/cart/items/'+row['id'],headers=customer,json={'quantity':1,'revision':0}).status_code==403
    activate_test_membership(client,customer)
    order,_=order_request(client,customer,row,method='SERVICE')
    monkeypatch.setenv('APP_ENV','production')
    assert client.get('/commerce/cart',headers=customer).status_code==200
    assert client.post('/commerce/orders',headers=customer,json={'listing_id':row['id'],'listing_revision':row['revision'],'cart_revision':1,'fulfilment_method':'SERVICE','phone':'9000000000','idempotency_key':str(uuid4())}).status_code==503
    assert move(client,merchant,order,'CONFIRMED').status_code==503
    monkeypatch.setenv('APP_ENV','development')
    order=move(client,merchant,order,'CONFIRMED').json()
    assert move(client,merchant,order,'DISPATCHED').status_code==409
    started=move(client,merchant,order,'IN_PROGRESS');assert started.status_code==200
    assert cancel(client,customer,started.json()).status_code==409
    assert move(client,merchant,started.json(),'COMPLETED').status_code==200


def test_order_privacy_and_operator_ownership(client,merchant,admin,customer,db):
    _,row=configured(client,merchant,admin)
    order,_=order_request(client,customer,row)
    assert client.get('/commerce/orders/'+order['id'],headers=merchant['other']).status_code==404
    assert client.get('/commerce/orders').status_code==401
    assert cancel(client,merchant['other'],order).status_code==404
    assert client.get(f'/seller/businesses/{merchant["provider"].id}/commerce-orders',headers=merchant['other']).status_code==404
    response=client.get(f'/seller/businesses/{merchant["provider"].id}/commerce-orders',headers=merchant['headers'])
    assert response.json()['items'][0]['phone']=='+91 9000000000'
    assert client.post('/admin/commerce-orders/'+order['id']+'/transition',headers=admin,json={'revision':1,'status':'CONFIRMED'}).status_code==403
    merchant['provider'].owner_user_id=merchant['other_user'].id;db.commit()
    assert move(client,merchant,order,'CONFIRMED').status_code==404
    assert client.get(f'/seller/businesses/{merchant["provider"].id}/commerce-orders',headers=merchant['headers']).status_code==404


def test_pending_rejection_does_not_allocate_stock(client,merchant,admin,customer,db):
    _,row=configured(client,merchant,admin)
    order,_=order_request(client,customer,row)
    response=move(client,merchant,order,'REJECTED');assert response.status_code==200
    db.expire_all();assert db.get(CommerceListing,row['id']).allocated_quantity==0
    assert cancel(client,customer,response.json()).status_code==409


@pytest.mark.parametrize('changes',[
 {'stock_quantity':-1},{'stock_quantity':True},{'stock_quantity':1.5},{'stock_quantity':'5'},
 {'fulfilment_modes':['DELIVERY'] ,'delivery_fee_paise':None}, {'fulfilment_modes':['PICKUP'],'delivery_fee_paise':1},
 {'fulfilment_modes':['PICKUP','PICKUP']},{'fulfilment_modes':['SERVICE']},{'cancellation_rule':'AFTER_DISPATCH'},
 {'allocated_quantity':100},{'fulfilment_operator':'VISTRAH'}])
def test_terms_validation_prevents_unreviewed_stock_and_operator_changes(client,merchant,changes):
    path,row=create(client,merchant)
    assert client.patch(path+'/'+row['id']+'/order-terms',headers=merchant['headers'],json={**PRODUCT_TERMS,**changes,'revision':row['revision']}).status_code==422


def test_vistrah_packages_admin_management_and_confirmation(client,merchant,admin,customer,db):
    path=f'/admin/vistrah/businesses/{merchant["provider"].id}/commerce-listings'
    data={**DATA,'kind':'SERVICE_PACKAGE','service_id':merchant['service'].id}
    assert client.post(path,headers=merchant['headers'],json=data).status_code==403
    merchant['user'].role='ADMIN';db.commit()
    result=client.post(path,headers=merchant['headers'],json=data);assert result.status_code==201,result.text
    row=result.json();assert row['fulfilment_operator']=='VISTRAH'
    terms=client.patch(path+'/'+row['id']+'/order-terms',headers=merchant['headers'],json={**SERVICE_TERMS,'revision':row['revision']});assert terms.status_code==200
    submitted=client.post(path+'/'+row['id']+'/submit',headers=merchant['headers'],json={'revision':terms.json()['revision']});assert submitted.status_code==200
    assert review(client,merchant['headers'],submitted.json()).status_code==403
    approved=review(client,admin,submitted.json());assert approved.status_code==200
    row=approved.json()
    sellerpath=f'/seller/businesses/{merchant["provider"].id}/commerce-listings/'+row['id']
    assert client.patch(sellerpath,headers=merchant['headers'],json={**data,'revision':row['revision']}).status_code==403
    activate_test_membership(client,customer)
    order,_=order_request(client,customer,row,method='SERVICE')
    assert move(client,merchant,order,'CONFIRMED').status_code==404
    confirmed=client.post('/admin/commerce-orders/'+order['id']+'/transition',headers=admin,json={'revision':1,'status':'CONFIRMED'})
    assert confirmed.status_code==200
    assert client.get('/admin/commerce-orders?operator=VISTRAH',headers=admin).json()['total']==1


def test_cart_hides_service_details_after_membership_expiry(client,merchant,admin,customer,db):
    from app.models import Membership
    _,row=configured(client,merchant,admin,package=True);activate_test_membership(client,customer);add(client,customer,row)
    member=db.scalar(select(Membership));member.revoked=True;db.commit()
    item=client.get('/commerce/cart',headers=customer).json()['items'][0]
    assert not item['available'] and 'listing' not in item and 'subtotal_paise' not in item


def test_large_quotes_use_bigint_and_stock_policy_cannot_erase_allocations(client,merchant,admin,customer):
    path,row=create(client,merchant,{**DATA,'unit_price_paise':1000000000})
    terms=client.patch(path+'/'+row['id']+'/order-terms',headers=merchant['headers'],json={**PRODUCT_TERMS,'stock_quantity':999,'revision':row['revision']}).json()
    row=review(client,admin,submit(client,merchant,path,terms)).json()
    order,_=order_request(client,customer,row,999)
    assert order['quoted_total_paise']==999000000000
    assert move(client,merchant,order,'CONFIRMED').status_code==200
    assert client.patch(path+'/'+row['id']+'/order-terms',headers=merchant['headers'],json={**PRODUCT_TERMS,'stock_quantity':998,'revision':row['revision']}).status_code==422


@pytest.mark.parametrize('quantity',[0,-1,True,1.5,'2',1000])
def test_cart_quantity_is_strict_and_bounded(client,merchant,admin,customer,quantity):
    _,row=configured(client,merchant,admin)
    assert client.put('/commerce/cart/items/'+row['id'],headers=customer,json={'quantity':quantity,'revision':0}).status_code==422


def test_request_rejects_stale_cart_and_listing_revisions(client,merchant,admin,customer):
    path,row=configured(client,merchant,admin);line=add(client,customer,row)
    data={'listing_id':row['id'],'listing_revision':row['revision'],'cart_revision':line['revision'],'fulfilment_method':'PICKUP','phone':'9000000000','idempotency_key':str(uuid4())}
    assert client.post('/commerce/orders',headers=customer,json={**data,'phone':'()--()--()'}).status_code==422
    changed=client.put('/commerce/cart/items/'+row['id'],headers=customer,json={'quantity':2,'revision':line['revision']});assert changed.status_code==200
    assert client.post('/commerce/orders',headers=customer,json=data).status_code==409
    edited=client.patch(path+'/'+row['id'],headers=merchant['headers'],json={**DATA,'revision':row['revision'],'unit_price_paise':30000});assert edited.status_code==200
    revised=review(client,admin,submit(client,merchant,path,edited.json()));assert revised.status_code==200
    assert client.post('/commerce/orders',headers=customer,json={**data,'cart_revision':changed.json()['revision']}).status_code==409
    data.update(listing_revision=revised.json()['revision'],cart_revision=changed.json()['revision'])
    created=client.post('/commerce/orders',headers=customer,json=data);assert created.status_code==201
    assert created.json()['quoted_total_paise']==60000


def test_approving_order_terms_requires_explicit_acknowledgement(client,merchant,admin):
    path,row=create(client,merchant)
    terms=client.patch(path+'/'+row['id']+'/order-terms',headers=merchant['headers'],json={**PRODUCT_TERMS,'revision':row['revision']}).json()
    row=submit(client,merchant,path,terms)
    assert listing_review(client,admin,row).status_code==422
    assert review(client,admin,row).status_code==200


def test_order_capabilities_and_admin_listing_filters(client,merchant,admin,monkeypatch):
    response=client.get('/commerce/ordering-status')
    assert response.json()=={'test_orders_enabled':True,'live_orders_enabled':False}
    assert 'no-store' in response.headers['cache-control']
    assert client.get('/admin/commerce-ordering-status').status_code==401
    assert client.get('/admin/commerce-ordering-status',headers=merchant['headers']).status_code==403
    assert client.get('/admin/commerce-ordering-status',headers=admin).json()['test_orders_enabled']
    _,row=configured(client,merchant,admin)
    assert client.get('/admin/commerce-listings?provider_id='+str(merchant['provider'].id)+'&operator=SELLER',headers=admin).json()['total']==1
    assert client.get('/admin/commerce-listings?provider_id='+str(merchant['provider'].id)+'&operator=VISTRAH',headers=admin).json()['total']==0
    assert client.get('/admin/commerce-listings?provider_id=0',headers=admin).status_code==422
    monkeypatch.setenv('APP_ENV','production')
    assert not client.get('/commerce/ordering-status').json()['test_orders_enabled']
    assert not client.get('/admin/commerce-ordering-status',headers=admin).json()['test_orders_enabled']


def test_order_intent_is_bound_to_the_cart_customer(client,merchant,admin,customer):
    _,row=configured(client,merchant,admin);line=add(client,customer,row)
    scope=client.get('/commerce/cart',headers=customer).json()['customer_id']
    data={'listing_id':row['id'],'listing_revision':row['revision'],'cart_revision':line['revision'],'fulfilment_method':'PICKUP','phone':'9000000000','idempotency_key':str(uuid4()),'expected_customer_id':scope+1000}
    assert client.post('/commerce/orders',headers=customer,json=data).status_code==409
    data['expected_customer_id']=scope
    assert client.post('/commerce/orders',headers=customer,json=data).status_code==201
    assert client.get('/commerce/orders',headers=customer).json()['customer_id']==scope


def test_recreated_cart_line_cannot_reuse_a_stale_quote_or_update_token(client,merchant,admin,customer):
    _,row=configured(client,merchant,admin);original=add(client,customer,row)
    data={'listing_id':row['id'],'listing_revision':row['revision'],'cart_revision':original['revision'],'cart_line_id':original['id'],'fulfilment_method':'PICKUP','phone':'9000000000','idempotency_key':str(uuid4())}
    assert client.delete('/commerce/cart/items/'+row['id']+'?revision=1&line_id='+original['id'],headers=customer).status_code==200
    replacement=add(client,customer,row,3)
    assert replacement['revision']==original['revision'] and replacement['id']!=original['id']
    assert client.post('/commerce/orders',headers=customer,json=data).status_code==409
    assert client.put('/commerce/cart/items/'+row['id'],headers=customer,json={'revision':1,'line_id':original['id'],'quantity':2}).status_code==409
    assert client.delete('/commerce/cart/items/'+row['id']+'?revision=1&line_id='+original['id'],headers=customer).status_code==409
    data['cart_line_id']=replacement['id']
    created=client.post('/commerce/orders',headers=customer,json=data);assert created.status_code==201
    assert created.json()['quantity']==3
