"""Google sign-in uses real cryptographic verification with disposable signing keys."""
import json
import time
import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from sqlalchemy import select,func
from app.models import User,AuthSession,GoogleIdentity
from app.v_ads_models import VAdsAdvertiser
from app import google_auth

@pytest.fixture
def google(monkeypatch):
    key=rsa.generate_private_key(public_exponent=65537,key_size=2048)
    public=json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(key.public_key()))
    public['kid']='fixture-google-key'
    monkeypatch.setenv('GOOGLE_CLIENT_ID','fixture-client.apps.googleusercontent.com')
    monkeypatch.setattr(google_auth,'_keys',[public])
    monkeypatch.setattr(google_auth,'_expires',time.monotonic()+300)
    def token(**changes):
        claims={'sub':'google-subject-1','email':'verifiedcustomer@gmail.com','email_verified':True,
            'name':'Google Customer','iss':'https://accounts.google.com','aud':'fixture-client.apps.googleusercontent.com',
            'iat':int(time.time()),'exp':int(time.time())+300}
        claims.update(changes)
        return jwt.encode(claims,key,algorithm='RS256',headers={'kid':public['kid']})
    return token

@pytest.mark.parametrize('path',['/auth/google','/auth/seller/google'])
def test_rejects_email_impersonation_even_in_development(client,db,path):
    before=db.scalar(select(func.count()).select_from(AuthSession))
    response=client.post(path,json={'test_email':'vistrahindia@gmail.com','test_name':'Admin'})
    assert response.status_code==422
    assert db.scalar(select(func.count()).select_from(AuthSession))==before

@pytest.mark.parametrize('path,seller',[('/auth/google',False),('/auth/seller/google',True)])
def test_verified_google_creates_correct_identity(client,db,google,path,seller):
    response=client.post(path,json={'credential':google()})
    assert response.status_code==200,response.text
    user=response.json()['user']
    assert user['email']=='verifiedcustomer@gmail.com'
    assert user['seller_enabled'] is seller
    assert user['role']=='CUSTOMER'
    assert db.get(GoogleIdentity,'google-subject-1').user_id==user['id']
    channel=db.scalar(select(VAdsAdvertiser).where(VAdsAdvertiser.owner_id==user['id']))
    assert bool(channel) is seller

@pytest.mark.parametrize('changes',[{'aud':'attacker-client'},{'iss':'https://attacker.invalid'},
    {'azp':'untrusted-client'},{'exp':1},{'email_verified':False},{'iat':int(time.time())+3600},{'sub':''}])
def test_rejects_invalid_claims_without_creating_session(client,db,google,changes):
    response=client.post('/auth/google',json={'credential':google(**changes)})
    assert response.status_code==401
    assert db.get(GoogleIdentity,'google-subject-1') is None


def test_missing_configuration_fails_closed(client,google,monkeypatch):
    monkeypatch.delenv('GOOGLE_CLIENT_ID')
    assert client.post('/auth/google',json={'credential':google()}).status_code==503


def test_signature_must_match_google_key(client,google):
    token=google()
    other=rsa.generate_private_key(public_exponent=65537,key_size=2048)
    claims=jwt.decode(token,options={'verify_signature':False})
    forged=jwt.encode(claims,other,algorithm='RS256',headers={'kid':'fixture-google-key'})
    assert client.post('/auth/google',json={'credential':forged}).status_code==401


def test_linked_subject_keeps_identity_when_google_email_changes(client,db,google):
    first=client.post('/auth/google',json={'credential':google()}).json()['user']
    response=client.post('/auth/google',json={'credential':google(email='newaddress@gmail.com')})
    assert response.status_code==200
    assert response.json()['user']['id']==first['id']
    assert response.json()['user']['email']==first['email']


def test_verified_gmail_links_existing_user_without_duplicate(client,db,google):
    user=User(name='Existing',email='verifiedcustomer@gmail.com',password_hash='not-a-password')
    db.add(user);db.commit()
    response=client.post('/auth/seller/google',json={'credential':google()})
    assert response.status_code==200,response.text
    assert response.json()['user']['id']==user.id
    assert response.json()['user']['seller_enabled'] is True


def test_third_party_email_cannot_take_over_existing_account(client,db,google):
    user=User(name='Existing',email='person@example.com',password_hash='not-a-password')
    db.add(user);db.commit()
    assert client.post('/auth/google',json={'credential':google(email=user.email)}).status_code==409


def test_customer_endpoint_cannot_accept_seller_upgrade_flag(client,google):
    assert client.post('/auth/google',json={'credential':google(),'seller':True}).status_code==422


def test_google_first_time_dpdp_consent_gate_and_returning_user_flow(client,db,google):
    from app.models import Audit
    cred=google(sub='google-dpdp-sub-1',email='dpdp.google.user@gmail.com',name='DPDP Google User')
    # 1. First-time user on /login without accepted DPDP consent triggers 428 inline consent prompt
    gated=client.post('/auth/google',json={'credential':cred,'require_consent_for_new':True})
    assert gated.status_code==428
    assert db.get(GoogleIdentity,'google-dpdp-sub-1') is None

    # 2. Submitting with explicit DPDP consent creates account and persists timestamps + audit
    created=client.post('/auth/google',json={
        'credential':cred,
        'privacy_policy_version':'2026-11-dpdp-v1',
        'marketing_consent':True,
    })
    assert created.status_code==200,created.text
    user_payload=created.json()['user']
    assert user_payload['privacy_policy_version']=='2026-11-dpdp-v1'
    assert user_payload['privacy_consented_at'] is not None
    assert user_payload['marketing_consent'] is True
    assert user_payload['marketing_consented_at'] is not None

    audit_entry=db.scalar(select(Audit).where(Audit.actor_id==user_payload['id'],Audit.action=='CONSENT_RECORDED'))
    assert audit_entry is not None
    assert audit_entry.details.get('auth_method')=='google'

    # 3. Returning Google user on /login signs in immediately without nagging
    returning=client.post('/auth/google',json={'credential':cred,'require_consent_for_new':True})
    assert returning.status_code==200
    assert returning.json()['user']['id']==user_payload['id']


def test_google_select_account_access_token_creates_different_account_and_fails_closed(client,db,google,monkeypatch):
    import httpx

    class MockResponse:
        def __init__(self, status_code: int, payload: dict):
            self.status_code = status_code
            self._payload = payload

        def raise_for_status(self):
            if self.status_code >= 500:
                raise httpx.HTTPStatusError('Upstream error', request=None, response=None)

        def json(self):
            return self._payload

    state = {
        'aud': 'fixture-client.apps.googleusercontent.com',
        'azp': 'fixture-client.apps.googleusercontent.com',
        'sub': 'google-second-account-sub',
        'exp': int(time.time()) + 300,
        'user_sub': 'google-second-account-sub',
        'email': 'second.account@gmail.com',
        'email_verified': True,
        'name': 'Second Google Account',
    }

    class MockAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, url, data=None):
            assert url == 'https://oauth2.googleapis.com/tokeninfo'
            assert data == {'access_token': 'ya29.mock-select-account-token'}
            return MockResponse(200, {
                'aud': state['aud'],
                'azp': state['azp'],
                'sub': state['sub'],
                'exp': str(state['exp']),
                'expires_in': '300',
            })

        async def get(self, url, headers=None):
            assert url == 'https://openidconnect.googleapis.com/v1/userinfo'
            assert headers == {'Authorization': 'Bearer ya29.mock-select-account-token'}
            return MockResponse(200, {
                'sub': state['user_sub'],
                'email': state['email'],
                'email_verified': state['email_verified'],
                'name': state['name'],
            })

    monkeypatch.setattr(google_auth.httpx, 'AsyncClient', MockAsyncClient)

    # First sign in with standard account 1, then sign out, then sign in with account 2 via select_account access_token
    first = client.post('/auth/google', json={
        'credential': google(),
        'privacy_policy_version': '2026-11-dpdp-v1',
        'marketing_consent': False,
    })
    assert first.status_code == 200
    first_token = first.json()['access_token']
    assert client.post('/auth/logout', headers={'Authorization': f'Bearer {first_token}'}).status_code == 200

    second = client.post('/auth/google', json={
        'access_token': 'ya29.mock-select-account-token',
        'privacy_policy_version': '2026-11-dpdp-v1',
        'marketing_consent': True,
    })
    assert second.status_code == 200, second.text
    second_user = second.json()['user']
    assert second_user['email'] == 'second.account@gmail.com'
    assert second_user['id'] != first.json()['user']['id']
    assert second_user['privacy_policy_version'] == '2026-11-dpdp-v1'
    assert second_user['marketing_consent'] is True

    # Fail-closed checks: untrusted audience or mismatched userinfo subject must return 401
    state['aud'] = 'attacker-client.apps.googleusercontent.com'
    assert client.post('/auth/google', json={'access_token': 'ya29.mock-select-account-token'}).status_code == 401

    state['aud'] = 'fixture-client.apps.googleusercontent.com'
    state['user_sub'] = 'different-sub'
    assert client.post('/auth/google', json={'access_token': 'ya29.mock-select-account-token'}).status_code == 401
