"""009 round trip uses only a fresh synthetic SQLite database."""
import os
import subprocess
import sys
import uuid
from pathlib import Path

def test_claim_evidence_migration_preserves_existing_claim_and_is_append_only():
    root=Path(__file__).resolve().parents[2]
    database=root/'.tools'/f'wp03-02-claim-migration-{uuid.uuid4()}.db'
    assert not database.exists(), 'Refusing to use an existing database file'
    env={**os.environ,'DATABASE_URL':'sqlite:///'+database.as_posix(),'JWT_SECRET':'isolated-claim-migration-fixture-not-production','APP_ENV':'development'}
    script="""
from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from app.database import engine
cfg=Config('alembic.ini')
command.upgrade(cfg,'008')
with engine.begin() as c:
 c.execute(text(\"INSERT INTO users (id,email,name,password_hash,phone,role,created_at) VALUES (1,'legacy@example.test','Legacy','no-login','','CUSTOMER',CURRENT_TIMESTAMP)\"))
 c.execute(text(\"INSERT INTO categories (id,slug,title,description,image,active) VALUES (1,'synthetic','Synthetic','Migration fixture','',1)\"))
 c.execute(text(\"INSERT INTO services (id,category_id,slug,title,description,includes,image,popular,active) VALUES (1,1,'synthetic-service','Synthetic','Fixture','[]','',0,1)\"))
 c.execute(text(\"INSERT INTO providers (id,slug,name,company,email,phone,address,location,source_url,provenance,verification_status,verification_evidence,active,created_at,updated_at) VALUES (1,'legacy-provider','Legacy','Legacy Business','legacy@example.test','','Address','Locality','','Existing provenance','VERIFIED','Existing verification',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)\"))
 c.execute(text(\"INSERT INTO provider_ownership_claims (id,provider_id,user_id,statement,status,reviewer_id,review_note,created_at,reviewed_at) VALUES ('existing-claim',1,1,'Existing legacy statement','PENDING',NULL,'',CURRENT_TIMESTAMP,NULL)\"))
command.upgrade(cfg,'009')
with engine.begin() as c:
 row=c.execute(text(\"SELECT business_type,registration_evidence_available,contact_channel,contact_value,needs_more_info FROM provider_ownership_claims WHERE id='existing-claim'\")).one()
 assert tuple(row)==(None,None,None,None,0)
 c.execute(text(\"INSERT INTO provider_ownership_claim_evidence (id,claim_id,submitted_by,evidence_type,filename,media_type,sha256,content,created_at) VALUES ('e1','existing-claim',1,'AUTHORITY','safe.pdf','application/pdf','fixture',X'255044462D312E34',CURRENT_TIMESTAMP)\"))
 c.execute(text(\"INSERT INTO provider_ownership_claim_events (claim_id,actor_id,action,reason,created_at) VALUES ('existing-claim',1,'EVIDENCE_ADDED','Fixture history',CURRENT_TIMESTAMP)\"))
 try:
  c.execute(text(\"UPDATE provider_ownership_claim_evidence SET content=X'00' WHERE id='e1'\"))
  raise AssertionError('Evidence update unexpectedly succeeded')
 except SQLAlchemyError:pass
 try:
  c.execute(text(\"DELETE FROM provider_ownership_claim_events WHERE claim_id='existing-claim'\"))
  raise AssertionError('Event deletion unexpectedly succeeded')
 except SQLAlchemyError:pass
command.downgrade(cfg,'008')
with engine.connect() as c:
 assert c.execute(text(\"SELECT count(*) FROM provider_ownership_claims WHERE id='existing-claim'\")).scalar()==1
 assert c.execute(text(\"SELECT owner_user_id FROM providers WHERE id=1\")).scalar() is None
 assert c.execute(text(\"SELECT count(*) FROM provider_services\")).scalar()==0
engine.dispose()
"""
    result=subprocess.run([sys.executable,'-c',script],env=env,cwd=root/'backend',text=True,capture_output=True)
    assert result.returncode==0,result.stdout+result.stderr