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
