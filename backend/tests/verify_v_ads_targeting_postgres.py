"""Explicit disposable-container verification. Never imports app startup/conftest.

Run from backend with existing Python. Creates and removes only UUID-labelled
resources, uses installed postgres:16.6-alpine without pulling, and publishes a
random loopback-only port. No supplied DATABASE_URL or credentials are consumed.
"""
import json
import ipaddress
import os
from pathlib import Path
import secrets
import subprocess
import sys
import time
from uuid import uuid4

import sqlalchemy as sa
from sqlalchemy.engine import URL
from alembic.migration import MigrationContext
from alembic.operations import Operations
from alembic.script import ScriptDirectory

# Direct script execution otherwise searches tests/, not backend/migrations.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def exact_host_address(actual, expected):
    """Fail closed: exact IP equality only, with optional /32 or /128 host mask."""
    if not isinstance(actual, str) or not isinstance(expected, str) or not actual or not expected:
        return False
    if '%' in actual or '%' in expected or '/' in expected:
        return False
    try:
        host = ipaddress.ip_address(expected)
        observed = ipaddress.ip_interface(actual)
    except ValueError:
        return False
    return observed.network.prefixlen == observed.max_prefixlen and observed.ip == host


def main():
    token = uuid4().hex
    name = 'vads-verify-' + token
    network = name + '-net'
    database = 'vads_disposable_' + token
    user = 'vads_verify'
    password = secrets.token_urlsafe(32)
    environment = {**os.environ, 'POSTGRES_PASSWORD': password, 'PGPASSWORD': password}
    label = 'vistrah.targeting-verification=' + token
    engine = None
    container_created = network_created = False
    passed = 0

    def docker(*args):
        result = subprocess.run(['docker', *args], env=environment, capture_output=True, text=True)
        if result.returncode:
            # Docker/process errors must never echo secret-bearing arguments/config.
            raise RuntimeError('Disposable Docker operation failed: ' + args[0])
        return result.stdout.strip()

    def check(condition, description):
        nonlocal passed
        if not condition:
            raise AssertionError(description)
        passed += 1
        print('PASS:', description, flush=True)

    try:
        docker('image', 'inspect', 'postgres:16.6-alpine')
        docker('network', 'create', '--label', label, network)
        network_created = True
        docker('run', '-d', '--pull=never', '--name', name, '--label', label,
               '--network', network, '--tmpfs', '/var/lib/postgresql/data:rw',
               '-p', '127.0.0.1::5432', '-e', 'POSTGRES_PASSWORD',
               '-e', 'POSTGRES_INITDB_ARGS=--encoding=UTF8',
               '-e', 'POSTGRES_USER=' + user, '-e', 'POSTGRES_DB=' + database,
               'postgres:16.6-alpine')
        container_created = True
        info = json.loads(docker('inspect', name))[0]
        bindings = info['NetworkSettings']['Ports']['5432/tcp']
        print('ISOLATION:', {'label_matches': info['Config']['Labels'].get('vistrah.targeting-verification') == token,
                            'network_matches': list(info['NetworkSettings']['Networks']) == [network],
                            'bindings': bindings, 'mount_types': [m['Type'] for m in info['Mounts']]}, flush=True)
        check(info['Config']['Labels'].get('vistrah.targeting-verification') == token
              and list(info['NetworkSettings']['Networks']) == [network]
              and len(bindings) == 1 and bindings[0]['HostIp'] == '127.0.0.1'
              and '/var/lib/postgresql/data' in info['HostConfig']['Tmpfs']
              and all(m['Type'] == 'tmpfs' for m in info['Mounts']),
              'UUID-labelled isolation, loopback-only port, no host/named/anonymous volumes')
        url = URL.create('postgresql+psycopg', username=user, password=password,
                         host='127.0.0.1', port=int(bindings[0]['HostPort']), database=database)
        engine = sa.create_engine(url, hide_parameters=True, connect_args={'connect_timeout': 2})
        for attempt in range(30):
            try:
                with engine.connect() as connection:
                    identity = connection.exec_driver_sql(
                        'SELECT current_database(), current_user, version(), inet_server_addr()::text, '
                        'inet_server_port(), (SELECT system_identifier::text FROM pg_control_system()), '
                        "current_setting('server_encoding')").one()
                break
            except sa.exc.OperationalError:
                if attempt == 29:
                    raise RuntimeError('Disposable PostgreSQL readiness failed') from None
                time.sleep(1)
        # Re-inspect after readiness; never trust a startup-time network snapshot.
        fresh = json.loads(docker('inspect', name))[0]
        address = fresh['NetworkSettings']['Networks'][network]['IPAddress']
        inside = json.loads(docker('exec', '-e', 'PGPASSWORD', name, 'psql', '-X', '-tA', '-h', address,
            '-U', user, '-d', database, '-c',
            "SELECT json_build_object('database',current_database(),'user',current_user,"
            "'address',inet_server_addr()::text,'port',inet_server_port(),"
            "'system_identifier',(SELECT system_identifier::text FROM pg_control_system()))"))
        print('IDENTITY:', {'expected_database': database, 'actual_database': repr(identity[0]),
                           'expected_user': user, 'actual_user': repr(identity[1]),
                           'startup_address': info['NetworkSettings']['Networks'][network]['IPAddress'],
                           'ready_address': address, 'actual_address': repr(identity[3]),
                           'server_port': identity[4], 'encoding': identity[6],
                           'container_system_identifier_matches': identity[5] == inside['system_identifier']}, flush=True)
        check(fresh['Id'] == info['Id'] and fresh['State']['Running']
              and fresh['Config']['Labels'].get('vistrah.targeting-verification') == token
              and list(fresh['NetworkSettings']['Networks']) == [network]
              and fresh['NetworkSettings']['Ports']['5432/tcp'] == bindings
              and identity[0] == inside['database'] == database
              and identity[1] == inside['user'] == user
              and exact_host_address(identity[3], address)
              and exact_host_address(inside['address'], address)
              and identity[4] == inside['port'] == 5432
              and isinstance(identity[5], str) and identity[5].isdigit()
              and identity[5] == inside['system_identifier'] and identity[6] == 'UTF8',
              'Database/user/server address independently match newly created container')
        print('SERVER:', identity[2], flush=True)
        scripts = ScriptDirectory(str(Path(__file__).resolve().parents[1] / 'migrations'))
        check(scripts.get_heads() == ['024'] and scripts.get_revision('024').down_revision == '023',
              'Actual migration chain: 023 -> 024')

        def migrate(revision, direction='upgrade'):
            print('MIGRATION:', direction, revision, flush=True)
            with engine.begin() as connection:
                with Operations.context(MigrationContext.configure(connection)):
                    getattr(scripts.get_revision(revision).module, direction)()
                connection.execute(sa.text('UPDATE alembic_version SET version_num=:version'),
                                   {'version': revision if direction == 'upgrade' else '023'})

        with engine.begin() as connection:
            check(connection.exec_driver_sql("SELECT count(*) FROM information_schema.tables WHERE table_schema='public'").scalar() == 0,
                  'Fresh database is empty before any migration')
            connection.exec_driver_sql('CREATE TABLE alembic_version (version_num VARCHAR(32) PRIMARY KEY)')
            connection.exec_driver_sql("INSERT INTO alembic_version VALUES ('000')")
        # Explicit migration functions only: no Alembic env, app startup or seed.
        for revision in reversed(list(scripts.walk_revisions(base='base', head='023'))):
            migrate(revision.revision)
        with engine.begin() as c:
            check(c.exec_driver_sql('SELECT version_num FROM alembic_version').scalar() == '023', 'Full schema built to parent revision 023 without seeding')
            c.exec_driver_sql("INSERT INTO users (id,name,email,password_hash,phone,role,created_at) VALUES (1,'Fixture','targeting@example.test','test','','ADMIN',CURRENT_TIMESTAMP)")
            c.exec_driver_sql("INSERT INTO v_ads_advertisers (id,owner_id,name,handle,description,status,created_at) VALUES ('a',1,'Fixture A','fixture-a','','APPROVED',CURRENT_TIMESTAMP),('b',1,'Fixture B','fixture-b','','APPROVED',CURRENT_TIMESTAMP)")
            c.exec_driver_sql("INSERT INTO v_ads_media_uploads (id,owner_id,advertiser_id,storage_key,sha256,size_bytes,status,created_at) VALUES ('media',1,'a','fixture','fixture',10,'VALIDATED',CURRENT_TIMESTAMP)")
            c.exec_driver_sql("INSERT INTO v_ads_videos (id,advertiser_id,title,description,video_url,status,created_at,media_upload_id) VALUES ('v','a','Fixture','','/v-ads/media/media','APPROVED',CURRENT_TIMESTAMP,'media')")
            c.exec_driver_sql("INSERT INTO v_ads_views (id,video_id,user_id,created_at) VALUES ('view','v',1,CURRENT_TIMESTAMP)")
        tables = ('v_ads_advertisers', 'v_ads_videos', 'v_ads_media_uploads', 'v_ads_views')

        def snapshot():
            with engine.connect() as c:
                return {table: c.exec_driver_sql('SELECT * FROM ' + table + ' ORDER BY id').all() for table in tables}

        before = snapshot()
        migrate('024')
        check(snapshot() == before, 'Upgrade 023 -> 024 preserves advertisement/media/engagement records exactly')

        def execute(sql, params=None):
            with engine.begin() as c:
                return c.execute(sa.text(sql), params or {})

        def reject(sql, params=None):
            try:
                execute(sql, params)
            except sa.exc.DBAPIError:
                return
            raise AssertionError('Expected database rejection')

        with engine.connect() as c:
            check(c.exec_driver_sql('SELECT count(*) FROM v_ads_targeting').scalar() == 0, 'No legacy targeting backfill')
            inspector = sa.inspect(c)
            check(len(inspector.get_foreign_keys('v_ads_targeting')) == 2
                  and len(inspector.get_foreign_keys('v_ads_targeting_revisions')) == 2,
                  'Configuration/revision foreign keys installed')
            indexes = inspector.get_indexes('v_ads_targeting_revisions')
            check({i['name'] for i in indexes if i['unique']} == {'uq_v_ads_targeting_pending', 'uq_v_ads_targeting_approved'},
                  'Unique partial pending/approved indexes installed')
            check(c.exec_driver_sql("SELECT count(*) FROM pg_trigger WHERE tgrelid='v_ads_targeting_revisions'::regclass AND NOT tgisinternal").scalar() == 2,
                  'PostgreSQL review/history triggers installed')
        reject("INSERT INTO v_ads_targeting VALUES ('v','b',CURRENT_TIMESTAMP)")
        reject("INSERT INTO v_ads_targeting VALUES ('missing','a',CURRENT_TIMESTAMP)")
        execute("INSERT INTO v_ads_targeting VALUES ('v','a',CURRENT_TIMESTAMP)")
        reject("INSERT INTO v_ads_targeting VALUES ('v','a',CURRENT_TIMESTAMP)")
        reject("UPDATE v_ads_videos SET advertiser_id='b' WHERE id='v'")
        check(True, 'Advertiser/video mismatch, missing video, duplicate configuration and reassignment rejected')
        proposal = "INSERT INTO v_ads_targeting_revisions (video_id,revision,latitude,longitude,targeting_radius_km,status,created_at) VALUES ('v',:rev,:lat,:lon,:radius,'PENDING',CURRENT_TIMESTAMP)"
        for key, invalids in [('lat', [91, -91, float('nan'), float('inf'), -float('inf')]),
                              ('lon', [181, -181, float('nan'), float('inf')]),
                              ('radius', [0, -1, float('nan'), float('inf'), 20016])]:
            for invalid in invalids:
                reject(proposal, {**{'rev': 1, 'lat': 12, 'lon': 77, 'radius': 2}, key: invalid})
        check(True, '14 out-of-range/NaN/infinite/nonpositive geographic values rejected')
        execute(proposal, {'rev': 1, 'lat': 12, 'lon': 77, 'radius': 2})
        reject(proposal, {'rev': 2, 'lat': 13, 'lon': 77, 'radius': 5})
        for change in ('latitude=13', 'longitude=78', 'targeting_radius_km=5', 'revision=3'):
            reject('UPDATE v_ads_targeting_revisions SET ' + change)
        reject('DELETE FROM v_ads_targeting_revisions')
        reject("UPDATE v_ads_targeting_revisions SET status='APPROVED'")
        execute("UPDATE v_ads_targeting_revisions SET status='APPROVED',reviewed_by=1,reviewed_at=CURRENT_TIMESTAMP WHERE revision=1")
        execute(proposal, {'rev': 2, 'lat': 13, 'lon': 77, 'radius': 5})
        reject("UPDATE v_ads_targeting_revisions SET status='APPROVED',reviewed_by=1,reviewed_at=CURRENT_TIMESTAMP WHERE revision=2")
        with engine.connect() as c:
            check(c.exec_driver_sql("SELECT latitude FROM v_ads_targeting_revisions WHERE status='APPROVED'").scalar() == 12,
                  'Pending edits cannot replace approved geography; one pending/approved enforced')
        reject("UPDATE v_ads_targeting_revisions SET latitude=14 WHERE revision=1")
        # Rollback must restore the original approval if replacement is interrupted.
        with engine.connect() as c:
            tx = c.begin()
            c.exec_driver_sql("UPDATE v_ads_targeting_revisions SET status='SUPERSEDED' WHERE revision=1")
            tx.rollback()
            check(c.exec_driver_sql("SELECT status FROM v_ads_targeting_revisions WHERE revision=1").scalar() == 'APPROVED', 'Interrupted approval replacement rolls back safely')
        with engine.begin() as c:
            c.exec_driver_sql("UPDATE v_ads_targeting_revisions SET status='SUPERSEDED' WHERE revision=1")
            c.exec_driver_sql("UPDATE v_ads_targeting_revisions SET status='APPROVED',reviewed_by=1,reviewed_at=CURRENT_TIMESTAMP WHERE revision=2")
        reject("UPDATE v_ads_targeting_revisions SET status='APPROVED' WHERE revision=1")
        check(True, 'Atomic explicit replacement succeeds; superseded revision cannot reactivate')
        migrate('024', 'downgrade')
        check(snapshot() == before, 'Downgrade 024 -> 023 preserves all legacy fixture records')
        with engine.connect() as c:
            check(c.exec_driver_sql('SELECT version_num FROM alembic_version').scalar() == '023'
                  and not sa.inspect(c).has_table('v_ads_targeting')
                  and c.exec_driver_sql("SELECT count(*) FROM pg_proc WHERE proname IN ('guard_v_ads_targeting','guard_v_ads_targeting_history')").scalar() == 0,
                  'Downgrade removes targeting tables/functions and restores revision 023')
        print(f'RESULT: {passed} PostgreSQL checks passed', flush=True)
    finally:
        if engine is not None:
            engine.dispose()
        if container_created:
            info = json.loads(docker('inspect', name))[0]
            if info['Config']['Labels'].get('vistrah.targeting-verification') != token:
                raise RuntimeError('Refuse cleanup: container ownership label mismatch')
            docker('rm', '-f', '-v', name)
            print('CLEANUP: disposable container removed', flush=True)
        if network_created:
            info = json.loads(docker('network', 'inspect', network))[0]
            if info['Labels'].get('vistrah.targeting-verification') != token or info['Containers']:
                raise RuntimeError('Refuse cleanup: network ownership/attachments mismatch')
            docker('network', 'rm', network)
            print('CLEANUP: disposable network removed; no persistent volumes created', flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Suppress SQLAlchemy/connection traces, which may contain private details.
        print('VERIFICATION FAILED:', type(error).__name__,
              str(error) if isinstance(error, AssertionError) else '(details suppressed)', flush=True)
        if isinstance(error, sa.exc.DBAPIError):
            print('DATABASE ERROR CODE:', getattr(error.orig, 'sqlstate', None), flush=True)
        if isinstance(error, ModuleNotFoundError):
            print('MISSING MODULE:', error.name, flush=True)
        raise SystemExit(1)
