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


def test_admin_employees_rbac_enforced(client, db):
    assert client.get('/api/admin/employees').status_code == 401
    assert client.post('/api/admin/employees', json={}).status_code == 401
    assert client.patch('/api/admin/employees/1', json={'status': 'relieved'}).status_code == 401
    assert client.delete('/api/admin/employees/1').status_code == 401

    _, customer_headers = _auth_headers(db, 'CUSTOMER')
    assert client.get('/api/admin/employees', headers=customer_headers).status_code == 403
    assert (
        client.post(
            '/api/admin/employees',
            headers=customer_headers,
            json={
                'full_name': 'Blocked User',
                'email': 'blocked@vistrah.in',
                'designation': 'Engineer',
                'division': 'Engineering',
                'joining_date': '2026-11-01',
                'annual_ctc_inr': 600000,
            },
        ).status_code
        == 403
    )


def test_admin_employees_crud_auto_code_relieving_and_audit_trail(client, db):
    admin, admin_headers = _auth_headers(db, 'ADMIN')

    # 1. Initial empty listing suggests VST-EMP-001
    initial = client.get('/api/admin/employees', headers=admin_headers)
    assert initial.status_code == 200, initial.text
    assert initial.json()['items'] == []
    assert initial.json()['suggested_next_code'] == 'VST-EMP-001'

    # 2. Create employee with auto-generated code
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
        },
    )
    assert created.status_code == 201, created.text
    emp = created.json()
    assert emp['employee_code'] == 'VST-EMP-001'
    assert emp['full_name'] == 'Aarav Rao'
    assert emp['annual_ctc_inr'] == 1200000
    assert emp['status'] == 'active'
    emp_id = emp['id']

    # 3. Duplicate employee_code returns 409
    dup = client.post(
        '/api/admin/employees',
        headers=admin_headers,
        json={
            'employee_code': 'VST-EMP-001',
            'full_name': 'Duplicate Person',
            'email': 'dup@vistrah.in',
            'designation': 'Analyst',
            'division': 'Operations',
            'joining_date': '2026-07-01',
            'annual_ctc_inr': 600000,
        },
    )
    assert dup.status_code == 409

    # 4. Invalid exit_date < joining_date returns 422
    bad_date = client.patch(
        f'/api/admin/employees/{emp_id}',
        headers=admin_headers,
        json={'last_working_day': '2026-05-01'},
    )
    assert bad_date.status_code == 422

    # 5. Patch employee to relieved with exit_date & last_working_day (via /admin/employees proxy path too)
    relieved = client.patch(
        f'/admin/employees/{emp_id}',
        headers=admin_headers,
        json={
            'status': 'relieved',
            'exit_date': '2026-11-15',
            'last_working_day': '2026-11-15',
            'designation': 'Lead Full-Stack Engineer',
        },
    )
    assert relieved.status_code == 200, relieved.text
    assert relieved.json()['status'] == 'relieved'
    assert relieved.json()['last_working_day'] == '2026-11-15'
    assert relieved.json()['designation'] == 'Lead Full-Stack Engineer'

    # 6. Filter by status=relieved and search q=Aarav
    filtered = client.get(
        '/api/admin/employees?status=relieved&q=Aarav', headers=admin_headers
    )
    assert filtered.status_code == 200
    assert len(filtered.json()['items']) == 1
    assert filtered.json()['summary']['relieved'] == 1
    assert filtered.json()['summary']['active'] == 0

    # 7. Delete employee
    deleted = client.delete(f'/api/admin/employees/{emp_id}', headers=admin_headers)
    assert deleted.status_code == 200
    assert deleted.json()['deleted'] is True
    assert client.delete(f'/api/admin/employees/{emp_id}', headers=admin_headers).status_code == 404

    # 8. Verify Audit trail recorded CREATE, UPDATE, DELETE
    audits = db.scalars(
        select(Audit).where(Audit.actor_id == admin.id, Audit.entity == 'hr_employee')
    ).all()
    actions = {a.action for a in audits}
    assert {'HR_EMPLOYEE_CREATED', 'HR_EMPLOYEE_UPDATED', 'HR_EMPLOYEE_DELETED'} <= actions
