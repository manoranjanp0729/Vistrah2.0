"""Link reviewed videos to owned media; preserve legacy video records."""
from alembic import op
import sqlalchemy as sa

revision = "020"
down_revision = "019"
branch_labels = None
depends_on = None


def upgrade():
    if op.get_bind().dialect.name == "sqlite":
        # Avoid a batch table rebuild: existing engagement rows reference videos.
        op.execute("ALTER TABLE v_ads_videos ADD COLUMN media_upload_id VARCHAR(36) "
                   "REFERENCES v_ads_media_uploads(id)")
    else:
        op.add_column("v_ads_videos", sa.Column("media_upload_id", sa.String(36),
            sa.ForeignKey("v_ads_media_uploads.id", name="fk_v_ads_video_media"), nullable=True))
    op.create_index("uq_v_ads_video_media", "v_ads_videos", ["media_upload_id"], unique=True)


def downgrade():
    op.drop_index("uq_v_ads_video_media", table_name="v_ads_videos")
    op.drop_column("v_ads_videos", "media_upload_id")
