"""Explicit bootstrap for the separate local homepage QA project only."""
import os
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError

PROJECT = 'vistrah-homepage-test'
ADMIN_EMAIL = 'homepage-admin@example.com'
CUSTOMER_EMAIL = 'homepage-customer@example.com'
PASSWORD = 'Homepage-test-only-2026!'
MARKER = 'homepage-test-fixture-v1'


def validate_target(environ):
    if environ.get('VISTRAH_TEST_PROJECT') != PROJECT or environ.get('APP_ENV') != 'development':
        raise RuntimeError('Homepage fixture requires the dedicated development test project')
    try:
        url = make_url(environ.get('DATABASE_URL', ''))
    except (ArgumentError, ValueError, TypeError):
        raise RuntimeError('Use the dedicated homepage test database URL') from None
    if (url.drivername != 'postgresql+psycopg' or url.host != 'db' or
        url.database != 'vistrah_homepage_test' or url.username != 'vistrah_homepage_test' or
        url.query or url.port not in (None, 5432)):
        raise RuntimeError('Refusing fixture setup outside the dedicated homepage test database')


def main():
    validate_target(os.environ)  # Before importing app config or opening a database.
    from sqlalchemy import inspect, text, select
    from alembic import command
    from alembic.config import Config
    from .database import engine, SessionLocal
    from .models import BootstrapState, User
    from .security import passwords
    from .seed import seed
    tables = inspect(engine).get_table_names()
    if tables:
        with engine.connect() as connection:
            if 'bootstrap_state' not in tables or not connection.execute(text(
                'SELECT key FROM bootstrap_state WHERE key=:key'), {'key': MARKER}).first():
                raise RuntimeError('Refusing to modify an existing database without the homepage test marker')
    command.upgrade(Config('alembic.ini'), 'head')
    with SessionLocal() as db:
        seed(db)
        if not db.get(BootstrapState, MARKER):
            db.add(BootstrapState(key=MARKER))
        for email, name, role in [(ADMIN_EMAIL, 'Homepage test administrator', 'ADMIN'),
                                 (CUSTOMER_EMAIL, 'Homepage test customer', 'CUSTOMER')]:
            if not db.scalar(select(User).where(User.email == email)):
                db.add(User(email=email, name=name, role=role, password_hash=passwords.hash(PASSWORD)))
        db.commit()
    print('Dedicated homepage QA fixture ready. Existing test edits retained; no external acquisitions or worker started.')


if __name__ == '__main__':
    main()
