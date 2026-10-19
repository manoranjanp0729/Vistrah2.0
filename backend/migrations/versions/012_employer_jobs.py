"""Reviewed employer job postings, separate from acquired vacancy feeds."""
from alembic import op
import sqlalchemy as sa

revision='012'
down_revision='011'

def upgrade():
    op.create_table('employer_jobs',
        sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('provider_id',sa.Integer(),sa.ForeignKey('providers.id'),nullable=False),
        sa.Column('actor_id',sa.Integer(),sa.ForeignKey('users.id'),nullable=False),
        sa.Column('title',sa.String(150),nullable=False),
        sa.Column('description',sa.Text(),nullable=False),
        sa.Column('location',sa.String(150),nullable=False),
        sa.Column('arrangement',sa.String(10),nullable=False),
        sa.Column('employment_type',sa.String(20),nullable=False),
        sa.Column('salary_text',sa.String(300),nullable=False),
        sa.Column('application_url',sa.String(1500),nullable=False),
        sa.Column('deadline',sa.Date(),nullable=True),
        sa.Column('status',sa.String(20),nullable=False),
        sa.Column('revision',sa.Integer(),nullable=False),
        sa.Column('reviewer_id',sa.Integer(),sa.ForeignKey('users.id'),nullable=True),
        sa.Column('review_note',sa.Text(),nullable=False),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('submitted_at',sa.DateTime(timezone=True),nullable=True),
        sa.Column('reviewed_at',sa.DateTime(timezone=True),nullable=True),
        sa.Column('published_at',sa.DateTime(timezone=True),nullable=True),
        sa.CheckConstraint("status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','CLOSED')",name='ck_employer_job_status'),
        sa.CheckConstraint('revision > 0',name='ck_employer_job_revision'),
        sa.CheckConstraint("arrangement IN ('REMOTE','HYBRID','ONSITE')",name='ck_employer_job_arrangement'),
        sa.CheckConstraint("employment_type IN ('FULL_TIME','PART_TIME','CONTRACT','INTERNSHIP','TEMPORARY')",name='ck_employer_job_type'))
    for field in ('provider_id','actor_id','status'):
        op.create_index('ix_employer_jobs_'+field,'employer_jobs',[field])

def downgrade():
    op.drop_table('employer_jobs')
