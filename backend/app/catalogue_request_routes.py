import re
import unicodedata
import uuid
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import Field, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session
from .database import get_db
from .security import current_user, admin_user
from .models import User, Category, Subcategory, Service, ServiceInformation, Audit, now
from .provider_models import ProviderCatalogueRequest
from .provider_requirements import SafeModel

router=APIRouter(tags=['Seller catalogue requests'])

class CatalogueRequestInput(SafeModel):
    kind: Literal['CATEGORY','SUBCATEGORY','SERVICE']
    category_id: int|None=Field(default=None,gt=0)
    subcategory_id: int|None=Field(default=None,gt=0)
    title: str=Field(min_length=2,max_length=150)
    description: str=Field(min_length=10,max_length=2000)

    @model_validator(mode='after')
    def valid_parents(self):
        if self.kind=='CATEGORY' and (self.category_id is not None or self.subcategory_id is not None):
            raise ValueError('A category request cannot have a parent')
        if self.kind=='SUBCATEGORY' and (self.category_id is None or self.subcategory_id is not None):
            raise ValueError('A subcategory request requires a category')
        if self.kind=='SERVICE' and self.category_id is None:
            raise ValueError('A service request requires a category')
        return self

class CatalogueDecision(SafeModel):
    status: Literal['APPROVED','REJECTED']
    reason: str=Field(min_length=10,max_length=2000)

def request_output(db,row):
    category=db.get(Category,row.category_id) if row.category_id else None
    subcategory=db.get(Subcategory,row.subcategory_id) if row.subcategory_id else None
    return {
        'id':row.id,'user_id':row.user_id,'kind':row.kind,'category_id':row.category_id,
        'category_title':category.title if category else None,'subcategory_id':row.subcategory_id,
        'subcategory_title':subcategory.title if subcategory else None,'title':row.title,
        'description':row.description,'status':row.status,'review_note':row.review_note,
        'reviewer_id':row.reviewer_id,'catalogue_id':row.catalogue_id,
        'created_at':row.created_at,'reviewed_at':row.reviewed_at,
    }

def parent_category(db,data):
    category=db.get(Category,data.category_id) if data.category_id else None
    if data.category_id and (not category or not category.active):
        raise HTTPException(404,'Active parent category not found')
    subcategory=db.get(Subcategory,data.subcategory_id) if data.subcategory_id else None
    if data.subcategory_id and (
        not subcategory or not subcategory.active or subcategory.category_id!=data.category_id
    ):
        raise HTTPException(422,'Select a subcategory within the selected category')

def generated_slug(db,model,title,category_id=None):
    normalized=unicodedata.normalize('NFKD',title).encode('ascii','ignore').decode('ascii').lower()
    base=re.sub(r'[^a-z0-9]+','-',normalized).strip('-') or 'catalogue-item'
    for suffix_number in range(1,1000):
        suffix='' if suffix_number==1 else f'-{suffix_number}'
        slug=base[:100-len(suffix)].rstrip('-')+suffix
        query=select(model.id).where(model.slug==slug)
        if category_id is not None:query=query.where(model.category_id==category_id)
        if not db.scalar(query.limit(1)):return slug
    raise HTTPException(409,'Could not generate a unique catalogue slug; edit the request title and retry')

def approved_catalogue_record(db,row):
    if row.kind=='CATEGORY':
        item=Category(slug=generated_slug(db,Category,row.title),title=row.title,description=row.description,image='/images/service.svg',active=False)
    elif row.kind=='SUBCATEGORY':
        item=Subcategory(category_id=row.category_id,slug=generated_slug(db,Subcategory,row.title,row.category_id),title=row.title,description=row.description,active=False)
    else:
        item=Service(category_id=row.category_id,subcategory_id=row.subcategory_id,slug=generated_slug(db,Service,row.title,row.category_id),title=row.title,description=row.description,includes=[],image='/images/service.svg',popular=False,active=False)
    db.add(item);db.flush()
    if row.kind=='SERVICE':db.add(ServiceInformation(service_id=item.id,notes=[]))
    return item

@router.post('/seller/catalogue-requests',status_code=201)
def create_request(data:CatalogueRequestInput,user:User=Depends(current_user),db:Session=Depends(get_db)):
    parent_category(db,data)
    row=ProviderCatalogueRequest(
        id=str(uuid.uuid4()),user_id=user.id,kind=data.kind,category_id=data.category_id,
        subcategory_id=data.subcategory_id,title=data.title,description=data.description,
        status='PENDING',review_note='',
    )
    db.add(row)
    db.flush()
    db.add(Audit(actor_id=user.id,action='CATALOGUE_REQUEST_SUBMIT',entity='provider_catalogue_request',entity_id=row.id,details={'kind':row.kind}))
    db.commit()
    return request_output(db,row)

@router.get('/seller/catalogue-requests')
def my_requests(user:User=Depends(current_user),db:Session=Depends(get_db)):
    rows=db.scalars(select(ProviderCatalogueRequest).where(ProviderCatalogueRequest.user_id==user.id).order_by(ProviderCatalogueRequest.created_at.desc()).limit(100))
    return [request_output(db,row) for row in rows]

@router.get('/admin/catalogue-requests')
def review_queue(user:User=Depends(admin_user),db:Session=Depends(get_db),page:int=Query(1,ge=1)):
    rows=db.scalars(select(ProviderCatalogueRequest).order_by(ProviderCatalogueRequest.created_at.desc()).offset((page-1)*30).limit(30))
    return [request_output(db,row) for row in rows]

@router.post('/admin/catalogue-requests/{request_id}/review')
def review(request_id:str,data:CatalogueDecision,user:User=Depends(admin_user),db:Session=Depends(get_db)):
    row=db.scalar(select(ProviderCatalogueRequest).where(ProviderCatalogueRequest.id==request_id).with_for_update())
    if not row:raise HTTPException(404,'Catalogue request not found')
    if row.user_id==user.id:raise HTTPException(403,'Another authorized administrator must review your request')
    if row.status!='PENDING':raise HTTPException(409,'This catalogue request has already been reviewed')
    if data.status=='APPROVED':
        parent_category(db,CatalogueRequestInput(
            kind=row.kind,category_id=row.category_id,subcategory_id=row.subcategory_id,
            title=row.title,description=row.description,
        ))
        item=approved_catalogue_record(db,row)
        row.catalogue_id=item.id
    row.status=data.status
    row.review_note=data.reason
    row.reviewer_id=user.id
    row.reviewed_at=now()
    db.add(Audit(actor_id=user.id,action='CATALOGUE_REQUEST_REVIEW',entity='provider_catalogue_request',entity_id=row.id,details={'status':row.status,'catalogue_id':row.catalogue_id}))
    db.commit()
    return request_output(db,row)
