"""Additive shared-identity capability and explicit ownership; no legacy backfill."""
from alembic import op
import sqlalchemy as sa

revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('users', sa.Column('seller_enabled', sa.Boolean(), nullable=False, server_default=sa.false()))
    if op.get_bind().dialect.name == 'sqlite':
        # Avoid rebuilding a referenced providers table with existing immutable evidence/grants.
        op.execute('ALTER TABLE providers ADD COLUMN owner_user_id INTEGER REFERENCES users(id)')
    else:
        op.add_column('providers', sa.Column('owner_user_id', sa.Integer(), nullable=True))
        op.create_foreign_key('fk_provider_owner', 'providers', 'users', ['owner_user_id'], ['id'])
    op.create_index('ix_providers_owner_user_id', 'providers', ['owner_user_id'])
    op.create_table('provider_ownership_claims',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('provider_id', sa.Integer(), sa.ForeignKey('providers.id'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('statement', sa.Text(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('reviewer_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('review_note', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('provider_id', 'user_id'),
        sa.CheckConstraint("status IN ('PENDING','REJECTED')"))

def downgrade():
    op.drop_table('provider_ownership_claims')
    op.drop_index('ix_providers_owner_user_id', table_name='providers')
    if op.get_bind().dialect.name != 'sqlite':
        op.drop_constraint('fk_provider_owner', 'providers', type_='foreignkey')
    op.drop_column('providers', 'owner_user_id')
    op.drop_column('users', 'seller_enabled')
