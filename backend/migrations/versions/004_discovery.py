"""Public vacancy cache and durable acquisition progress. Frozen schema."""
from alembic import op
import sqlalchemy as s

revision = '004'
down_revision = '003'

def date(name):
    return s.Column(name, s.DateTime(timezone=True), nullable=True)

def upgrade():
    op.create_table('job_sources', s.Column('id', s.String(40), primary_key=True), s.Column('enabled', s.Boolean(), nullable=False), date('checked_at'), date('succeeded_at'), date('next_request_at'), s.Column('lease_token', s.String(36)), date('lease_until'), s.Column('error_code', s.String(60)), s.Column('request_times', s.JSON(), nullable=False))
    op.create_table('vacancies', s.Column('id', s.String(36), primary_key=True), s.Column('canonical_url', s.String(1500), nullable=False, unique=True), s.Column('fingerprint', s.String(64), nullable=False), s.Column('record', s.JSON(), nullable=False), s.Column('first_seen_at', s.DateTime(timezone=True), nullable=False), s.Column('last_checked_at', s.DateTime(timezone=True), nullable=False), s.Column('retrieved_at', s.DateTime(timezone=True), nullable=False))
    op.create_index('ix_vacancies_fingerprint', 'vacancies', ['fingerprint'])
    op.create_table('vacancy_provenance', s.Column('id', s.Integer(), primary_key=True), s.Column('vacancy_id', s.String(36), s.ForeignKey('vacancies.id'), nullable=False), s.Column('source_id', s.String(40), s.ForeignKey('job_sources.id'), nullable=False), s.Column('source_record_id', s.String(150), nullable=False), s.Column('source_url', s.String(1500), nullable=False), s.Column('attribution', s.String(100), nullable=False), s.Column('retrieved_at', s.DateTime(timezone=True), nullable=False), s.UniqueConstraint('source_id', 'source_record_id'))
    op.create_index('ix_vacancy_provenance_vacancy_id', 'vacancy_provenance', ['vacancy_id'])
    op.create_table('job_acquisitions', s.Column('id', s.String(36), primary_key=True), s.Column('action_id', s.String(36), s.ForeignKey('action_runs.id'), nullable=False, unique=True), s.Column('workflow_id', s.String(36), s.ForeignKey('workflow_runs.id'), nullable=False), s.Column('status', s.String(30), nullable=False), s.Column('created_at', s.DateTime(timezone=True), nullable=False), date('finished_at'))
    op.create_index('ix_job_acquisitions_workflow_id', 'job_acquisitions', ['workflow_id'])
    op.create_table('job_acquisition_sources', s.Column('id', s.Integer(), primary_key=True), s.Column('acquisition_id', s.String(36), s.ForeignKey('job_acquisitions.id'), nullable=False), s.Column('source_id', s.String(40), s.ForeignKey('job_sources.id'), nullable=False), s.Column('status', s.String(30), nullable=False), s.Column('error_code', s.String(60)), s.Column('pages', s.Integer(), nullable=False), s.Column('retrieved_count', s.Integer(), nullable=False), s.Column('invalid_count', s.Integer(), nullable=False), s.Column('cache_used', s.Boolean(), nullable=False), s.Column('next_page', s.Integer()), date('checked_at'), s.Column('snapshots', s.JSON(), nullable=False), s.UniqueConstraint('acquisition_id', 'source_id'))
    op.create_index('ix_job_acquisition_sources_acquisition_id', 'job_acquisition_sources', ['acquisition_id'])

def downgrade():
    for table in ('job_acquisition_sources', 'job_acquisitions', 'vacancy_provenance', 'vacancies', 'job_sources'):
        op.drop_table(table)
