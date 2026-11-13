"""Reviewed taxonomy services without invented legacy catalogue IDs."""
from alembic import op
import sqlalchemy as sa

revision='021'
down_revision='020'
branch_labels=None
depends_on=None

LISTING_OLD="(kind = 'PRODUCT' AND service_id IS NULL) OR (kind = 'SERVICE_PACKAGE' AND service_id IS NOT NULL)"
LISTING_NEW="(kind = 'PRODUCT' AND service_id IS NULL) OR (kind = 'SERVICE_PACKAGE' AND (service_id IS NOT NULL OR (taxonomy_category_slug IS NOT NULL AND taxonomy_subcategory_slug IS NOT NULL AND taxonomy_listing_type_slug IS NOT NULL)))"
ORDER_OLD="(kind = 'PRODUCT' AND fulfilment_operator = 'SELLER' AND service_id IS NULL AND fulfilment_method IN ('PICKUP','DELIVERY') AND cancellation_rule IN ('BEFORE_DISPATCH','BEFORE_BUILD')) OR (kind = 'SERVICE_PACKAGE' AND service_id IS NOT NULL AND fulfilment_operator IN ('SELLER','VISTRAH') AND fulfilment_method = 'SERVICE' AND cancellation_rule = 'BEFORE_SERVICE_START')"
ORDER_NEW=ORDER_OLD.replace("kind = 'SERVICE_PACKAGE' AND service_id IS NOT NULL", "kind = 'SERVICE_PACKAGE'")

def rebuild_constraints(listing,order):
    with op.batch_alter_table('commerce_listings') as batch:
        batch.drop_constraint('ck_commerce_service_kind',type_='check')
        batch.create_check_constraint('ck_commerce_service_kind',listing)
    with op.batch_alter_table('commerce_orders') as batch:
        batch.drop_constraint('ck_commerce_order_kind',type_='check')
        batch.create_check_constraint('ck_commerce_order_kind',order)

def constraints(listing,order):
    db=op.get_bind()
    if db.dialect.name!='sqlite':
        rebuild_constraints(listing,order)
        return
    # SQLite batch recreation requires temporarily disabling FK enforcement.
    # Keep all references and check them before leaving the migration.
    with op.get_context().autocommit_block():
        db.exec_driver_sql('PRAGMA foreign_keys=OFF')
        try:
            rebuild_constraints(listing,order)
            if db.exec_driver_sql('PRAGMA foreign_key_check').fetchall():
                raise RuntimeError('Classified-service migration found invalid foreign keys')
        finally:
            db.exec_driver_sql('PRAGMA foreign_keys=ON')

def upgrade():
    constraints(LISTING_NEW,ORDER_NEW)

def downgrade():
    db=op.get_bind()
    for table in ('commerce_listings','commerce_orders'):
        if db.execute(sa.text(f"SELECT count(*) FROM {table} WHERE kind='SERVICE_PACKAGE' AND service_id IS NULL")).scalar():
            raise RuntimeError('Cannot downgrade with classified services or their orders')
    constraints(LISTING_OLD,ORDER_OLD)
