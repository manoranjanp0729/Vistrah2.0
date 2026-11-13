"""008 round trip preserves populated legacy businesses and service grants."""
import os
import subprocess
import sys
from pathlib import Path

def test_publication_migration_round_trip(tmp_path):
    path=tmp_path/'publication-migration.db'
    env={**os.environ,'DATABASE_URL':'sqlite:///'+path.as_posix(),'JWT_SECRET':'isolated-publication-migration-test-only','APP_ENV':'development'}
    script="""
from alembic import command
from alembic.config import Config
from app.database import engine
from sqlalchemy import text
cfg=Config('alembic.ini');command.upgrade(cfg,'007')
with engine.begin() as c:
 c.execute(text("INSERT INTO users (id,email,name,password_hash,phone,role,created_at,seller_enabled) VALUES (1,'synthetic@example.com','Synthetic','not-a-login-hash','','CUSTOMER',CURRENT_TIMESTAMP,1)"))
 c.execute(text("INSERT INTO categories (id,slug,title,description,image,active) VALUES (1,'synthetic','Synthetic','Synthetic migration fixture','',1)"))
 c.execute(text("INSERT INTO services (id,category_id,slug,title,description,includes,image,popular,active) VALUES (1,1,'synthetic-service','Synthetic','Synthetic','[]','',0,1)"))
 c.execute(text("INSERT INTO providers (id,slug,name,company,email,phone,address,location,source_url,provenance,verification_status,verification_evidence,active,created_at,updated_at,owner_user_id) VALUES (1,'legacy','Synthetic','Legacy','synthetic@example.com','','Address','Locality','','Synthetic','VERIFIED','Synthetic evidence',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,1)"))
 c.execute(text("INSERT INTO provider_services (provider_id,service_id,approval_status) VALUES (1,1,'APPROVED')"))
command.upgrade(cfg,'008')
with engine.connect() as c:
 assert c.execute(text('SELECT publication_revision FROM providers')).scalar()==0
 assert c.execute(text('SELECT description FROM provider_services')).scalar()==''
 assert c.execute(text('SELECT approval_status FROM provider_services')).scalar()=='APPROVED'
command.downgrade(cfg,'007')
with engine.connect() as c:
 assert c.execute(text('SELECT owner_user_id FROM providers')).scalar()==1
 assert c.execute(text('SELECT approval_status FROM provider_services')).scalar()=='APPROVED'
command.upgrade(cfg,'008');engine.dispose()
"""
    result=subprocess.run([sys.executable,'-c',script],env=env,cwd=Path(__file__).resolve().parents[1],capture_output=True,text=True)
    assert result.returncode==0,result.stdout+result.stderr

