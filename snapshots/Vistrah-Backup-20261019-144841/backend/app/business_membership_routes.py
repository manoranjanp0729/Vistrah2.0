from uuid import uuid4
from typing import Literal
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import Field
from sqlalchemy import select, func, update, case, or_, and_
from sqlalchemy.orm import Session
from .database import get_db
from .models import User, Provider, Audit, now
from .security import current_user, admin_user
from .workflow_schemas import Strict
from .catalogue import serialize
from . import business_membership as service
from .business_membership_models import BusinessSubscription, BusinessCycle, BusinessAllowance, BusinessOperation, BusinessEntry, MarketingRequest

router=APIRouter(tags=['Business membership'])

class CheckoutInput(Strict):
    plan_key: Literal['BASIC','PLUS','PREMIUM']
    billing_period: Literal['MONTHLY','ANNUAL']
    idempotency_key: str = Field(min_length=8,max_length=100)

class BenefitInput(Strict):
    kind: Literal['DESIGN','CAMPAIGN','VIDEO','SOCIAL_PAISE','STANDARD_REPORT','BASIC_REPORT','DETAILED_REPORT','BILLBOARD_PRIORITY']
    quantity: int = Field(ge=1,le=100000)
    brief: str = Field(min_length=10,max_length=2000)
    idempotency_key: str = Field(min_length=8,max_length=100)
    duration_days: int | None = Field(default=None,ge=1,le=7)
    duration_seconds: int | None = Field(default=None,ge=1,le=30)

class ReviewInput(Strict):
    status: Literal['IN_PROGRESS','COMPLETED','CANCELLED']
    expected_status: Literal['REQUESTED','IN_PROGRESS']
    reason: str = Field(min_length=10,max_length=2000)

class AdjustmentInput(Strict):
    quantity: int = Field(ge=-100,le=100)
    reason: str = Field(min_length=10,max_length=2000)
    idempotency_key: str = Field(min_length=8,max_length=100)

@router.get('/membership/plans')
def plans():
    return service.catalogue()

@router.get('/me/business-membership')
def mine(user:User=Depends(current_user),db:Session=Depends(get_db)):
    return service.snapshot(db,user)

@router.post('/membership/subscriptions/checkout',status_code=201)
def checkout(data:CheckoutInput,user:User=Depends(current_user),db:Session=Depends(get_db)):
    return serialize(service.checkout(db,user,data.plan_key,data.billing_period,data.idempotency_key))

@router.post('/membership/subscriptions/non-renewal')
def non_renewal(user:User=Depends(current_user),db:Session=Depends(get_db)):
    service.require_boundary();service.lock_user(db,user.id)
    sub=service.subscription(db,user)
    if not sub:raise HTTPException(404,'Business subscription not found')
    if db.scalar(select(BusinessCycle.id).where(BusinessCycle.subscription_id==sub.id,BusinessCycle.state=='PENDING')):
        raise HTTPException(409,'Resolve the pending payment before marking non-renewal')
    if not sub.non_renewing:
        sub.non_renewing=True;service.record(db,user,'BUSINESS_NON_RENEWAL',sub.id)
    db.commit();return service.snapshot(db,user)

@router.post('/membership/subscriptions/process')
def process(user:User=Depends(current_user),db:Session=Depends(get_db)):
    service.require_boundary();service.process_cycles(db,user);db.commit()
    return service.snapshot(db,user)

@router.post('/membership/benefit-requests',status_code=201)
def request_benefit(data:BenefitInput,user:User=Depends(current_user),db:Session=Depends(get_db)):
    if data.kind!='SOCIAL_PAISE' and data.quantity!=1:
        raise HTTPException(422,'Request one deliverable at a time; social credit uses integer paise')
    if (data.duration_days is not None and data.kind!='CAMPAIGN') or (data.duration_seconds is not None and data.kind!='VIDEO'):
        raise HTTPException(422,'Duration does not apply to this benefit')
    service.process_cycles(db,user)
    operation=service.consume(db,user,data.kind,data.quantity,'request:'+data.idempotency_key,data.brief)
    row=db.scalar(select(MarketingRequest).where(MarketingRequest.operation_id==operation.id))
    if not row:
        row=MarketingRequest(id=str(uuid4()),user_id=user.id,operation_id=operation.id,brief=data.brief,duration_days=(data.duration_days or 7) if data.kind=='CAMPAIGN' else None,duration_seconds=(data.duration_seconds or 30) if data.kind=='VIDEO' else None);db.add(row)
        service.record(db,user,'MARKETING_REQUESTED',row.id,{'kind':data.kind,'quantity':data.quantity})
    elif (row.duration_days,row.duration_seconds)!=(((data.duration_days or 7) if data.kind=='CAMPAIGN' else None),((data.duration_seconds or 30) if data.kind=='VIDEO' else None)):
        raise HTTPException(409,'Request key reused with a different duration')
    db.commit();return serialize(row)

@router.get('/admin/business-memberships')
def subscribers(user:User=Depends(admin_user),db:Session=Depends(get_db),page:int=Query(1,ge=1),plan:Literal['BASIC','PLUS','PREMIUM']|None=None,status:Literal['ACTIVE','NON_RENEWING','EXPIRED','PENDING','FAILED','REFUNDED','NONE']|None=None):
    # Filter and page identities in SQL before loading private benefit histories.
    query=select(User).join(BusinessSubscription,BusinessSubscription.user_id==User.id)
    current=select(BusinessCycle.plan_key).where(BusinessCycle.subscription_id==BusinessSubscription.id,BusinessCycle.state=='ACTIVE',BusinessCycle.starts_at<=now(),BusinessCycle.ends_at>now()).order_by(BusinessCycle.created_at.desc()).limit(1).correlate(BusinessSubscription).scalar_subquery()
    latest=select(BusinessCycle.state).where(BusinessCycle.subscription_id==BusinessSubscription.id).order_by(BusinessCycle.created_at.desc()).limit(1).correlate(BusinessSubscription).scalar_subquery()
    any_paid=select(BusinessCycle.id).where(BusinessCycle.subscription_id==BusinessSubscription.id,BusinessCycle.state=='ACTIVE').correlate(BusinessSubscription).exists()
    approved_owner=select(Provider.id).join(User,User.id==Provider.owner_user_id).where(Provider.owner_user_id==BusinessSubscription.user_id,Provider.active.is_(True),Provider.verification_status=='VERIFIED',User.seller_enabled.is_(True)).correlate(BusinessSubscription).exists()
    active=and_(current.is_not(None),approved_owner) if service.development() else False
    status_expr=case((active,case((BusinessSubscription.non_renewing.is_(True),'NON_RENEWING'),else_='ACTIVE')),(latest.in_(['PENDING','FAILED','REFUNDED']),latest),(any_paid,'EXPIRED'),else_='NONE')
    latest_plan=select(BusinessCycle.plan_key).where(BusinessCycle.subscription_id==BusinessSubscription.id).order_by(BusinessCycle.created_at.desc()).limit(1).correlate(BusinessSubscription).scalar_subquery()
    if plan:query=query.where(func.coalesce(current,latest_plan)==plan)
    if status:query=query.where(status_expr==status)
    total=db.scalar(select(func.count()).select_from(query.subquery()))
    identities=db.scalars(query.order_by(User.id).offset((page-1)*20).limit(20)).all()
    rows=[{'user_id':u.id,'name':u.name,'email':u.email,**service.snapshot(db,u)} for u in identities]
    counts=dict(db.execute(select(status_expr,func.count()).select_from(BusinessSubscription).group_by(status_expr)).all())
    return {'items':rows,'total':total,'page':page,'page_size':20,'counts':counts,'payment_mode':service.catalogue()['payment_mode']}

@router.get('/admin/business-memberships/{user_id}')
def details(user_id:int,user:User=Depends(admin_user),db:Session=Depends(get_db)):
    target=db.get(User,user_id)
    if not target:raise HTTPException(404,'Account not found')
    batch_ids=select(BusinessAllowance.id).where(BusinessAllowance.user_id==target.id)
    return {**service.snapshot(db,target),'ledger':[serialize(e) for e in db.scalars(select(BusinessEntry).where(BusinessEntry.batch_id.in_(batch_ids)).order_by(BusinessEntry.created_at))],'operations':[serialize(o) for o in db.scalars(select(BusinessOperation).where(BusinessOperation.user_id==user_id))],'audit':[serialize(a) for a in db.scalars(select(Audit).where(Audit.entity=='business_membership',or_(Audit.actor_id==user_id,Audit.details['account_id'].as_integer()==user_id)).order_by(Audit.id.desc()).limit(100))]}

@router.get('/admin/marketing-requests')
def marketing_queue(user:User=Depends(admin_user),db:Session=Depends(get_db),page:int=Query(1,ge=1)):
    rows=db.execute(select(MarketingRequest,BusinessOperation).join(BusinessOperation,MarketingRequest.operation_id==BusinessOperation.id).order_by(MarketingRequest.created_at.desc()).offset((page-1)*20).limit(20))
    return {'items':[{**serialize(r),'kind':op.kind,'quantity':op.quantity} for r,op in rows],'total':db.scalar(select(func.count()).select_from(MarketingRequest)),'page_size':20,'page':page}

@router.post('/admin/marketing-requests/{request_id}')
def review(request_id:str,data:ReviewInput,user:User=Depends(admin_user),db:Session=Depends(get_db)):
    service.require_boundary()
    row=db.scalar(select(MarketingRequest).where(MarketingRequest.id==request_id).with_for_update().execution_options(populate_existing=True))
    if not row:raise HTTPException(404,'Marketing request not found')
    if row.status!=data.expected_status or data.status not in ({'REQUESTED':['IN_PROGRESS','CANCELLED'],'IN_PROGRESS':['COMPLETED','CANCELLED']}.get(row.status,[])):
        raise HTTPException(409,'Request state changed or transition is invalid')
    service.lock_user(db,row.user_id)
    result=db.execute(update(MarketingRequest).where(MarketingRequest.id==row.id,MarketingRequest.status==data.expected_status).values(status=data.status,review_note=data.reason).execution_options(synchronize_session=False))
    if result.rowcount!=1:raise HTTPException(409,'Request state changed')
    if data.status=='CANCELLED':
        for entry in db.scalars(select(BusinessEntry).where(BusinessEntry.operation_id==row.operation_id,BusinessEntry.action=='USE')).all():
            db.execute(update(BusinessAllowance).where(BusinessAllowance.id==entry.batch_id,BusinessAllowance.used>=entry.quantity).values(used=BusinessAllowance.used-entry.quantity))
            db.add(BusinessEntry(id=str(uuid4()),batch_id=entry.batch_id,action='RELEASE',quantity=entry.quantity,reason='Cancelled marketing request '+row.id))
    service.record(db,user,'MARKETING_'+data.status,row.id,{'account_id':row.user_id,'reason':data.reason})
    db.commit();db.refresh(row);return serialize(row)

@router.post('/admin/business-memberships/{user_id}/job-adjustment')
def adjustment(user_id:int,data:AdjustmentInput,user:User=Depends(admin_user),db:Session=Depends(get_db)):
    service.require_boundary();target=service.lock_user(db,user_id)
    if not target:raise HTTPException(404,'Account not found')
    if target.id==user.id:raise HTTPException(403,'An independent administrator must adjust credits')
    service.approved(db,target)
    if data.quantity==0:raise HTTPException(422,'Adjustment must be non-zero')
    key='adjust:'+data.idempotency_key
    prior=db.scalar(select(BusinessOperation).where(BusinessOperation.user_id==target.id,BusinessOperation.key==key))
    if prior:
        if (prior.quantity,prior.subject)!=(abs(data.quantity),('grant:' if data.quantity>0 else 'debit:')+data.reason):raise HTTPException(409,'Adjustment key reused')
        return {'operation_id':prior.id}
    if data.quantity<0:
        op=service.consume(db,target,'JOB',-data.quantity,key,'debit:'+data.reason)
    else:
        op=BusinessOperation(id=str(uuid4()),user_id=user_id,key=key,kind='JOB',quantity=data.quantity,subject='grant:'+data.reason);db.add(op);db.flush()
        batch=BusinessAllowance(id=str(uuid4()),user_id=user_id,kind='JOB',allowance=data.quantity,starts_at=now(),expires_at=now()+timedelta(days=90));db.add(batch);db.flush()
        db.add(BusinessEntry(id=str(uuid4()),batch_id=batch.id,operation_id=op.id,action='ADJUST',quantity=data.quantity,reason=data.reason))
    service.record(db,user,'BUSINESS_JOB_ADJUSTMENT',op.id,{'account_id':target.id,'quantity':data.quantity,'reason':data.reason})
    db.commit();return {'operation_id':op.id}
