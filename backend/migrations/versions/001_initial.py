"""Initial marketplace schema and append-only ledger guards."""
from alembic import op
from migrations.schema_v1 import Base

revision = '001'
down_revision = None

def upgrade():
    Base.metadata.create_all(op.get_bind())
    dialect = op.get_bind().dialect.name
    for table in ('audit_logs', 'allocations', 'refunds', 'webhook_events', 'reconciliations'):
        if dialect == 'postgresql':
            op.execute("CREATE OR REPLACE FUNCTION deny_immutable_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'append-only table'; END $$")
            op.execute(f'CREATE TRIGGER immutable_{table} BEFORE UPDATE OR DELETE ON {table} FOR EACH ROW EXECUTE FUNCTION deny_immutable_change()')
        elif dialect == 'sqlite':
            for action in ('UPDATE', 'DELETE'):
                op.execute(f"CREATE TRIGGER immutable_{table}_{action.lower()} BEFORE {action} ON {table} BEGIN SELECT RAISE(ABORT, 'append-only table'); END")

def downgrade():
    Base.metadata.drop_all(op.get_bind())
    if op.get_bind().dialect.name == 'postgresql':
        op.execute('DROP FUNCTION IF EXISTS deny_immutable_change()')
