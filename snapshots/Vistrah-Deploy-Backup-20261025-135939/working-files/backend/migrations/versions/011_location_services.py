"""Add location metadata to existing records. No coordinates or owners inferred."""
from alembic import op
import sqlalchemy as sa

revision = '011'
down_revision = '010'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('saved_location', sa.JSON(), nullable=True))
    op.add_column('providers', sa.Column('latitude', sa.Float(), sa.CheckConstraint('latitude BETWEEN -90 AND 90', name='ck_provider_latitude'), nullable=True))
    op.add_column('providers', sa.Column('longitude', sa.Float(), sa.CheckConstraint('(latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL AND longitude BETWEEN -180 AND 180)', name='ck_provider_coordinate_pair'), nullable=True))
    op.create_index('ix_providers_latitude', 'providers', ['latitude'])
    op.add_column('provider_services', sa.Column('coverage_radius_km', sa.Float(), sa.CheckConstraint('coverage_radius_km > 0 AND coverage_radius_km <= 500', name='ck_service_coverage'), nullable=True))
    op.add_column('service_requests', sa.Column('postal_code', sa.String(6), nullable=False, server_default=''))
    op.add_column('service_requests', sa.Column('service_address', sa.Text(), nullable=True))


def downgrade():
    # Removing the new metadata is explicit; owners/approvals/history stay intact.
    op.drop_column('service_requests', 'service_address')
    op.drop_column('service_requests', 'postal_code')
    op.drop_column('provider_services', 'coverage_radius_km')
    op.drop_index('ix_providers_latitude', table_name='providers')
    op.drop_column('providers', 'longitude')
    op.drop_column('providers', 'latitude')
    op.drop_column('users', 'saved_location')
