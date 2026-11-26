"""I4 owner drafts, independent review, publication and legacy compatibility."""
from sqlalchemy import select, text
from sqlalchemy.exc import DBAPIError
import pytest
from app.models import User, ProviderService
from app.security import passwords, issue_token
from test_seller_ownership import seller, provider

def setup_business(client,db,seeded):
    headers=seller(client);uid=client.get('/me',headers=headers).json()['id'];p=provider(db,uid)
    p.verification_status='VERIFIED';p.active=True
    sid=client.get('/catalogue').json()[0]['services'][0]['id']
    db.add(ProviderService(provider_id=p.id,service_id=sid,approval_status='APPROVED'));db.commit()
    return headers,p,sid

def create_profile(client,headers,p,**changes):
    profile={key:getattr(p,key) for key in ['name','company','email','phone','address','location']};profile.update(changes)
    response=client.post(f'/seller/businesses/{p.id}/publication-drafts',headers=headers,json={'profile':profile})
    assert response.status_code==201,response.text
    return response.json()

def submit_draft(client,headers,d):
    response=client.post(f'/seller/businesses/{d["provider_id"]}/publication-drafts/{d["id"]}/submit',headers=headers,json={'revision':d['revision']})
    assert response.status_code==200,response.text
    return response.json()

def review(client,admin,d,status='APPROVED'):
    return client.post(f'/admin/publication-drafts/{d["id"]}/review',headers=admin,json={'revision':d['revision'],'status':status,'reason':'Synthetic independent evidence and contact validation reviewed.'})

def test_profile_draft_last_approved_publication_stale_and_contact_change(client,db,seeded,admin,member_customer):
    owner,p,sid=setup_business(client,db,seeded);original=p.location
    draft=create_profile(client,owner,p,location='Proposed locality');competing=create_profile(client,owner,p,location='Stale locality')
    assert p.location==original and p.active and p.verification_status=='VERIFIED'
    assert client.get(f'/services/{sid}/providers/{p.slug}',headers=member_customer).json()['location']==original
    draft=submit_draft(client,owner,draft);competing=submit_draft(client,owner,competing)
    assert review(client,owner,draft).status_code==403
    assert review(client,admin,draft).status_code==200
    assert p.location=='Proposed locality' and p.active
    assert db.get(ProviderService,(p.id,sid)).approval_status=='APPROVED'
    assert review(client,admin,competing).status_code==409
    contact=submit_draft(client,owner,create_profile(client,owner,p,email='updated@example.com',phone='0987654321'))
    assert review(client,admin,contact).status_code==200
    assert p.email=='updated@example.com' and db.get(ProviderService,(p.id,sid)).approval_status=='APPROVED'
    assert client.get(f'/services/{sid}/providers').status_code==401
    with pytest.raises(DBAPIError):
        with db.begin_nested():db.execute(text("UPDATE provider_publication_drafts SET review_note='rewrite history' WHERE id=:id"),{'id':draft['id']})

def test_listing_description_needs_individual_approval_and_cross_owner_denied(client,db,seeded,admin,member_customer):
    owner,p,sid=setup_business(client,db,seeded);other=seller(client,'other@example.com')
    root=f'/seller/businesses/{p.id}/publication-drafts'
    assert client.post(root,headers=other,json={'service_id':sid,'description':'Synthetic unauthorized offering description.'}).status_code==404
    assert client.get(root,headers=other).status_code==404
    assert client.post(root,headers=owner,json={'service_id':99999,'description':'Synthetic wrong service description.'}).status_code==404
    created=client.post(root,headers=owner,json={'service_id':sid,'description':'An approved synthetic listing description for this service.'}).json()
    assert client.get(f'/services/{sid}/providers/{p.slug}',headers=member_customer).json()['description']==''
    assert client.post(f'/seller/businesses/{p.id+1}/publication-drafts/{created["id"]}/submit',headers=owner,json={'revision':1}).status_code==404
    d=submit_draft(client,owner,created)
    grant=db.get(ProviderService,(p.id,sid));grant.approval_status='PENDING';db.commit()
    assert review(client,admin,d).status_code==409
    grant.approval_status='APPROVED';db.commit()
    assert review(client,admin,d).status_code==200
    assert client.get(f'/services/{sid}/providers/{p.slug}',headers=member_customer).json()['description']==created['payload']['description']
    assert client.post(f'/seller/businesses/{p.id}/invalid-information',headers=other,json={'reason':'Incorrect synthetic information.'}).status_code==404
    assert client.post(f'/seller/businesses/{p.id}/invalid-information',headers=owner,json={'reason':'Incorrect synthetic published address.'}).status_code==200
    assert client.get(f'/services/{sid}/providers',headers=member_customer).json()==[]
    assert client.get(root,headers=owner).json()[0]['status']=='APPROVED'

def test_admin_legacy_edit_saves_draft_without_deactivation_and_self_review(client,db,seeded,admin):
    owner,p,sid=setup_business(client,db,seeded)
    data={key:getattr(p,key) for key in ['slug','name','company','email','phone','address','location','source_url','provenance']};data['location']='Reviewed next locality'
    result=client.put(f'/admin/providers/{p.id}',headers=admin,json=data)
    assert result.status_code==200,result.text
    draft=result.json()['publication_draft'];assert draft['status']=='SUBMITTED'
    assert p.location!='Reviewed next locality' and p.active and p.verification_status=='VERIFIED'
    assert review(client,admin,draft).status_code==403
    second=User(name='Independent Admin',email='second-admin@example.com',role='ADMIN',password_hash=passwords.hash('synthetic-second-admin-password'))
    db.add(second);db.commit();second_headers={'Authorization':'Bearer '+issue_token(db,second)}
    assert review(client,second_headers,draft).status_code==200
    assert p.location=='Reviewed next locality'
    assert client.get('/admin/publication-drafts',headers=owner).status_code==403

def test_owned_new_service_reservation_duplicate_and_catalogue_parents(client,db,seeded):
    owner,p,sid=setup_business(client,db,seeded);other=seller(client,'second-owner@example.com');cats=client.get('/catalogue').json()
    direct=cats[0]['services'][1]['id'];subcat=next(sub for cat in cats for sub in cat['subcategories']);nested=subcat['services'][0]['id']
    data={'provider_id':p.id,'category_id':cats[0]['id'],'subcategory_id':None,'service_ids':[direct]}
    assert client.post('/provider-applications',headers=other,json=data).status_code==404
    created=client.post('/provider-applications',headers=owner,json=data);assert created.status_code==201,created.text
    grant=db.get(ProviderService,(p.id,direct));assert grant.approval_status=='PENDING' and grant.application_id==created.json()['id']
    assert client.post('/provider-applications',headers=owner,json=data).status_code==409
    assert client.post('/provider-applications',headers=owner,json={**data,'service_ids':[sid]}).status_code==409
    assert client.post('/provider-applications',headers=owner,json={**data,'subcategory_id':subcat['id']}).status_code==422
    category=next(cat for cat in cats if any(s['id']==subcat['id'] for s in cat['subcategories']))
    assert client.post('/provider-applications',headers=owner,json={'category_id':category['id'],'subcategory_id':None,'service_ids':[nested]}).status_code==422
    assert client.post('/provider-applications',headers=owner,json={'provider_id':p.id,'category_id':category['id'],'subcategory_id':subcat['id'],'service_ids':[nested]}).status_code==201

def test_association_withdrawal_retains_service_record_and_draft_history(client,db,seeded,admin):
    owner,p,sid=setup_business(client,db,seeded)
    draft=client.post(f'/seller/businesses/{p.id}/publication-drafts',headers=owner,json={'service_id':sid,'description':'Synthetic retained service description.'}).json()
    assert client.put(f'/admin/providers/{p.id}/services',headers=admin,json={'service_ids':[]}).status_code==200
    assert db.get(ProviderService,(p.id,sid)).approval_status=='SUSPENDED'
    assert client.get(f'/seller/businesses/{p.id}/publication-drafts',headers=owner).json()[0]['id']==draft['id']
    assert client.put(f'/admin/providers/{p.id}/services',headers=admin,json={'service_ids':[sid]}).status_code==200
    assert db.get(ProviderService,(p.id,sid)).approval_status=='PENDING'
