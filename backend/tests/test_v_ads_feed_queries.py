"""Query budgets and unchanged public visibility/engagement, isolated fixtures only."""
from uuid import uuid4

import pytest
from sqlalchemy import event

from app.models import User, now
from app.v_ads_models import VAdsAdvertiser, VAdsVideo, VAdsLike, VAdsComment
from app.v_ads_routes import list_reels, advertiser_profile


@pytest.mark.parametrize('profile,budget', [(False, 3), (True, 4)])
def test_public_reels_batch_counts_without_changing_visibility(db, profile, budget):
    viewer = User(name='Synthetic viewer', email=f'{uuid4()}@example.test', password_hash='test-only')
    db.add(viewer)
    account = VAdsAdvertiser(id=str(uuid4()), name='Synthetic advertiser', handle=uuid4().hex, status='APPROVED')
    db.add(account)
    db.flush()
    videos = [VAdsVideo(id=str(uuid4()), advertiser_id=account.id, title=f'Fixture {i}',
        video_url='https://example.test/fixture.mp4', status='APPROVED', published_at=now()) for i in range(6)]
    pending = VAdsVideo(id=str(uuid4()), advertiser_id=account.id, title='Pending fixture',
        video_url='https://example.test/private.mp4', status='PENDING')
    db.add_all([*videos, pending])
    db.flush()
    for video in [videos[0], pending]:
        db.add(VAdsLike(id=str(uuid4()), video_id=video.id, user_id=viewer.id))
        for status in ['VISIBLE', 'HIDDEN', 'DELETED']:
            db.add(VAdsComment(id=str(uuid4()), video_id=video.id, user_id=viewer.id,
                body='Synthetic test comment', status=status))
    db.commit()
    statements = []

    def count_selects(connection, cursor, statement, parameters, context, many):
        if statement.lstrip().upper().startswith('SELECT'):
            statements.append(statement)

    connection = db.connection()
    event.listen(connection, 'before_cursor_execute', count_selects)
    try:
        payload = advertiser_profile(account.id, db) if profile else list_reels(page=1, page_size=6, db=db)
    finally:
        event.remove(connection, 'before_cursor_execute', count_selects)
    items = payload['videos'] if profile else payload['items']
    assert {row['id'] for row in items} == {row.id for row in videos}
    for row in items:
        expected = int(row['id'] == videos[0].id)
        assert row['likes_count'] == expected
        assert row['comments_count'] == expected  # Hidden/deleted comments never count.
    assert len(statements) == budget, f'{len(items)} videos used {len(statements)} SELECTs; budget {budget}'
