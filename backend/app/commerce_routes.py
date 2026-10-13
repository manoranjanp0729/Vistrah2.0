from typing import Literal
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import Field, model_validator
from sqlalchemy import select, func, update, or_
from sqlalchemy.orm import Session
from .database import get_db
from .models import User, Provider, ProviderService, Service, Category, Subcategory, Audit, now
from .security import seller_user, admin_user, member_user, current_user, bearer
from .workflow_schemas import Strict
from .commerce_models import CommerceListing

router = APIRouter(tags=['Reviewed commerce listings'])


class ListingInput(Strict):
    kind: Literal['PRODUCT', 'SERVICE_PACKAGE']
    service_id: int | None = Field(default=None, gt=0, strict=True)
    title: str = Field(min_length=2, max_length=150)
    description: str = Field(min_length=20, max_length=6000)
    unit_price_paise: int = Field(gt=0, le=1000000000, strict=True)
    currency: Literal['INR'] = 'INR'
    available: bool = Field(default=True, strict=True)

    @model_validator(mode='after')
    def service_binding(self):
        if (self.kind == 'PRODUCT') != (self.service_id is None):
            raise ValueError('Only service packages must reference a catalogue service')
        return self


class Revision(Strict):
    revision: int = Field(gt=0, strict=True)


class ListingEdit(ListingInput, Revision):
    pass


class Review(Revision):
    status: Literal['APPROVED', 'REJECTED']
    reason: str = Field(min_length=10, max_length=2000)


def owned_business(db, provider_id, user):
    provider = db.scalar(select(Provider).where(Provider.id == provider_id, Provider.owner_user_id == user.id).with_for_update().execution_options(populate_existing=True))
    if provider is None:
        raise HTTPException(404, 'Owned business not found')
    return provider


def listing(db, listing_id, provider_id=None):
    query = select(CommerceListing).where(CommerceListing.id == listing_id)
    if provider_id is not None:
        query = query.where(CommerceListing.provider_id == provider_id)
    row = db.scalar(query.with_for_update().execution_options(populate_existing=True))
    if row is None:
        raise HTTPException(404, 'Listing not found')
    return row


def own_listing(db, listing_id, provider_id, user):
    row = listing(db, listing_id, provider_id)
    if row.seller_id != user.id:
        raise HTTPException(404, 'Listing not found')
    return row


def service_grant():
    return select(ProviderService.provider_id).join(Service, Service.id == ProviderService.service_id).join(Category, Category.id == Service.category_id).outerjoin(Subcategory, Subcategory.id == Service.subcategory_id).where(
        ProviderService.provider_id == CommerceListing.provider_id, Service.id == CommerceListing.service_id,
        ProviderService.approval_status == 'APPROVED', Service.active.is_(True), Category.active.is_(True),
        or_(Service.subcategory_id.is_(None), Subcategory.active.is_(True))).correlate(CommerceListing).exists()


def eligible(db, provider, row):
    if provider.owner_user_id != row.seller_id or not provider.active or provider.verification_status != 'VERIFIED':
        raise HTTPException(409, 'Current ownership of an active verified business is required')
    if row.kind == 'SERVICE_PACKAGE' and not db.scalar(select(CommerceListing.id).where(CommerceListing.id == row.id, service_grant())):
        raise HTTPException(409, 'An active catalogue service and approved business service grant are required')


def change(db, row, user, revision, action, **values):
    if row.revision != revision:
        raise HTTPException(409, 'Reload this listing; its revision changed')
    result = db.execute(update(CommerceListing).where(CommerceListing.id == row.id, CommerceListing.revision == revision).values(**values, revision=revision + 1, updated_at=now()).execution_options(synchronize_session=False))
    if result.rowcount != 1:
        raise HTTPException(409, 'Reload this listing; its revision changed')
    db.add(Audit(actor_id=user.id, action=action, entity='commerce_listing', entity_id=row.id,
        details={'revision': revision + 1, 'unit_price_paise': values.get('unit_price_paise', row.unit_price_paise)}))
    db.commit(); db.refresh(row)


def output(row, provider, private=False):
    data={key:getattr(row,key) for key in ListingInput.model_fields}
    data.update(id=row.id, business=provider.company or provider.name, revision=row.revision)
    if private:
        data.update(status=row.status, provider_id=row.provider_id, seller_id=row.seller_id,
            reviewer_id=row.reviewer_id, review_note=row.review_note, published_at=row.published_at)
    return data


def public_query():
    return select(CommerceListing, Provider).join(Provider, Provider.id == CommerceListing.provider_id).where(
        CommerceListing.status == 'APPROVED', CommerceListing.available.is_(True), Provider.active.is_(True),
        Provider.verification_status == 'VERIFIED', Provider.owner_user_id == CommerceListing.seller_id,
        or_(CommerceListing.kind == 'PRODUCT', service_grant()))


def page_output(db, query, page):
    total=db.scalar(select(func.count()).select_from(query.subquery()))
    rows=db.execute(query.order_by(CommerceListing.published_at.desc(),CommerceListing.id).offset((page-1)*20).limit(20))
    return {'items':[output(row,provider) for row,provider in rows], 'total':total, 'page':page, 'page_size':20}


@router.get('/commerce/products')
def products(response: Response, page: int = Query(1, ge=1, le=10000), db: Session = Depends(get_db)):
    response.headers['Cache-Control']='no-store'
    return page_output(db,public_query().where(CommerceListing.kind=='PRODUCT'),page)


@router.get('/commerce/service-packages')
def packages(response: Response, page: int = Query(1, ge=1, le=10000), user: User = Depends(member_user), db: Session = Depends(get_db)):
    response.headers['Cache-Control']='private, no-store';response.headers['Vary']='Authorization'
    return page_output(db,public_query().where(CommerceListing.kind=='SERVICE_PACKAGE'),page)


@router.get('/commerce/listings/{listing_id}')
def public_listing(listing_id: str, response: Response, credentials=Depends(bearer), db: Session = Depends(get_db)):
    response.headers['Cache-Control']='private, no-store';response.headers['Vary']='Authorization'
    item=db.execute(public_query().where(CommerceListing.id==listing_id)).first()
    if item is None:
        raise HTTPException(404,'Published listing not found')
    if item[0].kind=='SERVICE_PACKAGE':
        member_user(current_user(credentials,db),db)
    return output(*item)


@router.get('/seller/businesses/{provider_id}/commerce-listings')
def my_listings(provider_id: int, user: User = Depends(seller_user), db: Session = Depends(get_db), page: int = Query(1, ge=1, le=10000)):
    provider=owned_business(db,provider_id,user)
    query=select(CommerceListing).where(CommerceListing.provider_id==provider_id,CommerceListing.seller_id==user.id)
    rows=db.scalars(query.order_by(CommerceListing.updated_at.desc(),CommerceListing.id).offset((page-1)*20).limit(20))
    return {'items':[output(row,provider,True) for row in rows],'total':db.scalar(select(func.count()).select_from(query.subquery())),'page':page,'page_size':20}


@router.post('/seller/businesses/{provider_id}/commerce-listings',status_code=201)
def create_listing(provider_id: int, data: ListingInput, user: User = Depends(seller_user), db: Session = Depends(get_db)):
    provider=owned_business(db,provider_id,user)
    if db.scalar(select(func.count()).select_from(CommerceListing).where(CommerceListing.provider_id==provider_id,CommerceListing.status!='ARCHIVED'))>=100:
        raise HTTPException(409,'Archive unused listings before adding more')
    if data.service_id is not None and db.get(Service,data.service_id) is None:
        raise HTTPException(422,'Select an existing catalogue service')
    row=CommerceListing(id=str(uuid4()),provider_id=provider_id,seller_id=user.id,**data.model_dump())
    db.add(row);db.flush()
    db.add(Audit(actor_id=user.id,action='COMMERCE_LISTING_CREATED',entity='commerce_listing',entity_id=row.id,details={'revision':1,'unit_price_paise':row.unit_price_paise}))
    db.commit();db.refresh(row)
    return output(row,provider,True)


@router.patch('/seller/businesses/{provider_id}/commerce-listings/{listing_id}')
def edit_listing(provider_id: int, listing_id: str, data: ListingEdit, user: User = Depends(seller_user), db: Session = Depends(get_db)):
    provider=owned_business(db,provider_id,user);row=own_listing(db,listing_id,provider_id,user)
    if row.status not in ('DRAFT','REJECTED','APPROVED'):
        raise HTTPException(409,'Only draft, rejected or approved listings can be revised')
    if data.service_id is not None and db.get(Service,data.service_id) is None:
        raise HTTPException(422,'Select an existing catalogue service')
    change(db,row,user,data.revision,'COMMERCE_LISTING_EDITED',**data.model_dump(exclude={'revision'}),status='DRAFT',reviewer_id=None,review_note='',published_at=None)
    return output(row,provider,True)


@router.post('/seller/businesses/{provider_id}/commerce-listings/{listing_id}/submit')
def submit_listing(provider_id: int, listing_id: str, data: Revision, user: User = Depends(seller_user), db: Session = Depends(get_db)):
    provider=owned_business(db,provider_id,user);row=own_listing(db,listing_id,provider_id,user)
    if row.status!='DRAFT':raise HTTPException(409,'Only a current draft can be submitted')
    eligible(db,provider,row)
    change(db,row,user,data.revision,'COMMERCE_LISTING_SUBMITTED',status='SUBMITTED')
    return output(row,provider,True)


@router.post('/seller/businesses/{provider_id}/commerce-listings/{listing_id}/archive')
def archive_listing(provider_id: int, listing_id: str, data: Revision, user: User = Depends(seller_user), db: Session = Depends(get_db)):
    provider=owned_business(db,provider_id,user);row=own_listing(db,listing_id,provider_id,user)
    if row.status=='ARCHIVED':raise HTTPException(409,'Listing is already archived')
    change(db,row,user,data.revision,'COMMERCE_LISTING_ARCHIVED',status='ARCHIVED')
    return output(row,provider,True)


@router.get('/admin/commerce-listings')
def review_queue(user: User = Depends(admin_user), db: Session = Depends(get_db), page: int = Query(1, ge=1, le=10000), status: Literal['DRAFT','SUBMITTED','APPROVED','REJECTED','ARCHIVED']|None=None):
    query=select(CommerceListing,Provider).join(Provider,Provider.id==CommerceListing.provider_id)
    if status:query=query.where(CommerceListing.status==status)
    total=db.scalar(select(func.count()).select_from(query.subquery()))
    rows=db.execute(query.order_by(CommerceListing.updated_at.desc(),CommerceListing.id).offset((page-1)*20).limit(20))
    return {'items':[output(row,provider,True) for row,provider in rows],'total':total,'page':page,'page_size':20}


@router.post('/admin/commerce-listings/{listing_id}/review')
def review_listing(listing_id: str, data: Review, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    provider_id=db.scalar(select(CommerceListing.provider_id).where(CommerceListing.id==listing_id))
    if provider_id is None:raise HTTPException(404,'Listing not found')
    provider=db.scalar(select(Provider).where(Provider.id==provider_id).with_for_update().execution_options(populate_existing=True))
    row=listing(db,listing_id)
    if user.id in (row.seller_id,provider.owner_user_id):raise HTTPException(403,'An independent administrator must review this listing')
    if row.status!='SUBMITTED':raise HTTPException(409,'Only a submitted listing can be reviewed')
    if data.status=='APPROVED':eligible(db,provider,row)
    change(db,row,user,data.revision,'COMMERCE_LISTING_'+data.status,status=data.status,reviewer_id=user.id,review_note=data.reason,published_at=now() if data.status=='APPROVED' else None)
    return output(row,provider,True)
