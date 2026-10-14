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
from .marketplace_taxonomy import resolve_selection

router = APIRouter(tags=['Reviewed commerce listings'])


class ListingInput(Strict):
    kind: Literal['PRODUCT', 'SERVICE_PACKAGE']
    service_id: int | None = Field(default=None, gt=0, strict=True)
    title: str = Field(min_length=2, max_length=150)
    description: str = Field(min_length=20, max_length=6000)
    unit_price_paise: int = Field(gt=0, le=1000000000, strict=True)
    currency: Literal['INR'] = 'INR'
    available: bool = Field(default=True, strict=True)
    taxonomy_category_slug: str | None = Field(default=None, min_length=1, max_length=100)
    taxonomy_subcategory_slug: str | None = Field(default=None, min_length=1, max_length=100)
    taxonomy_listing_type_slug: str | None = Field(default=None, min_length=1, max_length=100)

    @model_validator(mode='after')
    def service_binding(self):
        if (self.kind == 'PRODUCT') != (self.service_id is None):
            raise ValueError('Only service packages must reference a catalogue service')
        selection = (self.taxonomy_category_slug, self.taxonomy_subcategory_slug, self.taxonomy_listing_type_slug)
        if any(value is not None for value in selection):
            if not all(value is not None for value in selection) or resolve_selection(*selection) is None:
                raise ValueError('Select a valid category, subcategory and listing type')
        return self


class Revision(Strict):
    revision: int = Field(gt=0, strict=True)


class ListingEdit(ListingInput, Revision):
    pass


class OrderTerms(Revision):
    stock_quantity: int | None = Field(default=None, ge=0, le=1000000, strict=True)
    fulfilment_modes: list[Literal['PICKUP','DELIVERY','SERVICE']] = Field(min_length=1, max_length=2)
    delivery_fee_paise: int | None = Field(default=None, ge=0, le=1000000000, strict=True)
    cancellation_rule: Literal['BEFORE_DISPATCH','BEFORE_BUILD','BEFORE_SERVICE_START']


class Review(Revision):
    status: Literal['APPROVED', 'REJECTED']
    reason: str = Field(min_length=10, max_length=2000)
    order_terms_acknowledged: bool = Field(default=False, strict=True)


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
    if row.fulfilment_operator!='SELLER':
        raise HTTPException(403,'VISTRAH listings are managed through administrator routes')
    return row


def service_grant():
    return select(ProviderService.provider_id).join(Service, Service.id == ProviderService.service_id).join(Category, Category.id == Service.category_id).outerjoin(Subcategory, Subcategory.id == Service.subcategory_id).where(
        ProviderService.provider_id == CommerceListing.provider_id, Service.id == CommerceListing.service_id,
        ProviderService.approval_status == 'APPROVED', Service.active.is_(True), Category.active.is_(True),
        or_(Service.subcategory_id.is_(None), Subcategory.active.is_(True))).correlate(CommerceListing).exists()


def eligible(db, provider, row):
    if provider.owner_user_id != row.seller_id or not provider.active or provider.verification_status != 'VERIFIED':
        raise HTTPException(409, 'Current ownership of an active verified business is required')
    if row.fulfilment_operator=='VISTRAH' and db.get(User,provider.owner_user_id).role!='ADMIN':
        raise HTTPException(409,'VISTRAH service business must remain administrator owned')
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
    data.update(id=row.id, business=provider.company or provider.name, revision=row.revision,
        taxonomy_selection=resolve_selection(row.taxonomy_category_slug, row.taxonomy_subcategory_slug, row.taxonomy_listing_type_slug) if row.taxonomy_category_slug and row.taxonomy_subcategory_slug and row.taxonomy_listing_type_slug else None,
        fulfilment_operator=row.fulfilment_operator,
        order_terms={'stock_quantity':row.stock_quantity,'stock_available':None if row.stock_quantity is None else row.stock_quantity-row.allocated_quantity,
            'fulfilment_modes':row.fulfilment_modes,'delivery_fee_paise':row.delivery_fee_paise,'cancellation_rule':row.cancellation_rule})
    if private:
        data.update(status=row.status, provider_id=row.provider_id, seller_id=row.seller_id,
            reviewer_id=row.reviewer_id, review_note=row.review_note, published_at=row.published_at)
    return data


def public_query():
    return select(CommerceListing, Provider).join(Provider, Provider.id == CommerceListing.provider_id).where(
        CommerceListing.status == 'APPROVED', CommerceListing.available.is_(True), Provider.active.is_(True),
        Provider.verification_status == 'VERIFIED', Provider.owner_user_id == CommerceListing.seller_id,
        or_(CommerceListing.kind == 'PRODUCT', service_grant()),
        or_(CommerceListing.fulfilment_operator=='SELLER',select(User.id).where(User.id==CommerceListing.seller_id,User.role=='ADMIN').exists()))


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
    query=select(CommerceListing).where(CommerceListing.provider_id==provider_id,CommerceListing.seller_id==user.id,CommerceListing.fulfilment_operator=='SELLER')
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
    revise(db,row,user,data)
    return output(row,provider,True)


@router.post('/seller/businesses/{provider_id}/commerce-listings/{listing_id}/submit')
def submit_listing(provider_id: int, listing_id: str, data: Revision, user: User = Depends(seller_user), db: Session = Depends(get_db)):
    provider=owned_business(db,provider_id,user);row=own_listing(db,listing_id,provider_id,user)
    if row.status!='DRAFT':raise HTTPException(409,'Only a current draft can be submitted')
    if any((row.taxonomy_category_slug,row.taxonomy_subcategory_slug,row.taxonomy_listing_type_slug)) and resolve_selection(row.taxonomy_category_slug,row.taxonomy_subcategory_slug,row.taxonomy_listing_type_slug) is None:raise HTTPException(422,'Listing taxonomy selection is no longer valid')
    eligible(db,provider,row)
    change(db,row,user,data.revision,'COMMERCE_LISTING_SUBMITTED',status='SUBMITTED',submitted_by=user.id)
    return output(row,provider,True)


@router.post('/seller/businesses/{provider_id}/commerce-listings/{listing_id}/archive')
def archive_listing(provider_id: int, listing_id: str, data: Revision, user: User = Depends(seller_user), db: Session = Depends(get_db)):
    provider=owned_business(db,provider_id,user);row=own_listing(db,listing_id,provider_id,user)
    if row.status=='ARCHIVED':raise HTTPException(409,'Listing is already archived')
    change(db,row,user,data.revision,'COMMERCE_LISTING_ARCHIVED',status='ARCHIVED')
    return output(row,provider,True)


@router.get('/admin/commerce-listings')
def review_queue(user: User = Depends(admin_user), db: Session = Depends(get_db), page: int = Query(1, ge=1, le=10000), status: Literal['DRAFT','SUBMITTED','APPROVED','REJECTED','ARCHIVED']|None=None, provider_id:int|None=Query(None,ge=1), operator:Literal['SELLER','VISTRAH']|None=None):
    query=select(CommerceListing,Provider).join(Provider,Provider.id==CommerceListing.provider_id)
    if status:query=query.where(CommerceListing.status==status)
    if provider_id is not None:query=query.where(CommerceListing.provider_id==provider_id)
    if operator is not None:query=query.where(CommerceListing.fulfilment_operator==operator)
    total=db.scalar(select(func.count()).select_from(query.subquery()))
    rows=db.execute(query.order_by(CommerceListing.updated_at.desc(),CommerceListing.id).offset((page-1)*20).limit(20))
    return {'items':[output(row,provider,True) for row,provider in rows],'total':total,'page':page,'page_size':20}


@router.post('/admin/commerce-listings/{listing_id}/review')
def review_listing(listing_id: str, data: Review, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    provider_id=db.scalar(select(CommerceListing.provider_id).where(CommerceListing.id==listing_id))
    if provider_id is None:raise HTTPException(404,'Listing not found')
    provider=db.scalar(select(Provider).where(Provider.id==provider_id).with_for_update().execution_options(populate_existing=True))
    row=listing(db,listing_id)
    if user.id in (row.seller_id,provider.owner_user_id,row.submitted_by):raise HTTPException(403,'An independent administrator must review this listing')
    if row.status!='SUBMITTED':raise HTTPException(409,'Only a submitted listing can be reviewed')
    if data.status=='APPROVED':
        if any((row.taxonomy_category_slug,row.taxonomy_subcategory_slug,row.taxonomy_listing_type_slug)) and resolve_selection(row.taxonomy_category_slug,row.taxonomy_subcategory_slug,row.taxonomy_listing_type_slug) is None:raise HTTPException(422,'Listing taxonomy selection is no longer valid')
        if row.cancellation_rule and not data.order_terms_acknowledged:raise HTTPException(422,'Review and acknowledge the stock, fulfilment and cancellation terms before approval')
        eligible(db,provider,row)
    change(db,row,user,data.revision,'COMMERCE_LISTING_'+data.status,status=data.status,reviewer_id=user.id,review_note=data.reason,published_at=now() if data.status=='APPROVED' else None)
    return output(row,provider,True)


def revise(db,row,user,data):
    reset={}
    if row.kind!=data.kind or row.service_id!=data.service_id:
        if row.allocated_quantity:raise HTTPException(409,'Archive this stock batch and create a new listing instead of changing its kind')
        reset={'stock_quantity':None,'fulfilment_modes':[],'delivery_fee_paise':None,'cancellation_rule':None}
    change(db,row,user,data.revision,'COMMERCE_LISTING_EDITED',**data.model_dump(exclude={'revision'}),**reset,status='DRAFT',reviewer_id=None,review_note='',published_at=None,submitted_by=None)


def set_terms(db,row,user,data):
    if row.status not in ('DRAFT','REJECTED','APPROVED'):raise HTTPException(409,'Only draft, rejected or approved listings can be revised')
    modes=data.fulfilment_modes
    if len(set(modes))!=len(modes):raise HTTPException(422,'Choose each fulfilment method once')
    if row.kind=='PRODUCT':
        if data.stock_quantity is None or data.stock_quantity<row.allocated_quantity:raise HTTPException(422,'Stock batch quantity must cover already confirmed or sold units')
        if 'SERVICE' in modes or data.cancellation_rule=='BEFORE_SERVICE_START':raise HTTPException(422,'Products require pickup/delivery and a product cancellation cutoff')
        if ('DELIVERY' in modes)!=(data.delivery_fee_paise is not None):raise HTTPException(422,'Supply a delivery fee only when delivery is offered')
    elif data.stock_quantity is not None or modes!=['SERVICE'] or data.delivery_fee_paise is not None or data.cancellation_rule!='BEFORE_SERVICE_START':
        raise HTTPException(422,'Service packages require seller confirmation, service fulfilment and cancellation before service start')
    change(db,row,user,data.revision,'COMMERCE_TERMS_EDITED',**data.model_dump(exclude={'revision'}),status='DRAFT',reviewer_id=None,review_note='',published_at=None,submitted_by=None)


@router.patch('/seller/businesses/{provider_id}/commerce-listings/{listing_id}/order-terms')
def seller_terms(provider_id:int,listing_id:str,data:OrderTerms,user:User=Depends(seller_user),db:Session=Depends(get_db)):
    provider=owned_business(db,provider_id,user);row=own_listing(db,listing_id,provider_id,user)
    set_terms(db,row,user,data)
    return output(row,provider,True)


def platform_listing(db,provider_id,listing_id,user):
    provider=owned_business(db,provider_id,user);row=listing(db,listing_id,provider_id)
    if row.fulfilment_operator!='VISTRAH' or row.seller_id!=user.id:raise HTTPException(404,'Owned VISTRAH service listing not found')
    return provider,row


@router.post('/admin/vistrah/businesses/{provider_id}/commerce-listings',status_code=201)
def platform_create(provider_id:int,data:ListingInput,user:User=Depends(admin_user),db:Session=Depends(get_db)):
    provider=owned_business(db,provider_id,user)
    if data.kind!='SERVICE_PACKAGE' or db.get(Service,data.service_id) is None:raise HTTPException(422,'Choose an existing service for a VISTRAH package')
    if db.scalar(select(func.count()).select_from(CommerceListing).where(CommerceListing.provider_id==provider_id,CommerceListing.status!='ARCHIVED'))>=100:raise HTTPException(409,'Archive unused listings before adding more')
    row=CommerceListing(id=str(uuid4()),provider_id=provider_id,seller_id=user.id,fulfilment_operator='VISTRAH',**data.model_dump())
    db.add(row);db.flush();db.add(Audit(actor_id=user.id,action='VISTRAH_LISTING_CREATED',entity='commerce_listing',entity_id=row.id,details={'revision':1}))
    db.commit();db.refresh(row)
    return output(row,provider,True)


@router.patch('/admin/vistrah/businesses/{provider_id}/commerce-listings/{listing_id}')
def platform_edit(provider_id:int,listing_id:str,data:ListingEdit,user:User=Depends(admin_user),db:Session=Depends(get_db)):
    provider,row=platform_listing(db,provider_id,listing_id,user)
    if data.kind!='SERVICE_PACKAGE' or db.get(Service,data.service_id) is None:raise HTTPException(422,'Choose an existing service for a VISTRAH package')
    if row.status not in ('DRAFT','REJECTED','APPROVED'):raise HTTPException(409,'Only draft, rejected or approved listings can be revised')
    revise(db,row,user,data)
    return output(row,provider,True)


@router.patch('/admin/vistrah/businesses/{provider_id}/commerce-listings/{listing_id}/order-terms')
def platform_terms(provider_id:int,listing_id:str,data:OrderTerms,user:User=Depends(admin_user),db:Session=Depends(get_db)):
    provider,row=platform_listing(db,provider_id,listing_id,user);set_terms(db,row,user,data)
    return output(row,provider,True)


@router.post('/admin/vistrah/businesses/{provider_id}/commerce-listings/{listing_id}/submit')
def platform_submit(provider_id:int,listing_id:str,data:Revision,user:User=Depends(admin_user),db:Session=Depends(get_db)):
    provider,row=platform_listing(db,provider_id,listing_id,user)
    if row.status!='DRAFT':raise HTTPException(409,'Only a current draft can be submitted')
    eligible(db,provider,row);change(db,row,user,data.revision,'VISTRAH_LISTING_SUBMITTED',status='SUBMITTED',submitted_by=user.id)
    return output(row,provider,True)


@router.post('/admin/vistrah/businesses/{provider_id}/commerce-listings/{listing_id}/archive')
def platform_archive(provider_id:int,listing_id:str,data:Revision,user:User=Depends(admin_user),db:Session=Depends(get_db)):
    provider,row=platform_listing(db,provider_id,listing_id,user)
    if row.status=='ARCHIVED':raise HTTPException(409,'Listing is already archived')
    change(db,row,user,data.revision,'VISTRAH_LISTING_ARCHIVED',status='ARCHIVED')
    return output(row,provider,True)
