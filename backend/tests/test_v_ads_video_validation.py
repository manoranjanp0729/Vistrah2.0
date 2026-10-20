"""Isolated V Ads video validation tests."""
import pytest
import json
from types import SimpleNamespace

from app.v_ads_video_validation import (
    validate_video,
    VideoValidationError,
    MAX_VIDEO_BYTES,
)


def test_missing_video(tmp_path):
    with pytest.raises(VideoValidationError):
        validate_video(tmp_path / "missing.mp4")


def test_empty_file(tmp_path):
    path = tmp_path / "empty.mp4"
    path.write_bytes(b"")

    with pytest.raises(VideoValidationError):
        validate_video(path)


def test_invalid_video_content(tmp_path):
    path = tmp_path / "fake.mp4"
    path.write_bytes(b"This is not an MP4 video")

    with pytest.raises(VideoValidationError):
        validate_video(path)


def test_oversized_video(tmp_path):
    path = tmp_path / "oversized.mp4"

    with path.open("wb") as stream:
        stream.truncate(MAX_VIDEO_BYTES + 1)

    with pytest.raises(
        VideoValidationError,
        match="100 MB",
    ):
        validate_video(path)


def test_image_disguised_as_video(tmp_path):
    path = tmp_path / "image.mp4"
    path.write_bytes(
        b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
    )

    with pytest.raises(VideoValidationError):
        validate_video(path)


@pytest.mark.parametrize("change", ["mov", "nan", "streams", "codec", "audio", "dimensions", "missing"])
def test_untrusted_probe_metadata(tmp_path, monkeypatch, change):
    path = tmp_path / "candidate.mp4"
    path.write_bytes(b"candidate")
    metadata = {"format": {"format_name": "mov,mp4", "duration": "1",
                          "tags": {"major_brand": "isom"}},
                "streams": [{"codec_type": "video", "codec_name": "h264", "width": 100, "height": 200}]}
    if change == "mov":
        metadata["format"]["tags"]["major_brand"] = "qt  "
    elif change == "nan":
        metadata["format"]["duration"] = "nan"
    elif change == "streams":
        metadata["streams"] = [None]
    elif change == "codec":
        metadata["streams"][0]["codec_name"] = "hevc"
    elif change == "audio":
        metadata["streams"].append({"codec_type": "audio", "codec_name": "mp3"})
    elif change == "dimensions":
        metadata["streams"][0]["width"] = 50000
    else:
        metadata = None
    def probe(args, **kwargs):
        assert args[args.index("-protocol_whitelist") + 1] == "file"
        kwargs["stdout"].write(json.dumps(metadata).encode())
        return SimpleNamespace(returncode=0)
    monkeypatch.setattr("app.v_ads_video_validation.subprocess.run", probe)
    with pytest.raises(VideoValidationError):
        validate_video(path)
