"""Extend hr_employees with bank/KYC columns and create hr_salary_credits."""
from alembic import op
import sqlalchemy as sa

revision = '028'
down_revision = '027'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('hr_employees', sa.Column('bank_account_holder', sa.String(160), nullable=True))
    op.add_column('hr_employees', sa.Column('bank_name', sa.String(120), nullable=True))
    op.add_column('hr_employees', sa.Column('bank_account_number', sa.String(40), nullable=True))
    op.add_column('hr_employees', sa.Column('bank_ifsc', sa.String(16), nullable=True))
    op.add_column('hr_employees', sa.Column('bank_account_type', sa.String(24), nullable=True))
    op.add_column('hr_employees', sa.Column('pan_number', sa.String(16), nullable=True))
    op.add_column('hr_employees', sa.Column('uan_number', sa.String(24), nullable=True))

    op.create_table(
        'hr_salary_credits',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            'employee_id',
            sa.Integer(),
            sa.ForeignKey('hr_employees.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column('pay_month', sa.String(7), nullable=False),
        sa.Column('gross_earnings_inr', sa.BigInteger(), nullable=False, server_default='0'),
        sa.Column('pf_deduction_inr', sa.BigInteger(), nullable=False, server_default='0'),
        sa.Column('pt_deduction_inr', sa.BigInteger(), nullable=False, server_default='0'),
        sa.Column('tds_deduction_inr', sa.BigInteger(), nullable=False, server_default='0'),
        sa.Column('other_deduction_inr', sa.BigInteger(), nullable=False, server_default='0'),
        sa.Column('net_paid_inr', sa.BigInteger(), nullable=False, server_default='0'),
        sa.Column('payment_mode', sa.String(24), nullable=False, server_default='NEFT'),
        sa.Column('utr_reference', sa.String(80), nullable=True),
        sa.Column('credited_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(24), nullable=False, server_default='pending'),
        sa.Column('notes', sa.Text(), nullable=False, server_default=''),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('employee_id', 'pay_month', name='uq_hr_salary_credits_employee_month'),
        sa.CheckConstraint(
            "payment_mode IN ('NEFT', 'IMPS', 'UPI', 'BANK_TRANSFER')",
            name='ck_hr_salary_credits_payment_mode',
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'credited')",
            name='ck_hr_salary_credits_status',
        ),
        sa.CheckConstraint('gross_earnings_inr >= 0', name='ck_hr_salary_credits_gross_nonneg'),
        sa.CheckConstraint('pf_deduction_inr >= 0', name='ck_hr_salary_credits_pf_nonneg'),
        sa.CheckConstraint('pt_deduction_inr >= 0', name='ck_hr_salary_credits_pt_nonneg'),
        sa.CheckConstraint('tds_deduction_inr >= 0', name='ck_hr_salary_credits_tds_nonneg'),
        sa.CheckConstraint('other_deduction_inr >= 0', name='ck_hr_salary_credits_other_nonneg'),
        sa.CheckConstraint('net_paid_inr >= 0', name='ck_hr_salary_credits_net_nonneg'),
    )
    op.create_index('ix_hr_salary_credits_employee_id', 'hr_salary_credits', ['employee_id'])
    op.create_index('ix_hr_salary_credits_pay_month', 'hr_salary_credits', ['pay_month'])
    op.create_index('ix_hr_salary_credits_status', 'hr_salary_credits', ['status'])


def downgrade():
    op.drop_index('ix_hr_salary_credits_status', table_name='hr_salary_credits')
    op.drop_index('ix_hr_salary_credits_pay_month', table_name='hr_salary_credits')
    op.drop_index('ix_hr_salary_credits_employee_id', table_name='hr_salary_credits')
    op.drop_table('hr_salary_credits')

    op.drop_column('hr_employees', 'uan_number')
    op.drop_column('hr_employees', 'pan_number')
    op.drop_column('hr_employees', 'bank_account_type')
    op.drop_column('hr_employees', 'bank_ifsc')
    op.drop_column('hr_employees', 'bank_account_number')
    op.drop_column('hr_employees', 'bank_name')
    op.drop_column('hr_employees', 'bank_account_holder')
