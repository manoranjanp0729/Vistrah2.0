"""Create pricing_sections and pricing_items tables and seed current V Ads & Studio pricing."""
from alembic import op
import sqlalchemy as sa

from app.pricing_seed import build_pricing_seed_data

revision = '026'
down_revision = '025'
branch_labels = None
depends_on = None


def upgrade():
    sections_table = op.create_table(
        'pricing_sections',
        sa.Column('id', sa.String(80), primary_key=True),
        sa.Column('tab_group', sa.String(40), nullable=False),
        sa.Column('step_label', sa.String(24), nullable=False, server_default=''),
        sa.Column('title', sa.String(240), nullable=False),
        sa.Column('subtitle', sa.Text(), nullable=False, server_default=''),
        sa.Column('fee_note', sa.String(320), nullable=False, server_default=''),
        sa.Column('promo_enabled', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('free_trial_days', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('promo_badge', sa.String(160), nullable=False, server_default=''),
        sa.Column('cta_label', sa.String(120), nullable=False, server_default=''),
        sa.Column('cta_href', sa.String(200), nullable=False, server_default=''),
        sa.Column('meta', sa.JSON(), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('revision', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('updated_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint('revision > 0', name='ck_pricing_sections_revision_pos'),
        sa.CheckConstraint('free_trial_days >= 0', name='ck_pricing_sections_trial_nonneg'),
    )
    op.create_index('ix_pricing_sections_tab_group', 'pricing_sections', ['tab_group'])

    items_table = op.create_table(
        'pricing_items',
        sa.Column('id', sa.String(80), primary_key=True),
        sa.Column('section_id', sa.String(80), sa.ForeignKey('pricing_sections.id'), nullable=False),
        sa.Column('item_type', sa.String(32), nullable=False),
        sa.Column('title', sa.String(240), nullable=False),
        sa.Column('subtitle', sa.String(240), nullable=False, server_default=''),
        sa.Column('description', sa.Text(), nullable=False, server_default=''),
        sa.Column('price_paise', sa.BigInteger(), nullable=True),
        sa.Column('monthly_price_paise', sa.BigInteger(), nullable=True),
        sa.Column('billing_interval', sa.String(32), nullable=False, server_default='one-time'),
        sa.Column('gst_label', sa.String(200), nullable=False, server_default='18% GST extra'),
        sa.Column('free_trial_enabled', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('free_trial_days', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('promo_badge', sa.String(120), nullable=False, server_default=''),
        sa.Column('deliverables', sa.JSON(), nullable=False),
        sa.Column('meta', sa.JSON(), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('revision', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('updated_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint('revision > 0', name='ck_pricing_items_revision_pos'),
        sa.CheckConstraint('free_trial_days >= 0', name='ck_pricing_items_trial_nonneg'),
    )
    op.create_index('ix_pricing_items_section_id', 'pricing_items', ['section_id'])
    op.create_index('ix_pricing_items_item_type', 'pricing_items', ['item_type'])

    sections, items = build_pricing_seed_data()
    op.bulk_insert(sections_table, sections)
    op.bulk_insert(items_table, items)


def downgrade():
    op.drop_index('ix_pricing_items_item_type', table_name='pricing_items')
    op.drop_index('ix_pricing_items_section_id', table_name='pricing_items')
    op.drop_table('pricing_items')
    op.drop_index('ix_pricing_sections_tab_group', table_name='pricing_sections')
    op.drop_table('pricing_sections')
