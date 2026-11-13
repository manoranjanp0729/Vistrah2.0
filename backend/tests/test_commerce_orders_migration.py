"""015 preserves legacy listings and refuses to erase reviewed terms or orders."""
import os
import subprocess
import sys
from pathlib import Path


def test_order_migration_preserves_legacy_listing_and_guards_reviewed_data(tmp_path):
    database=tmp_path/'orders-migration.db'
    env={**os.environ,'DATABASE_URL':'sqlite:///'+database.as_posix(),'JWT_SECRET':'disposable-commerce-order-migration'}
    script='''
from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import engine
from app.models import User,Provider
cfg=Config('alembic.ini')
command.upgrade(cfg,'014')
with Session(engine) as db:
 db.add(User(id=1,email='legacy@example.com',name='Legacy',password_hash='no-login'))
 db.flush()
 db.add(Provider(id=1,owner_user_id=1,slug='legacy',name='Legacy',company='Legacy',email='legacy@example.com',phone='',address='',location='',provenance='Disposable migration test'))
 db.commit()
with engine.begin() as c:
 c.execute(text("INSERT INTO commerce_listings (id,provider_id,seller_id,kind,title,description,unit_price_paise,currency,available,status,revision,review_note,created_at,updated_at) VALUES ('legacy',1,1,'PRODUCT','Legacy','Disposable fixture only',100,'INR',1,'APPROVED',2,'',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)"))
for target,direction in [('015','up'),('014','down'),('015','up')]:
 (command.upgrade if direction=='up' else command.downgrade)(cfg,target)
 with engine.connect() as c:
  assert c.execute(text("SELECT unit_price_paise FROM commerce_listings WHERE id='legacy'")).scalar()==100
  assert not c.execute(text('PRAGMA foreign_key_check')).all()
with engine.connect() as c:
 row=c.execute(text("SELECT fulfilment_operator,stock_quantity,allocated_quantity,cancellation_rule FROM commerce_listings WHERE id='legacy'")).one()
 assert tuple(row)==('SELLER',None,0,None)
with engine.begin() as c:
 c.execute(text("UPDATE commerce_listings SET stock_quantity=3,fulfilment_modes='[\\\"PICKUP\\\"]',cancellation_rule='BEFORE_DISPATCH' WHERE id='legacy'"))
try:
 command.downgrade(cfg,'014')
 raise AssertionError('Downgrade erased reviewed stock terms')
except RuntimeError as exc:
 assert 'Cannot downgrade' in str(exc)
with engine.connect() as c:
 assert c.execute(text('SELECT version_num FROM alembic_version')).scalar()=='015'
 assert c.execute(text("SELECT stock_quantity FROM commerce_listings WHERE id='legacy'")).scalar()==3
 assert not c.execute(text('PRAGMA foreign_key_check')).all()
engine.dispose()
'''
    result=subprocess.run([sys.executable,'-c',script],env=env,cwd=Path(__file__).resolve().parents[1],capture_output=True,text=True)
    assert result.returncode==0,result.stdout+result.stderr
