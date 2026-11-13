"""Reviewed stock/fulfilment terms and isolated unpaid commerce order requests."""
import json
from alembic import op
import sqlalchemy as sa
revision='015'
down_revision='014'
branch_labels=None
depends_on=None


def upgrade():
    with op.batch_alter_table('commerce_listings') as batch:
        batch.add_column(sa.Column('fulfilment_operator',sa.String(10),nullable=False,server_default='SELLER'))
        batch.add_column(sa.Column('stock_quantity',sa.Integer(),nullable=True))
        batch.add_column(sa.Column('allocated_quantity',sa.Integer(),nullable=False,server_default='0'))
        batch.add_column(sa.Column('fulfilment_modes',sa.JSON(),nullable=False,server_default='[]'))
        batch.add_column(sa.Column('delivery_fee_paise',sa.Integer(),nullable=True))
        batch.add_column(sa.Column('cancellation_rule',sa.String(30),nullable=True))
        batch.add_column(sa.Column('submitted_by',sa.Integer(),nullable=True))
        batch.create_foreign_key('fk_commerce_submitted_by','users',['submitted_by'],['id'])
        batch.create_check_constraint('ck_commerce_operator',"fulfilment_operator IN ('SELLER','VISTRAH') AND (fulfilment_operator = 'SELLER' OR kind = 'SERVICE_PACKAGE')")
        batch.create_check_constraint('ck_commerce_stock','allocated_quantity >= 0 AND ((stock_quantity IS NULL AND allocated_quantity = 0) OR (stock_quantity >= allocated_quantity AND stock_quantity <= 1000000))')
        batch.create_check_constraint('ck_commerce_delivery_fee','delivery_fee_paise IS NULL OR (delivery_fee_paise >= 0 AND delivery_fee_paise <= 1000000000)')
        batch.create_check_constraint('ck_commerce_cancellation',"cancellation_rule IS NULL OR cancellation_rule IN ('BEFORE_DISPATCH','BEFORE_BUILD','BEFORE_SERVICE_START')")
    # Explicit declarations remain independent of future ORM definitions.
    op.create_table('commerce_cart_lines',
        sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('customer_id',sa.Integer(),sa.ForeignKey('users.id'),nullable=False),
        sa.Column('listing_id',sa.String(36),sa.ForeignKey('commerce_listings.id'),nullable=False),
        sa.Column('quantity',sa.Integer(),nullable=False),sa.Column('revision',sa.Integer(),nullable=False),
        sa.UniqueConstraint('customer_id','listing_id',name='uq_commerce_cart_listing'),
        sa.CheckConstraint('quantity >= 1 AND quantity <= 999',name='ck_commerce_cart_quantity'),
        sa.CheckConstraint('revision > 0',name='ck_commerce_cart_revision'))
    op.create_index('ix_commerce_cart_lines_customer_id','commerce_cart_lines',['customer_id'])
    op.create_table('commerce_orders',
        sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('customer_id',sa.Integer(),sa.ForeignKey('users.id'),nullable=False),
        sa.Column('listing_id',sa.String(36),sa.ForeignKey('commerce_listings.id'),nullable=False),
        sa.Column('provider_id',sa.Integer(),sa.ForeignKey('providers.id'),nullable=False),
        sa.Column('seller_id',sa.Integer(),sa.ForeignKey('users.id'),nullable=False),
        sa.Column('fulfilment_operator',sa.String(10),nullable=False),sa.Column('kind',sa.String(20),nullable=False),
        sa.Column('service_id',sa.Integer(),sa.ForeignKey('services.id'),nullable=True),
        sa.Column('title',sa.String(150),nullable=False),sa.Column('business',sa.String(150),nullable=False),
        sa.Column('listing_revision',sa.Integer(),nullable=False),sa.Column('unit_price_paise',sa.Integer(),nullable=False),
        sa.Column('quantity',sa.Integer(),nullable=False),sa.Column('fulfilment_method',sa.String(10),nullable=False),
        sa.Column('delivery_fee_paise',sa.Integer(),nullable=False),sa.Column('quoted_total_paise',sa.BigInteger(),nullable=False),
        sa.Column('cancellation_rule',sa.String(30),nullable=False),sa.Column('phone',sa.String(20),nullable=False),
        sa.Column('delivery_address',sa.Text(),nullable=True),sa.Column('status',sa.String(20),nullable=False),
        sa.Column('revision',sa.Integer(),nullable=False),sa.Column('stock_allocated',sa.Boolean(),nullable=False),
        sa.Column('mode',sa.String(10),nullable=False),sa.Column('idempotency_key',sa.String(80),nullable=False),
        sa.Column('request_hash',sa.String(64),nullable=False),sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False),
        sa.UniqueConstraint('customer_id','idempotency_key',name='uq_commerce_order_idempotency'),
        sa.CheckConstraint("status IN ('REQUESTED','CONFIRMED','BUILDING','DISPATCHED','IN_PROGRESS','COMPLETED','CANCELLED','REJECTED')",name='ck_commerce_order_status'),
        sa.CheckConstraint("mode = 'TEST'",name='ck_commerce_order_mode'),
        sa.CheckConstraint('quantity >= 1 AND quantity <= 999 AND revision > 0 AND listing_revision > 0',name='ck_commerce_order_quantity'),
        sa.CheckConstraint('unit_price_paise > 0 AND unit_price_paise <= 1000000000 AND delivery_fee_paise >= 0 AND delivery_fee_paise <= 1000000000 AND quoted_total_paise = unit_price_paise * CAST(quantity AS BIGINT) + delivery_fee_paise',name='ck_commerce_order_price'),
        sa.CheckConstraint("(kind = 'PRODUCT' AND fulfilment_operator = 'SELLER' AND service_id IS NULL AND fulfilment_method IN ('PICKUP','DELIVERY') AND cancellation_rule IN ('BEFORE_DISPATCH','BEFORE_BUILD')) OR (kind = 'SERVICE_PACKAGE' AND service_id IS NOT NULL AND fulfilment_operator IN ('SELLER','VISTRAH') AND fulfilment_method = 'SERVICE' AND cancellation_rule = 'BEFORE_SERVICE_START')",name='ck_commerce_order_kind'),
        sa.CheckConstraint("(fulfilment_method = 'DELIVERY' AND delivery_address IS NOT NULL) OR (fulfilment_method != 'DELIVERY' AND delivery_address IS NULL AND delivery_fee_paise = 0)",name='ck_commerce_order_delivery'))
    for field in ('customer_id','provider_id','status'):
        op.create_index('ix_commerce_orders_'+field,'commerce_orders',[field])


def downgrade():
    db=op.get_bind()
    modes=db.execute(sa.text('SELECT fulfilment_modes FROM commerce_listings')).scalars()
    configured_modes=any((json.loads(value) if isinstance(value,str) else value) for value in modes)
    if configured_modes or db.execute(sa.text('SELECT count(*) FROM commerce_orders')).scalar() or db.execute(sa.text('SELECT count(*) FROM commerce_cart_lines')).scalar() or db.execute(sa.text("SELECT count(*) FROM commerce_listings WHERE fulfilment_operator != 'SELLER' OR stock_quantity IS NOT NULL OR allocated_quantity != 0 OR cancellation_rule IS NOT NULL OR delivery_fee_paise IS NOT NULL OR submitted_by IS NOT NULL")).scalar():
        raise RuntimeError('Cannot downgrade commerce order, cart or reviewed terms data')
    op.drop_table('commerce_orders');op.drop_table('commerce_cart_lines')
    with op.batch_alter_table('commerce_listings') as batch:
        for name in ('ck_commerce_operator','ck_commerce_stock','ck_commerce_delivery_fee','ck_commerce_cancellation'):batch.drop_constraint(name,type_='check')
        batch.drop_constraint('fk_commerce_submitted_by',type_='foreignkey')
        for field in ('fulfilment_operator','stock_quantity','allocated_quantity','fulfilment_modes','delivery_fee_paise','cancellation_rule','submitted_by'):batch.drop_column(field)
