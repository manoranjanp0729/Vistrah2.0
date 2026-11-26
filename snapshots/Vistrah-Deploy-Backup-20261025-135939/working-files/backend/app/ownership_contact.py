"""Private business email control, bound to a claim and the stored business channel."""
import hashlib
import secrets
from datetime import timedelta

from fastapi import HTTPException
from sqlalchemy import select, update

from .models import Provider, now
from .payments import aware
from .provider_models import ProviderOwnershipContactChallenge as Challenge
from .recovery import mail_settings, send_mail, throttled

CHALLENGE_LIFETIME = timedelta(minutes=15)
VERIFICATION_LIFETIME = timedelta(hours=24)


def canonical_email(value):
    return (value or '').strip().lower()


def matches_business_contact(db, claim):
    provider = db.get(Provider, claim.provider_id)
    return bool(provider and claim.contact_channel == 'EMAIL' and claim.contact_value and
                canonical_email(claim.contact_value) == canonical_email(provider.email))


def verified(db, claim):
    if not matches_business_contact(db, claim):
        return False
    return db.scalar(select(Challenge.id).where(
        Challenge.claim_id == claim.id, Challenge.invalidated.is_(False),
        Challenge.contact_value == canonical_email(claim.contact_value),
        Challenge.verified_at > now() - VERIFICATION_LIFETIME)) is not None


def invalidate(db, claim):
    db.execute(update(Challenge).where(Challenge.claim_id == claim.id).values(invalidated=True))


def rate_limit(db, user, request, operation):
    ip = request.client.host if request.client else 'unknown'
    # Always persist attempts, including unsuccessful redemption and mail failures.
    user_blocked = throttled(db, f'claim-{operation}-user', str(user.id), 3 if operation == 'send' else 20)
    ip_blocked = throttled(db, f'claim-{operation}-ip', ip, 30 if operation == 'send' else 60)
    if user_blocked or ip_blocked:
        db.commit()
        raise HTTPException(429, 'Too many contact verification attempts. Try again in 15 minutes.')


def issue(db, claim, user, request, event):
    rate_limit(db, user, request, 'send')
    if not matches_business_contact(db, claim):
        db.commit()
        raise HTTPException(409, 'Email verification requires the stored business email. Phone verification is unavailable.')
    if not mail_settings():
        db.commit()
        raise HTTPException(503, 'Business email verification delivery is not configured.')
    # Serialize sends to the same recipient across different claimants on PostgreSQL.
    if throttled(db, 'claim-send-contact', canonical_email(claim.contact_value), 3):
        db.commit()
        raise HTTPException(429, 'Too many verification emails. Try again in 15 minutes.')
    invalidate(db, claim)
    token = secrets.token_urlsafe(32)
    challenge = Challenge(id=secrets.token_hex(16), claim_id=claim.id,
        token_hash=hashlib.sha256(token.encode()).hexdigest(),
        contact_value=canonical_email(claim.contact_value), expires_at=now() + CHALLENGE_LIFETIME)
    db.add(challenge)
    db.flush()
    # SMTP is bounded and runs while the claim lock is held. A failed send cannot
    # create verified state; tokens never appear in responses, URLs or logs.
    try:
        send_mail(challenge.contact_value, 'Verify your VISTRAH business contact',
            f'A contact verification was requested for business #{claim.provider_id}, claim {claim.id}.\n'
            'While signed in as the claimant, enter this single-use code in Legacy business ownership within 15 minutes:\n\n'
            f'{token}\n\nDo not share this code. If you did not request this claim, ignore this email. '
            'Verifying contact control does not approve business ownership; independent evidence review is required.')
    except Exception:
        challenge.invalidated = True
        db.commit()
        raise HTTPException(503, 'Verification email delivery failed. Please try again later.') from None
    event(db, claim, user, 'CONTACT_CHALLENGE_SENT')
    db.commit()
    return {'message': 'Verification code sent to the stored business email. It expires in 15 minutes.'}


def redeem(db, claim, token, user, request, event):
    rate_limit(db, user, request, 'verify')
    challenge = db.scalar(select(Challenge).where(
        Challenge.claim_id == claim.id, Challenge.invalidated.is_(False))
        .order_by(Challenge.created_at.desc()).with_for_update())
    valid = bool(challenge and not challenge.verified_at and challenge.attempts < 5 and
                 aware(challenge.expires_at) > now() and matches_business_contact(db, claim) and
                 challenge.contact_value == canonical_email(claim.contact_value))
    if valid:
        challenge.attempts += 1
        valid = secrets.compare_digest(challenge.token_hash, hashlib.sha256(token.encode()).hexdigest())
    if not valid:
        db.commit()
        raise HTTPException(400, 'Verification code is invalid, expired or used. Request a new code if needed.')
    challenge.verified_at = now()
    event(db, claim, user, 'CONTACT_VERIFIED')
    db.commit()
