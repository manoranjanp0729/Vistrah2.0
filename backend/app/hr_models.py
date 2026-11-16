"""SQLAlchemy models for internal Employees, Bank Payout KYC & Monthly Salary Credits (027-028)."""
from __future__ import annotations

from datetime import date, datetime
from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
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

    # 028: Bank & Statutory Payout KYC columns
    bank_account_holder: Mapped[str | None] = mapped_column(String(160), nullable=True)
    bank_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    bank_account_number: Mapped[str | None] = mapped_column(String(40), nullable=True)
    bank_ifsc: Mapped[str | None] = mapped_column(String(16), nullable=True)
    bank_account_type: Mapped[str | None] = mapped_column(String(24), nullable=True)
    pan_number: Mapped[str | None] = mapped_column(String(16), nullable=True)
    uan_number: Mapped[str | None] = mapped_column(String(24), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, onupdate=now, nullable=False
    )


class HRSalaryCredit(Base):
    __tablename__ = 'hr_salary_credits'
    __table_args__ = (
        UniqueConstraint('employee_id', 'pay_month', name='uq_hr_salary_credits_employee_month'),
        CheckConstraint(
            "payment_mode IN ('NEFT', 'IMPS', 'UPI', 'BANK_TRANSFER')",
            name='ck_hr_salary_credits_payment_mode',
        ),
        CheckConstraint(
            "status IN ('pending', 'credited')",
            name='ck_hr_salary_credits_status',
        ),
        CheckConstraint('gross_earnings_inr >= 0', name='ck_hr_salary_credits_gross_nonneg'),
        CheckConstraint('pf_deduction_inr >= 0', name='ck_hr_salary_credits_pf_nonneg'),
        CheckConstraint('pt_deduction_inr >= 0', name='ck_hr_salary_credits_pt_nonneg'),
        CheckConstraint('tds_deduction_inr >= 0', name='ck_hr_salary_credits_tds_nonneg'),
        CheckConstraint('other_deduction_inr >= 0', name='ck_hr_salary_credits_other_nonneg'),
        CheckConstraint('net_paid_inr >= 0', name='ck_hr_salary_credits_net_nonneg'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    employee_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey('hr_employees.id', ondelete='CASCADE'),
        index=True,
        nullable=False,
    )
    pay_month: Mapped[str] = mapped_column(String(7), index=True, nullable=False)
    gross_earnings_inr: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    pf_deduction_inr: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    pt_deduction_inr: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    tds_deduction_inr: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    other_deduction_inr: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    net_paid_inr: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    payment_mode: Mapped[str] = mapped_column(String(24), default='NEFT', nullable=False)
    utr_reference: Mapped[str | None] = mapped_column(String(80), nullable=True)
    credited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(24), default='pending', index=True, nullable=False)
    notes: Mapped[str] = mapped_column(Text, default='', nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, nullable=False)
