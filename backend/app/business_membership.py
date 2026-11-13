"""Server-authoritative business benefits; existing sandbox payments remain sandbox-only."""
import calendar
import os
from datetime import timedelta
from uuid import uuid4
from fastapi import HTTPException
from sqlalchemy import select, update
from .models import User, Provider, Plan, Payment, Audit, now
from .payments import aware
from .business_membership_models import BusinessSubscription, BusinessCycle, BusinessAllowance, BusinessOperation, BusinessEntry, MarketingRequest

# Approved public terms share one versioned, read-only source with both clients.
from copy import deepcopy
import json
from pathlib import Path
_APPROVED_CATALOGUE=json.loads((Path(__file__).resolve().parents[2]/'shared'/'business-membership-catalogue.json').read_text(encoding='utf-8'))
PLANS={plan['key']:{'amount':plan['periods']['MONTHLY']['amount'],'allowances':dict(plan['allowances'])} for plan in _APPROVED_CATALOGUE['plans']}
LABELS={benefit['kind']:benefit['label'] for plan in _APPROVED_CATALOGUE['plans'] for benefit in plan['benefits']}
ACCESS_KINDS = {'STANDARD_REPORT','BASIC_REPORT','DETAILED_REPORT','BILLBOARD_PRIORITY'}


def development():
    return os.getenv('APP_ENV','production') == 'development'


def require_boundary():
    if not development():
        raise HTTPException(503,'Live business subscription payments are not configured. No purchase or entitlement was created.')


def lock_user(db, user_id):
    return db.scalar(select(User).where(User.id==user_id).with_for_update().execution_options(populate_existing=True))


def eligibility(db, user):
    if not user.seller_enabled:
        return 'CUSTOMER'
    if db.scalar(select(Provider.id).where(Provider.owner_user_id==user.id,Provider.active.is_(True),Provider.verification_status=='VERIFIED')):
        return 'APPROVED_SELLER'
    from .provider_models import ProviderApplication
    pending = db.scalar(select(ProviderApplication.id).where(ProviderApplication.user_id==user.id,ProviderApplication.status.in_(['SUBMITTED','UNDER_REVIEW','CHANGES_REQUESTED'])))
    return 'APPROVAL_PENDING' if pending else 'REGISTRATION_INCOMPLETE'


def approved(db, user):
    if eligibility(db,user) != 'APPROVED_SELLER':
        raise HTTPException(403,'An approved seller with an active verified owned business is required')


def catalogue():
    result=deepcopy(_APPROVED_CATALOGUE)
    result.update(payment_mode='SANDBOX' if development() else 'UNAVAILABLE',checkout_supported=development())
    return result


def record(db,user,action,entity_id,details=None):
    db.add(Audit(actor_id=user.id,action=action,entity='business_membership',entity_id=str(entity_id),details=details or {}))


def subscription(db,user):
    return db.scalar(select(BusinessSubscription).where(BusinessSubscription.user_id==user.id))


def checkout(db,user,plan_key,period,key):
    require_boundary(); lock_user(db,user.id); approved(db,user)
    if period!='MONTHLY':
        raise HTTPException(409,'Annual pricing coming soon.')
    definition=PLANS[plan_key]
    existing=db.scalar(select(Payment).where(Payment.user_id==user.id,Payment.idempotency_key==key))
    if existing:
        cycle=db.scalar(select(BusinessCycle).where(BusinessCycle.payment_id==existing.id))
        if not cycle or cycle.plan_key!=plan_key or cycle.billing_period!=period:
            raise HTTPException(409,'Idempotency key belongs to a different selection')
        return existing
    sub=subscription(db,user)
    if not sub:
        sub=BusinessSubscription(id=str(uuid4()),user_id=user.id);db.add(sub);db.flush()
    pending=db.scalar(select(BusinessCycle).where(BusinessCycle.subscription_id==sub.id,BusinessCycle.state=='PENDING'))
    if pending:
        raise HTTPException(409,'Resolve the pending payment before starting another subscription cycle')
    # Reuse the existing plan/payment tables without changing legacy plan records.
    name='VISTRAH Business '+plan_key+' '+period
    plan=db.scalar(select(Plan).where(Plan.name==name))
    if not plan:
        # Serialize plan provisioning across users using a transaction advisory lock on PostgreSQL.
        if db.bind.dialect.name=='postgresql':
            from sqlalchemy import text
            db.execute(text('SELECT pg_advisory_xact_lock(73619421)'))
            plan=db.scalar(select(Plan).where(Plan.name==name))
        if not plan:
            plan=Plan(name=name,amount=definition['amount'],currency='INR',days=30);db.add(plan);db.flush()
    payment=Payment(id=str(uuid4()),user_id=user.id,plan_id=plan.id,amount=definition['amount'],currency='INR',idempotency_key=key)
    db.add(payment);db.flush()
    db.add(BusinessCycle(id=str(uuid4()),subscription_id=sub.id,payment_id=payment.id,plan_key=plan_key,billing_period=period,allowances=dict(definition['allowances'])))
    record(db,user,'BUSINESS_CHECKOUT',payment.id,{'plan':plan_key,'period':period,'mode':'SANDBOX'})
    db.commit();return payment


def month_after(value):
    year=value.year+(value.month==12);month=value.month%12+1
    return value.replace(year=year,month=month,day=min(value.day,calendar.monthrange(year,month)[1]))


def payment_event(db,payment,status):
    """Called inside existing verified webhook transaction; never from client success."""
    cycle=db.scalar(select(BusinessCycle).where(BusinessCycle.payment_id==payment.id).with_for_update())
    if not cycle:
        return False
    require_boundary();user=lock_user(db,payment.user_id)
    if status=='SUCCEEDED':
        approved(db,user)
        sub=db.get(BusinessSubscription,cycle.subscription_id)
        previous=db.scalars(select(BusinessCycle).where(BusinessCycle.subscription_id==sub.id,BusinessCycle.state=='ACTIVE')).all()
        start=max([now()]+[aware(row.ends_at) for row in previous])
        cycle.starts_at=start;cycle.ends_at=month_after(start);cycle.state='ACTIVE';sub.non_renewing=False
        db.flush()
        issue_cycle(db,user,cycle)
        record(db,user,'BUSINESS_CYCLE_VERIFIED',cycle.id,{'payment':payment.id,'plan':cycle.plan_key})
    else:
        cycle.state='FAILED'
    return True


def issue_cycle(db,user,cycle):
    for kind,quantity in cycle.allowances.items():
        batch=db.scalar(select(BusinessAllowance).where(BusinessAllowance.cycle_id==cycle.id,BusinessAllowance.kind==kind))
        if not batch:
            # Schedule verified renewals now, with server-enforced effective dates.
            # Availability never depends on a customer visiting during that cycle.
            issued=aware(cycle.starts_at)
            batch=BusinessAllowance(id=str(uuid4()),user_id=user.id,cycle_id=cycle.id,kind=kind,allowance=quantity,starts_at=issued,expires_at=issued+timedelta(days=90) if kind=='JOB' else cycle.ends_at)
            db.add(batch);db.flush()
            if issued>now():
                db.add(BusinessEntry(id=str(uuid4()),batch_id=batch.id,action='SCHEDULE',quantity=quantity,reason='Verified future billing cycle; unavailable until its effective issuance date'))
        if aware(batch.starts_at)<=now() and not db.scalar(select(BusinessEntry.id).where(BusinessEntry.batch_id==batch.id,BusinessEntry.action=='ISSUE')):
            db.add(BusinessEntry(id=str(uuid4()),batch_id=batch.id,action='ISSUE',quantity=quantity,reason='Verified sandbox billing cycle; effective issuance date is batch starts_at'))


def process_cycles(db,user):
    require_boundary();lock_user(db,user.id);approved(db,user)
    sub=subscription(db,user)
    if sub:
        for cycle in db.scalars(select(BusinessCycle).where(BusinessCycle.subscription_id==sub.id,BusinessCycle.state=='ACTIVE')).all():
            payment=db.get(Payment,cycle.payment_id)
            if payment.status=='SUCCEEDED' and payment.mode=='SANDBOX':
                issue_cycle(db,user,cycle)
    for batch in db.scalars(select(BusinessAllowance).where(BusinessAllowance.user_id==user.id,BusinessAllowance.expires_at<=now(),BusinessAllowance.expiry_recorded.is_(False))).all():
        result=db.execute(update(BusinessAllowance).where(BusinessAllowance.id==batch.id,BusinessAllowance.expiry_recorded.is_(False)).values(expiry_recorded=True))
        if result.rowcount==1:
            db.add(BusinessEntry(id=str(uuid4()),batch_id=batch.id,action='EXPIRE',quantity=batch.allowance-batch.used,reason='Individual allowance expiry; historical issuance and usage retained'))


def refund_cycle(db,payment):
    cycle=db.scalar(select(BusinessCycle).where(BusinessCycle.payment_id==payment.id).with_for_update())
    if cycle:
        cycle.state='REFUNDED'; lock_user(db,payment.user_id)
        for batch in db.scalars(select(BusinessAllowance).where(BusinessAllowance.cycle_id==cycle.id)).all():
            batch.revoked=True
            db.add(BusinessEntry(id=str(uuid4()),batch_id=batch.id,action='REVOKE',quantity=batch.allowance-batch.used,reason='Full payment refund; historical usage retained'))


def batches(db,user_id,kind=None):
    query=select(BusinessAllowance).where(BusinessAllowance.user_id==user_id,BusinessAllowance.revoked.is_(False),BusinessAllowance.starts_at<=now(),BusinessAllowance.expires_at>now())
    if kind:query=query.where(BusinessAllowance.kind==kind)
    return db.scalars(query.order_by(BusinessAllowance.expires_at,BusinessAllowance.id).with_for_update().execution_options(populate_existing=True)).all()


def consume(db,user,kind,quantity,key,subject):
    require_boundary();lock_user(db,user.id);approved(db,user)
    prior=db.scalar(select(BusinessOperation).where(BusinessOperation.user_id==user.id,BusinessOperation.key==key))
    if prior:
        if (prior.kind,prior.quantity,prior.subject)!=(kind,quantity,subject):
            raise HTTPException(409,'Benefit operation key was reused with different content')
        return prior
    rows=batches(db,user.id,kind)
    if sum(row.allowance-row.used for row in rows)<quantity:
        raise HTTPException(409,'Insufficient unexpired '+LABELS[kind].lower())
    operation=BusinessOperation(id=str(uuid4()),user_id=user.id,key=key,kind=kind,quantity=quantity,subject=subject)
    db.add(operation);db.flush();remaining=quantity
    if kind in ACCESS_KINDS:
        # Reporting/priority are access flags, not an invented one-request quota.
        db.add(BusinessEntry(id=str(uuid4()),batch_id=rows[0].id,operation_id=operation.id,action='ACCESS',quantity=1,reason=subject))
        record(db,user,'BUSINESS_ACCESS_USED',operation.id,{'kind':kind,'subject':subject})
        return operation
    for row in rows:
        amount=min(row.allowance-row.used,remaining)
        if not amount:continue
        result=db.execute(update(BusinessAllowance).where(BusinessAllowance.id==row.id,BusinessAllowance.used==row.used,BusinessAllowance.used+amount<=BusinessAllowance.allowance).values(used=BusinessAllowance.used+amount).execution_options(synchronize_session=False))
        if result.rowcount!=1:raise HTTPException(409,'Benefit balance changed; reload before retrying')
        db.add(BusinessEntry(id=str(uuid4()),batch_id=row.id,operation_id=operation.id,action='USE',quantity=amount,reason=subject))
        remaining-=amount
        if not remaining:break
    record(db,user,'BUSINESS_BENEFIT_USED',operation.id,{'kind':kind,'quantity':quantity,'subject':subject})
    return operation


def snapshot(db,user):
    sub=subscription(db,user);cycles=[] if not sub else db.scalars(select(BusinessCycle).where(BusinessCycle.subscription_id==sub.id).order_by(BusinessCycle.created_at.desc())).all()
    current=next((c for c in cycles if c.state=='ACTIVE' and aware(c.starts_at)<=now()<aware(c.ends_at)),None)
    eligible=eligibility(db,user)
    active=bool(current and development() and eligible=='APPROVED_SELLER')
    state='ACTIVE' if active else 'EXPIRED' if any(c.state=='ACTIVE' for c in cycles) else 'NONE'
    if active and sub.non_renewing:state='NON_RENEWING'
    if not active and cycles and cycles[0].state in ('PENDING','FAILED','REFUNDED'):state=cycles[0].state
    all_batches=db.scalars(select(BusinessAllowance).where(BusinessAllowance.user_id==user.id).order_by(BusinessAllowance.expires_at)).all()
    allowances=[]
    for batch in all_batches:
        available=development() and eligible=='APPROVED_SELLER' and not batch.revoked and aware(batch.starts_at)<=now()<aware(batch.expires_at)
        # Marketing benefits require the current paid cycle; job credits retain 90-day rollover.
        status='REVOKED' if batch.revoked else 'EXPIRED' if aware(batch.expires_at)<=now() else 'SCHEDULED' if aware(batch.starts_at)>now() else 'AVAILABLE' if available else 'UNAVAILABLE'
        from sqlalchemy import func
        access_uses=db.scalar(select(func.count()).select_from(BusinessEntry).where(BusinessEntry.batch_id==batch.id,BusinessEntry.action=='ACCESS')) if batch.kind in ACCESS_KINDS else None
        allowances.append({'id':batch.id,'cycle_id':batch.cycle_id,'kind':batch.kind,'label':LABELS[batch.kind],'allowance':batch.allowance,'used':batch.used,'remaining':batch.allowance-batch.used if available else 0,'access_uses':access_uses,'status':status,'starts_at':batch.starts_at,'expires_at':batch.expires_at})
    requests=db.scalars(select(MarketingRequest).where(MarketingRequest.user_id==user.id).order_by(MarketingRequest.created_at.desc())).all()
    from .catalogue import serialize
    payments=[db.get(Payment,c.payment_id) for c in cycles]
    return {'eligibility':eligible,'active':active,'status':state,'subscription_id':sub.id if sub else None,'current_plan':current.plan_key if current else None,'billing_period':current.billing_period if current else None,'expires_at':current.ends_at if current else None,'automatic_renewal':False,'non_renewing':sub.non_renewing if sub else False,'job_credits':sum(a['remaining'] for a in allowances if a['kind']=='JOB'),'allowances':allowances,'cycles':[serialize(c) for c in cycles],'payments':[serialize(p) for p in payments],'requests':[serialize(r) for r in requests],'checkout_supported':development()}
