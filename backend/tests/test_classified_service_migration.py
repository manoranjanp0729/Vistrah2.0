"""021 preserves populated listing/cart/order references and guards downgrade."""
import os
from pathlib import Path
import subprocess
import sys

def test_classified_service_migration(tmp_path):
    database=tmp_path/'classified-migration.db'
    assert not database.exists()
    env={**os.environ,'DATABASE_URL':'sqlite:///'+database.as_posix(),
         'JWT_SECRET':'disposable-classification-migration-test-secret'}
    script='''
from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import engine
cfg=Config('alembic.ini')
command.upgrade(cfg,'020')
from app.models import User,Provider
from app.commerce_models import CommerceListing
from app.commerce_order_models import CartLine,CommerceOrder
with Session(engine) as db:
 db.add(User(id=1,name='Test seller',email='migration@example.test',password_hash='no-login',seller_enabled=True));db.flush()
 db.add(Provider(id=1,owner_user_id=1,slug='test-business',name='Test',company='Test',email='migration@example.test',phone='',address='',location='',provenance='Disposable migration fixture',verification_status='VERIFIED',active=True));db.flush()
 db.add(CommerceListing(id='old-listing',provider_id=1,seller_id=1,kind='PRODUCT',title='Original product',description='Original description retained',unit_price_paise=12345,currency='INR',available=True,status='APPROVED'));db.flush()
 db.add(CartLine(id='old-cart',customer_id=1,listing_id='old-listing',quantity=1))
 db.add(CommerceOrder(id='old-order',customer_id=1,listing_id='old-listing',provider_id=1,seller_id=1,fulfilment_operator='SELLER',kind='PRODUCT',title='Original product',business='Test',listing_revision=1,unit_price_paise=12345,quantity=1,fulfilment_method='PICKUP',delivery_fee_paise=0,quoted_total_paise=12345,cancellation_rule='BEFORE_DISPATCH',phone='9000000000',idempotency_key='migration-order',request_hash='test-only'))
 db.commit()
for target,direction in [('021','up'),('020','down'),('021','up')]:
 (command.upgrade if direction=='up' else command.downgrade)(cfg,target)
 with engine.connect() as c:
  assert c.execute(text("SELECT title,unit_price_paise FROM commerce_listings WHERE id='old-listing'")).one()==('Original product',12345)
  assert c.execute(text("SELECT listing_id FROM commerce_cart_lines WHERE id='old-cart'")).scalar()=='old-listing'
  assert c.execute(text("SELECT quoted_total_paise FROM commerce_orders WHERE id='old-order'")).scalar()==12345
  assert c.exec_driver_sql('PRAGMA foreign_keys').scalar()==1
  assert not c.exec_driver_sql('PRAGMA foreign_key_check').all()
with Session(engine) as db:
 db.add(CommerceListing(id='classified',provider_id=1,seller_id=1,kind='SERVICE_PACKAGE',title='Classified service',description='Classified description retained',unit_price_paise=100,currency='INR',taxonomy_category_slug='food-and-dining',taxonomy_subcategory_slug='restaurants-and-dining',taxonomy_listing_type_slug='restaurants'))
 db.commit()
try:
 command.downgrade(cfg,'020')
 raise AssertionError('Downgrade erased classified service data')
except RuntimeError as exc:
 assert 'Cannot downgrade' in str(exc)
with engine.connect() as c:
 assert c.execute(text('SELECT version_num FROM alembic_version')).scalar()=='021'
 assert c.execute(text("SELECT title FROM commerce_listings WHERE id='classified'")).scalar()=='Classified service'
 assert not c.exec_driver_sql('PRAGMA foreign_key_check').all()
engine.dispose()
'''
    result=subprocess.run([sys.executable,'-c',script],env=env,cwd=Path(__file__).resolve().parents[1],capture_output=True,text=True)
    assert result.returncode==0,result.stdout+result.stderr
