"""Bounded inspection of private V Ads video candidates.

This module does not upload, publish, or serve files.
Run it only on private, size-limited candidate files.
"""
import json
import subprocess
import tempfile
from pathlib import Path


MAX_VIDEO_BYTES = 100 * 1024 * 1024
MAX_DURATION_SECONDS = 60
MAX_WIDTH = 2160
MAX_HEIGHT = 3840


class VideoValidationError(ValueError):
    pass


def validate_video(path: Path) -> dict:
    path = Path(path)

    if not path.is_file():
        raise VideoValidationError("Video file does not exist")

    size = path.stat().st_size

    if not 1 <= size <= MAX_VIDEO_BYTES:
        raise VideoValidationError("Video must be between 1 byte and 100 MB")

    try:
        with tempfile.TemporaryFile() as output:
            result = subprocess.run(
                [
                    "ffprobe",
                    "-v", "error",
                    "-max_alloc", "16777216",
                    "-protocol_whitelist", "file",
                    "-format_whitelist", "mov",
                    "-probesize", "5000000",
                    "-analyzeduration", "5000000",
                    "-show_entries",
                    "format=format_name,duration:"
                    "format_tags=major_brand:stream=codec_type,codec_name,width,height",
                    "-of", "json",
                    str(path),
                ],
                stdout=output,
                stderr=subprocess.DEVNULL,
                timeout=15,
                check=False,
            )
            output.seek(0)
            probe_output = output.read(65537)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise VideoValidationError(
            "Video inspection failed"
        ) from exc

    if result.returncode != 0 or len(probe_output) > 65536:
        raise VideoValidationError("Invalid or unsupported video file")

    try:
        metadata = json.loads(probe_output)
        container = metadata["format"]["format_name"]
        duration = float(metadata["format"]["duration"])
        streams = metadata["streams"]
        brand = metadata["format"]["tags"]["major_brand"]
    except (KeyError, ValueError, TypeError, IndexError) as exc:
        raise VideoValidationError(
            "Video metadata is incomplete"
        ) from exc

    if not isinstance(container, str) or "mp4" not in container.split(","):
        raise VideoValidationError("Only MP4 videos are supported")

    if not isinstance(brand, str) or brand not in {
        "isom", "iso2", "iso3", "iso4", "iso5", "iso6", "mp41", "mp42", "avc1"
    }:
        raise VideoValidationError("Only MP4 container brands are supported")

    if not 0 < duration <= MAX_DURATION_SECONDS:
        raise VideoValidationError("Video must be no longer than 60 seconds")

    if not isinstance(streams, list) or len(streams) > 2 or any(
        not isinstance(stream, dict) for stream in streams
    ):
        raise VideoValidationError("Unsupported media streams")

    video_streams = [
        stream for stream in streams
        if stream.get("codec_type") == "video"
    ]

    if len(video_streams) != 1:
        raise VideoValidationError("Exactly one video stream is required")

    if any(
        stream.get("codec_type") not in {"video", "audio"}
        for stream in streams
    ):
        raise VideoValidationError("Unsupported additional media streams")

    if any(
        stream.get("codec_type") == "audio"
        and stream.get("codec_name") != "aac"
        for stream in streams
    ):
        raise VideoValidationError("Audio must use AAC encoding")

    video = video_streams[0]

    if video.get("codec_name") != "h264":
        raise VideoValidationError("Video must use H.264 encoding")

    width = video.get("width", 0)
    height = video.get("height", 0)

    if not (
        isinstance(width, int)
        and isinstance(height, int)
        and 0 < width <= MAX_WIDTH
        and 0 < height <= MAX_HEIGHT
    ):
        raise VideoValidationError("Unsupported video dimensions")

    return {
        "size_bytes": size,
        "duration_seconds": duration,
        "width": width,
        "height": height,
        "video_codec": "h264",
        "container": "mp4",
    }
