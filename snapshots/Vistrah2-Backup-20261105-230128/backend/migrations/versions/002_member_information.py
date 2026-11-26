"""Persist member service information separately from the public catalogue."""
from alembic import op
import sqlalchemy as sa

revision = '002'
down_revision = '001'

def upgrade():
    op.create_table('service_information', sa.Column('service_id',sa.Integer(),sa.ForeignKey('services.id',ondelete='CASCADE'),primary_key=True),sa.Column('notes',sa.JSON(),nullable=False))

def downgrade():
    op.drop_table('service_information')
