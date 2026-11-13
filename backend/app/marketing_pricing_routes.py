"""Standalone marketing quotations; never membership benefits, payments or bookings."""
import copy
import hashlib
import json
from pathlib import Path
from typing import Literal
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import EmailStr, Field
from sqlalchemy import inspect, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from .database import get_db
from .models import User, Audit
from .schemas import Schema
from .security import current_user, member_user, admin_user
from .marketing_pricing_models import MarketingPriceOverride, MarketingPricingQuote

router = APIRouter(tags=['Marketing pricing'])
CATALOGUE = Path(__file__).resolve().parents[2] / 'shared' / 'marketing-pricing.json'
PUBLIC_FIELDS = ('id','name','category_ids','starting_price_paise','billing','description','deliverables','addons','exclusions','delivery_note','enabled','pricing_state','studio_related')

def ready(db):
    inspector = inspect(db.get_bind())
    return all(inspector.has_table(name) for name in ('marketing_price_overrides','marketing_pricing_quotes'))

def require_ready(db):
    if not ready(db):
        raise HTTPException(503, 'Marketing quotations are not enabled on this server yet. Your request has not been submitted.')

def catalogue(db):
    result = json.loads(CATALOGUE.read_text(encoding='utf-8'))
    if ready(db):
        overrides = {row.service_id: row.published for row in db.scalars(select(MarketingPriceOverride)).all() if row.published is not None}
        for service in result['services']:
            if service['id'] in overrides:
                service.update({key:value for key,value in overrides[service['id']].items() if key in PUBLIC_FIELDS})
    result['services'] = [{key:service[key] for key in PUBLIC_FIELDS} for service in result['services'] if service['enabled']]
    return result

class QuoteInput(Schema):
    service_id: str = Field(min_length=1,max_length=80)
    package_id: str | None = Field(default=None,max_length=80)
    addons: list[str] = Field(default_factory=list,max_length=12)
    months: int = Field(default=1,ge=1,le=24,strict=True)
    city: str = Field(min_length=2,max_length=150)
    area: str = Field(default='',max_length=200)
    media_format: str = Field(default='',max_length=150)
    campaign_duration: str = Field(default='',max_length=150)
    quantity: int = Field(default=1,ge=1,le=100000,strict=True)
    budget_paise: int | None = Field(default=None,ge=0,le=99999999999,strict=True)
    business_name: str = Field(min_length=2,max_length=200)
    contact_name: str = Field(min_length=2,max_length=100)
    email: EmailStr
    phone: str = Field(min_length=10,max_length=20,pattern=r'^\+?[\d\s-]+$')
    requirements: str = Field(min_length=20,max_length=5000)
    idempotency_key: str = Field(min_length=8,max_length=80,pattern=r'^[a-zA-Z0-9-]+$')

class PriceFields(Schema):
    name: str = Field(min_length=2,max_length=200)
    starting_price_paise: int | None = Field(ge=1,le=1000000000,strict=True)
    billing: Literal['one-time','month']
    description: str = Field(min_length=10,max_length=5000)
    deliverables: list[str] = Field(min_length=1,max_length=30)
    addons: list[str] = Field(default_factory=list,max_length=12)
    exclusions: list[str] = Field(default_factory=list,max_length=30)
    delivery_note: str | None = Field(default=None,max_length=500)
    enabled: bool

class PriceInput(Schema):
    expected_revision: int = Field(ge=0)
    fields: PriceFields

class RevisionInput(Schema):
    expected_revision: int = Field(ge=1)

class ReviewInput(RevisionInput):
    status: Literal['REVIEWING','QUOTED','CLOSED','CANCELLED']
    customer_note: str = Field(default='',max_length=2000)

def quote_output(row, include_details=False):
    result = {key:getattr(row,key) for key in ('id','service_id','service_name','package_id','status','revision','estimate_paise','pricing_state','customer_note','created_at')}
    if include_details:
        result['details'] = row.details
    return result

@router.get('/marketing-pricing/catalogue')
def public_catalogue(db:Session=Depends(get_db)):
    return catalogue(db)

@router.get('/marketing-pricing/capabilities')
def capabilities(db:Session=Depends(get_db)):
    available = ready(db)
    return {'quote_requests_available':available,'message':'Customer sign-in and eligible membership are required. No payment or booking is made.' if available else 'Marketing quotation submission is not enabled on this server yet.'}

@router.post('/marketing-pricing/quotes',status_code=201)
def submit(data:QuoteInput,user:User=Depends(member_user),db:Session=Depends(get_db)):
    require_ready(db)
    details = data.model_dump(mode='json',exclude={'idempotency_key'})
    fingerprint = hashlib.sha256(json.dumps(details,sort_keys=True).encode()).hexdigest()
    existing = db.scalar(select(MarketingPricingQuote).where(MarketingPricingQuote.user_id==user.id,MarketingPricingQuote.idempotency_key==data.idempotency_key))
    if existing:
        if existing.fingerprint != fingerprint:raise HTTPException(409,'This request key was already used for different details. Start a new request.')
        return quote_output(existing)
    config = catalogue(db)
    service = next((s for s in config['services'] if s['id']==data.service_id),None)
    if not service:raise HTTPException(404,'Marketing service is unavailable')
    if len(set(data.addons))!=len(data.addons) or any(addon not in service['addons'] for addon in data.addons):raise HTTPException(422,'Choose valid add-ons for this service')
    pack = next((p for p in config['packages'] if p['id']==data.package_id),None) if data.package_id else None
    if data.package_id and not pack:raise HTTPException(422,'Unknown standalone marketing package')
    price = service['starting_price_paise']
    if price is not None and data.quantity != 1:raise HTTPException(422,'Service-only estimates use one scoped service; request additional scope in your brief')
    if price is None:
        if pack:raise HTTPException(422,'Media placements require a separate quotation, not a marketing package')
        if not data.area or not data.media_format or not data.campaign_duration:raise HTTPException(422,'Specify preferred area, media format and campaign duration')
    estimate = pack['monthly_price_paise']*data.months if pack else price*(data.months if service['billing']=='month' else 1) if price is not None else None
    details['catalogue_version'] = config['version']
    details['exclusions'] = service['exclusions']
    row = MarketingPricingQuote(id=str(uuid4()),user_id=user.id,service_id=service['id'],service_name=service['name'],package_id=data.package_id,idempotency_key=data.idempotency_key,fingerprint=fingerprint,details=details,estimate_paise=estimate,pricing_state='PROPOSED' if pack else service['pricing_state'])
    db.add(row)
    try:db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.scalar(select(MarketingPricingQuote).where(MarketingPricingQuote.user_id==user.id,MarketingPricingQuote.idempotency_key==data.idempotency_key))
        if existing and existing.fingerprint==fingerprint:return quote_output(existing)
        raise HTTPException(409,'The request changed. Reload before submitting again.')
    db.refresh(row)
    return quote_output(row)

@router.get('/marketing-pricing/quotes')
def mine(user:User=Depends(current_user),db:Session=Depends(get_db),page:int=Query(1,ge=1)):
    require_ready(db)
    rows=db.scalars(select(MarketingPricingQuote).where(MarketingPricingQuote.user_id==user.id).order_by(MarketingPricingQuote.created_at.desc()).offset((page-1)*20).limit(20)).all()
    return {'items':[quote_output(row,True) for row in rows],'page':page,'page_size':20}

@router.get('/admin/marketing-pricing/quotes')
def queue(user:User=Depends(admin_user),db:Session=Depends(get_db),page:int=Query(1,ge=1)):
    require_ready(db)
    return {'items':[quote_output(row,True) for row in db.scalars(select(MarketingPricingQuote).order_by(MarketingPricingQuote.created_at.desc()).offset((page-1)*20).limit(20))],'page':page,'page_size':20}

@router.patch('/admin/marketing-pricing/quotes/{quote_id}')
def review(quote_id:str,data:ReviewInput,user:User=Depends(admin_user),db:Session=Depends(get_db)):
    require_ready(db)
    row=db.get(MarketingPricingQuote,quote_id)
    if not row:raise HTTPException(404,'Quotation request not found')
    transitions={'SUBMITTED':['REVIEWING','CANCELLED'],'REVIEWING':['QUOTED','CANCELLED'],'QUOTED':['CLOSED','CANCELLED']}
    if data.status not in transitions.get(row.status,[]):raise HTTPException(409,'Invalid request status transition')
    result=db.execute(update(MarketingPricingQuote).where(MarketingPricingQuote.id==quote_id,MarketingPricingQuote.revision==data.expected_revision).values(status=data.status,customer_note=data.customer_note,revision=data.expected_revision+1))
    if result.rowcount!=1:raise HTTPException(409,'The request changed. Reload before reviewing.')
    db.add(Audit(actor_id=user.id,action='MARKETING_QUOTE_REVIEW',entity='marketing_pricing',entity_id=quote_id,details={'status':data.status}))
    db.commit();db.refresh(row)
    return quote_output(row,True)

@router.get('/admin/marketing-pricing/services/{service_id}')
def admin_price(service_id:str,user:User=Depends(admin_user),db:Session=Depends(get_db)):
    require_ready(db)
    base=next((s for s in json.loads(CATALOGUE.read_text())['services'] if s['id']==service_id),None)
    if not base:raise HTTPException(404,'Unknown service')
    row=db.get(MarketingPriceOverride,service_id)
    return {'service':base,'draft':row.draft if row else base,'published':row.published if row else None,'revision':row.revision if row else 0}

@router.put('/admin/marketing-pricing/services/{service_id}')
def save_price(service_id:str,data:PriceInput,user:User=Depends(admin_user),db:Session=Depends(get_db)):
    require_ready(db)
    admin_price(service_id,user,db)
    fields=data.fields.model_dump()
    row=db.get(MarketingPriceOverride,service_id)
    if row:
        result=db.execute(update(MarketingPriceOverride).where(MarketingPriceOverride.service_id==service_id,MarketingPriceOverride.revision==data.expected_revision).values(draft=fields,revision=data.expected_revision+1,updated_by=user.id))
        if result.rowcount!=1:raise HTTPException(409,'Price configuration changed. Reload first.')
    elif data.expected_revision!=0:raise HTTPException(409,'Price configuration changed. Reload first.')
    else:db.add(MarketingPriceOverride(service_id=service_id,revision=1,draft=fields,updated_by=user.id))
    db.add(Audit(actor_id=user.id,action='MARKETING_PRICE_DRAFT',entity='marketing_pricing',entity_id=service_id))
    try:db.commit()
    except IntegrityError:db.rollback();raise HTTPException(409,'Price configuration changed. Reload first.')
    return admin_price(service_id,user,db)

@router.post('/admin/marketing-pricing/services/{service_id}/publish')
def publish_price(service_id:str,data:RevisionInput,user:User=Depends(admin_user),db:Session=Depends(get_db)):
    require_ready(db)
    row=db.get(MarketingPriceOverride,service_id)
    if not row:raise HTTPException(404,'Save a draft before approving public pricing')
    published={**copy.deepcopy(row.draft),'pricing_state':'APPROVED'}
    result=db.execute(update(MarketingPriceOverride).where(MarketingPriceOverride.service_id==service_id,MarketingPriceOverride.revision==data.expected_revision).values(published=published,revision=data.expected_revision+1,updated_by=user.id))
    if result.rowcount!=1:raise HTTPException(409,'Price configuration changed. Reload first.')
    db.add(Audit(actor_id=user.id,action='MARKETING_PRICE_PUBLISHED',entity='marketing_pricing',entity_id=service_id))
    db.commit()
    return admin_price(service_id,user,db)
