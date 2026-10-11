from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, Boolean, DateTime, ForeignKey, JSON, UniqueConstraint, CheckConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

def now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = 'users'
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    password_hash: Mapped[str] = mapped_column(Text)
    phone: Mapped[str] = mapped_column(String(20), default='')
    role: Mapped[str] = mapped_column(String(20), default='CUSTOMER')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (CheckConstraint("role IN ('CUSTOMER','ADMIN')"),)

class AuthSession(Base):
    __tablename__ = 'auth_sessions'
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)

class Category(Base):
    __tablename__ = 'categories'
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True)
    title: Mapped[str] = mapped_column(String(150))
    description: Mapped[str] = mapped_column(Text)
    image: Mapped[str] = mapped_column(String(200), default='/images/service.svg')
    active: Mapped[bool] = mapped_column(Boolean, default=True)

class Subcategory(Base):
    __tablename__ = 'subcategories'
    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey('categories.id'), index=True)
    slug: Mapped[str] = mapped_column(String(100))
    title: Mapped[str] = mapped_column(String(150))
    description: Mapped[str] = mapped_column(Text)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (UniqueConstraint('category_id', 'slug'), CheckConstraint("slug <> 'service'"))

class Service(Base):
    __tablename__ = 'services'
    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey('categories.id'), index=True)
    subcategory_id: Mapped[int | None] = mapped_column(ForeignKey('subcategories.id'), nullable=True, index=True)
    slug: Mapped[str] = mapped_column(String(100))
    title: Mapped[str] = mapped_column(String(150))
    description: Mapped[str] = mapped_column(Text)
    includes: Mapped[list] = mapped_column(JSON, default=list)
    image: Mapped[str] = mapped_column(String(200), default='/images/service.svg')
    popular: Mapped[bool] = mapped_column(Boolean, default=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (UniqueConstraint('category_id', 'slug'),)

class ServiceRequest(Base):
    __tablename__ = 'service_requests'
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    service_id: Mapped[int] = mapped_column(ForeignKey('services.id'), index=True)
    requirements: Mapped[str] = mapped_column(Text)
    location: Mapped[str] = mapped_column(String(200))
    phone: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(30), default='NEW', index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)
    __table_args__ = (CheckConstraint("status IN ('NEW','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED')"),)

class Provider(Base):
    __tablename__ = 'providers'
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True)
    name: Mapped[str] = mapped_column(String(150))
    company: Mapped[str] = mapped_column(String(150))
    email: Mapped[str] = mapped_column(String(254))
    phone: Mapped[str] = mapped_column(String(20))
    address: Mapped[str] = mapped_column(Text)
    location: Mapped[str] = mapped_column(String(150))
    source_url: Mapped[str] = mapped_column(Text, default='')
    provenance: Mapped[str] = mapped_column(Text)
    verification_status: Mapped[str] = mapped_column(String(20), default='PENDING')
    verification_evidence: Mapped[str] = mapped_column(Text, default='')
    active: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)
    __table_args__ = (CheckConstraint("verification_status IN ('PENDING','VERIFIED','REJECTED','INACTIVE')"),)

class ProviderService(Base):
    __tablename__ = 'provider_services'
    provider_id: Mapped[int] = mapped_column(ForeignKey('providers.id'), primary_key=True)
    service_id: Mapped[int] = mapped_column(ForeignKey('services.id'), primary_key=True)

class Plan(Base):
    __tablename__ = 'plans'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    amount: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(3), default='INR')
    days: Mapped[int] = mapped_column(Integer, default=30)
    __table_args__ = (CheckConstraint('amount > 0 AND days > 0'),)

class Payment(Base):
    __tablename__ = 'payments'
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey('plans.id'))
    amount: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(3))
    status: Mapped[str] = mapped_column(String(20), default='PENDING')
    mode: Mapped[str] = mapped_column(String(20), default='SANDBOX')
    idempotency_key: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (UniqueConstraint('user_id', 'idempotency_key'), CheckConstraint('amount > 0'), CheckConstraint("status IN ('PENDING','SUCCEEDED','FAILED','REFUNDED')"), CheckConstraint("mode = 'SANDBOX'"))

class Membership(Base):
    __tablename__ = 'memberships'
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    payment_id: Mapped[str] = mapped_column(ForeignKey('payments.id'), unique=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)

class Offer(Base):
    __tablename__ = 'offers'
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(150))
    scope: Mapped[str] = mapped_column(String(20))
    target_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    type: Mapped[str] = mapped_column(String(20))
    value: Mapped[int] = mapped_column(Integer)
    terms: Mapped[str] = mapped_column(Text)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (CheckConstraint("scope IN ('ALL','CATEGORY','SERVICE','PROVIDER')"), CheckConstraint("type IN ('PERCENT','FIXED')"), CheckConstraint('value > 0'), CheckConstraint('ends_at > starts_at'))

class WebhookEvent(Base):
    __tablename__ = 'webhook_events'
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    payment_id: Mapped[str] = mapped_column(ForeignKey('payments.id'), index=True)
    payload_hash: Mapped[str] = mapped_column(String(64))
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Allocation(Base):
    __tablename__ = 'allocations'
    id: Mapped[int] = mapped_column(primary_key=True)
    payment_id: Mapped[str] = mapped_column(ForeignKey('payments.id'), index=True)
    recipient: Mapped[str] = mapped_column(String(100), default='VISTRAH')
    amount: Mapped[int] = mapped_column(Integer)
    kind: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (UniqueConstraint('payment_id', 'kind'), CheckConstraint("(kind = 'CREDIT' AND amount > 0) OR (kind = 'REVERSAL' AND amount < 0)"))

class Refund(Base):
    __tablename__ = 'refunds'
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    payment_id: Mapped[str] = mapped_column(ForeignKey('payments.id'), unique=True)
    amount: Mapped[int] = mapped_column(Integer)
    reason: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Reconciliation(Base):
    __tablename__ = 'reconciliations'
    id: Mapped[int] = mapped_column(primary_key=True)
    payment_id: Mapped[str] = mapped_column(ForeignKey('payments.id'), index=True)
    balanced: Mapped[bool] = mapped_column(Boolean)
    expected: Mapped[int] = mapped_column(Integer)
    actual: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Audit(Base):
    __tablename__ = 'audit_logs'
    id: Mapped[int] = mapped_column(primary_key=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    action: Mapped[str] = mapped_column(String(100), index=True)
    entity: Mapped[str] = mapped_column(String(50))
    entity_id: Mapped[str] = mapped_column(String(100))
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)

class LoginAttempt(Base):
    __tablename__ = 'login_attempts'
    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(64), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)

class BootstrapState(Base):
    __tablename__ = 'bootstrap_state'
    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
