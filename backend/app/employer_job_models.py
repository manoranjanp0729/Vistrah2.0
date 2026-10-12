"""Direct employer postings stay separate from acquired external vacancies."""
from datetime import date, datetime
from sqlalchemy import String, Text, Date, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base
from .models import now

class EmployerJob(Base):
    __tablename__ = 'employer_jobs'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    provider_id: Mapped[int] = mapped_column(ForeignKey('providers.id'), index=True)
    actor_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    title: Mapped[str] = mapped_column(String(150))
    description: Mapped[str] = mapped_column(Text)
    location: Mapped[str] = mapped_column(String(150))
    arrangement: Mapped[str] = mapped_column(String(10))
    employment_type: Mapped[str] = mapped_column(String(20))
    salary_text: Mapped[str] = mapped_column(String(300), default='')
    application_url: Mapped[str] = mapped_column(String(1500))
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default='DRAFT', index=True)
    revision: Mapped[int] = mapped_column(default=1)
    reviewer_id: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    review_note: Mapped[str] = mapped_column(Text, default='')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    __table_args__ = (
        CheckConstraint("status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','CLOSED')", name='ck_employer_job_status'),
        CheckConstraint('revision > 0', name='ck_employer_job_revision'),
        CheckConstraint("arrangement IN ('REMOTE','HYBRID','ONSITE')", name='ck_employer_job_arrangement'),
        CheckConstraint("employment_type IN ('FULL_TIME','PART_TIME','CONTRACT','INTERNSHIP','TEMPORARY')", name='ck_employer_job_type'),
    )
