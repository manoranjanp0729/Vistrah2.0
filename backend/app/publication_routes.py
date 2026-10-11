"""Owner drafts keep current approved publication intact until independent review."""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from .database import get_db
from .security import seller_user, admin_user
from .models import User, Provider, ProviderService, Audit, now
from .provider_models import ProviderPublicationDraft
from .provider_requirements import SafeModel
from .seller_routes import owned_business
from .catalogue import serialize, active_service
from .location_schemas import BusinessPin, ServiceCoverage
router=APIRouter(tags=['Reviewed publication'])

class BusinessProfile(SafeModel):
    name:str=Field(min_length=2,max_length=150)
    company:str=Field(min_length=2,max_length=150)
    email:EmailStr
    phone:str=Field(min_length=10,max_length=20,pattern=r'^\+?[\d\s-]+$')
    address:str=Field(min_length=3,max_length=1000)
    location:str=Field(min_length=2,max_length=150)

class DraftInput(SafeModel):
    service_id:int|None=Field(default=None,gt=0)
    profile:BusinessProfile|None=None
    description:str|None=Field(default=None,min_length=20,max_length=5000)
    business_pin:BusinessPin|None=None
    coverage:ServiceCoverage|None=None

class Revision(SafeModel):
    revision:int=Field(gt=0)

class Review(Revision):
    status:str=Field(pattern=r'^(APPROVED|REJECTED)$')
    reason:str=Field(min_length=10,max_length=2000)

def target(db,provider,service_id):
    if service_id is None:return provider
    grant=db.get(ProviderService,(provider.id,service_id))
    if not grant:raise HTTPException(404,'Business service record not found')
    return grant

def publication_payload(provider,grant=None):
    return {'description':grant.description} if grant else {key:getattr(provider,key) for key in BusinessProfile.model_fields}

def new_draft(db,provider,user,data,admin_metadata=None):
    record=target(db,provider,data.service_id)
    if data.service_id is None:
        if data.description is not None or data.coverage is not None or (data.profile is None)==(data.business_pin is None):raise HTTPException(422,'Supply one business profile or business pin proposal')
        payload=(data.profile or data.business_pin).model_dump(mode='json')
    else:
        active_service(db,data.service_id)
        if data.profile is not None or data.business_pin is not None or (data.description is None)==(data.coverage is None):raise HTTPException(422,'Supply one listing description or coverage proposal')
        payload=data.coverage.model_dump() if data.coverage else {'description':data.description}
    prior={key:getattr(record,key) for key in payload}
    if data.coverage:
        if provider.latitude is None or provider.longitude is None:raise HTTPException(409,'Publish a reviewed business pin before proposing service coverage')
        prior['business_pin']={'latitude':provider.latitude,'longitude':provider.longitude}
    if admin_metadata is not None:
        payload['admin_metadata']=admin_metadata
        prior['admin_metadata']={key:getattr(provider,key) for key in admin_metadata}
    draft=ProviderPublicationDraft(id=str(uuid.uuid4()),provider_id=provider.id,service_id=data.service_id,actor_id=user.id,base_revision=record.publication_revision,payload=payload,prior_payload=prior)
    db.add(draft);db.flush()
    db.add(Audit(actor_id=user.id,action='PUBLICATION_DRAFT_CREATED',entity='provider_publication_draft',entity_id=draft.id))
    return draft

@router.post('/seller/businesses/{provider_id}/publication-drafts',status_code=201)
def create_draft(provider_id:int,data:DraftInput,user:User=Depends(seller_user),db:Session=Depends(get_db)):
    provider=owned_business(db,provider_id,user)
    draft=new_draft(db,provider,user,data);db.commit();return serialize(draft)

@router.get('/seller/businesses/{provider_id}/publication-drafts')
def drafts(provider_id:int,user:User=Depends(seller_user),db:Session=Depends(get_db)):
    owned_business(db,provider_id,user)
    return [serialize(d) for d in db.scalars(select(ProviderPublicationDraft).where(ProviderPublicationDraft.provider_id==provider_id).order_by(ProviderPublicationDraft.created_at.desc()).limit(100))]

@router.post('/seller/businesses/{provider_id}/publication-drafts/{draft_id}/submit')
def submit_draft(provider_id:int,draft_id:str,data:Revision,user:User=Depends(seller_user),db:Session=Depends(get_db)):
    owned_business(db,provider_id,user)
    draft=db.scalar(select(ProviderPublicationDraft).where(ProviderPublicationDraft.id==draft_id,ProviderPublicationDraft.provider_id==provider_id,ProviderPublicationDraft.actor_id==user.id).with_for_update())
    if not draft:raise HTTPException(404,'Owned publication draft not found')
    if draft.status!='DRAFT' or draft.revision!=data.revision:raise HTTPException(409,'Reload the draft; only its current draft revision can be submitted')
    draft.status='SUBMITTED';draft.revision+=1
    db.add(Audit(actor_id=user.id,action='PUBLICATION_DRAFT_SUBMITTED',entity='provider_publication_draft',entity_id=draft.id));db.commit();return serialize(draft)

@router.get('/admin/publication-drafts')
def queue(user:User=Depends(admin_user),db:Session=Depends(get_db)):
    return [serialize(d) for d in db.scalars(select(ProviderPublicationDraft).order_by(ProviderPublicationDraft.created_at.desc()).limit(100))]

@router.post('/admin/publication-drafts/{draft_id}/review')
def review_draft(draft_id:str,data:Review,user:User=Depends(admin_user),db:Session=Depends(get_db)):
    draft=db.scalar(select(ProviderPublicationDraft).where(ProviderPublicationDraft.id==draft_id).with_for_update())
    if not draft:raise HTTPException(404,'Publication draft not found')
    provider=db.scalar(select(Provider).where(Provider.id==draft.provider_id).with_for_update())
    if user.id in (draft.actor_id,provider.owner_user_id):raise HTTPException(403,'An independent administrator must review this draft')
    if draft.status!='SUBMITTED' or draft.revision!=data.revision:raise HTTPException(409,'Reload the submitted draft before review')
    record=target(db,provider,draft.service_id)
    if data.status=='APPROVED':
        if record.publication_revision!=draft.base_revision:raise HTTPException(409,'The published version changed. Reject this stale proposal and create a fresh draft.')
        if provider.verification_status!='VERIFIED' or not provider.active:raise HTTPException(409,'Resolve provider verification or suspension before publication')
        if draft.service_id is not None:
            active_service(db,draft.service_id)
            if record.approval_status!='APPROVED':raise HTTPException(409,'Complete the independent service application review first')
            if 'coverage_radius_km' in draft.payload:
                checked=ServiceCoverage.model_validate(draft.payload)
                if provider.latitude is None or provider.longitude is None:raise HTTPException(409,'Publish a reviewed physical business pin before coverage')
                if draft.prior_payload.get('business_pin')!={'latitude':provider.latitude,'longitude':provider.longitude}:raise HTTPException(409,'The business pin changed. Create a fresh coverage proposal for the published pin.')
                record.coverage_radius_km=checked.coverage_radius_km
            else:
                record.description=draft.payload['description']
        else:
            checked=BusinessPin.model_validate(draft.payload) if 'latitude' in draft.payload else BusinessProfile.model_validate({key:draft.payload[key] for key in BusinessProfile.model_fields})
            for key,value in checked.model_dump(mode='json').items():setattr(provider,key,value)
            if 'admin_metadata' in draft.payload:
                from .schemas import ProviderInput
                if db.get(User,draft.actor_id).role!='ADMIN':raise HTTPException(409,'Administrative metadata requires a current authorized administrator')
                values={key:getattr(provider,key) for key in ProviderInput.model_fields}
                values.update(draft.payload['admin_metadata'])
                validated=ProviderInput.model_validate(values)
                for key in ('slug','source_url','provenance'):setattr(provider,key,getattr(validated,key))
        record.publication_revision+=1
    draft.status=data.status;draft.reviewer_id=user.id;draft.review_note=data.reason;draft.reviewed_at=now();draft.revision+=1
    db.add(Audit(actor_id=user.id,action='PUBLICATION_DRAFT_'+data.status,entity='provider_publication_draft',entity_id=draft.id));db.commit();return serialize(draft)

class InvalidInformation(SafeModel):
    reason:str=Field(min_length=10,max_length=2000)

@router.post('/seller/businesses/{provider_id}/invalid-information')
def report_invalid(provider_id:int,data:InvalidInformation,user:User=Depends(seller_user),db:Session=Depends(get_db)):
    provider=owned_business(db,provider_id,user);provider.active=False
    db.add(Audit(actor_id=user.id,action='PROVIDER_INFORMATION_INVALID',entity='provider',entity_id=str(provider.id),details={'reason':data.reason}));db.commit()
    return {'active':False,'message':'Business listings removed from discovery; application and request history retained.'}
