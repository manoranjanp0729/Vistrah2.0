"""Add DPDP Act 2023 consent timestamps and account anonymization metadata."""
from alembic import op
import sqlalchemy as sa

revision = '025'
down_revision = '024'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('privacy_policy_version', sa.String(32), nullable=True))
    op.add_column('users', sa.Column('privacy_consented_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        'users',
        sa.Column('marketing_consent', sa.Boolean(), nullable=False, server_default=sa.text('false')),
    )
    op.add_column('users', sa.Column('marketing_consented_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('seller_terms_version', sa.String(32), nullable=True))
    op.add_column('users', sa.Column('seller_consented_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column('users', 'deleted_at')
    op.drop_column('users', 'seller_consented_at')
    op.drop_column('users', 'seller_terms_version')
    op.drop_column('users', 'marketing_consented_at')
    op.drop_column('users', 'marketing_consent')
    op.drop_column('users', 'privacy_consented_at')
    op.drop_column('users', 'privacy_policy_version')
