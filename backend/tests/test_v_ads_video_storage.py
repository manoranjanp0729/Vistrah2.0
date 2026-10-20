"""Isolated tests for immutable private V Ads video storage."""
import hashlib

import pytest

from app.v_ads_video_storage import VideoStorage, StoredVideo


@pytest.fixture
def storage(tmp_path):
    return VideoStorage(tmp_path / "private-vads")


def test_store_and_read(storage):
    content = b"synthetic-storage-test-content"

    saved = storage.store_validated(content)

    assert saved.sha256 == hashlib.sha256(content).hexdigest()
    assert saved.key == saved.sha256 + ".mp4"
    assert saved.size == len(content)
    assert storage.read(saved) == content


def test_duplicate_file_is_idempotent(storage):
    content = b"duplicate-storage-test"

    first = storage.store_validated(content)
    second = storage.store_validated(content)

    assert first == second

    files = list((storage.root / "objects").rglob("*.mp4"))
    assert len(files) == 1


def test_invalid_storage_key_rejected(storage):
    reference = StoredVideo(
        key="../outside.mp4",
        sha256="0" * 64,
        size=10,
    )

    with pytest.raises(ValueError):
        storage.read(reference)


def test_relative_storage_root_rejected(tmp_path):
    with pytest.raises(ValueError):
        VideoStorage("relative/private-vads")


def test_corrupted_video_detected(storage):
    content = b"original-video-content"
    saved = storage.store_validated(content)

    path = storage._path(saved.key)
    path.write_bytes(b"tampered-content")

    with pytest.raises(OSError):
        storage.read(saved)


def test_empty_video_rejected(storage):
    with pytest.raises(ValueError):
        storage.store_validated(b"")
