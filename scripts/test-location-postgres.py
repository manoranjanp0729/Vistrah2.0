"""WP05 checks on a freshly named PostgreSQL container with RAM-only test data.

Uses a cached image, loopback port and synthetic fixtures. Never reads project
database settings, attaches normal volumes, or operates on an existing container.
"""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]
DOCKER = shutil.which('docker')
NAME = 'vistrah-wp05-test-' + uuid.uuid4().hex[:12]
LABEL = 'vistrah.wp05.disposable'


def docker(*args):
    return subprocess.check_output([DOCKER, *args], text=True).strip()


def migration_round_trip():
    from alembic import command
    from alembic.config import Config
    from sqlalchemy import inspect, text
    from app.database import engine

    config = Config(str(ROOT / 'backend/alembic.ini'))
    command.downgrade(config, '010')
    with engine.begin() as connection:
        statements = [
            "INSERT INTO users(id,email,name,password_hash,phone,role,seller_enabled,created_at) VALUES(1,'fixture@example.com','Fixture','no-login','','CUSTOMER',true,CURRENT_TIMESTAMP)",
            "INSERT INTO categories(id,slug,title,description,image,active) VALUES(1,'fixture','Fixture','Fixture','',true)",
            "INSERT INTO services(id,category_id,slug,title,description,includes,image,popular,active) VALUES(1,1,'fixture-service','Fixture','Fixture','[]','',false,true)",
            "INSERT INTO providers(id,owner_user_id,slug,name,company,email,phone,address,location,source_url,provenance,verification_status,verification_evidence,active,created_at,updated_at) VALUES(1,1,'owned-fixture','Fixture','Owned fixture','fixture@example.com','','Existing address','Existing locality','','Fixture','VERIFIED','Original evidence',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)",
            "INSERT INTO provider_services(provider_id,service_id,approval_status,description) VALUES(1,1,'APPROVED','Original reviewed description')",
            "INSERT INTO provider_ownership_claims(id,provider_id,user_id,statement,status,review_note,created_at,needs_more_info) VALUES('existing',1,1,'Original history','APPROVED','Independent review',CURRENT_TIMESTAMP,false)",
            "INSERT INTO provider_ownership_claim_events(claim_id,actor_id,action,reason,created_at) VALUES('existing',1,'APPROVED','Original review history',CURRENT_TIMESTAMP)",
            "INSERT INTO service_requests(id,user_id,service_id,requirements,location,phone,status,created_at,updated_at) VALUES(1,1,1,'Original request','Original locality','','ASSIGNED',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)",
            "INSERT INTO provider_leads(request_id,provider_id,service_id,actor_id,created_at) VALUES(1,1,1,1,CURRENT_TIMESTAMP)",
        ]
        for statement in statements:
            connection.execute(text(statement))
    tables = ['users', 'providers', 'provider_services', 'provider_ownership_claims',
              'provider_ownership_claim_events', 'service_requests', 'provider_leads']
    columns = {table: [column['name'] for column in inspect(engine).get_columns(table)] for table in tables}

    def snapshot():
        with engine.connect() as connection:
            return [connection.execute(text('SELECT ' + ','.join(columns[table]) + ' FROM ' + table)).all() for table in tables]

    before = snapshot()
    command.upgrade(config, '011')
    assert snapshot() == before
    with engine.begin() as connection:
        assert connection.execute(text('SELECT latitude,longitude FROM providers')).one() == (None, None)
        assert connection.execute(text('SELECT coverage_radius_km FROM provider_services')).scalar() is None
        assert connection.execute(text('SELECT saved_location FROM users')).scalar() is None
        connection.execute(text('UPDATE providers SET latitude=12.0,longitude=77.0 WHERE id=1'))
        connection.execute(text('UPDATE provider_services SET coverage_radius_km=25.0'))
        connection.execute(text('UPDATE users SET saved_location=CAST(:value AS json)'),
                           {'value': json.dumps({'latitude': 12.0, 'longitude': 77.0, 'locality': 'Synthetic'})})
    command.downgrade(config, '010')
    assert snapshot() == before
    command.upgrade(config, '011')
    assert snapshot() == before
    with engine.connect() as connection:
        assert connection.execute(text("SELECT extname FROM pg_extension WHERE extname='postgis'")).first() is None
        triggers = set(connection.execute(text("SELECT trigger_name FROM information_schema.triggers WHERE event_object_table='provider_ownership_claim_events'")).scalars())
        assert triggers, 'Original immutable history guard was not retained'
    engine.dispose()
    print('PostgreSQL migration 010 -> 011 -> 010 -> 011 retained populated ownership/listing/request/lead/history records; no PostGIS.')


def main():
    if not DOCKER:
        raise RuntimeError('Docker is unavailable; no database was touched')
    container_id = None
    try:
        container_id = docker('run', '--detach', '--pull', 'never', '--name', NAME,
            '--label', LABEL + '=true', '--tmpfs', '/var/lib/postgresql/data',
            '--publish', '127.0.0.1::5432', '--env', 'POSTGRES_DB=wp05_disposable',
            '--env', 'POSTGRES_USER=wp05_test', '--env', 'POSTGRES_PASSWORD=wp05-synthetic-only',
            'postgres:16-alpine')
        metadata = json.loads(docker('inspect', NAME))[0]
        assert metadata['Id'] == container_id and metadata['Config']['Labels'][LABEL] == 'true'
        assert not any(mount['Type'] in ('volume', 'bind') for mount in metadata['Mounts'])
        ports = metadata['NetworkSettings']['Ports']['5432/tcp']
        assert len(ports) == 1 and ports[0]['HostIp'] == '127.0.0.1'
        port = int(ports[0]['HostPort'])
        for _ in range(60):
            ready = subprocess.run([DOCKER, 'exec', NAME, 'pg_isready', '-U', 'wp05_test', '-d', 'wp05_disposable'], capture_output=True)
            if ready.returncode == 0:
                break
            time.sleep(0.5)
        else:
            raise RuntimeError('Disposable PostgreSQL did not become ready')
        url = f'postgresql+psycopg://wp05_test:wp05-synthetic-only@127.0.0.1:{port}/wp05_disposable'
        env = {**os.environ, 'TEST_DATABASE_URL': url, 'DATABASE_URL': url,
               'JWT_SECRET': 'wp05-isolated-postgres-test-not-for-production', 'APP_ENV': 'development'}
        import sqlalchemy as sa
        with sa.create_engine(url, hide_parameters=True).connect() as connection:
            assert connection.execute(sa.text('SELECT current_database()')).scalar() == 'wp05_disposable'
            assert connection.execute(sa.text("SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")).scalar() == 0
        result = subprocess.run([sys.executable, '-m', 'pytest', '-q',
            'tests/test_location_services.py', 'tests/test_publication_drafts.py'],
            cwd=ROOT / 'backend', env=env)
        if result.returncode:
            raise RuntimeError('Focused PostgreSQL tests failed')
        os.environ.update({key: env[key] for key in ('DATABASE_URL', 'JWT_SECRET', 'APP_ENV')})
        sys.path.insert(0, str(ROOT / 'backend'))
        os.chdir(ROOT / 'backend')
        migration_round_trip()
    finally:
        if container_id:
            # Only the exact fresh container created above can be stopped/removed.
            actual = json.loads(docker('inspect', NAME))[0]
            assert actual['Id'] == container_id and actual['Config']['Labels'][LABEL] == 'true'
            docker('stop', '--time', '2', NAME)
            docker('rm', NAME)
            print('Disposable RAM-backed test container removed; normal containers and volumes unchanged.')


if __name__ == '__main__':
    main()
