"""Bind verified Google subjects to existing shared account identities."""
from alembic import op
import sqlalchemy as sa

revision = '022'
down_revision = '021'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('google_identities',
        sa.Column('subject', sa.String(255), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, unique=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False))

def downgrade():
    op.drop_table('google_identities')
