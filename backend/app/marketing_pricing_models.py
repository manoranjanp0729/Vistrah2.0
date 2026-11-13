from sqlalchemy import String, Integer, BigInteger, DateTime, ForeignKey, JSON, Text, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base
from .models import now

class MarketingPriceOverride(Base):
    __tablename__ = 'marketing_price_overrides'
    service_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    draft: Mapped[dict] = mapped_column(JSON)
    published: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    updated_by: Mapped[int] = mapped_column(ForeignKey('users.id'))
    __table_args__ = (CheckConstraint('revision > 0'),)

class MarketingPricingQuote(Base):
    __tablename__ = 'marketing_pricing_quotes'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    service_id: Mapped[str] = mapped_column(String(80))
    service_name: Mapped[str] = mapped_column(String(200))
    package_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String(80))
    fingerprint: Mapped[str] = mapped_column(String(64))
    details: Mapped[dict] = mapped_column(JSON)
    estimate_paise: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    pricing_state: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default='SUBMITTED')
    revision: Mapped[int] = mapped_column(Integer, default=1)
    customer_note: Mapped[str] = mapped_column(Text, default='')
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (UniqueConstraint('user_id','idempotency_key'), CheckConstraint('revision > 0'), CheckConstraint("status IN ('SUBMITTED','REVIEWING','QUOTED','CLOSED','CANCELLED')"))
