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
