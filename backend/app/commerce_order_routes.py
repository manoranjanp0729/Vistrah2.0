"""Shared private cart and development-only unpaid order lifecycle."""
import hashlib
import json
import os
from typing import Literal
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import Field, field_validator, model_validator
from sqlalchemy import select, update, func
from sqlalchemy.orm import Session
from .database import get_db
from .models import User, Provider, Audit, now
from .security import current_user, seller_user, admin_user, member_user, eligible_memberships
from .workflow_schemas import Strict
from .commerce_models import CommerceListing
from .commerce_order_models import CartLine, CommerceOrder
from .commerce_routes import public_query, output, eligible

router=APIRouter(tags=['Commerce cart and test orders'])


class CartInput(Strict):
    quantity:int=Field(ge=1,le=999,strict=True)
    revision:int=Field(ge=0,strict=True)


class Revision(Strict):
    revision:int=Field(gt=0,strict=True)


class RequestOrder(Strict):
    listing_id:str=Field(min_length=36,max_length=36,pattern=r'^[0-9a-f-]{36}$')
    listing_revision:int=Field(gt=0,strict=True)
    cart_revision:int=Field(gt=0,strict=True)
    fulfilment_method:Literal['PICKUP','DELIVERY','SERVICE']
    phone:str=Field(min_length=7,max_length=20,pattern=r'^\+?[0-9 ()-]+$')
    delivery_address:str | None=Field(default=None,min_length=10,max_length=1000)
    idempotency_key:str=Field(min_length=16,max_length=80,pattern=r'^[a-zA-Z0-9_-]+$')

    @field_validator('phone')
    @classmethod
    def phone_digits(cls,value):
        if not 7<=sum(character.isdigit() for character in value)<=15:raise ValueError('Enter a phone number with 7–15 digits')
        return value

    @model_validator(mode='after')
    def address_method(self):
        if (self.fulfilment_method=='DELIVERY')!=(self.delivery_address is not None):
            raise ValueError('Supply an address only for delivery')
        return self


class Transition(Revision):
    status:Literal['CONFIRMED','REJECTED','BUILDING','DISPATCHED','IN_PROGRESS','COMPLETED']


def test_ordering():
    if os.getenv('APP_ENV','production')!='development':
        raise HTTPException(503,'Live ordering and payment are not enabled. Test order mutations require development mode.')


def customer_lock(db,user):
    # Serializes cart writes/idempotency for this customer without locking unrelated users.
    db.scalar(select(User).where(User.id==user.id).with_for_update().execution_options(populate_existing=True))


def published(db,listing_id,locked=False):
    query=public_query().where(CommerceListing.id==listing_id).execution_options(populate_existing=True)
    if locked:query=query.with_for_update(of=CommerceListing).execution_options(populate_existing=True)
    item=db.execute(query).first()
    if item is None:raise HTTPException(409,'Listing is no longer available; refresh your cart')
    return item


def orderable(row,quantity,method=None):
    if not row.cancellation_rule or not row.fulfilment_modes:raise HTTPException(409,'Reviewed order terms are not configured for this listing')
    if row.kind=='PRODUCT' and (row.stock_quantity is None or row.stock_quantity-row.allocated_quantity<quantity):raise HTTPException(409,'Insufficient approved stock')
    if method is not None and method not in row.fulfilment_modes:raise HTTPException(422,'Choose an approved fulfilment method')


@router.get('/commerce/cart')
def cart(user:User=Depends(current_user),db:Session=Depends(get_db)):
    lines=db.scalars(select(CartLine).where(CartLine.customer_id==user.id).order_by(CartLine.id)).all()
    member=bool(eligible_memberships(db,user));items=[]
    for line in lines:
        item={'listing_id':line.listing_id,'quantity':line.quantity,'revision':line.revision}
        try:
            row,provider=published(db,line.listing_id)
            if row.kind=='SERVICE_PACKAGE' and not member:raise HTTPException(403,'Membership is required to view this service package')
            orderable(row,line.quantity)
            item.update(available=True,listing=output(row,provider),subtotal_paise=row.unit_price_paise*line.quantity)
        except HTTPException as exc:
            item.update(available=False,reason=exc.detail)
        items.append(item)
    return {'items':items,'maximum_items':50}


@router.put('/commerce/cart/items/{listing_id}')
def put_cart(listing_id:str,data:CartInput,user:User=Depends(current_user),db:Session=Depends(get_db)):
    customer_lock(db,user);row,_=published(db,listing_id,True)
    if row.kind=='SERVICE_PACKAGE':member_user(user,db)
    orderable(row,data.quantity)
    line=db.scalar(select(CartLine).where(CartLine.customer_id==user.id,CartLine.listing_id==listing_id).with_for_update())
    if line is None:
        if data.revision!=0:raise HTTPException(409,'Cart changed; reload before saving')
        if db.scalar(select(func.count()).select_from(CartLine).where(CartLine.customer_id==user.id))>=50:raise HTTPException(409,'Remove a cart item before adding more')
        line=CartLine(id=str(uuid4()),customer_id=user.id,listing_id=listing_id,quantity=data.quantity)
        db.add(line)
    else:
        if line.revision!=data.revision:raise HTTPException(409,'Cart changed; reload before saving')
        line.quantity=data.quantity;line.revision+=1
    db.commit();db.refresh(line)
    return {'listing_id':line.listing_id,'quantity':line.quantity,'revision':line.revision}


@router.delete('/commerce/cart/items/{listing_id}')
def delete_cart(listing_id:str,revision:int=Query(...,ge=1),user:User=Depends(current_user),db:Session=Depends(get_db)):
    customer_lock(db,user)
    line=db.scalar(select(CartLine).where(CartLine.customer_id==user.id,CartLine.listing_id==listing_id).with_for_update())
    if not line:raise HTTPException(404,'Cart item not found')
    if line.revision!=revision:raise HTTPException(409,'Cart changed; reload before removing')
    db.delete(line);db.commit();return {'removed':True}


def order_output(row):
    fields=('id','listing_id','title','business','kind','service_id','quantity','unit_price_paise','delivery_fee_paise','quoted_total_paise','fulfilment_method','fulfilment_operator','cancellation_rule','phone','delivery_address','status','revision','mode','created_at','updated_at')
    result={field:getattr(row,field) for field in fields}
    result.update(currency='INR',payment_status='NOT_STARTED',tax_status='NOT_CONFIGURED')
    return result


@router.post('/commerce/orders',status_code=201)
def request_order(data:RequestOrder,user:User=Depends(current_user),db:Session=Depends(get_db)):
    test_ordering();customer_lock(db,user)
    request_hash=hashlib.sha256(json.dumps(data.model_dump(exclude={'idempotency_key'}),sort_keys=True,separators=(',',':')).encode()).hexdigest()
    existing=db.scalar(select(CommerceOrder).where(CommerceOrder.customer_id==user.id,CommerceOrder.idempotency_key==data.idempotency_key))
    if existing:
        if existing.request_hash!=request_hash:raise HTTPException(409,'Use a new idempotency key for a changed order request')
        return order_output(existing)
    provider_id=db.scalar(select(CommerceListing.provider_id).where(CommerceListing.id==data.listing_id))
    if provider_id is None:raise HTTPException(409,'Listing is no longer available')
    db.scalar(select(Provider).where(Provider.id==provider_id).with_for_update().execution_options(populate_existing=True))
    row,provider=published(db,data.listing_id,True)
    if row.kind=='SERVICE_PACKAGE':member_user(user,db)
    line=db.scalar(select(CartLine).where(CartLine.customer_id==user.id,CartLine.listing_id==row.id).with_for_update())
    if line is None or line.revision!=data.cart_revision:raise HTTPException(409,'Cart changed; reload before requesting this order')
    if row.revision!=data.listing_revision:raise HTTPException(409,'Listing price or terms changed; review them before requesting an order')
    orderable(row,line.quantity,data.fulfilment_method)
    if db.scalar(select(func.count()).select_from(CommerceOrder).where(CommerceOrder.customer_id==user.id,CommerceOrder.status.in_(('REQUESTED','CONFIRMED','BUILDING','DISPATCHED','IN_PROGRESS'))))>=100:raise HTTPException(409,'Too many active test orders')
    fee=row.delivery_fee_paise if data.fulfilment_method=='DELIVERY' else 0
    if fee is None:raise HTTPException(409,'Approved delivery charge is missing')
    order=CommerceOrder(id=str(uuid4()),customer_id=user.id,listing_id=row.id,provider_id=provider.id,seller_id=row.seller_id,
        fulfilment_operator=row.fulfilment_operator,kind=row.kind,service_id=row.service_id,title=row.title,business=provider.company or provider.name,
        listing_revision=row.revision,unit_price_paise=row.unit_price_paise,quantity=line.quantity,fulfilment_method=data.fulfilment_method,
        delivery_fee_paise=fee,quoted_total_paise=row.unit_price_paise*line.quantity+fee,cancellation_rule=row.cancellation_rule,
        phone=data.phone,delivery_address=data.delivery_address,idempotency_key=data.idempotency_key,request_hash=request_hash)
    db.add(order);db.delete(line)
    db.add(Audit(actor_id=user.id,action='COMMERCE_ORDER_REQUESTED',entity='commerce_order',entity_id=order.id,details={'mode':'TEST','listing_revision':row.revision}))
    db.commit();db.refresh(order)
    return order_output(order)


def paged_orders(db,query,page):
    total=db.scalar(select(func.count()).select_from(query.subquery()))
    rows=db.scalars(query.order_by(CommerceOrder.created_at.desc(),CommerceOrder.id).offset((page-1)*20).limit(20))
    return {'items':[order_output(row) for row in rows],'page':page,'page_size':20,'total':total}


@router.get('/commerce/orders')
def my_orders(page:int=Query(1,ge=1,le=10000),user:User=Depends(current_user),db:Session=Depends(get_db)):
    return paged_orders(db,select(CommerceOrder).where(CommerceOrder.customer_id==user.id),page)


@router.get('/commerce/orders/{order_id}')
def my_order(order_id:str,user:User=Depends(current_user),db:Session=Depends(get_db)):
    row=db.scalar(select(CommerceOrder).where(CommerceOrder.id==order_id,CommerceOrder.customer_id==user.id))
    if row is None:raise HTTPException(404,'Order not found')
    return order_output(row)


@router.get('/seller/businesses/{provider_id}/commerce-orders')
def business_orders(provider_id:int,page:int=Query(1,ge=1,le=10000),user:User=Depends(seller_user),db:Session=Depends(get_db)):
    provider=db.get(Provider,provider_id)
    if provider is None or provider.owner_user_id!=user.id:raise HTTPException(404,'Owned business not found')
    return paged_orders(db,select(CommerceOrder).where(CommerceOrder.provider_id==provider_id,CommerceOrder.seller_id==user.id,CommerceOrder.fulfilment_operator=='SELLER'),page)


@router.get('/admin/commerce-orders')
def admin_orders(page:int=Query(1,ge=1,le=10000),operator:Literal['SELLER','VISTRAH']|None=None,user:User=Depends(admin_user),db:Session=Depends(get_db)):
    query=select(CommerceOrder)
    if operator:query=query.where(CommerceOrder.fulfilment_operator==operator)
    return paged_orders(db,query,page)


def locked_order(db,order_id):
    reference=db.get(CommerceOrder,order_id)
    if reference is None:raise HTTPException(404,'Order not found')
    provider=db.scalar(select(Provider).where(Provider.id==reference.provider_id).with_for_update().execution_options(populate_existing=True))
    listing=db.scalar(select(CommerceListing).where(CommerceListing.id==reference.listing_id).with_for_update().execution_options(populate_existing=True))
    order=db.scalar(select(CommerceOrder).where(CommerceOrder.id==order_id).with_for_update().execution_options(populate_existing=True))
    return provider,listing,order


def order_change(db,row,user,data,action,**values):
    if row.revision!=data.revision:raise HTTPException(409,'Order changed; reload before continuing')
    changed=db.execute(update(CommerceOrder).where(CommerceOrder.id==row.id,CommerceOrder.revision==data.revision).values(**values,revision=data.revision+1,updated_at=now()).execution_options(synchronize_session=False))
    if changed.rowcount!=1:raise HTTPException(409,'Order changed; reload before continuing')
    db.add(Audit(actor_id=user.id,action=action,entity='commerce_order',entity_id=row.id,details={'status':values['status'],'revision':data.revision+1,'mode':'TEST'}))
    db.commit();db.refresh(row)


def transition(db,provider,listing,row,user,data):
    test_ordering()
    if row.revision!=data.revision:raise HTTPException(409,'Order changed; reload before continuing')
    allowed={'REQUESTED':{'CONFIRMED','REJECTED'},'CONFIRMED':{'BUILDING','DISPATCHED','COMPLETED'} if row.kind=='PRODUCT' else {'IN_PROGRESS'},'BUILDING':{'DISPATCHED','COMPLETED'},'DISPATCHED':{'COMPLETED'},'IN_PROGRESS':{'COMPLETED'}}
    if data.status not in allowed.get(row.status,set()):raise HTTPException(409,'Invalid order status transition')
    if row.kind=='PRODUCT' and ((data.status=='DISPATCHED' and row.fulfilment_method!='DELIVERY') or (data.status=='COMPLETED' and row.fulfilment_method=='DELIVERY' and row.status!='DISPATCHED')):raise HTTPException(409,'Delivery orders must be dispatched before completion')
    if row.kind=='PRODUCT' and data.status=='BUILDING' and row.cancellation_rule!='BEFORE_BUILD':raise HTTPException(409,'Only a reviewed build product can enter building')
    allocated=row.stock_allocated
    if data.status=='CONFIRMED':
        eligible(db,provider,listing)
        if listing.status!='APPROVED' or not listing.available or listing.revision!=row.listing_revision:raise HTTPException(409,'Listing changed; reject this request and ask the customer to review the current offer')
        if row.kind=='SERVICE_PACKAGE':member_user(db.get(User,row.customer_id),db)
        orderable(listing,row.quantity,row.fulfilment_method)
        if row.kind=='PRODUCT':
            changed=db.execute(update(CommerceListing).where(CommerceListing.id==listing.id,CommerceListing.stock_quantity-CommerceListing.allocated_quantity>=row.quantity).values(allocated_quantity=CommerceListing.allocated_quantity+row.quantity).execution_options(synchronize_session=False))
            if changed.rowcount!=1:raise HTTPException(409,'Insufficient approved stock')
            allocated=True
    order_change(db,row,user,data,'COMMERCE_ORDER_'+data.status,status=data.status,stock_allocated=allocated)
    return order_output(row)


@router.post('/seller/businesses/{provider_id}/commerce-orders/{order_id}/transition')
def seller_transition(provider_id:int,order_id:str,data:Transition,user:User=Depends(seller_user),db:Session=Depends(get_db)):
    provider,listing,row=locked_order(db,order_id)
    if provider.id!=provider_id or provider.owner_user_id!=user.id or row.seller_id!=user.id or row.fulfilment_operator!='SELLER':raise HTTPException(404,'Owned seller order not found')
    return transition(db,provider,listing,row,user,data)


@router.post('/admin/commerce-orders/{order_id}/transition')
def platform_transition(order_id:str,data:Transition,user:User=Depends(admin_user),db:Session=Depends(get_db)):
    provider,listing,row=locked_order(db,order_id)
    if row.fulfilment_operator!='VISTRAH':raise HTTPException(403,'Seller-managed orders must be confirmed and fulfilled by the seller')
    return transition(db,provider,listing,row,user,data)


@router.post('/commerce/orders/{order_id}/cancel')
def cancel_order(order_id:str,data:Revision,user:User=Depends(current_user),db:Session=Depends(get_db)):
    test_ordering();_,listing,row=locked_order(db,order_id)
    if row.customer_id!=user.id:raise HTTPException(404,'Order not found')
    if row.revision!=data.revision:raise HTTPException(409,'Order changed; reload before cancelling')
    allowed={'BEFORE_DISPATCH':{'REQUESTED','CONFIRMED','BUILDING'},'BEFORE_BUILD':{'REQUESTED','CONFIRMED'},'BEFORE_SERVICE_START':{'REQUESTED','CONFIRMED'}}
    if row.status not in allowed[row.cancellation_rule]:raise HTTPException(409,'The approved cancellation cutoff has passed')
    if row.stock_allocated:
        changed=db.execute(update(CommerceListing).where(CommerceListing.id==listing.id,CommerceListing.allocated_quantity>=row.quantity).values(allocated_quantity=CommerceListing.allocated_quantity-row.quantity).execution_options(synchronize_session=False))
        if changed.rowcount!=1:raise HTTPException(409,'Inventory requires administrator review')
    order_change(db,row,user,data,'COMMERCE_ORDER_CANCELLED',status='CANCELLED',stock_allocated=False)
    return order_output(row)
