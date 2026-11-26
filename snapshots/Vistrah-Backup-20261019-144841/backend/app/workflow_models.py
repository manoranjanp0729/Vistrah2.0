"""Durable execution records; customer content is kept separate from operational views."""
from datetime import datetime
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, JSON, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base
from .models import now

RUN_STATES = ('DRAFT','READY','QUEUED','RUNNING','WAITING_APPROVAL','COMPLETED','FAILED','PARTIALLY_COMPLETED','CANCELLED')
ACTION_STATES = ('PENDING','WAITING_APPROVAL','QUEUED','RUNNING','COMPLETED','FAILED','BLOCKED','REJECTED','CANCELLED')

class ActionDefinition(Base):
    __tablename__ = 'action_definitions'
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    identifier: Mapped[str] = mapped_column(String(80))
    version: Mapped[int] = mapped_column(Integer)
    specification: Mapped[dict] = mapped_column(JSON)
    __table_args__ = (UniqueConstraint('identifier','version'),)

class WorkflowTemplate(Base):
    __tablename__ = 'workflow_templates'
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    specification: Mapped[dict] = mapped_column(JSON)

class WorkflowDocument(Base):
    __tablename__ = 'workflow_documents'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    filename: Mapped[str] = mapped_column(String(150))
    content: Mapped[str] = mapped_column(Text)
    sha256: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class WorkflowRun(Base):
    __tablename__ = 'workflow_runs'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    request_id: Mapped[int] = mapped_column(ForeignKey('service_requests.id'), index=True)
    template_id: Mapped[str] = mapped_column(ForeignKey('workflow_templates.id'))
    idempotency_key: Mapped[str] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(30), default='DRAFT', index=True)
    inputs: Mapped[dict] = mapped_column(JSON, default=dict)
    input_hash: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)
    __table_args__ = (UniqueConstraint('user_id','idempotency_key'), CheckConstraint('status IN '+str(RUN_STATES)))

class ActionRun(Base):
    __tablename__ = 'action_runs'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workflow_id: Mapped[str] = mapped_column(ForeignKey('workflow_runs.id'), index=True)
    definition_id: Mapped[str] = mapped_column(ForeignKey('action_definitions.id'))
    status: Mapped[str] = mapped_column(String(30), default='PENDING', index=True)
    ordinal: Mapped[int] = mapped_column(Integer)
    snapshot: Mapped[dict] = mapped_column(JSON, default=dict)
    result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error: Mapped[str | None] = mapped_column(String(300), nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    lease_token: Mapped[str | None] = mapped_column(String(36), nullable=True)
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    __table_args__ = (UniqueConstraint('workflow_id','definition_id'), CheckConstraint('status IN '+str(ACTION_STATES)))

class ActionDependency(Base):
    __tablename__ = 'action_dependencies'
    action_id: Mapped[str] = mapped_column(ForeignKey('action_runs.id'), primary_key=True)
    prerequisite_id: Mapped[str] = mapped_column(ForeignKey('action_runs.id'), primary_key=True)
    __table_args__ = (CheckConstraint('action_id <> prerequisite_id'),)

class WorkflowApproval(Base):
    __tablename__ = 'workflow_approvals'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    action_id: Mapped[str] = mapped_column(ForeignKey('action_runs.id'), unique=True)
    status: Mapped[str] = mapped_column(String(20), default='PENDING')
    scope: Mapped[dict] = mapped_column(JSON)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (CheckConstraint("status IN ('PENDING','APPROVED','REJECTED','CANCELLED')"),)

class ExecutionAttempt(Base):
    __tablename__ = 'execution_attempts'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    action_id: Mapped[str] = mapped_column(ForeignKey('action_runs.id'), index=True)
    number: Mapped[int] = mapped_column(Integer)
    idempotency_key: Mapped[str] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20))
    error_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    __table_args__ = (UniqueConstraint('action_id','number'), CheckConstraint("status IN ('RUNNING','COMPLETED','FAILED','INTERRUPTED','TIMED_OUT','CANCELLED')"))

class WorkflowEvidence(Base):
    __tablename__ = 'workflow_evidence'
    id: Mapped[int] = mapped_column(primary_key=True)
    action_id: Mapped[str] = mapped_column(ForeignKey('action_runs.id'), index=True)
    source_url: Mapped[str] = mapped_column(Text)
    discovered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    description: Mapped[str] = mapped_column(String(300))

class WorkflowEvent(Base):
    __tablename__ = 'workflow_events'
    id: Mapped[int] = mapped_column(primary_key=True)
    workflow_id: Mapped[str] = mapped_column(ForeignKey('workflow_runs.id'), index=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    action_id: Mapped[str | None] = mapped_column(ForeignKey('action_runs.id'), nullable=True)
    kind: Mapped[str] = mapped_column(String(60))
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class WorkflowWorker(Base):
    __tablename__ = 'workflow_workers'
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    heartbeat_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class ApplicationRecord(Base):
    __tablename__ = 'workflow_application_records'
    id: Mapped[int] = mapped_column(primary_key=True)
    workflow_id: Mapped[str] = mapped_column(ForeignKey('workflow_runs.id'), index=True)
    source_url: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)
    __table_args__ = (UniqueConstraint('workflow_id','source_url'), CheckConstraint("status IN ('SAVED','APPLIED','INTERVIEW','OFFER','REJECTED','WITHDRAWN')"))
