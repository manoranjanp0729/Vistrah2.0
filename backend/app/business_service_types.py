"""Extensible direct service types; sellers request, only admins publish."""
import copy
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db
from .models import Audit, Category, Service, User
from .provider_requirements import SafeModel
from .security import admin_user

router = APIRouter(tags=['Direct service types'])


class CustomServiceType(SafeModel):
    category: str = Field(min_length=1, max_length=100, pattern=r'^[a-z0-9-]+$')
    title: str = Field(min_length=2, max_length=100)


def definition(category, service):
    data = dict(slug=service.slug, title=service.title,
        description=service.description, listing_type_slug=service.slug,
        subcategory_slug=None, subcategory_title=service.title,
        keywords=[service.title, category['title']], custom=True)
    if category['slug'] in ('restaurants-and-dining', 'hospitals-and-labs'):
        data['regulated'] = 'fssai' if category['slug'] == 'restaurants-and-dining' else 'medical'
    return category, data


def find_dynamic_type(db, slug, category_slug=None):
    from .business_catalogue import business_types
    categories = {c['slug']: c for c in business_types()['categories']}
    query = select(Service, Category).join(Category).where(
        Service.slug == slug, Service.active.is_(True), Category.active.is_(True),
        Category.slug.in_(categories))
    if category_slug:
        query = query.where(Category.slug == category_slug)
    row = db.execute(query).first()
    if not row or (category_slug and row[1].slug != category_slug):
        return None
    return definition(categories[row[1].slug], row[0])


def catalogue_with_custom_types(db):
    from .business_catalogue import business_types
    result = copy.deepcopy(business_types())
    categories = {c['slug']: c for c in result['categories']}
    for service, category in db.execute(select(Service, Category).join(Category).where(
        Service.active.is_(True), Category.active.is_(True), Category.slug.in_(categories))):
        target = categories[category.slug]
        if not any(t['slug'] == service.slug for t in target['types']):
            target['types'].append(definition(target, service)[1])
    return result


def request_service_type(db, data, actor_id, publish=False):
    from .business_catalogue import business_types, ensure_business_type_service
    category = next((c for c in business_types()['categories'] if c['slug'] == data.category), None)
    title = ' '.join(data.title.split())
    if not category or len(title) < 2 or any(ord(c) < 32 for c in title):
        raise HTTPException(422, 'Choose a main category and enter a valid service type')
    seed_type = next((t for t in category['types'] if t['title'].casefold() == title.casefold()), None)
    if seed_type:
        return ensure_business_type_service(db, seed_type['slug'], actor_id=actor_id)
    cat = db.scalar(select(Category).where(Category.slug == category['slug']))
    if not cat:
        cat = Category(slug=category['slug'], title=category['title'], description=category['description'], active=True)
        db.add(cat)
        db.flush()
    slug = 'custom-' + uuid.uuid5(uuid.NAMESPACE_URL, category['slug'] + ':' + title.casefold()).hex
    service = db.scalar(select(Service).where(Service.category_id == cat.id, Service.slug == slug))
    if not service:
        service = Service(category_id=cat.id, slug=slug, title=title,
            description=f"{title} in {category['title']}.", includes=[], active=publish)
        db.add(service)
        db.flush()
    elif publish:
        service.active = True
    found = definition(category, service)
    result = ensure_business_type_service(db, slug, actor_id=actor_id, custom_definition=found)
    db.add(Audit(actor_id=actor_id, action='SERVICE_TYPE_PUBLISH' if publish else 'SERVICE_TYPE_REQUEST',
        entity='service', entity_id=str(service.id), details={'category': category['slug'], 'title': title}))
    return result


@router.get('/marketplace/service-types')
def public_service_types(db: Session = Depends(get_db)):
    return catalogue_with_custom_types(db)


@router.post('/admin/provider-onboarding/service-types', status_code=201)
def publish_service_type(data: CustomServiceType, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    result = request_service_type(db, data, user.id, publish=True)
    db.commit()
    return {'slug': result[1].slug, 'title': result[1].title, 'category': result[0].slug, 'active': True}
