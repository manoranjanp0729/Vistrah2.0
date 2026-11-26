import json
import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.auth import require_admin
from app.core.config import settings
from app.core.database import get_db
from app.domain.payments.service import PaymentService
from app.domain.membership.schemas import (
    MembershipPlanCreate, MembershipPlanUpdate, OfferCreate, OfferUpdate,
    RecipientCreate, RecipientUpdate, RefundRequest,
    SettlementRuleCreate,
)

router = APIRouter(prefix="/admin", tags=["admin"])


def _json_row(row):
    return dict(row) if row else None


@router.get("/membership/plans")
def admin_list_plans(_admin=Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT * FROM subscription_plans ORDER BY created_at DESC")).mappings().all()
    return [dict(row) for row in rows]


@router.post("/membership/plans", status_code=201)
def admin_create_plan(payload: MembershipPlanCreate, admin=Depends(require_admin), db: Session = Depends(get_db)):
    row = db.execute(text("""
        INSERT INTO subscription_plans(slug,name,description,amount_paise,billing_interval,status)
        VALUES (:slug,:name,:description,:amount,:interval,:status) RETURNING *
    """), {"slug": payload.slug, "name": payload.name, "description": payload.description,
           "amount": payload.amount_paise, "interval": payload.billing_interval,
           "status": payload.status}).mappings().one()
    db.commit()
    return dict(row)


@router.patch("/membership/plans/{plan_id}")
def admin_update_plan(plan_id: str, payload: MembershipPlanUpdate, _admin=Depends(require_admin), db: Session = Depends(get_db)):
    values = payload.model_dump(exclude_unset=True)
    if not values:
        raise HTTPException(status_code=422, detail="At least one plan field is required")
    row = db.execute(text("""
        UPDATE subscription_plans SET name=COALESCE(:name,name),description=COALESCE(:description,description),
            amount_paise=COALESCE(:amount,amount_paise),status=COALESCE(:status,status),updated_at=NOW()
        WHERE id=:id RETURNING *
    """), {"id": plan_id, "name": values.get("name"), "description": values.get("description"),
           "amount": values.get("amount_paise"), "status": values.get("status")}).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Membership plan not found")
    db.commit()
    return dict(row)


@router.get("/membership/members")
def admin_list_memberships(status: str | None = None, _admin=Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT m.id,m.status,m.start_date,m.renewal_date,m.cancellation_date,m.cancel_at_period_end,
               m.gateway_customer_reference,m.gateway_subscription_reference,m.created_at,m.updated_at,
               u.id AS user_id,u.email,u.full_name,p.id AS plan_id,p.slug AS plan_slug,p.name AS plan_name,p.amount_paise
        FROM memberships m JOIN users u ON u.id=m.user_id JOIN subscription_plans p ON p.id=m.plan_id
        WHERE (:status IS NULL OR m.status=:status) ORDER BY m.created_at DESC LIMIT 500
    """), {"status": status}).mappings().all()
    return [dict(row) for row in rows]


@router.get("/membership/transactions")
def admin_membership_transactions(_admin=Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT t.id,t.transaction_number,t.user_id,u.email,t.membership_id,t.amount_paise,t.currency,t.status,
               mt.transaction_kind,t.gateway_transaction_id,t.succeeded_at,t.created_at
        FROM payment_transactions t JOIN users u ON u.id=t.user_id
        JOIN membership_transactions mt ON mt.payment_transaction_id=t.id
        ORDER BY t.created_at DESC LIMIT 500
    """)).mappings().all()
    return [dict(row) for row in rows]


@router.get("/membership/offers")
def admin_list_offers(_admin=Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT * FROM membership_offers ORDER BY created_at DESC")).mappings().all()
    return [dict(row) for row in rows]


@router.post("/membership/offers", status_code=201)
def admin_create_offer(payload: OfferCreate, admin=Depends(require_admin), db: Session = Depends(get_db)):
    row = db.execute(text("""
        INSERT INTO membership_offers
            (name,description,category_slug,subcategory_slug,service_slug,provider_id,benefit_type,benefit_value,
             starts_at,ends_at,active,terms,created_by)
        VALUES (:name,:description,:category,:subcategory,:service,:provider,:type,:value,
                :starts,:ends,:active,:terms,:admin) RETURNING *
    """), {"name": payload.name, "description": payload.description, "category": payload.category_slug,
           "subcategory": payload.subcategory_slug, "service": payload.service_slug, "provider": payload.provider_id,
           "type": payload.benefit_type, "value": payload.benefit_value, "starts": payload.starts_at,
           "ends": payload.ends_at, "active": payload.active, "terms": payload.terms,
           "admin": admin["id"]}).mappings().one()
    db.commit()
    return dict(row)


@router.patch("/membership/offers/{offer_id}")
def admin_update_offer(offer_id: str, payload: OfferUpdate, _admin=Depends(require_admin), db: Session = Depends(get_db)):
    values = payload.model_dump(exclude_unset=True)
    if not values:
        raise HTTPException(status_code=422, detail="At least one offer field is required")
    row = db.execute(text("""
        UPDATE membership_offers SET active=COALESCE(:active,active),ends_at=COALESCE(:ends,ends_at),
            terms=COALESCE(:terms,terms),updated_at=NOW() WHERE id=:id RETURNING *
    """), {"id": offer_id, "active": values.get("active"), "ends": values.get("ends_at"),
           "terms": values.get("terms")}).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Member offer not found")
    db.commit()
    return dict(row)


@router.get("/payments/overview")
def payment_overview(_admin=Depends(require_admin), db: Session = Depends(get_db)):
    tx = db.execute(text("""
        SELECT COUNT(*) AS transaction_count,
            COUNT(*) FILTER (WHERE status='PENDING') AS pending_count,
            COUNT(*) FILTER (WHERE status='FAILED') AS failed_count,
            COALESCE(SUM(amount_paise) FILTER (WHERE status IN ('SUCCEEDED','PARTIALLY_REFUNDED','REFUNDED')),0) AS gross_paise,
            COALESCE(SUM(refunded_amount_paise),0) AS refunded_paise
        FROM payment_transactions
    """)).mappings().one()
    settlements = db.execute(text("""
        SELECT status,COUNT(*) AS count,COALESCE(SUM(amount_paise),0) AS amount_paise
        FROM payment_settlements GROUP BY status
    """)).mappings().all()
    return {"transactions": dict(tx), "settlements": [dict(row) for row in settlements], "mode": "SANDBOX"}


@router.get("/payments/allocations")
def admin_allocations(_admin=Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT a.*,t.transaction_number,t.transaction_type,t.status AS payment_status
        FROM payment_allocations a JOIN payment_transactions t ON t.id=a.payment_transaction_id
        ORDER BY a.created_at DESC LIMIT 1000
    """)).mappings().all()
    return [dict(row) for row in rows]


@router.get("/settlement-rules")
def admin_settlement_rules(_admin=Depends(require_admin), db: Session = Depends(get_db)):
    rules = db.execute(text("SELECT * FROM settlement_rules ORDER BY created_at DESC")).mappings().all()
    result = []
    for rule in rules:
        targets = db.execute(text("""
            SELECT t.*,r.recipient_key,r.recipient_type,r.settlement_eligible,r.verification_status
            FROM settlement_rule_targets t JOIN payment_recipients r ON r.id=t.recipient_id
            WHERE t.rule_id=:id ORDER BY t.created_at
        """), {"id": rule["id"]}).mappings().all()
        result.append({**dict(rule), "targets": [dict(target) for target in targets]})
    return result


@router.post("/settlement-rules", status_code=201)
def admin_create_settlement_rule(payload: SettlementRuleCreate, admin=Depends(require_admin), db: Session = Depends(get_db)):
    if payload.effective_from and payload.effective_until and payload.effective_until <= payload.effective_from:
        raise HTTPException(status_code=422, detail="Rule end must be later than its start")
    recipient_ids = [str(target.recipient_id) for target in payload.targets]
    if len(set(recipient_ids)) != len(recipient_ids):
        raise HTTPException(status_code=422, detail="A recipient can appear only once in a rule")
    recipients = db.execute(text("""
        SELECT id FROM payment_recipients WHERE id = ANY(CAST(:ids AS UUID[])) AND active=TRUE
    """), {"ids": recipient_ids}).scalars().all()
    if len(recipients) != len(recipient_ids):
        raise HTTPException(status_code=422, detail="Each target must use an active payment recipient")
    if sum(target.basis_points or 0 for target in payload.targets) > 10000:
        raise HTTPException(status_code=422, detail="Combined percentage targets cannot exceed 100 percent")
    rule = db.execute(text("""
        INSERT INTO settlement_rules(name,transaction_type,category_slug,subcategory_slug,service_slug,provider_id,
            priority,effective_from,effective_until,created_by)
        VALUES (:name,:type,:category,:subcategory,:service,:provider,:priority,COALESCE(:starts,NOW()),:ends,:admin)
        RETURNING *
    """), {"name": payload.name, "type": payload.transaction_type, "category": payload.category_slug,
           "subcategory": payload.subcategory_slug, "service": payload.service_slug, "provider": payload.provider_id,
           "priority": payload.priority, "starts": payload.effective_from, "ends": payload.effective_until,
           "admin": admin["id"]}).mappings().one()
    for target in payload.targets:
        db.execute(text("""
            INSERT INTO settlement_rule_targets(rule_id,recipient_id,basis,basis_points,fixed_amount_paise)
            VALUES (:rule,:recipient,:basis,:bps,:fixed)
        """), {"rule": rule["id"], "recipient": target.recipient_id, "basis": target.basis,
               "bps": target.basis_points, "fixed": target.fixed_amount_paise})
    db.commit()
    return {**dict(rule), "targets": [target.model_dump(mode="json") for target in payload.targets]}


@router.post("/settlement-rules/{rule_id}/deactivate")
def admin_deactivate_rule(rule_id: str, _admin=Depends(require_admin), db: Session = Depends(get_db)):
    row = db.execute(text("UPDATE settlement_rules SET active=FALSE,updated_at=NOW() WHERE id=:id RETURNING id,active"),
                     {"id": rule_id}).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Settlement rule not found")
    db.commit()
    return dict(row)


@router.get("/payment-recipients")
def admin_recipients(_admin=Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT * FROM payment_recipients ORDER BY created_at DESC")).mappings().all()
    return [dict(row) for row in rows]


@router.post("/payment-recipients", status_code=201)
def admin_create_recipient(payload: RecipientCreate, _admin=Depends(require_admin), db: Session = Depends(get_db)):
    row = db.execute(text("""
        INSERT INTO payment_recipients(recipient_key,recipient_type,provider_id,user_id,active)
        VALUES (:key,:type,:provider,:user,:active) RETURNING *
    """), {"key": payload.recipient_key, "type": payload.recipient_type, "provider": payload.provider_id,
           "user": payload.user_id, "active": payload.active}).mappings().one()
    db.commit()
    return dict(row)


@router.patch("/payment-recipients/{recipient_id}")
def admin_update_recipient(recipient_id: str, payload: RecipientUpdate, _admin=Depends(require_admin), db: Session = Depends(get_db)):
    values = payload.model_dump(exclude_unset=True)
    if not values:
        raise HTTPException(status_code=422, detail="At least one recipient field is required")
    row = db.execute(text("""
        UPDATE payment_recipients SET active=:active,updated_at=NOW()
        WHERE id=:id RETURNING *
    """), {"id": recipient_id, "active": values["active"]}).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Payment recipient not found")
    db.commit()
    return dict(row)


@router.post("/payment-recipients/provider/{provider_id}/onboard")
def admin_start_provider_onboarding(provider_id: str, _admin=Depends(require_admin), db: Session = Depends(get_db)):
    provider = db.execute(text("SELECT id FROM providers WHERE id=:id"), {"id": provider_id}).scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    key = f"provider:{provider_id}"
    recipient = db.execute(text("""
        INSERT INTO payment_recipients(recipient_key,recipient_type,provider_id)
        VALUES (:key,'SERVICE_PROVIDER',:provider)
        ON CONFLICT (recipient_key) DO UPDATE SET active=TRUE,updated_at=NOW()
        RETURNING *
    """), {"key": key, "provider": provider_id}).mappings().one()
    gateway_ref = PaymentService().onboard_recipient(key)
    row = db.execute(text("""
        UPDATE payment_recipients SET gateway_account_reference=:reference,onboarding_status='IN_PROGRESS',
            verification_status='PENDING',settlement_eligible=FALSE,active=TRUE,updated_at=NOW()
        WHERE id=:id RETURNING *
    """), {"reference": gateway_ref, "id": recipient["id"]}).mappings().one()
    db.commit()
    return dict(row)


@router.post("/payment-recipients/{recipient_id}/onboard")
def admin_start_recipient_onboarding(recipient_id: str, _admin=Depends(require_admin), db: Session = Depends(get_db)):
    recipient = db.execute(text("SELECT * FROM payment_recipients WHERE id=:id AND active=TRUE"),
                            {"id": recipient_id}).mappings().first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Active payment recipient not found")
    gateway_ref = PaymentService().onboard_recipient(recipient["recipient_key"])
    row = db.execute(text("""
        UPDATE payment_recipients SET gateway_account_reference=:reference,onboarding_status='IN_PROGRESS',
            verification_status='PENDING',settlement_eligible=FALSE,updated_at=NOW()
        WHERE id=:id RETURNING *
    """), {"reference": gateway_ref, "id": recipient_id}).mappings().one()
    db.commit()
    return dict(row)


@router.post("/payment-recipients/{recipient_id}/sandbox-outcome")
def admin_sandbox_recipient_outcome(recipient_id: str, outcome: str, _admin=Depends(require_admin), db: Session = Depends(get_db)):
    if settings.payments_mode.lower() != "sandbox":
        raise HTTPException(status_code=404, detail="Sandbox payment tools are disabled")
    if outcome not in ("success", "failure"):
        raise HTTPException(status_code=422, detail="Outcome must be success or failure")
    recipient = db.execute(text("SELECT * FROM payment_recipients WHERE id=:id"), {"id": recipient_id}).mappings().first()
    if not recipient or not recipient["gateway_account_reference"]:
        raise HTTPException(status_code=409, detail="Recipient onboarding must begin before verification")
    return _admin_sandbox_event(db, {"id": f"sbx_evt_{uuid.uuid4().hex}",
        "type": "recipient.verified" if outcome == "success" else "recipient.onboarding_failed",
        "data": {"recipient_id": recipient_id,
                 "gateway_account_reference": recipient["gateway_account_reference"]}})


@router.get("/payments/settlements")
def admin_list_settlements(status: str | None = None, _admin=Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT s.*,r.recipient_key,r.recipient_type,r.onboarding_status,r.verification_status,r.settlement_eligible
        FROM payment_settlements s LEFT JOIN payment_recipients r ON r.id=s.recipient_id
        WHERE (:status IS NULL OR s.status=:status) ORDER BY s.created_at DESC LIMIT 500
    """), {"status": status}).mappings().all()
    return [dict(row) for row in rows]


@router.get("/payments/transactions")
def admin_list_commerce_transactions(status: str | None = None, _admin=Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT t.*,u.email,u.full_name FROM payment_transactions t LEFT JOIN users u ON u.id=t.user_id
        WHERE (:status IS NULL OR t.status=:status) ORDER BY t.created_at DESC LIMIT 1000
    """), {"status": status}).mappings().all()
    return [dict(row) for row in rows]


@router.post("/payment-settlements/run")
def admin_run_settlements(admin=Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT a.id,a.payment_transaction_id,a.recipient_id,a.amount_paise,a.recipient_key_snapshot,
               a.recipient_type_snapshot,a.created_at,
               COALESCE(SUM(reversal.amount_paise),0) AS reversed_paise,
               r.settlement_eligible,r.active,r.verification_status,r.gateway_account_reference
        FROM payment_allocations a JOIN payment_transactions t ON t.id=a.payment_transaction_id
        JOIN payment_recipients r ON r.id=a.recipient_id
        LEFT JOIN payment_allocations reversal ON reversal.reverses_allocation_id=a.id AND reversal.entry_type='REVERSAL'
        WHERE a.entry_type='ALLOCATION' AND a.settlement_id IS NULL AND t.status IN ('SUCCEEDED','PARTIALLY_REFUNDED','REFUNDED')
        GROUP BY a.id,r.id ORDER BY a.recipient_key_snapshot,a.created_at
    """)).mappings().all()
    groups: dict[str, dict[str, Any]] = {}
    for row in rows:
        net = int(row["amount_paise"] - row["reversed_paise"])
        if net <= 0:
            continue
        key = str(row["recipient_id"])
        group = groups.setdefault(key, {"recipient_id": key, "amount": 0, "allocations": [], "reference": row["gateway_account_reference"]})
        group["amount"] += net
        group["allocations"].append(str(row["id"]))
    created = []
    for group in groups.values():
        number = f"VSTL-{uuid.uuid4().hex[:12].upper()}"
        row = db.execute(text("""
            INSERT INTO payment_settlements(settlement_number,gateway,recipient_id,amount_paise,net_amount_paise,
                allocation_count,status,metadata)
            VALUES (:number,'SANDBOX',:recipient,:amount,:amount,:count,'PENDING',CAST(:metadata AS JSONB))
            RETURNING *
        """), {"number": number, "recipient": group["recipient_id"], "amount": group["amount"],
               "count": len(group["allocations"]), "metadata": json.dumps({"allocation_ids": group["allocations"]})}).mappings().one()
        db.execute(text("UPDATE payment_allocations SET settlement_id=:settlement WHERE id=ANY(CAST(:ids AS UUID[]))"),
                   {"settlement": row["id"], "ids": group["allocations"]})
        created.append({**dict(row), "can_submit": bool(group["reference"])})
    db.commit()
    return {"created": created, "count": len(created)}


@router.post("/payment-settlements/{settlement_id}/submit")
def admin_submit_settlement(settlement_id: str, _admin=Depends(require_admin), db: Session = Depends(get_db)):
    row = db.execute(text("""
        SELECT s.*,r.gateway_account_reference,r.active,r.onboarding_status,r.verification_status,r.settlement_eligible
        FROM payment_settlements s JOIN payment_recipients r ON r.id=s.recipient_id
        WHERE s.id=:id FOR UPDATE
    """), {"id": settlement_id}).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Settlement not found")
    if row["status"] != "PENDING":
        raise HTTPException(status_code=409, detail="Settlement is not pending")
    if (not row["active"] or not row["settlement_eligible"] or row["onboarding_status"] != "VERIFIED"
            or row["verification_status"] != "VERIFIED" or not row["gateway_account_reference"]):
        raise HTTPException(status_code=409, detail="Recipient must complete gateway verification before settlement")
    reference = PaymentService().request_settlement(str(row["id"]), row["gateway_account_reference"], row["amount_paise"])
    updated = db.execute(text("""
        UPDATE payment_settlements SET status='PROCESSING',gateway_settlement_reference=:reference,updated_at=NOW()
        WHERE id=:id RETURNING *
    """), {"reference": reference, "id": settlement_id}).mappings().one()
    db.commit()
    return dict(updated)


def _admin_sandbox_event(db: Session, event: dict[str, Any]):
    if settings.payments_mode.lower() != "sandbox":
        raise HTTPException(status_code=404, detail="Sandbox payment tools are disabled")
    payment_service = PaymentService()
    raw_body, signature = payment_service.sign_sandbox_event(event)
    if not payment_service.verify_webhook(raw_body, signature):
        raise HTTPException(status_code=500, detail="Sandbox webhook signing failed")
    return payment_service.process_webhook(db, event)


@router.post("/payment-refunds/{refund_id}/sandbox-outcome")
def admin_sandbox_refund_outcome(refund_id: str, outcome: str, _admin=Depends(require_admin), db: Session = Depends(get_db)):
    if outcome not in ("success", "failure"):
        raise HTTPException(status_code=422, detail="Outcome must be success or failure")
    refund = db.execute(text("SELECT * FROM payment_refunds WHERE id=:id"), {"id": refund_id}).mappings().first()
    if not refund:
        raise HTTPException(status_code=404, detail="Refund not found")
    result = _admin_sandbox_event(db, {"id": f"sbx_evt_{uuid.uuid4().hex}",
        "type": "refund.succeeded" if outcome == "success" else "refund.failed",
        "data": {"refund_id": refund_id, "gateway_refund_reference": refund["gateway_refund_id"]}})
    return result


@router.post("/payments/{transaction_id}/refund", status_code=201)
def admin_create_refund(transaction_id: str, payload: RefundRequest, admin=Depends(require_admin), db: Session = Depends(get_db)):
    transaction = db.execute(text("SELECT * FROM payment_transactions WHERE id=:id FOR UPDATE"),
                             {"id": transaction_id}).mappings().first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Payment transaction not found")
    if transaction["status"] not in ("SUCCEEDED", "PARTIALLY_REFUNDED"):
        raise HTTPException(status_code=409, detail="Only successful payments can be refunded")
    key = payload.idempotency_key or str(uuid.uuid4())
    prior = db.execute(text("SELECT * FROM payment_refunds WHERE payment_transaction_id=:tx AND idempotency_key=:key"),
                       {"tx": transaction_id, "key": key}).mappings().first()
    if prior:
        return dict(prior)
    reserved = db.execute(text("""
        SELECT COALESCE(SUM(amount_paise),0) FROM payment_refunds
        WHERE payment_transaction_id=:tx AND status IN ('PENDING','SUCCEEDED')
    """), {"tx": transaction_id}).scalar_one()
    if reserved + payload.amount_paise > transaction["amount_paise"]:
        raise HTTPException(status_code=409, detail="Refunds cannot exceed the original payment")
    gateway_ref = PaymentService().request_refund(transaction_id, payload.amount_paise)
    row = db.execute(text("""
        INSERT INTO payment_refunds(payment_transaction_id,refund_number,amount_paise,status,gateway_refund_id,
            reason,requested_by,idempotency_key)
        VALUES (:tx,:number,:amount,'PENDING',:gateway,:reason,:admin,:key) RETURNING *
    """), {"tx": transaction_id, "number": f"VREF-{uuid.uuid4().hex[:12].upper()}",
           "amount": payload.amount_paise, "gateway": gateway_ref, "reason": payload.reason,
           "admin": admin["id"], "key": key}).mappings().one()
    db.commit()
    return dict(row)


@router.post("/payment-settlements/{settlement_id}/sandbox-outcome")
def admin_sandbox_settlement_outcome(settlement_id: str, outcome: str, _admin=Depends(require_admin), db: Session = Depends(get_db)):
    if outcome not in ("success", "failure"):
        raise HTTPException(status_code=422, detail="Outcome must be success or failure")
    settlement = db.execute(text("SELECT * FROM payment_settlements WHERE id=:id"), {"id": settlement_id}).mappings().first()
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")
    return _admin_sandbox_event(db, {"id": f"sbx_evt_{uuid.uuid4().hex}",
        "type": "settlement.completed" if outcome == "success" else "settlement.failed",
        "data": {"settlement_id": settlement_id, "failure_reason": "Sandbox settlement failure"}})


@router.post("/reconciliation/run", status_code=201)
def admin_run_reconciliation(admin=Depends(require_admin), db: Session = Depends(get_db)):
    run = db.execute(text("""
        INSERT INTO reconciliation_runs(gateway,status,created_by) VALUES ('SANDBOX','RUNNING',:admin) RETURNING id
    """), {"admin": admin["id"]}).scalar_one()
    issues: list[dict[str, Any]] = []

    succeeded = db.execute(text("""
        SELECT t.id,t.amount_paise,t.refunded_amount_paise,
               COALESCE(SUM(a.amount_paise * CASE WHEN a.entry_type='ALLOCATION' THEN 1 ELSE -1 END),0) AS net_allocated
        FROM payment_transactions t LEFT JOIN payment_allocations a ON a.payment_transaction_id=t.id
        WHERE t.status IN ('SUCCEEDED','PARTIALLY_REFUNDED','REFUNDED')
        GROUP BY t.id HAVING COALESCE(SUM(a.amount_paise * CASE WHEN a.entry_type='ALLOCATION' THEN 1 ELSE -1 END),0)
            <> (t.amount_paise-t.refunded_amount_paise)
    """)).mappings().all()
    for row in succeeded:
        issues.append({"issue_type": "ALLOCATION_AMOUNT_MISMATCH", "severity": "ERROR",
                       "transaction": row["id"], "expected": row["amount_paise"]-row["refunded_amount_paise"],
                       "actual": row["net_allocated"], "details": {}})

    missing_webhooks = db.execute(text("""
        SELECT id,amount_paise,gateway_order_reference FROM payment_transactions
        WHERE status='PENDING' AND created_at < NOW()-INTERVAL '15 minutes'
    """)).mappings().all()
    for row in missing_webhooks:
        issues.append({"issue_type": "MISSING_WEBHOOK_OR_STALE_PAYMENT", "severity": "WARNING",
                       "transaction": row["id"], "expected": row["amount_paise"], "actual": None,
                       "reference": row["gateway_order_reference"], "details": {}})

    refund_mismatches = db.execute(text("""
        SELECT t.id,t.refunded_amount_paise,COALESCE(SUM(r.amount_paise) FILTER (WHERE r.status='SUCCEEDED'),0) AS refund_total
        FROM payment_transactions t LEFT JOIN payment_refunds r ON r.payment_transaction_id=t.id
        GROUP BY t.id HAVING t.refunded_amount_paise <>
            COALESCE(SUM(r.amount_paise) FILTER (WHERE r.status='SUCCEEDED'),0)
    """)).mappings().all()
    for row in refund_mismatches:
        issues.append({"issue_type": "REFUND_AMOUNT_MISMATCH", "severity": "ERROR",
                       "transaction": row["id"], "expected": row["refunded_amount_paise"],
                       "actual": row["refund_total"], "details": {}})

    failed = db.execute(text("SELECT id,amount_paise,gateway_settlement_reference FROM payment_settlements WHERE status='FAILED'")).mappings().all()
    for row in failed:
        issues.append({"issue_type": "FAILED_SETTLEMENT", "severity": "WARNING", "transaction": None,
                       "settlement": row["id"], "expected": row["amount_paise"], "actual": None,
                       "reference": row["gateway_settlement_reference"], "details": {}})

    late_reversals = db.execute(text("""
        SELECT DISTINCT r.id AS reversal_id,r.payment_transaction_id,r.amount_paise,a.settlement_id
        FROM payment_allocations r JOIN payment_allocations a ON a.id=r.reverses_allocation_id
        JOIN payment_settlements s ON s.id=a.settlement_id
        WHERE r.entry_type='REVERSAL' AND s.status='COMPLETED'
    """)).mappings().all()
    for row in late_reversals:
        issues.append({"issue_type": "REFUND_AFTER_SETTLEMENT_ADJUSTMENT_REQUIRED", "severity": "ERROR",
                       "transaction": row["payment_transaction_id"], "settlement": row["settlement_id"],
                       "expected": None, "actual": row["amount_paise"], "details": {"reversal_id": str(row["reversal_id"])} })

    for issue in issues:
        db.execute(text("""
            INSERT INTO reconciliation_issues(run_id,issue_type,severity,payment_transaction_id,payment_settlement_id,
                gateway_reference,expected_amount_paise,actual_amount_paise,details)
            VALUES (:run,:type,:severity,:transaction,:settlement,:reference,:expected,:actual,CAST(:details AS JSONB))
        """), {"run": run, "type": issue["issue_type"], "severity": issue["severity"],
               "transaction": issue.get("transaction"), "settlement": issue.get("settlement"),
               "reference": issue.get("reference"), "expected": issue.get("expected"),
               "actual": issue.get("actual"), "details": json.dumps(issue.get("details", {}))})
    summary = {"issue_count": len(issues), "error_count": sum(i["severity"] == "ERROR" for i in issues),
               "warning_count": sum(i["severity"] == "WARNING" for i in issues)}
    db.execute(text("""
        UPDATE reconciliation_runs SET status='COMPLETED',completed_at=NOW(),summary=CAST(:summary AS JSONB) WHERE id=:id
    """), {"summary": json.dumps(summary), "id": run})
    db.commit()
    return {"run_id": str(run), **summary, "issues": issues}


@router.get("/reconciliation/runs")
def admin_list_reconciliation(_admin=Depends(require_admin), db: Session = Depends(get_db)):
    runs = db.execute(text("SELECT * FROM reconciliation_runs ORDER BY started_at DESC LIMIT 100")).mappings().all()
    return [{**dict(run), "issues": [dict(issue) for issue in db.execute(text(
        "SELECT * FROM reconciliation_issues WHERE run_id=:run ORDER BY created_at"
    ), {"run": run["id"]}).mappings().all()]} for run in runs]
