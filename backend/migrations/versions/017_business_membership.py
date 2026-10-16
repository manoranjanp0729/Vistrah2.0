"""Additive business membership ledger. No existing subscriptions or balances rewritten.

Historical customer memberships stay in memberships/payments; no inferred business
credits are backfilled. Prior approved jobs remain published without retroactive
charges. New job approvals consume one explicitly issued business credit.
"""
from alembic import op
import sqlalchemy as sa
revision='017'
down_revision='016'
branch_labels=None
depends_on=None


def upgrade():
    op.create_table('business_subscriptions',sa.Column('id',sa.String(36),primary_key=True),sa.Column('user_id',sa.Integer(),sa.ForeignKey('users.id'),nullable=False,unique=True),sa.Column('non_renewing',sa.Boolean(),nullable=False),sa.Column('created_at',sa.DateTime(timezone=True),nullable=False))
    op.create_table('business_membership_cycles',sa.Column('id',sa.String(36),primary_key=True),sa.Column('subscription_id',sa.String(36),sa.ForeignKey('business_subscriptions.id'),nullable=False),sa.Column('payment_id',sa.String(64),sa.ForeignKey('payments.id'),nullable=False,unique=True),sa.Column('plan_key',sa.String(10),nullable=False),sa.Column('billing_period',sa.String(10),nullable=False),sa.Column('state',sa.String(12),nullable=False),sa.Column('allowances',sa.JSON(),nullable=False),sa.Column('starts_at',sa.DateTime(timezone=True)),sa.Column('ends_at',sa.DateTime(timezone=True)),sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),sa.CheckConstraint("state IN ('PENDING','ACTIVE','FAILED','REFUNDED')"),sa.CheckConstraint("billing_period IN ('MONTHLY','ANNUAL')"),sa.CheckConstraint("plan_key IN ('BASIC','PLUS','PREMIUM')"))
    op.create_index('ix_business_membership_cycles_subscription_id','business_membership_cycles',['subscription_id'])
    op.create_table('business_allowances',sa.Column('id',sa.String(36),primary_key=True),sa.Column('user_id',sa.Integer(),sa.ForeignKey('users.id'),nullable=False),sa.Column('cycle_id',sa.String(36),sa.ForeignKey('business_membership_cycles.id')),sa.Column('kind',sa.String(30),nullable=False),sa.Column('allowance',sa.Integer(),nullable=False),sa.Column('used',sa.Integer(),nullable=False),sa.Column('starts_at',sa.DateTime(timezone=True),nullable=False),sa.Column('expires_at',sa.DateTime(timezone=True),nullable=False),sa.Column('revoked',sa.Boolean(),nullable=False),sa.Column('expiry_recorded',sa.Boolean(),nullable=False),sa.UniqueConstraint('cycle_id','kind'),sa.CheckConstraint('allowance > 0 AND used >= 0 AND used <= allowance'))
    op.create_index('ix_business_allowances_user_id','business_allowances',['user_id']);op.create_index('ix_business_allowances_expires_at','business_allowances',['expires_at'])
    op.create_table('business_benefit_operations',sa.Column('id',sa.String(36),primary_key=True),sa.Column('user_id',sa.Integer(),sa.ForeignKey('users.id'),nullable=False),sa.Column('key',sa.String(120),nullable=False),sa.Column('kind',sa.String(30),nullable=False),sa.Column('quantity',sa.Integer(),nullable=False),sa.Column('subject',sa.Text(),nullable=False),sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),sa.UniqueConstraint('user_id','key'),sa.CheckConstraint('quantity > 0'))
    op.create_index('ix_business_benefit_operations_user_id','business_benefit_operations',['user_id'])
    op.create_table('business_benefit_entries',sa.Column('id',sa.String(36),primary_key=True),sa.Column('batch_id',sa.String(36),sa.ForeignKey('business_allowances.id'),nullable=False),sa.Column('operation_id',sa.String(36),sa.ForeignKey('business_benefit_operations.id')),sa.Column('action',sa.String(20),nullable=False),sa.Column('quantity',sa.Integer(),nullable=False),sa.Column('reason',sa.Text(),nullable=False),sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),sa.UniqueConstraint('operation_id','batch_id'),sa.CheckConstraint('quantity >= 0'))
    op.create_index('ix_business_benefit_entries_batch_id','business_benefit_entries',['batch_id'])
    op.create_table('business_marketing_requests',sa.Column('id',sa.String(36),primary_key=True),sa.Column('user_id',sa.Integer(),sa.ForeignKey('users.id'),nullable=False),sa.Column('operation_id',sa.String(36),sa.ForeignKey('business_benefit_operations.id'),nullable=False,unique=True),sa.Column('brief',sa.Text(),nullable=False),sa.Column('duration_days',sa.Integer()),sa.Column('duration_seconds',sa.Integer()),sa.Column('status',sa.String(20),nullable=False),sa.Column('review_note',sa.Text(),nullable=False),sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),sa.CheckConstraint("status IN ('REQUESTED','IN_PROGRESS','COMPLETED','CANCELLED')"))
    op.create_index('ix_business_marketing_requests_user_id','business_marketing_requests',['user_id'])


def downgrade():
    connection=op.get_bind()
    if connection.scalar(sa.text('SELECT count(*) FROM business_subscriptions')) or connection.scalar(sa.text('SELECT count(*) FROM business_allowances')):
        raise RuntimeError('Refuse to remove business membership financial or benefit history')
    for name in ['business_marketing_requests','business_benefit_entries','business_benefit_operations','business_allowances','business_membership_cycles','business_subscriptions']:
        op.drop_table(name)
