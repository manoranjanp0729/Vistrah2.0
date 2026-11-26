"""Query budgets, service_type filtering, and unchanged public visibility/engagement."""
from uuid import uuid4

import pytest
from sqlalchemy import event

from app.business_catalogue import business_types
from app.models import User, now
from app.v_ads_models import VAdsAdvertiser, VAdsComment, VAdsLike, VAdsVideo
from app.v_ads_routes import advertiser_profile, list_reels


@pytest.mark.parametrize('profile,budget', [(False, 3), (True, 4)])
def test_public_reels_batch_counts_without_changing_visibility(db, profile, budget):
    viewer = User(name='Synthetic viewer', email=f'{uuid4()}@example.test', password_hash='test-only')
    db.add(viewer)
    account = VAdsAdvertiser(
        id=str(uuid4()), name='Synthetic advertiser', handle=uuid4().hex, status='APPROVED'
    )
    db.add(account)
    db.flush()
    videos = [
        VAdsVideo(
            id=str(uuid4()),
            advertiser_id=account.id,
            title=f'Fixture {i}',
            video_url='https://example.test/fixture.mp4',
            status='APPROVED',
            published_at=now(),
        )
        for i in range(6)
    ]
    pending = VAdsVideo(
        id=str(uuid4()),
        advertiser_id=account.id,
        title='Pending fixture',
        video_url='https://example.test/private.mp4',
        status='PENDING',
    )
    db.add_all([*videos, pending])
    db.flush()
    for video in [videos[0], pending]:
        db.add(VAdsLike(id=str(uuid4()), video_id=video.id, user_id=viewer.id))
        for status in ['VISIBLE', 'HIDDEN', 'DELETED']:
            db.add(
                VAdsComment(
                    id=str(uuid4()),
                    video_id=video.id,
                    user_id=viewer.id,
                    body='Synthetic test comment',
                    status=status,
                )
            )
    db.commit()
    statements = []

    def count_selects(connection, cursor, statement, parameters, context, many):
        if statement.lstrip().upper().startswith('SELECT'):
            statements.append(statement)

    connection = db.connection()
    event.listen(connection, 'before_cursor_execute', count_selects)
    try:
        payload = (
            advertiser_profile(account.id, db)
            if profile
            else list_reels(page=1, page_size=6, db=db)
        )
    finally:
        event.remove(connection, 'before_cursor_execute', count_selects)
    items = payload['videos'] if profile else payload['items']
    assert {row['id'] for row in items} == {row.id for row in videos}
    for row in items:
        expected = int(row['id'] == videos[0].id)
        assert row['likes_count'] == expected
        assert row['comments_count'] == expected  # Hidden/deleted comments never count.
    assert len(statements) == budget, f'{len(items)} videos used {len(statements)} SELECTs; budget {budget}'


def test_v_ads_reels_filter_by_new_service_types_and_reject_invalid_slugs(db, client):
    account = VAdsAdvertiser(
        id=str(uuid4()),
        name='Neighbourhood Studio',
        handle=uuid4().hex[:16],
        status='APPROVED',
    )
    db.add(account)
    db.flush()

    dental_ad = VAdsVideo(
        id=str(uuid4()),
        advertiser_id=account.id,
        title='Gentle Root Canal & Smile Makeovers',
        description=(
            'Book same-day dental checkups.\n\n'
            '<!--V_AD_META:{"ad_type":"BRAND","category_slug":"hospitals-and-labs","service_type":"dental-clinics"}:V_AD_META-->'
        ),
        video_url='/videos/v-ads/fixture.mp4',
        status='APPROVED',
        published_at=now(),
    )
    bakery_ad = VAdsVideo(
        id=str(uuid4()),
        advertiser_id=account.id,
        title='Fresh Sourdough & Celebration Cakes',
        description=(
            'Daily warm bakes.\n\n'
            '<!--V_AD_META:{"ad_type":"PRODUCT","product_name":"Truffle Cake","category_slug":"restaurants-and-dining","service_type":"bakeries-and-desserts"}:V_AD_META-->'
        ),
        video_url='/videos/v-ads/fixture.mp4',
        status='APPROVED',
        published_at=now(),
    )
    db.add_all([dental_ad, bakery_ad])
    db.commit()

    dental_res = client.get('/v-ads/reels?category=hospitals-and-labs&service_type=dental-clinics')
    assert dental_res.status_code == 200, dental_res.text
    dental_items = dental_res.json()['items']
    assert [r['id'] for r in dental_items] == [dental_ad.id]
    assert dental_items[0]['service_type'] == 'dental-clinics'
    assert dental_items[0]['category_slug'] == 'hospitals-and-labs'

    bakery_res = client.get(
        '/v-ads/reels?category=restaurants-and-dining&service_type=bakeries-and-desserts'
    )
    assert bakery_res.status_code == 200
    assert [r['id'] for r in bakery_res.json()['items']] == [bakery_ad.id]

    # Every single one of the 60 subcategories across the 10 categories is accepted by list_reels
    for cat in business_types()['categories']:
        for bt in cat['types']:
            ok = list_reels(page=1, page_size=6, category=cat['slug'], service_type=bt['slug'], db=db)
            assert 'items' in ok, f"Failed for {cat['slug']}/{bt['slug']}"

    # Mismatched category/service_type or unknown service_type fails closed with 422
    assert (
        client.get('/v-ads/reels?category=restaurants-and-dining&service_type=dental-clinics').status_code
        == 422
    )
    assert client.get('/v-ads/reels?service_type=unknown-nonexistent-type').status_code == 422
