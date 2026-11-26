from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret,
            algorithms=["HS256"],
        )
        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid authentication token")

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication token")

    user = db.execute(
        text("""
            SELECT id, email, full_name, phone, referral_code, role
            FROM users
            WHERE id=:id
        """),
        {"id": user_id},
    ).mappings().first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return dict(user)


def require_admin(current_user=Depends(get_current_user)):
    if current_user["role"] not in ("ADMIN", "SUPER_ADMIN"):
        raise HTTPException(status_code=403, detail="Administrator access required")

    return current_user
