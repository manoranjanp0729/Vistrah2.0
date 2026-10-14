"""Optional canonical taxonomy classification for commerce listings."""
from alembic import op
import sqlalchemy as sa

revision = '016'
down_revision = '015'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('commerce_listings') as batch:
        batch.add_column(sa.Column('taxonomy_category_slug', sa.String(100), nullable=True))
        batch.add_column(sa.Column('taxonomy_subcategory_slug', sa.String(100), nullable=True))
        batch.add_column(sa.Column('taxonomy_listing_type_slug', sa.String(100), nullable=True))
        batch.create_check_constraint(
            'ck_commerce_taxonomy_complete',
            '(taxonomy_category_slug IS NULL AND taxonomy_subcategory_slug IS NULL AND taxonomy_listing_type_slug IS NULL) OR '
            '(taxonomy_category_slug IS NOT NULL AND taxonomy_subcategory_slug IS NOT NULL AND taxonomy_listing_type_slug IS NOT NULL)',
        )


def downgrade():
    db = op.get_bind()
    classified = db.execute(sa.text(
        'SELECT count(*) FROM commerce_listings WHERE taxonomy_category_slug IS NOT NULL '
        'OR taxonomy_subcategory_slug IS NOT NULL OR taxonomy_listing_type_slug IS NOT NULL'
    )).scalar()
    if classified:
        raise RuntimeError('Cannot downgrade taxonomy fields with classified listings')
    with op.batch_alter_table('commerce_listings') as batch:
        batch.drop_constraint('ck_commerce_taxonomy_complete', type_='check')
        batch.drop_column('taxonomy_listing_type_slug')
        batch.drop_column('taxonomy_subcategory_slug')
        batch.drop_column('taxonomy_category_slug')
