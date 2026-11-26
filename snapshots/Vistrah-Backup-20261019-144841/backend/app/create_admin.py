import getpass
import sys
from sqlalchemy import select
from .database import SessionLocal
from .models import User
from .schemas import Register
from .security import passwords

if __name__ == '__main__':
    email = input('Admin email: ').strip()
    name = input('Admin name: ').strip()
    password = getpass.getpass('Password (at least 10 characters): ')
    data = Register(email=email, name=name, password=password)
    with SessionLocal() as db:
        if db.scalar(select(User).where(User.email == str(data.email).lower())):
            sys.exit('Email already exists; refusing to change an existing role.')
        db.add(User(email=str(data.email).lower(), name=data.name, password_hash=passwords.hash(data.password), role='ADMIN'))
        db.commit()
        print('Administrator created.')
