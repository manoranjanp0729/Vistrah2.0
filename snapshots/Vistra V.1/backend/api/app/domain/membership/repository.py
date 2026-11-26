from sqlalchemy import text
from sqlalchemy.orm import Session


def list_active_plans(db: Session):
    return db.execute(text("""
        SELECT id,slug,name,description,amount_paise,currency,billing_interval,status
        FROM subscription_plans WHERE status='ACTIVE' ORDER BY amount_paise,created_at
    """)).mappings().all()


def get_user_membership(db: Session, user_id: str):
    return db.execute(text("""
        SELECT m.id,m.status,m.gateway,m.gateway_customer_reference,m.gateway_subscription_reference,
               m.start_date,m.renewal_date,m.cancellation_date,m.cancel_at_period_end,
               p.id AS plan_id,p.slug AS plan_slug,p.name AS plan_name,p.amount_paise,
               p.currency,p.billing_interval
        FROM memberships m JOIN subscription_plans p ON p.id=m.plan_id
        WHERE m.user_id=:user
        ORDER BY CASE WHEN m.status='ACTIVE' THEN 0 WHEN m.status IN ('PENDING','PAYMENT_FAILED','SUSPENDED') THEN 1 ELSE 2 END,
                 m.created_at DESC LIMIT 1
    """), {"user": user_id}).mappings().first()


def list_user_membership_transactions(db: Session, user_id: str):
    return db.execute(text("""
        SELECT t.id,t.transaction_number,t.amount_paise,t.currency,t.status,t.gateway,
               t.succeeded_at,t.created_at,mt.transaction_kind
        FROM payment_transactions t JOIN membership_transactions mt ON mt.payment_transaction_id=t.id
        WHERE t.user_id=:user ORDER BY t.created_at DESC
    """), {"user": user_id}).mappings().all()
