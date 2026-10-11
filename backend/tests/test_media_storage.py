"""Storage-only synthetic byte fixtures; no format-validation or durable-volume claim."""
from pathlib import Path
import pytest
import app.media_storage as media
from app.media_storage import MediaStorage, StoredObject

def test_explicit_root_immutable_reuse_and_detached_history(tmp_path):
    with pytest.raises(ValueError):MediaStorage(Path('relative'))
    store=MediaStorage(tmp_path/'dedicated-synthetic-media')
    old=store.put_derivative(b'synthetic decoded derivative one','png')
    new=store.put_derivative(b'synthetic decoded derivative two','png')
    assert old==store.put_derivative(b'synthetic decoded derivative one','png')
    assert store.read(old)==b'synthetic decoded derivative one'
    assert store.read(new)==b'synthetic decoded derivative two'
    # A reference swap does not delete an earlier/shared object.
    assert len(list((store.root/'objects').rglob('*.png')))==2

def test_failed_atomic_swap_keeps_existing_reference_and_only_cleans_own_temp(tmp_path,monkeypatch):
    store=MediaStorage(tmp_path/'synthetic-media');old=store.put_derivative(b'synthetic approved derivative','webp')
    unrelated=store.root/'staging'/'unrelated-retained.temporary';unrelated.write_bytes(b'retain me')
    def unavailable(*args):raise OSError('Synthetic storage outage')
    monkeypatch.setattr(media.os,'link',unavailable)
    with pytest.raises(OSError):store.put_derivative(b'synthetic proposed derivative','webp')
    assert store.read(old)==b'synthetic approved derivative'
    assert unrelated.read_bytes()==b'retain me'
    assert list((store.root/'staging').glob('upload-*.temporary'))==[]

def test_key_traversal_and_integrity_are_rejected(tmp_path):
    store=MediaStorage(tmp_path/'synthetic-media')
    with pytest.raises(ValueError):store.read(StoredObject('../secret','0'*64,1))
    with pytest.raises(ValueError):store.put_derivative(b'fixture','svg')
    reference=store.put_derivative(b'synthetic derivative','jpg')
    with pytest.raises(OSError):store.read(StoredObject(reference.key,'0'*64,reference.size))
