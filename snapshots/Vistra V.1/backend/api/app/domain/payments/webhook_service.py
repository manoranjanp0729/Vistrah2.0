import json
import re
from typing import Any

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.domain.payments.allocation import record_transaction_allocations, reverse_allocations_for_refund
from app.domain.payments.gateway import PaymentGatewayAdapter, get_payment_gateway

_SENSITIVE_PAYLOAD_KEYS = re.compile(r"card.?number|cvv|cvc|upi.?pin|bank.?account|account.?number|password|secret|access.?token", re.I)


def _safe_payload(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): _safe_payload(item) for key, item in value.items() if not _SENSITIVE_PAYLOAD_KEYS.search(str(key))}
    if isinstance(value, list):
        return [_safe_payload(item) for item in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


def _payment_succeeded(db: Session, data: dict[str, Any], gateway: PaymentGatewayAdapter) -> None:
    transaction = db.execute(text("""
        SELECT * FROM payment_transactions WHERE id=:id FOR UPDATE
    """), {"id": data.get("transaction_id")}).mappings().first()
    if not transaction:
        raise ValueError("Payment transaction was not found")
    if data.get("amount_paise") is not None and int(data["amount_paise"]) != transaction["amount_paise"]:
        raise ValueError("Gateway payment amount does not match the VISTRAH transaction")
    if data.get("currency", transaction["currency"]) != transaction["currency"]:
        raise ValueError("Gateway payment currency does not match the VISTRAH transaction")
    if transaction["status"] in ("REFUNDED", "PARTIALLY_REFUNDED", "CANCELLED"):
        raise ValueError("Payment is not in a payable state")
    if transaction["status"] == "SUCCEEDED":
        return

    gateway_payment_id = data.get("gateway_payment_reference") or data.get("payment_reference")
    if not gateway_payment_id or not gateway.verify_payment(str(gateway_payment_id), transaction["amount_paise"], transaction["currency"]):
        raise ValueError("Gateway payment could not be verified")
    db.execute(text("""
        UPDATE payment_transactions SET status='SUCCEEDED',gateway_transaction_id=:gateway_id,
            succeeded_at=NOW(),updated_at=NOW() WHERE id=:id
    """), {"gateway_id": gateway_payment_id, "id": transaction["id"]})
    snapshot = transaction["allocation_snapshot"] or []
    if isinstance(snapshot, str):
        snapshot = json.loads(snapshot)
    record_transaction_allocations(db, str(transaction["id"]), str(transaction["settlement_rule_id"]), snapshot)

    if transaction["membership_id"]:
        link = db.execute(text("""
            SELECT transaction_kind FROM membership_transactions WHERE payment_transaction_id=:transaction
        """), {"transaction": transaction["id"]}).mappings().first()
        if link and link["transaction_kind"] == "RENEWAL":
            db.execute(text("""
                UPDATE memberships SET status='ACTIVE',renewal_date=NOW()+INTERVAL '1 month',
                    cancellation_date=NULL,cancel_at_period_end=FALSE,updated_at=NOW()
                WHERE id=:membership
            """), {"membership": transaction["membership_id"]})
        else:
            db.execute(text("""
                UPDATE memberships SET status='ACTIVE',start_date=COALESCE(start_date,NOW()),
                    renewal_date=NOW()+INTERVAL '1 month',updated_at=NOW()
                WHERE id=:membership
            """), {"membership": transaction["membership_id"]})


def _payment_failed(db: Session, data: dict[str, Any]) -> None:
    transaction = db.execute(text("""
        SELECT * FROM payment_transactions WHERE id=:id FOR UPDATE
    """), {"id": data.get("transaction_id")}).mappings().first()
    if not transaction:
        raise ValueError("Payment transaction was not found")
    if transaction["status"] == "SUCCEEDED":
        raise ValueError("A successful transaction cannot be marked failed")
    db.execute(text("UPDATE payment_transactions SET status='FAILED',updated_at=NOW() WHERE id=:id"),
               {"id": transaction["id"]})
    if transaction["membership_id"]:
        db.execute(text("UPDATE memberships SET status='PAYMENT_FAILED',updated_at=NOW() WHERE id=:id"),
                   {"id": transaction["membership_id"]})


def _refund_processed(db: Session, data: dict[str, Any], succeeded: bool) -> None:
    refund = db.execute(text("""
        SELECT * FROM payment_refunds WHERE id=:id FOR UPDATE
    """), {"id": data.get("refund_id")}).mappings().first()
    if not refund:
        raise ValueError("Refund record was not found")
    if refund["status"] in ("SUCCEEDED", "FAILED"):
        return
    if not succeeded:
        db.execute(text("""
            UPDATE payment_refunds SET status='FAILED',gateway_refund_id=COALESCE(:gateway_refund,gateway_refund_id),
                processed_at=NOW(),updated_at=NOW() WHERE id=:id
        """), {"gateway_refund": data.get("gateway_refund_reference"), "id": refund["id"]})
        return
    transaction = db.execute(text("""
        SELECT * FROM payment_transactions WHERE id=:id FOR UPDATE
    """), {"id": refund["payment_transaction_id"]}).mappings().one()
    next_refunded = transaction["refunded_amount_paise"] + refund["amount_paise"]
    if next_refunded > transaction["amount_paise"]:
        raise ValueError("Processed refunds exceed the original payment")
    reverse_allocations_for_refund(db, dict(transaction), dict(refund))
    transaction_status = "REFUNDED" if next_refunded == transaction["amount_paise"] else "PARTIALLY_REFUNDED"
    db.execute(text("""
        UPDATE payment_refunds SET status='SUCCEEDED',gateway_refund_id=COALESCE(:gateway_refund,gateway_refund_id),
            processed_at=NOW(),updated_at=NOW() WHERE id=:id
    """), {"gateway_refund": data.get("gateway_refund_reference"), "id": refund["id"]})
    db.execute(text("""
        UPDATE payment_transactions SET refunded_amount_paise=:refunded,status=:status,updated_at=NOW()
        WHERE id=:id
    """), {"refunded": next_refunded, "status": transaction_status, "id": transaction["id"]})
    if transaction["transaction_type"] == "MEMBERSHIP" and transaction_status == "REFUNDED":
        db.execute(text("""
            UPDATE memberships SET status='CANCELLED',cancellation_date=NOW(),updated_at=NOW()
            WHERE id=:id
        """), {"id": transaction["membership_id"]})


def _settlement_processed(db: Session, data: dict[str, Any], succeeded: bool) -> None:
    settlement = db.execute(text("""
        SELECT * FROM payment_settlements WHERE id=:id FOR UPDATE
    """), {"id": data.get("settlement_id")}).mappings().first()
    if not settlement:
        raise ValueError("Settlement record was not found")
    if settlement["status"] in ("COMPLETED", "FAILED"):
        return
    status = "COMPLETED" if succeeded else "FAILED"
    db.execute(text("""
        UPDATE payment_settlements SET status=:status,settled_at=CASE WHEN :success THEN NOW() ELSE NULL END,
            failure_reason=:reason,updated_at=NOW() WHERE id=:id
    """), {"status": status, "success": succeeded,
           "reason": None if succeeded else data.get("failure_reason", "Sandbox settlement failed"),
           "id": settlement["id"]})


def dispatch_event(db: Session, event: dict[str, Any], gateway: PaymentGatewayAdapter) -> None:
    event_type = str(event.get("type", ""))
    data = event.get("data") if isinstance(event.get("data"), dict) else {}
    if event_type in ("payment.succeeded", "subscription.renewed"):
        _payment_succeeded(db, data, gateway)
    elif event_type in ("payment.failed", "subscription.payment_failed"):
        _payment_failed(db, data)
    elif event_type == "subscription.activated":
        membership = db.execute(text("""
            SELECT m.id FROM memberships m JOIN membership_transactions mt ON mt.membership_id=m.id
            JOIN payment_transactions p ON p.id=mt.payment_transaction_id
            WHERE m.id=:membership AND p.status='SUCCEEDED'
            ORDER BY p.succeeded_at DESC LIMIT 1
        """), {"membership": data.get("membership_id")}).first()
        if membership:
            db.execute(text("UPDATE memberships SET status='ACTIVE',updated_at=NOW() WHERE id=:id"),
                       {"id": membership[0]})
        else:
            raise ValueError("Membership activation requires a verified successful payment")
    elif event_type == "subscription.cancelled":
        db.execute(text("""
            UPDATE memberships SET status='CANCELLED',cancellation_date=NOW(),cancel_at_period_end=FALSE,updated_at=NOW()
            WHERE id=:id
        """), {"id": data.get("membership_id")})
    elif event_type == "subscription.expired":
        db.execute(text("UPDATE memberships SET status='EXPIRED',updated_at=NOW() WHERE id=:id"),
                   {"id": data.get("membership_id")})
    elif event_type == "recipient.verified":
        recipient = db.execute(text("""
            SELECT id,gateway_account_reference FROM payment_recipients WHERE id=:id FOR UPDATE
        """), {"id": data.get("recipient_id")}).mappings().first()
        if not recipient or recipient["gateway_account_reference"] != data.get("gateway_account_reference"):
            raise ValueError("Recipient gateway reference could not be verified")
        db.execute(text("""
            UPDATE payment_recipients SET onboarding_status='VERIFIED',verification_status='VERIFIED',
                settlement_eligible=TRUE,updated_at=NOW() WHERE id=:id
        """), {"id": recipient["id"]})
    elif event_type == "recipient.onboarding_failed":
        db.execute(text("""
            UPDATE payment_recipients SET onboarding_status='REJECTED',verification_status='REJECTED',
                settlement_eligible=FALSE,updated_at=NOW() WHERE id=:id
        """), {"id": data.get("recipient_id")})
    elif event_type == "refund.succeeded":
        _refund_processed(db, data, True)
    elif event_type == "refund.failed":
        _refund_processed(db, data, False)
    elif event_type == "settlement.completed":
        _settlement_processed(db, data, True)
    elif event_type == "settlement.failed":
        _settlement_processed(db, data, False)
    else:
        raise LookupError(f"Unsupported event type: {event_type}")


def process_verified_event(db: Session, gateway: str, event: dict[str, Any]) -> dict[str, Any]:
    event_id = event.get("id")
    event_type = event.get("type")
    data = event.get("data") if isinstance(event.get("data"), dict) else {}
    if not event_id or not event_type:
        raise HTTPException(status_code=400, detail="Webhook event id and type are required")
    object_reference = (data.get("transaction_id") or data.get("refund_id") or
                        data.get("settlement_id") or data.get("membership_id"))
    inserted = db.execute(text("""
        INSERT INTO payment_webhook_events(gateway,gateway_event_id,event_type,object_reference,payload)
        VALUES (:gateway,:event_id,:event_type,:reference,CAST(:payload AS JSONB))
        ON CONFLICT (gateway,gateway_event_id) DO NOTHING RETURNING id
    """), {"gateway": gateway.upper(), "event_id": str(event_id), "event_type": str(event_type),
           "reference": str(object_reference) if object_reference else None,
           "payload": json.dumps(_safe_payload(event))}).scalar_one_or_none()
    if not inserted:
        existing = db.execute(text("""
            SELECT id,processing_status FROM payment_webhook_events
            WHERE gateway=:gateway AND gateway_event_id=:event_id FOR UPDATE
        """), {"gateway": gateway.upper(), "event_id": str(event_id)}).mappings().one()
        if existing["processing_status"] != "FAILED":
            db.commit()
            return {"accepted": True, "duplicate": True}
        inserted = existing["id"]
        db.execute(text("""
            UPDATE payment_webhook_events SET processing_status='RECEIVED',processing_error=NULL,received_at=NOW()
            WHERE id=:id
        """), {"id": inserted})

    try:
        gateway_adapter = get_payment_gateway(gateway.lower())
        with db.begin_nested():
            dispatch_event(db, event, gateway_adapter)
        db.execute(text("""
            UPDATE payment_webhook_events SET processing_status='PROCESSED',processed_at=NOW()
            WHERE id=:id
        """), {"id": inserted})
        db.commit()
        return {"accepted": True, "duplicate": False}
    except LookupError as exc:
        db.execute(text("""
            UPDATE payment_webhook_events SET processing_status='IGNORED',processing_error=:error,processed_at=NOW()
            WHERE id=:id
        """), {"error": str(exc), "id": inserted})
        db.commit()
        return {"accepted": True, "duplicate": False, "ignored": True}
    except Exception as exc:
        db.execute(text("""
            UPDATE payment_webhook_events SET processing_status='FAILED',processing_error=:error,processed_at=NOW()
            WHERE id=:id
        """), {"error": str(exc)[:500], "id": inserted})
        db.commit()
        return {"accepted": True, "duplicate": False, "processed": False, "reason": str(exc)}
