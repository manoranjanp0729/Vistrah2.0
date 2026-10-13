"""Real PostgreSQL confirmation race in an isolated disposable schema, never public data."""
import os
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine,select,text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session
from app.database import Base,get_db
from app.main import app
from app.models import User,Provider
from app.commerce_models import CommerceListing
from app.commerce_order_models import CommerceOrder
from app.security import passwords,issue_token


def test_postgres_two_confirmations_cannot_oversell():
    url=os.getenv('TEST_DATABASE_URL','')
    if not url.startswith('postgresql'):
        pytest.skip('Real PostgreSQL concurrency runs only in the isolated CI test database')
    parsed=make_url(url)
    assert parsed.host in ('127.0.0.1','localhost') and parsed.database=='vistrah_ci_test' and parsed.username=='vistrah_ci', 'Refuse non-disposable PostgreSQL target'
    schema='commerce_race_'+uuid4().hex
    controller=create_engine(url)
    isolated=None
    try:
        with controller.begin() as connection:connection.execute(text('CREATE SCHEMA '+schema))
        isolated=create_engine(url,connect_args={'options':'-csearch_path='+schema})
        Base.metadata.create_all(isolated)
        with Session(isolated,expire_on_commit=False) as db:
            seller=User(name='Race seller',email='seller-race@example.com',seller_enabled=True,password_hash=passwords.hash('fixture-only'))
            customer=User(name='Race customer',email='customer-race@example.com',password_hash=passwords.hash('fixture-only'))
            db.add_all([seller,customer]);db.flush()
            provider=Provider(owner_user_id=seller.id,slug='race-business',name='Race',company='Race',email=seller.email,phone='',address='',location='',provenance='Disposable race fixture',active=True,verification_status='VERIFIED')
            db.add(provider);db.flush()
            listing=CommerceListing(id=str(uuid4()),provider_id=provider.id,seller_id=seller.id,kind='PRODUCT',title='Race product',description='Disposable concurrency test product.',unit_price_paise=100,currency='INR',available=True,status='APPROVED',stock_quantity=1,fulfilment_modes=['PICKUP'],cancellation_rule='BEFORE_DISPATCH')
            db.add(listing);db.flush()
            orders=[]
            for i in range(2):
                row=CommerceOrder(id=str(uuid4()),customer_id=customer.id,listing_id=listing.id,provider_id=provider.id,seller_id=seller.id,fulfilment_operator='SELLER',kind='PRODUCT',title=listing.title,business='Race',listing_revision=listing.revision,unit_price_paise=100,quantity=1,fulfilment_method='PICKUP',delivery_fee_paise=0,quoted_total_paise=100,cancellation_rule='BEFORE_DISPATCH',phone='9000000000',idempotency_key='race-key-'+str(i),request_hash='a'*64)
                db.add(row);orders.append(row.id)
            db.commit();token=issue_token(db,seller);provider_id=provider.id;listing_id=listing.id
        def isolated_session():
            with Session(isolated) as db:yield db
        previous=app.dependency_overrides.get(get_db)
        app.dependency_overrides[get_db]=isolated_session
        try:
            def confirm(order_id):
                with TestClient(app) as client:
                    return client.post(f'/seller/businesses/{provider_id}/commerce-orders/{order_id}/transition',headers={'Authorization':'Bearer '+token},json={'revision':1,'status':'CONFIRMED'}).status_code
            with ThreadPoolExecutor(max_workers=2) as executor:results=list(executor.map(confirm,orders))
            assert sorted(results)==[200,409]
            with Session(isolated) as db:
                assert db.get(CommerceListing,listing_id).allocated_quantity==1
                assert len(db.scalars(select(CommerceOrder).where(CommerceOrder.status=='CONFIRMED')).all())==1
        finally:
            if previous is None:app.dependency_overrides.pop(get_db,None)
            else:app.dependency_overrides[get_db]=previous
    finally:
        if isolated is not None:isolated.dispose()
        with controller.begin() as connection:connection.execute(text('DROP SCHEMA IF EXISTS '+schema+' CASCADE'))
        controller.dispose()
