"""Disposable geo fixtures; no geocoder, tile service or normal DB traffic."""
import math
import logging
import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

from app.location_routes import EARTH_KM
from app.database import engine
from app.models import User, Provider, ProviderService, ServiceRequest, Audit
from test_seller_ownership import seller, provider
from test_publication_drafts import setup_business, submit_draft, review


def search(client, headers, sid, latitude=0.0, longitude=0.0, radius=5):
    return client.post(f'/services/{sid}/nearby', headers=headers,
        json={'latitude': latitude, 'longitude': longitude, 'radius_km': radius})


def test_registered_location_contract_and_authentication(client):
    paths = client.get('/openapi.json').json()['paths']
    assert {'get', 'put', 'delete'} <= paths['/me/location'].keys()
    assert 'post' in paths['/services/{service_id}/nearby']
    for method in ('get', 'delete'):
        response = getattr(client, method)('/me/location')
        assert response.status_code == 401
        assert response.headers['cache-control'] == 'private, no-store'
        assert response.headers['vary'] == 'Authorization'


def test_location_changes_and_clear_are_scoped_to_authenticated_account(client, customer):
    other = seller(client, 'location-isolation@example.com')
    point = {'latitude': 12.123456789, 'longitude': 77.123456789, 'locality': 'Private locality'}
    assert client.put('/me/location', headers=customer, json=point).status_code == 200
    assert client.put('/me/location', headers=other, json={**point, 'latitude': 13.0}).status_code == 200
    assert client.put('/me/location', headers=other, json={**point, 'user_id': 1}).status_code == 422
    assert client.delete('/me/location', headers=other).json() == {'location': None}
    assert client.get('/me/location', headers=customer).json()['location']['latitude'] == point['latitude']
    changed = {**point, 'longitude': 78.0, 'locality': 'Changed locality'}
    assert client.put('/me/location', headers=customer, json=changed).json()['location']['longitude'] == 78.0
    assert client.delete('/me/location', headers=customer).json() == {'location': None}
    assert client.delete('/me/location', headers=customer).json() == {'location': None}
    assert client.get('/me/location', headers=customer).json() == {'location': None}


@pytest.mark.parametrize('change', [
    {'latitude': 91}, {'longitude': -181}, {'latitude': True},
    {'latitude': '12.123456789'}, {'locality': '  '}, {'postal_code': '12345'},
    {'address': 'x' * 501}, {'landmark': 'x' * 201}, {'owner_user_id': 1},
])
def test_invalid_saved_location_does_not_overwrite_or_echo_private_point(client, customer, change):
    point = {'latitude': 12.123456789, 'longitude': 77.123456789, 'locality': 'Private locality'}
    assert client.put('/me/location', headers=customer, json=point).status_code == 200
    response = client.put('/me/location', headers=customer, json={**point, **change})
    assert response.status_code == 422
    assert '12.123456789' not in response.text and '77.123456789' not in response.text
    assert 'Private locality' not in response.text
    assert client.get('/me/location', headers=customer).json()['location']['latitude'] == point['latitude']


def test_nearby_coverage_edges_and_customer_point_privacy(client, db, seeded, member_customer, caplog):
    caplog.set_level(logging.INFO)
    owner = client.get('/me', headers=seller(client)).json()['id']
    sid = client.get('/catalogue').json()[0]['services'][0]['id']
    customer_latitude, customer_longitude = 12.123456789, 77.123456789
    edge = business(db, sid, owner, 0, 5)
    outside = business(db, sid, owner, 0, 5)
    farther = business(db, sid, owner, 0, 6)
    for row, km in ((edge, 5), (outside, 5.00001), (farther, 5.00001)):
        row.latitude = customer_latitude + math.degrees(km / EARTH_KM)
        row.longitude = customer_longitude
    db.commit()
    response = search(client, member_customer, sid, customer_latitude, customer_longitude)
    assert response.status_code == 200
    assert [row['id'] for row in response.json()['nearby']] == [edge.id]
    assert [row['id'] for row in response.json()['also_serves']] == [farther.id]
    assert outside.id not in [row['id'] for row in response.json()['also_serves']]
    assert set(response.json()) == {'nearby', 'also_serves', 'distance_kind', 'page', 'has_more_nearby', 'has_more_also_serves'}
    for row in response.json()['nearby'] + response.json()['also_serves']:
        assert set(row) == {'id', 'slug', 'name', 'company', 'location', 'verification_status', 'latitude', 'longitude', 'description', 'distance_km'}
        assert row['latitude'] == db.get(Provider, row['id']).latitude
        assert row['latitude'] != customer_latitude  # These are business pins, not the search point.
    assert db.get(User, client.get('/me', headers=member_customer).json()['id']).saved_location is None
    assert not any(str(customer_latitude) in record.message for record in caplog.records)


def business(db, sid, owner, km, coverage, **changes):
    p = provider(db, owner)
    p.latitude = math.degrees(km/EARTH_KM); p.longitude = 0
    p.active = True; p.verification_status = 'VERIFIED'
    for key, value in changes.items():setattr(p, key, value)
    db.add(ProviderService(provider_id=p.id, service_id=sid, approval_status='APPROVED', coverage_radius_km=coverage))
    db.commit()
    return p


@pytest.mark.parametrize('radius', [2, 5, 10, 25])
def test_inclusive_radius_coverage_and_separate_farther_group(client, db, seeded, member_customer, radius):
    headers = seller(client); owner = client.get('/me', headers=headers).json()['id']
    sid = client.get('/catalogue').json()[0]['services'][0]['id']
    edge = business(db, sid, owner, radius, float(radius))
    close = business(db, sid, owner, radius/2, float(radius))
    far = business(db, sid, owner, radius+0.01, float(radius+1))
    noncovering = business(db, sid, owner, 0.5, 0.49)
    absent = business(db, sid, owner, 0.1, None)
    result = search(client, member_customer, sid, radius=radius)
    assert result.status_code == 200, result.text
    assert result.headers['cache-control'] == 'private, no-store'
    assert [row['id'] for row in result.json()['nearby']] == [close.id, edge.id]
    assert [row['id'] for row in result.json()['also_serves']] == [far.id]
    assert result.json()['distance_kind'] == 'straight-line'
    assert abs(result.json()['nearby'][-1]['distance_km']-radius) < 0.000001
    assert noncovering.id not in [row['id'] for row in result.json()['nearby']]
    assert absent.id not in [row['id'] for row in result.json()['nearby']]


def test_catalogue_listing_business_owner_and_membership_eligibility(client, db, seeded, member_customer):
    seller_headers = seller(client); owner = client.get('/me', headers=seller_headers).json()['id']
    sid = client.get('/catalogue').json()[0]['services'][0]['id']
    p = business(db, sid, owner, 1, 10)
    assert search(client, {}, sid).status_code == 401
    nonmember = seller(client, 'nonmember-location@example.com')
    assert search(client, nonmember, sid).status_code == 403
    assert search(client, seller_headers, sid).status_code == 403
    for field, value in [('active',False),('verification_status','PENDING'),('owner_user_id',None)]:
        before = getattr(p, field); setattr(p, field, value); db.commit()
        assert search(client, member_customer, sid).json()['nearby'] == []
        setattr(p, field, before); db.commit()
    grant = db.get(ProviderService, (p.id, sid)); grant.approval_status = 'PENDING'; db.commit()
    assert search(client, member_customer, sid).json()['nearby'] == []
    grant.approval_status = 'APPROVED'; db.get(User, owner).seller_enabled = False; db.commit()
    assert search(client, member_customer, sid).json()['nearby'] == []
    assert search(client, member_customer, 999999).status_code == 404


@pytest.mark.parametrize('payload', [
    {'latitude':91,'longitude':0}, {'latitude':0,'longitude':-181},
    {'latitude':'12.987654321','longitude':0}, {'latitude':True,'longitude':0},
    {'latitude':0,'longitude':0,'radius_km':3}, {'latitude':0,'longitude':0,'coverage_radius_km':500},
])
def test_invalid_point_or_search_parameters_are_rejected_without_echo(client, seeded, member_customer, payload):
    sid = client.get('/catalogue').json()[0]['services'][0]['id']
    result = client.post(f'/services/{sid}/nearby', headers=member_customer, json=payload)
    assert result.status_code == 422
    assert '12.987654321' not in result.text
    assert client.get(f'/services/{sid}/nearby?latitude=0&longitude=0',headers=member_customer).status_code == 405


def test_date_line_and_pole_distances(client, db, seeded, member_customer):
    headers = seller(client); owner = client.get('/me',headers=headers).json()['id']
    sid = client.get('/catalogue').json()[0]['services'][0]['id']
    p = business(db,sid,owner,0,100);p.longitude=-179.99;db.commit()
    result = search(client,member_customer,sid,longitude=179.99,radius=5).json()
    assert result['nearby'][0]['id'] == p.id and 2 < result['nearby'][0]['distance_km'] < 3
    p.latitude=90;p.longitude=80;db.commit()
    result = search(client,member_customer,sid,latitude=90,longitude=-80).json()
    assert result['nearby'][0]['distance_km'] < 0.000001


def test_business_pin_and_coverage_use_owner_drafts_and_independent_approval(client, db, seeded, admin):
    owner,p,sid = setup_business(client,db,seeded)
    other=seller(client,'other-location@example.com')
    root=f'/seller/businesses/{p.id}/publication-drafts'
    pin={'business_pin':{'latitude':12.0,'longitude':77.0}}
    assert client.post(root,headers=other,json=pin).status_code == 404
    assert client.post(root,headers=owner,json={'business_pin':{'latitude':91,'longitude':77}}).status_code == 422
    assert client.post(root,headers=owner,json={'service_id':sid,'coverage':{'coverage_radius_km':501}}).status_code == 422
    assert client.post(root,headers=owner,json={'service_id':sid,'coverage':{'coverage_radius_km':0}}).status_code == 422
    assert client.post(root,headers=owner,json={'service_id':sid,'coverage':{'coverage_radius_km':25.0}}).status_code == 409
    proposal=client.post(root,headers=owner,json=pin).json()
    assert p.latitude is None and p.longitude is None
    proposal=submit_draft(client,owner,proposal)
    assert review(client,owner,proposal).status_code == 403
    assert review(client,admin,proposal).status_code == 200
    assert (p.latitude,p.longitude) == (12.0,77.0)
    coverage=client.post(root,headers=owner,json={'service_id':sid,'coverage':{'coverage_radius_km':25.0}}).json()
    coverage=submit_draft(client,owner,coverage)
    assert review(client,admin,coverage).status_code == 200
    grant=db.get(ProviderService,(p.id,sid));assert grant.coverage_radius_km == 25 and grant.approval_status == 'APPROVED'
    with pytest.raises(IntegrityError):
        with db.begin_nested():db.execute(text('UPDATE providers SET latitude=100 WHERE id=:id'),{'id':p.id})
    with pytest.raises(IntegrityError):
        with db.begin_nested():db.execute(text('UPDATE provider_services SET coverage_radius_km=-1 WHERE provider_id=:id'),{'id':p.id})


def test_coverage_draft_rejects_changed_business_pin_and_unapproved_listing(client,db,seeded,admin):
    owner,p,sid=setup_business(client,db,seeded);p.latitude=12;p.longitude=77;db.commit()
    root=f'/seller/businesses/{p.id}/publication-drafts'
    coverage=client.post(root,headers=owner,json={'service_id':sid,'coverage':{'coverage_radius_km':25.0}}).json()
    coverage=submit_draft(client,owner,coverage)
    p.latitude=13;db.commit()
    assert review(client,admin,coverage).status_code == 409
    p.latitude=12;grant=db.get(ProviderService,(p.id,sid));grant.approval_status='SUSPENDED';db.commit()
    assert review(client,admin,coverage).status_code == 409
    assert grant.coverage_radius_km is None


def test_save_change_clear_private_point_and_no_implicit_search_persistence(client, db, seeded, customer, member_customer, caplog):
    caplog.set_level(logging.INFO)
    assert engine.hide_parameters is True  # SQL exception/log formatting must not echo customer points.
    point={'latitude':12.987654321,'longitude':77.987654321,'locality':'Synthetic locality','postal_code':'560001','address':'Private house','landmark':'Private landmark'}
    assert client.put('/me/location',json=point).status_code == 401
    assert client.get('/me/location',headers=customer).json() == {'location':None}
    sid=client.get('/catalogue').json()[0]['services'][0]['id']
    assert search(client,member_customer,sid,point['latitude'],point['longitude']).status_code == 200
    assert client.get('/me/location',headers=member_customer).json() == {'location':None}
    saved=client.put('/me/location',headers=customer,json=point)
    assert saved.status_code == 200 and saved.headers['cache-control'] == 'private, no-store'
    assert client.get('/me/location',headers=customer).json()['location'] == point
    another=seller(client,'private-other@example.com')
    assert client.get('/me/location',headers=another).json()['location'] is None
    assert 'saved_location' not in client.get('/me',headers=customer).json()
    assert client.put('/me/location',headers=customer,json={**point,'latitude':'bad'}).status_code == 422
    assert client.put('/me/location',headers=customer,json={**point,'locality':'Changed locality'}).status_code == 200
    assert client.delete('/me/location',headers=customer).json() == {'location':None}
    assert not any(str(point['latitude']) in row.message or str(point['longitude']) in row.message for row in caplog.records)
    assert not any('Private house' in str(a.details) for a in db.scalars(select(Audit)))


def test_enquiry_contains_only_supplied_locality_pin_and_explicit_address(client,db,seeded,admin,member_customer,caplog):
    caplog.set_level(logging.INFO)
    owner=seller(client);owner_id=client.get('/me',headers=owner).json()['id']
    sid=client.get('/catalogue').json()[0]['services'][0]['id']
    p=business(db,sid,owner_id,1,20)
    saved={'latitude':12.987654321,'longitude':77.987654321,'locality':'Fixture locality','postal_code':'560001','address':'Hidden saved house','landmark':'Hidden landmark'}
    assert client.put('/me/location',headers=member_customer,json=saved).status_code == 200
    payload={'service_id':sid,'requirements':'Synthetic service request requiring a locality only.','location':'Fixture locality','postal_code':'560001','phone':'1234567890'}
    assert client.post('/requests',headers=member_customer,json={**payload,'latitude':saved['latitude']}).status_code == 422
    for exact in [None,'Explicit request address only']:
        result=client.post('/requests',headers=member_customer,json={**payload,**({'service_address':exact} if exact else {})})
        assert result.status_code == 201,result.text
        request=result.json();assert request['service_address'] == exact
        assert client.post(f'/admin/requests/{request["id"]}/provider',headers=admin,json={'provider_id':p.id}).status_code == 201
        lead=client.get('/seller/leads',headers=owner).json()[0]
        assert lead['location'] == 'Fixture locality' and lead['postal_code'] == '560001' and lead['service_address'] == exact
        assert 'latitude' not in lead and 'longitude' not in lead and 'saved_location' not in lead
        assert 'Hidden saved house' not in str(lead) and 'Hidden landmark' not in str(lead)
    assert not any(str(saved['latitude']) in row.message or 'Hidden saved house' in row.message for row in caplog.records)
    assert not hasattr(db.get(ServiceRequest,request['id']),'latitude')
