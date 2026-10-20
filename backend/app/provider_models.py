"""Provider onboarding extends the existing marketplace provider records."""
from sqlalchemy import String, Text, JSON, DateTime, ForeignKey, UniqueConstraint, CheckConstraint, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base
from .models import now

STATUSES="'DRAFT','SUBMITTED','UNDER_REVIEW','CHANGES_REQUESTED','APPROVED','REJECTED','SUSPENDED'"

class ProviderOwnershipClaim(Base):
    __tablename__ = 'provider_ownership_claims'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    provider_id: Mapped[int] = mapped_column(ForeignKey('providers.id'))
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    statement: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default='PENDING')
    reviewer_id: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    review_note: Mapped[str] = mapped_column(Text, default='')
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), default=now)
    reviewed_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    business_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    registration_evidence_available: Mapped[bool | None] = mapped_column(nullable=True)
    contact_channel: Mapped[str | None] = mapped_column(String(10), nullable=True)
    contact_value: Mapped[str | None] = mapped_column(String(254), nullable=True)
    needs_more_info: Mapped[bool] = mapped_column(default=False)
    __table_args__ = (UniqueConstraint('provider_id', 'user_id'), CheckConstraint("status IN ('PENDING','REJECTED','APPROVED')", name='ck_ownership_claim_status'))

class ProviderOwnershipContactChallenge(Base):
    __tablename__ = 'provider_ownership_contact_challenges'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    claim_id: Mapped[str] = mapped_column(ForeignKey('provider_ownership_claims.id'), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    contact_value: Mapped[str] = mapped_column(String(254))
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), default=now)
    expires_at: Mapped[object] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(default=0)
    invalidated: Mapped[bool] = mapped_column(default=False)
    verified_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    __table_args__ = (CheckConstraint('attempts >= 0 AND attempts <= 5'),)

class ProviderOwnershipClaimEvidence(Base):
    __tablename__ = 'provider_ownership_claim_evidence'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    claim_id: Mapped[str] = mapped_column(ForeignKey('provider_ownership_claims.id'), index=True)
    submitted_by: Mapped[int] = mapped_column(ForeignKey('users.id'))
    evidence_type: Mapped[str] = mapped_column(String(30))
    filename: Mapped[str] = mapped_column(String(80))
    media_type: Mapped[str] = mapped_column(String(60))
    sha256: Mapped[str] = mapped_column(String(64))
    content: Mapped[bytes] = mapped_column(LargeBinary)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (CheckConstraint("evidence_type IN ('BUSINESS_REGISTRATION','AUTHORITY','CORROBORATING')"),)

class ProviderOwnershipClaimEvent(Base):
    __tablename__ = 'provider_ownership_claim_events'
    id: Mapped[int] = mapped_column(primary_key=True)
    claim_id: Mapped[str] = mapped_column(ForeignKey('provider_ownership_claims.id'), index=True)
    actor_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    action: Mapped[str] = mapped_column(String(40))
    reason: Mapped[str] = mapped_column(Text, default='')
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (CheckConstraint("action IN ('CLAIM_CREATED','EVIDENCE_ADDED','INFORMATION_REQUESTED','RESUBMITTED','REJECTED','RECUSED','CONTACT_CHALLENGE_SENT','CONTACT_VERIFIED','APPROVED')", name='ck_claim_event_action'),)

class ProviderPublicationDraft(Base):
    __tablename__ = 'provider_publication_drafts'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    provider_id: Mapped[int] = mapped_column(ForeignKey('providers.id'), index=True)
    service_id: Mapped[int | None] = mapped_column(ForeignKey('services.id'), nullable=True)
    actor_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    base_revision: Mapped[int] = mapped_column(default=0)
    revision: Mapped[int] = mapped_column(default=1)
    status: Mapped[str] = mapped_column(String(20), default='DRAFT')
    payload: Mapped[dict] = mapped_column(JSON)
    prior_payload: Mapped[dict] = mapped_column(JSON)
    reviewer_id: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    review_note: Mapped[str] = mapped_column(Text, default='')
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), default=now)
    reviewed_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    __table_args__ = (CheckConstraint("status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED')"),)

class ProviderRequirement(Base):
    __tablename__='provider_requirements'
    id: Mapped[int]=mapped_column(primary_key=True)
    service_id: Mapped[int]=mapped_column(ForeignKey('services.id'),index=True)
    version: Mapped[int]
    state: Mapped[str]=mapped_column(String(20),default='DRAFT')
    configuration: Mapped[dict]=mapped_column(JSON)
    effective_at: Mapped[object]=mapped_column(DateTime(timezone=True),default=now)
    created_at: Mapped[object]=mapped_column(DateTime(timezone=True),default=now)
    published_at: Mapped[object|None]=mapped_column(DateTime(timezone=True),nullable=True)
    actor_id: Mapped[int|None]=mapped_column(ForeignKey('users.id'),nullable=True)
    change_note: Mapped[str]=mapped_column(Text,default='')
    __table_args__=(UniqueConstraint('service_id','version'),CheckConstraint("state IN ('DRAFT','PUBLISHED','RETIRED')"))

class ProviderApplication(Base):
    __tablename__='provider_applications'
    id: Mapped[str]=mapped_column(String(36),primary_key=True)
    user_id: Mapped[int]=mapped_column(ForeignKey('users.id'),index=True)
    provider_id: Mapped[int|None]=mapped_column(ForeignKey('providers.id'),nullable=True,index=True)
    category_id: Mapped[int]=mapped_column(ForeignKey('categories.id'))
    common: Mapped[dict]=mapped_column(JSON,default=dict)
    common_configuration: Mapped[dict]=mapped_column(JSON)
    status: Mapped[str]=mapped_column(String(30),default='DRAFT')
    revision: Mapped[int]=mapped_column(default=1)
    created_at: Mapped[object]=mapped_column(DateTime(timezone=True),default=now)
    updated_at: Mapped[object]=mapped_column(DateTime(timezone=True),default=now,onupdate=now)
    submitted_at: Mapped[object|None]=mapped_column(DateTime(timezone=True),nullable=True)
    __table_args__=(CheckConstraint(f'status IN ({STATUSES})'),)

class ProviderApplicationService(Base):
    __tablename__='provider_application_services'
    application_id: Mapped[str]=mapped_column(ForeignKey('provider_applications.id'),primary_key=True)
    service_id: Mapped[int]=mapped_column(ForeignKey('services.id'),primary_key=True)
    requirement_id: Mapped[int]=mapped_column(ForeignKey('provider_requirements.id'))
    required_requirement_id: Mapped[int|None]=mapped_column(ForeignKey('provider_requirements.id'),nullable=True)
    answers: Mapped[dict]=mapped_column(JSON,default=dict)
    status: Mapped[str]=mapped_column(String(30),default='DRAFT')
    __table_args__=(CheckConstraint(f'status IN ({STATUSES})'),)

class ProviderDocument(Base):
    __tablename__='provider_documents'
    id: Mapped[str]=mapped_column(String(36),primary_key=True)
    application_id: Mapped[str]=mapped_column(ForeignKey('provider_applications.id'),index=True)
    service_id: Mapped[int]=mapped_column(ForeignKey('services.id'))
    field_id: Mapped[str]=mapped_column(String(100))
    filename: Mapped[str]=mapped_column(String(180))
    media_type: Mapped[str]=mapped_column(String(60))
    sha256: Mapped[str]=mapped_column(String(64))
    content: Mapped[bytes]=mapped_column(LargeBinary)
    created_at: Mapped[object]=mapped_column(DateTime(timezone=True),default=now)

class ProviderApplicationEvent(Base):
    __tablename__='provider_application_events'
    id: Mapped[int]=mapped_column(primary_key=True)
    application_id: Mapped[str]=mapped_column(ForeignKey('provider_applications.id'),index=True)
    service_id: Mapped[int|None]=mapped_column(ForeignKey('services.id'),nullable=True)
    actor_id: Mapped[int]=mapped_column(ForeignKey('users.id'))
    kind: Mapped[str]=mapped_column(String(40))
    reason: Mapped[str]=mapped_column(Text,default='')
    details: Mapped[dict]=mapped_column(JSON,default=dict)
    created_at: Mapped[object]=mapped_column(DateTime(timezone=True),default=now)

class ProviderCatalogueRequest(Base):
    __tablename__='provider_catalogue_requests'
    id: Mapped[str]=mapped_column(String(36),primary_key=True)
    user_id: Mapped[int]=mapped_column(ForeignKey('users.id'),index=True)
    kind: Mapped[str]=mapped_column(String(12))
    category_id: Mapped[int|None]=mapped_column(ForeignKey('categories.id'),nullable=True)
    subcategory_id: Mapped[int|None]=mapped_column(ForeignKey('subcategories.id'),nullable=True)
    title: Mapped[str]=mapped_column(String(150))
    description: Mapped[str]=mapped_column(Text)
    status: Mapped[str]=mapped_column(String(12),default='PENDING',index=True)
    review_note: Mapped[str]=mapped_column(Text,default='')
    reviewer_id: Mapped[int|None]=mapped_column(ForeignKey('users.id'),nullable=True)
    catalogue_id: Mapped[int|None]=mapped_column(nullable=True)
    created_at: Mapped[object]=mapped_column(DateTime(timezone=True),default=now)
    reviewed_at: Mapped[object|None]=mapped_column(DateTime(timezone=True),nullable=True)
    __table_args__=(
        CheckConstraint("kind IN ('CATEGORY','SUBCATEGORY','SERVICE')"),
        CheckConstraint("status IN ('PENDING','APPROVED','REJECTED')"),
        CheckConstraint("(kind = 'CATEGORY' AND category_id IS NULL AND subcategory_id IS NULL) OR (kind = 'SUBCATEGORY' AND category_id IS NOT NULL AND subcategory_id IS NULL) OR (kind = 'SERVICE' AND category_id IS NOT NULL)"),
    )

class ProviderLead(Base):
    __tablename__='provider_leads'
    id: Mapped[int]=mapped_column(primary_key=True)
    request_id: Mapped[int]=mapped_column(ForeignKey('service_requests.id'),index=True)
    provider_id: Mapped[int]=mapped_column(ForeignKey('providers.id'),index=True)
    service_id: Mapped[int]=mapped_column(ForeignKey('services.id'))
    actor_id: Mapped[int]=mapped_column(ForeignKey('users.id'))
    created_at: Mapped[object]=mapped_column(DateTime(timezone=True),default=now)
    __table_args__=(UniqueConstraint('request_id','provider_id'),)
