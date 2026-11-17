import uuid
from sqlalchemy import select

from app.models import Audit, User
from app.security import issue_token, passwords


def _auth_headers(db, role: str) -> tuple[User, dict[str, str]]:
    user = User(
        name=f'{role.title()} HR Tester',
        email=f'hr-{role.lower()}-{uuid.uuid4().hex[:6]}@vistrah.in',
        password_hash=passwords.hash('secure-password-123'),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    issued = issue_token(db, user)
    token = issued[0] if isinstance(issued, tuple) else issued
    return user, {'Authorization': f'Bearer {token}'}


def test_admin_employees_and_salary_credits_rbac_enforced(client, db):
    assert client.get('/api/admin/employees').status_code == 401
    assert client.post('/api/admin/employees', json={}).status_code == 401
    assert client.patch('/api/admin/employees/1', json={'status': 'relieved'}).status_code == 401
    assert client.delete('/api/admin/employees/1').status_code == 401
    assert client.get('/api/admin/employees/salary-credits?pay_month=2026-11').status_code == 401
    assert client.post('/api/admin/employees/salary-credits', json={'pay_month': '2026-11'}).status_code == 401
    assert client.patch('/api/admin/employees/salary-credits/1', json={'status': 'credited'}).status_code == 401

    _, customer_headers = _auth_headers(db, 'CUSTOMER')
    assert client.get('/api/admin/employees', headers=customer_headers).status_code == 403
    assert client.get('/api/admin/employees/salary-credits?pay_month=2026-11', headers=customer_headers).status_code == 403


def test_admin_employees_bank_kyc_salary_credits_batch_and_utr_flow(client, db):
    admin, admin_headers = _auth_headers(db, 'ADMIN')

    # 1. Reject invalid IFSC format
    bad_ifsc = client.post(
        '/api/admin/employees',
        headers=admin_headers,
        json={
            'full_name': 'Invalid IFSC Test',
            'email': 'invalid.ifsc@vistrah.in',
            'designation': 'Engineer',
            'division': 'Engineering',
            'joining_date': '2026-06-01',
            'annual_ctc_inr': 1200000,
            'bank_ifsc': 'BADIFSC',
        },
    )
    assert bad_ifsc.status_code == 422

    # 2. Create employee with bank & statutory KYC details (lowercase ifsc/pan auto-uppercased)
    created = client.post(
        '/api/admin/employees',
        headers=admin_headers,
        json={
            'full_name': 'Aarav Rao',
            'email': 'aarav.rao@vistrah.in',
            'phone': '+91 98765 43210',
            'address': 'Indiranagar, Bengaluru, Karnataka 560038',
            'designation': 'Senior Full-Stack Engineer',
            'division': 'Platform Engineering',
            'employment_type': 'permanent',
            'work_location': 'Bengaluru, Karnataka',
            'joining_date': '2026-06-01',
            'probation_months': 3,
            'notice_period_days': 30,
            'annual_ctc_inr': 1200000,
            'pf_applicable': True,
            'pt_applicable': True,
            'pf_capped': True,
            'status': 'active',
            'bank_account_holder': 'Aarav Rao',
            'bank_name': 'HDFC Bank',
            'bank_account_number': '50100234987654',
            'bank_ifsc': 'hdfc0001234',
            'bank_account_type': 'salary',
            'pan_number': 'abcde1234f',
            'uan_number': '100987654321',
        },
    )
    assert created.status_code == 201, created.text
    emp = created.json()
    assert emp['employee_code'] == 'VST-EMP-001'
    assert emp['bank_ifsc'] == 'HDFC0001234'
    assert emp['pan_number'] == 'AB•••••34F'
    assert emp['bank_account_number'] == '••••7654'
    assert emp['masked_bank_account'] == '••••7654'
    emp_id = emp['id']

    # Explicit include_sensitive_payout=true returns unmasked payout KYC for authorized export/edit
    unmasked = client.get(
        f'/api/admin/employees/{emp_id}?include_sensitive_payout=true',
        headers=admin_headers,
    )
    assert unmasked.status_code == 200
    assert unmasked.json()['bank_account_number'] == '50100234987654'
    assert unmasked.json()['pan_number'] == 'ABCDE1234F'

    # 3. Prepare Month Payroll for 2026-11 (batch-generates pending credits for active employees)
    prepared = client.post(
        '/api/admin/employees/salary-credits',
        headers=admin_headers,
        json={'pay_month': '2026-11', 'prepare_active': True},
    )
    assert prepared.status_code == 201, prepared.text
    prep_json = prepared.json()
    assert prep_json['pay_month'] == '2026-11'
    assert prep_json['summary']['total_records'] == 1
    assert prep_json['summary']['pending_count'] == 1
    credit = prep_json['items'][0]
    assert credit['employee_id'] == emp_id
    # For ₹12,00,000/yr (₹1,00,000/mo CTC) with capped ₹1,800 Employer PF:
    # Gross = ₹98,200, Employee PF = ₹1,800, Karnataka PT = ₹200 -> Net = ₹96,200
    assert credit['gross_earnings_inr'] == 98200
    assert credit['pf_deduction_inr'] == 1800
    assert credit['pt_deduction_inr'] == 200
    assert credit['net_paid_inr'] == 96200
    assert credit['status'] == 'pending'
    credit_id = credit['id']

    # 4. Marking credited without UTR fails with 422
    missing_utr = client.patch(
        f'/api/admin/employees/salary-credits/{credit_id}',
        headers=admin_headers,
        json={'status': 'credited'},
    )
    assert missing_utr.status_code == 422

    # 5. Mark credited with UTR reference, TDS deduction, IMPS mode & credit date
    marked = client.patch(
        f'/api/admin/employees/salary-credits/{credit_id}',
        headers=admin_headers,
        json={
            'status': 'credited',
            'payment_mode': 'IMPS',
            'utr_reference': 'HDFC263209988771',
            'credited_at': '2026-11-30',
            'tds_deduction_inr': 5000,
            'notes': 'November 2026 salary disbursed',
        },
    )
    assert marked.status_code == 200, marked.text
    m_json = marked.json()
    assert m_json['status'] == 'credited'
    assert m_json['payment_mode'] == 'IMPS'
    assert m_json['utr_reference'] == 'HDFC263209988771'
    assert m_json['net_paid_inr'] == 91200  # 98200 - 1800 - 200 - 5000
    assert m_json['employee']['masked_bank_account'] == '••••7654'

    # 6. Re-running Prepare Month Payroll must NOT overwrite an already-credited record
    re_prep = client.post(
        '/api/admin/employees/salary-credits',
        headers=admin_headers,
        json={'pay_month': '2026-11', 'prepare_active': True},
    )
    assert re_prep.status_code == 201
    assert re_prep.json()['summary']['credited_count'] == 1
    assert re_prep.json()['items'][0]['utr_reference'] == 'HDFC263209988771'
    assert re_prep.json()['items'][0]['net_paid_inr'] == 91200

    # 7. Patch employee to relieved and then delete (verifying cascade removal of salary credits)
    relieved = client.patch(
        f'/admin/employees/{emp_id}',
        headers=admin_headers,
        json={
            'status': 'relieved',
            'exit_date': '2026-11-30',
            'last_working_day': '2026-11-30',
        },
    )
    assert relieved.status_code == 200
    assert relieved.json()['status'] == 'relieved'

    deleted = client.delete(f'/api/admin/employees/{emp_id}', headers=admin_headers)
    assert deleted.status_code == 200

    after_del = client.get(
        '/api/admin/employees/salary-credits?pay_month=2026-11', headers=admin_headers
    )
    assert after_del.status_code == 200
    assert after_del.json()['items'] == []

    # 8. Verify Audit trail recorded employee & payroll actions
    audits = db.scalars(select(Audit).where(Audit.actor_id == admin.id)).all()
    actions = {a.action for a in audits}
    assert {
        'HR_EMPLOYEE_CREATED',
        'HR_PAYROLL_MONTH_PREPARED',
        'HR_SALARY_CREDIT_UPDATED',
        'HR_EMPLOYEE_UPDATED',
        'HR_EMPLOYEE_DELETED',
    } <= actions
