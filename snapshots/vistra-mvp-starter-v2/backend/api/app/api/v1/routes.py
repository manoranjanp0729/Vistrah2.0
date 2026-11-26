import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas import ApplicationCreate

router = APIRouter()

@router.get("/categories")
def categories(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT id, name, slug, icon, description
        FROM categories WHERE active=true ORDER BY sort_order
    """)).mappings().all()
    return list(rows)

@router.get("/categories/{slug}/services")
def category_services(slug: str, db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT s.id, s.name, s.slug, s.description, s.base_price_paise, s.quote_required
        FROM services s JOIN categories c ON c.id=s.category_id
        WHERE c.slug=:slug AND s.active=true ORDER BY s.name
    """), {"slug": slug}).mappings().all()
    return list(rows)

@router.get("/services/{service_id}/requirements")
def service_requirements(service_id: str, db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT field_key, label, field_type, required, options_json
        FROM requirement_fields
        WHERE service_id=:id ORDER BY sort_order
    """), {"id": service_id}).mappings().all()
    return list(rows)

@router.post("/applications")
def create_application(payload: ApplicationCreate, db: Session = Depends(get_db)):
    service = db.execute(text("""
        SELECT base_price_paise, quote_required FROM services WHERE id=:id AND active=true
    """), {"id": payload.service_id}).mappings().first()
    if not service:
        raise HTTPException(404, "Service not found")

    application_id = str(uuid.uuid4())
    number = "VST-" + uuid.uuid4().hex[:10].upper()
    price = None if service["quote_required"] else service["base_price_paise"]

    db.execute(text("""
        INSERT INTO applications
        (id, application_number, user_id, service_id, status, requirement_data,
         quoted_amount_paise, final_amount_paise)
        VALUES (:id,:number,:user,:service,'SUBMITTED',:data,:price,:price)
    """), {
        "id": application_id, "number": number, "user": payload.user_id,
        "service": payload.service_id, "data": payload.requirement_data,
        "price": price
    })
    db.execute(text("""
        INSERT INTO application_status_history(application_id,status,note)
        VALUES(:id,'SUBMITTED','Application received by Vistra')
    """), {"id": application_id})
    db.commit()

    return {
        "application_id": application_id,
        "application_number": number,
        "status": "SUBMITTED",
        "final_amount_paise": price,
        "message": "Application submitted successfully"
    }

@router.get("/applications/{application_number}")
def application_detail(application_number: str, db: Session = Depends(get_db)):
    row = db.execute(text("""
        SELECT a.application_number, a.status, a.requirement_data,
               a.final_amount_paise, s.name AS service_name, a.created_at, a.updated_at
        FROM applications a JOIN services s ON s.id=a.service_id
        WHERE a.application_number=:number
    """), {"number": application_number}).mappings().first()
    if not row:
        raise HTTPException(404, "Application not found")
    history = db.execute(text("""
        SELECT status, note, created_at
        FROM application_status_history h
        JOIN applications a ON a.id=h.application_id
        WHERE a.application_number=:number ORDER BY h.created_at
    """), {"number": application_number}).mappings().all()
    return {"application": dict(row), "history": list(history)}

@router.get("/applications")
def applications(user_id: str, db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT a.application_number, a.status, a.final_amount_paise,
               s.name AS service_name, a.created_at
        FROM applications a JOIN services s ON s.id=a.service_id
        WHERE a.user_id=:user ORDER BY a.created_at DESC
    """), {"user": user_id}).mappings().all()
    return list(rows)

@router.post("/referrals/validate")
def validate_referral(code: str, db: Session = Depends(get_db)):
    row = db.execute(text("""
        SELECT referral_code FROM users WHERE referral_code=:code
    """), {"code": code}).first()
    if not row:
        raise HTTPException(404, "Referral code not found")
    return {"valid": True, "discount_percent": 20}

@router.get("/referrals")
def referral_summary(user_id: str, db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT status, COUNT(*) AS count
        FROM referrals WHERE referrer_user_id=:user GROUP BY status
    """), {"user": user_id}).mappings().all()
    return {"user_id": user_id, "reward_rule": "20% for both after referred user's first work is completed", "summary": list(rows)}
