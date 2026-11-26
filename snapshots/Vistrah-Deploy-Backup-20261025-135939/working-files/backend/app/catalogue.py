from fastapi import HTTPException
from sqlalchemy import select
from .models import Category, Subcategory, Service, ServiceInformation

def serialize(row):
    return {col.name: getattr(row, col.name) for col in row.__table__.columns}

def catalogue(db, include_inactive=False):
    categories = db.scalars(select(Category).order_by(Category.id)).all()
    subs = db.scalars(select(Subcategory).order_by(Subcategory.id)).all()
    services = db.scalars(select(Service).order_by(Service.id)).all()
    output = []
    def service_output(service):
        data = serialize(service)
        if include_inactive:
            info = db.get(ServiceInformation, service.id)
            data['member_information'] = info.notes if info else []
        return data
    for cat in categories:
        if not include_inactive and not cat.active:
            continue
        item = serialize(cat)
        item['services'] = [service_output(s) for s in services if s.category_id == cat.id and s.subcategory_id is None and (include_inactive or s.active)]
        item['subcategories'] = []
        for sub in subs:
            if sub.category_id == cat.id and (include_inactive or sub.active):
                nested = serialize(sub)
                nested['services'] = [service_output(s) for s in services if s.subcategory_id == sub.id and (include_inactive or s.active)]
                item['subcategories'].append(nested)
        output.append(item)
    return output

def active_service(db, service_id):
    service = db.get(Service, service_id)
    if not service or not service.active:
        raise HTTPException(404, 'Service not found')
    cat = db.get(Category, service.category_id)
    sub = db.get(Subcategory, service.subcategory_id) if service.subcategory_id else None
    if not cat.active or (sub and not sub.active):
        raise HTTPException(404, 'Service not found')
    return service

def lookup(db, category, service, subcategory=None):
    cat = db.scalar(select(Category).where(Category.slug == category, Category.active.is_(True)))
    if not cat:
        raise HTTPException(404, 'Category not found')
    sub = None
    if subcategory:
        sub = db.scalar(select(Subcategory).where(Subcategory.category_id == cat.id, Subcategory.slug == subcategory, Subcategory.active.is_(True)))
        if not sub:
            raise HTTPException(404, 'Subcategory not found')
    row = db.scalar(select(Service).where(Service.category_id == cat.id, Service.slug == service, Service.subcategory_id == (sub.id if sub else None), Service.active.is_(True)))
    if not row:
        raise HTTPException(404, 'Service not found')
    return row
