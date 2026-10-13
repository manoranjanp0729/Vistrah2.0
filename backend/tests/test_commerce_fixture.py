import os
import subprocess
import sys
from pathlib import Path
import pytest
from app.commerce_test_fixture import main


def test_commerce_fixture_refuses_normal_target_before_connecting(monkeypatch):
    monkeypatch.setenv('VISTRAH_TEST_PROJECT','vistrah20')
    with pytest.raises(RuntimeError,match='dedicated development'):main()


def test_commerce_fixture_is_synthetic_opt_in_and_preserves_existing_edits(tmp_path):
    env={**os.environ,'DATABASE_URL':'sqlite:///'+(tmp_path/'commerce-fixture.db').as_posix(),'JWT_SECRET':'disposable-commerce-fixture-tests'}
    script='''
from sqlalchemy import select
from app import homepage_test_fixture as homepage
from app import commerce_test_fixture as commerce
# Bypass PostgreSQL target checks only in this separate SQLite subprocess test.
homepage.validate_target=lambda _:None
commerce.validate_target=lambda _:None
homepage.main()
commerce.main()
from app.database import SessionLocal,engine
from app.models import User,Provider
from app.commerce_models import CommerceListing
with SessionLocal() as db:
 assert len(db.scalars(select(User)).all())==4
 assert len(db.scalars(select(Provider)).all())==2
 listings=db.scalars(select(CommerceListing)).all()
 assert len(listings)==4
 assert all(row.seller_id!=row.reviewer_id for row in listings)
 assert sum(row.fulfilment_operator=='VISTRAH' for row in listings)==1
 row=listings[0];row.unit_price_paise=999;identity=row.id;db.commit()
commerce.main()
with SessionLocal() as db:
 assert db.get(CommerceListing,identity).unit_price_paise==999
 assert len(db.scalars(select(User)).all())==4
engine.dispose()
'''
    result=subprocess.run([sys.executable,'-c',script],env=env,cwd=Path(__file__).resolve().parents[1],capture_output=True,text=True)
    assert result.returncode==0,result.stdout+result.stderr
