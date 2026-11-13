"""Explicitly disposable browser fixture. Never starts or modifies normal services."""
import os
from pathlib import Path
from sqlalchemy.engine import make_url

root=Path(__file__).resolve().parents[2]
assert os.environ.get('VISTRAH_MEMBERSHIP_PREVIEW')=='1'
url=make_url(os.environ['DATABASE_URL'])
target=Path(url.database).resolve()
assert url.drivername=='sqlite' and target.parent==root/'artifacts'/'business-membership' and target.name.startswith('membership-preview-')
assert not target.exists(), 'Refuse to overwrite an existing preview database'

from alembic import command
from alembic.config import Config
from app.database import SessionLocal
from app.models import User,Provider
from app.seed import seed
from app.security import passwords
command.upgrade(Config('alembic.ini'),'head')
with SessionLocal() as db:
    seed(db)
    for name,role,seller in [('seller','CUSTOMER',True),('seller-mobile','CUSTOMER',True),('customer','CUSTOMER',False),('admin','ADMIN',False)]:
        user=User(name='Synthetic '+name,email=name+'@membership.example.com',password_hash=passwords.hash('preview-only-password'),seller_enabled=seller,role=role)
        db.add(user);db.flush()
        if seller:db.add(Provider(owner_user_id=user.id,slug='membership-preview-'+name,name=user.name,company='Synthetic membership business',email=user.email,phone='',address='',location='',provenance='Disposable membership browser fixture',verification_status='VERIFIED',active=True))
    db.commit()
print('Disposable membership preview initialized')
