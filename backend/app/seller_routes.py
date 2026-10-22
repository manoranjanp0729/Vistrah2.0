"""Owned seller reads, independent of customer membership. Legacy grants fail closed."""
import uuid
import hashlib
import re
from fastapi import APIRouter, Depends, HTTPException, Query, Response, Request
from pydantic import Field, model_validator
from sqlalchemy import select, func, update
from sqlalchemy.orm import Session
from .database import get_db
from .security import seller_user, admin_user
from .models import User, Provider, ProviderService, Audit, now
from .provider_models import ProviderApplication, ProviderOwnershipClaim, ProviderOwnershipClaimEvidence, ProviderOwnershipClaimEvent
from .provider_requirements import SafeModel
from .provider_routes import detail, download, leads, inspect_file
from .catalogue import serialize
from . import ownership_contact

router = APIRouter(tags=['Seller ownership'])

def owned_business(db, provider_id, user):
    provider = db.scalar(select(Provider).where(Provider.id == provider_id, Provider.owner_user_id == user.id))
    if not provider:
        raise HTTPException(404, 'Owned business not found')
    return provider

def owned_application(db, provider_id, application_id, user):
    owned_business(db, provider_id, user)
    application = db.scalar(select(ProviderApplication).where(
        ProviderApplication.id == application_id, ProviderApplication.provider_id == provider_id,
        ProviderApplication.user_id == user.id))
    if not application:
        raise HTTPException(404, 'Owned business application not found')
    return application

@router.get('/seller/businesses')
def businesses(user: User = Depends(seller_user), db: Session = Depends(get_db)):
    return [serialize(p) for p in db.scalars(select(Provider).where(Provider.owner_user_id == user.id).order_by(Provider.id))]

class NewBusiness(SafeModel):
    name: str = Field(min_length=2,max_length=150)
    company: str = Field(min_length=2,max_length=150)
    phone: str = Field(min_length=7,max_length=20,pattern=r'^\+?[\d\s()-]+$')
    address: str = Field(min_length=5,max_length=1000)
    location: str = Field(min_length=2,max_length=150)

    @model_validator(mode='after')
    def valid_phone(self):
        if not 7<=len(re.sub(r'\D','',self.phone))<=15:
            raise ValueError('Enter a valid business phone number')
        return self

@router.post('/seller/businesses',status_code=201)
def create_business(data:NewBusiness,user:User=Depends(seller_user),db:Session=Depends(get_db)):
    provider=Provider(**data.model_dump(),email=user.email,owner_user_id=user.id,
        slug='seller-'+str(uuid.uuid4()),verification_status='PENDING',active=False,
        provenance='Seller submitted for independent business verification')
    db.add(provider);db.flush()
    db.add(Audit(actor_id=user.id,action='SELLER_BUSINESS_CREATED',entity='provider',entity_id=str(provider.id),details={}))
    db.commit();db.refresh(provider)
    return serialize(provider)

@router.get('/seller/businesses/{provider_id}')
def business(provider_id: int, user: User = Depends(seller_user), db: Session = Depends(get_db)):
    return serialize(owned_business(db, provider_id, user))

@router.get('/seller/businesses/{provider_id}/services')
def business_services(provider_id: int, user: User = Depends(seller_user), db: Session = Depends(get_db)):
    owned_business(db, provider_id, user)
    return [serialize(g) for g in db.scalars(select(ProviderService).where(ProviderService.provider_id == provider_id))]

@router.get('/seller/businesses/{provider_id}/applications/{application_id}')
def business_application(provider_id: int, application_id: str, user: User = Depends(seller_user), db: Session = Depends(get_db)):
    return detail(db, owned_application(db, provider_id, application_id, user), user)

@router.get('/seller/businesses/{provider_id}/applications/{application_id}/documents/{document_id}')
def business_document(provider_id: int, application_id: str, document_id: str, user: User = Depends(seller_user), db: Session = Depends(get_db)):
    owned_application(db, provider_id, application_id, user)
    return download(application_id, document_id, user, db)

@router.get('/seller/leads')
def seller_leads(user: User = Depends(seller_user), db: Session = Depends(get_db)):
    return leads(user, db)

class ClaimInput(SafeModel):
    provider_id: int = Field(gt=0)
    statement: str = Field(min_length=20, max_length=2000)
    business_type: str = Field(pattern=r'^(REGISTERED|UNREGISTERED)$')
    registration_evidence_available: bool
    contact_channel: str = Field(pattern=r'^(EMAIL|PHONE)$')
    contact_value: str = Field(min_length=5, max_length=254)

    @staticmethod
    def valid_contact(channel, value):
        if channel == 'EMAIL':
            return re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value) is not None
        if not re.fullmatch(r'\+?[\d\s()-]+', value):
            return False
        digits = re.sub(r'\D', '', value)
        return 7 <= len(digits) <= 15

    @model_validator(mode='after')
    def validate_contact_declaration(self):
        if not self.valid_contact(self.contact_channel, self.contact_value):
            raise ValueError('Enter a valid contact channel value')
        if self.business_type == 'UNREGISTERED' and self.registration_evidence_available:
            raise ValueError('Unregistered businesses cannot declare registration evidence available')
        return self

class ClaimEvidenceInput(SafeModel):
    evidence_type: str = Field(pattern=r'^(BUSINESS_REGISTRATION|AUTHORITY|CORROBORATING)$')
    filename: str = Field(min_length=1, max_length=180)
    media_type: str = Field(max_length=60)
    content_base64: str = Field(max_length=2800000)

class ClaimEvidenceBatch(SafeModel):
    evidence: list[ClaimEvidenceInput] = Field(min_length=1, max_length=10)

class ClaimResubmission(SafeModel):
    statement: str = Field(min_length=20, max_length=2000)
    business_type: str = Field(pattern=r'^(REGISTERED|UNREGISTERED)$')
    registration_evidence_available: bool
    contact_channel: str = Field(pattern=r'^(EMAIL|PHONE)$')
    contact_value: str = Field(min_length=5, max_length=254)

    @model_validator(mode='after')
    def validate_contact_declaration(self):
        if not ClaimInput.valid_contact(self.contact_channel, self.contact_value):
            raise ValueError('Enter a valid contact channel value')
        if self.business_type == 'UNREGISTERED' and self.registration_evidence_available:
            raise ValueError('Unregistered businesses cannot declare registration evidence available')
        return self

class ClaimReview(SafeModel):
    status: str = Field(pattern=r'^(APPROVED|REJECTED|NEEDS_INFO)$')
    reason: str = Field(min_length=10, max_length=2000)

class ClaimRecusal(SafeModel):
    reason: str = Field(min_length=10, max_length=2000)

class ClaimContactVerification(SafeModel):
    token: str = Field(min_length=43, max_length=43, pattern=r'^[A-Za-z0-9_-]+$')

def _claim_evidence(db, claim_id):
    return list(db.scalars(select(ProviderOwnershipClaimEvidence).where(ProviderOwnershipClaimEvidence.claim_id == claim_id).order_by(ProviderOwnershipClaimEvidence.created_at, ProviderOwnershipClaimEvidence.id)))

def _evidence_complete(claim, documents=None):
    kinds = [row.evidence_type for row in (documents or [])]
    if claim.business_type == 'REGISTERED':
        return 'AUTHORITY' in kinds and (claim.registration_evidence_available is False or (claim.registration_evidence_available is True and 'BUSINESS_REGISTRATION' in kinds))
    if claim.business_type == 'UNREGISTERED':
        return kinds.count('CORROBORATING') >= 2
    return False

def _evidence_metadata(row):
    return {key: getattr(row, key) for key in ('id','evidence_type','filename','media_type','sha256','created_at')}

def _claim_output(db, claim, admin=False):
    documents = _claim_evidence(db, claim.id)
    contact_verified = ownership_contact.verified(db, claim)
    provider = db.get(Provider, claim.provider_id)
    result = serialize(claim) | {
        'evidence': [_evidence_metadata(row) for row in documents],
        'evidence_requirements_met': _evidence_complete(claim, documents),
        'contact_control_verified': contact_verified,
        'contact_control_note': 'Business email control verified for 24 hours; independent evidence review is still required.' if contact_verified else 'Verify the stored business email before approval. Submitted values are not proof of control; phone verification is unavailable.',
        'grant_blocked': claim.status != 'PENDING' or claim.needs_more_info or not contact_verified or not _evidence_complete(claim, documents) or not provider or provider.owner_user_id is not None,
    }
    if admin:
        result['events'] = [serialize(event) for event in db.scalars(select(ProviderOwnershipClaimEvent).where(ProviderOwnershipClaimEvent.claim_id == claim.id).order_by(ProviderOwnershipClaimEvent.id))]
    else:
        result.pop('reviewer_id', None)
        result.pop('reviewed_at', None)

    return result

def _claim_event(db, claim, user, action, reason=''):
    db.add(ProviderOwnershipClaimEvent(claim_id=claim.id, actor_id=user.id, action=action, reason=reason))
    action_name = {
        'CLAIM_CREATED': 'OWNERSHIP_CLAIM_REQUESTED',
        'EVIDENCE_ADDED': 'OWNERSHIP_CLAIM_EVIDENCE_ADDED',
        'INFORMATION_REQUESTED': 'OWNERSHIP_CLAIM_INFO_REQUESTED',
        'RESUBMITTED': 'OWNERSHIP_CLAIM_RESUBMITTED',
        'REJECTED': 'OWNERSHIP_CLAIM_REJECTED',
        'RECUSED': 'OWNERSHIP_CLAIM_RECUSED',
        'CONTACT_CHALLENGE_SENT': 'OWNERSHIP_CONTACT_CHALLENGE_SENT',
        'CONTACT_VERIFIED': 'OWNERSHIP_CONTACT_VERIFIED',
        'APPROVED': 'OWNERSHIP_CLAIM_APPROVED',
    }[action]
    db.add(Audit(actor_id=user.id, action=action_name, entity='provider_ownership_claim', entity_id=claim.id))

def _store_evidence(db, claim, user, items):
    existing = _claim_evidence(db, claim.id)
    if len(existing) + len(items) > 20:
        raise HTTPException(409, 'Private claim evidence limit reached')
    user_count = db.scalar(select(func.count()).select_from(ProviderOwnershipClaimEvidence).join(ProviderOwnershipClaim).where(ProviderOwnershipClaim.user_id == user.id))
    if user_count + len(items) > 100:
        raise HTTPException(409, 'Private evidence quota reached. Contact VISTRAH for review.')
    accepted = {'REGISTERED': {'BUSINESS_REGISTRATION','AUTHORITY'}, 'UNREGISTERED': {'CORROBORATING'}}.get(claim.business_type, set())
    if any(item.evidence_type not in accepted for item in items):
        raise HTTPException(422, 'Evidence type does not match the declared business status')
    rows = []
    seen = {(row.evidence_type, row.sha256) for row in existing}
    for item in items:
        content, kind = inspect_file(item)
        digest = hashlib.sha256(content).hexdigest()
        if (item.evidence_type, digest) in seen:
            raise HTTPException(409, 'This evidence file is already attached to the claim')
        seen.add((item.evidence_type, digest))
        evidence_id = str(uuid.uuid4())
        row = ProviderOwnershipClaimEvidence(id=evidence_id, claim_id=claim.id, submitted_by=user.id,
            evidence_type=item.evidence_type, filename=evidence_id + '.' + kind[0], media_type=kind[1], sha256=digest, content=content)
        db.add(row); rows.append(row)
    _claim_event(db, claim, user, 'EVIDENCE_ADDED')
    return rows

@router.post('/seller/ownership-claims', status_code=201)
def request_claim(data: ClaimInput, user: User = Depends(seller_user), db: Session = Depends(get_db)):
    provider = db.scalar(select(Provider).where(Provider.id == data.provider_id).with_for_update())
    if not provider or provider.owner_user_id is not None:
        raise HTTPException(409, 'Only an unowned legacy business can enter ownership review')
    if db.scalar(select(ProviderOwnershipClaim.id).where(ProviderOwnershipClaim.provider_id == provider.id, ProviderOwnershipClaim.user_id == user.id)):
        raise HTTPException(409, 'An ownership claim already exists. Continue its existing review.')
    claim = ProviderOwnershipClaim(id=str(uuid.uuid4()), provider_id=provider.id, user_id=user.id,
        statement=data.statement, business_type=data.business_type,
        registration_evidence_available=data.registration_evidence_available,
        contact_channel=data.contact_channel, contact_value=data.contact_value)
    db.add(claim); db.flush()
    _claim_event(db, claim, user, 'CLAIM_CREATED')
    db.commit(); db.refresh(claim)
    return _claim_output(db, claim)

@router.post('/seller/ownership-claims/{claim_id}/evidence', status_code=201)
def add_claim_evidence(claim_id: str, data: ClaimEvidenceBatch, user: User = Depends(seller_user), db: Session = Depends(get_db)):
    claim = db.scalar(select(ProviderOwnershipClaim).where(ProviderOwnershipClaim.id == claim_id, ProviderOwnershipClaim.user_id == user.id).with_for_update())
    if not claim: raise HTTPException(404, 'Ownership claim not found')
    if claim.status != 'PENDING': raise HTTPException(409, 'Decided claim evidence is retained and cannot be changed')
    _store_evidence(db, claim, user, data.evidence)
    db.commit(); db.refresh(claim)
    return _claim_output(db, claim)

def _pending_claim(db, claim_id, user):
    claim = db.scalar(select(ProviderOwnershipClaim).where(
        ProviderOwnershipClaim.id == claim_id, ProviderOwnershipClaim.user_id == user.id)
        .with_for_update().execution_options(populate_existing=True))
    if not claim:
        raise HTTPException(404, 'Ownership claim not found')
    if claim.status != 'PENDING' or claim.needs_more_info:
        raise HTTPException(409, 'Contact verification requires a pending claim ready for review')
    return claim

@router.post('/seller/ownership-claims/{claim_id}/contact-challenge')
def send_claim_contact_challenge(claim_id: str, request: Request,
        user: User = Depends(seller_user), db: Session = Depends(get_db)):
    claim = _pending_claim(db, claim_id, user)
    return ownership_contact.issue(db, claim, user, request, _claim_event)

@router.post('/seller/ownership-claims/{claim_id}/contact-verify')
def verify_claim_contact(claim_id: str, data: ClaimContactVerification, request: Request,
        user: User = Depends(seller_user), db: Session = Depends(get_db)):
    claim = _pending_claim(db, claim_id, user)
    ownership_contact.redeem(db, claim, data.token, user, request, _claim_event)
    return _claim_output(db, claim)

@router.get('/seller/ownership-claims')
def my_claims(user: User = Depends(seller_user), db: Session = Depends(get_db)):
    return [_claim_output(db, claim) for claim in db.scalars(select(ProviderOwnershipClaim).where(ProviderOwnershipClaim.user_id == user.id).order_by(ProviderOwnershipClaim.created_at.desc()))]

@router.get('/seller/ownership-claims/{claim_id}/evidence/{evidence_id}')
def claimant_claim_evidence(claim_id: str, evidence_id: str, user: User = Depends(seller_user), db: Session = Depends(get_db)):
    owns_claim = db.scalar(select(ProviderOwnershipClaim.id).where(ProviderOwnershipClaim.id == claim_id, ProviderOwnershipClaim.user_id == user.id))
    row = db.get(ProviderOwnershipClaimEvidence, evidence_id)
    if not owns_claim or not row or row.claim_id != claim_id: raise HTTPException(404, 'Claim evidence not found')
    return _evidence_response(row)

def _evidence_response(row):
    return Response(content=row.content, media_type=row.media_type, headers={
        'Content-Disposition': f'attachment; filename="{row.filename}"', 'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox"})

@router.get('/admin/ownership-claims')
def claim_queue(user: User = Depends(admin_user), db: Session = Depends(get_db), page: int = Query(1, ge=1)):
    rows = db.scalars(select(ProviderOwnershipClaim).order_by(ProviderOwnershipClaim.created_at.desc()).offset((page-1)*30).limit(30))
    result = []
    for claim in rows:
        item = _claim_output(db, claim, admin=True)
        item['reviewer_conflict_recused'] = db.scalar(select(ProviderOwnershipClaimEvent.id).where(
            ProviderOwnershipClaimEvent.claim_id == claim.id, ProviderOwnershipClaimEvent.actor_id == user.id,
            ProviderOwnershipClaimEvent.action == 'RECUSED')) is not None
        result.append(item)
    return result

@router.get('/admin/ownership-claims/{claim_id}/evidence/{evidence_id}')
def admin_claim_evidence(claim_id: str, evidence_id: str, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    row = db.get(ProviderOwnershipClaimEvidence, evidence_id)
    if not row or row.claim_id != claim_id: raise HTTPException(404, 'Claim evidence not found')
    return _evidence_response(row)

@router.post('/admin/ownership-claims/{claim_id}/recuse')
def recuse_claim(claim_id: str, data: ClaimRecusal, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    claim = db.scalar(select(ProviderOwnershipClaim).where(ProviderOwnershipClaim.id == claim_id).with_for_update())
    if not claim: raise HTTPException(404, 'Claim not found')
    if claim.status != 'PENDING': raise HTTPException(409, 'Only a pending claim can be recused')
    if db.scalar(select(ProviderOwnershipClaimEvent.id).where(ProviderOwnershipClaimEvent.claim_id == claim.id,
            ProviderOwnershipClaimEvent.actor_id == user.id, ProviderOwnershipClaimEvent.action == 'RECUSED')):
        raise HTTPException(409, 'You have already recused yourself from this claim')
    _claim_event(db, claim, user, 'RECUSED', data.reason)
    db.commit()
    return {'claim_id': claim.id, 'recused': True}

@router.post('/seller/ownership-claims/{claim_id}/resubmit')
def resubmit_claim(claim_id: str, data: ClaimResubmission, user: User = Depends(seller_user), db: Session = Depends(get_db)):
    claim = db.scalar(select(ProviderOwnershipClaim).where(ProviderOwnershipClaim.id == claim_id, ProviderOwnershipClaim.user_id == user.id).with_for_update())
    if not claim: raise HTTPException(404, 'Ownership claim not found')
    if claim.status != 'PENDING' or not claim.needs_more_info: raise HTTPException(409, 'This claim is not awaiting claimant information')
    claim.statement=data.statement; claim.business_type=data.business_type
    claim.registration_evidence_available=data.registration_evidence_available
    claim.contact_channel=data.contact_channel; claim.contact_value=data.contact_value
    if not _evidence_complete(claim, _claim_evidence(db, claim.id)):
        raise HTTPException(409, 'Required evidence is incomplete; existing evidence is retained')
    claim.needs_more_info=False; claim.reviewer_id=None; claim.reviewed_at=None; claim.review_note=''
    ownership_contact.invalidate(db, claim)
    _claim_event(db, claim, user, 'RESUBMITTED')
    db.commit(); db.refresh(claim)
    return _claim_output(db, claim)

@router.post('/admin/ownership-claims/{claim_id}/review')
def review_claim(claim_id: str, data: ClaimReview, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    claim = db.scalar(select(ProviderOwnershipClaim).where(ProviderOwnershipClaim.id == claim_id).with_for_update().execution_options(populate_existing=True))
    if not claim: raise HTTPException(404, 'Claim not found')
    if claim.user_id == user.id: raise HTTPException(403, 'An independent administrator must review your claim')
    if db.scalar(select(ProviderOwnershipClaimEvent.id).where(ProviderOwnershipClaimEvent.claim_id == claim.id,
            ProviderOwnershipClaimEvent.actor_id == user.id, ProviderOwnershipClaimEvent.action == 'RECUSED')):
        raise HTTPException(403, 'You recused yourself from this claim and cannot review it')
    if claim.status != 'PENDING': raise HTTPException(409, 'This claim has already been decided')
    if data.status == 'APPROVED':
        if claim.needs_more_info:
            raise HTTPException(409, 'The claimant must resubmit the requested information before approval')
        if not _evidence_complete(claim, _claim_evidence(db, claim.id)):
            raise HTTPException(409, 'Required ownership evidence is incomplete')
        provider = db.scalar(select(Provider).where(Provider.id == claim.provider_id).with_for_update().execution_options(populate_existing=True))
        if not ownership_contact.verified(db, claim):
            raise HTTPException(409, 'Approval requires verified business contact control. A submitted value or email match is not proof of control.')
        # Compare-and-set is also a uniqueness barrier on engines without row locks.
        granted = db.execute(update(Provider).where(Provider.id == claim.provider_id,
            Provider.owner_user_id.is_(None)).values(owner_user_id=claim.user_id))
        if not provider or granted.rowcount != 1:
            raise HTTPException(409, 'This business already has an owner; ownership cannot be transferred by a claim')
    claim.reviewer_id=user.id; claim.reviewed_at=now(); claim.review_note=data.reason
    if data.status == 'APPROVED':
        claim.status='APPROVED'; claim.needs_more_info=False
        _claim_event(db, claim, user, 'APPROVED', data.reason)
    elif data.status == 'REJECTED':
        claim.status='REJECTED'; claim.needs_more_info=False
        ownership_contact.invalidate(db, claim)
        _claim_event(db, claim, user, 'REJECTED', data.reason)
    else:
        claim.needs_more_info=True
        ownership_contact.invalidate(db, claim)
        _claim_event(db, claim, user, 'INFORMATION_REQUESTED', data.reason)
    db.commit(); db.refresh(claim)
    return _claim_output(db, claim, admin=True)
