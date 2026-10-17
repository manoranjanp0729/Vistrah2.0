"""Seller catalogue request queue; approved requests are not automatically published."""
from alembic import op
import sqlalchemy as sa

revision = '012'
down_revision = '011'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('catalogue_requests',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('seller_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('level', sa.String(20), nullable=False),
        sa.Column('parent', sa.String(300), nullable=False, server_default=''),
        sa.Column('title', sa.String(150), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('business_name', sa.String(150), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='PENDING'),
        sa.Column('reviewer_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('review_note', sa.Text(), nullable=False, server_default=''),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("level IN ('category','subcategory','service')"),
        sa.CheckConstraint("status IN ('PENDING','APPROVED','REJECTED')"))
    op.create_index('ix_catalogue_requests_seller_id', 'catalogue_requests', ['seller_id'])

def downgrade():
    op.drop_index('ix_catalogue_requests_seller_id', table_name='catalogue_requests')
    op.drop_table('catalogue_requests')
