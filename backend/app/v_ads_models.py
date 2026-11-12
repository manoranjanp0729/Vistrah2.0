"""V Ads models: advertisers, reels and engagement."""
from sqlalchemy import (
    String, Integer, Text, DateTime, ForeignKey,
    UniqueConstraint, CheckConstraint, Index
)
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base
from .models import now


class VAdsAdvertiser(Base):
    __tablename__ = "v_ads_advertisers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    owner_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(120))
    handle: Mapped[str] = mapped_column(String(80), unique=True)
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(12), default="PENDING")
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), default=now
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('PENDING','APPROVED','REJECTED','SUSPENDED')",
            name="ck_v_ads_advertiser_status"
        ),
    )


class VAdsVideo(Base):
    __tablename__ = "v_ads_videos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    media_upload_id: Mapped[str | None] = mapped_column(
        ForeignKey("v_ads_media_uploads.id"), nullable=True, unique=True
    )
    advertiser_id: Mapped[str] = mapped_column(
        ForeignKey("v_ads_advertisers.id"), index=True
    )
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    video_url: Mapped[str] = mapped_column(String(1024))
    status: Mapped[str] = mapped_column(String(12), default="PENDING")
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), default=now
    )
    published_at: Mapped[object | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    __table_args__ = (
        Index('uq_v_ads_video_advertiser', 'id', 'advertiser_id', unique=True),
        CheckConstraint(
            "status IN ('PENDING','APPROVED','REJECTED','REMOVED')",
            name="ck_v_ads_video_status"
        ),
    )


class VAdsLike(Base):
    __tablename__ = "v_ads_likes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    video_id: Mapped[str] = mapped_column(
        ForeignKey("v_ads_videos.id"), index=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), index=True
    )
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), default=now
    )

    __table_args__ = (
        UniqueConstraint("video_id", "user_id", name="uq_v_ads_like"),
    )


class VAdsComment(Base):
    __tablename__ = "v_ads_comments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    video_id: Mapped[str] = mapped_column(
        ForeignKey("v_ads_videos.id"), index=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), index=True
    )
    body: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(12), default="VISIBLE")
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), default=now
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('VISIBLE','HIDDEN','DELETED')",
            name="ck_v_ads_comment_status"
        ),
    )


class VAdsView(Base):
    __tablename__ = "v_ads_views"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    video_id: Mapped[str] = mapped_column(
        ForeignKey("v_ads_videos.id"), index=True
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), default=now
    )



class VAdsMediaUpload(Base):
    """A user's authorization to use one validated private media object."""

    __tablename__ = "v_ads_media_uploads"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True
    )
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )
    advertiser_id: Mapped[str] = mapped_column(
        ForeignKey("v_ads_advertisers.id"),
        nullable=False,
        index=True,
    )
    storage_key: Mapped[str] = mapped_column(
        String(68), nullable=False
    )
    sha256: Mapped[str] = mapped_column(
        String(64), nullable=False
    )
    size_bytes: Mapped[int] = mapped_column(
        Integer, nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(12), default="VALIDATED", nullable=False
    )
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), default=now
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('VALIDATED','REVOKED')",
            name="ck_v_ads_media_upload_status",
        ),
        CheckConstraint(
            "size_bytes > 0 AND size_bytes <= 104857600",
            name="ck_v_ads_media_upload_size",
        ),
    )
