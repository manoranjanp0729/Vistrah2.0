"""Seller-priced products and service packages; checkout is a separate gate."""
from datetime import datetime
from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base
from .models import now


class CommerceListing(Base):
    __tablename__ = 'commerce_listings'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    provider_id: Mapped[int] = mapped_column(ForeignKey('providers.id'), index=True)
    seller_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    kind: Mapped[str] = mapped_column(String(20))
    service_id: Mapped[int | None] = mapped_column(ForeignKey('services.id'), nullable=True)
    title: Mapped[str] = mapped_column(String(150))
    description: Mapped[str] = mapped_column(Text)
    unit_price_paise: Mapped[int] = mapped_column()
    currency: Mapped[str] = mapped_column(String(3), default='INR')
    available: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(20), default='DRAFT', index=True)
    revision: Mapped[int] = mapped_column(default=1)
    reviewer_id: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    review_note: Mapped[str] = mapped_column(Text, default='')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    __table_args__ = (
        CheckConstraint("kind IN ('PRODUCT','SERVICE_PACKAGE')", name='ck_commerce_kind'),
        CheckConstraint("status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','ARCHIVED')", name='ck_commerce_status'),
        CheckConstraint("currency = 'INR'", name='ck_commerce_currency'),
        CheckConstraint('unit_price_paise > 0 AND unit_price_paise <= 1000000000', name='ck_commerce_price'),
        CheckConstraint('revision > 0', name='ck_commerce_revision'),
        CheckConstraint("(kind = 'PRODUCT' AND service_id IS NULL) OR (kind = 'SERVICE_PACKAGE' AND service_id IS NOT NULL)", name='ck_commerce_service_kind'),
    )
