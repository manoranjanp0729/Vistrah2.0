from app.models import Provider, ProviderService, Service, Category

def test_member_directory_filters_service_verification_and_active_state(client, seeded, db, member_customer):
    categories=client.get('/catalogue').json()
    service=categories[0]['services'][0]['id']
    unrelated=categories[0]['services'][1]['id']
    for slug, status, active, sid in [('visible','VERIFIED',True,service),('pending','PENDING',True,service),('inactive','VERIFIED',False,service),('unrelated','VERIFIED',True,unrelated)]:
        provider=Provider(slug=slug,name='Reviewed Contact',company=slug,email='test@example.com',phone='6364456776',address='Test-only address',location='Bengaluru',provenance='Isolated test fixture',verification_status=status,verification_evidence='Test review evidence',active=active)
        db.add(provider);db.flush()
        db.add(ProviderService(provider_id=provider.id,service_id=sid,approval_status='APPROVED'))
    db.commit()
    rows=client.get(f'/services/{service}/providers',headers=member_customer).json()
    assert [row['slug'] for row in rows]==['visible']
    assert not any(key in rows[0] for key in ['email','phone','verification_evidence','provenance','in_house'])
    for slug in ['pending','inactive','unrelated','unknown']:
        assert client.get(f'/services/{service}/providers/{slug}',headers=member_customer).status_code==404
    assert client.get('/services/99999/providers',headers=member_customer).status_code==404
    assert client.get('/services/99999/providers/visible',headers=member_customer).status_code==404
    db.get(Category,db.get(Service,service).category_id).active=False
    db.commit()
    assert client.get(f'/services/{service}/providers',headers=member_customer).status_code==404
    assert client.get(f'/services/{service}/providers/visible',headers=member_customer).status_code==404

def test_enquiry_requires_authentication(client,seeded):
    sid=client.get('/catalogue').json()[0]['services'][0]['id']
    assert client.post('/requests',json={'service_id':sid,'requirements':'A service-specific enquiry for human review.','location':'Bengaluru','phone':'6364456776'}).status_code==401
