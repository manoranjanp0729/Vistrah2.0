"""Recovery tests use isolated transactional fixtures and captured email only."""
import hashlib
import secrets
from datetime import timedelta
from unittest.mock import MagicMock
from contextlib import contextmanager

import pytest
from sqlalchemy import select

from app import recovery
from app.models import PasswordReset, User, now
from app.security import passwords

send_mail_implementation = recovery.send_mail

@pytest.fixture
def mailbox(monkeypatch, db):
    monkeypatch.setenv('PUBLIC_APP_URL', 'http://localhost:3100')
    monkeypatch.setenv('SMTP_HOST', 'smtp.example.test')
    monkeypatch.setenv('SMTP_FROM_EMAIL', 'noreply@example.test')
    monkeypatch.setenv('SMTP_TLS_MODE', 'starttls')
    monkeypatch.setenv('SMTP_USERNAME', 'fixture@example.test')
    monkeypatch.setenv('SMTP_PASSWORD', 'isolated-fixture-only')
    sent = []
    @contextmanager
    def test_session():
        yield db
    monkeypatch.setattr(recovery, 'SessionLocal', test_session)
    monkeypatch.setattr(recovery, 'send_mail', lambda recipient, subject, body: sent.append((recipient, subject, body)))
    return sent

def request_token(client, mailbox, email='customer@example.com'):
    response = client.post('/auth/forgot-password', json={'email': email})
    assert response.status_code == 200
    return mailbox[-1][2].split('#token=')[1].split()[0]

def reset(client, token, password='a-new-private-passphrase-729', confirmation=None):
    return client.post('/auth/reset-password', json={'token': token, 'new_password': password,
        'confirm_password': password if confirmation is None else confirmation})

def test_neutral_confirmation_and_hashed_expiring_token(client, db, customer, mailbox):
    known = client.post('/auth/forgot-password', json={'email': 'customer@example.com'})
    unknown = client.post('/auth/forgot-password', json={'email': 'missing@example.com'})
    assert known.status_code == unknown.status_code == 200
    assert known.json() == unknown.json() == {'message': recovery.CONFIRMATION}
    assert len(mailbox) == 1
    token = mailbox[0][2].split('#token=')[1].split()[0]
    row = db.get(PasswordReset, hashlib.sha256(token.encode()).hexdigest())
    assert row is not None and not row.used
    assert row.token_hash == hashlib.sha256(token.encode()).hexdigest()
    assert row.token_hash != token
    assert 0 < (recovery.aware(row.expires_at) - now()).total_seconds() <= 900

def test_reset_revokes_sessions_and_all_links_without_changing_role(client, db, customer, mailbox):
    first = request_token(client, mailbox)
    second = request_token(client, mailbox)
    identity = client.get('/me', headers=customer).json()
    assert reset(client, first).status_code == 200
    assert client.get('/me', headers=customer).status_code == 401
    assert reset(client, first).status_code == reset(client, second).status_code == 400
    user = db.get(User, identity['id'])
    assert user.role == 'CUSTOMER'
    assert passwords.verify('a-new-private-passphrase-729', user.password_hash)
    assert client.post('/auth/login', json={'email':'customer@example.com','password':'a-secure-password-123'}).status_code == 401
    login = client.post('/auth/login', json={'email':'customer@example.com','password':'a-new-private-passphrase-729'})
    assert login.status_code == 200 and login.json()['user']['role'] == 'CUSTOMER'
    assert len(mailbox) == 3 and mailbox[-1][1] == 'Your VISTRAH password was changed'
    assert 'a-new-private-passphrase-729' not in mailbox[-1][2]

def test_admin_recovery_preserves_role_and_revokes_admin_session(client, db, admin, mailbox):
    token = request_token(client, mailbox, 'admin@example.com')
    assert reset(client, token).status_code == 200
    assert client.get('/admin/overview', headers=admin).status_code == 401
    assert db.scalar(select(User.role).where(User.email=='admin@example.com')) == 'ADMIN'

def test_expired_invalid_and_missing_tokens_do_not_change_password(client, db, customer, mailbox):
    token = request_token(client, mailbox)
    row = db.get(PasswordReset, hashlib.sha256(token.encode()).hexdigest())
    row.expires_at = now() - timedelta(seconds=1)
    db.commit()
    expired = reset(client, token)
    assert expired.status_code == 400 and 'expired' in expired.json()['detail']
    assert reset(client, secrets.token_urlsafe(32)).status_code == 400
    assert reset(client, '').status_code == 422
    assert client.get('/me', headers=customer).status_code == 200

@pytest.mark.parametrize('password,confirmation',[
    ('short','short'),('aaaaaaaaaaaaaaa','aaaaaaaaaaaaaaa'),
    ('a-new-private-passphrase-729','a-different-passphrase-729'),
    (' leading-passphrase-729',' leading-passphrase-729')])
def test_password_validation_never_echoes_secrets(client, customer, mailbox, password, confirmation):
    token = request_token(client, mailbox)
    response = reset(client, token, password, confirmation)
    assert response.status_code == 422
    assert all('input' not in error and 'ctx' not in error for error in response.json()['detail'])
    assert token not in response.text
    assert client.get('/me', headers=customer).status_code == 200

def test_request_throttle_is_neutral_and_does_not_lock_account(client, customer, mailbox):
    for _ in range(5):
        response = client.post('/auth/forgot-password', json={'email':'customer@example.com'})
        assert response.json() == {'message': recovery.CONFIRMATION}
    assert len(mailbox) == 3
    assert client.get('/me', headers=customer).status_code == 200

def test_missing_mail_and_delivery_failure_are_neutral(client, customer, mailbox, monkeypatch, caplog):
    monkeypatch.delenv('SMTP_HOST')
    response = client.post('/auth/forgot-password', json={'email':'customer@example.com'})
    assert response.json() == {'message': recovery.CONFIRMATION} and len(mailbox) == 0
    monkeypatch.setenv('SMTP_HOST','smtp.example.test')
    def fail(*args):raise RuntimeError('private SMTP credential must not escape')
    monkeypatch.setattr(recovery,'send_mail',fail)
    response = client.post('/auth/forgot-password', json={'email':'customer@example.com'})
    assert response.json() == {'message': recovery.CONFIRMATION}
    assert 'private SMTP credential' not in caplog.text

def test_reset_attempt_throttle(client):
    token = secrets.token_urlsafe(32)
    for _ in range(20):assert reset(client,token).status_code == 400
    assert reset(client,token).status_code == 429

def test_mail_transport_uses_tls_and_does_not_enable_debug(mailbox, monkeypatch):
    smtp = MagicMock()
    smtp.return_value.__enter__.return_value.send_message.return_value = {}
    monkeypatch.setattr(recovery.smtplib,'SMTP',smtp)
    send_mail_implementation('recipient@example.test','Recovery test','Test message')
    connection=smtp.return_value.__enter__.return_value
    assert connection.starttls.call_count == 1
    assert connection.send_message.call_count == 1
    assert connection.set_debuglevel.call_count == 0

@pytest.mark.parametrize('origin',['http://example.com','https://user:secret@example.com','https://example.com/path'])
def test_untrusted_reset_origins_are_rejected(mailbox, monkeypatch, origin):
    monkeypatch.setenv('PUBLIC_APP_URL',origin)
    assert recovery.mail_settings() is None

def test_development_status_is_unavailable_in_production(client, monkeypatch):
    monkeypatch.setenv('APP_ENV','production')
    assert client.get('/auth/recovery-status').status_code == 404
    monkeypatch.setenv('APP_ENV','development')
    monkeypatch.delenv('SMTP_HOST',raising=False)
    assert client.get('/auth/recovery-status').json() == {'configured':False}

def test_implicit_tls_mail_transport_and_rejected_recipient(mailbox, monkeypatch):
    monkeypatch.setenv('SMTP_TLS_MODE','ssl')
    monkeypatch.setenv('SMTP_PORT','465')
    smtp=MagicMock()
    connection=smtp.return_value.__enter__.return_value
    connection.send_message.return_value={}
    monkeypatch.setattr(recovery.smtplib,'SMTP_SSL',smtp)
    send_mail_implementation('recipient@example.test','Recovery test','Test message')
    assert smtp.call_args.kwargs['context'] is not None
    assert connection.starttls.call_count == 0 and connection.login.call_count == 1
    connection.send_message.return_value={'recipient@example.test':(550,b'rejected')}
    with pytest.raises(RuntimeError):
        send_mail_implementation('recipient@example.test','Recovery test','Test message')

def test_html_template_has_branded_button_and_no_external_assets(mailbox, monkeypatch):
    smtp=MagicMock()
    connection=smtp.return_value.__enter__.return_value
    connection.send_message.return_value={}
    monkeypatch.setattr(recovery.smtplib,'SMTP',smtp)
    send_mail_implementation('recipient@example.test','Reset your VISTRAH password',
        'Reset your password:\nhttp://localhost:3100/reset-password#token=fixture\nExpires in 15 minutes.')
    message=connection.send_message.call_args.args[0]
    assert message.is_multipart()
    html=message.get_body(preferencelist=('html',)).get_content()
    assert 'VISTRAH' in html and '15 minutes' in html and 'Reset password</a>' in html
    assert '<img' not in html and 'ignore this email' in html
