"""Reviewed seller proposals for catalogue additions."""
from alembic import op
import sqlalchemy as sa

revision='018'
down_revision='017'
branch_labels=None
depends_on=None


def upgrade():
    op.create_table(
        'provider_catalogue_requests',
        sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('user_id',sa.Integer(),sa.ForeignKey('users.id'),nullable=False),
        sa.Column('kind',sa.String(12),nullable=False),
        sa.Column('category_id',sa.Integer(),sa.ForeignKey('categories.id'),nullable=True),
        sa.Column('subcategory_id',sa.Integer(),sa.ForeignKey('subcategories.id'),nullable=True),
        sa.Column('title',sa.String(150),nullable=False),
        sa.Column('description',sa.Text(),nullable=False),
        sa.Column('status',sa.String(12),nullable=False),
        sa.Column('review_note',sa.Text(),nullable=False),
        sa.Column('reviewer_id',sa.Integer(),sa.ForeignKey('users.id'),nullable=True),
        sa.Column('catalogue_id',sa.Integer(),nullable=True),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('reviewed_at',sa.DateTime(timezone=True),nullable=True),
        sa.CheckConstraint("kind IN ('CATEGORY','SUBCATEGORY','SERVICE')",name='ck_provider_catalogue_request_kind'),
        sa.CheckConstraint("status IN ('PENDING','APPROVED','REJECTED')",name='ck_provider_catalogue_request_status'),
        sa.CheckConstraint("(kind = 'CATEGORY' AND category_id IS NULL AND subcategory_id IS NULL) OR (kind = 'SUBCATEGORY' AND category_id IS NOT NULL AND subcategory_id IS NULL) OR (kind = 'SERVICE' AND category_id IS NOT NULL)",name='ck_provider_catalogue_request_parent'),
    )
    op.create_index('ix_provider_catalogue_requests_user_id','provider_catalogue_requests',['user_id'])
    op.create_index('ix_provider_catalogue_requests_status','provider_catalogue_requests',['status'])


def downgrade():
    connection=op.get_bind()
    if connection.scalar(sa.text('SELECT count(*) FROM provider_catalogue_requests')):
        raise RuntimeError('Cannot remove seller catalogue request decisions or feedback')
    op.drop_index('ix_provider_catalogue_requests_status',table_name='provider_catalogue_requests')
    op.drop_index('ix_provider_catalogue_requests_user_id',table_name='provider_catalogue_requests')
    op.drop_table('provider_catalogue_requests')
