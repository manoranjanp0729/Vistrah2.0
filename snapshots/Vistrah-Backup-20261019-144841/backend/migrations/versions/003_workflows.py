"""Durable workflow engine and customer-owned documents. Frozen explicit schema."""
from alembic import op
import sqlalchemy as s

revision='003'
down_revision='002'

def idcol():
    return s.Column('id',s.String(36),primary_key=True)
def fk(name, target, nullable=False, primary_key=False):
    return s.Column(name,s.String(36),s.ForeignKey(target),nullable=nullable,primary_key=primary_key)
def date(name, nullable=False):
    return s.Column(name,s.DateTime(timezone=True),nullable=nullable)
def json(name, nullable=False):
    return s.Column(name,s.JSON(),nullable=nullable)

def upgrade():
    op.create_table('action_definitions',s.Column('id',s.String(100),primary_key=True),s.Column('identifier',s.String(80),nullable=False),s.Column('version',s.Integer(),nullable=False),json('specification'),s.UniqueConstraint('identifier','version'))
    op.create_table('workflow_templates',s.Column('id',s.String(100),primary_key=True),json('specification'))
    op.create_table('workflow_documents',idcol(),s.Column('user_id',s.Integer(),s.ForeignKey('users.id'),nullable=False),s.Column('filename',s.String(150),nullable=False),s.Column('content',s.Text(),nullable=False),s.Column('sha256',s.String(64),nullable=False),date('created_at'))
    op.create_table('workflow_runs',idcol(),s.Column('user_id',s.Integer(),s.ForeignKey('users.id'),nullable=False),s.Column('request_id',s.Integer(),s.ForeignKey('service_requests.id'),nullable=False),s.Column('template_id',s.String(100),s.ForeignKey('workflow_templates.id'),nullable=False),s.Column('idempotency_key',s.String(80),nullable=False),s.Column('status',s.String(30),nullable=False),json('inputs'),s.Column('input_hash',s.String(64),nullable=False),date('created_at'),date('updated_at'),s.UniqueConstraint('user_id','idempotency_key'),s.CheckConstraint("status IN ('DRAFT','READY','QUEUED','RUNNING','WAITING_APPROVAL','COMPLETED','FAILED','PARTIALLY_COMPLETED','CANCELLED')"))
    op.create_table('action_runs',idcol(),fk('workflow_id','workflow_runs.id'),s.Column('definition_id',s.String(100),s.ForeignKey('action_definitions.id'),nullable=False),s.Column('status',s.String(30),nullable=False),s.Column('ordinal',s.Integer(),nullable=False),json('snapshot'),json('result',True),s.Column('error',s.String(300)),s.Column('attempts',s.Integer(),nullable=False),s.Column('lease_token',s.String(36)),date('lease_until',True),date('started_at',True),date('finished_at',True),s.UniqueConstraint('workflow_id','definition_id'),s.CheckConstraint("status IN ('PENDING','WAITING_APPROVAL','QUEUED','RUNNING','COMPLETED','FAILED','BLOCKED','REJECTED','CANCELLED')"))
    op.create_table('action_dependencies',fk('action_id','action_runs.id',primary_key=True),fk('prerequisite_id','action_runs.id',primary_key=True),s.CheckConstraint('action_id <> prerequisite_id'))
    op.create_table('workflow_approvals',idcol(),fk('action_id','action_runs.id'),s.Column('status',s.String(20),nullable=False),json('scope'),s.Column('actor_id',s.Integer(),s.ForeignKey('users.id')),date('decided_at',True),date('created_at'),s.UniqueConstraint('action_id'),s.CheckConstraint("status IN ('PENDING','APPROVED','REJECTED','CANCELLED')"))
    op.create_table('execution_attempts',idcol(),fk('action_id','action_runs.id'),s.Column('number',s.Integer(),nullable=False),s.Column('idempotency_key',s.String(100),nullable=False),s.Column('status',s.String(20),nullable=False),s.Column('error_code',s.String(100)),date('started_at'),date('finished_at',True),s.UniqueConstraint('action_id','number'),s.CheckConstraint("status IN ('RUNNING','COMPLETED','FAILED','INTERRUPTED','TIMED_OUT','CANCELLED')"))
    op.create_table('workflow_evidence',s.Column('id',s.Integer(),primary_key=True),fk('action_id','action_runs.id'),s.Column('source_url',s.Text(),nullable=False),date('discovered_at'),s.Column('description',s.String(300),nullable=False))
    op.create_table('workflow_events',s.Column('id',s.Integer(),primary_key=True),fk('workflow_id','workflow_runs.id'),s.Column('actor_id',s.Integer(),s.ForeignKey('users.id')),fk('action_id','action_runs.id',True),s.Column('kind',s.String(60),nullable=False),json('details'),date('created_at'))
    op.create_table('workflow_workers',s.Column('id',s.String(80),primary_key=True),date('heartbeat_at'))
    op.create_table('workflow_application_records',s.Column('id',s.Integer(),primary_key=True),fk('workflow_id','workflow_runs.id'),s.Column('source_url',s.Text(),nullable=False),s.Column('status',s.String(30),nullable=False),date('updated_at'),s.UniqueConstraint('workflow_id','source_url'),s.CheckConstraint("status IN ('SAVED','APPLIED','INTERVIEW','OFFER','REJECTED','WITHDRAWN')"))
    for table,columns in {'workflow_documents':['user_id'],'workflow_runs':['user_id','request_id','status'],'action_runs':['workflow_id','status'],'execution_attempts':['action_id'],'workflow_evidence':['action_id'],'workflow_events':['workflow_id'],'workflow_application_records':['workflow_id']}.items():
        for column in columns:
            op.create_index(f'ix_{table}_{column}',table,[column])
    for table in ('workflow_events','workflow_evidence','action_definitions','workflow_templates'):
        if op.get_bind().dialect.name=='postgresql':
            op.execute(f'CREATE TRIGGER immutable_{table} BEFORE UPDATE OR DELETE ON {table} FOR EACH ROW EXECUTE FUNCTION deny_immutable_change()')
        else:
            for operation in ('UPDATE','DELETE'):
                op.execute(f"CREATE TRIGGER immutable_{table}_{operation.lower()} BEFORE {operation} ON {table} BEGIN SELECT RAISE(ABORT, 'append-only table'); END")

def downgrade():
    for table in ('workflow_application_records','workflow_workers','workflow_events','workflow_evidence','execution_attempts','workflow_approvals','action_dependencies','action_runs','workflow_runs','workflow_documents','workflow_templates','action_definitions'):
        op.drop_table(table)
