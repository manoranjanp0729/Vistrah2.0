"""Populated 009/010 round trip and guarded downgrade on a fresh temporary database."""
import os
import subprocess
import sys
from pathlib import Path


def test_contact_migration_preserves_legacy_evidence_and_guards_grants(tmp_path):
    root = Path(__file__).resolve().parents[2]
    database = tmp_path / 'contact-migration.db'
    assert not database.exists()
    env = {**os.environ, 'DATABASE_URL': 'sqlite:///' + database.as_posix(),
           'JWT_SECRET': 'isolated-contact-migration-fixture-not-production'}
    script = '''
from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from app.database import engine
cfg=Config('alembic.ini')
command.upgrade(cfg,'009')
# Reflect revision 009 rather than using ORM models with later columns/defaults.
from sqlalchemy import MetaData, Table
metadata = MetaData()
tables = {name: Table(name, metadata, autoload_with=engine) for name in (
 'users', 'providers', 'provider_ownership_claims',
 'provider_ownership_claim_evidence', 'provider_ownership_claim_events')}
from datetime import datetime, timezone
created = datetime.now(timezone.utc)
with engine.begin() as c:
 c.execute(tables['users'].insert().values(id=1, name='Legacy', email='legacy@example.com',
  password_hash='no-login', phone='', role='CUSTOMER', seller_enabled=False, created_at=created))
 c.execute(tables['providers'].insert().values(id=1, slug='legacy', name='Legacy', company='Synthetic',
  email='legacy@example.com', phone='1234567890', address='Fixture', location='Fixture',
  source_url='', provenance='Fixture', verification_status='PENDING', verification_evidence='',
  publication_revision=0, active=True, created_at=created, updated_at=created))
 c.execute(tables['provider_ownership_claims'].insert().values(id='legacy-claim', provider_id=1, user_id=1,
  statement='Legacy statement retained', status='PENDING', review_note='', needs_more_info=False, created_at=created))
 c.execute(tables['provider_ownership_claim_evidence'].insert().values(id='legacy-evidence',
  claim_id='legacy-claim', submitted_by=1, evidence_type='AUTHORITY', filename='safe.pdf',
  media_type='application/pdf', sha256='1'*64, content=b'%PDF-1.4 synthetic', created_at=created))
 c.execute(tables['provider_ownership_claim_events'].insert().values(claim_id='legacy-claim',
  actor_id=1, action='CLAIM_CREATED', reason='Legacy event', created_at=created))
def snapshot():
 with engine.connect() as c:
  return [c.execute(text('SELECT * FROM '+table+' ORDER BY id')).all() for table in ('users','providers','provider_ownership_claims','provider_ownership_claim_evidence','provider_ownership_claim_events')]
before=snapshot()
for target, direction in [('010','up'),('009','down'),('010','up')]:
 (command.upgrade if direction=='up' else command.downgrade)(cfg,target)
 assert snapshot()==before
 with engine.connect() as c:
  assert c.execute(text('PRAGMA foreign_keys')).scalar()==1
  assert not c.execute(text('PRAGMA foreign_key_check')).all()
with engine.begin() as c:
 assert c.execute(text('SELECT count(*) FROM provider_ownership_contact_challenges')).scalar()==0
for sql in ["DELETE FROM provider_ownership_claim_events", "UPDATE provider_ownership_claim_events SET reason='changed'", "DELETE FROM provider_ownership_claim_evidence"]:
 try:
  with engine.begin() as c:c.execute(text(sql))
  raise AssertionError('Retained history unexpectedly mutable')
 except SQLAlchemyError:pass
with engine.begin() as c:
 c.execute(text("UPDATE provider_ownership_claims SET status='APPROVED' WHERE id='legacy-claim'"))
 c.execute(text("UPDATE providers SET owner_user_id=1"))
 c.execute(text("INSERT INTO provider_ownership_claim_events (claim_id,actor_id,action,reason,created_at) VALUES ('legacy-claim',1,'APPROVED','Synthetic independent approval',CURRENT_TIMESTAMP)"))
try:
 command.downgrade(cfg,'009')
 raise AssertionError('Downgrade erased a grant or new history')
except RuntimeError as exc:
 assert 'Cannot downgrade' in str(exc)
with engine.connect() as c:
 assert c.execute(text('SELECT owner_user_id FROM providers')).scalar()==1
 assert c.execute(text('SELECT version_num FROM alembic_version')).scalar()=='010'
engine.dispose()
'''
    result = subprocess.run([sys.executable, '-c', script], env=env, cwd=root / 'backend', text=True, capture_output=True)
    assert result.returncode == 0, result.stdout + result.stderr

