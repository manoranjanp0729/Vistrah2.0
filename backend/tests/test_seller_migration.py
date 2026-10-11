"""007 round trip with populated synthetic legacy tables; never normal database."""
import os
import subprocess
import sys
import uuid
from pathlib import Path

def test_additive_ownership_migration_preserves_legacy_records():
    database=Path(__file__).resolve().parents[2]/'.tools'/f'i3-migration-{uuid.uuid4()}.db'
    env={**os.environ,'DATABASE_URL':'sqlite:///'+database.as_posix(),'JWT_SECRET':'isolated-migration-fixture-only-not-production','APP_ENV':'development'}
    script="""
from alembic import command
from alembic.config import Config
from app.database import engine
from sqlalchemy import text
cfg=Config('alembic.ini')
command.upgrade(cfg,'006')
with engine.begin() as c:
 c.execute(text("INSERT INTO users (id,email,name,password_hash,phone,role,created_at) VALUES (1,'synthetic@example.com','Synthetic','not-a-login-hash','','CUSTOMER',CURRENT_TIMESTAMP)"))
 c.execute(text("INSERT INTO categories (id,slug,title,description,image,active) VALUES (1,'synthetic','Synthetic','Synthetic migration fixture','',1)"))
 c.execute(text("INSERT INTO services (id,category_id,slug,title,description,includes,image,popular,active) VALUES (1,1,'synthetic-service','Synthetic','Synthetic','[]','',0,1)"))
 c.execute(text("INSERT INTO providers (id,slug,name,company,email,phone,address,location,source_url,provenance,verification_status,verification_evidence,active,created_at,updated_at) VALUES (1,'legacy','Synthetic','Legacy','synthetic@example.com','','Address','Locality','','Synthetic','VERIFIED','Synthetic evidence',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)"))
 c.execute(text("INSERT INTO provider_applications (id,user_id,provider_id,category_id,common,common_configuration,status,revision,created_at,updated_at) VALUES ('legacy-app',1,1,1,'{}','{}','APPROVED',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)"))
 c.execute(text("INSERT INTO provider_services (provider_id,service_id,approval_status,application_id) VALUES (1,1,'APPROVED','legacy-app')"))
 c.execute(text("INSERT INTO provider_documents (id,application_id,service_id,field_id,filename,media_type,sha256,content,created_at) VALUES ('legacy-doc','legacy-app',1,'fixture','fixture.pdf','application/pdf','synthetic',X'1234',CURRENT_TIMESTAMP)"))
 c.execute(text("INSERT INTO provider_application_events (application_id,actor_id,kind,reason,details,created_at) VALUES ('legacy-app',1,'REVIEW_DECISION','Synthetic history','{}',CURRENT_TIMESTAMP)"))
command.upgrade(cfg,'007')
with engine.connect() as c:
 assert c.execute(text('SELECT seller_enabled FROM users WHERE id=1')).scalar()==0
 assert c.execute(text('SELECT owner_user_id FROM providers WHERE id=1')).scalar() is None
 assert c.execute(text('SELECT approval_status FROM provider_services')).scalar()=='APPROVED'
 assert c.execute(text('SELECT content FROM provider_documents')).scalar()==bytes.fromhex('1234')
 assert c.execute(text('SELECT count(*) FROM provider_application_events')).scalar()==1
command.downgrade(cfg,'006')
with engine.connect() as c:
 assert c.execute(text('SELECT count(*) FROM users')).scalar()==1
 assert c.execute(text('SELECT count(*) FROM providers')).scalar()==1
 assert c.execute(text('SELECT count(*) FROM provider_documents')).scalar()==1
 assert c.execute(text('SELECT count(*) FROM provider_application_events')).scalar()==1
command.upgrade(cfg,'007')
engine.dispose()
"""
    result=subprocess.run([sys.executable,'-c',script],env=env,cwd=Path(__file__).resolve().parents[1],text=True,capture_output=True)
    assert result.returncode==0,result.stdout+result.stderr
