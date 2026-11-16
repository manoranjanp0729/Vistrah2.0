"""Admin-only CRUD APIs for internal Employees & HR Letter Generator (/api/admin/employees)."""
from __future__ import annotations

from datetime import date
import re
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import EmailStr, Field, field_validator
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from .database import get_db
from .hr_models import HREmployee
from .models import Audit, User, now
from .schemas import Schema
from .security import admin_user

router = APIRouter(tags=['Admin HR Employees'])

EmploymentType = Literal['permanent', 'probation', 'fixed_term', 'intern']
EmployeeStatus = Literal['active', 'relieved']
CODE_RE = re.compile(r'^[A-Z0-9][A-Z0-9_-]{2,39}$')


def _iso(val) -> str | None:
    return val.isoformat() if hasattr(val, 'isoformat') and val is not None else val


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
        'created_at': _iso(row.created_at),
        'updated_at': _iso(row.updated_at),
    }


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


class EmployeeCreatePayload(Schema):
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
            raise ValueError('Employee code must be 3-40 uppercase letters, digits, hyphens, or underscores.')
        return cleaned


class EmployeePatchPayload(Schema):
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
            raise ValueError('Employee code must be 3-40 uppercase letters, digits, hyphens, or underscores.')
        return cleaned


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

    if 'exit_date' in fields_set:
        row.exit_date = payload.exit_date
    if 'last_working_day' in fields_set:
        row.last_working_day = payload.last_working_day

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
