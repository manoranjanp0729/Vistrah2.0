from datetime import timedelta
from uuid import uuid4
import pytest
from sqlalchemy import select, func
from app.models import User,Provider,Payment,Membership,now
from app.security import issue_token
from app.payments import payments
from app.business_membership_models import BusinessCycle,BusinessAllowance,BusinessEntry,BusinessOperation
from app.business_membership import consume,process_cycles,snapshot,month_after

@pytest.fixture
def seller(db):
    user=User(name='Synthetic business member',email='business-member@example.com',password_hash='no-login',seller_enabled=True)
    db.add(user);db.flush()
    provider=Provider(owner_user_id=user.id,slug='business-member',name=user.name,company='Synthetic member',email=user.email,phone='',address='',location='',provenance='Disposable membership test only',verification_status='VERIFIED',active=True)
    db.add(provider);db.commit()
    return user,{'Authorization':'Bearer '+issue_token(db,user)},provider

def checkout(client,seller,plan='PLUS',key=None,period='MONTHLY'):
    response=client.post('/membership/subscriptions/checkout',headers=seller[1],json={'plan_key':plan,'billing_period':period,'idempotency_key':key or str(uuid4())})
    return response

def paid(client,seller,plan='PLUS'):
    response=checkout(client,seller,plan);assert response.status_code==201,response.text
    payment=response.json()
    result=client.post('/payments/'+payment['id']+'/simulate',headers=seller[1],json={'outcome':'SUCCEEDED'})
    assert result.status_code==200,result.text
    return payment

@pytest.mark.parametrize('plan,amount,jobs',[('BASIC',14900,5),('PLUS',79900,15),('PREMIUM',189900,50)])
def test_server_prices_verified_allowances_and_no_customer_access(client,seller,db,plan,amount,jobs):
    payment=paid(client,seller,plan)
    assert payment['amount']==amount
    status=client.get('/me/business-membership',headers=seller[1]).json()
    assert status['active'] and status['job_credits']==jobs and status['current_plan']==plan
    assert client.get('/me/membership',headers=seller[1]).json()['active'] is False
    assert db.scalar(select(func.count()).select_from(Membership))==0
    for row in status['allowances']:
        batch=db.get(BusinessAllowance,row['id'])
        if row['kind']=='JOB':assert batch.expires_at-batch.starts_at==timedelta(days=90)

@pytest.mark.parametrize('plan',['BASIC','PLUS','PREMIUM'])
def test_annual_unavailable_for_all_plans(client,seller,plan):
    assert checkout(client,seller,plan,period='ANNUAL').status_code==409
    plan_row=next(p for p in client.get('/membership/plans').json()['plans'] if p['key']==plan)
    assert plan_row['periods']['ANNUAL']=={'amount':None,'available':False}

def test_eligibility_and_admin_boundaries(client,customer,seller,db):
    data={'plan_key':'PLUS','billing_period':'MONTHLY','idempotency_key':'eligibility-test'}
    assert client.post('/membership/subscriptions/checkout',json=data).status_code==401
    assert client.post('/membership/subscriptions/checkout',headers=customer,json=data).status_code==403
    assert client.get('/admin/business-memberships',headers=seller[1]).status_code==403
    assert client.get('/admin/marketing-requests',headers=customer).status_code==403
    seller[2].active=False;db.commit()
    assert checkout(client,seller).status_code==403
    assert client.get('/me/business-membership',headers=seller[1]).json()['eligibility']=='REGISTRATION_INCOMPLETE'

def test_checkout_and_signed_callback_idempotency(client,seller,db):
    result=checkout(client,seller,key='one-checkout-key');payment=db.get(Payment,result.json()['id'])
    assert checkout(client,seller,key='one-checkout-key').json()['id']==payment.id
    assert checkout(client,seller,'BASIC',key='one-checkout-key').status_code==409
    assert client.get('/me/business-membership',headers=seller[1]).json()['job_credits']==0
    payload,signature=payments.adapter.event(payment,'SUCCEEDED')
    assert client.post('/payments/webhook',content=payload,headers={'x-signature':'wrong'}).status_code==401
    for _ in range(2):assert client.post('/payments/webhook',content=payload,headers={'x-signature':signature}).status_code==200
    assert db.scalar(select(func.count()).select_from(BusinessCycle))==1
    assert db.scalar(select(func.count()).select_from(BusinessAllowance).where(BusinessAllowance.kind=='JOB'))==1
    assert client.get('/me/business-membership',headers=seller[1]).json()['job_credits']==15

def test_production_fails_closed(client,seller,db,monkeypatch):
    payment=checkout(client,seller).json();monkeypatch.setenv('APP_ENV','production')
    assert checkout(client,seller).status_code==503
    assert client.post('/payments/'+payment['id']+'/simulate',headers=seller[1],json={'outcome':'SUCCEEDED'}).status_code==503
    assert client.get('/me/business-membership',headers=seller[1]).json()['job_credits']==0
    assert client.get('/membership/plans').json()['checkout_supported'] is False

def test_fifo_rollover_expiry_atomic_usage_and_retry(client,seller,db):
    paid(client,seller,'BASIC');user=seller[0]
    early=BusinessAllowance(id=str(uuid4()),user_id=user.id,kind='JOB',allowance=2,starts_at=now()-timedelta(days=85),expires_at=now()+timedelta(days=5))
    expired=BusinessAllowance(id=str(uuid4()),user_id=user.id,kind='JOB',allowance=9,starts_at=now()-timedelta(days=91),expires_at=now()-timedelta(days=1))
    db.add_all([early,expired]);db.commit()
    op=consume(db,user,'JOB',3,'fifo-use-test','Synthetic usage');db.commit()
    assert consume(db,user,'JOB',3,'fifo-use-test','Synthetic usage').id==op.id
    db.refresh(early);assert early.used==2
    assert snapshot(db,user)['job_credits']==4
    with pytest.raises(Exception) as failure:consume(db,user,'JOB',5,'overdraft-test','Synthetic overdraft')
    assert failure.value.status_code==409
    db.rollback();process_cycles(db,user);db.commit();process_cycles(db,user);db.commit()
    assert db.scalar(select(func.count()).select_from(BusinessEntry).where(BusinessEntry.batch_id==expired.id,BusinessEntry.action=='EXPIRE'))==1
    assert expired.used==0

def test_marketing_reservation_limits_release_and_manual_completion(client,seller,admin):
    paid(client,seller,'PLUS')
    data={'kind':'CAMPAIGN','quantity':1,'brief':'A reviewed synthetic campaign brief','idempotency_key':'campaign-reservation'}
    response=client.post('/membership/benefit-requests',headers=seller[1],json=data);assert response.status_code==201,response.text
    row=response.json();assert row['status']=='REQUESTED'
    assert client.post('/membership/benefit-requests',headers=seller[1],json=data).json()['id']==row['id']
    assert client.post('/membership/benefit-requests',headers=seller[1],json={**data,'idempotency_key':'another-campaign'}).status_code==409
    path='/admin/marketing-requests/'+row['id']
    body={'status':'COMPLETED','expected_status':'REQUESTED','reason':'Synthetic reviewed completion'}
    assert client.post(path,headers=admin,json=body).status_code==409
    assert client.post(path,headers=seller[1],json=body).status_code==403
    cancel={**body,'status':'CANCELLED'}
    assert client.post(path,headers=admin,json=cancel).status_code==200
    assert client.post(path,headers=admin,json=cancel).status_code==409
    state=client.get('/me/business-membership',headers=seller[1]).json()
    assert next(a for a in state['allowances'] if a['kind']=='CAMPAIGN')['remaining']==1
    assert client.post('/membership/benefit-requests',headers=seller[1],json={**data,'idempotency_key':'replacement-campaign'}).status_code==201

def test_failed_payment_refund_and_nonrenewal(client,seller,admin,db):
    result=checkout(client,seller).json()
    assert client.post('/payments/'+result['id']+'/simulate',headers=seller[1],json={'outcome':'FAILED'}).status_code==200
    assert client.get('/me/business-membership',headers=seller[1]).json()['status']=='FAILED'
    payment=paid(client,seller)
    for _ in range(2):assert client.post('/membership/subscriptions/non-renewal',headers=seller[1]).status_code==200
    assert client.get('/me/business-membership',headers=seller[1]).json()['status']=='NON_RENEWING'
    assert client.post('/admin/payments/'+payment['id']+'/refund',headers=admin,json={'reason':'Synthetic full business membership refund'}).status_code==200
    assert client.get('/me/business-membership',headers=seller[1]).json()['job_credits']==0

def test_expired_cycle_keeps_job_credit_and_expires_marketing(client,seller,db):
    paid(client,seller)
    cycle=db.scalar(select(BusinessCycle));cycle.ends_at=now()-timedelta(seconds=1)
    for row in db.scalars(select(BusinessAllowance).where(BusinessAllowance.kind!='JOB')):row.expires_at=cycle.ends_at
    db.commit();state=client.get('/me/business-membership',headers=seller[1]).json()
    assert state['status']=='EXPIRED' and state['job_credits']==15
    assert all(a['remaining']==0 for a in state['allowances'] if a['kind']!='JOB')

def test_renewal_and_plan_change_queue_do_not_issue_early(client,seller,db,monkeypatch):
    paid(client,seller,'BASIC');paid(client,seller,'PREMIUM')
    cycles=db.scalars(select(BusinessCycle).order_by(BusinessCycle.created_at)).all()
    assert cycles[1].starts_at==cycles[0].ends_at
    assert snapshot(db,seller[0])['job_credits']==5
    future_batches=db.scalars(select(BusinessAllowance).where(BusinessAllowance.cycle_id==cycles[1].id)).all()
    assert future_batches and all(batch.starts_at==cycles[1].starts_at for batch in future_batches)
    from app.payments import aware
    monkeypatch.setattr('app.business_membership.now',lambda:aware(cycles[1].starts_at)+timedelta(seconds=1))
    # Effective issuance and rollover become available by time, without a scheduler visit.
    assert snapshot(db,seller[0])['job_credits']==55
    for _ in range(2):assert client.post('/membership/subscriptions/process',headers=seller[1]).status_code==200
    assert snapshot(db,seller[0])['job_credits']==55
    assert snapshot(db,seller[0])['current_plan']=='PREMIUM'

def test_admin_adjustments_preserve_history_and_are_idempotent(client,seller,admin):
    paid(client,seller,'BASIC');path=f'/admin/business-memberships/{seller[0].id}/job-adjustment'
    data={'quantity':2,'reason':'Synthetic approved goodwill adjustment','idempotency_key':'admin-adjustment'}
    assert client.post(path,headers=seller[1],json=data).status_code==403
    for _ in range(2):assert client.post(path,headers=admin,json=data).status_code==200
    assert client.get('/me/business-membership',headers=seller[1]).json()['job_credits']==7
    assert client.get(f'/admin/business-memberships/{seller[0].id}',headers=admin).json()['ledger']
    assert client.get('/admin/business-memberships',headers=admin).json()['total']==1

def test_calendar_month_boundary():
    assert month_after(now().replace(year=2026,month=1,day=31)).day==28


def test_reporting_is_access_not_an_invented_one_report_limit(client,seller):
    paid(client,seller,'BASIC')
    for index in range(2):
        result=client.post('/membership/benefit-requests',headers=seller[1],json={'kind':'STANDARD_REPORT','quantity':1,'brief':'Synthetic report access request','idempotency_key':'report-access-'+str(index)})
        assert result.status_code==201,result.text
    state=client.get('/me/business-membership',headers=seller[1]).json()
    access=next(a for a in state['allowances'] if a['kind']=='STANDARD_REPORT')
    assert access['remaining']==1 and access['access_uses']==2


def test_pending_approval_and_pending_plan_filter(client,seller,admin,db,seeded):
    checkout(client,seller,'PREMIUM')
    result=client.get('/admin/business-memberships?plan=PREMIUM&status=PENDING',headers=admin)
    assert result.status_code==200,result.text
    assert result.json()['total']==1
    from app.provider_models import ProviderApplication
    from app.models import Category
    seller[2].active=False
    db.add(ProviderApplication(id=str(uuid4()),user_id=seller[0].id,category_id=db.scalar(select(Category.id)),common_configuration={},status='SUBMITTED'))
    db.commit()
    assert client.get('/me/business-membership',headers=seller[1]).json()['eligibility']=='APPROVAL_PENDING'


def test_campaign_video_duration_and_social_credit_caps(client,seller):
    paid(client,seller,'PREMIUM')
    data={'kind':'CAMPAIGN','quantity':1,'brief':'Synthetic duration-limited campaign','idempotency_key':'duration-boundary','duration_days':8}
    assert client.post('/membership/benefit-requests',headers=seller[1],json=data).status_code==422
    data['duration_days']=7
    result=client.post('/membership/benefit-requests',headers=seller[1],json=data)
    assert result.status_code==201 and result.json()['duration_days']==7
    assert client.post('/membership/benefit-requests',headers=seller[1],json={**data,'duration_days':6}).status_code==409
    social={'kind':'SOCIAL_PAISE','quantity':50001,'brief':'Synthetic social advertising request','idempotency_key':'social-overspend'}
    assert client.post('/membership/benefit-requests',headers=seller[1],json=social).status_code==409
    social['quantity']=50000
    assert client.post('/membership/benefit-requests',headers=seller[1],json=social).status_code==201
    assert client.post('/membership/benefit-requests',headers=seller[1],json={**social,'idempotency_key':'social-second-spend','quantity':1}).status_code==409


@pytest.mark.parametrize('driver',['sqlite','postgresql'])
def test_concurrent_usage_cannot_double_spend(tmp_path,driver):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session
    from sqlalchemy.exc import OperationalError
    from fastapi import HTTPException
    from app.database import Base
    controller=None
    if driver=='postgresql':
        import os
        from sqlalchemy.engine import make_url
        from sqlalchemy import text
        url=os.getenv('TEST_DATABASE_URL','')
        if not url.startswith('postgresql'):
            pytest.skip('PostgreSQL race requires isolated CI database; SQLite race runs locally')
        parsed=make_url(url)
        assert parsed.host in ('127.0.0.1','localhost') and parsed.database=='vistrah_ci_test' and parsed.username=='vistrah_ci'
        schema='membership_race_'+uuid4().hex;controller=create_engine(url)
        with controller.begin() as connection:connection.execute(text('CREATE SCHEMA '+schema))
        engine=create_engine(url,connect_args={'options':'-csearch_path='+schema})
    else:
        engine=create_engine('sqlite:///'+(tmp_path/'disposable-credit-race.db').as_posix(),connect_args={'check_same_thread':False,'timeout':10})
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        user=User(name='Race fixture',email='credit-race@example.com',password_hash='disabled',seller_enabled=True);session.add(user);session.flush();user_id=user.id
        session.add(Provider(owner_user_id=user_id,slug='race',name='Race',company='Race',email=user.email,phone='',address='',location='',provenance='Disposable race fixture',active=True,verification_status='VERIFIED'))
        session.add(BusinessAllowance(id=str(uuid4()),user_id=user_id,kind='JOB',allowance=1,starts_at=now()-timedelta(seconds=1),expires_at=now()+timedelta(days=90)));session.commit()
    barrier=Barrier(2)
    def spend(index):
        with Session(engine) as session:
            user=session.get(User,user_id);barrier.wait()
            try:
                consume(session,user,'JOB',1,'race-'+str(index),'Synthetic race');session.commit();return 'used'
            except (HTTPException,OperationalError):session.rollback();return 'conflict'
    with ThreadPoolExecutor(max_workers=2) as executor:results=list(executor.map(spend,[1,2]))
    assert results.count('used')==1
    with Session(engine) as session:
        assert session.scalar(select(BusinessAllowance.used))==1
        assert session.scalar(select(func.count()).select_from(BusinessOperation))==1
    engine.dispose()
    if controller:
        with controller.begin() as connection:connection.execute(text('DROP SCHEMA '+schema+' CASCADE'))
        controller.dispose()
