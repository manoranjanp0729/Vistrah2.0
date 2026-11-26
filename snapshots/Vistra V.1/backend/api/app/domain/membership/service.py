import json
import uuid
from typing import Any

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.domain.membership.repository import get_user_membership
from app.domain.payments.allocation import create_allocation_snapshot
from app.domain.payments.service import PaymentService


def _checkout_result(transaction: Any, metadata: Any | None = None) -> dict[str, Any]:
    details = metadata or transaction.get("metadata") or {}
    return {
        "transaction_id": str(transaction["id"]),
        "transaction_number": transaction["transaction_number"],
        "amount_paise": transaction["amount_paise"],
        "currency": transaction["currency"],
        "status": transaction["status"],
        "checkout_url": details.get("checkout_url"),
        "sandbox": True,
    }


def create_membership_checkout(db: Session, user: dict[str, Any], plan_slug: str, idempotency_key: str) -> dict[str, Any]:
    user_id = str(user["id"])
    prior = db.execute(text("""
        SELECT * FROM payment_transactions WHERE user_id=:user AND idempotency_key=:key
    """), {"user": user_id, "key": idempotency_key}).mappings().first()
    if prior:
        return _checkout_result(prior)

    plan = db.execute(text("""
        SELECT * FROM subscription_plans WHERE slug=:slug AND status='ACTIVE'
    """), {"slug": plan_slug}).mappings().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Active membership plan not found")

    membership = get_user_membership(db, user_id)
    if membership and membership["status"] == "ACTIVE":
        raise HTTPException(status_code=409, detail="An active membership already exists")
    if membership and membership["status"] == "PENDING":
        raise HTTPException(status_code=409, detail="A membership checkout is already pending")
    if membership and membership["status"] == "SUSPENDED":
        raise HTTPException(status_code=409, detail="Membership is suspended; contact support")
    if membership and membership["status"] == "CANCELLED" and membership["plan_id"] != plan["id"]:
        membership = None

    if membership and membership["status"] == "PAYMENT_FAILED":
        membership_id = str(membership["id"])
        gateway_subscription = membership["gateway_subscription_reference"]
    else:
        membership_id = str(uuid.uuid4())
        gateway_subscription = None
        db.execute(text("""
            INSERT INTO memberships(id,user_id,plan_id,status,gateway)
            VALUES (:id,:user,:plan,'PENDING','SANDBOX')
        """), {"id": membership_id, "user": user_id, "plan": plan["id"]})

    amount = int(plan["amount_paise"])
    rule_id, snapshot = create_allocation_snapshot(
        db, transaction_type="MEMBERSHIP", amount_paise=amount,
    )
    transaction_id = str(uuid.uuid4())
    transaction_number = f"VPM-{uuid.uuid4().hex[:12].upper()}"
    payment_service = PaymentService()
    customer_reference, new_subscription_ref = payment_service.create_subscription(user_id, plan_slug)
    gateway_subscription = gateway_subscription or new_subscription_ref
    checkout = payment_service.create_checkout(transaction_id, user_id, amount, plan["currency"])
    checkout_details = {"checkout_url": checkout.checkout_url, "mode": "SANDBOX"}

    db.execute(text("""
        UPDATE memberships SET plan_id=:plan,gateway='SANDBOX',gateway_customer_reference=:customer,
            gateway_subscription_reference=:subscription,status='PENDING',cancellation_date=NULL,
            cancel_at_period_end=FALSE,updated_at=NOW() WHERE id=:membership
    """), {"plan": plan["id"], "customer": customer_reference,
           "subscription": gateway_subscription, "membership": membership_id})
    db.execute(text("""
        INSERT INTO payment_transactions
            (id,transaction_number,user_id,transaction_type,plan_id,membership_id,amount_paise,currency,
             status,gateway,idempotency_key,gateway_order_reference,gateway_subscription_reference,
             settlement_rule_id,allocation_snapshot,metadata)
        VALUES (:id,:number,:user,'MEMBERSHIP',:plan,:membership,:amount,:currency,'PENDING','SANDBOX',
                :idempotency,:order,:subscription,:rule,CAST(:snapshot AS JSONB),CAST(:metadata AS JSONB))
    """), {"id": transaction_id, "number": transaction_number, "user": user_id,
           "plan": plan["id"], "membership": membership_id, "amount": amount,
           "currency": plan["currency"], "idempotency": idempotency_key,
           "order": checkout.order_reference, "subscription": gateway_subscription,
           "rule": rule_id, "snapshot": json.dumps(snapshot), "metadata": json.dumps(checkout_details)})
    db.execute(text("""
        INSERT INTO membership_transactions(membership_id,payment_transaction_id,transaction_kind)
        VALUES (:membership,:transaction,'INITIAL')
    """), {"membership": membership_id, "transaction": transaction_id})
    db.commit()
    return {
        "transaction_id": transaction_id,
        "transaction_number": transaction_number,
        "membership_id": membership_id,
        "amount_paise": amount,
        "currency": plan["currency"],
        "status": "PENDING",
        "checkout_url": checkout.checkout_url,
        "sandbox": True,
    }


def create_service_checkout(db: Session, user: dict[str, Any], application_id: str, idempotency_key: str) -> dict[str, Any]:
    user_id = str(user["id"])
    prior = db.execute(text("""
        SELECT * FROM payment_transactions WHERE user_id=:user AND idempotency_key=:key
    """), {"user": user_id, "key": idempotency_key}).mappings().first()
    if prior:
        return _checkout_result(prior)

    application = db.execute(text("""
        SELECT a.id,a.user_id,a.status,a.final_amount_paise,c.slug AS category_slug,s.slug AS service_slug
        FROM applications a JOIN services s ON s.id=a.service_id JOIN categories c ON c.id=s.category_id
        WHERE a.id=:application
    """), {"application": application_id}).mappings().first()
    if not application or str(application["user_id"]) != user_id:
        raise HTTPException(status_code=404, detail="Application not found")
    if not application["final_amount_paise"] or application["final_amount_paise"] <= 0:
        raise HTTPException(status_code=409, detail="This service request does not have an approved payable amount")
    if application["status"] not in {"APPROVED", "QUOTED", "PAYMENT_DUE", "IN_PROGRESS"}:
        raise HTTPException(status_code=409, detail="This service request is not ready for payment")

    amount = int(application["final_amount_paise"])
    rule_id, snapshot = create_allocation_snapshot(
        db, transaction_type="SERVICE", amount_paise=amount,
        category_slug=application["category_slug"], service_slug=application["service_slug"],
    )
    transaction_id = str(uuid.uuid4())
    transaction_number = f"VST-{uuid.uuid4().hex[:12].upper()}"
    checkout = PaymentService().create_checkout(transaction_id, user_id, amount, "INR")
    db.execute(text("""
        INSERT INTO payment_transactions
            (id,transaction_number,user_id,transaction_type,application_id,category_slug,service_slug,
             amount_paise,currency,status,gateway,idempotency_key,gateway_order_reference,
             settlement_rule_id,allocation_snapshot,metadata)
        VALUES (:id,:number,:user,'SERVICE',:application,:category,:service,:amount,'INR','PENDING',
                'SANDBOX',:idempotency,:order,:rule,CAST(:snapshot AS JSONB),CAST(:metadata AS JSONB))
    """), {"id": transaction_id, "number": transaction_number, "user": user_id,
           "application": application_id, "category": application["category_slug"],
           "service": application["service_slug"], "amount": amount,
           "idempotency": idempotency_key, "order": checkout.order_reference,
           "rule": rule_id, "snapshot": json.dumps(snapshot),
           "metadata": json.dumps({"checkout_url": checkout.checkout_url, "mode": "SANDBOX"})})
    db.commit()
    return {"transaction_id": transaction_id, "transaction_number": transaction_number,
            "amount_paise": amount, "currency": "INR", "status": "PENDING",
            "checkout_url": checkout.checkout_url, "sandbox": True}
