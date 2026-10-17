"""Isolated access and moderation regressions for seller catalogue requests."""
from test_seller_ownership import seller

def payload(level='category', parent=''):
    return {'level':level,'parent':parent,'title':'Synthetic new category',
            'description':'Synthetic catalogue proposal for manual review.',
            'business_name':'Synthetic Business'}

def test_request_access_ownership_and_review(client, customer, admin):
    a=seller(client,'catalogue-a@example.com')
    b=seller(client,'catalogue-b@example.com')
    assert client.post('/seller/catalogue-requests',json=payload()).status_code==401
    assert client.post('/seller/catalogue-requests',headers=customer,json=payload()).status_code==403
    assert client.post('/seller/catalogue-requests',headers=a,json=payload('service')).status_code==422
    created=client.post('/seller/catalogue-requests',headers=a,json=payload())
    assert created.status_code==201,created.text
    item=created.json()
    assert item['status']=='PENDING'
    assert len(client.get('/seller/catalogue-requests',headers=a).json())==1
    assert client.get('/seller/catalogue-requests',headers=b).json()==[]
    assert client.get('/admin/catalogue-requests',headers=a).status_code==403
    assert client.post(f"/admin/catalogue-requests/{item['id']}/review",
                       headers=a,json={'decision':'APPROVED','note':'Reviewed'}).status_code==403
    assert client.post(f"/admin/catalogue-requests/{item['id']}/review",
                       headers=admin,json={'decision':'APPROVED','note':'Reviewed'}).status_code==200
    assert client.post(f"/admin/catalogue-requests/{item['id']}/review",
                       headers=admin,json={'decision':'REJECTED','note':'Second review'}).status_code==409
    assert client.get('/seller/catalogue-requests',headers=a).json()[0]['status']=='APPROVED'

def test_invalid_request_inputs(client):
    a=seller(client,'catalogue-validations@example.com')
    for bad in [dict(payload(),level='admin'),dict(payload(),title='x'),
                dict(payload(),description='short'),dict(payload(),seller_id=999)]:
        assert client.post('/seller/catalogue-requests',headers=a,json=bad).status_code==422
