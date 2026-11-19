"""Add Google Place claim columns on providers plus marketing_audit_leads and website_requests tables."""
from alembic import op
import sqlalchemy as sa

revision = '029'
down_revision = '028'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    provider_cols = {col['name'] for col in inspector.get_columns('providers')}
    if 'google_place_id' not in provider_cols:
        op.add_column('providers', sa.Column('google_place_id', sa.String(160), nullable=True))
    if 'website_url' not in provider_cols:
        op.add_column('providers', sa.Column('website_url', sa.String(500), nullable=True))
    if 'instagram_url' not in provider_cols:
        op.add_column('providers', sa.Column('instagram_url', sa.String(500), nullable=True))
    if 'facebook_url' not in provider_cols:
        op.add_column('providers', sa.Column('facebook_url', sa.String(500), nullable=True))
    if 'source_place_snapshot' not in provider_cols:
        op.add_column('providers', sa.Column('source_place_snapshot', sa.JSON(), nullable=True))

    provider_indexes = {idx['name'] for idx in inspector.get_indexes('providers')}
    if 'ix_providers_google_place_id' not in provider_indexes:
        op.create_index('ix_providers_google_place_id', 'providers', ['google_place_id'])

    existing_tables = set(inspector.get_table_names())

    if 'marketing_audit_leads' not in existing_tables:
        op.create_table(
            'marketing_audit_leads',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('business_id', sa.String(180), nullable=False),
            sa.Column('google_place_id', sa.String(160), nullable=True),
            sa.Column(
                'provider_id',
                sa.Integer(),
                sa.ForeignKey('providers.id', ondelete='SET NULL'),
                nullable=True,
            ),
            sa.Column('business_name', sa.String(200), nullable=False),
            sa.Column('sector_slug', sa.String(100), nullable=False),
            sa.Column('service_type', sa.String(120), nullable=False, server_default=''),
            sa.Column('city', sa.String(150), nullable=False, server_default=''),
            sa.Column('phone', sa.String(30), nullable=False, server_default=''),
            sa.Column('baseline_score', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('projected_score', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('ticked_pillar_ids', sa.JSON(), nullable=False),
            sa.Column('one_time_total_inr', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('monthly_total_inr', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('gst_included', sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column('lead_status', sa.String(32), nullable=False, server_default='new'),
            sa.Column('notes', sa.Text(), nullable=False, server_default=''),
            sa.Column(
                'created_by_user_id',
                sa.Integer(),
                sa.ForeignKey('users.id', ondelete='SET NULL'),
                nullable=True,
            ),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.CheckConstraint(
                "lead_status IN ('new','audit_shared','follow_up','website_requested','closed')",
                name='ck_marketing_audit_leads_status',
            ),
            sa.CheckConstraint(
                'baseline_score >= 0 AND baseline_score <= 100',
                name='ck_marketing_audit_leads_baseline_range',
            ),
            sa.CheckConstraint(
                'projected_score >= 0 AND projected_score <= 100',
                name='ck_marketing_audit_leads_projected_range',
            ),
            sa.CheckConstraint(
                'one_time_total_inr >= 0 AND monthly_total_inr >= 0',
                name='ck_marketing_audit_leads_totals_nonneg',
            ),
        )
        op.create_index('ix_marketing_audit_leads_business_id', 'marketing_audit_leads', ['business_id'])
        op.create_index('ix_marketing_audit_leads_google_place_id', 'marketing_audit_leads', ['google_place_id'])
        op.create_index('ix_marketing_audit_leads_provider_id', 'marketing_audit_leads', ['provider_id'])
        op.create_index('ix_marketing_audit_leads_sector_slug', 'marketing_audit_leads', ['sector_slug'])
        op.create_index('ix_marketing_audit_leads_city', 'marketing_audit_leads', ['city'])
        op.create_index('ix_marketing_audit_leads_lead_status', 'marketing_audit_leads', ['lead_status'])
        op.create_index(
            'ix_marketing_audit_leads_created_by_user_id',
            'marketing_audit_leads',
            ['created_by_user_id'],
        )

    if 'website_requests' not in existing_tables:
        op.create_table(
            'website_requests',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('business_id', sa.String(180), nullable=False),
            sa.Column('business_name', sa.String(200), nullable=False),
            sa.Column('sector_slug', sa.String(100), nullable=False),
            sa.Column('pattern_id', sa.String(120), nullable=False),
            sa.Column('phone', sa.String(30), nullable=False, server_default=''),
            sa.Column('city', sa.String(150), nullable=False, server_default=''),
            sa.Column(
                'requested_by_user_id',
                sa.Integer(),
                sa.ForeignKey('users.id', ondelete='SET NULL'),
                nullable=True,
            ),
            sa.Column('status', sa.String(32), nullable=False, server_default='new'),
            sa.Column('notes', sa.Text(), nullable=False, server_default=''),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.CheckConstraint(
                "status IN ('new','in_review','quoted','in_progress','completed','cancelled')",
                name='ck_website_requests_status',
            ),
        )
        op.create_index('ix_website_requests_business_id', 'website_requests', ['business_id'])
        op.create_index('ix_website_requests_sector_slug', 'website_requests', ['sector_slug'])
        op.create_index(
            'ix_website_requests_requested_by_user_id',
            'website_requests',
            ['requested_by_user_id'],
        )
        op.create_index('ix_website_requests_status', 'website_requests', ['status'])
        op.create_index(
            'ix_website_requests_sector_status',
            'website_requests',
            ['sector_slug', 'status'],
        )


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if 'website_requests' in existing_tables:
        op.drop_table('website_requests')
    if 'marketing_audit_leads' in existing_tables:
        op.drop_table('marketing_audit_leads')

    provider_indexes = {idx['name'] for idx in inspector.get_indexes('providers')}
    if 'ix_providers_google_place_id' in provider_indexes:
        op.drop_index('ix_providers_google_place_id', table_name='providers')

    provider_cols = {col['name'] for col in inspector.get_columns('providers')}
    for col_name in (
        'source_place_snapshot',
        'facebook_url',
        'instagram_url',
        'website_url',
        'google_place_id',
    ):
        if col_name in provider_cols:
            op.drop_column('providers', col_name)
