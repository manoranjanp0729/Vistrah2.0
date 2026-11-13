"""Explicit in-memory migration operations only; run with unittest, not pytest."""
import importlib.util
import os
from pathlib import Path
import unittest

# Set before app.database/config imports: no persistent DB or runtime secret file.
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
os.environ['JWT_SECRET'] = 'isolated-targeting-unit-test-secret-only'

import sqlalchemy as sa
from sqlalchemy.orm import Session
from alembic.migration import MigrationContext
from alembic.operations import Operations
from alembic.script import ScriptDirectory
from app import v_ads_models
from app.v_ads_targeting_models import VAdsTargeting, VAdsTargetingRevision
from app.v_ads_geography import MAX_RADIUS_KM

PATH = Path(__file__).resolve().parents[1] / 'migrations'
spec = importlib.util.spec_from_file_location('targeting_migration', PATH / 'versions/024_v_ads_targeting.py')
migration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(migration)


class TargetingFoundationTests(unittest.TestCase):
    def setUp(self):
        self.engine = sa.create_engine('sqlite:///:memory:')
        self.connection = self.engine.connect()
        self.connection.exec_driver_sql('PRAGMA foreign_keys=ON')
        # Minimal pre-024 parent schema, with synthetic legacy media/engagement.
        for sql in (
            'CREATE TABLE users (id INTEGER PRIMARY KEY)',
            'CREATE TABLE v_ads_advertisers (id VARCHAR(36) PRIMARY KEY, owner_id INTEGER REFERENCES users(id))',
            'CREATE TABLE v_ads_videos (id VARCHAR(36) PRIMARY KEY, advertiser_id VARCHAR(36) NOT NULL REFERENCES v_ads_advertisers(id), video_url TEXT)',
            'CREATE TABLE fixture_media (id INTEGER PRIMARY KEY, video_id VARCHAR(36) REFERENCES v_ads_videos(id), payload TEXT)',
            'INSERT INTO users VALUES (1)',
            "INSERT INTO v_ads_advertisers VALUES ('a',1),('b',1)",
            "INSERT INTO v_ads_videos VALUES ('v','a','/legacy.mp4'),('w','b','/other.mp4')",
            "INSERT INTO fixture_media VALUES (1,'v','unchanged')",
        ):
            self.connection.exec_driver_sql(sql)
        self.connection.commit()
        self.apply(migration.upgrade)

    def tearDown(self):
        self.connection.close()
        self.engine.dispose()

    def apply(self, operation):
        with Operations.context(MigrationContext.configure(self.connection)):
            operation()
        self.connection.commit()

    def sql(self, sql):
        return self.connection.exec_driver_sql(sql)

    def configuration(self):
        self.sql("INSERT INTO v_ads_targeting VALUES ('v','a',CURRENT_TIMESTAMP)")

    def proposal(self, revision=1, latitude=12, radius=5):
        self.connection.execute(sa.text("INSERT INTO v_ads_targeting_revisions "
            "(video_id,revision,latitude,longitude,targeting_radius_km,status,created_at) "
            "VALUES ('v',:revision,:latitude,77,:radius,'PENDING',CURRENT_TIMESTAMP)"),
            {'revision': revision, 'latitude': latitude, 'radius': radius})

    def approve(self, revision=1):
        self.sql(f"UPDATE v_ads_targeting_revisions SET status='APPROVED', reviewed_by=1, "
                 f"reviewed_at=CURRENT_TIMESTAMP WHERE revision={revision}")

    def test_actual_chain_and_frozen_limit(self):
        script = ScriptDirectory(str(PATH))
        self.assertEqual(script.get_heads(), ['024'])
        self.assertEqual(script.get_revision('024').down_revision, '023')
        self.assertEqual(migration.MAX_RADIUS_KM, MAX_RADIUS_KM)

    def test_upgrade_downgrade_preserves_legacy_and_no_backfill(self):
        self.assertEqual(self.sql('SELECT count(*) FROM v_ads_targeting').scalar(), 0)
        self.configuration()
        self.proposal()
        self.approve()
        self.apply(migration.downgrade)
        self.assertEqual(self.sql('SELECT * FROM v_ads_videos ORDER BY id').all(),
                         [('v', 'a', '/legacy.mp4'), ('w', 'b', '/other.mp4')])
        self.assertEqual(self.sql('SELECT * FROM fixture_media').all(), [(1, 'v', 'unchanged')])
        self.assertEqual(self.sql('PRAGMA foreign_key_check').all(), [])
        self.apply(migration.upgrade)
        self.assertEqual(self.sql('SELECT count(*) FROM v_ads_targeting').scalar(), 0)

    def test_foreign_keys_and_one_configuration(self):
        for values in ("'v','b'", "'missing','a'"):
            with self.assertRaises(sa.exc.IntegrityError):
                self.sql(f'INSERT INTO v_ads_targeting VALUES ({values},CURRENT_TIMESTAMP)')
        self.configuration()
        with self.assertRaises(sa.exc.IntegrityError):
            self.configuration()
        with self.assertRaises(sa.exc.IntegrityError):
            self.sql("UPDATE v_ads_videos SET advertiser_id='b' WHERE id='v'")
        with self.assertRaises(sa.exc.IntegrityError):
            self.sql("DELETE FROM v_ads_videos WHERE id='v'")

    def test_pending_edit_preserves_approved_until_explicit_replacement(self):
        self.configuration()
        self.proposal()
        self.approve()
        self.proposal(2, latitude=13)
        self.assertEqual(self.sql("SELECT latitude FROM v_ads_targeting_revisions WHERE status='APPROVED'").scalar(), 12)
        with self.assertRaises(sa.exc.IntegrityError):
            self.approve(2)
        self.sql("UPDATE v_ads_targeting_revisions SET status='SUPERSEDED' WHERE revision=1")
        self.approve(2)
        self.assertEqual(self.sql("SELECT revision FROM v_ads_targeting_revisions WHERE status='APPROVED'").scalar(), 2)
        self.assertEqual(self.sql('SELECT count(*) FROM v_ads_targeting_revisions').scalar(), 2)

    def test_pending_uniqueness_immutable_geometry_and_history(self):
        self.configuration()
        self.proposal()
        with self.assertRaises(sa.exc.IntegrityError):
            self.proposal(2)
        for change in ("latitude=14", "longitude=78", "targeting_radius_km=10", "revision=3"):
            with self.assertRaises(sa.exc.IntegrityError):
                self.sql(f'UPDATE v_ads_targeting_revisions SET {change}')
        self.approve()
        with self.assertRaises(sa.exc.IntegrityError):
            self.sql("UPDATE v_ads_targeting_revisions SET latitude=14")
        with self.assertRaises(sa.exc.IntegrityError):
            self.sql('DELETE FROM v_ads_targeting_revisions')
        with self.assertRaises(sa.exc.IntegrityError):
            self.sql("UPDATE v_ads_targeting_revisions SET status='PENDING', reviewed_at=NULL, reviewed_by=NULL")

    def test_model_validation_and_mapping(self):
        for key, value in (('latitude', True), ('latitude', float('nan')), ('longitude', 181),
                           ('longitude', float('inf')), ('targeting_radius_km', 0),
                           ('targeting_radius_km', False), ('targeting_radius_km', MAX_RADIUS_KM + 1)):
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                VAdsTargetingRevision(**{key: value})
        self.connection.commit()
        with Session(self.connection) as session:
            session.add(VAdsTargeting(video_id='v', advertiser_id='a'))
            session.flush()
            session.add(VAdsTargetingRevision(video_id='v', revision=1, latitude=12,
                                             longitude=77, targeting_radius_km=2))
            session.flush()
            self.assertEqual(session.get(VAdsTargetingRevision, ('v', 1)).status, 'PENDING')
            session.rollback()

    def test_raw_database_constraints(self):
        self.configuration()
        for latitude, radius in ((91, 5), (float('nan'), 5), (float('inf'), 5), (12, 0), (12, float('inf'))):
            with self.subTest(latitude=latitude, radius=radius), self.assertRaises(sa.exc.IntegrityError):
                self.proposal(latitude=latitude, radius=radius)
        self.proposal()
        for change in ("status='INVALID'", "status='APPROVED'", "status='SUPERSEDED', reviewed_by=1, reviewed_at=CURRENT_TIMESTAMP"):
            with self.assertRaises(sa.exc.IntegrityError):
                self.sql(f'UPDATE v_ads_targeting_revisions SET {change}')
        with self.assertRaises(sa.exc.IntegrityError):
            self.sql("UPDATE v_ads_targeting_revisions SET status='APPROVED', reviewed_by=999, reviewed_at=CURRENT_TIMESTAMP")


if __name__ == '__main__':
    unittest.main()
