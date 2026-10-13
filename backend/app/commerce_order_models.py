"""Unpaid development order requests; no live payment entitlement."""
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, Integer, BigInteger, Boolean, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base
from .models import now


class CartLine(Base):
    __tablename__='commerce_cart_lines'
    id: Mapped[str]=mapped_column(String(36),primary_key=True)
    customer_id: Mapped[int]=mapped_column(ForeignKey('users.id'),index=True)
    listing_id: Mapped[str]=mapped_column(ForeignKey('commerce_listings.id'))
    quantity: Mapped[int]=mapped_column(Integer)
    revision: Mapped[int]=mapped_column(Integer,default=1)
    __table_args__=(UniqueConstraint('customer_id','listing_id',name='uq_commerce_cart_listing'),CheckConstraint('quantity >= 1 AND quantity <= 999',name='ck_commerce_cart_quantity'),CheckConstraint('revision > 0',name='ck_commerce_cart_revision'))


class CommerceOrder(Base):
    __tablename__='commerce_orders'
    id: Mapped[str]=mapped_column(String(36),primary_key=True)
    customer_id: Mapped[int]=mapped_column(ForeignKey('users.id'),index=True)
    listing_id: Mapped[str]=mapped_column(ForeignKey('commerce_listings.id'))
    provider_id: Mapped[int]=mapped_column(ForeignKey('providers.id'),index=True)
    seller_id: Mapped[int]=mapped_column(ForeignKey('users.id'))
    fulfilment_operator: Mapped[str]=mapped_column(String(10))
    kind: Mapped[str]=mapped_column(String(20))
    service_id: Mapped[int | None]=mapped_column(ForeignKey('services.id'),nullable=True)
    title: Mapped[str]=mapped_column(String(150))
    business: Mapped[str]=mapped_column(String(150))
    listing_revision: Mapped[int]=mapped_column(Integer)
    unit_price_paise: Mapped[int]=mapped_column(Integer)
    quantity: Mapped[int]=mapped_column(Integer)
    fulfilment_method: Mapped[str]=mapped_column(String(10))
    delivery_fee_paise: Mapped[int]=mapped_column(Integer)
    quoted_total_paise: Mapped[int]=mapped_column(BigInteger)
    cancellation_rule: Mapped[str]=mapped_column(String(30))
    phone: Mapped[str]=mapped_column(String(20))
    delivery_address: Mapped[str | None]=mapped_column(Text,nullable=True)
    status: Mapped[str]=mapped_column(String(20),default='REQUESTED',index=True)
    revision: Mapped[int]=mapped_column(Integer,default=1)
    stock_allocated: Mapped[bool]=mapped_column(Boolean,default=False)
    mode: Mapped[str]=mapped_column(String(10),default='TEST')
    idempotency_key: Mapped[str]=mapped_column(String(80))
    request_hash: Mapped[str]=mapped_column(String(64))
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    updated_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    __table_args__=(
        UniqueConstraint('customer_id','idempotency_key',name='uq_commerce_order_idempotency'),
        CheckConstraint("status IN ('REQUESTED','CONFIRMED','BUILDING','DISPATCHED','IN_PROGRESS','COMPLETED','CANCELLED','REJECTED')",name='ck_commerce_order_status'),
        CheckConstraint("mode = 'TEST'",name='ck_commerce_order_mode'),
        CheckConstraint('quantity >= 1 AND quantity <= 999 AND revision > 0 AND listing_revision > 0',name='ck_commerce_order_quantity'),
        CheckConstraint('unit_price_paise > 0 AND unit_price_paise <= 1000000000 AND delivery_fee_paise >= 0 AND delivery_fee_paise <= 1000000000 AND quoted_total_paise = unit_price_paise * CAST(quantity AS BIGINT) + delivery_fee_paise',name='ck_commerce_order_price'),
        CheckConstraint("(kind = 'PRODUCT' AND fulfilment_operator = 'SELLER' AND service_id IS NULL AND fulfilment_method IN ('PICKUP','DELIVERY') AND cancellation_rule IN ('BEFORE_DISPATCH','BEFORE_BUILD')) OR (kind = 'SERVICE_PACKAGE' AND service_id IS NOT NULL AND fulfilment_operator IN ('SELLER','VISTRAH') AND fulfilment_method = 'SERVICE' AND cancellation_rule = 'BEFORE_SERVICE_START')",name='ck_commerce_order_kind'),
        CheckConstraint("(fulfilment_method = 'DELIVERY' AND delivery_address IS NOT NULL) OR (fulfilment_method != 'DELIVERY' AND delivery_address IS NULL AND delivery_fee_paise = 0)",name='ck_commerce_order_delivery'),
    )
