"""Sandbox-only gateway and transactional payment ledger."""
import hashlib
import hmac
import json
import time
import uuid
from datetime import timedelta, timezone
from typing import Protocol
from fastapi import HTTPException
from sqlalchemy import select, func
from .config import WEBHOOK_SECRET
from .models import Payment, Plan, Membership, WebhookEvent, Allocation, Refund, Reconciliation, User, now
from .schemas import PaymentEvent

def aware(value):
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value

class PaymentGatewayAdapter(Protocol):
    def event(self, payment: Payment, status: str) -> tuple[bytes, str]: ...
    def verify(self, payload: bytes, signature: str) -> bool: ...

class SandboxGatewayAdapter:
    def event(self, payment, status):
        body = json.dumps({'event_id': f'sandbox-{payment.id}-{status}', 'payment_id': payment.id, 'amount': payment.amount, 'currency': payment.currency, 'status': status, 'timestamp': int(time.time())}, separators=(',', ':')).encode()
        return body, hmac.new(WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()

    def verify(self, payload, signature):
        expected = hmac.new(WEBHOOK_SECRET.encode(), payload, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)

class PaymentService:
    def __init__(self, adapter: PaymentGatewayAdapter):
        self.adapter = adapter

    def checkout(self, db, user, key):
        # Serialize checkouts for one customer. UNIQUE also protects racing retries.
        db.scalar(select(User).where(User.id == user.id).with_for_update())
        existing = db.scalar(select(Payment).where(Payment.user_id == user.id, Payment.idempotency_key == key))
        if existing:
            return existing
        plan = db.scalar(select(Plan).where(Plan.name == 'VISTRAH Membership'))
        if not plan:
            raise HTTPException(503, 'Membership plan is not configured')
        payment = Payment(id=str(uuid.uuid4()), user_id=user.id, plan_id=plan.id, amount=plan.amount, currency=plan.currency, idempotency_key=key)
        db.add(payment)
        db.commit()
        return payment

    def process_webhook(self, db, payload, signature):
        if not self.adapter.verify(payload, signature):
            raise HTTPException(401, 'Invalid webhook signature')
        try:
            event = PaymentEvent.model_validate_json(payload)
        except ValueError:
            raise HTTPException(422, 'Malformed payment event')
        if abs(time.time() - event.timestamp) > 300:
            raise HTTPException(400, 'Webhook timestamp is outside the allowed window')
        payment = db.scalar(select(Payment).where(Payment.id == event.payment_id).with_for_update())
        if not payment:
            raise HTTPException(404, 'Payment not found')
        # Use business fields rather than delivery timestamp for stable retry identity.
        digest = hashlib.sha256(json.dumps(event.model_dump(exclude={'timestamp'}), sort_keys=True).encode()).hexdigest()
        prior = db.get(WebhookEvent, event.event_id)
        if prior:
            if prior.payload_hash != digest:
                raise HTTPException(409, 'Event ID was reused with a different payload')
            return payment
        if payment.amount != event.amount or payment.currency != event.currency or payment.mode != 'SANDBOX':
            raise HTTPException(400, 'Payment amount, currency or mode mismatch')
        if payment.status != 'PENDING':
            raise HTTPException(409, 'Payment is already finalized')
        payment.status = event.status
        db.add(WebhookEvent(id=event.event_id, payment_id=payment.id, payload_hash=digest))
        if event.status == 'SUCCEEDED':
            db.scalar(select(User).where(User.id == payment.user_id).with_for_update())
            db.add(Allocation(payment_id=payment.id, amount=payment.amount, kind='CREDIT'))
            plan = db.get(Plan, payment.plan_id)
            expiry = db.scalar(select(func.max(Membership.expires_at)).where(Membership.user_id == payment.user_id, Membership.revoked.is_(False)))
            start = max(now(), aware(expiry)) if expiry else now()
            db.add(Membership(user_id=payment.user_id, payment_id=payment.id, starts_at=start, expires_at=start + timedelta(days=plan.days)))
        db.commit()
        return payment

    def refund(self, db, payment_id, reason):
        payment = db.scalar(select(Payment).where(Payment.id == payment_id).with_for_update())
        if not payment:
            raise HTTPException(404, 'Payment not found')
        existing = db.scalar(select(Refund).where(Refund.payment_id == payment_id))
        if existing:
            return existing
        if payment.status != 'SUCCEEDED':
            raise HTTPException(409, 'Only successful sandbox payments can be refunded')
        payment.status = 'REFUNDED'
        refund = Refund(id=str(uuid.uuid4()), payment_id=payment.id, amount=payment.amount, reason=reason)
        db.add(refund)
        db.add(Allocation(payment_id=payment.id, amount=-payment.amount, kind='REVERSAL'))
        membership = db.scalar(select(Membership).where(Membership.payment_id == payment.id))
        if membership:
            membership.revoked = True
        db.flush()
        return refund

    def reconcile(self, db):
        results = []
        for payment in db.scalars(select(Payment).order_by(Payment.created_at)).all():
            actual = db.scalar(select(func.coalesce(func.sum(Allocation.amount), 0)).where(Allocation.payment_id == payment.id))
            expected = payment.amount if payment.status == 'SUCCEEDED' else 0
            record = Reconciliation(payment_id=payment.id, balanced=expected == actual, expected=expected, actual=actual)
            db.add(record)
            results.append(record)
        db.flush()
        return results

payments = PaymentService(SandboxGatewayAdapter())
