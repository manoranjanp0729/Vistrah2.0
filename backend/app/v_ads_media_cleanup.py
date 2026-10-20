"""Offline-only recovery of stale staging and unreferenced immutable objects.

Run only with ALL upload/serving processes stopped in the target environment.
Dry-run is the default. Never run this against the normal local database as QA.
"""
import time

from sqlalchemy import select

from .v_ads_models import VAdsMediaUpload


def cleanup_media(db, storage, *, offline=False, apply=False, grace_seconds=86400):
    if not offline or grace_seconds < 86400:
        raise ValueError("Verified offline maintenance and at least 24h grace required")
    # Keep every live reference, including unsubmitted uploads. Shared hashes are
    # deleted only after every owner has revoked their reference.
    retained = set(db.scalars(select(VAdsMediaUpload.storage_key).where(
        VAdsMediaUpload.status == "VALIDATED")))
    cutoff = time.time() - grace_seconds
    candidates = []
    for directory in (storage.root / "staging", storage.root / "objects"):
        if not directory.exists():
            continue
        if directory.is_symlink():
            raise ValueError("Unsafe media directory")
        paths = directory.iterdir() if directory.name == "staging" else directory.glob("*/*.mp4")
        for path in paths:
            if path.is_symlink() or any(p.is_symlink() for p in path.parents):
                raise ValueError("Unsafe media path")
            if not path.resolve().is_relative_to(storage.root):
                raise ValueError("Media path escapes storage")
            if not path.is_file() or path.stat().st_mtime >= cutoff:
                continue
            if directory.name == "objects":
                if path.name in retained or storage._path(path.name) != path:
                    continue
            elif not path.name.startswith(("upload-", "candidate-", "vads-")):
                continue
            candidates.append(str(path.relative_to(storage.root)))
            if apply:
                path.unlink()
    return candidates
