"""Reviewed seller-priced listings; no checkout, stock reservation or payment."""
from alembic import op
import sqlalchemy as sa
revision='014'
down_revision='013'
branch_labels=None
depends_on=None


def upgrade():
    op.create_table('commerce_listings',
        sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('provider_id',sa.Integer(),sa.ForeignKey('providers.id'),nullable=False),
        sa.Column('seller_id',sa.Integer(),sa.ForeignKey('users.id'),nullable=False),
        sa.Column('kind',sa.String(20),nullable=False),
        sa.Column('service_id',sa.Integer(),sa.ForeignKey('services.id'),nullable=True),
        sa.Column('title',sa.String(150),nullable=False),
        sa.Column('description',sa.Text(),nullable=False),
        sa.Column('unit_price_paise',sa.Integer(),nullable=False),
        sa.Column('currency',sa.String(3),nullable=False),
        sa.Column('available',sa.Boolean(),nullable=False),
        sa.Column('status',sa.String(20),nullable=False),
        sa.Column('revision',sa.Integer(),nullable=False),
        sa.Column('reviewer_id',sa.Integer(),sa.ForeignKey('users.id'),nullable=True),
        sa.Column('review_note',sa.Text(),nullable=False),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('published_at',sa.DateTime(timezone=True),nullable=True),
        sa.CheckConstraint("kind IN ('PRODUCT','SERVICE_PACKAGE')",name='ck_commerce_kind'),
        sa.CheckConstraint("status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','ARCHIVED')",name='ck_commerce_status'),
        sa.CheckConstraint("currency = 'INR'",name='ck_commerce_currency'),
        sa.CheckConstraint('unit_price_paise > 0 AND unit_price_paise <= 1000000000',name='ck_commerce_price'),
        sa.CheckConstraint('revision > 0',name='ck_commerce_revision'),
        sa.CheckConstraint("(kind = 'PRODUCT' AND service_id IS NULL) OR (kind = 'SERVICE_PACKAGE' AND service_id IS NOT NULL)",name='ck_commerce_service_kind'))
    for field in ('provider_id','seller_id','status'):
        op.create_index('ix_commerce_listings_'+field,'commerce_listings',[field])


def downgrade():
    if op.get_bind().execute(sa.text('SELECT count(*) FROM commerce_listings')).scalar():
        raise RuntimeError('Cannot downgrade commerce listings with seller data')
    op.drop_table('commerce_listings')
