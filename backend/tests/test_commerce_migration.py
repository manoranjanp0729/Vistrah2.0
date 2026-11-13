"""014 preserves existing records and refuses to erase seller listings."""
import os
import subprocess
import sys
from pathlib import Path


def test_commerce_migration_preserves_existing_data_and_guards_downgrade(tmp_path):
    database = tmp_path / 'commerce-migration.db'
    assert not database.exists()
    env = {**os.environ, 'DATABASE_URL': 'sqlite:///' + database.as_posix(),
        'JWT_SECRET': 'isolated-commerce-migration-fixture-not-production'}
    script = '''
from alembic import command
from alembic.config import Config
from sqlalchemy import text
from app.database import engine
cfg = Config('alembic.ini')
command.upgrade(cfg, '013')
with engine.begin() as c:
 c.execute(text("INSERT INTO users (id,email,name,password_hash,phone,role,created_at) VALUES (1,'legacy@example.test','Legacy','no-login','','CUSTOMER',CURRENT_TIMESTAMP)"))
for target, direction in [('014', 'up'), ('013', 'down'), ('014', 'up')]:
 (command.upgrade if direction == 'up' else command.downgrade)(cfg, target)
 with engine.connect() as c:
  assert c.execute(text('SELECT email FROM users WHERE id=1')).scalar() == 'legacy@example.test'
  assert not c.execute(text('PRAGMA foreign_key_check')).all()
from sqlalchemy.orm import Session
from app.models import Provider
with Session(engine) as db:
 db.add(Provider(id=1,name='Legacy',company='Legacy',email='legacy@example.test',phone='',address='',location='',active=True,slug='legacy',verification_status='VERIFIED',owner_user_id=1,provenance='Disposable fixture'))
 db.commit()
with engine.begin() as c:
 c.execute(text("INSERT INTO commerce_listings (id,provider_id,seller_id,kind,title,description,unit_price_paise,currency,available,status,revision,review_note,created_at,updated_at) VALUES ('test',1,1,'PRODUCT','Test','Disposable fixture only',100,'INR',1,'DRAFT',1,'',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)"))
try:
 command.downgrade(cfg, '013')
 raise AssertionError('Downgrade erased seller data')
except RuntimeError as exc:
 assert 'Cannot downgrade' in str(exc)
with engine.connect() as c:
 assert c.execute(text('SELECT version_num FROM alembic_version')).scalar() == '014'
 assert c.execute(text('SELECT unit_price_paise FROM commerce_listings')).scalar() == 100
 assert not c.execute(text('PRAGMA foreign_key_check')).all()
engine.dispose()
'''
    result = subprocess.run([sys.executable, '-c', script], env=env, cwd=Path(__file__).resolve().parents[1], capture_output=True, text=True)
    assert result.returncode == 0, result.stdout + result.stderr
