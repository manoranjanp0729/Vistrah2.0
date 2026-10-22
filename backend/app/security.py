import hashlib
import secrets
import os
from datetime import timedelta
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pwdlib import PasswordHash
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from .config import JWT_SECRET
from .database import get_db
from .models import User, AuthSession, Membership, Payment, Plan, WebhookEvent, Allocation, now

passwords = PasswordHash.recommended()
bearer = HTTPBearer(auto_error=False)
DUMMY_HASH = passwords.hash(secrets.token_urlsafe(32))

def issue_token(db, user):
    sid = secrets.token_hex(32)
    expiry = now() + timedelta(hours=12)
    db.add(AuthSession(id=hashlib.sha256(sid.encode()).hexdigest(), user_id=user.id, expires_at=expiry))
    db.commit()
    return jwt.encode({'sub': str(user.id), 'sid': sid, 'exp': expiry, 'iat': now(), 'iss': 'vistrah', 'aud': 'vistrah-api'}, JWT_SECRET, algorithm='HS256')

def token_session(db, token):
    try:
        if len(token) > 4096:
            raise ValueError('token too large')
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'], issuer='vistrah', audience='vistrah-api', options={'require': ['sub','sid','exp','iat']})
        session = db.get(AuthSession, hashlib.sha256(payload['sid'].encode()).hexdigest())
        user = db.get(User, int(payload['sub']))
        if not session or session.revoked or not user or session.user_id != user.id:
            raise ValueError('invalid session')
        return user, session
    except (jwt.InvalidTokenError, ValueError, KeyError, TypeError):
        raise HTTPException(401, 'Please sign in again')

def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)):
    if not credentials:
        raise HTTPException(401, 'Please sign in to continue')
    return token_session(db, credentials.credentials)[0]

def admin_user(user: User = Depends(current_user)):
    if user.role != 'ADMIN':
        raise HTTPException(403, 'Administrator access required')
    return user

def seller_user(user: User = Depends(current_user)):
    if not user.seller_enabled and user.role != 'ADMIN':
        raise HTTPException(403, 'Enable seller access using your existing account first')
    return user


def eligible_memberships(db, user):
    """Existing sandbox terms qualify only in explicitly configured development.

    No real-payment mode exists yet. Missing/unknown/production environments fail
    closed. Do not infer entitlement from a role, client outcome or dates alone.
    """
    if os.getenv('APP_ENV', 'production') != 'development':
        return []
    credit = select(func.sum(Allocation.amount)).where(Allocation.payment_id == Payment.id).correlate(Payment).scalar_subquery()
    confirmed = select(WebhookEvent.id).where(WebhookEvent.payment_id == Payment.id).exists()
    return list(db.scalars(
        select(Membership).join(Payment, Membership.payment_id == Payment.id).join(Plan, Payment.plan_id == Plan.id).where(
            Membership.user_id == user.id, Payment.user_id == user.id,
            Membership.revoked.is_(False), Membership.starts_at <= now(), Membership.expires_at > now(),
            Payment.status == 'SUCCEEDED', Payment.mode == 'SANDBOX',
            Plan.name == 'VISTRAH Membership', confirmed, credit == Payment.amount,
        ).order_by(Membership.expires_at.desc())
    ))


def member_user(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not eligible_memberships(db, user):
        raise HTTPException(403, 'Eligible active membership is required. Sandbox access is available only in development; real paid access is not configured.')
    return user
