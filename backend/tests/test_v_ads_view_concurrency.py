"""New Phase 3 view counters only, on explicitly disposable PostgreSQL."""
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models import User, now
from app.v_ads_models import VAdsVideo, VAdsView
from app.v_ads_management_routes import record_view
from test_v_ads_media_postgres import postgres_media


def fixtures(engine, advertiser_id):
    with Session(engine) as db:
        viewer = User(name='Concurrent viewer', email=f'{uuid4()}@example.test', password_hash='test-only')
        videos = [VAdsVideo(id=str(uuid4()), advertiser_id=advertiser_id, title='View fixture',
            description='', video_url='/fixture.mp4', status='APPROVED', published_at=now()) for _ in range(3)]
        db.add_all([viewer, *videos])
        db.commit()
        return viewer.id, [video.id for video in videos]


def concurrent(engine, user_id, video_ids):
    barrier = Barrier(len(video_ids))
    def count(video_id):
        with Session(engine) as db:
            user = db.get(User, user_id)
            barrier.wait(timeout=10)
            try:
                return record_view(video_id, user, db)['counted']
            except HTTPException as exc:
                return exc.status_code
    with ThreadPoolExecutor(max_workers=len(video_ids)) as pool:
        return list(pool.map(count, video_ids))


def test_same_viewer_concurrent_requests_count_once(postgres_media):
    engine, (_, _, advertiser_id, _) = postgres_media
    user_id, videos = fixtures(engine, advertiser_id)
    results = concurrent(engine, user_id, [videos[0]]*8)
    assert results.count(True) == 1 and results.count(False) == 7
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(VAdsView).where(VAdsView.user_id == user_id)) == 1


@pytest.mark.parametrize('existing,age', [(29, timedelta()), (299, timedelta(hours=1))])
def test_concurrent_view_caps_admit_only_one_remaining_slot(postgres_media, existing, age):
    engine, (_, _, advertiser_id, _) = postgres_media
    user_id, videos = fixtures(engine, advertiser_id)
    with Session(engine) as db:
        db.add_all([VAdsView(id=str(uuid4()), video_id=videos[0], user_id=user_id,
                            created_at=now()-age) for _ in range(existing)])
        db.commit()
    results = concurrent(engine, user_id, videos[1:])
    assert results.count(True) == 1 and results.count(429) == 1
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(VAdsView).where(VAdsView.user_id == user_id)) == existing+1
