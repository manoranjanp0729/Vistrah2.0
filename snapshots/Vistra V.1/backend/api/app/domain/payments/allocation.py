from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session


def _split_by_basis_points(total_paise: int, weighted_targets: list[dict[str, Any]]) -> list[int]:
    weight_total = sum(target["basis_points"] for target in weighted_targets)
    if weight_total <= 0:
        return [0 for _ in weighted_targets]
    quotients: list[int] = []
    remainders: list[tuple[int, int]] = []
    for index, target in enumerate(weighted_targets):
        quotient, remainder = divmod(total_paise * target["basis_points"], weight_total)
        quotients.append(quotient)
        remainders.append((remainder, index))
    unassigned = total_paise - sum(quotients)
    for _, index in sorted(remainders, reverse=True)[:unassigned]:
        quotients[index] += 1
    return quotients


def create_allocation_snapshot(
    db: Session,
    *,
    transaction_type: str,
    amount_paise: int,
    category_slug: str | None = None,
    subcategory_slug: str | None = None,
    service_slug: str | None = None,
    provider_id: str | None = None,
) -> tuple[str, list[dict[str, Any]]]:
    now = datetime.now(timezone.utc)
    rules = db.execute(text("""
        SELECT * FROM settlement_rules
        WHERE active=TRUE AND transaction_type=:type
          AND effective_from <= :now AND (effective_until IS NULL OR effective_until > :now)
          AND (category_slug IS NULL OR category_slug=:category)
          AND (subcategory_slug IS NULL OR subcategory_slug=:subcategory)
          AND (service_slug IS NULL OR service_slug=:service)
          AND (provider_id IS NULL OR provider_id=:provider)
    """), {"type": transaction_type, "now": now, "category": category_slug,
           "subcategory": subcategory_slug, "service": service_slug, "provider": provider_id}).mappings().all()
    if not rules:
        raise HTTPException(status_code=409, detail="No active settlement rule covers this payment")

    rule = max(rules, key=lambda row: (
        sum(row[field] is not None for field in ("category_slug", "subcategory_slug", "service_slug", "provider_id")),
        row["priority"], row["effective_from"],
    ))
    targets = db.execute(text("""
        SELECT t.basis,t.basis_points,t.fixed_amount_paise,r.id AS recipient_id,
               r.recipient_key,r.recipient_type,r.active
        FROM settlement_rule_targets t JOIN payment_recipients r ON r.id=t.recipient_id
        WHERE t.rule_id=:rule ORDER BY t.created_at,t.id
    """), {"rule": rule["id"]}).mappings().all()
    if not targets or any(not row["active"] for row in targets):
        raise HTTPException(status_code=409, detail="Settlement rule has no active recipient targets")

    fixed_total = sum(row["fixed_amount_paise"] or 0 for row in targets)
    percentage_targets = [dict(row) for row in targets if row["basis"] == "PERCENTAGE"]
    if fixed_total > amount_paise:
        raise HTTPException(status_code=409, detail="Settlement rule fixed targets exceed the transaction amount")
    percentage_total_bps = sum(row["basis_points"] or 0 for row in percentage_targets)
    percentage_pool = amount_paise - fixed_total
    if percentage_targets:
        if percentage_total_bps > 10000 or percentage_total_bps * amount_paise != percentage_pool * 10000:
            raise HTTPException(status_code=409, detail="Settlement rule does not allocate the full transaction amount")
        percentage_values = _split_by_basis_points(percentage_pool, percentage_targets)
    else:
        percentage_values = []
        if fixed_total != amount_paise:
            raise HTTPException(status_code=409, detail="Settlement rule does not allocate the full transaction amount")

    percentage_index = 0
    snapshot: list[dict[str, Any]] = []
    for row in targets:
        if row["basis"] == "PERCENTAGE":
            share = percentage_values[percentage_index]
            percentage_index += 1
        else:
            share = row["fixed_amount_paise"]
        if share <= 0:
            continue
        snapshot.append({
            "recipient_id": str(row["recipient_id"]),
            "recipient_key": row["recipient_key"],
            "recipient_type": row["recipient_type"],
            "amount_paise": share,
        })
    if sum(item["amount_paise"] for item in snapshot) != amount_paise:
        raise HTTPException(status_code=409, detail="Settlement rule allocation does not balance")
    return str(rule["id"]), snapshot


def record_transaction_allocations(db: Session, transaction_id: str, rule_id: str, snapshot: list[dict[str, Any]]) -> None:
    for target in snapshot:
        db.execute(text("""
            INSERT INTO payment_allocations
                (payment_transaction_id,recipient_id,recipient_key_snapshot,recipient_type_snapshot,
                 amount_paise,entry_type,rule_id)
            VALUES (:transaction,:recipient,:key,:type,:amount,'ALLOCATION',:rule)
            ON CONFLICT DO NOTHING
        """), {"transaction": transaction_id, "recipient": target["recipient_id"],
               "key": target["recipient_key"], "type": target["recipient_type"],
               "amount": target["amount_paise"], "rule": rule_id})


def reverse_allocations_for_refund(db: Session, transaction: dict[str, Any], refund: dict[str, Any]) -> None:
    allocations = db.execute(text("""
        SELECT a.id,a.recipient_id,a.recipient_key_snapshot,a.recipient_type_snapshot,a.amount_paise,
               COALESCE(SUM(r.amount_paise),0) AS already_reversed
        FROM payment_allocations a LEFT JOIN payment_allocations r
          ON r.reverses_allocation_id=a.id AND r.entry_type='REVERSAL'
        WHERE a.payment_transaction_id=:transaction AND a.entry_type='ALLOCATION'
        GROUP BY a.id ORDER BY a.id
    """), {"transaction": transaction["id"]}).mappings().all()
    balances = [
        {**dict(row), "already_reversed": int(row["already_reversed"])}
        for row in allocations if row["amount_paise"] > int(row["already_reversed"])
    ]
    remaining = refund["amount_paise"]
    available = sum(row["amount_paise"] - row["already_reversed"] for row in balances)
    if remaining > available:
        raise HTTPException(status_code=409, detail="Refund amount exceeds un-reversed allocation balance")

    # Split a partial reversal across current balances; the final refund drains all rounding residue.
    weights = [row["amount_paise"] - row["already_reversed"] for row in balances]
    weight_total = sum(weights)
    portions: list[int] = []
    remainders: list[tuple[int, int]] = []
    for index, weight in enumerate(weights):
        portion, remainder = divmod(remaining * weight, weight_total)
        portions.append(portion)
        remainders.append((remainder, index))
    unassigned = remaining - sum(portions)
    for _, index in sorted(remainders, reverse=True)[:unassigned]:
        portions[index] += 1

    for row, portion in zip(balances, portions):
        if portion <= 0:
            continue
        db.execute(text("""
            INSERT INTO payment_allocations
                (payment_transaction_id,recipient_id,recipient_key_snapshot,recipient_type_snapshot,
                 amount_paise,entry_type,reverses_allocation_id,payment_refund_id,rule_id)
            VALUES (:transaction,:recipient,:key,:type,:amount,'REVERSAL',:allocation,:refund,:rule)
        """), {"transaction": transaction["id"], "recipient": row["recipient_id"],
               "key": row["recipient_key_snapshot"], "type": row["recipient_type_snapshot"],
               "amount": portion, "allocation": row["id"], "refund": refund["id"],
               "rule": transaction["settlement_rule_id"]})
