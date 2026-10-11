import hashlib
import hmac
import json
import time
from datetime import timedelta
import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import DBAPIError
from app.models import User, Service, Provider, Membership, Allocation, Audit, now
from app.config import WEBHOOK_SECRET
from app.payments import payments
from app.seed import seed

def service_id(client):
    return client.get('/catalogue').json()[0]['services'][0]['id']

def provider_data():
    return {'slug':'test-outdoors','name':'Provider Contact','company':'Test Outdoor Company','email':'provider@example.com','phone':'6364456776','address':'123 Example Road','location':'Bengaluru','source_url':'https://example.com/provider','provenance':'Manually submitted for administrator review'}

def signed(body):
    payload=json.dumps(body).encode()
    return payload, {'X-Signature':hmac.new(WEBHOOK_SECRET.encode(),payload,hashlib.sha256).hexdigest()}

def create_payment(client, customer, key='unique-checkout-key-12345'):
    response=client.post('/payments/checkout',headers=customer,json={'idempotency_key':key})
    assert response.status_code==201,response.text
    return response.json()

def test_migration_and_empty_database(client,db):
    assert client.get('/health').status_code==200
    assert client.get('/catalogue').json()==[]
    from alembic.config import Config
    from alembic.script import ScriptDirectory
    assert db.scalar(text('SELECT version_num FROM alembic_version'))==ScriptDirectory.from_config(Config('alembic.ini')).get_current_head()
    assert db.scalar(text('SELECT COUNT(*) FROM workflow_runs'))==0
    assert client.get('/catalogue/lookup?category=unknown&service=unknown').status_code==404

def test_canonical_catalogue_and_every_service_lookup(client,seeded):
    cats=client.get('/catalogue').json()
    assert len(cats)==8
    count=0
    for cat in cats:
        for service in cat['services']:
            r=client.get('/catalogue/lookup',params={'category':cat['slug'],'service':service['slug']})
            assert r.status_code==200 and r.json()['id']==service['id']
            count+=1
        for sub in cat['subcategories']:
            for service in sub['services']:
                r=client.get('/catalogue/lookup',params={'category':cat['slug'],'subcategory':sub['slug'],'service':service['slug']})
                assert r.status_code==200 and r.json()['id']==service['id']
                assert client.get('/catalogue/lookup',params={'category':cat['slug'],'service':service['slug']}).status_code==404
                count+=1
    assert count==59

def test_seed_preserves_edits_and_deleted_content(client,seeded,admin,db):
    cat=client.get('/catalogue').json()[0]
    data={k:cat[k] for k in ['slug','title','description','image']}
    data['active']=False
    assert client.put(f"/admin/catalogue/categories/{cat['id']}",headers=admin,json=data).status_code==200
    seed(db)
    assert len(client.get('/catalogue').json())==7

def test_authentication_and_revocable_logout(client,customer,db):
    assert client.get('/me').status_code==401
    user=client.get('/me',headers=customer).json()
    assert user['role']=='CUSTOMER' and 'password_hash' not in user
    stored=db.scalar(select(User).where(User.email=='customer@example.com'))
    assert stored.password_hash.startswith('$argon2')
    assert client.post('/auth/login',json={'email':user['email'],'password':'wrong'}).status_code==401
    login=client.post('/auth/login',json={'email':user['email'],'password':'a-secure-password-123'})
    assert login.status_code==200
    assert client.post('/auth/logout',headers=customer).status_code==200
    assert client.get('/me',headers=customer).status_code==401

def test_registration_validation_and_role_injection(client):
    for data in [{'name':'Customer','email':'bad','password':'short'}, {'name':'Customer','email':'test@example.com','password':'password12345','role':'ADMIN'}]:
        assert client.post('/auth/register',json=data).status_code==422

def test_login_rate_limiting(client):
    for _ in range(10):
        assert client.post('/auth/login',json={'email':'nonexistent@example.com','password':'wrong'}).status_code==401
    assert client.post('/auth/login',json={'email':'nonexistent@example.com','password':'wrong'}).status_code==429

@pytest.mark.parametrize('path',['overview','requests','providers','catalogue','offers','payments','audit'])
def test_admin_authorization(client,customer,path):
    assert client.get('/admin/'+path,headers=customer).status_code==403
    assert client.get('/admin/'+path).status_code==401

def test_profile(client,customer):
    assert client.patch('/me',headers=customer,json={'name':'Updated Name','phone':'6364456776'}).status_code==200
    assert client.get('/me',headers=customer).json()['phone']=='6364456776'

def test_requests_persist_and_enforce_state_transitions(client,seeded,member_customer,admin):
    customer=member_customer
    sid=service_id(client)
    r=client.post('/requests',headers=customer,json={'service_id':sid,'requirements':'I need a resume review for an engineering role.','location':'Bengaluru','phone':'6364456776'})
    assert r.status_code==201
    id=r.json()['id']
    assert client.get('/me/requests',headers=customer).json()[0]['id']==id
    assert client.patch(f'/admin/requests/{id}',headers=customer,json={'status':'COMPLETED'}).status_code==403
    assert client.patch(f'/admin/requests/{id}',headers=admin,json={'status':'COMPLETED'}).status_code==409
    for status in ['UNDER_REVIEW','ASSIGNED','IN_PROGRESS','COMPLETED']:
        assert client.patch(f'/admin/requests/{id}',headers=admin,json={'status':status}).status_code==200
    assert client.get('/me/requests',headers=customer).json()[0]['status']=='COMPLETED'
    assert client.patch(f'/admin/requests/{id}',headers=admin,json={'status':'NEW'}).status_code==409
    second=client.post('/auth/register',json={'name':'Other User','email':'other@example.com','password':'password-other-123'}).json()
    assert client.get('/me/requests',headers={'Authorization':'Bearer '+second['access_token']}).json()==[]

def test_request_validation(client,member_customer,seeded):
    customer=member_customer
    assert client.post('/requests',headers=customer,json={'service_id':99999,'requirements':'An adequately long requirement.','location':'Delhi','phone':'6364456776'}).status_code==404
    assert client.post('/requests',headers=customer,json={'service_id':service_id(client),'requirements':'short','location':'Delhi','phone':'x'}).status_code==422

def test_provider_verification_and_association(client,admin,seeded,member_customer):
    data=provider_data()
    p=client.post('/admin/providers',headers=admin,json=data)
    assert p.status_code==201
    id=p.json()['id'];sid=service_id(client)
    assert client.patch(f'/admin/providers/{id}/active',headers=admin,json={'active':True}).status_code==409
    assert client.put(f'/admin/providers/{id}/services',headers=admin,json={'service_ids':[sid]}).status_code==200
    assert client.get(f'/services/{sid}/providers',headers=member_customer).json()==[]
    assert client.post(f'/admin/providers/{id}/verification',headers=admin,json={'status':'VERIFIED','evidence':'Reviewed company registration and professional documentation.'}).status_code==200
    assert client.patch(f'/admin/providers/{id}/active',headers=admin,json={'active':True}).status_code==200
    assert client.get(f'/services/{sid}/providers',headers=member_customer).json()==[]
    assert client.post(f'/admin/providers/{id}/services/{sid}/review',headers=admin,json={'status':'APPROVED','reason':'Service capability and evidence manually reviewed.'}).status_code==200
    assert client.get(f'/services/{sid}/providers/{data["slug"]}',headers=member_customer).status_code==200
    assert client.get(f'/services/{sid}/providers/missing',headers=member_customer).status_code==404
    assert client.put(f'/admin/providers/{id}',headers=admin,json={**data,'location':'Mumbai'}).status_code==200
    # D05: proposed details remain a reviewed draft; accurate approved publication stays.
    assert client.get(f'/services/{sid}/providers/{data["slug"]}',headers=member_customer).json()['location']==data['location']
    assert client.post(f'/admin/providers/{id}/verification',headers=admin,json={'status':'VERIFIED','evidence':'short'}).status_code==422

def test_catalogue_crud_and_safe_deletion(client,admin,seeded,customer):
    data={'slug':'special-category','title':'Special Category','description':'A new category for catalogue CRUD testing.'}
    r=client.post('/admin/catalogue/categories',headers=admin,json=data)
    assert r.status_code==201
    id=r.json()['id']
    sub=client.post('/admin/catalogue/subcategories',headers=admin,json={**data,'slug':'special-subcategory','category_id':id})
    assert sub.status_code==201
    assert client.delete(f'/admin/catalogue/categories/{id}',headers=admin).status_code==409
    assert client.delete(f'/admin/catalogue/subcategories/{sub.json()["id"]}',headers=admin).status_code==200
    assert client.delete(f'/admin/catalogue/categories/{id}',headers=admin).status_code==200
    assert client.post('/admin/catalogue/categories',headers=admin,json={**data,'slug':'service'}).status_code==422

def test_membership_checkout_webhook_idempotency_and_refund(client,customer,admin,seeded,db):
    assert not client.get('/me/membership',headers=customer).json()['active']
    payment=create_payment(client,customer)
    assert payment['amount']==12900 and payment['mode']=='SANDBOX'
    assert create_payment(client,customer)['id']==payment['id']
    for _ in range(2):
        r=client.post(f'/payments/{payment["id"]}/simulate',headers=customer,json={'outcome':'SUCCEEDED'})
        assert r.status_code==200 and r.json()['status']=='SUCCEEDED'
    assert client.get('/me/membership',headers=customer).json()['active']
    assert len(list(db.scalars(select(Allocation))))==1
    assert len(client.get('/me/orders',headers=customer).json())==1
    ledger=client.get(f'/admin/payments/{payment["id"]}/ledger',headers=admin).json()
    assert ledger['settlement_eligible'] and ledger['settlement_mode']=='SANDBOX_ONLY_NO_DISBURSEMENT'
    assert all(r['balanced'] for r in client.post('/admin/reconciliation',headers=admin).json())
    r=client.post(f'/admin/payments/{payment["id"]}/refund',headers=admin,json={'reason':'Refund sandbox membership for testing.'})
    assert r.status_code==200
    assert not client.get('/me/membership',headers=customer).json()['active']
    assert sum(a.amount for a in db.scalars(select(Allocation)))==0
    assert client.post(f'/admin/payments/{payment["id"]}/refund',headers=admin,json={'reason':'Retry the same sandbox refund.'}).json()['id']==r.json()['id']
    assert all(r['balanced'] for r in client.post('/admin/reconciliation',headers=admin).json())

def test_webhook_signature_amount_timestamp_and_conflicting_outcomes(client,customer,seeded):
    p=create_payment(client,customer)
    event={'event_id':'event-unique-test-123','payment_id':p['id'],'amount':p['amount'],'currency':'INR','status':'SUCCEEDED','timestamp':int(time.time())}
    body,headers=signed(event)
    assert client.post('/payments/webhook',content=body,headers={'X-Signature':'invalid'}).status_code==401
    for modified in [{**event,'amount':1},{**event,'timestamp':0}]:
        body,headers=signed(modified)
        assert client.post('/payments/webhook',content=body,headers=headers).status_code==400
    body,headers=signed(event)
    assert client.post('/payments/webhook',content=body,headers=headers).status_code==200
    assert client.post('/payments/webhook',content=body,headers=headers).status_code==200
    for modified in [{**event,'status':'FAILED'},{**event,'event_id':'different-event-test-123','status':'FAILED'}]:
        body,headers=signed(modified)
        assert client.post('/payments/webhook',content=body,headers=headers).status_code==409

def test_failed_checkout_does_not_activate_membership(client,customer,seeded):
    p=create_payment(client,customer)
    assert client.post(f'/payments/{p["id"]}/simulate',headers=customer,json={'outcome':'FAILED'}).status_code==200
    assert not client.get('/me/membership',headers=customer).json()['active']
    assert client.get('/me/orders',headers=customer).json()==[]

def test_payment_ownership(client,customer,seeded):
    p=create_payment(client,customer)
    other=client.post('/auth/register',json={'name':'Other User','email':'other@example.com','password':'other-user-password'}).json()
    assert client.post(f'/payments/{p["id"]}/simulate',headers={'Authorization':'Bearer '+other['access_token']},json={'outcome':'SUCCEEDED'}).status_code==404

def test_membership_offers_configuration_and_dates(client,customer,admin,seeded):
    data={'title':'Member career offer','scope':'ALL','type':'PERCENT','value':10,'terms':'Valid for selected requirements after scope confirmation.','starts_at':(now()-timedelta(days=1)).isoformat(),'ends_at':(now()+timedelta(days=5)).isoformat(),'active':True}
    offer=client.post('/admin/offers',headers=admin,json=data)
    assert offer.status_code==201
    assert client.get('/membership/offers',headers=customer).json()==[]
    p=create_payment(client,customer)
    client.post(f'/payments/{p["id"]}/simulate',headers=customer,json={'outcome':'SUCCEEDED'})
    assert len(client.get('/membership/offers',headers=customer).json())==1
    assert client.put(f'/admin/offers/{offer.json()["id"]}',headers=admin,json={**data,'active':False}).status_code==200
    assert client.get('/membership/offers',headers=customer).json()==[]
    assert client.post('/admin/offers',headers=admin,json={**data,'value':101}).status_code==422
    assert client.post('/admin/offers',headers=admin,json={**data,'ends_at':data['starts_at']}).status_code==422

def test_append_only_audit_and_export(client,admin,db):
    client.post('/admin/providers',headers=admin,json=provider_data())
    records=client.get('/admin/audit?q=provider',headers=admin).json()
    assert records['total']==1
    export=client.get('/admin/audit/export',headers=admin)
    assert export.status_code==200 and 'PROVIDER_CREATE' in export.text
    with pytest.raises(DBAPIError):
        with db.begin_nested():
            db.execute(text("UPDATE audit_logs SET action='tampered'"))

def test_immutable_allocation_history(client,customer,seeded,db):
    p=create_payment(client,customer)
    client.post(f'/payments/{p["id"]}/simulate',headers=customer,json={'outcome':'SUCCEEDED'})
    with pytest.raises(DBAPIError):
        with db.begin_nested():
            db.execute(text('DELETE FROM allocations'))
