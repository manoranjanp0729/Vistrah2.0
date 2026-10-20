"""Add V Ads advertisers, reels and engagement.

Revision ID: 019
Revises: 018
"""
from alembic import op
import sqlalchemy as sa

revision = "019"
down_revision = "018"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "v_ads_advertisers",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("handle", sa.String(80), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", sa.String(12), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "status IN ('PENDING','APPROVED','REJECTED','SUSPENDED')",
            name="ck_v_ads_advertiser_status"
        ),
    )
    op.create_index("ix_v_ads_advertisers_owner_id", "v_ads_advertisers", ["owner_id"])

    op.create_table(
        "v_ads_videos",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("advertiser_id", sa.String(36), sa.ForeignKey("v_ads_advertisers.id"), nullable=False),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("video_url", sa.String(1024), nullable=False),
        sa.Column("status", sa.String(12), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('PENDING','APPROVED','REJECTED','REMOVED')",
            name="ck_v_ads_video_status"
        ),
    )
    op.create_index("ix_v_ads_videos_advertiser_id", "v_ads_videos", ["advertiser_id"])

    op.create_table(
        "v_ads_likes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("video_id", sa.String(36), sa.ForeignKey("v_ads_videos.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("video_id", "user_id", name="uq_v_ads_like"),
    )
    op.create_index("ix_v_ads_likes_video_id", "v_ads_likes", ["video_id"])
    op.create_index("ix_v_ads_likes_user_id", "v_ads_likes", ["user_id"])

    op.create_table(
        "v_ads_comments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("video_id", sa.String(36), sa.ForeignKey("v_ads_videos.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", sa.String(12), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "status IN ('VISIBLE','HIDDEN','DELETED')",
            name="ck_v_ads_comment_status"
        ),
    )
    op.create_index("ix_v_ads_comments_video_id", "v_ads_comments", ["video_id"])
    op.create_index("ix_v_ads_comments_user_id", "v_ads_comments", ["user_id"])

    op.create_table(
        "v_ads_views",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("video_id", sa.String(36), sa.ForeignKey("v_ads_videos.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_v_ads_views_video_id", "v_ads_views", ["video_id"])



    op.create_table(
        "v_ads_media_uploads",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("advertiser_id", sa.String(36), sa.ForeignKey("v_ads_advertisers.id"), nullable=False),
        sa.Column("storage_key", sa.String(68), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(12), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "status IN ('VALIDATED','REVOKED')",
            name="ck_v_ads_media_upload_status",
        ),
        sa.CheckConstraint(
            "size_bytes > 0 AND size_bytes <= 104857600",
            name="ck_v_ads_media_upload_size",
        ),
    )
    op.create_index(
        "ix_v_ads_media_uploads_owner_id",
        "v_ads_media_uploads",
        ["owner_id"],
    )
    op.create_index(
        "ix_v_ads_media_uploads_advertiser_id",
        "v_ads_media_uploads",
        ["advertiser_id"],
    )

def downgrade():
    # Avoid silently deleting published content and user engagement.
    raise RuntimeError(
        "V Ads rollback requires an explicitly reviewed data preservation plan."
    )


