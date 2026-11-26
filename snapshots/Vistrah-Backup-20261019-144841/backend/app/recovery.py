"""Password recovery: no plaintext tokens in storage, URLs in logs, or responses."""
import hashlib
import logging
import os
import secrets
import smtplib
import ssl
from datetime import timedelta
from email.message import EmailMessage
from email.utils import formataddr
from urllib.parse import urlsplit
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import EmailStr, Field, StringConstraints, field_validator, model_validator
from sqlalchemy import func, select, text, update
from sqlalchemy.orm import Session

from .database import get_db, SessionLocal
from .models import AuthSession, LoginAttempt, PasswordReset, User, now
from .payments import aware
from .schemas import Schema
from .security import passwords

router = APIRouter(prefix='/auth')
logger = logging.getLogger(__name__)
CONFIRMATION = 'If an account matches that email and email delivery succeeds, you will receive a password-reset link. Check your inbox and spam folder.'

class ForgotPassword(Schema):
    email: EmailStr

class ResetPassword(Schema):
    token: str = Field(min_length=43, max_length=128, pattern=r'^[A-Za-z0-9_-]+$')
    # Preserve password whitespace; it is part of the credential.
    new_password: Annotated[str, StringConstraints(min_length=15, max_length=128, strip_whitespace=False)]
    confirm_password: Annotated[str, StringConstraints(min_length=15, max_length=128, strip_whitespace=False)]

    @field_validator('new_password')
    @classmethod
    def strong_password(cls, value):
        if value != value.strip():
            raise ValueError('Passwords must not start or end with whitespace.')
        if len(set(value)) < 5 or value.lower() in {'password123456789', '123456789012345', 'qwertyuiopasdfgh'}:
            raise ValueError('Use a longer, less predictable password or passphrase.')
        return value

    @model_validator(mode='after')
    def matching_passwords(self):
        if self.new_password != self.confirm_password:
            raise ValueError('Passwords must match.')
        return self

def mail_settings():
    origin = os.getenv('PUBLIC_APP_URL', '').rstrip('/')
    try:
        parsed = urlsplit(origin)
        port = int(os.getenv('SMTP_PORT', '587'))
        if not 1 <= port <= 65535:
            return None
    except ValueError:
        return None
    local = parsed.hostname in ('localhost', '127.0.0.1', '::1')
    if (parsed.scheme not in ('http', 'https') or not parsed.hostname or
        parsed.username or parsed.password or parsed.query or parsed.fragment or
        parsed.path or (parsed.scheme != 'https' and not local)):
        return None
    host = os.getenv('SMTP_HOST', '')
    sender = os.getenv('SMTP_FROM_EMAIL', '')
    sender_name = os.getenv('SMTP_FROM_NAME', 'VISTRAH')
    username = os.getenv('SMTP_USERNAME', '')
    password = os.getenv('SMTP_PASSWORD', '')
    if not host or not sender or not username or not password or any(c in sender+sender_name for c in '\r\n'):
        return None
    mode = os.getenv('SMTP_TLS_MODE', 'starttls')
    if mode not in ('starttls', 'ssl') or os.getenv('SMTP_USE_TLS', 'true').lower() != 'true':
        return None
    return origin, host, sender, mode

def send_mail(recipient, subject, content):
    settings = mail_settings()
    if not settings:
        raise RuntimeError('Email delivery is not configured')
    _, host, sender, mode = settings
    message = EmailMessage()
    message['From'] = formataddr((os.getenv('SMTP_FROM_NAME', 'VISTRAH'), sender))
    message['To'] = recipient
    message['Subject'] = subject
    message.set_content(content)
    if subject == 'Reset your VISTRAH password':
        from html import escape
        link = next(line for line in content.splitlines() if '/reset-password#token=' in line)
        message.add_alternative('<!doctype html><html><body style="margin:0;background:#f4f7f5;font-family:Arial,sans-serif;color:#153c2e">'
            '<div style="max-width:560px;margin:32px auto;padding:32px;background:white;border-radius:12px">'
            '<p style="font-size:24px;font-weight:bold">VISTRAH</p><h1 style="font-size:26px">Reset your password</h1>'
            '<p>We received a request to reset your VISTRAH password.</p>'
            f'<p style="margin:28px 0"><a href="{escape(link, quote=True)}" style="background:#153c2e;color:white;padding:14px 22px;border-radius:6px;text-decoration:none">Reset password</a></p>'
            '<p>This secure link expires in <strong>15 minutes</strong> and can be used once.</p>'
            '<p>If you did not request this, ignore this email. Your password has not changed.</p>'
            '<p>For your privacy, VISTRAH will never ask you to send your password by email.</p>'
            '</div></body></html>', subtype='html')
    port = int(os.getenv('SMTP_PORT', '465' if mode == 'ssl' else '587'))
    context = ssl.create_default_context()
    smtp_type = smtplib.SMTP_SSL if mode == 'ssl' else smtplib.SMTP
    options = {'context': context} if mode == 'ssl' else {}
    with smtp_type(host, port, timeout=10, **options) as smtp:
        if mode == 'starttls':
            smtp.starttls(context=context)
        username = os.getenv('SMTP_USERNAME', '')
        smtp.login(username, os.getenv('SMTP_PASSWORD', ''))
        if smtp.send_message(message):
            raise RuntimeError('SMTP did not accept every recipient')

def deliver_reset(email, token):
    try:
        origin = mail_settings()[0]
        send_mail(email, 'Reset your VISTRAH password',
            'Use this single-use link within 15 minutes to reset your password:\n\n'
            f'{origin}/reset-password#token={token}\n\n'
            'If you did not request this, you can ignore this email. Your password has not changed.')
        logger.info('Password recovery email accepted by SMTP server.')
    except Exception:
        # SMTP exception strings may include recipients/credentials. Never log them.
        logger.warning('Password recovery email delivery failed; check SMTP configuration.')

def issue_and_deliver_reset(email):
    # Account lookup and token insertion occur after the generic response, so
    # neither database writes nor SMTP latency reveal whether an email exists.
    try:
        token = secrets.token_urlsafe(32)
        with SessionLocal() as db:
            user = db.scalar(select(User).where(User.email == email))
            if not user:
                return
            db.add(PasswordReset(token_hash=hashlib.sha256(token.encode()).hexdigest(),
                user_id=user.id, expires_at=now() + timedelta(minutes=15)))
            db.commit()
        deliver_reset(email, token)
    except Exception:
        logger.warning('Password recovery request processing failed; check local service health.')

def deliver_confirmation(email):
    try:
        send_mail(email, 'Your VISTRAH password was changed',
            'Your password has been reset and all existing sign-in sessions revoked. '
            'If you did not make this change, contact your administrator immediately.')
    except Exception:
        logger.warning('Password change notification delivery failed; check SMTP configuration.')

@router.get('/recovery-status')
def recovery_status():
    if os.getenv('APP_ENV', 'production') != 'development':
        raise HTTPException(404, 'Not found')
    return {'configured': mail_settings() is not None}

def throttled(db, scope, value, limit):
    key = hashlib.sha256(f'recovery:{scope}:{value}'.encode()).hexdigest()
    if db.bind.dialect.name == 'postgresql':
        db.execute(text('SELECT pg_advisory_xact_lock(:key)'), {'key': int(key[:15], 16)})
    count = db.scalar(select(func.count()).select_from(LoginAttempt).where(
        LoginAttempt.key == key, LoginAttempt.created_at > now() - timedelta(minutes=15)))
    if count >= limit:
        return True
    db.add(LoginAttempt(key=key))
    db.flush()
    return False

@router.post('/forgot-password')
def forgot_password(data: ForgotPassword, request: Request, tasks: BackgroundTasks, db: Session = Depends(get_db)):
    email = str(data.email).lower()
    ip = request.client.host if request.client else 'unknown'
    ip_blocked = throttled(db, 'request-ip', ip, 60)
    email_blocked = throttled(db, 'request-email', email, 3)
    if not ip_blocked and not email_blocked and mail_settings():
        tasks.add_task(issue_and_deliver_reset, email)
    db.commit()
    return {'message': CONFIRMATION}

@router.post('/reset-password')
def reset_password(data: ResetPassword, request: Request, tasks: BackgroundTasks, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else 'unknown'
    if throttled(db, 'redeem-ip', ip, 20):
        db.commit()
        raise HTTPException(429, 'Too many attempts. Please try again in 15 minutes.')
    db.commit()
    token_hash = hashlib.sha256(data.token.encode()).hexdigest()
    candidate = db.get(PasswordReset, token_hash)
    if not candidate:
        raise HTTPException(400, 'This reset link is invalid or has already been used. Request a new link.')
    # Serialize all resets for this user, including two different valid tokens.
    user = db.scalar(select(User).where(User.id == candidate.user_id).with_for_update())
    reset = db.scalar(select(PasswordReset).where(PasswordReset.token_hash == token_hash)
        .with_for_update().execution_options(populate_existing=True))
    if not user or not reset or reset.used:
        raise HTTPException(400, 'This reset link is invalid or has already been used. Request a new link.')
    if aware(reset.expires_at) <= now():
        raise HTTPException(400, 'This reset link has expired. Request a new link.')
    user.password_hash = passwords.hash(data.new_password)
    db.execute(update(PasswordReset).where(PasswordReset.user_id == user.id).values(used=True))
    db.execute(update(AuthSession).where(AuthSession.user_id == user.id).values(revoked=True))
    db.commit()
    tasks.add_task(deliver_confirmation, user.email)
    return {'message': 'Your password has been reset. Sign in with your new password.'}
