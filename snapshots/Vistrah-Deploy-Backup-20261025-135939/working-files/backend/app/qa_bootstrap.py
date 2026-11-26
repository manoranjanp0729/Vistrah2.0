"""Explicit local QA fixture; never invoked by normal startup."""
import os
from sqlalchemy import select
from .database import SessionLocal
from .models import User
from .security import passwords

if __name__ == '__main__':
    if os.getenv('QA_MODE') != 'true':
        raise SystemExit('QA_MODE=true is required; use only with an isolated local test database.')
    password = os.environ['QA_ADMIN_PASSWORD']
    if len(password) < 16:
        raise SystemExit('QA password must contain at least 16 characters')
    with SessionLocal() as db:
        user=db.scalar(select(User).where(User.email=='qa-admin@example.com'))
        if user and (user.role!='ADMIN' or user.name!='Development QA Administrator'):
            raise SystemExit('Refusing to modify an account not created by this QA fixture.')
        if not user:
            user=User(email='qa-admin@example.com',name='Development QA Administrator',role='ADMIN',password_hash=passwords.hash(password))
            db.add(user)
        else:
            user.password_hash=passwords.hash(password)
        db.commit()
        print('Explicit development QA administrator is ready.')
