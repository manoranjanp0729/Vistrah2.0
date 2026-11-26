"""Private ownership-claim evidence, contact declarations, and review history."""
from alembic import op
import sqlalchemy as sa

revision = '009'
down_revision = '008'
branch_labels = None
depends_on = None

def _append_only(table, prefix):
    if op.get_bind().dialect.name == 'postgresql':
        function = f'protect_{prefix}_history'
        op.execute(f"CREATE FUNCTION {function}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'ownership claim history is append-only'; END $$")
        op.execute(f'CREATE TRIGGER immutable_{prefix} BEFORE UPDATE OR DELETE ON {table} FOR EACH ROW EXECUTE FUNCTION {function}()')
    else:
        op.execute(f"CREATE TRIGGER immutable_{prefix}_update BEFORE UPDATE ON {table} BEGIN SELECT RAISE(ABORT,'ownership claim history is append-only'); END")
        op.execute(f"CREATE TRIGGER immutable_{prefix}_delete BEFORE DELETE ON {table} BEGIN SELECT RAISE(ABORT,'ownership claim history is append-only'); END")

def upgrade():
    op.add_column('provider_ownership_claims', sa.Column('business_type', sa.String(20), nullable=True))
    op.add_column('provider_ownership_claims', sa.Column('registration_evidence_available', sa.Boolean(), nullable=True))
    op.add_column('provider_ownership_claims', sa.Column('contact_channel', sa.String(10), nullable=True))
    op.add_column('provider_ownership_claims', sa.Column('contact_value', sa.String(254), nullable=True))
    op.add_column('provider_ownership_claims', sa.Column('needs_more_info', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_table('provider_ownership_claim_evidence',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('claim_id', sa.String(36), sa.ForeignKey('provider_ownership_claims.id'), nullable=False),
        sa.Column('submitted_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('evidence_type', sa.String(30), nullable=False),
        sa.Column('filename', sa.String(80), nullable=False),
        sa.Column('media_type', sa.String(60), nullable=False),
        sa.Column('sha256', sa.String(64), nullable=False),
        sa.Column('content', sa.LargeBinary(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("evidence_type IN ('BUSINESS_REGISTRATION','AUTHORITY','CORROBORATING')", name='ck_claim_evidence_type'))
    op.create_index('ix_provider_ownership_claim_evidence_claim_id','provider_ownership_claim_evidence',['claim_id'])
    op.create_table('provider_ownership_claim_events',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('claim_id', sa.String(36), sa.ForeignKey('provider_ownership_claims.id'), nullable=False),
        sa.Column('actor_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('action', sa.String(40), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("action IN ('CLAIM_CREATED','EVIDENCE_ADDED','INFORMATION_REQUESTED','RESUBMITTED','REJECTED','RECUSED')", name='ck_claim_event_action'))
    op.create_index('ix_provider_ownership_claim_events_claim_id','provider_ownership_claim_events',['claim_id'])
    _append_only('provider_ownership_claim_evidence','ownership_claim_evidence')
    _append_only('provider_ownership_claim_events','ownership_claim_event')

def downgrade():
    dialect = op.get_bind().dialect.name
    for table, prefix in (('provider_ownership_claim_evidence','ownership_claim_evidence'),('provider_ownership_claim_events','ownership_claim_event')):
        if dialect == 'postgresql':
            op.execute(f'DROP TRIGGER IF EXISTS immutable_{prefix} ON {table}')
            op.execute(f'DROP FUNCTION IF EXISTS protect_{prefix}_history()')
        else:
            op.execute(f'DROP TRIGGER IF EXISTS immutable_{prefix}_update')
            op.execute(f'DROP TRIGGER IF EXISTS immutable_{prefix}_delete')
    op.drop_table('provider_ownership_claim_events')
    op.drop_table('provider_ownership_claim_evidence')
    for column in ('needs_more_info','contact_value','contact_channel','registration_evidence_available','business_type'):
        op.drop_column('provider_ownership_claims',column)