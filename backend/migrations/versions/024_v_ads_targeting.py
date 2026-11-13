"""Add optional review-safe geographic targeting; no legacy backfill."""
from alembic import op
import sqlalchemy as sa

revision = '024'
down_revision = '023'
branch_labels = None
depends_on = None

# Frozen schema limits; do not import mutable application policy into migrations.
MAX_RADIUS_KM = 20015.114442035923


def upgrade():
    op.create_index('uq_v_ads_video_advertiser', 'v_ads_videos', ['id', 'advertiser_id'], unique=True)
    op.create_table('v_ads_targeting',
        sa.Column('video_id', sa.String(36), primary_key=True),
        sa.Column('advertiser_id', sa.String(36), sa.ForeignKey('v_ads_advertisers.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['video_id', 'advertiser_id'],
                                ['v_ads_videos.id', 'v_ads_videos.advertiser_id'],
                                name='fk_v_ads_targeting_video_advertiser'))
    op.create_index('ix_v_ads_targeting_advertiser_id', 'v_ads_targeting', ['advertiser_id'])
    op.create_table('v_ads_targeting_revisions',
        sa.Column('video_id', sa.String(36), sa.ForeignKey('v_ads_targeting.video_id'), primary_key=True),
        sa.Column('revision', sa.Integer(), primary_key=True),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('targeting_radius_km', sa.Float(), nullable=False),
        sa.Column('status', sa.String(12), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reviewed_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.CheckConstraint('revision > 0', name='ck_v_ads_targeting_revision'),
        sa.CheckConstraint('latitude >= -90 AND latitude <= 90', name='ck_v_ads_targeting_latitude'),
        sa.CheckConstraint('longitude >= -180 AND longitude <= 180', name='ck_v_ads_targeting_longitude'),
        sa.CheckConstraint(f'targeting_radius_km > 0 AND targeting_radius_km <= {MAX_RADIUS_KM!r}', name='ck_v_ads_targeting_radius'),
        sa.CheckConstraint("status IN ('PENDING','APPROVED','REJECTED','SUPERSEDED')", name='ck_v_ads_targeting_status'),
        sa.CheckConstraint("(status = 'PENDING' AND reviewed_at IS NULL AND reviewed_by IS NULL) OR "
                           "(status <> 'PENDING' AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)", name='ck_v_ads_targeting_review'))
    for status in ('pending', 'approved'):
        predicate = sa.text(f"status = '{status.upper()}'")
        op.create_index(f'uq_v_ads_targeting_{status}', 'v_ads_targeting_revisions', ['video_id'],
                        unique=True, sqlite_where=predicate, postgresql_where=predicate)
    # Revision identity, submitted geography and submission time never change.
    guard = ('NEW.video_id <> OLD.video_id OR NEW.revision <> OLD.revision OR '
             'NEW.latitude <> OLD.latitude OR NEW.longitude <> OLD.longitude OR '
             'NEW.targeting_radius_km <> OLD.targeting_radius_km OR NEW.created_at <> OLD.created_at OR '
             "(OLD.status <> 'PENDING' AND (NEW.reviewed_at <> OLD.reviewed_at OR NEW.reviewed_by <> OLD.reviewed_by)) OR "
             "(OLD.status = 'PENDING' AND NEW.status = 'SUPERSEDED') OR "
             "(OLD.status = 'APPROVED' AND NEW.status NOT IN ('APPROVED','SUPERSEDED')) OR "
             "(OLD.status IN ('REJECTED','SUPERSEDED') AND NEW.status <> OLD.status)")
    if op.get_bind().dialect.name == 'sqlite':
        op.execute(f"CREATE TRIGGER v_ads_targeting_immutable BEFORE UPDATE ON v_ads_targeting_revisions "
                   f"WHEN {guard} BEGIN SELECT RAISE(ABORT, 'Targeting revision is immutable'); END")
        op.execute("CREATE TRIGGER v_ads_targeting_no_delete BEFORE DELETE ON v_ads_targeting_revisions "
                   "BEGIN SELECT RAISE(ABORT, 'Targeting history cannot be deleted'); END")
        op.execute("CREATE TRIGGER v_ads_targeting_pending_insert BEFORE INSERT ON v_ads_targeting_revisions "
                   "WHEN NEW.status <> 'PENDING' BEGIN SELECT RAISE(ABORT, 'Submit pending targeting first'); END")
    else:
        op.execute(f"CREATE FUNCTION guard_v_ads_targeting() RETURNS trigger LANGUAGE plpgsql AS $$ "
                   f"BEGIN IF {guard} THEN RAISE EXCEPTION 'Targeting revision is immutable'; END IF; RETURN NEW; END $$")
        op.execute('CREATE TRIGGER v_ads_targeting_immutable BEFORE UPDATE ON v_ads_targeting_revisions '
                   'FOR EACH ROW EXECUTE FUNCTION guard_v_ads_targeting()')
        op.execute("CREATE FUNCTION guard_v_ads_targeting_history() RETURNS trigger LANGUAGE plpgsql AS $$ "
                   "BEGIN IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Targeting history cannot be deleted'; "
                   "END IF; IF NEW.status <> 'PENDING' THEN RAISE EXCEPTION 'Submit pending targeting first'; "
                   "END IF; RETURN NEW; END $$")
        op.execute('CREATE TRIGGER v_ads_targeting_history BEFORE INSERT OR DELETE ON v_ads_targeting_revisions '
                   'FOR EACH ROW EXECUTE FUNCTION guard_v_ads_targeting_history()')


def downgrade():
    if op.get_bind().dialect.name == 'sqlite':
        op.execute('DROP TRIGGER v_ads_targeting_immutable')
        op.execute('DROP TRIGGER v_ads_targeting_no_delete')
        op.execute('DROP TRIGGER v_ads_targeting_pending_insert')
    else:
        op.execute('DROP TRIGGER v_ads_targeting_immutable ON v_ads_targeting_revisions')
        op.execute('DROP FUNCTION guard_v_ads_targeting()')
        op.execute('DROP TRIGGER v_ads_targeting_history ON v_ads_targeting_revisions')
        op.execute('DROP FUNCTION guard_v_ads_targeting_history()')
    op.drop_table('v_ads_targeting_revisions')
    op.drop_table('v_ads_targeting')
    op.drop_index('uq_v_ads_video_advertiser', table_name='v_ads_videos')
