"""Private staging for V Ads candidate files.

Development component. A caller must enforce authentication,
upload quotas, and isolated media processing before HTTP exposure.
"""
import os
import tempfile
from contextlib import contextmanager
from pathlib import Path

from .v_ads_video_validation import MAX_VIDEO_BYTES


@contextmanager
def staged_video(source: Path, private_root: Path):
    """Copy a source to private temporary storage with bounded reads."""
    source = Path(source)
    private_root = Path(private_root)

    if not private_root.is_absolute() or private_root.is_symlink():
        raise ValueError("An absolute non-symlink private root is required")

    if not source.is_file() or source.is_symlink():
        raise ValueError("A regular candidate file is required")

    staging = private_root.resolve() / "staging"
    staging.mkdir(parents=True, exist_ok=True)

    descriptor, name = tempfile.mkstemp(
        prefix="candidate-",
        suffix=".mp4",
        dir=staging,
    )
    temporary = Path(name)

    try:
        size = 0

        with source.open("rb") as input_file, os.fdopen(
            descriptor, "wb"
        ) as output_file:
            while True:
                chunk = input_file.read(1024 * 1024)

                if not chunk:
                    break

                size += len(chunk)

                if size > MAX_VIDEO_BYTES:
                    raise ValueError("Candidate exceeds 100 MB")

                output_file.write(chunk)

            output_file.flush()
            os.fsync(output_file.fileno())

        if size == 0:
            raise ValueError("Empty candidate video")

        yield temporary

    finally:
        temporary.unlink(missing_ok=True)
