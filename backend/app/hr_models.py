"""SQLAlchemy model for internal Employees & HR Letter Generator (027)."""
from __future__ import annotations

from datetime import date, datetime
from sqlalchemy import BigInteger, Boolean, CheckConstraint, Date, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base
from .models import now


class HREmployee(Base):
    __tablename__ = 'hr_employees'
    __table_args__ = (
        CheckConstraint(
            "employment_type IN ('permanent', 'probation', 'fixed_term', 'intern')",
            name='ck_hr_employees_employment_type',
        ),
        CheckConstraint(
            "status IN ('active', 'relieved')",
            name='ck_hr_employees_status',
        ),
        CheckConstraint('annual_ctc_inr >= 0', name='ck_hr_employees_ctc_nonneg'),
        CheckConstraint('probation_months >= 0', name='ck_hr_employees_probation_nonneg'),
        CheckConstraint('notice_period_days >= 0', name='ck_hr_employees_notice_nonneg'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    employee_code: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(32), default='', nullable=False)
    address: Mapped[str] = mapped_column(Text, default='', nullable=False)
    designation: Mapped[str] = mapped_column(String(160), nullable=False)
    division: Mapped[str] = mapped_column(String(120), nullable=False)
    employment_type: Mapped[str] = mapped_column(String(32), default='permanent', nullable=False)
    work_location: Mapped[str] = mapped_column(
        String(160), default='Bengaluru, Karnataka', nullable=False
    )
    joining_date: Mapped[date] = mapped_column(Date, nullable=False)
    probation_months: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    notice_period_days: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    exit_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    last_working_day: Mapped[date | None] = mapped_column(Date, nullable=True)
    annual_ctc_inr: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    pf_applicable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    pt_applicable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    pf_capped: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    status: Mapped[str] = mapped_column(String(24), default='active', index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, onupdate=now, nullable=False
    )
