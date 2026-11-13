"""Only new release storage gates; no production paths or normal database."""
import os
from pathlib import Path
from types import SimpleNamespace

import pytest

from app.v_ads_readiness import private_root, require_headroom, check
from app.v_ads_video_storage import VideoStorage
from test_v_ads_management import management


def test_readiness_is_disabled_by_default_and_missing_root_fails_closed(monkeypatch):
    monkeypatch.delenv('V_ADS_MEDIA_ENABLED', raising=False)
    assert 'disabled' in check()
    with pytest.raises(ValueError):
        check(require_enabled=True)
    with pytest.raises(ValueError):
        private_root('relative')


@pytest.mark.skipif(os.name != 'posix', reason='Linux ownership/mode gate')
def test_private_root_requires_0700_and_correct_owner(tmp_path, monkeypatch):
    tmp_path.chmod(0o700)
    assert private_root(str(tmp_path)) == tmp_path
    tmp_path.chmod(0o755)
    with pytest.raises(ValueError):
        private_root(str(tmp_path))
    tmp_path.chmod(0o700)
    monkeypatch.setattr('app.v_ads_readiness.os.geteuid', lambda: tmp_path.stat().st_uid+1)
    with pytest.raises(ValueError):
        private_root(str(tmp_path))


def test_free_space_and_unsafe_reserve_fail_closed(tmp_path, monkeypatch):
    monkeypatch.setattr('app.v_ads_readiness.shutil.disk_usage', lambda path: SimpleNamespace(free=0))
    with pytest.raises(OSError):
        require_headroom(tmp_path)
    monkeypatch.setenv('V_ADS_MIN_FREE_BYTES', '1')
    with pytest.raises(ValueError):
        require_headroom(tmp_path)


@pytest.mark.skipif(os.name != 'posix', reason='Linux preflight')
def test_enabled_preflight_requires_ffprobe_and_checks_configuration(tmp_path, monkeypatch):
    tmp_path.chmod(0o700)
    monkeypatch.setenv('V_ADS_MEDIA_ENABLED', '1')
    monkeypatch.setenv('V_ADS_PRIVATE_ROOT', str(tmp_path))
    monkeypatch.setattr('app.v_ads_readiness.shutil.disk_usage', lambda path: SimpleNamespace(free=2**31))
    monkeypatch.setattr('app.v_ads_readiness.shutil.which', lambda value: None)
    with pytest.raises(ValueError):
        check(require_enabled=True)
    monkeypatch.setattr('app.v_ads_readiness.shutil.which', lambda value: '/usr/bin/ffprobe')
    assert 'checks passed' in check(require_enabled=True)


def test_streamed_storage_calls_directory_sync_before_return(tmp_path, monkeypatch):
    storage = VideoStorage(tmp_path)
    source = tmp_path / 'validated.mp4'
    source.write_bytes(b'validated-fixture')
    synced = []
    monkeypatch.setattr(storage, '_sync_object_directories', lambda path: synced.append(path))
    reference = storage.store_validated_file(source)
    assert synced == [storage._path(reference.key)]
    assert storage.read(reference) == b'validated-fixture'


def test_existing_range_serving_works_with_new_private_root_gate(management):
    client, headers, _, _, _, upload = management
    path = '/v-ads/media/'+upload.id
    response = client.get(path, headers={'Range': 'bytes=0-6'})
    assert response.status_code == 206 and response.content == b'private'
    assert response.headers['content-range'] == 'bytes 0-6/13'
    assert client.get(path, headers={'Range': 'bytes=999-1000'}).status_code == 416


def test_low_disk_rejects_upload_before_receiving_or_probing(management, monkeypatch):
    client, headers, _, account, _, _ = management
    monkeypatch.setattr('app.v_ads_readiness.shutil.disk_usage', lambda path: SimpleNamespace(free=0))
    response = client.post(f'/v-ads/advertisers/{account.id}/uploads',
        headers={**headers['owner'], 'Content-Type': 'video/mp4'}, content=b'candidate')
    assert response.status_code == 507


@pytest.mark.skipif(os.name != 'posix', reason='Linux serving permission gate')
def test_bad_root_permissions_disable_http_serving(management):
    client, _, _, _, _, upload = management
    root = Path(os.environ['V_ADS_PRIVATE_ROOT'])
    root.chmod(0o755)
    try:
        assert client.get('/v-ads/media/'+upload.id).status_code == 503
    finally:
        root.chmod(0o700)


def test_retry_after_directory_sync_failure_does_not_skip_durability(tmp_path, monkeypatch):
    storage = VideoStorage(tmp_path)
    calls = []
    def sync(path):
        calls.append(path)
        if len(calls) == 1:
            raise OSError('Synthetic directory sync failure')
    monkeypatch.setattr(storage, '_sync_object_directories', sync)
    with pytest.raises(OSError):
        storage.store_validated(b'recoverable-fixture')
    reference = storage.store_validated(b'recoverable-fixture')
    assert len(calls) == 2
    assert storage.read(reference) == b'recoverable-fixture'


def test_unreadable_root_fails_closed_as_unavailable(management, monkeypatch):
    client, _, _, _, _, upload = management
    def denied(value):
        raise PermissionError('Synthetic filesystem denial')
    monkeypatch.setattr('app.v_ads_media_routes.private_root', denied)
    assert client.get('/v-ads/media/'+upload.id).status_code == 503


def test_development_mirror_writes_uploaded_videos_to_host_drive(tmp_path, monkeypatch):
    root = tmp_path / 'private'
    root.mkdir(mode=0o700)
    mirror = tmp_path / 'drive_e_uploads'
    monkeypatch.setenv('APP_ENV', 'development')
    monkeypatch.setenv('V_ADS_DEV_MIRROR_ROOT', str(mirror))
    storage = VideoStorage(root)
    ref = storage.store_validated(b'dev-drive-e-video')
    mirrored = mirror / ref.key
    assert mirrored.is_file() and mirrored.read_bytes() == b'dev-drive-e-video'
