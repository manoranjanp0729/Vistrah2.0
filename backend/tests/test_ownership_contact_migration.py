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
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from app.database import engine
from app.models import User, Provider
from app.provider_models import ProviderOwnershipClaim, ProviderOwnershipClaimEvidence, ProviderOwnershipClaimEvent
cfg=Config('alembic.ini')
command.upgrade(cfg,'009')
with Session(engine) as db:
 user=User(name='Legacy',email='legacy@example.com',password_hash='no-login')
 db.add(user);db.flush()
 provider=Provider(slug='legacy',name='Legacy',company='Synthetic',email=user.email,phone='1234567890',address='Fixture',location='Fixture',provenance='Fixture')
 db.add(provider);db.flush()
 claim=ProviderOwnershipClaim(id='legacy-claim',provider_id=provider.id,user_id=user.id,statement='Legacy statement retained')
 db.add(claim);db.flush()
 db.add_all([
  ProviderOwnershipClaimEvidence(id='legacy-evidence',claim_id=claim.id,submitted_by=user.id,evidence_type='AUTHORITY',filename='safe.pdf',media_type='application/pdf',sha256='1'*64,content=b'%PDF-1.4 synthetic'),
  ProviderOwnershipClaimEvent(claim_id=claim.id,actor_id=user.id,action='CLAIM_CREATED',reason='Legacy event')])
 db.commit()
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
