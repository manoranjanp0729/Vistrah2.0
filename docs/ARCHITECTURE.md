# Architecture

## Quick reference for Lean Mode

- Frontend: Next.js App Router, React and TypeScript in `frontend/`; public discovery/account/seller routes and a separate admin interface. Browser `/api/[...path]` proxies to FastAPI; server catalogue requests use the API directly.
- Backend: FastAPI and SQLAlchemy in `backend/app/`; Alembic migrations in `backend/migrations/`. Shared initial catalogue: `shared/catalogue.json`.
- Database/runtime: Compose services `web`, `api`, `worker`, `db`; PostgreSQL 16.6 with `postgres_data`, plus shared API/worker `api_data`. SQLite is supported for isolated tests/local configuration. API image startup migrates and seeds; worker runs `app.workflow_worker` separately. Frontend uses a compiled standalone image, not a source bind mount.
- Local URLs documented in README: frontend `localhost:3100`, API `localhost:8100`; Compose defaults are 3000/8000, configurable through environment variables.
- Start with [module map](module-map.md) and [current task](current-task.md). Detailed descriptions below are existing reference material; source changes and running-image status may differ.

The database-backed [workflow engine](WORKFLOWS.md) extends owned requests through customer Finds and admin operations. Compose adds a leased worker; migration 003 persists definitions, runs, dependencies, approvals, attempts, evidence and histories. Customer profiles/documents/results are excluded from admin workflow responses. The original preparation template and contracts remain unchanged. Migration 004 adds source budgets/leases, normalized public vacancies/provenance and per-action acquisition/page progress. `jobs.discover@2` is the narrowly allowed external read action in the same scheduler; provider code lives in reusable API adapters. Shared public listings at `/jobs` satisfy Remotive access requirements while owned profiles/results stay private. Submission remains disabled. See [job sources](JOB_SOURCES.md).

The frontend uses Next.js App Router and shared React templates. The public route group renders its header and footer; `/admin` has an independent sidebar and topbar. CSS custom properties and shared styles live in `frontend/app/globals.css`. All images are local and inventoried.

`frontend/lib/urls.ts` owns URL construction and route resolution. One catch-all catalogue route implements the specified disjoint structures without conflicting dynamic directory names:

- `/service/{category}`
- `/service/{category}/{subcategory}`
- `/service/{category}/service/{service}`
- `/service/{category}/{subcategory}/service/{service}`
- `/service/{category}/service/{service}/request`
- `/service/{category}/{subcategory}/{service}/request`
- `/service/{category}/{subcategory}/{service}/companies`
- `/service/{category}/{subcategory}/{service}/companies/{provider}`

Only valid catalogue relationships resolve. Unknown/inactive slugs return a Next.js 404. Provider destinations additionally require an active, verified provider associated with that exact service. Public directory data excludes private provenance and verification evidence.

Public server-rendered catalogue pages use the backend directly. Browser requests pass through `/api/[...path]`, which forwards the HTTP-only session token, checks mutation origins, limits request size and returns backend error codes. Tokens are not exposed to browser JavaScript or localStorage. Account display guards improve UX; backend ownership and role checks provide authorization.

FastAPI separates schemas, models, authentication, catalogue lookup, database session creation and the payment integration service. The REST controllers compose those modules and use one database transaction for each domain mutation and corresponding audit record. SQLAlchemy statements bind parameters. Alembic revision 001 uses a frozen schema snapshot; later revisions change that schema explicitly.

The canonical initial catalogue is seeded once. All application lookup uses PostgreSQL thereafter. The plan is stored as 12900 paise in INR with a 30-day validity period. No provider or customer records are part of normal seeding. Member preparation guides are stored in a separate table and exposed only through an authenticated membership-protected endpoint.

Sandbox gateway events are authenticated with HMAC-SHA256 and a five-minute timestamp window. Stored event IDs are immutable. Stable business-field hashes allow equivalent delivery retries but reject event ID reuse with a different payload. Payment row locks serialize webhook/refund updates. User locks serialize purchases and membership extensions. Unique keys backstop duplicate checkout, event, refund and allocation handling. Membership changes, successful-payment credits and event records commit atomically.

Allocation entries are append-only credits or reversals. Full refunds create a new refund record and reversal, then revoke the membership linked to that transaction. Reconciliation compares the net ledger to transaction status and appends results. Settlement eligibility is calculated from status and ledger balance; no settlement/disbursement action is exposed. Gateway replacement requires a genuine adapter and contract tests.

Audit, allocations, refunds, webhook events and reconciliation records have database triggers forbidding update/delete. Ordinary admin APIs expose no mutation of these histories. Database owners can manage schema/triggers, so this is application-level immutability rather than a tamper-proof external archive.

## Provider onboarding

The existing Provider/ProviderService directory now shares a versioned, declarative
requirements registry and authenticated application workflow. Alembic 005 adds
private application/evidence/history tables and per-service approval grants.
Backend directory and lead queries require global verification and activation
plus approval for the exact service. See [provider onboarding](PROVIDER_ONBOARDING.md)
for schemas, immutable versions, corrections and storage limits.
