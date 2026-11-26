"""Idempotent catalogue and plan bootstrap. Never creates users or providers."""
import json
import os
from sqlalchemy import select
from .database import SessionLocal
from .config import CATALOGUE_FILE
from .models import Category, Subcategory, Service, Plan, BootstrapState, ServiceInformation

def seed(db, with_catalogue=True):
    if not db.scalar(select(Plan).where(Plan.name == 'VISTRAH Membership')):
        db.add(Plan(name='VISTRAH Membership', amount=12900, currency='INR', days=30))
    if with_catalogue and not db.get(BootstrapState, 'catalogue-v1'):
        for item in json.loads(CATALOGUE_FILE.read_text(encoding='utf-8')):
            category = db.scalar(select(Category).where(Category.slug == item['slug']))
            if category:
                continue  # Preserve admin edits, inactive content, and existing data.
            category = Category(**{k: item[k] for k in ['slug','title','description','image']})
            db.add(category)
            db.flush()
            for service in item['services']:
                db.add(Service(category_id=category.id, **{k:v for k,v in service.items() if k != 'member_information'}))
            for sub in item['subcategories']:
                nested = Subcategory(category_id=category.id, **{k: sub[k] for k in ['slug','title','description']})
                db.add(nested)
                db.flush()
                for service in sub['services']:
                    db.add(Service(category_id=category.id, subcategory_id=nested.id, **{k:v for k,v in service.items() if k != 'member_information'}))
        db.add(BootstrapState(key='catalogue-v1'))
    if with_catalogue and not db.get(BootstrapState, 'member-information-v1'):
        db.flush()
        for item in json.loads(CATALOGUE_FILE.read_text(encoding='utf-8')):
            category = db.scalar(select(Category).where(Category.slug == item['slug']))
            if not category:
                continue
            definitions = item['services'] + [s for sub in item['subcategories'] for s in sub['services']]
            for definition in definitions:
                service = db.scalar(select(Service).where(Service.category_id == category.id, Service.slug == definition['slug']))
                if service and not db.get(ServiceInformation, service.id):
                    db.add(ServiceInformation(service_id=service.id, notes=definition.get('member_information', [])))
        db.add(BootstrapState(key='member-information-v1'))
    from .workflow_engine import register
    from .provider_templates import initialize
    initialize(db)
    register(db)
    from .discovery_service import sources_init
    sources_init(db)
    db.commit()

if __name__ == '__main__':
    with SessionLocal() as db:
        seed(db, os.getenv('SEED_CATALOGUE', 'true').lower() == 'true')
