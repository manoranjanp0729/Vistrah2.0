"""Editable homepage singleton and immutable published snapshots; no seed data."""
from alembic import op
import sqlalchemy as sa

revision = '013'
down_revision = '012'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('homepage_releases',
        sa.Column('version', sa.Integer(), primary_key=True),
        sa.Column('layout', sa.JSON(), nullable=False),
        sa.Column('published_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint('version > 0', name='ck_homepage_release_version'))
    op.create_table('homepage_state',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('revision', sa.Integer(), nullable=False),
        sa.Column('draft', sa.JSON(), nullable=False),
        sa.Column('published_version', sa.Integer(), sa.ForeignKey('homepage_releases.version'), nullable=True),
        sa.Column('updated_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint('id = 1', name='ck_homepage_singleton'),
        sa.CheckConstraint('revision > 0', name='ck_homepage_draft_revision'))
    if op.get_bind().dialect.name == 'postgresql':
        op.execute("CREATE FUNCTION protect_homepage_release() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'published homepage is immutable'; END $$")
        op.execute('CREATE TRIGGER immutable_homepage_release BEFORE UPDATE OR DELETE ON homepage_releases FOR EACH ROW EXECUTE FUNCTION protect_homepage_release()')
    else:
        for action in ('UPDATE', 'DELETE'):
            op.execute(f"CREATE TRIGGER immutable_homepage_release_{action.lower()} BEFORE {action} ON homepage_releases BEGIN SELECT RAISE(ABORT, 'published homepage is immutable'); END")


def downgrade():
    if op.get_bind().execute(sa.text('SELECT count(*) FROM homepage_state')).scalar() or op.get_bind().execute(sa.text('SELECT count(*) FROM homepage_releases')).scalar():
        raise RuntimeError('Cannot downgrade homepage configuration with saved drafts or published history')
    op.drop_table('homepage_state')
    op.drop_table('homepage_releases')
    if op.get_bind().dialect.name == 'postgresql':
        op.execute('DROP FUNCTION protect_homepage_release()')
