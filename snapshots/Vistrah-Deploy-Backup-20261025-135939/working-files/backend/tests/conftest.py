import os
from pathlib import Path
import tempfile

os.environ['JWT_SECRET'] = 'test-secret-for-vistrah-do-not-use-in-production'
os.environ['APP_ENV'] = 'development'  # Isolated tests exercise explicitly local sandbox access.
os.environ['DATABASE_URL'] = os.getenv('TEST_DATABASE_URL', 'sqlite:///' + str(Path(tempfile.gettempdir()) / 'vistrah-pytest.db').replace('\\', '/'))

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient
from app.database import engine, get_db
from app.main import app
from app.seed import seed
from app.models import User
from app.security import passwords, issue_token

@pytest.fixture(scope='session', autouse=True)
def migrations():
    config = Config('alembic.ini')
    command.upgrade(config, 'head')
    yield
    engine.dispose()

@pytest.fixture
def db():
    connection = engine.connect()
    transaction = connection.begin()
    if engine.dialect.name == 'sqlite':
        connection.execute(text('BEGIN'))
    session = Session(bind=connection, join_transaction_mode='create_savepoint', expire_on_commit=False)
    yield session
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()

@pytest.fixture
def seeded(db):
    seed(db)
    return db

@pytest.fixture
def customer(client):
    response = client.post('/auth/register', json={'name':'Test Customer','email':'customer@example.com','password':'a-secure-password-123'})
    assert response.status_code == 201, response.text
    return {'Authorization':'Bearer '+response.json()['access_token']}

@pytest.fixture
def member_customer(client, customer, seeded):
    activate_test_membership(client, customer)
    return customer

def activate_test_membership(client, headers):
    """Service enquiry prerequisite; only used with disposable synthetic fixtures."""
    if client.get('/me/membership', headers=headers).json()['active']:
        return
    payment = client.post('/payments/checkout', headers=headers, json={'idempotency_key':'isolated-member-fixture'}).json()
    assert client.post(f'/payments/{payment["id"]}/simulate', headers=headers, json={'outcome':'SUCCEEDED'}).status_code == 200

@pytest.fixture
def admin(db):
    user = User(name='Test Administrator', email='admin@example.com', role='ADMIN', password_hash=passwords.hash('admin-test-password-123'))
    db.add(user)
    db.commit()
    return {'Authorization':'Bearer '+issue_token(db,user)}
