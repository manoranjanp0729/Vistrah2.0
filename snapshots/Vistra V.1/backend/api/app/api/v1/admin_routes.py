import uuid
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.auth import require_admin

from app.core.database import get_db


router = APIRouter(prefix="/admin", tags=["admin"])


# ---------------------------------------------
# OVERVIEW
# ---------------------------------------------

@router.get("/overview")
def admin_overview(
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    counts = db.execute(
        text("""
            SELECT
                (SELECT COUNT(*) FROM users) AS total_users,
                (SELECT COUNT(*) FROM categories WHERE active=true) AS active_categories,
                (SELECT COUNT(*) FROM services WHERE active=true) AS active_services,
                (SELECT COUNT(*) FROM applications) AS total_applications,
                (SELECT COUNT(*) FROM applications WHERE status='SUBMITTED') AS pending_applications,
                (SELECT COUNT(*) FROM applications WHERE status='COMPLETED') AS completed_applications,
                (SELECT COUNT(*) FROM providers) AS total_providers,
                (SELECT COUNT(*) FROM providers WHERE status='PENDING') AS pending_providers,
                (SELECT COUNT(*) FROM provider_services) AS provider_services,
                (SELECT COUNT(*) FROM review_queue WHERE status='PENDING') AS pending_reviews,
                (SELECT COUNT(*) FROM acquisition_jobs WHERE status='RUNNING') AS running_jobs,
                (SELECT COUNT(*) FROM acquisition_jobs WHERE status='FAILED') AS failed_jobs
        """)
    ).mappings().one()

    return {
        "admin": {
            "id": str(current_user["id"]),
            "email": current_user["email"],
            "role": current_user["role"],
        },
        "counts": dict(counts),
    }


# ---------------------------------------------
# DATA SOURCES
# ---------------------------------------------

@router.get("/data-sources")
def list_data_sources(
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text("""
            SELECT *
            FROM data_sources
            ORDER BY created_at DESC
        """)
    ).mappings().all()

    return {"items": [dict(row) for row in rows]}


@router.post("/data-sources")
def create_data_source(
    payload: dict,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    if not payload.get("name"):
        raise HTTPException(400, "Source name is required")

    row = db.execute(
        text("""
            INSERT INTO data_sources
                (name, source_type, base_url, description, status, collection_method)
            VALUES
                (:name, :source_type, :base_url, :description, :status, :collection_method)
            RETURNING *
        """),
        {
            "name": payload["name"],
            "source_type": payload.get("source_type", "WEB"),
            "base_url": payload.get("base_url"),
            "description": payload.get("description"),
            "status": payload.get("status", "ACTIVE"),
            "collection_method": payload.get("collection_method"),
        },
    ).mappings().one()

    db.commit()

    return dict(row)


@router.patch("/data-sources/{source_id}")
def update_data_source(
    source_id: str,
    payload: dict,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    allowed = {
        "name",
        "source_type",
        "base_url",
        "description",
        "status",
        "collection_method",
        "next_run_at",
    }

    updates = {
        key: value
        for key, value in payload.items()
        if key in allowed
    }

    if not updates:
        raise HTTPException(400, "No valid fields supplied")

    assignments = ", ".join(
        f"{key}=:{key}" for key in updates
    )

    updates["source_id"] = source_id

    row = db.execute(
        text(f"""
            UPDATE data_sources
            SET {assignments}, updated_at=NOW()
            WHERE id=:source_id
            RETURNING *
        """),
        updates,
    ).mappings().first()

    if not row:
        raise HTTPException(404, "Data source not found")

    db.commit()

    return dict(row)


# ---------------------------------------------
# ACQUISITION JOBS
# ---------------------------------------------

@router.get("/acquisition-jobs")
def list_acquisition_jobs(
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text("""
            SELECT
                j.*,
                s.name AS source_name
            FROM acquisition_jobs j
            JOIN data_sources s ON s.id=j.data_source_id
            ORDER BY j.created_at DESC
        """)
    ).mappings().all()

    return {"items": [dict(row) for row in rows]}


@router.post("/acquisition-jobs")
def create_acquisition_job(
    payload: dict,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    source_id = payload.get("data_source_id")

    if not source_id:
        raise HTTPException(400, "data_source_id is required")

    source = db.execute(
        text("""
            SELECT id
            FROM data_sources
            WHERE id=:id
        """),
        {"id": source_id},
    ).first()

    if not source:
        raise HTTPException(404, "Data source not found")

    row = db.execute(
        text("""
            INSERT INTO acquisition_jobs
                (data_source_id, status)
            VALUES
                (:source_id, 'QUEUED')
            RETURNING *
        """),
        {"source_id": source_id},
    ).mappings().one()

    db.commit()

    try:
        acquire_source(
            db,
            source_id,
            str(row["id"]),
        )
    except Exception as exc:
        raise HTTPException(
            502,
            f"Acquisition failed: {str(exc)[:500]}",
        )

    final_row = db.execute(
        text("""
            SELECT *
            FROM acquisition_jobs
            WHERE id=:id
        """),
        {"id": row["id"]},
    ).mappings().one()

    return dict(final_row)

@router.get("/source-records")
def list_source_records(
    status: str | None = None,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    if status:
        rows = db.execute(
            text("""
                SELECT
                    r.*,
                    s.name AS source_name
                FROM source_records r
                JOIN data_sources s ON s.id=r.data_source_id
                WHERE r.status=:status
                ORDER BY r.collected_at DESC
            """),
            {"status": status},
        ).mappings().all()
    else:
        rows = db.execute(
            text("""
                SELECT
                    r.*,
                    s.name AS source_name
                FROM source_records r
                JOIN data_sources s ON s.id=r.data_source_id
                ORDER BY r.collected_at DESC
            """)
        ).mappings().all()

    return {"items": [dict(row) for row in rows]}


# ---------------------------------------------
# PROVIDERS
# ---------------------------------------------

@router.get("/providers")
def list_providers(
    status: str | None = None,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    if status:
        rows = db.execute(
            text("""
                SELECT *
                FROM providers
                WHERE status=:status
                ORDER BY created_at DESC
            """),
            {"status": status},
        ).mappings().all()
    else:
        rows = db.execute(
            text("""
                SELECT *
                FROM providers
                ORDER BY created_at DESC
            """)
        ).mappings().all()

    return {"items": [dict(row) for row in rows]}


@router.post("/providers")
def create_provider(
    payload: dict,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    if not payload.get("name"):
        raise HTTPException(400, "Provider name is required")

    row = db.execute(
        text("""
            INSERT INTO providers (
                name,
                provider_type,
                description,
                phone,
                email,
                website,
                address,
                city,
                state,
                country,
                source_record_id,
                status,
                verified
            )
            VALUES (
                :name,
                :provider_type,
                :description,
                :phone,
                :email,
                :website,
                :address,
                :city,
                :state,
                :country,
                :source_record_id,
                :status,
                :verified
            )
            RETURNING *
        """),
        {
            "name": payload["name"],
            "provider_type": payload.get("provider_type"),
            "description": payload.get("description"),
            "phone": payload.get("phone"),
            "email": payload.get("email"),
            "website": payload.get("website"),
            "address": payload.get("address"),
            "city": payload.get("city"),
            "state": payload.get("state"),
            "country": payload.get("country", "India"),
            "source_record_id": payload.get("source_record_id"),
            "status": payload.get("status", "PENDING"),
            "verified": payload.get("verified", False),
        },
    ).mappings().one()

    db.commit()

    return dict(row)


@router.patch("/providers/{provider_id}")
def update_provider(
    provider_id: str,
    payload: dict,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    allowed = {
        "name",
        "provider_type",
        "description",
        "phone",
        "email",
        "website",
        "address",
        "city",
        "state",
        "country",
        "status",
        "verified",
    }

    updates = {
        key: value
        for key, value in payload.items()
        if key in allowed
    }

    if not updates:
        raise HTTPException(400, "No valid fields supplied")

    assignments = ", ".join(
        f"{key}=:{key}" for key in updates
    )

    updates["provider_id"] = provider_id

    row = db.execute(
        text(f"""
            UPDATE providers
            SET {assignments}, updated_at=NOW()
            WHERE id=:provider_id
            RETURNING *
        """),
        updates,
    ).mappings().first()

    if not row:
        raise HTTPException(404, "Provider not found")

    db.commit()

    return dict(row)


# ---------------------------------------------
# PROVIDER SERVICES
# ---------------------------------------------

@router.get("/provider-services")
def list_provider_services(
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text("""
            SELECT
                ps.*,
                p.name AS provider_name,
                s.name AS service_name
            FROM provider_services ps
            JOIN providers p ON p.id=ps.provider_id
            JOIN services s ON s.id=ps.service_id
            ORDER BY ps.created_at DESC
        """)
    ).mappings().all()

    return {"items": [dict(row) for row in rows]}


@router.post("/provider-services")
def create_provider_service(
    payload: dict,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    if not payload.get("provider_id") or not payload.get("service_id"):
        raise HTTPException(
            400,
            "provider_id and service_id are required",
        )

    row = db.execute(
        text("""
            INSERT INTO provider_services (
                provider_id,
                service_id,
                price,
                price_unit,
                description,
                status,
                source_record_id
            )
            VALUES (
                :provider_id,
                :service_id,
                :price,
                :price_unit,
                :description,
                :status,
                :source_record_id
            )
            RETURNING *
        """),
        {
            "provider_id": payload["provider_id"],
            "service_id": payload["service_id"],
            "price": payload.get("price"),
            "price_unit": payload.get("price_unit"),
            "description": payload.get("description"),
            "status": payload.get("status", "PENDING"),
            "source_record_id": payload.get("source_record_id"),
        },
    ).mappings().one()

    db.commit()

    return dict(row)


# ---------------------------------------------
# REVIEW QUEUE
# ---------------------------------------------

@router.get("/review-queue")
def list_review_queue(
    status: str | None = None,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    if status:
        rows = db.execute(
            text("""
                SELECT
                    q.*,
                    p.name AS provider_name
                FROM review_queue q
                LEFT JOIN providers p ON p.id=q.provider_id
                WHERE q.status=:status
                ORDER BY q.created_at ASC
            """),
            {"status": status},
        ).mappings().all()
    else:
        rows = db.execute(
            text("""
                SELECT
                    q.*,
                    p.name AS provider_name
                FROM review_queue q
                LEFT JOIN providers p ON p.id=q.provider_id
                ORDER BY q.created_at ASC
            """)
        ).mappings().all()

    return {"items": [dict(row) for row in rows]}


@router.patch("/review-queue/{review_id}")
def update_review(
    review_id: str,
    payload: dict,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    decision = payload.get("decision")

    if decision not in ("APPROVE", "REJECT", "REQUEST_CHANGES"):
        raise HTTPException(
            400,
            "decision must be APPROVE, REJECT, or REQUEST_CHANGES",
        )

    row = db.execute(
        text("""
            UPDATE review_queue
            SET
                decision=:decision,
                status=:status,
                reviewer_notes=:notes,
                assigned_to=:admin_id,
                reviewed_at=NOW()
            WHERE id=:id
            RETURNING *
        """),
        {
            "id": review_id,
            "decision": decision,
            "status": "COMPLETED",
            "notes": payload.get("reviewer_notes"),
            "admin_id": current_user["id"],
        },
    ).mappings().first()

    if not row:
        raise HTTPException(404, "Review item not found")

    db.commit()

    return dict(row)


# ---------------------------------------------
# AUDIT LOGS
# ---------------------------------------------

@router.get("/audit-logs")
def list_audit_logs(
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text("""
            SELECT
                a.*,
                u.email AS user_email
            FROM audit_logs a
            LEFT JOIN users u ON u.id=a.user_id
            ORDER BY a.created_at DESC
            LIMIT 500
        """)
    ).mappings().all()

    return {"items": [dict(row) for row in rows]}


# ============================================================
# EDITABLE ACQUISITION DATA
# ============================================================

@router.patch("/data-sources/{source_id}")
def update_data_source(
    source_id: str,
    payload: dict,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    source = db.execute(
        text("""
            SELECT *
            FROM data_sources
            WHERE id=:id
        """),
        {"id": source_id},
    ).mappings().first()

    if not source:
        raise HTTPException(404, "Data source not found")

    allowed = [
        "name",
        "source_type",
        "collection_method",
        "base_url",
        "description",
        "status",
    ]

    values = {
        key: payload[key]
        for key in allowed
        if key in payload
    }

    if not values:
        raise HTTPException(400, "No editable fields supplied")

    set_parts = []
    params = {"id": source_id}

    for key, value in values.items():
        set_parts.append(f"{key}=:{key}")
        params[key] = value

    set_parts.append("updated_at=NOW()")

    updated = db.execute(
        text(f"""
            UPDATE data_sources
            SET {", ".join(set_parts)}
            WHERE id=:id
            RETURNING *
        """),
        params,
    ).mappings().one()

    db.execute(
        text("""
            INSERT INTO audit_logs
                (user_id, action, entity_type, entity_id, old_data, new_data)
            VALUES
                (:user_id, 'UPDATE', 'DATA_SOURCE', :entity_id,
                 CAST(:old_data AS JSONB), CAST(:new_data AS JSONB))
        """),
        {
            "user_id": current_user["id"],
            "entity_id": source_id,
            "old_data": json.dumps(dict(source), default=str),
            "new_data": json.dumps(dict(updated), default=str),
        },
    )

    db.commit()

    return dict(updated)


@router.patch("/source-records/{record_id}")
def update_source_record(
    record_id: str,
    payload: dict,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    record = db.execute(
        text("""
            SELECT *
            FROM source_records
            WHERE id=:id
        """),
        {"id": record_id},
    ).mappings().first()

    if not record:
        raise HTTPException(404, "Source record not found")

    extracted = dict(record["extracted_data"] or {})

    editable = [
        "provider_name",
        "phone",
        "email",
        "website",
        "address",
        "city",
        "state",
        "description",
    ]

    for key in editable:
        if key in payload:
            extracted[key] = payload[key]

    updated = db.execute(
        text("""
            UPDATE source_records
            SET
                extracted_data=CAST(:extracted_data AS JSONB),
                status='STAGED',
                reviewed_at=NULL
            WHERE id=:id
            RETURNING *
        """),
        {
            "id": record_id,
            "extracted_data": json.dumps(extracted),
        },
    ).mappings().one()

    db.execute(
        text("""
            INSERT INTO audit_logs
                (user_id, action, entity_type, entity_id, old_data, new_data)
            VALUES
                (:user_id, 'UPDATE', 'SOURCE_RECORD', :entity_id,
                 CAST(:old_data AS JSONB), CAST(:new_data AS JSONB))
        """),
        {
            "user_id": current_user["id"],
            "entity_id": record_id,
            "old_data": json.dumps(dict(record), default=str),
            "new_data": json.dumps(dict(updated), default=str),
        },
    )

    db.commit()

    return dict(updated)


@router.patch("/providers/{provider_id}")
def update_provider(
    provider_id: str,
    payload: dict,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    provider = db.execute(
        text("""
            SELECT *
            FROM providers
            WHERE id=:id
        """),
        {"id": provider_id},
    ).mappings().first()

    if not provider:
        raise HTTPException(404, "Provider not found")

    allowed = [
        "name",
        "provider_type",
        "description",
        "phone",
        "email",
        "website",
        "address",
        "city",
        "state",
        "country",
        "status",
        "verified",
    ]

    values = {
        key: payload[key]
        for key in allowed
        if key in payload
    }

    if not values:
        raise HTTPException(400, "No editable fields supplied")

    set_parts = []
    params = {"id": provider_id}

    for key, value in values.items():
        set_parts.append(f"{key}=:{key}")
        params[key] = value

    set_parts.append("updated_at=NOW()")

    updated = db.execute(
        text(f"""
            UPDATE providers
            SET {", ".join(set_parts)}
            WHERE id=:id
            RETURNING *
        """),
        params,
    ).mappings().one()

    db.execute(
        text("""
            INSERT INTO audit_logs
                (user_id, action, entity_type, entity_id, old_data, new_data)
            VALUES
                (:user_id, 'UPDATE', 'PROVIDER', :entity_id,
                 CAST(:old_data AS JSONB), CAST(:new_data AS JSONB))
        """),
        {
            "user_id": current_user["id"],
            "entity_id": provider_id,
            "old_data": json.dumps(dict(provider), default=str),
            "new_data": json.dumps(dict(updated), default=str),
        },
    )

    db.commit()

    return dict(updated)




