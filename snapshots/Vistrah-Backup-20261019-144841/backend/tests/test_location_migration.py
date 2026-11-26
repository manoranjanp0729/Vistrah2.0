"""011 round trip on a newly allocated synthetic database with populated history."""
import os
import subprocess
import sys
from pathlib import Path


def test_location_migration_retains_existing_ownership_listing_and_history(tmp_path):
    root=Path(__file__).resolve().parents[2]
    database=tmp_path/'location-migration.db'
    assert not database.exists()
    env={**os.environ,'DATABASE_URL':'sqlite:///'+database.as_posix(),'JWT_SECRET':'disposable-location-migration-not-production'}
    script='''
import json
from alembic import command
from alembic.config import Config
from sqlalchemy import text
from app.database import engine
cfg=Config('alembic.ini')
command.upgrade(cfg,'010')
with engine.begin() as c:
 c.execute(text("INSERT INTO users(id,email,name,password_hash,phone,role,seller_enabled,created_at) VALUES(1,'fixture@example.com','Fixture','no-login','','CUSTOMER',1,CURRENT_TIMESTAMP)"))
 c.execute(text("INSERT INTO categories(id,slug,title,description,image,active) VALUES(1,'fixture','Fixture','Fixture','',1)"))
 c.execute(text("INSERT INTO services(id,category_id,slug,title,description,includes,image,popular,active) VALUES(1,1,'fixture-service','Fixture','Fixture','[]','',0,1)"))
 c.execute(text("INSERT INTO providers(id,owner_user_id,slug,name,company,email,phone,address,location,source_url,provenance,verification_status,verification_evidence,active,created_at,updated_at) VALUES(1,1,'owned-fixture','Fixture','Owned fixture','fixture@example.com','','Existing address','Existing locality','','Fixture','VERIFIED','Original evidence',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)"))
 c.execute(text("INSERT INTO provider_services(provider_id,service_id,approval_status,description) VALUES(1,1,'APPROVED','Original reviewed description')"))
 c.execute(text("INSERT INTO provider_ownership_claims(id,provider_id,user_id,statement,status,review_note,created_at,needs_more_info) VALUES('existing',1,1,'Original history','APPROVED','Independent review',CURRENT_TIMESTAMP,0)"))
 c.execute(text("INSERT INTO provider_ownership_claim_events(claim_id,actor_id,action,reason,created_at) VALUES('existing',1,'APPROVED','Original review history',CURRENT_TIMESTAMP)"))
 c.execute(text("INSERT INTO service_requests(id,user_id,service_id,requirements,location,phone,status,created_at,updated_at) VALUES(1,1,1,'Original request','Original locality','','ASSIGNED',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)"))
 c.execute(text("INSERT INTO provider_leads(request_id,provider_id,service_id,actor_id,created_at) VALUES(1,1,1,1,CURRENT_TIMESTAMP)"))
tables=['users','providers','provider_services','provider_ownership_claims','provider_ownership_claim_events','service_requests','provider_leads']
with engine.connect() as c:
 columns={table:[row[1] for row in c.execute(text('PRAGMA table_info('+table+')'))] for table in tables}
def snapshot():
 with engine.connect() as c:
  return [c.execute(text('SELECT '+','.join(columns[table])+' FROM '+table)).all() for table in tables]
before=snapshot()
command.upgrade(cfg,'011')
assert snapshot()==before
with engine.begin() as c:
 assert c.execute(text('SELECT latitude,longitude FROM providers')).one()==(None,None)
 assert c.execute(text('SELECT coverage_radius_km FROM provider_services')).scalar() is None
 assert c.execute(text('SELECT saved_location FROM users')).scalar() is None
 c.execute(text('UPDATE providers SET latitude=12.0,longitude=77.0 WHERE id=1'))
 c.execute(text('UPDATE provider_services SET coverage_radius_km=25.0'))
 c.execute(text('UPDATE users SET saved_location=:location'),{'location':json.dumps({'latitude':12.0,'longitude':77.0,'locality':'Synthetic'})})
command.downgrade(cfg,'010')
assert snapshot()==before
command.upgrade(cfg,'011')
assert snapshot()==before
with engine.connect() as c:
 assert not c.execute(text('PRAGMA foreign_key_check')).all()
 assert c.execute(text('PRAGMA foreign_keys')).scalar()==1
engine.dispose()
'''
    result=subprocess.run([sys.executable,'-c',script],cwd=root/'backend',env=env,text=True,capture_output=True)
    assert result.returncode==0,result.stdout+result.stderr
