"""Run with unittest: in-memory fixtures only; never pytest/conftest or normal DB."""
import importlib
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'backend'))
BOOT=tempfile.TemporaryDirectory(prefix='vistrah-pricing-test-')
with patch.dict(os.environ,{'DATABASE_URL':'sqlite:///'+str(Path(BOOT.name)/'unused.db'),'JWT_SECRET':'isolated-pricing-secret-not-real-1234567890','APP_ENV':'development'}):
    routes=importlib.import_module('app.marketing_pricing_routes')
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine,event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from app.database import engine as normal_engine
from app.models import User,Audit
from app.marketing_pricing_models import MarketingPriceOverride,MarketingPricingQuote

@event.listens_for(normal_engine,'connect')
def forbid_normal_connection(*args):raise AssertionError('Normal DB must never be used')

class PricingTests(unittest.TestCase):
    def setUp(self):
        self.engine=create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
        self.addCleanup(self.engine.dispose)
        for table in (User.__table__,Audit.__table__,MarketingPriceOverride.__table__,MarketingPricingQuote.__table__):table.create(self.engine)
        self.db=Session(self.engine)
        self.addCleanup(self.db.close)
        self.db.add_all([User(id=1,email='one@example.test',name='Fixture One',password_hash='not-used'),User(id=2,email='two@example.test',name='Fixture Two',password_hash='not-used'),User(id=3,email='admin@example.test',name='Fixture Admin',password_hash='not-used',role='ADMIN')]);self.db.commit()
        self.user=self.db.get(User,1)
        app=FastAPI();app.include_router(routes.router)
        app.dependency_overrides[routes.get_db]=lambda:self.db
        app.dependency_overrides[routes.current_user]=lambda:self.user
        app.dependency_overrides[routes.member_user]=lambda:self.user
        app.dependency_overrides[routes.admin_user]=lambda:self.db.get(User,3)
        self.app=app
        self.client=TestClient(app)
        self.addCleanup(self.client.close)
        self.payload={'service_id':'social-management','city':'Fixture City','business_name':'Fixture Business','contact_name':'Fixture Person','email':'fixture@example.com','phone':'9876543210','requirements':'Synthetic disposable project requirements.','idempotency_key':'fixture-request-001','months':2}

    def test_additive_migration_upgrade_and_downgrade_on_disposable_database(self):
        from alembic.migration import MigrationContext
        from alembic.operations import Operations
        from sqlalchemy import inspect
        spec=importlib.util.spec_from_file_location('pricing_migration',ROOT/'backend/migrations/versions/023_marketing_pricing.py')
        migration=importlib.util.module_from_spec(spec);spec.loader.exec_module(migration)
        fixture=create_engine('sqlite://')
        try:
            User.__table__.create(fixture)
            with fixture.begin() as connection:
                with Operations.context(MigrationContext.configure(connection)):
                    migration.upgrade()
                    self.assertIn('marketing_pricing_quotes',inspect(connection).get_table_names())
                    migration.downgrade()
                    self.assertEqual(inspect(connection).get_table_names(),['users'])
        finally:fixture.dispose()

    def test_catalogue_and_quote_only_prices_are_public_proposals(self):
        data=self.client.get('/marketing-pricing/catalogue').json()
        self.assertEqual(len(data['categories']),11);self.assertEqual(len(data['services']),34)
        self.assertEqual(len(data['packages']),4)
        for service in data['services']:
            self.assertEqual(set(service),set(routes.PUBLIC_FIELDS));self.assertEqual(service['pricing_state'],'PROPOSED')
            if service['category_ids'][0] in ('outdoor','mobility','screens','cinema','influencer'):self.assertIsNone(service['starting_price_paise'])

    def test_missing_tables_fail_truthfully_without_migration(self):
        MarketingPricingQuote.__table__.drop(self.engine)
        self.assertFalse(self.client.get('/marketing-pricing/capabilities').json()['quote_requests_available'])
        self.assertEqual(self.client.post('/marketing-pricing/quotes',json=self.payload).status_code,503)
        self.assertEqual(self.client.get('/marketing-pricing/catalogue').status_code,200)

    def test_monthly_estimate_and_idempotent_retry(self):
        one=self.client.post('/marketing-pricing/quotes',json=self.payload)
        self.assertEqual(one.status_code,201,one.text)
        two=self.client.post('/marketing-pricing/quotes',json=self.payload)
        self.assertEqual(one.json()['id'],two.json()['id']);self.assertEqual(one.json()['estimate_paise'],1199800)
        self.assertEqual(one.json()['status'],'SUBMITTED')
        changed={**self.payload,'months':3}
        self.assertEqual(self.client.post('/marketing-pricing/quotes',json=changed).status_code,409)

    def test_package_replaces_base_and_one_time_not_multiplied(self):
        data=self.client.post('/marketing-pricing/quotes',json={**self.payload,'package_id':'marketing-growth'}).json()
        self.assertEqual(data['estimate_paise'],1999800)
        data=self.client.post('/marketing-pricing/quotes',json={**self.payload,'service_id':'landing-page','idempotency_key':'fixture-onetime-002'}).json()
        self.assertEqual(data['estimate_paise'],499900)

    def test_validation_rejects_tampered_prices_addons_and_quantity(self):
        for extra in ({'estimate_paise':1},{'addons':['private vendor cost']},{'months':0},{'quantity':2},{'package_id':'seller-premium'},{'service_id':'missing-service'}):
            response=self.client.post('/marketing-pricing/quotes',json={**self.payload,**extra})
            self.assertIn(response.status_code,(404,422),response.text)

    def test_media_requires_real_brief_and_has_no_fake_estimate(self):
        data={**self.payload,'service_id':'roadside-hoarding'}
        self.assertEqual(self.client.post('/marketing-pricing/quotes',json=data).status_code,422)
        data.update(area='Fixture Area',media_format='Roadside hoarding',campaign_duration='Four weeks',quantity=2)
        result=self.client.post('/marketing-pricing/quotes',json=data)
        self.assertEqual(result.status_code,201,result.text);self.assertIsNone(result.json()['estimate_paise'])
        self.assertEqual(self.client.post('/marketing-pricing/quotes',json={**data,'idempotency_key':'fixture-media-pack','package_id':'marketing-starter'}).status_code,422)

    def test_request_history_is_owner_scoped(self):
        self.client.post('/marketing-pricing/quotes',json=self.payload)
        self.assertEqual(len(self.client.get('/marketing-pricing/quotes').json()['items']),1)
        self.user=self.db.get(User,2)
        self.assertEqual(self.client.get('/marketing-pricing/quotes').json()['items'],[])

    def test_existing_auth_and_membership_gates_are_dependencies(self):
        def blocked():raise HTTPException(403,'Membership required')
        self.app.dependency_overrides[routes.member_user]=blocked
        self.assertEqual(self.client.post('/marketing-pricing/quotes',json=self.payload).status_code,403)
        self.app.dependency_overrides.pop(routes.admin_user)
        self.assertEqual(self.client.get('/admin/marketing-pricing/quotes').status_code,403)
        self.app.dependency_overrides.pop(routes.current_user)
        self.assertEqual(self.client.get('/marketing-pricing/quotes').status_code,401)

    def test_admin_draft_publish_revision_and_public_projection(self):
        base=self.client.get('/admin/marketing-pricing/services/landing-page').json()['service']
        fields={key:base[key] for key in routes.PriceFields.model_fields}
        fields['starting_price_paise']=599900
        response=self.client.put('/admin/marketing-pricing/services/landing-page',json={'expected_revision':0,'fields':fields})
        self.assertEqual(response.status_code,200,response.text)
        public=lambda:next(s for s in self.client.get('/marketing-pricing/catalogue').json()['services'] if s['id']=='landing-page')
        self.assertEqual(public()['starting_price_paise'],499900)
        self.assertEqual(self.client.post('/admin/marketing-pricing/services/landing-page/publish',json={'expected_revision':1}).status_code,200)
        self.assertEqual(public()['starting_price_paise'],599900);self.assertEqual(public()['pricing_state'],'APPROVED')
        self.assertEqual(self.client.post('/admin/marketing-pricing/services/landing-page/publish',json={'expected_revision':1}).status_code,409)
        row=self.db.get(MarketingPriceOverride,'landing-page');row.published={**row.published,'supplier_cost':1,'margin':99};self.db.commit()
        self.assertNotIn('supplier_cost',public());self.assertNotIn('margin',public())
        self.assertEqual(self.client.put('/admin/marketing-pricing/services/landing-page',json={'expected_revision':2,'fields':{**fields,'supplier_cost':1}}).status_code,422)

    def test_admin_status_transitions_revision_and_customer_note(self):
        quote=self.client.post('/marketing-pricing/quotes',json=self.payload).json()
        url='/admin/marketing-pricing/quotes/'+quote['id']
        self.assertEqual(self.client.patch(url,json={'expected_revision':1,'status':'CLOSED'}).status_code,409)
        result=self.client.patch(url,json={'expected_revision':1,'status':'REVIEWING','customer_note':'Review in progress'})
        self.assertEqual(result.status_code,200,result.text)
        self.assertEqual(self.client.patch(url,json={'expected_revision':1,'status':'QUOTED'}).status_code,409)
        self.assertEqual(self.client.get('/marketing-pricing/quotes').json()['items'][0]['customer_note'],'Review in progress')

if __name__=='__main__':unittest.main()
