"""Provider operations and public vacancies; private search snapshots stay on workflows."""
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base
from .models import now

class JobSource(Base):
    __tablename__ = 'job_sources'
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    succeeded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    next_request_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    lease_token: Mapped[str | None] = mapped_column(String(36))
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_code: Mapped[str | None] = mapped_column(String(60))
    request_times: Mapped[list] = mapped_column(JSON, default=list)

class Vacancy(Base):
    __tablename__ = 'vacancies'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    canonical_url: Mapped[str] = mapped_column(String(1500), unique=True)
    fingerprint: Mapped[str] = mapped_column(String(64), index=True)
    record: Mapped[dict] = mapped_column(JSON)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    last_checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class VacancyProvenance(Base):
    __tablename__ = 'vacancy_provenance'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    vacancy_id: Mapped[str] = mapped_column(ForeignKey('vacancies.id'), index=True)
    source_id: Mapped[str] = mapped_column(ForeignKey('job_sources.id'))
    source_record_id: Mapped[str] = mapped_column(String(150))
    source_url: Mapped[str] = mapped_column(String(1500))
    attribution: Mapped[str] = mapped_column(String(100))
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (UniqueConstraint('source_id', 'source_record_id'),)

class Acquisition(Base):
    __tablename__ = 'job_acquisitions'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    action_id: Mapped[str] = mapped_column(ForeignKey('action_runs.id'), unique=True)
    workflow_id: Mapped[str] = mapped_column(ForeignKey('workflow_runs.id'), index=True)
    status: Mapped[str] = mapped_column(String(30), default='RUNNING')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

class AcquisitionSource(Base):
    __tablename__ = 'job_acquisition_sources'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    acquisition_id: Mapped[str] = mapped_column(ForeignKey('job_acquisitions.id'), index=True)
    source_id: Mapped[str] = mapped_column(ForeignKey('job_sources.id'))
    status: Mapped[str] = mapped_column(String(30), default='PENDING')
    error_code: Mapped[str | None] = mapped_column(String(60))
    pages: Mapped[int] = mapped_column(Integer, default=0)
    retrieved_count: Mapped[int] = mapped_column(Integer, default=0)
    invalid_count: Mapped[int] = mapped_column(Integer, default=0)
    cache_used: Mapped[bool] = mapped_column(Boolean, default=False)
    next_page: Mapped[int | None] = mapped_column(Integer, default=1)
    checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    snapshots: Mapped[list] = mapped_column(JSON, default=list)
    __table_args__ = (UniqueConstraint('acquisition_id', 'source_id'),)
