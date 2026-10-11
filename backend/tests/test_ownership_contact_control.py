"""Synthetic contact-control tests: SMTP is mocked, normal databases are never used."""
import hashlib
from datetime import timedelta

import pytest
from sqlalchemy import select, func

from app import ownership_contact as contact
from app.models import Provider, ProviderService, ServiceRequest, Audit, now
from app.provider_models import (
    ProviderOwnershipClaim, ProviderOwnershipContactChallenge as Challenge,
    ProviderOwnershipClaimEvent, ProviderDocument, ProviderApplicationEvent, ProviderApplication, ProviderLead,
)
from test_seller_ownership import seller, provider
from test_seller_ownership_claim_flow import create_claim, claim_input, upload, add_admin, PDF_B
from test_provider_onboarding import start, PNG


@pytest.fixture
def mailbox(monkeypatch):
    messages = []
    monkeypatch.setattr(contact, 'mail_settings', lambda: ('https://synthetic.example', 'mock-smtp', 'sender@example.com', 'starttls'))
    monkeypatch.setattr(contact, 'send_mail', lambda recipient, subject, body: messages.append((recipient, subject, body)))
    return messages


def setup_claim(client, db, email='business@example.com', business_type='REGISTERED'):
    headers = seller(client, email)
    p = provider(db, email=email)
    claim = create_claim(client, headers, claim_input(p.id, email, business_type))
    assert upload(client, headers, claim['id'], 'AUTHORITY' if business_type == 'REGISTERED' else 'CORROBORATING').status_code == 201
    if business_type == 'UNREGISTERED':
        assert upload(client, headers, claim['id'], 'CORROBORATING', PDF_B).status_code == 201
    return headers, p, claim['id']


def send(client, headers, cid):
    return client.post(f'/seller/ownership-claims/{cid}/contact-challenge', headers=headers)


def code(mailbox):
    return mailbox[-1][2].split('\n\n')[1]


def verify(client, headers, cid, token):
    return client.post(f'/seller/ownership-claims/{cid}/contact-verify', headers=headers, json={'token': token})


def approve(client, admin, cid):
    return client.post(f'/admin/ownership-claims/{cid}/review', headers=admin,
        json={'status': 'APPROVED', 'reason': 'Authority and business registration evidence reviewed independently.'})


@pytest.mark.parametrize('business_type', ['REGISTERED', 'UNREGISTERED'])
def test_verified_claim_can_be_independently_approved_without_membership(client, db, admin, mailbox, business_type):
    headers, p, cid = setup_claim(client, db, business_type=business_type)
    assert client.get('/me/membership', headers=headers).json()['active'] is False
    assert approve(client, admin, cid).status_code == 409
    sent = send(client, headers, cid)
    assert sent.status_code == 200 and sent.headers['cache-control'] == 'private, no-store'
    token = code(mailbox)
    challenge = db.scalar(select(Challenge).where(Challenge.claim_id == cid))
    assert len(token) == 43 and challenge.token_hash == hashlib.sha256(token.encode()).hexdigest()
    assert token not in sent.text and token not in client.get('/admin/ownership-claims', headers=admin).text
    checked = verify(client, headers, cid, token)
    assert checked.status_code == 200 and checked.json()['contact_control_verified']
    assert db.get(Provider, p.id).owner_user_id is None  # Verification alone grants nothing.
    assert verify(client, headers, cid, token).status_code == 400  # Single use.
    approved = approve(client, admin, cid)
    assert approved.status_code == 200 and approved.json()['status'] == 'APPROVED'
    identity = client.get('/me', headers=headers).json()
    assert db.get(Provider, p.id).owner_user_id == identity['id'] and identity['role'] == 'CUSTOMER'
    assert client.get(f'/seller/businesses/{p.id}', headers=headers).status_code == 200
    assert approve(client, admin, cid).status_code == 409
    assert upload(client, headers, cid, 'AUTHORITY', PDF_B).status_code == 409
    assert send(client, headers, cid).status_code == 409
    row = db.get(ProviderOwnershipClaim, cid)
    assert row.reviewer_id != identity['id'] and row.reviewed_at and row.review_note
    events = list(db.scalars(select(ProviderOwnershipClaimEvent).where(ProviderOwnershipClaimEvent.claim_id == cid)))
    assert [event.action for event in events][-3:] == ['CONTACT_CHALLENGE_SENT', 'CONTACT_VERIFIED', 'APPROVED']
    assert db.scalar(select(Audit.id).where(Audit.entity_id == cid, Audit.action == 'OWNERSHIP_CLAIM_APPROVED'))


def test_scope_privacy_and_wrong_claim_tokens(client, db, admin, customer, mailbox):
    headers, p, cid = setup_claim(client, db)
    other, _, other_cid = setup_claim(client, db, 'other-business@example.com')
    assert send(client, {}, cid).status_code == 401
    assert send(client, customer, cid).status_code == 403
    assert send(client, other, cid).status_code == 404
    assert verify(client, other, cid, 'x'*43).status_code == 404
    assert send(client, admin, cid).status_code == 403
    assert send(client, headers, cid).status_code == 200
    token = code(mailbox)
    assert send(client, other, other_cid).status_code == 200
    assert verify(client, other, other_cid, token).status_code == 400
    malformed = verify(client, headers, cid, token + '!')
    assert malformed.status_code == 422 and token not in malformed.text
    assert verify(client, headers, cid, token).status_code == 200
    assert db.get(Provider, p.id).owner_user_id is None


def test_attempt_limit_expiry_and_reissue(client, db, mailbox):
    headers, _, cid = setup_claim(client, db)
    assert send(client, headers, cid).status_code == 200
    old = code(mailbox)
    for _ in range(5):
        assert verify(client, headers, cid, 'x'*43).status_code == 400
    assert verify(client, headers, cid, old).status_code == 400
    first = db.scalar(select(Challenge).where(Challenge.claim_id == cid))
    assert first.attempts == 5 and not first.verified_at
    assert send(client, headers, cid).status_code == 200
    new = code(mailbox)
    assert first.invalidated
    assert verify(client, headers, cid, old).status_code == 400
    current = db.scalar(select(Challenge).where(Challenge.claim_id == cid, Challenge.invalidated.is_(False)))
    current.expires_at = now() - timedelta(seconds=1)
    db.commit()
    assert verify(client, headers, cid, new).status_code == 400
    assert send(client, headers, cid).status_code == 200
    assert verify(client, headers, cid, code(mailbox)).status_code == 200
    assert send(client, headers, cid).status_code == 429


def test_redeem_rate_limit_persists_without_challenge(client, db, mailbox):
    headers, _, cid = setup_claim(client, db)
    for _ in range(20):
        assert verify(client, headers, cid, 'x'*43).status_code == 400
    assert verify(client, headers, cid, 'x'*43).status_code == 429


def test_recipient_rate_limit_applies_across_claimants(client, db, mailbox):
    p = provider(db, email='shared-business@example.com')
    for index in range(4):
        headers = seller(client, f'claimant-{index}@example.com')
        cid = create_claim(client, headers, claim_input(p.id, p.email))['id']
        assert send(client, headers, cid).status_code == (200 if index < 3 else 429)
    assert len(mailbox) == 3


def test_rejection_invalidates_outstanding_code(client, db, admin, mailbox):
    headers, p, cid = setup_claim(client, db)
    assert send(client, headers, cid).status_code == 200
    token = code(mailbox)
    response = client.post(f'/admin/ownership-claims/{cid}/review', headers=admin,
        json={'status': 'REJECTED', 'reason': 'Authority evidence does not establish business ownership.'})
    assert response.status_code == 200
    assert verify(client, headers, cid, token).status_code == 409
    assert db.scalar(select(Challenge).where(Challenge.claim_id == cid)).invalidated
    assert db.get(Provider, p.id).owner_user_id is None


@pytest.mark.parametrize('failure', ['unconfigured', 'delivery', 'mismatch', 'phone'])
def test_contact_failures_never_grant_verified_state(client, db, admin, mailbox, monkeypatch, failure):
    headers, p, cid = setup_claim(client, db)
    claim = db.get(ProviderOwnershipClaim, cid)
    expected = 503
    if failure == 'unconfigured':
        monkeypatch.setattr(contact, 'mail_settings', lambda: None)
    elif failure == 'delivery':
        def fail(*args):
            raise RuntimeError('Sensitive SMTP data must not reach logs or response')
        monkeypatch.setattr(contact, 'send_mail', fail)
    elif failure == 'mismatch':
        claim.contact_value = 'attacker@example.com'
        expected = 409
    else:
        claim.contact_channel = 'PHONE'
        claim.contact_value = p.phone
        expected = 409
    db.commit()
    response = send(client, headers, cid)
    assert response.status_code == expected and 'Sensitive' not in response.text
    assert not mailbox
    assert not client.get('/seller/ownership-claims', headers=headers).json()[0]['contact_control_verified']
    assert approve(client, admin, cid).status_code == 409
    assert db.get(Provider, p.id).owner_user_id is None


def test_contact_change_proof_age_and_resubmission_invalidate_verification(client, db, admin, mailbox):
    headers, p, cid = setup_claim(client, db)
    assert send(client, headers, cid).status_code == 200
    assert verify(client, headers, cid, code(mailbox)).status_code == 200
    p.email = 'changed@example.com'; db.commit()
    assert approve(client, admin, cid).status_code == 409
    p.email = 'business@example.com'; db.commit()
    proof = db.scalar(select(Challenge).where(Challenge.claim_id == cid, Challenge.invalidated.is_(False)))
    proof.verified_at = now() - timedelta(hours=25); db.commit()
    assert approve(client, admin, cid).status_code == 409
    proof.verified_at = now(); db.commit()
    response = client.post(f'/admin/ownership-claims/{cid}/review', headers=admin,
        json={'status': 'NEEDS_INFO', 'reason': 'Please clarify your business authority evidence.'})
    assert response.status_code == 200 and not response.json()['contact_control_verified']
    assert approve(client, admin, cid).status_code == 409
    assert verify(client, headers, cid, code(mailbox)).status_code == 409
    payload = claim_input(p.id, p.email); payload.pop('provider_id')
    assert client.post(f'/seller/ownership-claims/{cid}/resubmit', headers=headers, json=payload).status_code == 200
    assert not contact.verified(db, db.get(ProviderOwnershipClaim, cid))
    assert send(client, headers, cid).status_code == 200
    assert verify(client, headers, cid, code(mailbox)).status_code == 200
    assert approve(client, admin, cid).status_code == 200


def test_self_review_recusal_and_incomplete_evidence_still_block_verified_claim(client, db, admin, mailbox):
    client.post('/auth/seller/enable', headers=admin)
    p = provider(db, email='admin@example.com')
    cid = create_claim(client, admin, claim_input(p.id, p.email))['id']
    assert send(client, admin, cid).status_code == 200
    assert verify(client, admin, cid, code(mailbox)).status_code == 200
    assert approve(client, admin, cid).status_code == 403
    reviewer, _ = add_admin(db, 'independent@example.com')
    assert approve(client, reviewer, cid).status_code == 409  # Evidence still required.
    assert upload(client, admin, cid, 'AUTHORITY').status_code == 201
    assert client.post(f'/admin/ownership-claims/{cid}/recuse', headers=reviewer,
        json={'reason': 'I have a personal conflict with the claimant.'}).status_code == 200
    assert approve(client, reviewer, cid).status_code == 403
    assert db.get(Provider, p.id).owner_user_id is None


def test_competing_claim_cannot_transfer_an_assigned_owner(client, db, admin, mailbox):
    headers, p, cid = setup_claim(client, db)
    other = seller(client, 'other-claimant@example.com')
    other_cid = create_claim(client, other, claim_input(p.id, p.email))['id']
    assert upload(client, other, other_cid, 'AUTHORITY').status_code == 201
    for who, claim_id in [(headers, cid), (other, other_cid)]:
        assert send(client, who, claim_id).status_code == 200
        assert verify(client, who, claim_id, code(mailbox)).status_code == 200
    assert approve(client, admin, cid).status_code == 200
    assert approve(client, admin, other_cid).status_code == 409
    assert db.get(Provider, p.id).owner_user_id == client.get('/me', headers=headers).json()['id']
    assert db.get(ProviderOwnershipClaim, other_cid).status == 'PENDING'
    assert client.get(f'/seller/businesses/{p.id}', headers=other).status_code == 404


def test_approval_preserves_service_and_original_applicant_privacy(client, db, seeded, admin, mailbox):
    original = seller(client, 'original-applicant@example.com')
    headers, p, cid = setup_claim(client, db)
    category = client.get('/catalogue').json()[0]
    app = start(client, original, category)
    db.get(ProviderApplication, app['id']).provider_id = p.id
    sid = category['services'][0]['id']
    grant = ProviderService(provider_id=p.id, service_id=sid, approval_status='APPROVED', application_id=app['id'])
    document = ProviderDocument(id='original-private-proof', application_id=app['id'], service_id=sid,
        field_id='fixture', filename='fixture.png', media_type='image/png', sha256='1'*64, content=PNG)
    db.add_all([grant, document])
    original_id = client.get('/me', headers=original).json()['id']
    request = ServiceRequest(user_id=original_id, service_id=sid, requirements='Synthetic saved request to preserve', location='Fixture', phone='1234567890')
    db.add(request); db.flush()
    lead = ProviderLead(request_id=request.id, provider_id=p.id, service_id=sid, actor_id=original_id)
    db.add(lead); db.commit()
    count = db.scalar(select(func.count()).select_from(ProviderApplicationEvent))
    provider_before = (p.verification_status, p.active, p.publication_revision)
    assert send(client, headers, cid).status_code == 200
    assert verify(client, headers, cid, code(mailbox)).status_code == 200
    assert approve(client, admin, cid).status_code == 200
    assert db.get(ProviderService, (p.id, sid)).approval_status == 'APPROVED'
    assert (p.verification_status, p.active, p.publication_revision) == provider_before
    assert db.get(ProviderDocument, document.id).content == PNG
    assert db.get(ProviderLead, lead.id).request_id == request.id
    assert db.get(ServiceRequest, request.id).user_id == original_id
    assert db.get(ProviderApplication, app['id']).user_id == original_id
    assert db.scalar(select(func.count()).select_from(ProviderApplicationEvent)) == count
    nested = f'/seller/businesses/{p.id}/applications/{app["id"]}'
    assert client.get(nested, headers=headers).status_code == 404
    assert client.get(nested + '/documents/' + document.id, headers=headers).status_code == 404
    assert client.get(f'/provider-applications/{app["id"]}/documents/{document.id}', headers=original).content == PNG
