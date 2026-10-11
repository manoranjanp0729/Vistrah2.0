from sqlalchemy import select
from app.models import Service

def test_full_information_is_backend_membership_protected(client,customer,seeded):
    sid=client.get('/catalogue').json()[0]['services'][0]['id']
    assert 'member_information' not in client.get('/catalogue').json()[0]['services'][0]
    assert client.get(f'/services/{sid}/member-information').status_code==401
    assert client.get(f'/services/{sid}/member-information',headers=customer).status_code==403
    p=client.post('/payments/checkout',headers=customer,json={'idempotency_key':'member-information-payment-key'}).json()
    client.post(f'/payments/{p["id"]}/simulate',headers=customer,json={'outcome':'SUCCEEDED'})
    response=client.get(f'/services/{sid}/member-information',headers=customer)
    assert response.status_code==200
    assert len(response.json()['notes'])==5
