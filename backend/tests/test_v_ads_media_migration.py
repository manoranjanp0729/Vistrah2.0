"""Exercise revision 020 with legacy videos and engagement on disposable SQLite."""
import os
import sqlite3
import subprocess
import sys


def test_media_migration_preserves_legacy_engagement(tmp_path):
    path = tmp_path / "disposable-migration.db"
    env = {**os.environ, "DATABASE_URL": "sqlite:///" + path.as_posix()}
    def migrate(revision):
        subprocess.run([sys.executable, "-m", "alembic", "upgrade", revision],
                       env=env, check=True, capture_output=True)
    migrate("019")
    with sqlite3.connect(path) as connection:
        connection.execute("PRAGMA foreign_keys=ON")
        connection.execute("INSERT INTO v_ads_advertisers "
            "(id,owner_id,name,handle,description,status,created_at) "
            "VALUES ('legacy',NULL,'Legacy','legacy','','APPROVED',CURRENT_TIMESTAMP)")
        connection.execute("INSERT INTO v_ads_videos "
            "(id,advertiser_id,title,description,video_url,status,created_at,published_at) "
            "VALUES ('video','legacy','Legacy','','/legacy.mp4','APPROVED',CURRENT_TIMESTAMP,NULL)")
        connection.execute("INSERT INTO v_ads_views (id,video_id,user_id,created_at) "
                           "VALUES ('view','video',NULL,CURRENT_TIMESTAMP)")
    migrate("020")
    with sqlite3.connect(path) as connection:
        assert connection.execute("SELECT video_url, media_upload_id FROM v_ads_videos").fetchall() == [("/legacy.mp4", None)]
        assert connection.execute("SELECT video_id FROM v_ads_views").fetchall() == [("video",)]
        assert connection.execute("PRAGMA foreign_key_check").fetchall() == []
        assert any(row[2] == 1 for row in connection.execute("PRAGMA index_list(v_ads_videos)"))
