import os
import subprocess
import sys


def test_additive_migration_preserves_legacy_and_refuses_history_deletion(tmp_path):
    database=tmp_path/'disposable-membership-migration.db'
    env={**os.environ,'DATABASE_URL':'sqlite:///'+database.as_posix(),'JWT_SECRET':'disposable-membership-migration-secret'}
    script='''
from alembic import command
from alembic.config import Config
from sqlalchemy import text,inspect
from app.database import engine
cfg=Config('alembic.ini')
command.upgrade(cfg,'016')
with engine.begin() as db:
 db.execute(text("INSERT INTO plans (id,name,amount,currency,days) VALUES (999,'Historical membership',77700,'INR',31)"))
 db.execute(text("INSERT INTO users (id,email,name,password_hash,phone,role,created_at) VALUES (999,'migration@example.com','Synthetic','disabled','','CUSTOMER',CURRENT_TIMESTAMP)"))
 db.execute(text("INSERT INTO payments (id,user_id,plan_id,amount,currency,status,mode,idempotency_key,created_at) VALUES ('historical-payment',999,999,77700,'INR','SUCCEEDED','SANDBOX','historical-key',CURRENT_TIMESTAMP)"))
 db.execute(text("INSERT INTO memberships (id,user_id,payment_id,starts_at,expires_at,revoked) VALUES (999,999,'historical-payment',CURRENT_TIMESTAMP,datetime('now','+31 days'),0)"))
command.upgrade(cfg,'017')
with engine.connect() as db:
 assert db.execute(text('SELECT amount FROM plans WHERE id=999')).scalar()==77700
 assert db.execute(text("SELECT status FROM payments WHERE id='historical-payment'")).scalar()=='SUCCEEDED'
 assert db.execute(text('SELECT revoked FROM memberships WHERE id=999')).scalar()==0
 assert 'business_subscriptions' in inspect(db).get_table_names()
command.downgrade(cfg,'016')
command.upgrade(cfg,'017')
with engine.begin() as db:
 db.execute(text("INSERT INTO business_subscriptions (id,user_id,non_renewing,created_at) VALUES ('preserve-history',999,0,CURRENT_TIMESTAMP)"))
try:
 command.downgrade(cfg,'016')
except RuntimeError as error:
 assert 'Refuse' in str(error)
else: raise AssertionError('Historical membership removal was not refused')
with engine.connect() as db:
 assert db.execute(text('SELECT amount FROM plans WHERE id=999')).scalar()==77700
engine.dispose()
'''
    result=subprocess.run([sys.executable,'-c',script],env=env,capture_output=True,text=True)
    assert result.returncode==0,result.stdout+result.stderr
