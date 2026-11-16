"""Admin-only CRUD & Monthly Payroll Credit APIs (/api/admin/employees & /salary-credits)."""
from __future__ import annotations

from datetime import date, datetime, timezone
import math
import re
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import EmailStr, Field, field_validator
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from .database import get_db
from .hr_models import HREmployee, HRSalaryCredit
from .models import Audit, User, now
from .schemas import Schema
from .security import admin_user

router = APIRouter(tags=['Admin HR Employees'])

EmploymentType = Literal['permanent', 'probation', 'fixed_term', 'intern']
EmployeeStatus = Literal['active', 'relieved']
BankAccountType = Literal['savings', 'salary', 'current']
PaymentMode = Literal['NEFT', 'IMPS', 'UPI', 'BANK_TRANSFER']
SalaryCreditStatus = Literal['pending', 'credited']

CODE_RE = re.compile(r'^[A-Z0-9][A-Z0-9_-]{2,39}$')
IFSC_RE = re.compile(r'^[A-Z]{4}0[A-Z0-9]{6}$')
ACCOUNT_NO_RE = re.compile(r'^[0-9A-Z]{6,34}$')
PAN_RE = re.compile(r'^[A-Z]{5}[0-9]{4}[A-Z]$')
UAN_RE = re.compile(r'^\d{12}$')
PAY_MONTH_RE = re.compile(r'^\d{4}-(0[1-9]|1[0-2])$')


def _iso(val) -> str | None:
    return val.isoformat() if hasattr(val, 'isoformat') and val is not None else val


def _js_round(val: float) -> int:
    """Match JavaScript Math.round() for non-negative values (half rounds up)."""
    return int(math.floor(val + 0.5))


def calculate_monthly_payroll_figures(
    annual_ctc_inr: int,
    *,
    pf_applicable: bool = True,
    pt_applicable: bool = True,
    pf_capped: bool = True,
) -> dict[str, int]:
    """Deterministic server mirror of shared/hr-payroll.ts calculateSalaryBreakdown."""
    clean_annual_ctc = max(0, int(annual_ctc_inr or 0))
    monthly_ctc = _js_round(clean_annual_ctc / 12.0)

    monthly_basic = int(math.ceil(monthly_ctc * 0.5))
    monthly_hra = _js_round(monthly_basic * 0.5)

    monthly_employer_pf = 0
    if pf_applicable and clean_annual_ctc > 0:
        pf_wage = min(monthly_basic, 15000) if pf_capped else monthly_basic
        monthly_employer_pf = _js_round(pf_wage * 0.12)

    monthly_special = max(
        0, monthly_ctc - monthly_basic - monthly_hra - monthly_employer_pf
    )
    monthly_gross = monthly_basic + monthly_hra + monthly_special
    monthly_emp_pf = monthly_employer_pf
    monthly_pt = 200 if (pt_applicable and monthly_gross >= 25000) else 0
    monthly_net = max(0, monthly_gross - monthly_emp_pf - monthly_pt)

    return {
        'basic_inr': monthly_basic,
        'hra_inr': monthly_hra,
        'special_allowance_inr': monthly_special,
        'gross_earnings_inr': monthly_gross,
        'pf_deduction_inr': monthly_emp_pf,
        'pt_deduction_inr': monthly_pt,
        'net_paid_inr': monthly_net,
    }


def mask_account_number(account_number: str | None) -> str | None:
    if not account_number:
        return None
    clean = account_number.strip()
    if not clean:
        return None
    return f'••••{clean[-4:]}' if len(clean) > 4 else f'••••{clean}'


def serialize_employee(row: HREmployee) -> dict:
    return {
        'id': row.id,
        'employee_code': row.employee_code,
        'full_name': row.full_name,
        'email': row.email,
        'phone': row.phone,
        'address': row.address,
        'designation': row.designation,
        'division': row.division,
        'employment_type': row.employment_type,
        'work_location': row.work_location,
        'joining_date': _iso(row.joining_date),
        'probation_months': int(row.probation_months),
        'notice_period_days': int(row.notice_period_days),
        'exit_date': _iso(row.exit_date),
        'last_working_day': _iso(row.last_working_day),
        'annual_ctc_inr': int(row.annual_ctc_inr),
        'pf_applicable': bool(row.pf_applicable),
        'pt_applicable': bool(row.pt_applicable),
        'pf_capped': bool(row.pf_capped),
        'status': row.status,
        'bank_account_holder': row.bank_account_holder,
        'bank_name': row.bank_name,
        'bank_account_number': row.bank_account_number,
        'masked_bank_account': mask_account_number(row.bank_account_number),
        'bank_ifsc': row.bank_ifsc,
        'bank_account_type': row.bank_account_type,
        'pan_number': row.pan_number,
        'uan_number': row.uan_number,
        'created_at': _iso(row.created_at),
        'updated_at': _iso(row.updated_at),
    }


def serialize_salary_credit(row: HRSalaryCredit, emp: HREmployee | None = None) -> dict:
    data = {
        'id': row.id,
        'employee_id': row.employee_id,
        'pay_month': row.pay_month,
        'gross_earnings_inr': int(row.gross_earnings_inr),
        'pf_deduction_inr': int(row.pf_deduction_inr),
        'pt_deduction_inr': int(row.pt_deduction_inr),
        'tds_deduction_inr': int(row.tds_deduction_inr),
        'other_deduction_inr': int(row.other_deduction_inr),
        'net_paid_inr': int(row.net_paid_inr),
        'payment_mode': row.payment_mode,
        'utr_reference': row.utr_reference,
        'credited_at': _iso(row.credited_at),
        'status': row.status,
        'notes': row.notes or '',
        'created_at': _iso(row.created_at),
    }
    if emp is not None:
        monthly_fig = calculate_monthly_payroll_figures(
            emp.annual_ctc_inr,
            pf_applicable=emp.pf_applicable,
            pt_applicable=emp.pt_applicable,
            pf_capped=emp.pf_capped,
        )
        data['employee'] = {
            **serialize_employee(emp),
            'basic_monthly_inr': monthly_fig['basic_inr'],
            'hra_monthly_inr': monthly_fig['hra_inr'],
            'special_monthly_inr': monthly_fig['special_allowance_inr'],
        }
    return data


def _next_employee_code(db: Session) -> str:
    max_id = int(db.scalar(select(func.max(HREmployee.id))) or 0)
    seq = max_id + 1
    while True:
        candidate = f'VST-EMP-{seq:03d}'
        exists = db.scalar(
            select(HREmployee.id).where(HREmployee.employee_code == candidate)
        )
        if not exists:
            return candidate
        seq += 1


def _validate_dates(joining_date: date, exit_date: date | None, last_working_day: date | None):
    if exit_date is not None and exit_date < joining_date:
        raise HTTPException(422, 'Exit date cannot be earlier than joining date.')
    if last_working_day is not None and last_working_day < joining_date:
        raise HTTPException(422, 'Last working day cannot be earlier than joining date.')


def _clean_optional_str(v, max_len: int = 160) -> str | None:
    if v is None:
        return None
    s = str(v).strip()
    if not s:
        return None
    if len(s) > max_len:
        raise ValueError(f'Must be at most {max_len} characters.')
    return s


def _parse_credited_at(val: str | datetime | date | None) -> datetime | None:
    if val is None:
        return None
    if isinstance(val, datetime):
        return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
    if isinstance(val, date):
        return datetime(val.year, val.month, val.day, 12, 0, 0, tzinfo=timezone.utc)
    raw = str(val).strip()
    if not raw:
        return None
    if re.match(r'^\d{4}-\d{2}-\d{2}$', raw):
        d = date.fromisoformat(raw)
        return datetime(d.year, d.month, d.day, 12, 0, 0, tzinfo=timezone.utc)
    normalized = raw[:-1] + '+00:00' if raw.endswith('Z') else raw
    dt = datetime.fromisoformat(normalized)
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


class _BankKycValidatorsMixin(Schema):
    bank_account_holder: str | None = Field(default=None, max_length=160)
    bank_name: str | None = Field(default=None, max_length=120)
    bank_account_number: str | None = Field(default=None, max_length=40)
    bank_ifsc: str | None = Field(default=None, max_length=16)
    bank_account_type: BankAccountType | None = None
    pan_number: str | None = Field(default=None, max_length=16)
    uan_number: str | None = Field(default=None, max_length=24)

    @field_validator('bank_account_holder', mode='before')
    @classmethod
    def _val_holder(cls, v):
        return _clean_optional_str(v, 160)

    @field_validator('bank_name', mode='before')
    @classmethod
    def _val_bank_name(cls, v):
        return _clean_optional_str(v, 120)

    @field_validator('bank_account_type', mode='before')
    @classmethod
    def _val_acct_type(cls, v):
        if v is None or str(v).strip() == '':
            return None
        return str(v).strip().lower()

    @field_validator('bank_account_number', mode='before')
    @classmethod
    def _val_acct_no(cls, v):
        cleaned = _clean_optional_str(v, 40)
        if cleaned is None:
            return None
        upper = cleaned.replace(' ', '').upper()
        if not ACCOUNT_NO_RE.match(upper):
            raise ValueError('Bank account number must be 6-34 digits/uppercase characters.')
        return upper

    @field_validator('bank_ifsc', mode='before')
    @classmethod
    def _val_ifsc(cls, v):
        cleaned = _clean_optional_str(v, 16)
        if cleaned is None:
            return None
        upper = cleaned.replace(' ', '').upper()
        if not IFSC_RE.match(upper):
            raise ValueError('IFSC must match standard 11-character format (e.g. HDFC0001234).')
        return upper

    @field_validator('pan_number', mode='before')
    @classmethod
    def _val_pan(cls, v):
        cleaned = _clean_optional_str(v, 16)
        if cleaned is None:
            return None
        upper = cleaned.replace(' ', '').upper()
        if not PAN_RE.match(upper):
            raise ValueError('PAN must match standard 10-character format (e.g. ABCDE1234F).')
        return upper

    @field_validator('uan_number', mode='before')
    @classmethod
    def _val_uan(cls, v):
        cleaned = _clean_optional_str(v, 24)
        if cleaned is None:
            return None
        digits = cleaned.replace(' ', '')
        if not UAN_RE.match(digits):
            raise ValueError('UAN must be a 12-digit EPFO Universal Account Number.')
        return digits


class EmployeeCreatePayload(_BankKycValidatorsMixin):
    employee_code: str | None = Field(default=None, max_length=40)
    full_name: str = Field(min_length=1, max_length=160)
    email: EmailStr
    phone: str = Field(default='', max_length=32)
    address: str = Field(default='', max_length=1000)
    designation: str = Field(min_length=1, max_length=160)
    division: str = Field(min_length=1, max_length=120)
    employment_type: EmploymentType = 'permanent'
    work_location: str = Field(default='Bengaluru, Karnataka', min_length=1, max_length=160)
    joining_date: date
    probation_months: int = Field(default=3, ge=0, le=24)
    notice_period_days: int = Field(default=30, ge=0, le=180)
    exit_date: date | None = None
    last_working_day: date | None = None
    annual_ctc_inr: int = Field(ge=0, le=500_000_000)
    pf_applicable: bool = True
    pt_applicable: bool = True
    pf_capped: bool = True
    status: EmployeeStatus = 'active'

    @field_validator('employee_code', mode='before')
    @classmethod
    def _clean_code(cls, v):
        if v is None:
            return None
        cleaned = str(v).strip().upper()
        if not cleaned:
            return None
        if not CODE_RE.match(cleaned):
            raise ValueError(
                'Employee code must be 3-40 uppercase letters, digits, hyphens, or underscores.'
            )
        return cleaned


class EmployeePatchPayload(_BankKycValidatorsMixin):
    employee_code: str | None = Field(default=None, max_length=40)
    full_name: str | None = Field(default=None, min_length=1, max_length=160)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=32)
    address: str | None = Field(default=None, max_length=1000)
    designation: str | None = Field(default=None, min_length=1, max_length=160)
    division: str | None = Field(default=None, min_length=1, max_length=120)
    employment_type: EmploymentType | None = None
    work_location: str | None = Field(default=None, min_length=1, max_length=160)
    joining_date: date | None = None
    probation_months: int | None = Field(default=None, ge=0, le=24)
    notice_period_days: int | None = Field(default=None, ge=0, le=180)
    exit_date: date | None = None
    last_working_day: date | None = None
    annual_ctc_inr: int | None = Field(default=None, ge=0, le=500_000_000)
    pf_applicable: bool | None = None
    pt_applicable: bool | None = None
    pf_capped: bool | None = None
    status: EmployeeStatus | None = None

    @field_validator('employee_code', mode='before')
    @classmethod
    def _clean_patch_code(cls, v):
        if v is None:
            return None
        cleaned = str(v).strip().upper()
        if not cleaned:
            raise ValueError('Employee code cannot be empty.')
        if not CODE_RE.match(cleaned):
            raise ValueError(
                'Employee code must be 3-40 uppercase letters, digits, hyphens, or underscores.'
            )
        return cleaned


class SalaryCreditCreateOrBatchPayload(Schema):
    pay_month: str = Field(min_length=7, max_length=7)
    prepare_active: bool = False
    employee_id: int | None = None
    gross_earnings_inr: int | None = Field(default=None, ge=0, le=100_000_000)
    pf_deduction_inr: int | None = Field(default=None, ge=0, le=50_000_000)
    pt_deduction_inr: int | None = Field(default=None, ge=0, le=50_000)
    tds_deduction_inr: int = Field(default=0, ge=0, le=50_000_000)
    other_deduction_inr: int = Field(default=0, ge=0, le=50_000_000)
    net_paid_inr: int | None = Field(default=None, ge=0, le=100_000_000)
    payment_mode: PaymentMode = 'NEFT'
    utr_reference: str | None = Field(default=None, max_length=80)
    credited_at: str | None = Field(default=None, max_length=64)
    status: SalaryCreditStatus = 'pending'
    notes: str = Field(default='', max_length=500)

    @field_validator('pay_month', mode='before')
    @classmethod
    def _val_pay_month(cls, v):
        cleaned = str(v or '').strip()
        if not PAY_MONTH_RE.match(cleaned):
            raise ValueError('pay_month must match YYYY-MM (e.g. 2026-11).')
        return cleaned


class SalaryCreditPatchPayload(Schema):
    gross_earnings_inr: int | None = Field(default=None, ge=0, le=100_000_000)
    pf_deduction_inr: int | None = Field(default=None, ge=0, le=50_000_000)
    pt_deduction_inr: int | None = Field(default=None, ge=0, le=50_000)
    tds_deduction_inr: int | None = Field(default=None, ge=0, le=50_000_000)
    other_deduction_inr: int | None = Field(default=None, ge=0, le=50_000_000)
    net_paid_inr: int | None = Field(default=None, ge=0, le=100_000_000)
    payment_mode: PaymentMode | None = None
    utr_reference: str | None = Field(default=None, max_length=80)
    credited_at: str | None = Field(default=None, max_length=64)
    status: SalaryCreditStatus | None = None
    notes: str | None = Field(default=None, max_length=500)


# ---------------------------------------------------------------------------
# MONTHLY SALARY CREDITS ROUTES (placed before /{employee_id} parameter routes)
# ---------------------------------------------------------------------------
@router.get('/admin/employees/salary-credits')
@router.get('/api/admin/employees/salary-credits')
def list_salary_credits(
    response: Response,
    pay_month: str = Query(..., min_length=7, max_length=7),
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    response.headers['Cache-Control'] = 'private, no-store'
    month_clean = pay_month.strip()
    if not PAY_MONTH_RE.match(month_clean):
        raise HTTPException(422, 'pay_month must match YYYY-MM (e.g. 2026-11).')

    rows = db.execute(
        select(HRSalaryCredit, HREmployee)
        .join(HREmployee, HREmployee.id == HRSalaryCredit.employee_id)
        .where(HRSalaryCredit.pay_month == month_clean)
        .order_by(HREmployee.employee_code.asc(), HRSalaryCredit.id.asc())
    ).all()

    items = [serialize_salary_credit(credit, emp) for credit, emp in rows]
    total_gross = sum(i['gross_earnings_inr'] for i in items)
    total_net = sum(i['net_paid_inr'] for i in items)
    credited_items = [i for i in items if i['status'] == 'credited']
    pending_items = [i for i in items if i['status'] == 'pending']

    active_count = int(
        db.scalar(
            select(func.count()).select_from(HREmployee).where(HREmployee.status == 'active')
        )
        or 0
    )

    return {
        'pay_month': month_clean,
        'items': items,
        'summary': {
            'active_employees': active_count,
            'total_records': len(items),
            'credited_count': len(credited_items),
            'pending_count': len(pending_items),
            'total_gross_inr': total_gross,
            'total_net_inr': total_net,
            'credited_net_inr': sum(i['net_paid_inr'] for i in credited_items),
            'pending_net_inr': sum(i['net_paid_inr'] for i in pending_items),
        },
    }


@router.post('/admin/employees/salary-credits', status_code=201)
@router.post('/api/admin/employees/salary-credits', status_code=201)
def create_or_prepare_salary_credits(
    payload: SalaryCreditCreateOrBatchPayload,
    response: Response,
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    response.headers['Cache-Control'] = 'private, no-store'
    stamp = now()

    # Mode 1: Batch-generate pending monthly payroll credits for all active employees
    if payload.prepare_active or payload.employee_id is None:
        active_emps = db.scalars(
            select(HREmployee)
            .where(HREmployee.status == 'active')
            .order_by(HREmployee.id.asc())
        ).all()
        existing_by_emp = {
            c.employee_id: c
            for c in db.scalars(
                select(HRSalaryCredit).where(HRSalaryCredit.pay_month == payload.pay_month)
            ).all()
        }

        created_count = 0
        refreshed_pending_count = 0
        for emp in active_emps:
            figs = calculate_monthly_payroll_figures(
                emp.annual_ctc_inr,
                pf_applicable=emp.pf_applicable,
                pt_applicable=emp.pt_applicable,
                pf_capped=emp.pf_capped,
            )
            existing = existing_by_emp.get(emp.id)
            if existing is None:
                row = HRSalaryCredit(
                    employee_id=emp.id,
                    pay_month=payload.pay_month,
                    gross_earnings_inr=figs['gross_earnings_inr'],
                    pf_deduction_inr=figs['pf_deduction_inr'],
                    pt_deduction_inr=figs['pt_deduction_inr'],
                    tds_deduction_inr=0,
                    other_deduction_inr=0,
                    net_paid_inr=figs['net_paid_inr'],
                    payment_mode='NEFT',
                    status='pending',
                    notes='',
                    created_at=stamp,
                )
                db.add(row)
                created_count += 1
            elif existing.status == 'pending':
                existing.gross_earnings_inr = figs['gross_earnings_inr']
                existing.pf_deduction_inr = figs['pf_deduction_inr']
                existing.pt_deduction_inr = figs['pt_deduction_inr']
                existing.net_paid_inr = max(
                    0,
                    figs['gross_earnings_inr']
                    - figs['pf_deduction_inr']
                    - figs['pt_deduction_inr']
                    - int(existing.tds_deduction_inr or 0)
                    - int(existing.other_deduction_inr or 0),
                )
                refreshed_pending_count += 1

        db.add(
            Audit(
                actor_id=user.id,
                action='HR_PAYROLL_MONTH_PREPARED',
                entity='hr_salary_credit',
                entity_id=payload.pay_month,
                details={
                    'pay_month': payload.pay_month,
                    'created_count': created_count,
                    'refreshed_pending_count': refreshed_pending_count,
                },
            )
        )
        db.commit()
        return list_salary_credits(response=response, pay_month=payload.pay_month, user=user, db=db)

    # Mode 2: Single employee upsert for (employee_id, pay_month)
    emp = db.get(HREmployee, payload.employee_id)
    if not emp:
        raise HTTPException(404, 'Employee record not found.')

    figs = calculate_monthly_payroll_figures(
        emp.annual_ctc_inr,
        pf_applicable=emp.pf_applicable,
        pt_applicable=emp.pt_applicable,
        pf_capped=emp.pf_capped,
    )
    gross = (
        payload.gross_earnings_inr
        if payload.gross_earnings_inr is not None
        else figs['gross_earnings_inr']
    )
    pf = (
        payload.pf_deduction_inr
        if payload.pf_deduction_inr is not None
        else figs['pf_deduction_inr']
    )
    pt = (
        payload.pt_deduction_inr
        if payload.pt_deduction_inr is not None
        else figs['pt_deduction_inr']
    )
    tds = int(payload.tds_deduction_inr or 0)
    other = int(payload.other_deduction_inr or 0)
    net = (
        payload.net_paid_inr
        if payload.net_paid_inr is not None
        else max(0, gross - pf - pt - tds - other)
    )

    try:
        parsed_credited = _parse_credited_at(payload.credited_at)
    except ValueError as exc:
        raise HTTPException(422, f'Invalid credited_at date/timestamp: {exc}') from exc

    if payload.status == 'credited' and parsed_credited is None:
        parsed_credited = stamp

    utr_clean = (payload.utr_reference or '').strip() or None
    if payload.status == 'credited' and not utr_clean:
        raise HTTPException(422, 'UTR / bank reference is required when status is credited.')

    existing = db.scalar(
        select(HRSalaryCredit).where(
            HRSalaryCredit.employee_id == emp.id,
            HRSalaryCredit.pay_month == payload.pay_month,
        )
    )
    if existing:
        existing.gross_earnings_inr = gross
        existing.pf_deduction_inr = pf
        existing.pt_deduction_inr = pt
        existing.tds_deduction_inr = tds
        existing.other_deduction_inr = other
        existing.net_paid_inr = net
        existing.payment_mode = payload.payment_mode
        existing.utr_reference = utr_clean
        existing.credited_at = parsed_credited
        existing.status = payload.status
        existing.notes = payload.notes.strip()
        row = existing
    else:
        row = HRSalaryCredit(
            employee_id=emp.id,
            pay_month=payload.pay_month,
            gross_earnings_inr=gross,
            pf_deduction_inr=pf,
            pt_deduction_inr=pt,
            tds_deduction_inr=tds,
            other_deduction_inr=other,
            net_paid_inr=net,
            payment_mode=payload.payment_mode,
            utr_reference=utr_clean,
            credited_at=parsed_credited,
            status=payload.status,
            notes=payload.notes.strip(),
            created_at=stamp,
        )
        db.add(row)
        db.flush()

    db.add(
        Audit(
            actor_id=user.id,
            action='HR_SALARY_CREDIT_UPSERTED',
            entity='hr_salary_credit',
            entity_id=str(row.id),
            details={
                'employee_id': emp.id,
                'employee_code': emp.employee_code,
                'pay_month': row.pay_month,
                'net_paid_inr': row.net_paid_inr,
                'status': row.status,
                'utr_reference': row.utr_reference,
            },
        )
    )
    db.commit()
    db.refresh(row)
    return serialize_salary_credit(row, emp)


@router.patch('/admin/employees/salary-credits/{credit_id}')
@router.patch('/api/admin/employees/salary-credits/{credit_id}')
def update_salary_credit(
    credit_id: int,
    payload: SalaryCreditPatchPayload,
    response: Response,
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    response.headers['Cache-Control'] = 'private, no-store'
    row = db.get(HRSalaryCredit, credit_id)
    if not row:
        raise HTTPException(404, 'Salary credit record not found.')

    emp = db.get(HREmployee, row.employee_id)
    fields_set = payload.model_fields_set

    recalc_needed = False
    for amt_field in (
        'gross_earnings_inr',
        'pf_deduction_inr',
        'pt_deduction_inr',
        'tds_deduction_inr',
        'other_deduction_inr',
    ):
        if amt_field in fields_set and getattr(payload, amt_field) is not None:
            setattr(row, amt_field, int(getattr(payload, amt_field)))
            recalc_needed = True

    if 'net_paid_inr' in fields_set and payload.net_paid_inr is not None:
        row.net_paid_inr = int(payload.net_paid_inr)
    elif recalc_needed:
        row.net_paid_inr = max(
            0,
            int(row.gross_earnings_inr)
            - int(row.pf_deduction_inr)
            - int(row.pt_deduction_inr)
            - int(row.tds_deduction_inr)
            - int(row.other_deduction_inr),
        )

    if 'payment_mode' in fields_set and payload.payment_mode is not None:
        row.payment_mode = payload.payment_mode
    if 'utr_reference' in fields_set:
        row.utr_reference = (payload.utr_reference or '').strip() or None
    if 'notes' in fields_set and payload.notes is not None:
        row.notes = payload.notes.strip()

    if 'credited_at' in fields_set:
        try:
            row.credited_at = _parse_credited_at(payload.credited_at)
        except ValueError as exc:
            raise HTTPException(422, f'Invalid credited_at date/timestamp: {exc}') from exc

    if 'status' in fields_set and payload.status is not None:
        row.status = payload.status
        if row.status == 'credited':
            if not row.utr_reference:
                raise HTTPException(
                    422, 'UTR / bank reference is required when marking salary as credited.'
                )
            if row.credited_at is None:
                row.credited_at = now()
        elif row.status == 'pending' and 'credited_at' not in fields_set:
            row.credited_at = None

    db.add(
        Audit(
            actor_id=user.id,
            action='HR_SALARY_CREDIT_UPDATED',
            entity='hr_salary_credit',
            entity_id=str(row.id),
            details={
                'employee_id': row.employee_id,
                'pay_month': row.pay_month,
                'status': row.status,
                'payment_mode': row.payment_mode,
                'utr_reference': row.utr_reference,
                'net_paid_inr': row.net_paid_inr,
            },
        )
    )
    db.commit()
    db.refresh(row)
    return serialize_salary_credit(row, emp)


# ---------------------------------------------------------------------------
# EMPLOYEE DIRECTORY CRUD ROUTES
# ---------------------------------------------------------------------------
@router.get('/admin/employees')
@router.get('/api/admin/employees')
def list_employees(
    response: Response,
    status: Literal['all', 'active', 'relieved'] = 'all',
    q: str = Query('', max_length=160),
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    response.headers['Cache-Control'] = 'private, no-store'
    stmt = select(HREmployee)
    if status in ('active', 'relieved'):
        stmt = stmt.where(HREmployee.status == status)

    needle = q.strip()
    if needle:
        pattern = f'%{needle}%'
        stmt = stmt.where(
            or_(
                HREmployee.employee_code.ilike(pattern),
                HREmployee.full_name.ilike(pattern),
                HREmployee.email.ilike(pattern),
                HREmployee.designation.ilike(pattern),
                HREmployee.division.ilike(pattern),
            )
        )

    rows = db.scalars(stmt.order_by(HREmployee.id.desc()).limit(500)).all()
    all_counts = db.execute(
        select(HREmployee.status, func.count()).group_by(HREmployee.status)
    ).all()
    counts_map = {st: int(cnt) for st, cnt in all_counts}
    active_ctc_sum = int(
        db.scalar(
            select(func.coalesce(func.sum(HREmployee.annual_ctc_inr), 0)).where(
                HREmployee.status == 'active'
            )
        )
        or 0
    )

    return {
        'items': [serialize_employee(r) for r in rows],
        'summary': {
            'total': sum(counts_map.values()),
            'active': counts_map.get('active', 0),
            'relieved': counts_map.get('relieved', 0),
            'active_annual_ctc_inr': active_ctc_sum,
        },
        'suggested_next_code': _next_employee_code(db),
    }


@router.post('/admin/employees', status_code=201)
@router.post('/api/admin/employees', status_code=201)
def create_employee(
    payload: EmployeeCreatePayload,
    response: Response,
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    response.headers['Cache-Control'] = 'private, no-store'
    _validate_dates(payload.joining_date, payload.exit_date, payload.last_working_day)

    code = payload.employee_code or _next_employee_code(db)
    existing = db.scalar(select(HREmployee).where(HREmployee.employee_code == code))
    if existing:
        raise HTTPException(409, f'Employee code {code} already exists.')

    stamp = now()
    row = HREmployee(
        employee_code=code,
        full_name=payload.full_name.strip(),
        email=str(payload.email).strip().lower(),
        phone=payload.phone.strip(),
        address=payload.address.strip(),
        designation=payload.designation.strip(),
        division=payload.division.strip(),
        employment_type=payload.employment_type,
        work_location=payload.work_location.strip(),
        joining_date=payload.joining_date,
        probation_months=payload.probation_months,
        notice_period_days=payload.notice_period_days,
        exit_date=payload.exit_date,
        last_working_day=payload.last_working_day,
        annual_ctc_inr=payload.annual_ctc_inr,
        pf_applicable=payload.pf_applicable,
        pt_applicable=payload.pt_applicable,
        pf_capped=payload.pf_capped,
        status=payload.status,
        bank_account_holder=payload.bank_account_holder,
        bank_name=payload.bank_name,
        bank_account_number=payload.bank_account_number,
        bank_ifsc=payload.bank_ifsc,
        bank_account_type=payload.bank_account_type,
        pan_number=payload.pan_number,
        uan_number=payload.uan_number,
        created_at=stamp,
        updated_at=stamp,
    )
    db.add(row)
    db.flush()
    db.add(
        Audit(
            actor_id=user.id,
            action='HR_EMPLOYEE_CREATED',
            entity='hr_employee',
            entity_id=str(row.id),
            details={
                'employee_code': row.employee_code,
                'full_name': row.full_name,
                'designation': row.designation,
                'division': row.division,
                'annual_ctc_inr': row.annual_ctc_inr,
                'status': row.status,
                'masked_bank_account': mask_account_number(row.bank_account_number),
                'bank_ifsc': row.bank_ifsc,
            },
        )
    )
    db.commit()
    db.refresh(row)
    return serialize_employee(row)


@router.patch('/admin/employees/{employee_id}')
@router.patch('/api/admin/employees/{employee_id}')
def update_employee(
    employee_id: int,
    payload: EmployeePatchPayload,
    response: Response,
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    response.headers['Cache-Control'] = 'private, no-store'
    row = db.get(HREmployee, employee_id)
    if not row:
        raise HTTPException(404, 'Employee record not found.')

    fields_set = payload.model_fields_set
    if 'employee_code' in fields_set and payload.employee_code is not None:
        if payload.employee_code != row.employee_code:
            conflict = db.scalar(
                select(HREmployee.id).where(HREmployee.employee_code == payload.employee_code)
            )
            if conflict:
                raise HTTPException(409, f'Employee code {payload.employee_code} already exists.')
            row.employee_code = payload.employee_code

    for str_field in ('full_name', 'phone', 'address', 'designation', 'division', 'work_location'):
        if str_field in fields_set and getattr(payload, str_field) is not None:
            setattr(row, str_field, str(getattr(payload, str_field)).strip())

    if 'email' in fields_set and payload.email is not None:
        row.email = str(payload.email).strip().lower()

    for direct_field in (
        'employment_type',
        'joining_date',
        'probation_months',
        'notice_period_days',
        'annual_ctc_inr',
        'pf_applicable',
        'pt_applicable',
        'pf_capped',
        'status',
    ):
        if direct_field in fields_set and getattr(payload, direct_field) is not None:
            setattr(row, direct_field, getattr(payload, direct_field))

    for nullable_field in (
        'exit_date',
        'last_working_day',
        'bank_account_holder',
        'bank_name',
        'bank_account_number',
        'bank_ifsc',
        'bank_account_type',
        'pan_number',
        'uan_number',
    ):
        if nullable_field in fields_set:
            setattr(row, nullable_field, getattr(payload, nullable_field))

    _validate_dates(row.joining_date, row.exit_date, row.last_working_day)
    row.updated_at = now()

    db.add(
        Audit(
            actor_id=user.id,
            action='HR_EMPLOYEE_UPDATED',
            entity='hr_employee',
            entity_id=str(row.id),
            details={
                'employee_code': row.employee_code,
                'updated_fields': sorted(fields_set),
                'status': row.status,
                'annual_ctc_inr': row.annual_ctc_inr,
                'masked_bank_account': mask_account_number(row.bank_account_number),
                'bank_ifsc': row.bank_ifsc,
            },
        )
    )
    db.commit()
    db.refresh(row)
    return serialize_employee(row)


@router.delete('/admin/employees/{employee_id}')
@router.delete('/api/admin/employees/{employee_id}')
def delete_employee(
    employee_id: int,
    response: Response,
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    response.headers['Cache-Control'] = 'private, no-store'
    row = db.get(HREmployee, employee_id)
    if not row:
        raise HTTPException(404, 'Employee record not found.')

    code = row.employee_code
    name = row.full_name
    db.execute(delete(HRSalaryCredit).where(HRSalaryCredit.employee_id == employee_id))
    db.delete(row)
    db.add(
        Audit(
            actor_id=user.id,
            action='HR_EMPLOYEE_DELETED',
            entity='hr_employee',
            entity_id=str(employee_id),
            details={'employee_code': code, 'full_name': name},
        )
    )
    db.commit()
    return {'deleted': True, 'id': employee_id, 'employee_code': code}
