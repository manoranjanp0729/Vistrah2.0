"""Standalone marketing price approvals and customer quotations; no membership changes."""
from alembic import op
import sqlalchemy as sa
revision='023'
down_revision='022'
branch_labels=None
depends_on=None

def upgrade():
    op.create_table('marketing_price_overrides',sa.Column('service_id',sa.String(80),primary_key=True),sa.Column('revision',sa.Integer(),nullable=False),sa.Column('draft',sa.JSON(),nullable=False),sa.Column('published',sa.JSON(),nullable=True),sa.Column('updated_by',sa.Integer(),sa.ForeignKey('users.id'),nullable=False),sa.CheckConstraint('revision > 0'))
    op.create_table('marketing_pricing_quotes',sa.Column('id',sa.String(36),primary_key=True),sa.Column('user_id',sa.Integer(),sa.ForeignKey('users.id'),nullable=False),sa.Column('service_id',sa.String(80),nullable=False),sa.Column('service_name',sa.String(200),nullable=False),sa.Column('package_id',sa.String(80),nullable=True),sa.Column('idempotency_key',sa.String(80),nullable=False),sa.Column('fingerprint',sa.String(64),nullable=False),sa.Column('details',sa.JSON(),nullable=False),sa.Column('estimate_paise',sa.BigInteger(),nullable=True),sa.Column('pricing_state',sa.String(20),nullable=False),sa.Column('status',sa.String(20),nullable=False),sa.Column('revision',sa.Integer(),nullable=False),sa.Column('customer_note',sa.Text(),nullable=False),sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),sa.UniqueConstraint('user_id','idempotency_key'),sa.CheckConstraint('revision > 0'),sa.CheckConstraint("status IN ('SUBMITTED','REVIEWING','QUOTED','CLOSED','CANCELLED')"))
    op.create_index('ix_marketing_pricing_quotes_user_id','marketing_pricing_quotes',['user_id'])

def downgrade():
    op.drop_index('ix_marketing_pricing_quotes_user_id',table_name='marketing_pricing_quotes')
    op.drop_table('marketing_pricing_quotes')
    op.drop_table('marketing_price_overrides')
