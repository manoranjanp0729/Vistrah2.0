"""Admin entry points keep backend authorization independent of UI navigation."""

import pytest
from sqlalchemy import select

from app.models import Service, User


ADMIN_PATHS = [
    '/admin/overview',
    '/admin/provider-requirements/{service_id}',
    '/admin/provider-applications',
    '/admin/workflows',
    '/admin/job-sources',
]


def admin_paths(db):
    service_id = db.scalar(select(Service.id).order_by(Service.id))
    return [path.format(service_id=service_id) for path in ADMIN_PATHS]


@pytest.mark.parametrize('path', ADMIN_PATHS)
def test_admin_sections_require_an_authenticated_admin(client, db, seeded, customer, admin, path):
    service_id = db.scalar(select(Service.id).order_by(Service.id))
    path = path.format(service_id=service_id)

    assert client.get(path).status_code == 401
    assert client.get(path, headers=customer).status_code == 403
    assert client.get(path, headers=admin).status_code == 200


def test_admin_role_is_rechecked_for_an_existing_session(client, db, seeded, admin):
    identity = client.get('/me', headers=admin).json()
    assert identity['role'] == 'ADMIN'
    assert client.get('/admin/overview', headers=admin).status_code == 200

    # This test fixture lives in a rolled-back test transaction. A token must not
    # retain administrator access after the stored role is withdrawn.
    user = db.get(User, identity['id'])
    user.role = 'CUSTOMER'
    db.commit()
    db.expire_all()

    response = client.get('/me', headers=admin)
    assert response.status_code == 200
    assert response.json()['role'] == 'CUSTOMER'
    for path in admin_paths(db):
        assert client.get(path, headers=admin).status_code == 403


def test_revoked_admin_session_cannot_access_admin_sections(client, db, seeded, admin):
    assert client.get('/admin/overview', headers=admin).status_code == 200
    assert client.post('/auth/logout', headers=admin).status_code == 200

    assert client.get('/me', headers=admin).status_code == 401
    for path in admin_paths(db):
        assert client.get(path, headers=admin).status_code == 401
