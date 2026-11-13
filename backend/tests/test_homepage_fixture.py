import pytest
from app.homepage_test_fixture import validate_target


def target():
    return {'VISTRAH_TEST_PROJECT':'vistrah-homepage-test','APP_ENV':'development',
        'DATABASE_URL':'postgresql+psycopg://vistrah_homepage_test:test-only@db:5432/vistrah_homepage_test'}


def test_accepts_only_explicit_disposable_target():
    validate_target(target())


@pytest.mark.parametrize('field,value', [('VISTRAH_TEST_PROJECT','vistrah20'),('APP_ENV','production'),
    ('DATABASE_URL','postgresql+psycopg://vistrah:test-only@db:5432/vistrah'),
    ('DATABASE_URL','postgresql+psycopg://vistrah_homepage_test:test-only@remote:5432/vistrah_homepage_test'),
    ('DATABASE_URL','sqlite:///normal.db'),
    ('DATABASE_URL','postgresql+psycopg://vistrah_homepage_test:test-only@db:5432/vistrah_homepage_test?host=production'),
    ('DATABASE_URL','postgresql+psycopg://vistrah_homepage_test:test-only@db:6432/vistrah_homepage_test')])
def test_refuses_normal_or_ambiguous_targets(field,value):
    environ=target();environ[field]=value
    with pytest.raises(RuntimeError):validate_target(environ)


def test_fixture_creates_working_test_logins_and_retains_test_edits(tmp_path):
    import os
    import sys
    import subprocess
    from pathlib import Path
    database=tmp_path/'fixture-behaviour.db'
    env={**os.environ,'DATABASE_URL':'sqlite:///'+database.as_posix(),
        'JWT_SECRET':'isolated-fixture-behaviour-test-not-production','APP_ENV':'development'}
    script='''
# Guard validation has separate refusal tests. SQLite is used only for this
# fresh temporary behavioural test, never by the real fixture CLI.
from app import homepage_test_fixture as fixture
fixture.validate_target=lambda environ: None
fixture.main()
from app.database import SessionLocal
from app.models import User, BootstrapState
from sqlalchemy import select
with SessionLocal() as db:
 user=db.scalar(select(User).where(User.email==fixture.CUSTOMER_EMAIL))
 user.name='Retained customer edit';db.commit()
fixture.main()
with SessionLocal() as db:
 assert db.scalar(select(User).where(User.email==fixture.CUSTOMER_EMAIL)).name=='Retained customer edit'
 assert db.get(BootstrapState,fixture.MARKER)
 assert len(list(db.scalars(select(User))))==2
from fastapi.testclient import TestClient
from app.main import app
with TestClient(app) as client:
 for email,role in [(fixture.ADMIN_EMAIL,'ADMIN'),(fixture.CUSTOMER_EMAIL,'CUSTOMER')]:
  response=client.post('/auth/login',json={'email':email,'password':fixture.PASSWORD})
  assert response.status_code==200,response.text
  assert response.json()['user']['role']==role
'''
    result=subprocess.run([sys.executable,'-c',script],env=env,cwd=Path(__file__).resolve().parents[1],capture_output=True,text=True)
    assert result.returncode==0,result.stdout+result.stderr
