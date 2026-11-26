import json
import uuid
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.auth import bearer_scheme, get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.domain.membership.repository import get_user_membership, list_active_plans, list_user_membership_transactions
from app.domain.membership.service import create_membership_checkout
from app.domain.payments.allocation import create_allocation_snapshot
from app.domain.payments.gateway import get_payment_gateway
from app.domain.payments.service import PaymentService
from app.domain.membership.schemas import MembershipCheckoutRequest

router = APIRouter()


@router.get("/membership/plans")
def membership_plans(db: Session = Depends(get_db)):
    return [dict(row) for row in list_active_plans(db)]


@router.get("/membership/offers")
def membership_offers(
    category_slug: str | None = Query(default=None),
    subcategory_slug: str | None = Query(default=None),
    service_slug: str | None = Query(default=None),
    provider_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    now_offers = db.execute(text("""
        SELECT id,name,description,category_slug,subcategory_slug,service_slug,provider_id,
               benefit_type,benefit_value,currency,starts_at,ends_at,terms
        FROM membership_offers
        WHERE active=TRUE AND starts_at <= NOW() AND (ends_at IS NULL OR ends_at > NOW())
          AND (category_slug IS NULL OR category_slug=:category)
          AND (subcategory_slug IS NULL OR subcategory_slug=:subcategory)
          AND (service_slug IS NULL OR service_slug=:service)
          AND (provider_id IS NULL OR provider_id=:provider)
        ORDER BY starts_at DESC,created_at DESC
    """), {"category": category_slug, "subcategory": subcategory_slug,
           "service": service_slug, "provider": provider_id}).mappings().all()
    return [dict(row) for row in now_offers]


@router.get("/membership/me")
def my_membership(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    membership = get_user_membership(db, str(current_user["id"]))
    return {
        "membership": dict(membership) if membership else None,
        "transactions": [dict(row) for row in list_user_membership_transactions(db, str(current_user["id"]))],
    }


@router.post("/membership/checkout")
def membership_checkout(
    payload: MembershipCheckoutRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    key = idempotency_key or str(uuid.uuid4())
    return create_membership_checkout(db, current_user, payload.plan_slug, key)


@router.post("/membership/me/cancel")
def cancel_membership(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    membership = db.execute(text("""
        SELECT * FROM memberships WHERE user_id=:user AND status='ACTIVE' ORDER BY created_at DESC LIMIT 1 FOR UPDATE
    """), {"user": str(current_user["id"])}).mappings().first()
    if not membership:
        raise HTTPException(status_code=404, detail="Active membership not found")
    try:
        payment_service = PaymentService()
        payment_service.cancel_subscription(membership["gateway_subscription_reference"])
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    event = {"id": f"sbx_evt_{uuid.uuid4().hex}", "type": "subscription.cancelled",
             "data": {"membership_id": str(membership["id"]),
                      "subscription_reference": membership["gateway_subscription_reference"]}}
    raw_body, signature = payment_service.sign_sandbox_event(event)
    if not payment_service.verify_webhook(raw_body, signature):
        raise HTTPException(status_code=500, detail="Sandbox webhook signing failed")
    result = payment_service.process_webhook(db, event)
    return {**result, "status": "CANCELLED", "membership_id": str(membership["id"])}


@router.post("/sandbox/memberships/{membership_id}/renewal")
def sandbox_create_renewal(
    membership_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    if settings.payments_mode.lower() != "sandbox":
        raise HTTPException(status_code=404, detail="Sandbox payment tools are disabled")
    membership = db.execute(text("""
        SELECT m.*,p.slug AS plan_slug,p.amount_paise,p.currency
        FROM memberships m JOIN subscription_plans p ON p.id=m.plan_id
        WHERE m.id=:id AND m.user_id=:user AND m.status='ACTIVE' FOR UPDATE
    """), {"id": membership_id, "user": str(current_user["id"])}).mappings().first()
    if not membership:
        raise HTTPException(status_code=404, detail="Active membership not found")
    key = idempotency_key or f"renewal:{membership_id}:{uuid.uuid4()}"
    prior = db.execute(text("SELECT * FROM payment_transactions WHERE user_id=:user AND idempotency_key=:key"),
                       {"user": str(current_user["id"]), "key": key}).mappings().first()
    if prior:
        return {"transaction_id": str(prior["id"]), "status": prior["status"], "amount_paise": prior["amount_paise"]}
    amount = int(membership["amount_paise"])
    rule_id, snapshot = create_allocation_snapshot(db, transaction_type="MEMBERSHIP", amount_paise=amount)
    tx_id = str(uuid.uuid4())
    number = f"VPM-{uuid.uuid4().hex[:12].upper()}"
    checkout = PaymentService().create_checkout(tx_id, str(current_user["id"]), amount, membership["currency"])
    db.execute(text("""
        INSERT INTO payment_transactions
            (id,transaction_number,user_id,transaction_type,plan_id,membership_id,amount_paise,currency,
             status,gateway,idempotency_key,gateway_order_reference,gateway_subscription_reference,
             settlement_rule_id,allocation_snapshot,metadata)
        VALUES (:id,:number,:user,'MEMBERSHIP',:plan,:membership,:amount,:currency,'PENDING','SANDBOX',
                :key,:order,:subscription,:rule,CAST(:snapshot AS JSONB),CAST(:metadata AS JSONB))
    """), {"id": tx_id, "number": number, "user": str(current_user["id"]),
           "plan": membership["plan_id"], "membership": membership_id,
           "amount": amount, "currency": membership["currency"], "key": key,
           "order": checkout.order_reference,
           "subscription": membership["gateway_subscription_reference"],
           "rule": rule_id, "snapshot": json.dumps(snapshot),
           "metadata": json.dumps({"checkout_url": checkout.checkout_url, "mode": "SANDBOX"})})
    db.execute(text("""
        INSERT INTO membership_transactions(membership_id,payment_transaction_id,transaction_kind)
        VALUES (:membership,:transaction,'RENEWAL')
    """), {"membership": membership_id, "transaction": tx_id})
    db.commit()
    return {"transaction_id": tx_id, "transaction_number": number, "amount_paise": amount,
            "currency": membership["currency"], "status": "PENDING", "checkout_url": checkout.checkout_url,
            "sandbox": True}


@router.post("/sandbox/payments/{transaction_id}/complete")
async def sandbox_complete_payment(
    transaction_id: str,
    request: Request,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if settings.payments_mode.lower() != "sandbox":
        raise HTTPException(status_code=404, detail="Sandbox payment tools are disabled")
    payload = await request.json()
    outcome = payload.get("outcome") if isinstance(payload, dict) else None
    if outcome not in ("success", "failure"):
        raise HTTPException(status_code=422, detail="Outcome must be success or failure")
    transaction = db.execute(text("""
        SELECT * FROM payment_transactions WHERE id=:id AND user_id=:user
    """), {"id": transaction_id, "user": str(current_user["id"])}).mappings().first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Payment transaction not found")
    if transaction["status"] != "PENDING":
        raise HTTPException(status_code=409, detail="Payment transaction is no longer pending")
    event = {
        "id": f"sbx_evt_{uuid.uuid4().hex}",
        "type": "payment.succeeded" if outcome == "success" else "payment.failed",
        "data": {
            "transaction_id": transaction_id,
            "amount_paise": transaction["amount_paise"],
            "currency": transaction["currency"],
            "gateway_payment_reference": f"sbx_payment_{uuid.uuid4().hex}" if outcome == "success" else None,
        },
    }
    payment_service = PaymentService()
    raw_body, signature = payment_service.sign_sandbox_event(event)
    if not payment_service.verify_webhook(raw_body, signature):
        raise HTTPException(status_code=500, detail="Sandbox webhook signing failed")
    result = payment_service.process_webhook(db, event)
    return {**result, "transaction_id": transaction_id}


@router.post("/webhooks/{gateway_name}")
async def payment_webhook(gateway_name: str, request: Request, db: Session = Depends(get_db)):
    try:
        payment_service = PaymentService(get_payment_gateway(gateway_name))
    except RuntimeError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    raw_body = await request.body()
    if len(raw_body) > 262144:
        raise HTTPException(status_code=413, detail="Webhook payload is too large")
    signature = request.headers.get("X-Payment-Signature", "")
    if not payment_service.verify_webhook(raw_body, signature):
        raise HTTPException(status_code=401, detail="Invalid payment webhook signature")
    try:
        event = json.loads(raw_body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(status_code=400, detail="Webhook body must be valid JSON")
    if not isinstance(event, dict):
        raise HTTPException(status_code=400, detail="Webhook event must be an object")
    return payment_service.process_webhook(db, event)
