"""I1: real routes, isolated fixtures only; no normal service/database calls."""
from datetime import timedelta
import pytest
from sqlalchemy import select
from app.models import Membership, Payment, Plan, Provider, ProviderService, User, WebhookEvent, Allocation, Service, ServiceRequest, now
from app.security import issue_token

@pytest.fixture
def service(client, seeded, db):
    sid = client.get('/catalogue').json()[0]['services'][0]['id']
    provider = Provider(slug='isolated-provider', name='Fixture', company='Isolated company', email='fixture@example.com', phone='1234567890', address='Synthetic address', location='Fixture locality', provenance='Test', verification_status='VERIFIED', active=True)
    db.add(provider); db.flush()
    db.add(ProviderService(provider_id=provider.id, service_id=sid, approval_status='APPROVED')); db.commit()
    return sid

def action(client, sid, kind, headers):
    if kind == 'enquiry':
        return client.post('/requests', headers=headers, json={'service_id':sid,'requirements':'Synthetic service enquiry for isolation.','location':'Fixture locality','phone':'1234567890'})
    suffix={'directory':'providers','detail':'providers/isolated-provider','information':'member-information'}[kind]
    return client.get(f'/services/{sid}/{suffix}', headers=headers)

@pytest.mark.parametrize('kind',['directory','detail','information','enquiry'])
@pytest.mark.parametrize('state',['anonymous','nonmember','active','expired','future','revoked','pending','failed','refunded'])
def test_every_protected_endpoint(client, db, customer, service, kind, state):
    headers={} if state=='anonymous' else customer
    if state not in ('anonymous','nonmember'):
        p=client.post('/payments/checkout',headers=customer,json={'idempotency_key':'isolated-access-matrix-key'}).json()
        if state not in ('pending','failed'):
            assert client.post(f'/payments/{p["id"]}/simulate',headers=customer,json={'outcome':'SUCCEEDED'}).status_code==200
            term=db.scalar(select(Membership).where(Membership.payment_id==p['id']))
            if state=='expired':term.starts_at=now()-timedelta(days=2);term.expires_at=now()-timedelta(days=1)
            if state=='future':term.starts_at=now()+timedelta(days=1);term.expires_at=now()+timedelta(days=2)
            if state=='revoked':term.revoked=True
            if state=='refunded':db.get(Payment,p['id']).status='REFUNDED'
            db.commit()
        elif state=='failed':
            assert client.post(f'/payments/{p["id"]}/simulate',headers=customer,json={'outcome':'FAILED'}).status_code==200
    response=action(client,service,kind,headers)
    assert response.status_code == (401 if state=='anonymous' else (201 if kind=='enquiry' else 200) if state=='active' else 403)
    assert response.headers['cache-control']=='private, no-store'
    if state!='active':assert 'Synthetic address' not in response.text and 'fixture@example.com' not in response.text
    status=client.get('/me/membership',headers=headers)
    offers=client.get('/membership/offers',headers=headers)
    assert status.status_code==offers.status_code==(401 if state=='anonymous' else 200)
    assert offers.headers['cache-control']=='private, no-store'
    if state!='anonymous':
        assert status.json()['active']==(state=='active')
        if state!='active':assert offers.json()==[]  # Retain the existing inactive-offers contract.

@pytest.mark.parametrize('environment',[None,'production','test','staging','DEVELOPMENT'])
def test_sandbox_fails_closed_outside_explicit_development(client,member_customer,service,monkeypatch,environment):
    if environment is None:monkeypatch.delenv('APP_ENV',raising=False)
    else:monkeypatch.setenv('APP_ENV',environment)
    assert not client.get('/me/membership',headers=member_customer).json()['active']
    for kind in ['directory','detail','information','enquiry']:assert action(client,service,kind,member_customer).status_code==403

@pytest.mark.parametrize('broken',['no-event','no-credit','wrong-owner','wrong-product'])
def test_dates_and_success_flag_alone_do_not_qualify(client,db,customer,service,broken):
    uid=client.get('/me',headers=customer).json()['id']; plan=db.scalar(select(Plan))
    if broken=='wrong-product':
        plan=Plan(name='Not membership',amount=12900,currency='INR',days=30);db.add(plan);db.flush()
    payment=Payment(id='forged-link',user_id=uid,plan_id=plan.id,amount=12900,currency='INR',status='SUCCEEDED',mode='SANDBOX',idempotency_key='forged-link')
    db.add(payment);db.flush()
    if broken!='no-event':db.add(WebhookEvent(id='fixture-event',payment_id=payment.id,payload_hash='0'*64))
    if broken!='no-credit':db.add(Allocation(payment_id=payment.id,amount=12900,kind='CREDIT'))
    if broken=='wrong-owner':
        other=User(name='Synthetic owner',email='owner@example.com',password_hash='unusable');db.add(other);db.flush();payment.user_id=other.id
    db.add(Membership(user_id=uid,payment_id=payment.id,starts_at=now()-timedelta(minutes=1),expires_at=now()+timedelta(days=1)));db.commit()
    for kind in ['directory','detail','information','enquiry']:assert action(client,service,kind,customer).status_code==403

def test_no_admin_exemption_and_revoked_session(client, db, admin, service):
    assert client.get('/admin/overview',headers=admin).status_code==200
    for kind in ['directory','detail','information','enquiry']:assert action(client,service,kind,admin).status_code==403
    assert client.post('/auth/logout',headers=admin).status_code==200
    assert action(client,service,'directory',admin).status_code==401

def test_expired_session_cannot_use_an_active_membership(client, member_customer, service):
    import jwt
    from app.config import JWT_SECRET
    token=member_customer['Authorization'].removeprefix('Bearer ')
    payload=jwt.decode(token,JWT_SECRET,algorithms=['HS256'],audience='vistrah-api',issuer='vistrah')
    payload['exp']=now()-timedelta(seconds=1)
    headers={'Authorization':'Bearer '+jwt.encode(payload,JWT_SECRET,algorithm='HS256')}
    for kind in ['directory','detail','information','enquiry']:
        assert action(client,service,kind,headers).status_code==401

def test_preserves_history_receipts_and_excluded_workflows(client,db,member_customer,service):
    r=action(client,service,'enquiry',member_customer);assert r.status_code==201
    term=db.scalar(select(Membership));term.revoked=True;db.commit()
    for path in ['/me/requests','/me/payments','/me/orders','/provider-applications','/provider-leads','/finds/requests','/finds/actions','/finds/workflows']:
        assert client.get(path,headers=member_customer).status_code==200
    for path in ['/catalogue','/membership/plan','/jobs']:assert client.get(path).status_code==200
    assert client.get('/me/requests',headers=member_customer).json()[0]['id']==r.json()['id']
    # Existing job requests remain usable by Finds without an active term.
    uid=client.get('/me',headers=member_customer).json()['id']
    job=db.scalar(select(Service).where(Service.slug=='job-search-assistance'))
    historical=ServiceRequest(user_id=uid,service_id=job.id,requirements='Synthetic preserved job request',location='Fixture locality',phone='1234567890')
    db.add(historical);db.commit()
    run=client.post('/finds/workflows',headers=member_customer,json={'request_id':historical.id,'idempotency_key':'isolated-preserved-finds','inputs':{}})
    assert run.status_code==201
    assert client.get('/finds/workflows/'+run.json()['id'],headers=member_customer).status_code==200
    assert client.get('/admin/overview',headers=member_customer).status_code==403
    other=User(name='Other synthetic user',email='other-fixture@example.com',password_hash='unusable');db.add(other);db.commit()
    h={'Authorization':'Bearer '+issue_token(db,other)}
    assert client.get('/me/requests',headers=h).json()==[]
    assert client.get('/me/payments',headers=h).json()==[]
    assert action(client,service,'detail',h).status_code==403

def test_registration_initiation_and_forged_success_are_not_activation(client,customer,service):
    assert not client.get('/me/membership?success=true',headers=customer).json()['active']
    assert client.post('/payments/checkout',headers=customer,json={'idempotency_key':'isolated-pending-order-key'}).status_code==201
    assert action(client,service,'detail',customer).status_code==403
    assert client.post('/payments/webhook',content='{}',headers={'x-signature':'invalid'}).status_code==401
    assert not client.get('/me/membership',headers=customer).json()['active']
