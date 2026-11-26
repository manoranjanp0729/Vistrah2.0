from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import require_admin
router = APIRouter(prefix="/admin", tags=["admin"])


# ============================================================
# VISTRAH MASTER DATA / PAYMENTS / COMPANY
# ============================================================

@router.get("/service-categories")
def list_service_categories(
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text("SELECT * FROM service_categories ORDER BY sort_order, name")
    ).mappings().all()
    return [dict(r) for r in rows]


@router.post("/service-categories")
def create_service_category(
    payload: dict,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = db.execute(
        text("""
            INSERT INTO service_categories
                (name, slug, description, icon, sort_order, status)
            VALUES
                (:name, :slug, :description, :icon, :sort_order, :status)
            RETURNING *
        """),
        {
            "name": payload.get("name"),
            "slug": payload.get("slug"),
            "description": payload.get("description"),
            "icon": payload.get("icon"),
            "sort_order": payload.get("sort_order", 0),
            "status": payload.get("status", "ACTIVE"),
        },
    ).mappings().one()
    db.commit()
    return dict(row)


@router.get("/service-subcategories")
def list_service_subcategories(
    category_id: str | None = None,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    sql = """
        SELECT ss.*, sc.name AS category_name
        FROM service_subcategories ss
        JOIN service_categories sc ON sc.id = ss.category_id
    """
    params = {}

    if category_id:
        sql += " WHERE ss.category_id=:category_id"
        params["category_id"] = category_id

    sql += " ORDER BY ss.sort_order, ss.name"

    rows = db.execute(text(sql), params).mappings().all()
    return [dict(r) for r in rows]


@router.post("/service-subcategories")
def create_service_subcategory(
    payload: dict,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = db.execute(
        text("""
            INSERT INTO service_subcategories
                (category_id, name, slug, description, sort_order, status)
            VALUES
                (:category_id, :name, :slug, :description, :sort_order, :status)
            RETURNING *
        """),
        {
            "category_id": payload.get("category_id"),
            "name": payload.get("name"),
            "slug": payload.get("slug"),
            "description": payload.get("description"),
            "sort_order": payload.get("sort_order", 0),
            "status": payload.get("status", "ACTIVE"),
        },
    ).mappings().one()
    db.commit()
    return dict(row)


@router.get("/master-services")
def list_master_services(
    subcategory_id: str | None = None,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    sql = """
        SELECT ms.*, ss.name AS subcategory_name,
               sc.name AS category_name
        FROM master_services ms
        JOIN service_subcategories ss ON ss.id = ms.subcategory_id
        JOIN service_categories sc ON sc.id = ss.category_id
    """
    params = {}

    if subcategory_id:
        sql += " WHERE ms.subcategory_id=:subcategory_id"
        params["subcategory_id"] = subcategory_id

    sql += " ORDER BY ms.sort_order, ms.name"

    rows = db.execute(text(sql), params).mappings().all()
    return [dict(r) for r in rows]


@router.post("/master-services")
def create_master_service(
    payload: dict,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = db.execute(
        text("""
            INSERT INTO master_services
            (
                subcategory_id, name, slug, description,
                service_type, base_price_paise, pricing_type,
                status, sort_order
            )
            VALUES
            (
                :subcategory_id, :name, :slug, :description,
                :service_type, :base_price_paise, :pricing_type,
                :status, :sort_order
            )
            RETURNING *
        """),
        {
            "subcategory_id": payload.get("subcategory_id"),
            "name": payload.get("name"),
            "slug": payload.get("slug"),
            "description": payload.get("description"),
            "service_type": payload.get("service_type", "SERVICE"),
            "base_price_paise": payload.get("base_price_paise"),
            "pricing_type": payload.get("pricing_type", "ON_REQUEST"),
            "status": payload.get("status", "ACTIVE"),
            "sort_order": payload.get("sort_order", 0),
        },
    ).mappings().one()
    db.commit()
    return dict(row)


@router.get("/payments")
def list_payment_transactions(
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text("""
            SELECT *
            FROM payment_transactions
            ORDER BY created_at DESC
        """)
    ).mappings().all()
    return [dict(r) for r in rows]


@router.get("/payment-refunds")
def list_payment_refunds(
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text("""
            SELECT *
            FROM payment_refunds
            ORDER BY created_at DESC
        """)
    ).mappings().all()
    return [dict(r) for r in rows]


@router.get("/payment-settlements")
def list_payment_settlements(
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text("""
            SELECT *
            FROM payment_settlements
            ORDER BY created_at DESC
        """)
    ).mappings().all()
    return [dict(r) for r in rows]


@router.get("/company-profile")
def get_company_profile(
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = db.execute(
        text("""
            SELECT *
            FROM company_profile
            ORDER BY created_at
            LIMIT 1
        """)
    ).mappings().first()

    return dict(row) if row else None


@router.post("/company-profile")
def create_company_profile(
    payload: dict,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = db.execute(
        text("""
            INSERT INTO company_profile
            (
                legal_name, brand_name, company_type,
                incorporation_number, incorporation_date,
                pan_masked, gstin_masked,
                registered_address, office_address,
                email, phone, website, status, metadata
            )
            VALUES
            (
                :legal_name, :brand_name, :company_type,
                :incorporation_number, :incorporation_date,
                :pan_masked, :gstin_masked,
                :registered_address, :office_address,
                :email, :phone, :website, :status, :metadata
            )
            RETURNING *
        """),
        {
            "legal_name": payload.get("legal_name"),
            "brand_name": payload.get("brand_name", "VISTRAH"),
            "company_type": payload.get("company_type"),
            "incorporation_number": payload.get("incorporation_number"),
            "incorporation_date": payload.get("incorporation_date"),
            "pan_masked": payload.get("pan_masked"),
            "gstin_masked": payload.get("gstin_masked"),
            "registered_address": payload.get("registered_address"),
            "office_address": payload.get("office_address"),
            "email": payload.get("email"),
            "phone": payload.get("phone"),
            "website": payload.get("website"),
            "status": payload.get("status", "ACTIVE"),
            "metadata": payload.get("metadata", {}),
        },
    ).mappings().one()
    db.commit()
    return dict(row)


@router.get("/company-shareholders")
def list_company_shareholders(
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text("""
            SELECT cs.*, cp.brand_name
            FROM company_shareholders cs
            JOIN company_profile cp ON cp.id = cs.company_id
            ORDER BY cs.ownership_percent DESC, cs.name
        """)
    ).mappings().all()
    return [dict(r) for r in rows]


@router.get("/company-bank-accounts")
def list_company_bank_accounts(
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text("""
            SELECT cba.*, cp.brand_name
            FROM company_bank_accounts cba
            JOIN company_profile cp ON cp.id = cba.company_id
            ORDER BY cba.created_at
        """)
    ).mappings().all()
    return [dict(r) for r in rows]


@router.get("/company-employees")
def list_company_employees(
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text("""
            SELECT ce.*, cp.brand_name
            FROM company_employees ce
            JOIN company_profile cp ON cp.id = ce.company_id
            ORDER BY ce.status, ce.full_name
        """)
    ).mappings().all()
    return [dict(r) for r in rows]

