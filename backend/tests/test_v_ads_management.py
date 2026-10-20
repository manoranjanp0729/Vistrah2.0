"""Phase 3 only: disposable permissions, moderation, counters and audit integrity."""
from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import select, func

from app.models import User, Audit, now
from app.security import issue_token
from app.v_ads_account_routes import profile_token
from app.v_ads_models import VAdsAdvertiser, VAdsVideo, VAdsMediaUpload, VAdsView, VAdsLike, VAdsComment
from app.v_ads_video_storage import VideoStorage


@pytest.fixture
def management(client, db, tmp_path, monkeypatch):
    monkeypatch.setenv('V_ADS_MEDIA_ENABLED', '1')
    monkeypatch.setenv('V_ADS_PRIVATE_ROOT', str(tmp_path))
    users = {key: User(name=key, email=f'{uuid4()}@example.test', password_hash='test-only',
        role='ADMIN' if key == 'admin' else 'CUSTOMER', seller_enabled=key in {'owner', 'other'})
        for key in ['owner', 'other', 'viewer', 'admin']}
    db.add_all(users.values())
    db.flush()
    account = VAdsAdvertiser(id=str(uuid4()), owner_id=users['owner'].id, name='Test Advertiser',
        handle=uuid4().hex, description='Reviewed description', status='APPROVED')
    db.add(account)
    db.flush()
    stored = VideoStorage(tmp_path).store_validated(b'private-video')
    upload = VAdsMediaUpload(id=str(uuid4()), owner_id=users['owner'].id, advertiser_id=account.id,
        storage_key=stored.key, sha256=stored.sha256, size_bytes=stored.size, status='VALIDATED')
    db.add(upload)
    db.flush()
    video = VAdsVideo(id=str(uuid4()), advertiser_id=account.id, media_upload_id=upload.id,
        title='Reviewed video', description='Test video', video_url='/v-ads/media/'+upload.id,
        status='APPROVED', published_at=now())
    db.add(video)
    db.commit()
    headers = {key: {'Authorization': 'Bearer '+issue_token(db, user)} for key, user in users.items()}
    return client, headers, users, account, video, upload


def decision(expected='APPROVED', **extra):
    return {'expected_status': expected, 'reason': 'Reviewed advertising requirements', **extra}


def test_profile_edits_hide_approved_content_and_block_stale_review(management, db):
    client, headers, _, account, video, _ = management
    old = profile_token(account)
    payload = {'name': 'Changed name', 'description': 'Changed description', 'expected_revision': old}
    path = f'/v-ads/advertisers/{account.id}/profile'
    assert client.post(path, headers=headers['other'], json=payload).status_code == 403
    response = client.post(path, headers=headers['owner'], json=payload)
    assert response.status_code == 200, response.text
    assert response.json()['status'] == 'PENDING'
    assert client.get('/v-ads/reels/'+video.id).status_code == 404
    assert client.post(path, headers=headers['owner'], json=payload).status_code == 409
    review_path = f'/admin/v-ads/advertisers/{account.id}/review'
    assert client.post(review_path, headers=headers['admin'], json={
        'status': 'APPROVED', 'reason': decision()['reason'], 'expected_revision': old}).status_code == 409
    fresh = response.json()['review_token']
    assert client.post(review_path, headers=headers['admin'], json={
        'status': 'APPROVED', 'reason': decision()['reason'], 'expected_revision': fresh}).status_code == 200
    assert client.get('/v-ads/reels/'+video.id).status_code == 200
    history = client.get(f'/v-ads/advertisers/{account.id}/history', headers=headers['owner']).json()
    assert {row['action'] for row in history['items']} >= {'V_ADS_PROFILE_EDIT', 'V_ADS_ADVERTISER_REVIEW'}
    assert client.get(f'/v-ads/advertisers/{account.id}/history', headers=headers['other']).status_code == 403


def test_account_suspension_requires_independent_admin_and_re_review(management, db):
    client, headers, users, account, video, _ = management
    path = f'/admin/v-ads/advertisers/{account.id}/moderate'
    payload = decision(status='SUSPENDED')
    assert client.post(path, headers=headers['owner'], json=payload).status_code == 403
    assert client.post(path, headers=headers['admin'], json=payload).status_code == 200
    assert client.post(path, headers=headers['admin'], json=payload).status_code == 409
    assert client.get('/v-ads/reels/'+video.id).status_code == 404
    assert client.post(f'/v-ads/advertisers/{account.id}/profile', headers=headers['owner'],
        json={'name': 'Bypass attempt', 'description': '', 'expected_revision': profile_token(account)}).status_code == 409
    assert client.post(path, headers=headers['admin'], json=decision('SUSPENDED', status='PENDING')).status_code == 200
    assert client.get('/v-ads/reels/'+video.id).status_code == 404
    account.owner_id = users['admin'].id
    account.status = 'PENDING'
    db.commit()
    assert client.post(f'/admin/v-ads/advertisers/{account.id}/review', headers=headers['admin'],
        json={'status': 'APPROVED', 'reason': decision()['reason']}).status_code == 403


def test_private_preview_permissions_and_range(management, monkeypatch):
    client, headers, _, _, video, _ = management
    path = f'/admin/v-ads/videos/{video.id}/preview'
    assert client.get(path).status_code == 401
    assert client.get(path, headers=headers['owner']).status_code == 403
    response = client.get(path, headers={**headers['admin'], 'Range': 'bytes=0-6'})
    assert response.status_code == 206 and response.content == b'private'
    assert response.headers['cache-control'] == 'private, no-store'
    monkeypatch.delenv('V_ADS_MEDIA_ENABLED')
    assert client.get(path, headers=headers['admin']).status_code == 503


@pytest.mark.parametrize('administrator', [False, True])
def test_withdrawal_and_removal_are_terminal_audited_transitions(management, db, administrator):
    client, headers, _, _, video, _ = management
    path = f'/admin/v-ads/videos/{video.id}/remove' if administrator else f'/v-ads/videos/{video.id}/withdraw'
    who = 'admin' if administrator else 'owner'
    assert client.post(path, headers=headers['other'], json=decision()).status_code == 403
    assert client.post(path, headers=headers[who], json=decision()).status_code == 200
    assert client.post(path, headers=headers[who], json=decision()).status_code == 409
    assert client.get('/v-ads/reels/'+video.id).status_code == 404
    assert client.get('/v-ads/media/'+video.media_upload_id).status_code == 401
    assert client.post(f'/admin/v-ads/videos/{video.id}/review', headers=headers['admin'],
        json={'status': 'APPROVED', 'reason': decision()['reason']}).status_code == 409
    action = 'V_ADS_VIDEO_REMOVE' if administrator else 'V_ADS_VIDEO_WITHDRAW'
    assert db.scalar(select(func.count()).select_from(Audit).where(Audit.entity_id == video.id, Audit.action == action)) == 1
    assert client.delete('/v-ads/uploads/'+video.media_upload_id, headers=headers['owner']).status_code == 200
    assert client.get(f'/admin/v-ads/videos/{video.id}/preview', headers=headers['admin']).status_code == 404


def test_stale_status_and_self_moderation_cannot_change_records(management, db):
    client, headers, users, account, video, _ = management
    path = f'/admin/v-ads/videos/{video.id}/remove'
    assert client.post(path, headers=headers['admin'], json=decision('PENDING')).status_code == 409
    account.owner_id = users['admin'].id
    db.commit()
    assert client.post(path, headers=headers['admin'], json=decision()).status_code == 403
    assert client.post(f'/admin/v-ads/advertisers/{account.id}/moderate', headers=headers['admin'],
        json=decision(status='SUSPENDED')).status_code == 403
    assert video.status == 'APPROVED'


def test_views_are_authenticated_idempotent_and_exclude_owners_admins(management, db):
    client, headers, _, _, video, _ = management
    path = f'/v-ads/reels/{video.id}/view'
    assert client.post(path).status_code == 401
    assert client.post(path, headers=headers['owner']).json() == {'counted': False}
    assert client.post(path, headers=headers['admin']).json() == {'counted': False}
    assert client.post(path, headers=headers['viewer']).json() == {'counted': True}
    assert client.post(path, headers=headers['viewer']).json() == {'counted': False}
    assert db.scalar(select(func.count()).select_from(VAdsView)) == 1
    video.status = 'REMOVED'
    db.commit()
    assert client.post(path, headers=headers['viewer']).status_code == 404


@pytest.mark.parametrize('count,age', [(30, timedelta()), (300, timedelta(hours=1))])
def test_view_abuse_caps_do_not_insert_more_records(management, db, count, age):
    client, headers, users, _, video, _ = management
    db.add_all([VAdsView(id=str(uuid4()), video_id=video.id, user_id=users['viewer'].id,
                        created_at=now()-age) for _ in range(count)])
    db.commit()
    assert client.post(f'/v-ads/reels/{video.id}/view', headers=headers['viewer']).status_code == 429
    assert db.scalar(select(func.count()).select_from(VAdsView)) == count


def test_analytics_scope_and_visible_comment_counts(management, db):
    client, headers, users, account, video, _ = management
    db.add(VAdsLike(id=str(uuid4()), video_id=video.id, user_id=users['viewer'].id))
    db.add(VAdsView(id=str(uuid4()), video_id=video.id, user_id=None))
    for status in ['VISIBLE', 'HIDDEN', 'DELETED']:
        db.add(VAdsComment(id=str(uuid4()), video_id=video.id, user_id=users['viewer'].id, body='Test', status=status))
    db.commit()
    assert client.post(f'/v-ads/reels/{video.id}/view', headers=headers['viewer']).status_code == 200
    assert client.get('/v-ads/analytics', headers=headers['viewer']).status_code == 403
    assert client.get('/admin/v-ads/analytics', headers=headers['owner']).status_code == 403
    owned = client.get('/v-ads/analytics', headers=headers['owner']).json()
    assert owned['totals'] == {'videos': 1, 'views': 1, 'likes': 1, 'comments': 1}
    assert client.get('/v-ads/analytics', headers=headers['other']).json()['totals']['videos'] == 0
    assert client.get('/v-ads/analytics?advertiser_id='+account.id, headers=headers['other']).status_code == 404
    queue = client.get('/admin/v-ads/videos?status=APPROVED', headers=headers['admin']).json()
    assert queue['items'][0]['views'] == 1 and queue['items'][0]['comments'] == 1
    assert client.get(f'/admin/v-ads/videos/{video.id}/history', headers=headers['owner']).status_code == 403


def test_queue_pagination_rejected_accounts_and_reason_validation(management, db):
    client, headers, _, account, video, _ = management
    account.status = 'REJECTED'
    db.commit()
    response = client.get('/admin/v-ads/advertisers?status=REJECTED', headers=headers['admin'])
    assert response.status_code == 200, response.text
    queue = response.json()
    assert queue['items'][0]['id'] == account.id and queue['has_more'] is False
    assert len(queue['items'][0]['review_token']) == 64
    assert client.get('/admin/v-ads/videos?page=0', headers=headers['admin']).status_code == 422
    assert client.post(f'/admin/v-ads/videos/{video.id}/remove', headers=headers['admin'],
        json=decision(reason=' '*20)).status_code == 422


def test_rejection_is_available_with_storage_off_but_approval_stays_closed(management, db, monkeypatch):
    client, headers, _, _, video, _ = management
    video.status = 'PENDING'
    db.commit()
    monkeypatch.delenv('V_ADS_MEDIA_ENABLED')
    path = f'/admin/v-ads/videos/{video.id}/review'
    assert client.post(path, headers=headers['admin'], json={
        'status': 'APPROVED', 'reason': decision()['reason']}).status_code == 503
    assert client.post(path, headers=headers['admin'], json={
        'status': 'REJECTED', 'reason': decision()['reason']}).status_code == 200
    assert video.status == 'REJECTED'
