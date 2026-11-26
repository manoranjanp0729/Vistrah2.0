"""Versioned requirements, private applications/documents and per-service grants."""
from alembic import op
import sqlalchemy as s

revision='005'
down_revision='004'

def fk(name,target,type=s.Integer,nullable=False):return s.Column(name,type,s.ForeignKey(target),nullable=nullable)
def dt(name,nullable=False):return s.Column(name,s.DateTime(timezone=True),nullable=nullable)
def upgrade():
    op.create_table('provider_requirements',s.Column('id',s.Integer,primary_key=True),fk('service_id','services.id'),s.Column('version',s.Integer,nullable=False),s.Column('state',s.String(20),nullable=False),s.Column('configuration',s.JSON,nullable=False),dt('effective_at'),dt('created_at'),dt('published_at',True),fk('actor_id','users.id',nullable=True),s.Column('change_note',s.Text,nullable=False),s.UniqueConstraint('service_id','version'),s.CheckConstraint("state IN ('DRAFT','PUBLISHED','RETIRED')"))
    op.create_index('ix_provider_requirements_service_id','provider_requirements',['service_id'])
    statuses="status IN ('DRAFT','SUBMITTED','UNDER_REVIEW','CHANGES_REQUESTED','APPROVED','REJECTED','SUSPENDED')"
    op.create_table('provider_applications',s.Column('id',s.String(36),primary_key=True),fk('user_id','users.id'),fk('provider_id','providers.id',nullable=True),fk('category_id','categories.id'),s.Column('common',s.JSON,nullable=False),s.Column('common_configuration',s.JSON,nullable=False),s.Column('status',s.String(30),nullable=False),s.Column('revision',s.Integer,nullable=False),dt('created_at'),dt('updated_at'),dt('submitted_at',True),s.CheckConstraint(statuses))
    for column in ('user_id','provider_id'):op.create_index('ix_provider_applications_'+column,'provider_applications',[column])
    op.create_table('provider_application_services',s.Column('application_id',s.String(36),s.ForeignKey('provider_applications.id'),primary_key=True),s.Column('service_id',s.Integer,s.ForeignKey('services.id'),primary_key=True),fk('requirement_id','provider_requirements.id'),fk('required_requirement_id','provider_requirements.id',nullable=True),s.Column('answers',s.JSON,nullable=False),s.Column('status',s.String(30),nullable=False),s.CheckConstraint(statuses))
    op.create_table('provider_documents',s.Column('id',s.String(36),primary_key=True),fk('application_id','provider_applications.id',s.String(36)),fk('service_id','services.id'),s.Column('field_id',s.String(100),nullable=False),s.Column('filename',s.String(180),nullable=False),s.Column('media_type',s.String(60),nullable=False),s.Column('sha256',s.String(64),nullable=False),s.Column('content',s.LargeBinary,nullable=False),dt('created_at'))
    op.create_index('ix_provider_documents_application_id','provider_documents',['application_id'])
    op.create_table('provider_application_events',s.Column('id',s.Integer,primary_key=True),fk('application_id','provider_applications.id',s.String(36)),fk('service_id','services.id',nullable=True),fk('actor_id','users.id'),s.Column('kind',s.String(40),nullable=False),s.Column('reason',s.Text,nullable=False),s.Column('details',s.JSON,nullable=False),dt('created_at'))
    op.create_index('ix_provider_application_events_application_id','provider_application_events',['application_id'])
    op.create_table('provider_leads',s.Column('id',s.Integer,primary_key=True),fk('request_id','service_requests.id'),fk('provider_id','providers.id'),fk('service_id','services.id'),fk('actor_id','users.id'),dt('created_at'),s.UniqueConstraint('request_id','provider_id'))
    for column in ('provider_id','request_id'):op.create_index('ix_provider_leads_'+column,'provider_leads',[column])
    with op.batch_alter_table('provider_services') as batch:
        batch.add_column(s.Column('approval_status',s.String(20),nullable=False,server_default='PENDING'))
        batch.add_column(s.Column('application_id',s.String(36),nullable=True))
        batch.create_foreign_key('fk_provider_service_application','provider_applications',['application_id'],['id'])
        batch.create_check_constraint('ck_provider_service_approval',"approval_status IN ('PENDING','APPROVED','REJECTED','SUSPENDED')")
    # Existing associations retain their prior manual-verification eligibility.
    op.execute("UPDATE provider_services SET approval_status='APPROVED'")
    dialect=op.get_bind().dialect.name
    for table in ('provider_application_events','provider_documents'):
        if dialect=='postgresql':op.execute(f'CREATE TRIGGER immutable_{table} BEFORE UPDATE OR DELETE ON {table} FOR EACH ROW EXECUTE FUNCTION deny_immutable_change()')
        else:
            for action in ('UPDATE','DELETE'):op.execute(f"CREATE TRIGGER immutable_{table}_{action.lower()} BEFORE {action} ON {table} BEGIN SELECT RAISE(ABORT,'append-only provider evidence'); END")
    if dialect=='postgresql':
        op.execute("""CREATE FUNCTION protect_provider_configuration() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF TG_OP='DELETE' THEN IF OLD.state<>'DRAFT' THEN RAISE EXCEPTION 'historical requirements are immutable'; END IF; RETURN OLD; END IF;
        IF OLD.state<>'DRAFT' AND (NEW.configuration::jsonb IS DISTINCT FROM OLD.configuration::jsonb OR NEW.service_id<>OLD.service_id OR NEW.version<>OLD.version OR NEW.effective_at<>OLD.effective_at OR NEW.created_at<>OLD.created_at OR NEW.published_at IS DISTINCT FROM OLD.published_at OR NEW.actor_id IS DISTINCT FROM OLD.actor_id OR (NEW.state<>OLD.state AND NOT (OLD.state='PUBLISHED' AND NEW.state='RETIRED')) OR NEW.change_note<>OLD.change_note) THEN RAISE EXCEPTION 'historical requirements are immutable'; END IF; RETURN NEW; END $$""")
        op.execute('CREATE TRIGGER immutable_provider_configuration BEFORE UPDATE OR DELETE ON provider_requirements FOR EACH ROW EXECUTE FUNCTION protect_provider_configuration()')
    else:
        op.execute("CREATE TRIGGER immutable_provider_configuration_update BEFORE UPDATE ON provider_requirements WHEN OLD.state<>'DRAFT' AND (NEW.configuration<>OLD.configuration OR NEW.service_id<>OLD.service_id OR NEW.version<>OLD.version OR NEW.effective_at<>OLD.effective_at OR NEW.created_at<>OLD.created_at OR NEW.published_at IS NOT OLD.published_at OR NEW.actor_id IS NOT OLD.actor_id OR (NEW.state<>OLD.state AND NOT (OLD.state='PUBLISHED' AND NEW.state='RETIRED')) OR NEW.change_note<>OLD.change_note) BEGIN SELECT RAISE(ABORT,'historical requirements are immutable'); END")
        op.execute("CREATE TRIGGER immutable_provider_configuration_delete BEFORE DELETE ON provider_requirements WHEN OLD.state<>'DRAFT' BEGIN SELECT RAISE(ABORT,'historical requirements are immutable'); END")

def downgrade():
    with op.batch_alter_table('provider_services') as batch:
        batch.drop_constraint('fk_provider_service_application',type_='foreignkey')
        batch.drop_constraint('ck_provider_service_approval',type_='check')
        batch.drop_column('application_id');batch.drop_column('approval_status')
    for table in ('provider_leads','provider_application_events','provider_documents','provider_application_services','provider_applications','provider_requirements'):op.drop_table(table)
    if op.get_bind().dialect.name=='postgresql':op.execute('DROP FUNCTION protect_provider_configuration()')
