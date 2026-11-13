"""V Ads Video Creator Service - Template-driven marketing ad video generator.

Generates vertical 9:16 (720x1280) H.264/AAC MP4 marketing videos using FFmpeg
with image transitions, animated text cards, template badges, and background audio.
"""
from __future__ import annotations

import base64
import os
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from .models import User, Audit
from .v_ads_models import VAdsAdvertiser, VAdsMediaUpload
from .v_ads_media_registration import register_validated_upload
from .v_ads_video_storage import VideoStorage

DEJAVU_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
DEJAVU_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def escape_ffmpeg_text(text: str) -> str:
    """Escape text for FFmpeg drawtext filter."""
    if not text:
        return ""
    # Filter out dangerous shell characters and unsupported glyphs
    cleaned = re.sub(r"[\x00-\x1f\x7f]", "", text)
    cleaned = cleaned.replace("\\", "\\\\")
    cleaned = cleaned.replace("'", "'\\''")
    cleaned = cleaned.replace(":", "\\:")
    cleaned = cleaned.replace("%", "%%")
    cleaned = cleaned.replace(",", "\\,")
    cleaned = cleaned.replace("[", "\\[").replace("]", "\\]")
    return cleaned[:100]


def sanitize_color(color: str, default: str = "#2563EB") -> str:
    if re.match(r"^#[0-9a-fA-F]{6}$", color):
        return color
    return default


def get_music_filter(mood: str, duration: int) -> str:
    """Generate harmonic synth chord background track based on mood."""
    if mood == "festive":
        # Cheerful, bright major chord progression
        return (
            f"aevalsrc="
            f"sin(329.63*2*PI*t)*0.03*between(mod(t*2\\,4)\\,0\\,1)+"
            f"sin(392.00*2*PI*t)*0.03*between(mod(t*2\\,4)\\,1\\,2)+"
            f"sin(493.88*2*PI*t)*0.03*between(mod(t*2\\,4)\\,2\\,3)+"
            f"sin(587.33*2*PI*t)*0.04*between(mod(t*2\\,4)\\,3\\,4)"
            f":s=44100:d={duration},"
            f"afade=t=in:ss=0:d=0.5,afade=t=out:st={duration - 1}:d=1"
        )
    elif mood == "corporate":
        # Clean modern rhythm
        return (
            f"aevalsrc="
            f"sin(261.63*2*PI*t)*0.03*between(mod(t*2\\,2)\\,0\\,1)+"
            f"sin(392.00*2*PI*t)*0.03*between(mod(t*2\\,2)\\,1\\,2)"
            f":s=44100:d={duration},"
            f"afade=t=in:ss=0:d=0.5,afade=t=out:st={duration - 1}:d=1"
        )
    elif mood == "ambient":
        # Calming smooth tone
        return (
            f"aevalsrc="
            f"sin(220*2*PI*t)*0.035+sin(440*2*PI*t)*0.02"
            f":s=44100:d={duration},"
            f"afade=t=in:ss=0:d=1,afade=t=out:st={duration - 1.5}:d=1.5"
        )
    else:  # upbeat default
        return (
            f"aevalsrc="
            f"sin(261.63*2*PI*t)*0.04*between(mod(t*4\\,4)\\,0\\,1)+"
            f"sin(329.63*2*PI*t)*0.03*between(mod(t*4\\,4)\\,1\\,2)+"
            f"sin(392.00*2*PI*t)*0.03*between(mod(t*4\\,4)\\,2\\,3)+"
            f"sin(523.25*2*PI*t)*0.04*between(mod(t*4\\,4)\\,3\\,4)"
            f":s=44100:d={duration},"
            f"afade=t=in:ss=0:d=0.5,afade=t=out:st={duration - 1}:d=1"
        )


def generate_marketing_video(
    db: Session,
    user: User,
    advertiser: VAdsAdvertiser,
    data: dict[str, Any],
    storage: VideoStorage,
) -> VAdsMediaUpload:
    """Compile marketing video ad with FFmpeg and register as validated upload."""
    title = (data.get("title") or "").strip() or "Special Business Offer"
    headline = (data.get("headline") or "").strip() or title
    subtitle = (data.get("subtitle") or "").strip()
    offer_badge = (data.get("offer_badge") or "").strip() or "SPECIAL DEAL"
    highlights = [h.strip() for h in data.get("highlights", []) if h.strip()][:3]
    cta = (data.get("call_to_action") or "").strip() or "Call Now"
    contact = (data.get("contact_info") or "").strip()
    template_id = data.get("template_id") or "offer-sale"
    mood = data.get("music_mood") or "upbeat"
    raw_images: list[str] = data.get("images") or []

    # Choose template theme colors
    theme_colors = {
        "offer-sale": {"badge_bg": "#E11D48", "cta_bg": "#BE123C", "card_bg": "#1F1224"},
        "service-showcase": {"badge_bg": "#2563EB", "cta_bg": "#1D4ED8", "card_bg": "#111827"},
        "brand-launch": {"badge_bg": "#7C3AED", "cta_bg": "#6D28D9", "card_bg": "#1E132D"},
        "customer-review": {"badge_bg": "#059669", "cta_bg": "#047857", "card_bg": "#0F1F17"},
    }
    colors = theme_colors.get(template_id, theme_colors["offer-sale"])
    badge_bg = colors["badge_bg"]
    cta_bg = colors["cta_bg"]

    font_bold = DEJAVU_BOLD if Path(DEJAVU_BOLD).exists() else ""
    font_reg = DEJAVU_REG if Path(DEJAVU_REG).exists() else font_bold

    total_duration = 12  # Standard 12-second vertical ad reel

    with tempfile.TemporaryDirectory(prefix="vads-maker-") as tmpdir:
        # 1. Decode & prepare images
        image_files: list[str] = []
        for idx, img_str in enumerate(raw_images[:4]):
            try:
                # Strip data URI header if present
                if "," in img_str:
                    img_str = img_str.split(",", 1)[1]
                decoded = base64.b64decode(img_str)
                if len(decoded) > 100:
                    img_path = os.path.join(tmpdir, f"img_{idx}.png")
                    with open(img_path, "wb") as f:
                        f.write(decoded)
                    image_files.append(img_path)
            except Exception:
                continue

        # If no valid images uploaded, generate 2 template background slides
        if not image_files:
            for idx, color_hex in enumerate(["#2D1F50", "#1E293B"]):
                bg_path = os.path.join(tmpdir, f"bg_{idx}.png")
                subprocess.run([
                    "ffmpeg", "-y", "-f", "lavfi",
                    "-i", f"color=c={color_hex}:s=720x1280:d=1",
                    "-vframes", "1", bg_path
                ], check=True, capture_output=True)
                image_files.append(bg_path)

        num_images = len(image_files)
        slide_dur = total_duration / num_images

        # 2. Render individual slide video clips with Ken Burns zoompan
        slide_clips: list[str] = []
        for idx, img_p in enumerate(image_files):
            clip_out = os.path.join(tmpdir, f"clip_{idx}.mp4")
            # Alternate zoom directions for dynamic movement
            zoom_expr = "min(pzoom+0.0015,1.18)" if idx % 2 == 0 else "max(1.18-on*0.0015,1.0)"
            pan_x = "iw/2-(iw/zoom/2)" if idx % 2 == 0 else "0"
            pan_y = "ih/2-(ih/zoom/2)"

            cmd_clip = [
                "ffmpeg", "-y",
                "-loop", "1", "-t", str(slide_dur),
                "-i", img_p,
                "-vf", (
                    f"scale=720:1280:force_original_aspect_ratio=increase,"
                    f"crop=720:1280,"
                    f"zoompan=z='{zoom_expr}':d={int(slide_dur * 25)}:x='{pan_x}':y='{pan_y}':s=720x1280"
                ),
                "-c:v", "libx264", "-t", str(slide_dur), "-pix_fmt", "yuv420p",
                "-r", "25",
                clip_out
            ]
            subprocess.run(cmd_clip, check=True, capture_output=True)
            slide_clips.append(clip_out)

        # 3. Concatenate slide clips
        concat_list = os.path.join(tmpdir, "concat.txt")
        with open(concat_list, "w") as f:
            for c in slide_clips:
                f.write(f"file '{c}'\n")

        raw_slides_video = os.path.join(tmpdir, "raw_slides.mp4")
        subprocess.run([
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", concat_list, "-c", "copy", raw_slides_video
        ], check=True, capture_output=True)

        # 4. Build text & branding overlays
        filter_parts: list[str] = []

        # Dark gradient protection scrim for top and bottom readability
        filter_parts.append("drawbox=y=0:color=black@0.65:width=720:height=180:t=fill")
        filter_parts.append("drawbox=y=760:color=black@0.75:width=720:height=520:t=fill")

        # Top Bar: Advertiser Name & Badge
        adv_name = escape_ffmpeg_text(advertiser.name or "VISTRAH")
        badge_text = escape_ffmpeg_text(offer_badge.upper())
        if font_bold:
            # Eyebrow pill box
            filter_parts.append(
                f"drawbox=x=40:y=40:color={badge_bg}@0.95:width=360:height=52:t=fill"
            )
            filter_parts.append(
                f"drawtext=fontfile={font_bold}:text='{badge_text}':fontcolor=white:fontsize=22:x=60:y=55"
            )
            # Channel Name on top right
            filter_parts.append(
                f"drawtext=fontfile={font_bold}:text='{adv_name}':fontcolor=#F1F5F9:fontsize=22:x=w-text_w-45:y=55"
            )

        # Lower Third Content Card
        esc_headline = escape_ffmpeg_text(headline)
        esc_sub = escape_ffmpeg_text(subtitle or (highlights[0] if highlights else ""))
        esc_cta = escape_ffmpeg_text(f"{cta.upper()}  →")
        esc_contact = escape_ffmpeg_text(contact or f"@{advertiser.handle}")

        if font_bold:
            # Main Headline (large & prominent)
            filter_parts.append(
                f"drawtext=fontfile={font_bold}:text='{esc_headline}':fontcolor=white:fontsize=36:x=45:y=800:fix_bounds=1"
            )
            # Subtitle / highlights
            if esc_sub:
                filter_parts.append(
                    f"drawtext=fontfile={font_reg}:text='{esc_sub}':fontcolor=#CBD5E1:fontsize=24:x=45:y=860"
                )
            if len(highlights) > 1:
                h2 = escape_ffmpeg_text(highlights[1])
                filter_parts.append(
                    f"drawtext=fontfile={font_reg}:text='✓ {h2}':fontcolor=#A7F3D0:fontsize=22:x=45:y=900"
                )

            # CTA Button Bar
            filter_parts.append(
                f"drawbox=x=45:y=980:color={cta_bg}@0.95:width=630:height=80:t=fill"
            )
            filter_parts.append(
                f"drawtext=fontfile={font_bold}:text='{esc_cta}':fontcolor=white:fontsize=30:x=(w-text_w)/2:y=1006"
            )

            # Contact / Location info below CTA
            filter_parts.append(
                f"drawtext=fontfile={font_reg}:text='{esc_contact}':fontcolor=#E2E8F0:fontsize=22:x=(w-text_w)/2:y=1085"
            )

            # VISTRAH Watermark Branding
            filter_parts.append(
                f"drawtext=fontfile={font_bold}:text='VISTRAH':fontcolor=#94A3B8@0.7:fontsize=18:x=(w-text_w)/2:y=1220"
            )

        # Outro scene in final 3 seconds: Full-screen branded CTA card
        outro_start = max(1, total_duration - 3)
        filter_parts.append(
            f"drawbox=y=0:color=black@0.85:width=720:height=1280:t=fill:enable='gte(t,{outro_start})'"
        )
        if font_bold:
            filter_parts.append(
                f"drawtext=fontfile={font_bold}:text='{adv_name}':fontcolor=white:fontsize=44:x=(w-text_w)/2:y=420:enable='gte(t,{outro_start})'"
            )
            filter_parts.append(
                f"drawtext=fontfile={font_bold}:text='{badge_text}':fontcolor=#F59E0B:fontsize=28:x=(w-text_w)/2:y=490:enable='gte(t,{outro_start})'"
            )
            filter_parts.append(
                f"drawbox=x=90:y=600:color={cta_bg}:width=540:height=90:t=fill:enable='gte(t,{outro_start})'"
            )
            filter_parts.append(
                f"drawtext=fontfile={font_bold}:text='{esc_cta}':fontcolor=white:fontsize=32:x=(w-text_w)/2:y=630:enable='gte(t,{outro_start})'"
            )
            filter_parts.append(
                f"drawtext=fontfile={font_reg}:text='{esc_contact}':fontcolor=#CBD5E1:fontsize=24:x=(w-text_w)/2:y=730:enable='gte(t,{outro_start})'"
            )
            filter_parts.append(
                f"drawtext=fontfile={font_bold}:text='Available on VISTRAH':fontcolor=#94A3B8:fontsize=20:x=(w-text_w)/2:y=800:enable='gte(t,{outro_start})'"
            )

        video_filter = ",".join(filter_parts)
        audio_filter = get_music_filter(mood, total_duration)

        # 5. Compile final video with synchronized audio
        output_mp4 = os.path.join(tmpdir, "final_ad.mp4")
        final_cmd = [
            "ffmpeg", "-y",
            "-i", raw_slides_video,
            "-f", "lavfi", "-i", audio_filter,
            "-vf", video_filter,
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "128k",
            "-t", str(total_duration),
            "-movflags", "+faststart",
            output_mp4
        ]
        result = subprocess.run(final_cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise HTTPException(
                500, f"Video generation failed: {result.stderr[-300:]}"
            )

        # 6. Register as validated upload for seller's advertiser
        return register_validated_upload(
            db, user, advertiser.id, Path(output_mp4), storage
        )

