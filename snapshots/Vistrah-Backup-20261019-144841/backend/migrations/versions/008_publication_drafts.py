"""Draft publication extends existing businesses/service grants, without backfill."""
from alembic import op
import sqlalchemy as sa
revision='008'
down_revision='007'
branch_labels=None
depends_on=None

def upgrade():
    op.add_column('providers',sa.Column('publication_revision',sa.Integer(),nullable=False,server_default='0'))
    op.add_column('provider_services',sa.Column('description',sa.Text(),nullable=False,server_default=''))
    op.add_column('provider_services',sa.Column('publication_revision',sa.Integer(),nullable=False,server_default='0'))
    op.create_table('provider_publication_drafts',
        sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('provider_id',sa.Integer(),sa.ForeignKey('providers.id'),nullable=False),
        sa.Column('service_id',sa.Integer(),sa.ForeignKey('services.id'),nullable=True),
        sa.Column('actor_id',sa.Integer(),sa.ForeignKey('users.id'),nullable=False),
        sa.Column('base_revision',sa.Integer(),nullable=False),
        sa.Column('revision',sa.Integer(),nullable=False),
        sa.Column('status',sa.String(20),nullable=False),
        sa.Column('payload',sa.JSON(),nullable=False),sa.Column('prior_payload',sa.JSON(),nullable=False),
        sa.Column('reviewer_id',sa.Integer(),sa.ForeignKey('users.id'),nullable=True),
        sa.Column('review_note',sa.Text(),nullable=False),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('reviewed_at',sa.DateTime(timezone=True),nullable=True),
        sa.CheckConstraint("status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED')"))
    op.create_index('ix_provider_publication_drafts_provider_id','provider_publication_drafts',['provider_id'])
    if op.get_bind().dialect.name=='sqlite':
        op.execute("CREATE TRIGGER immutable_publication_payload BEFORE UPDATE ON provider_publication_drafts WHEN OLD.status IN ('APPROVED','REJECTED') OR NEW.payload<>OLD.payload OR NEW.prior_payload<>OLD.prior_payload OR NEW.provider_id<>OLD.provider_id OR NEW.service_id IS NOT OLD.service_id OR NEW.actor_id<>OLD.actor_id OR NEW.base_revision<>OLD.base_revision BEGIN SELECT RAISE(ABORT,'immutable publication proposal/history'); END")
        op.execute("CREATE TRIGGER immutable_publication_delete BEFORE DELETE ON provider_publication_drafts BEGIN SELECT RAISE(ABORT,'publication history retained'); END")
    else:
        op.execute("""CREATE FUNCTION protect_publication_draft() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF TG_OP='DELETE' THEN RAISE EXCEPTION 'publication history retained'; END IF;
        IF OLD.status IN ('APPROVED','REJECTED') OR NEW.payload::jsonb IS DISTINCT FROM OLD.payload::jsonb OR NEW.prior_payload::jsonb IS DISTINCT FROM OLD.prior_payload::jsonb OR NEW.provider_id<>OLD.provider_id OR NEW.service_id IS DISTINCT FROM OLD.service_id OR NEW.actor_id<>OLD.actor_id OR NEW.base_revision<>OLD.base_revision THEN RAISE EXCEPTION 'immutable publication proposal/history'; END IF; RETURN NEW; END $$""")
        op.execute('CREATE TRIGGER immutable_publication_draft BEFORE UPDATE OR DELETE ON provider_publication_drafts FOR EACH ROW EXECUTE FUNCTION protect_publication_draft()')

def downgrade():
    op.drop_table('provider_publication_drafts')
    if op.get_bind().dialect.name!='sqlite':op.execute('DROP FUNCTION protect_publication_draft()')
    op.drop_column('provider_services','publication_revision')
    op.drop_column('provider_services','description')
    op.drop_column('providers','publication_revision')
