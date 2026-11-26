import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
import bcrypt
from jose import jwt
from app.core.config import settings
from app.core.database import get_db
from fastapi import Body
from app.schemas import ApplicationCreate, SignupRequest, LoginRequest, ReferralValidateRequest

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
def validate_referral(
    payload: ReferralValidateRequest | None = Body(default=None),
    code: str | None = None,
    db: Session = Depends(get_db),
):
    referral_code = (payload.code if payload else code or "").strip()
    if not referral_code:
        raise HTTPException(400, "Referral code is required")

    row = db.execute(text("""
        SELECT referral_code FROM users WHERE referral_code=:code
    """), {"code": referral_code}).first()
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

@router.post("/auth/signup")
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    full_name = payload.full_name.strip()
    referral_code = payload.referral_code.strip().upper() if payload.referral_code else None

    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(400, "Please enter a valid email address")

    if referral_code:
        referrer = db.execute(
            text("SELECT id FROM users WHERE referral_code=:referral_code"),
            {"referral_code": referral_code}
        ).first()
        if not referrer:
            raise HTTPException(400, "Referral code is invalid")

    existing = db.execute(
        text("SELECT id FROM users WHERE email=:email"),
        {"email": email}
    ).first()

    if existing:
        raise HTTPException(409, "An account with this email already exists")

    password_bytes = payload.password.encode("utf-8")

    if len(password_bytes) > 72:
        raise HTTPException(400, "Password is too long")

    password_hash = bcrypt.hashpw(
        password_bytes,
        bcrypt.gensalt()
    ).decode("utf-8")

    generated_referral_code = None

    for _ in range(10):
        candidate = "VST-" + uuid.uuid4().hex[:8].upper()

        exists = db.execute(
            text("SELECT 1 FROM users WHERE referral_code=:code"),
            {"code": candidate}
        ).first()

        if not exists:
            generated_referral_code = candidate
            break

    if not generated_referral_code:
        raise HTTPException(500, "Unable to generate referral code")

    user_id = str(uuid.uuid4())

    db.execute(
        text("""
            INSERT INTO users
            (id, email, full_name, phone, referral_code, password_hash)
            VALUES
            (:id, :email, :full_name, :phone, :referral_code, :password_hash)
        """),
        {
            "id": user_id,
            "email": email,
            "full_name": full_name,
            "phone": payload.phone.strip() if payload.phone else None,
            "referral_code": generated_referral_code,
            "password_hash": password_hash
        }
    )

    db.commit()

    token = jwt.encode(
        {
            "sub": str(user_id),
            "email": email,
        },
        settings.jwt_secret,
        algorithm="HS256"
    )

    return {
        "message": "Account created successfully",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": email,
            "full_name": full_name,
            "phone": payload.phone.strip() if payload.phone else None,
            "referral_code": generated_referral_code
        }
    }

@router.post("/auth/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()

    user = db.execute(
        text("""
            SELECT id, email, full_name, phone, referral_code, password_hash
            FROM users
            WHERE email=:email
        """),
        {"email": email}
    ).mappings().first()

    if not user:
        raise HTTPException(401, "Invalid email or password")

    try:
        password_valid = bcrypt.checkpw(
            payload.password.encode("utf-8"),
            user["password_hash"].encode("utf-8")
        )
    except Exception:
        password_valid = False

    if not password_valid:
        raise HTTPException(401, "Invalid email or password")

    token = jwt.encode(
        {
            "sub": str(user["id"]),
            "email": user["email"]
        },
        settings.jwt_secret,
        algorithm="HS256"
    )

    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user["id"]),
            "email": user["email"],
            "full_name": user["full_name"],
            "phone": user["phone"],
            "referral_code": user["referral_code"]
        }
    }
