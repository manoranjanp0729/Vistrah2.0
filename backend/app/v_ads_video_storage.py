"""Private immutable storage for validated V Ads MP4 files.

The caller must validate the video before storing it.
This module does not provide an HTTP upload or public-serving API.
"""
import hashlib
import os
import re
import tempfile
from dataclasses import dataclass
from pathlib import Path

from .v_ads_video_validation import MAX_VIDEO_BYTES


@dataclass(frozen=True)
class StoredVideo:
    key: str
    sha256: str
    size: int


class VideoStorage:
    def _sync_object_directories(self, destination):
        # Persist the hard-link and newly created shard/object directories before
        # a caller commits a database reference. Windows remains development-only.
        if os.name == "posix":
            for directory in (destination.parent, destination.parent.parent, self.root):
                descriptor = os.open(directory, os.O_RDONLY | os.O_DIRECTORY)
                try:
                    os.fsync(descriptor)
                finally:
                    os.close(descriptor)

    def __init__(self, root: Path):
        root = Path(root)

        if not root.is_absolute():
            raise ValueError("An absolute private video root is required")

        if any(part.is_symlink() for part in (root, *root.parents)):
            raise ValueError("Video root must not be a symbolic link")

        self.root = root.resolve(strict=False)

    def _path(self, key: str) -> Path:
        if not re.fullmatch(r"[0-9a-f]{64}\.mp4", key):
            raise ValueError("Invalid video storage key")

        path = self.root / "objects" / key[:2] / key

        if not path.resolve(strict=False).is_relative_to(self.root):
            raise ValueError("Video path escapes private storage")

        return path

    def store_validated(self, content: bytes) -> StoredVideo:
        if not 1 <= len(content) <= MAX_VIDEO_BYTES:
            raise ValueError("Invalid video size")

        digest = hashlib.sha256(content).hexdigest()
        key = digest + ".mp4"
        destination = self._path(key)

        if destination.exists():
            if hashlib.sha256(destination.read_bytes()).hexdigest() != digest:
                raise OSError("Existing video failed integrity verification")

            self._sync_object_directories(destination)
            return StoredVideo(key, digest, len(content))

        destination.parent.mkdir(parents=True, exist_ok=True)

        staging = self.root / "staging"
        staging.mkdir(parents=True, exist_ok=True)

        descriptor, name = tempfile.mkstemp(
            prefix="vads-",
            suffix=".temporary",
            dir=staging,
        )

        temporary = Path(name)

        try:
            with os.fdopen(descriptor, "wb") as stream:
                stream.write(content)
                stream.flush()
                os.fsync(stream.fileno())

            try:
                os.link(temporary, destination)
            except FileExistsError:
                if hashlib.sha256(destination.read_bytes()).hexdigest() != digest:
                    raise OSError("Concurrent video integrity mismatch")

            self._sync_object_directories(destination)

        finally:
            temporary.unlink(missing_ok=True)

        return StoredVideo(key, digest, len(content))

    def store_validated_file(self, source: Path) -> StoredVideo:
        """Stream a previously validated private file into immutable storage."""
        source = Path(source)

        if not source.is_file() or source.is_symlink():
            raise ValueError("A regular validated video file is required")

        staging = self.root / "staging"
        staging.mkdir(parents=True, exist_ok=True)

        descriptor, name = tempfile.mkstemp(
            prefix="vads-stream-",
            suffix=".temporary",
            dir=staging,
        )
        temporary = Path(name)

        digest = hashlib.sha256()
        size = 0

        try:
            with source.open("rb") as input_file, os.fdopen(
                descriptor, "wb"
            ) as output_file:
                while True:
                    chunk = input_file.read(1024 * 1024)

                    if not chunk:
                        break

                    size += len(chunk)

                    if size > MAX_VIDEO_BYTES:
                        raise ValueError("Video exceeds 100 MB")

                    digest.update(chunk)
                    output_file.write(chunk)

                output_file.flush()
                os.fsync(output_file.fileno())

            if size == 0:
                raise ValueError("Empty video file")

            checksum = digest.hexdigest()
            key = checksum + ".mp4"
            destination = self._path(key)

            destination.parent.mkdir(parents=True, exist_ok=True)

            try:
                os.link(temporary, destination)
            except FileExistsError:
                existing_hash = hashlib.sha256()

                with destination.open("rb") as existing:
                    for chunk in iter(
                        lambda: existing.read(1024 * 1024), b""
                    ):
                        existing_hash.update(chunk)

                if existing_hash.hexdigest() != checksum:
                    raise OSError("Existing immutable video failed integrity check")

            self._sync_object_directories(destination)

            return StoredVideo(key, checksum, size)

        finally:
            temporary.unlink(missing_ok=True)

    def read(self, reference: StoredVideo) -> bytes:
        content = self._path(reference.key).read_bytes()

        if (
            len(content) != reference.size
            or hashlib.sha256(content).hexdigest() != reference.sha256
        ):
            raise OSError("Stored video failed integrity verification")

        return content

