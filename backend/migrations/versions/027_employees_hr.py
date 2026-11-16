"""Create hr_employees table for internal HR records and letter generation."""
from alembic import op
import sqlalchemy as sa

revision = '027'
down_revision = '026'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'hr_employees',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('employee_code', sa.String(40), nullable=False),
        sa.Column('full_name', sa.String(160), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('phone', sa.String(32), nullable=False, server_default=''),
        sa.Column('address', sa.Text(), nullable=False, server_default=''),
        sa.Column('designation', sa.String(160), nullable=False),
        sa.Column('division', sa.String(120), nullable=False),
        sa.Column('employment_type', sa.String(32), nullable=False, server_default='permanent'),
        sa.Column(
            'work_location',
            sa.String(160),
            nullable=False,
            server_default='Bengaluru, Karnataka',
        ),
        sa.Column('joining_date', sa.Date(), nullable=False),
        sa.Column('probation_months', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('notice_period_days', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('exit_date', sa.Date(), nullable=True),
        sa.Column('last_working_day', sa.Date(), nullable=True),
        sa.Column('annual_ctc_inr', sa.BigInteger(), nullable=False, server_default='0'),
        sa.Column('pf_applicable', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('pt_applicable', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('pf_capped', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('status', sa.String(24), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "employment_type IN ('permanent', 'probation', 'fixed_term', 'intern')",
            name='ck_hr_employees_employment_type',
        ),
        sa.CheckConstraint(
            "status IN ('active', 'relieved')",
            name='ck_hr_employees_status',
        ),
        sa.CheckConstraint('annual_ctc_inr >= 0', name='ck_hr_employees_ctc_nonneg'),
        sa.CheckConstraint('probation_months >= 0', name='ck_hr_employees_probation_nonneg'),
        sa.CheckConstraint('notice_period_days >= 0', name='ck_hr_employees_notice_nonneg'),
    )
    op.create_index('ix_hr_employees_employee_code', 'hr_employees', ['employee_code'], unique=True)
    op.create_index('ix_hr_employees_email', 'hr_employees', ['email'])
    op.create_index('ix_hr_employees_status', 'hr_employees', ['status'])


def downgrade():
    op.drop_index('ix_hr_employees_status', table_name='hr_employees')
    op.drop_index('ix_hr_employees_email', table_name='hr_employees')
    op.drop_index('ix_hr_employees_employee_code', table_name='hr_employees')
    op.drop_table('hr_employees')
