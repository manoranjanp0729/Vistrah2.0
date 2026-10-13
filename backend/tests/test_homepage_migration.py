"""013 preserves existing records and refuses to erase homepage history."""
import os
import subprocess
import sys
from pathlib import Path


def test_homepage_migration_empty_roundtrip_and_guarded_downgrade(tmp_path):
    database = tmp_path / 'homepage-migration.db'
    assert not database.exists()
    env = {**os.environ, 'DATABASE_URL': 'sqlite:///' + database.as_posix(),
        'JWT_SECRET': 'isolated-homepage-migration-fixture-not-production'}
    script = '''
from alembic import command
from alembic.config import Config
from sqlalchemy import text
from app.database import engine
cfg = Config('alembic.ini')
command.upgrade(cfg, '012')
with engine.begin() as c:
 c.execute(text("INSERT INTO users (id,email,name,password_hash,phone,role,created_at) VALUES (1,'legacy@example.test','Legacy','no-login','','CUSTOMER',CURRENT_TIMESTAMP)"))
for target, direction in [('013', 'up'), ('012', 'down'), ('013', 'up')]:
 (command.upgrade if direction == 'up' else command.downgrade)(cfg, target)
 with engine.connect() as c:
  assert c.execute(text('SELECT email FROM users WHERE id=1')).scalar() == 'legacy@example.test'
  assert not c.execute(text('PRAGMA foreign_key_check')).all()
with engine.begin() as c:
 c.execute(text("INSERT INTO homepage_state (id,revision,draft,updated_by,updated_at) VALUES (1,1,'{}',1,CURRENT_TIMESTAMP)"))
try:
 command.downgrade(cfg, '012')
 raise AssertionError('Downgrade erased a draft')
except RuntimeError as exc:
 assert 'Cannot downgrade' in str(exc)
with engine.connect() as c:
 assert c.execute(text('SELECT version_num FROM alembic_version')).scalar() == '013'
 assert c.execute(text('SELECT revision FROM homepage_state')).scalar() == 1
engine.dispose()
'''
    result = subprocess.run([sys.executable, '-c', script], env=env, cwd=Path(__file__).resolve().parents[1], capture_output=True, text=True)
    assert result.returncode == 0, result.stdout + result.stderr
