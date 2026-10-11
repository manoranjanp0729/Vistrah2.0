"""Synthetic identity/ownership regressions. Uses the explicitly isolated pytest database."""
import base64
from sqlalchemy import select, func
from app.models import User, Provider, ProviderService
from app.provider_models import ProviderApplication, ProviderDocument
from test_provider_onboarding import start, complete, submit, decision, PNG

def seller(client, email='seller@example.com'):
    response=client.post('/auth/seller/register',json={'name':'Synthetic Seller','email':email,'password':'synthetic-seller-password'})
    assert response.status_code==201,response.text
    return {'Authorization':'Bearer '+response.json()['access_token']}

def provider(db, owner=None, email='legacy@example.com'):
    p=Provider(owner_user_id=owner,slug='synthetic-'+str(db.scalar(select(func.count()).select_from(Provider))),name='Synthetic Contact',company='Synthetic business',email=email,phone='1234567890',address='Synthetic address',location='Synthetic locality',provenance='Synthetic fixture only')
    db.add(p);db.commit();return p

def test_shared_identity_customer_becomes_seller_without_membership_or_admin(client,customer,db):
    before=client.get('/me',headers=customer).json();assert not before['seller_enabled']
    assert client.get('/seller/businesses',headers=customer).status_code==403
    login=client.post('/auth/seller/login',json={'email':before['email'].upper(),'password':'a-secure-password-123'})
    assert login.status_code==200,login.text
    assert login.json()['user']['id']==before['id']
    assert login.json()['user']['seller_enabled'] and login.json()['user']['role']=='CUSTOMER'
    assert db.scalar(select(func.count()).select_from(User).where(User.email==before['email']))==1
    assert client.post('/auth/seller/register',json={'name':'Same Identity','email':before['email'],'password':'different-safe-password'}).status_code==409
    assert client.get('/seller/businesses',headers=customer).status_code==200 # Existing session rechecks capability.
    assert client.get('/admin/ownership-claims',headers=customer).status_code==403
    assert client.get('/services/1/providers',headers=customer).status_code==403
    assert client.get('/me/requests',headers=customer).status_code==200
    assert client.post('/auth/seller/enable',headers=customer).json()['id']==before['id']

def test_seller_registration_role_injection_and_customer_login(client,db):
    data={'name':'Synthetic Seller','email':'injection@example.com','password':'synthetic-long-password','role':'ADMIN'}
    assert client.post('/auth/seller/register',json=data).status_code==422
    headers=seller(client)
    identity=client.get('/me',headers=headers).json();assert identity['role']=='CUSTOMER'
    response=client.post('/auth/login',json={'email':identity['email'],'password':'synthetic-seller-password'})
    assert response.status_code==200 and response.json()['user']['id']==identity['id']
    assert client.get('/seller/businesses').status_code==401
    user=db.get(User,identity['id']);user.seller_enabled=False;db.commit()
    assert client.get('/seller/businesses',headers=headers).status_code==403

def test_owner_nested_ids_documents_and_unowned_email_do_not_grant_access(client,db,seeded,admin):
    a=seller(client,'owner-a@example.com');b=seller(client,'owner-b@example.com')
    aid=client.get('/me',headers=a).json()['id'];bid=client.get('/me',headers=b).json()['id']
    pa=provider(db,aid);pb=provider(db,bid);legacy=provider(db,email='owner-a@example.com')
    cat=client.get('/catalogue').json()[0]
    app=start(client,a,cat);row=db.get(ProviderApplication,app['id']);row.provider_id=pa.id
    other=start(client,b,cat);db.get(ProviderApplication,other['id']).provider_id=pb.id
    document=ProviderDocument(id='synthetic-document',application_id=app['id'],service_id=cat['services'][0]['id'],field_id='fixture',filename='fixture.png',media_type='image/png',sha256='0'*64,content=PNG)
    db.add(document);db.commit()
    assert [p['id'] for p in client.get('/seller/businesses',headers=a).json()]==[pa.id]
    for pid in [pb.id,legacy.id]:
        assert client.get(f'/seller/businesses/{pid}',headers=a).status_code==404
        assert client.get(f'/seller/businesses/{pid}/services',headers=a).status_code==404
        assert client.get(f'/seller/businesses/{pid}/applications/{app["id"]}',headers=a).status_code==404
    root=f'/seller/businesses/{pa.id}/applications/{app["id"]}'
    assert client.get(root,headers=a).status_code==200
    assert client.get(root,headers=b).status_code==404
    assert client.get(root+'/documents/'+document.id,headers=a).content==PNG
    assert client.get(root+'/documents/'+document.id,headers=b).status_code==404
    assert client.get(f'/seller/businesses/{pa.id}/applications/{other["id"]}',headers=a).status_code==404
    assert client.get(root+'/documents/another-id',headers=a).status_code==404
    assert client.get('/provider-applications/'+app['id']+'/documents/'+document.id,headers=admin).content==PNG

def test_legacy_claim_pending_admin_review_blocked_grant_and_rejection(client,db,admin):
    headers=seller(client);identity=client.get('/me',headers=headers).json();p=provider(db,email=identity['email'])
    claim=client.post('/seller/ownership-claims',headers=headers,json={'provider_id':p.id,'statement':'Synthetic ownership statement for admin review.','business_type':'REGISTERED','registration_evidence_available':False,'contact_channel':'EMAIL','contact_value':identity['email']})
    assert claim.status_code==201,claim.text
    cid=claim.json()['id'];assert claim.json()['status']=='PENDING' and claim.json()['grant_blocked']
    assert client.get('/seller/businesses',headers=headers).json()==[]
    assert client.get('/admin/ownership-claims',headers=headers).status_code==403
    review=f'/admin/ownership-claims/{cid}/review'
    assert client.post(review,headers=headers,json={'status':'APPROVED','reason':'Matching email only, not proof.'}).status_code==403
    evidence=client.post(f'/seller/ownership-claims/{cid}/evidence',headers=headers,json={'evidence':[{'evidence_type':'AUTHORITY','filename':'authority.pdf','media_type':'application/pdf','content_base64':base64.b64encode(b'%PDF-1.4\\nsynthetic authority\\n%%EOF').decode()}]})
    assert evidence.status_code==201 and evidence.json()['evidence_requirements_met']
    assert client.post(review,headers=admin,json={'status':'APPROVED','reason':'Matching email only, not proof.'}).status_code==409
    assert db.get(Provider,p.id).owner_user_id is None
    assert client.get('/admin/ownership-claims',headers=admin).json()[0]['id']==cid
    assert client.post(review,headers=admin,json={'status':'REJECTED','reason':'Insufficient verified evidence for ownership.'}).status_code==200
    assert client.get('/seller/ownership-claims',headers=headers).json()[0]['status']=='REJECTED'
    assert client.post(review,headers=admin,json={'status':'REJECTED','reason':'Repeated decision should be denied.'}).status_code==409
    # Independent review is mandatory even for an administrator who is also a seller.
    client.post('/auth/seller/enable',headers=admin)
    p2=provider(db)
    own=client.post('/seller/ownership-claims',headers=admin,json={'provider_id':p2.id,'statement':'Administrator synthetic personal claim.','business_type':'REGISTERED','registration_evidence_available':False,'contact_channel':'EMAIL','contact_value':'admin@example.com'}).json()
    assert client.post(f'/admin/ownership-claims/{own["id"]}/review',headers=admin,json={'status':'REJECTED','reason':'Self-review must never be accepted.'}).status_code==403

def test_new_approval_explicit_owner_composite_service_uniqueness_and_history(client,db,seeded,customer,admin):
    category=client.get('/catalogue').json()[0];sid=category['services'][0]['id']
    app=complete(client,customer,start(client,customer,category));app=submit(client,customer,app).json()
    response=decision(client,admin,app,sid);assert response.status_code==200,response.text
    p=db.get(Provider,response.json()['provider_id']);uid=client.get('/me',headers=customer).json()['id']
    assert p.owner_user_id==uid
    assert client.get('/me',headers=customer).json()['seller_enabled']
    assert client.get('/seller/businesses',headers=customer).json()[0]['id']==p.id
    assert len(client.get('/provider-applications/'+app['id'],headers=customer).json()['history'])>=3
    assert client.get(f'/services/{sid}/providers',headers=customer).status_code==403
    duplicate=complete(client,customer,start(client,customer,category));duplicate=submit(client,customer,duplicate).json()
    assert decision(client,admin,duplicate,sid).status_code==409
    assert db.scalar(select(func.count()).select_from(ProviderService).where(ProviderService.provider_id==p.id,ProviderService.service_id==sid))==1
    # A historical application link is not an ownership grant, even when email matches.
    p.owner_user_id=None;db.commit()
    assert client.get('/seller/businesses',headers=customer).json()==[]
    assert client.get('/provider-leads',headers=customer).json()==[]
    assert client.get('/provider-applications/'+app['id'],headers=customer).status_code==200
