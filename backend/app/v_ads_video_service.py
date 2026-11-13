"""Validate a private candidate video before immutable storage.

This is a development service, not a public upload endpoint.
The caller must enforce private staging and upload limits.
"""
from pathlib import Path

from .v_ads_video_validation import (
    MAX_VIDEO_BYTES,
    VideoValidationError,
    validate_video,
)
from .v_ads_video_storage import VideoStorage


def store_video_candidate(
    candidate_path: Path,
    storage: VideoStorage,
) -> dict:
    candidate_path = Path(candidate_path)

    # Reject oversized files before probing or reading their contents.
    if not candidate_path.is_file():
        raise VideoValidationError("Candidate video does not exist")

    if not 1 <= candidate_path.stat().st_size <= MAX_VIDEO_BYTES:
        raise VideoValidationError("Video size exceeds allowed limits")

    # Stage privately, validate the staged bytes, then publish to storage.
    from .v_ads_video_staging import staged_video

    with staged_video(candidate_path, storage.root) as staged_path:
        metadata = validate_video(staged_path)

        stored = storage.store_validated_file(staged_path)

        if stored.size != metadata["size_bytes"]:
            raise VideoValidationError("Stored video size mismatch")

    return {
        "storage_key": stored.key,
        "sha256": stored.sha256,
        "size_bytes": stored.size,
        "duration_seconds": metadata["duration_seconds"],
        "width": metadata["width"],
        "height": metadata["height"],
    }



