"""Isolated claim evidence, privacy, reviewer recusal, and fail-closed approval regressions."""
import base64
from sqlalchemy import select, func
from app.models import User, Provider, ProviderService, Service, ServiceRequest, Audit
from app.provider_models import ProviderOwnershipClaimEvidence, ProviderOwnershipClaimEvent, ProviderApplication, ProviderDocument, ProviderApplicationEvent, ProviderLead
from app.security import passwords, issue_token
from test_seller_ownership import seller, provider
from test_provider_onboarding import start, PNG

PDF_A=b'%PDF-1.4\nsynthetic claim proof A\n%%EOF'
PDF_B=b'%PDF-1.4\nsynthetic claim proof B\n%%EOF'

def claim_input(provider_id, email='claimant@example.com', business_type='REGISTERED', registration_available=False):
    return {'provider_id':provider_id,'statement':'I am authorized to manage this synthetic business.','business_type':business_type,
        'registration_evidence_available':registration_available,'contact_channel':'EMAIL','contact_value':email}

def create_claim(client,headers,payload):
    response=client.post('/seller/ownership-claims',headers=headers,json=payload)
    assert response.status_code==201,response.text
    return response.json()

def upload(client,headers,claim_id,kind,content=PDF_A):
    return client.post(f'/seller/ownership-claims/{claim_id}/evidence',headers=headers,json={'evidence':[{
        'evidence_type':kind,'filename':'private-proof.pdf','media_type':'application/pdf',
        'content_base64':base64.b64encode(content).decode('ascii')}]})

def add_admin(db,email):
    user=User(name='Synthetic Administrator',email=email,role='ADMIN',password_hash=passwords.hash('synthetic-admin-password-123'))
    db.add(user);db.commit();return {'Authorization':'Bearer '+issue_token(db,user)},user.id

def test_registered_claim_evidence_is_private_and_matching_contact_cannot_approve(client,db,admin):
    headers=seller(client,'claimant@example.com');identity=client.get('/me',headers=headers).json();p=provider(db,email=identity['email'])
    claim=create_claim(client,headers,claim_input(p.id,identity['email'],registration_available=True));cid=claim['id']
    assert not claim['contact_control_verified'] and claim['grant_blocked']
    assert upload(client,headers,cid,'BUSINESS_REGISTRATION').status_code==201
    authority=upload(client,headers,cid,'AUTHORITY',PDF_B);assert authority.status_code==201,authority.text
    claim=client.get('/seller/ownership-claims',headers=headers).json()[0]
    assert claim['evidence_requirements_met'] and claim['contact_control_verified'] is False
    assert 'content' not in claim['evidence'][0] and claim['contact_value']==identity['email']
    other=seller(client,'other-claimant@example.com')
    assert client.get('/seller/ownership-claims',headers=other).json()==[]
    evidence_id=claim['evidence'][0]['id']
    assert client.get(f'/seller/ownership-claims/{cid}/evidence/{evidence_id}',headers=other).status_code==404
    assert client.get(f'/seller/ownership-claims/{cid}/evidence/{evidence_id}',headers={'Authorization':headers['Authorization']}).content==PDF_A
    queue=client.get('/admin/ownership-claims',headers=admin).json();row=next(x for x in queue if x['id']==cid)
    assert row['evidence_requirements_met'] and all('content' not in x for x in row['evidence'])
    assert client.get(f'/admin/ownership-claims/{cid}/evidence/{evidence_id}',headers=admin).content==PDF_A
    assert client.get(f'/admin/ownership-claims/{cid}/evidence/{evidence_id}').headers['cache-control']=='private, no-store'
    review=client.post(f'/admin/ownership-claims/{cid}/review',headers=admin,json={'status':'APPROVED','reason':'Registration and authority files were reviewed.'})
    assert review.status_code==409 and 'verified business contact control' in review.json()['detail']
    assert db.get(Provider,p.id).owner_user_id is None
    assert client.get('/seller/businesses',headers=headers).json()==[]
    assert db.scalar(select(func.count()).select_from(ProviderOwnershipClaimEvidence).where(ProviderOwnershipClaimEvidence.claim_id==cid))==2

def test_unregistered_claim_requires_two_proofs_and_control_is_never_assumed(client,db,admin):
    headers=seller(client,'unregistered@example.com');p=provider(db,email='unregistered@example.com')
    claim=create_claim(client,headers,claim_input(p.id,'unregistered@example.com','UNREGISTERED'));cid=claim['id']
    assert upload(client,headers,cid,'CORROBORATING',PDF_A).status_code==201
    incomplete=client.post(f'/admin/ownership-claims/{cid}/review',headers=admin,json={'status':'APPROVED','reason':'One proof and matching email.'})
    assert incomplete.status_code==409 and 'evidence is incomplete' in incomplete.json()['detail']
    assert upload(client,headers,cid,'CORROBORATING',PDF_B).status_code==201
    complete=client.get('/seller/ownership-claims',headers=headers).json()[0]
    assert complete['evidence_requirements_met'] and complete['contact_control_verified'] is False
    blocked=client.post(f'/admin/ownership-claims/{cid}/review',headers=admin,json={'status':'APPROVED','reason':'Two proofs and matching email.'})
    assert blocked.status_code==409 and 'not proof of control' in blocked.json()['detail']
    assert db.get(Provider,p.id).owner_user_id is None
    invalid=client.post('/seller/ownership-claims',headers=headers,json=claim_input(p.id,'not-an-email','UNREGISTERED'))
    assert invalid.status_code==422 # Malformed contact input is rejected; format validation is not contact-control verification.
    p2=provider(db,email='phone-business@example.com');bad_phone=claim_input(p2.id,'new@example.com','UNREGISTERED');bad_phone['contact_channel']='PHONE';bad_phone['contact_value']='business 1234567'
    assert client.post('/seller/ownership-claims',headers=headers,json=bad_phone).status_code==422

def test_request_info_resubmission_recusal_rejection_and_existing_history_preserved(client,db,seeded,admin):
    headers=seller(client,'history-claimant@example.com');identity=client.get('/me',headers=headers).json();p=provider(db,email=identity['email'])
    category=client.get('/catalogue').json()[0];sid=category['services'][0]['id']
    application=start(client,headers,category);app=db.get(ProviderApplication,application['id']);app.provider_id=p.id
    association=ProviderService(provider_id=p.id,service_id=sid,approval_status='APPROVED',application_id=app.id);db.add(association)
    document=ProviderDocument(id='claim-preserved-document',application_id=app.id,service_id=sid,field_id='fixture',filename='fixture.png',media_type='image/png',sha256='1'*64,content=PNG);db.add(document)
    app_event=ProviderApplicationEvent(application_id=app.id,service_id=sid,actor_id=identity['id'],kind='REVIEW_DECISION',reason='Existing independent service approval',details={'fixture':True});db.add(app_event)
    request=ServiceRequest(user_id=identity['id'],service_id=sid,requirements='Synthetic existing request for ownership preservation',location='Test locality',phone='1234567890');db.add(request);db.flush()
    lead=ProviderLead(request_id=request.id,provider_id=p.id,service_id=sid,actor_id=identity['id']);db.add(lead);db.commit()
    cid=create_claim(client,headers,claim_input(p.id,identity['email']))['id']
    assert upload(client,headers,cid,'AUTHORITY',PDF_A).status_code==201
    info=client.post(f'/admin/ownership-claims/{cid}/review',headers=admin,json={'status':'NEEDS_INFO','reason':'Please provide a clearer authority document.'})
    assert info.status_code==200 and info.json()['needs_more_info']
    first=client.get('/seller/ownership-claims',headers=headers).json()[0]
    assert first['review_note']=='Please provide a clearer authority document.' and first['needs_more_info']
    assert 'reviewer_id' not in first and 'reviewed_at' not in first
    assert upload(client,headers,cid,'AUTHORITY',PDF_B).status_code==201
    resubmit_data=claim_input(p.id,identity['email']);resubmit_data.pop('provider_id')
    resubmitted=client.post(f'/seller/ownership-claims/{cid}/resubmit',headers=headers,json=resubmit_data)
    assert resubmitted.status_code==200 and not resubmitted.json()['needs_more_info']
    admin2,admin2_id=add_admin(db,'recused-admin@example.com')
    assert client.post(f'/admin/ownership-claims/{cid}/recuse',headers=admin2,json={'reason':'I have a personal relationship with this claimant.'}).status_code==200
    assert client.get('/admin/ownership-claims',headers=admin2).json()[0]['reviewer_conflict_recused']
    assert client.post(f'/admin/ownership-claims/{cid}/review',headers=admin2,json={'status':'REJECTED','reason':'Recused reviewers cannot decide.'}).status_code==403
    rejected=client.post(f'/admin/ownership-claims/{cid}/review',headers=admin,json={'status':'REJECTED','reason':'Submitted documents do not establish authority.'})
    assert rejected.status_code==200
    row=db.get(Provider,p.id);assert row.owner_user_id is None
    assert db.get(ProviderApplication,app.id).provider_id==p.id
    assert db.get(ProviderService,(p.id,sid)).approval_status=='APPROVED'
    assert db.get(ProviderDocument,document.id).content==PNG
    assert db.scalar(select(func.count()).select_from(ProviderApplicationEvent).where(ProviderApplicationEvent.application_id==app.id))==2
    assert db.get(ProviderLead,lead.id).provider_id==p.id
    events=list(db.scalars(select(ProviderOwnershipClaimEvent).where(ProviderOwnershipClaimEvent.claim_id==cid).order_by(ProviderOwnershipClaimEvent.id)))
    assert [event.action for event in events]==['CLAIM_CREATED','EVIDENCE_ADDED','INFORMATION_REQUESTED','EVIDENCE_ADDED','RESUBMITTED','RECUSED','REJECTED']
    assert events[5].actor_id==admin2_id and events[5].reason=='I have a personal relationship with this claimant.'
    assert events[-1].actor_id==db.scalar(select(User.id).where(User.email=='admin@example.com')) and events[-1].reason=='Submitted documents do not establish authority.'
    assert db.scalar(select(func.count()).select_from(Audit).where(Audit.entity_id==cid))>=6
    assert client.get(f'/admin/ownership-claims/{cid}/evidence/{events[1].id}',headers=admin).status_code==404