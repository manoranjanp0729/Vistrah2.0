import uuid
from fastapi import APIRouter, Depends, Header
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.domain.membership.service import create_service_checkout
from app.domain.membership.schemas import ServiceCheckoutRequest

router = APIRouter()


@router.post("/payments/checkout")
def service_payment_checkout(
    payload: ServiceCheckoutRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    key = idempotency_key or str(uuid.uuid4())
    return create_service_checkout(db, current_user, str(payload.application_id), key)


@router.get("/payments")
def my_payments(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT t.id,t.transaction_number,t.transaction_type,t.amount_paise,t.refunded_amount_paise,
               t.currency,t.status,t.gateway,t.gateway_transaction_id,t.succeeded_at,t.created_at
        FROM payment_transactions t WHERE t.user_id=:user ORDER BY t.created_at DESC
    """), {"user": str(current_user["id"])}).mappings().all()
    return [dict(row) for row in rows]


@router.get("/payments/{transaction_id}")
def my_payment(transaction_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.execute(text("""
        SELECT id,transaction_number,transaction_type,amount_paise,refunded_amount_paise,currency,status,
               succeeded_at,created_at FROM payment_transactions
        WHERE id=:transaction AND user_id=:user
    """), {"transaction": transaction_id, "user": str(current_user["id"])}).mappings().first()
    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Payment transaction not found")
    return dict(row)


@router.get("/payments/{transaction_id}/refunds")
def my_payment_refunds(transaction_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT r.id,r.refund_number,r.amount_paise,r.status,r.reason,r.processed_at,r.created_at
        FROM payment_refunds r JOIN payment_transactions t ON t.id=r.payment_transaction_id
        WHERE t.id=:transaction AND t.user_id=:user ORDER BY r.created_at DESC
    """), {"transaction": transaction_id, "user": str(current_user["id"])}).mappings().all()
    return [dict(row) for row in rows]
