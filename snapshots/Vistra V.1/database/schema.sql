CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(160) NOT NULL,
    phone VARCHAR(30),
    referral_code VARCHAR(40) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    icon VARCHAR(20),
    description TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id),
    name VARCHAR(160) NOT NULL,
    slug VARCHAR(160) UNIQUE NOT NULL,
    description TEXT,
    base_price_paise BIGINT,
    quote_required BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS requirement_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    field_key VARCHAR(100) NOT NULL,
    label VARCHAR(180) NOT NULL,
    field_type VARCHAR(30) NOT NULL,
    required BOOLEAN NOT NULL DEFAULT FALSE,
    options_json JSONB,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_number VARCHAR(40) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    service_id UUID NOT NULL REFERENCES services(id),
    status VARCHAR(40) NOT NULL DEFAULT 'SUBMITTED',
    requirement_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    quoted_amount_paise BIGINT,
    discount_amount_paise BIGINT NOT NULL DEFAULT 0,
    final_amount_paise BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    s3_key TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'UPLOADED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id),
    provider VARCHAR(40) NOT NULL DEFAULT 'RAZORPAY',
    provider_order_id VARCHAR(160),
    provider_payment_id VARCHAR(160),
    amount_paise BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_user_id UUID NOT NULL REFERENCES users(id),
    referred_user_id UUID NOT NULL REFERENCES users(id),
    referral_code VARCHAR(40) NOT NULL,
    qualifying_application_id UUID REFERENCES applications(id),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    referrer_discount_paise BIGINT DEFAULT 0,
    referred_discount_paise BIGINT DEFAULT 0,
    expires_at TIMESTAMPTZ,
    rewarded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(referrer_user_id, referred_user_id)
);

CREATE TABLE IF NOT EXISTS application_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    status VARCHAR(40) NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);



-- Additive admin schema, matching database/init/03-admin-schema.sql.
-- Additive VISTRAH administration schema. Safe to apply to existing databases.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(30) NOT NULL DEFAULT 'CUSTOMER';

CREATE TABLE IF NOT EXISTS service_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(160) NOT NULL,
    slug VARCHAR(180) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(80),
    sort_order INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES service_categories(id),
    name VARCHAR(160) NOT NULL,
    slug VARCHAR(180) NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (category_id, slug)
);

CREATE TABLE IF NOT EXISTS master_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subcategory_id UUID NOT NULL REFERENCES service_subcategories(id),
    name VARCHAR(180) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    description TEXT,
    service_type VARCHAR(40) NOT NULL DEFAULT 'SERVICE',
    base_price_paise BIGINT,
    pricing_type VARCHAR(40) NOT NULL DEFAULT 'ON_REQUEST',
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (subcategory_id, slug)
);

CREATE TABLE IF NOT EXISTS data_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(240) NOT NULL,
    source_type VARCHAR(40) NOT NULL DEFAULT 'WEB',
    collection_method VARCHAR(40) NOT NULL DEFAULT 'MANUAL',
    base_url TEXT,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    next_run_at TIMESTAMPTZ,
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS acquisition_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_source_id UUID NOT NULL REFERENCES data_sources(id),
    status VARCHAR(30) NOT NULL DEFAULT 'QUEUED',
    records_found INTEGER NOT NULL DEFAULT 0,
    records_created INTEGER NOT NULL DEFAULT 0,
    records_updated INTEGER NOT NULL DEFAULT 0,
    records_failed INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS source_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_source_id UUID NOT NULL REFERENCES data_sources(id),
    acquisition_job_id UUID REFERENCES acquisition_jobs(id),
    external_id VARCHAR(500),
    source_name VARCHAR(240) NOT NULL,
    source_url TEXT NOT NULL,
    record_url TEXT,
    raw_data JSONB NOT NULL DEFAULT '{}'::JSONB,
    extracted_data JSONB NOT NULL DEFAULT '{}'::JSONB,
    content_hash VARCHAR(64) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'STAGED',
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(240) NOT NULL,
    provider_type VARCHAR(60),
    description TEXT,
    phone VARCHAR(40),
    email VARCHAR(255),
    website TEXT,
    address TEXT,
    city VARCHAR(120),
    state VARCHAR(120),
    country VARCHAR(120) NOT NULL DEFAULT 'India',
    source_record_id UUID REFERENCES source_records(id),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS provider_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id),
    service_id UUID NOT NULL REFERENCES services(id),
    price NUMERIC(14,2),
    price_unit VARCHAR(80),
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    source_record_id UUID REFERENCES source_records(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_record_id UUID REFERENCES source_records(id),
    provider_id UUID REFERENCES providers(id),
    review_type VARCHAR(60) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    decision VARCHAR(40),
    assigned_to UUID REFERENCES users(id),
    reviewer_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(200),
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_number VARCHAR(80) UNIQUE,
    application_id UUID REFERENCES applications(id),
    amount_paise BIGINT NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    payment_method VARCHAR(60),
    gateway VARCHAR(80),
    gateway_transaction_id VARCHAR(240),
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_transaction_id UUID REFERENCES payment_transactions(id),
    refund_number VARCHAR(80) UNIQUE,
    amount_paise BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    gateway_refund_id VARCHAR(240),
    reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    settlement_number VARCHAR(80) UNIQUE,
    gateway VARCHAR(80),
    amount_paise BIGINT NOT NULL DEFAULT 0,
    fee_paise BIGINT NOT NULL DEFAULT 0,
    tax_paise BIGINT NOT NULL DEFAULT 0,
    net_amount_paise BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    settled_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    legal_name VARCHAR(240) NOT NULL,
    brand_name VARCHAR(160) NOT NULL DEFAULT 'VISTRAH',
    company_type VARCHAR(80),
    incorporation_number VARCHAR(120),
    incorporation_date DATE,
    pan_masked VARCHAR(40),
    gstin_masked VARCHAR(40),
    registered_address TEXT,
    office_address TEXT,
    email VARCHAR(255),
    phone VARCHAR(40),
    website TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_shareholders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES company_profile(id),
    name VARCHAR(240) NOT NULL,
    shareholder_type VARCHAR(60),
    ownership_percent NUMERIC(7,4) NOT NULL DEFAULT 0,
    share_count BIGINT,
    pan_masked VARCHAR(40),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES company_profile(id),
    bank_name VARCHAR(180) NOT NULL,
    account_holder_name VARCHAR(240),
    account_number_masked VARCHAR(80) NOT NULL,
    ifsc_masked VARCHAR(20),
    branch_name VARCHAR(180),
    account_type VARCHAR(40),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES company_profile(id),
    full_name VARCHAR(240) NOT NULL,
    employee_code VARCHAR(80),
    job_title VARCHAR(160),
    email VARCHAR(255),
    phone VARCHAR(40),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    joined_at DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acquisition_jobs_source_created
    ON acquisition_jobs(data_source_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_source_records_source_hash
    ON source_records(data_source_id, content_hash);
CREATE INDEX IF NOT EXISTS idx_source_records_collected
    ON source_records(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_providers_status_created
    ON providers(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_queue_status_created
    ON review_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created
    ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_subcategories_category
    ON service_subcategories(category_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_master_services_subcategory
    ON master_services(subcategory_id, sort_order);



-- Phase 3 membership/payment foundation (see database/migrations/20261008_membership_payments.sql).
-- Additive Phase 3 membership, payment, allocation, and reconciliation schema.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
    billing_interval VARCHAR(20) NOT NULL DEFAULT 'MONTHLY' CHECK (billing_interval IN ('MONTHLY')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
    gateway_plan_reference VARCHAR(240),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    gateway VARCHAR(40) NOT NULL DEFAULT 'SANDBOX',
    gateway_customer_reference VARCHAR(240),
    gateway_subscription_reference VARCHAR(240) UNIQUE,
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACTIVE','PAYMENT_FAILED','CANCELLED','EXPIRED','SUSPENDED')),
    start_date TIMESTAMPTZ,
    renewal_date TIMESTAMPTZ,
    cancellation_date TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_memberships_one_current_per_user
    ON memberships(user_id) WHERE status IN ('PENDING','ACTIVE','PAYMENT_FAILED','SUSPENDED');
CREATE INDEX IF NOT EXISTS idx_memberships_user_status ON memberships(user_id,status);

CREATE TABLE IF NOT EXISTS membership_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    membership_id UUID NOT NULL REFERENCES memberships(id),
    payment_transaction_id UUID NOT NULL UNIQUE REFERENCES payment_transactions(id),
    transaction_kind VARCHAR(20) NOT NULL CHECK (transaction_kind IN ('INITIAL','RENEWAL')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS membership_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(180) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category_slug VARCHAR(160),
    subcategory_slug VARCHAR(160),
    service_slug VARCHAR(160),
    provider_id UUID REFERENCES providers(id),
    benefit_type VARCHAR(20) NOT NULL CHECK (benefit_type IN ('PERCENTAGE','FIXED_AMOUNT','MEMBER_PRICE')),
    benefit_value BIGINT NOT NULL CHECK (benefit_value > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    active BOOLEAN NOT NULL DEFAULT FALSE,
    terms TEXT NOT NULL DEFAULT '',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (ends_at IS NULL OR ends_at > starts_at),
    CHECK (benefit_type <> 'PERCENTAGE' OR benefit_value <= 100)
);
CREATE INDEX IF NOT EXISTS idx_membership_offers_lookup ON membership_offers(active,starts_at,ends_at);

ALTER TABLE payment_transactions
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(24) NOT NULL DEFAULT 'SERVICE',
    ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES subscription_plans(id),
    ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES memberships(id),
    ADD COLUMN IF NOT EXISTS category_slug VARCHAR(160),
    ADD COLUMN IF NOT EXISTS subcategory_slug VARCHAR(160),
    ADD COLUMN IF NOT EXISTS service_slug VARCHAR(160),
    ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES providers(id),
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(180),
    ADD COLUMN IF NOT EXISTS gateway_order_reference VARCHAR(240),
    ADD COLUMN IF NOT EXISTS gateway_subscription_reference VARCHAR(240),
    ADD COLUMN IF NOT EXISTS settlement_rule_id UUID,
    ADD COLUMN IF NOT EXISTS allocation_snapshot JSONB NOT NULL DEFAULT '[]'::JSONB,
    ADD COLUMN IF NOT EXISTS succeeded_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS refunded_amount_paise BIGINT NOT NULL DEFAULT 0 CHECK (refunded_amount_paise >= 0),
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
    ADD CONSTRAINT payment_transactions_status_check CHECK (status IN ('PENDING','SUCCEEDED','FAILED','PARTIALLY_REFUNDED','REFUNDED','CANCELLED','SUCCESS','COMPLETED','PROCESSING')) NOT VALID,
    ADD CONSTRAINT payment_transactions_type_check CHECK (transaction_type IN ('MEMBERSHIP','SERVICE')) NOT VALID;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_user_idempotency ON payment_transactions(user_id,idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_gateway_order ON payment_transactions(gateway,gateway_order_reference) WHERE gateway_order_reference IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_gateway_transaction ON payment_transactions(gateway,gateway_transaction_id) WHERE gateway_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_created ON payment_transactions(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status_created ON payment_transactions(status,created_at);

CREATE TABLE IF NOT EXISTS payment_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_key VARCHAR(180) NOT NULL UNIQUE,
    recipient_type VARCHAR(32) NOT NULL CHECK (recipient_type IN ('VISTRAH','SERVICE_PROVIDER','EMPLOYEE_INCENTIVE','OTHER_APPROVED_RECIPIENT')),
    provider_id UUID REFERENCES providers(id),
    user_id UUID REFERENCES users(id),
    gateway VARCHAR(40) NOT NULL DEFAULT 'SANDBOX',
    gateway_account_reference VARCHAR(240),
    onboarding_status VARCHAR(28) NOT NULL DEFAULT 'NOT_STARTED' CHECK (onboarding_status IN ('NOT_STARTED','IN_PROGRESS','VERIFICATION_PENDING','VERIFIED','REJECTED')),
    verification_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING','VERIFIED','REJECTED')),
    settlement_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (recipient_type <> 'SERVICE_PROVIDER' OR provider_id IS NOT NULL),
    CHECK (recipient_type <> 'EMPLOYEE_INCENTIVE' OR user_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_payment_recipients_eligibility ON payment_recipients(active,settlement_eligible,verification_status);

CREATE TABLE IF NOT EXISTS settlement_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(180) NOT NULL,
    transaction_type VARCHAR(24) NOT NULL CHECK (transaction_type IN ('MEMBERSHIP','SERVICE')),
    category_slug VARCHAR(160),
    subcategory_slug VARCHAR(160),
    service_slug VARCHAR(160),
    provider_id UUID REFERENCES providers(id),
    priority INTEGER NOT NULL DEFAULT 0,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_until TIMESTAMPTZ,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (effective_until IS NULL OR effective_until > effective_from)
);
CREATE INDEX IF NOT EXISTS idx_settlement_rules_match ON settlement_rules(active,transaction_type,effective_from,effective_until,priority DESC);

CREATE TABLE IF NOT EXISTS settlement_rule_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID NOT NULL REFERENCES settlement_rules(id),
    recipient_id UUID NOT NULL REFERENCES payment_recipients(id),
    basis VARCHAR(12) NOT NULL CHECK (basis IN ('PERCENTAGE','FIXED_AMOUNT')),
    basis_points INTEGER CHECK (basis_points BETWEEN 1 AND 10000),
    fixed_amount_paise BIGINT CHECK (fixed_amount_paise > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK ((basis = 'PERCENTAGE' AND basis_points IS NOT NULL AND fixed_amount_paise IS NULL) OR
           (basis = 'FIXED_AMOUNT' AND fixed_amount_paise IS NOT NULL AND basis_points IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_settlement_rule_targets_rule ON settlement_rule_targets(rule_id);

ALTER TABLE payment_transactions
    ADD CONSTRAINT payment_transactions_settlement_rule_fk FOREIGN KEY (settlement_rule_id) REFERENCES settlement_rules(id);

CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_transaction_id UUID NOT NULL REFERENCES payment_transactions(id),
    recipient_id UUID REFERENCES payment_recipients(id),
    recipient_key_snapshot VARCHAR(180) NOT NULL,
    recipient_type_snapshot VARCHAR(32) NOT NULL,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    entry_type VARCHAR(12) NOT NULL CHECK (entry_type IN ('ALLOCATION','REVERSAL')),
    reverses_allocation_id UUID REFERENCES payment_allocations(id),
    payment_refund_id UUID REFERENCES payment_refunds(id),
    settlement_id UUID REFERENCES payment_settlements(id),
    rule_id UUID REFERENCES settlement_rules(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK ((entry_type = 'ALLOCATION' AND reverses_allocation_id IS NULL AND payment_refund_id IS NULL) OR
           (entry_type = 'REVERSAL' AND reverses_allocation_id IS NOT NULL AND payment_refund_id IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_allocation_per_recipient ON payment_allocations(payment_transaction_id,recipient_key_snapshot) WHERE entry_type = 'ALLOCATION';
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_allocation_reversal ON payment_allocations(reverses_allocation_id,payment_refund_id) WHERE entry_type = 'REVERSAL';
CREATE INDEX IF NOT EXISTS idx_payment_allocations_transaction ON payment_allocations(payment_transaction_id,created_at);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_settlement ON payment_allocations(settlement_id) WHERE settlement_id IS NOT NULL;

ALTER TABLE payment_refunds
    ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(180),
    ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
    ADD CONSTRAINT payment_refunds_parent_check CHECK (payment_transaction_id IS NOT NULL) NOT VALID,
    ADD CONSTRAINT payment_refunds_status_check CHECK (status IN ('PENDING','SUCCEEDED','FAILED','COMPLETED','PROCESSING')) NOT VALID,
    ADD CONSTRAINT payment_refunds_amount_check CHECK (amount_paise > 0) NOT VALID;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_refund_idempotency ON payment_refunds(payment_transaction_id,idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE payment_settlements
    ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES payment_recipients(id),
    ADD COLUMN IF NOT EXISTS gateway_settlement_reference VARCHAR(240),
    ADD COLUMN IF NOT EXISTS failure_reason TEXT,
    ADD COLUMN IF NOT EXISTS allocation_count INTEGER NOT NULL DEFAULT 0,
    ADD CONSTRAINT payment_settlements_status_check CHECK (status IN ('PENDING','PROCESSING','COMPLETED','FAILED','CANCELLED','SETTLED','SUCCESS')) NOT VALID;
CREATE INDEX IF NOT EXISTS idx_payment_settlements_status ON payment_settlements(status,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_settlement_gateway_ref ON payment_settlements(gateway,gateway_settlement_reference) WHERE gateway_settlement_reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS payment_webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gateway VARCHAR(40) NOT NULL,
    gateway_event_id VARCHAR(240) NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    object_reference VARCHAR(240),
    payload JSONB NOT NULL DEFAULT '{}'::JSONB,
    processing_status VARCHAR(16) NOT NULL DEFAULT 'RECEIVED' CHECK (processing_status IN ('RECEIVED','PROCESSED','IGNORED','FAILED')),
    processing_error TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    UNIQUE(gateway,gateway_event_id)
);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_status ON payment_webhook_events(processing_status,received_at);

CREATE TABLE IF NOT EXISTS reconciliation_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gateway VARCHAR(40) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('RUNNING','COMPLETED','FAILED')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    summary JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_by UUID REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS reconciliation_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES reconciliation_runs(id),
    issue_type VARCHAR(48) NOT NULL,
    severity VARCHAR(12) NOT NULL DEFAULT 'WARNING' CHECK (severity IN ('INFO','WARNING','ERROR')),
    payment_transaction_id UUID REFERENCES payment_transactions(id),
    payment_settlement_id UUID REFERENCES payment_settlements(id),
    gateway_reference VARCHAR(240),
    expected_amount_paise BIGINT,
    actual_amount_paise BIGINT,
    details JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reconciliation_issues_run ON reconciliation_issues(run_id,issue_type);

CREATE OR REPLACE FUNCTION prevent_financial_record_delete() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Financial ledger records are immutable and cannot be deleted';
END;
$$ LANGUAGE plpgsql;
DO $$ BEGIN
    CREATE TRIGGER payment_transactions_no_delete BEFORE DELETE ON payment_transactions FOR EACH ROW EXECUTE FUNCTION prevent_financial_record_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TRIGGER payment_allocations_no_delete BEFORE DELETE ON payment_allocations FOR EACH ROW EXECUTE FUNCTION prevent_financial_record_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TRIGGER payment_refunds_no_delete BEFORE DELETE ON payment_refunds FOR EACH ROW EXECUTE FUNCTION prevent_financial_record_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TRIGGER payment_settlements_no_delete BEFORE DELETE ON payment_settlements FOR EACH ROW EXECUTE FUNCTION prevent_financial_record_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO subscription_plans(slug,name,description,amount_paise,billing_interval,status)
VALUES ('vistrah-membership','VISTRAH Membership','Monthly access to member information, provider discovery, and configured offers.',12900,'MONTHLY','ACTIVE')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO payment_recipients(recipient_key,recipient_type,gateway_account_reference,onboarding_status,verification_status,settlement_eligible,active)
VALUES ('vistrah-membership-revenue','VISTRAH','sbx_platform_merchant','VERIFIED','VERIFIED',TRUE,TRUE)
ON CONFLICT (recipient_key) DO NOTHING;

INSERT INTO settlement_rules(name,transaction_type,priority,active)
SELECT 'Membership revenue allocation','MEMBERSHIP',100,TRUE
WHERE NOT EXISTS (SELECT 1 FROM settlement_rules WHERE name='Membership revenue allocation');

INSERT INTO settlement_rule_targets(rule_id,recipient_id,basis,basis_points)
SELECT r.id, p.id, 'PERCENTAGE', 10000
FROM settlement_rules r CROSS JOIN payment_recipients p
WHERE r.name='Membership revenue allocation' AND p.recipient_key='vistrah-membership-revenue'
  AND NOT EXISTS (SELECT 1 FROM settlement_rule_targets t WHERE t.rule_id=r.id);
