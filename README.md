# VISTRAH

A functional local service marketplace built with Next.js App Router, React, TypeScript, FastAPI, SQLAlchemy, Alembic and PostgreSQL. Payments are explicitly sandbox-only. No cloud resources are created. VISTRAH Finds now supports [real API discovery](docs/JOB_SOURCES.md), private matching and public vacancies at `/jobs`; Admin > Job Sources manages acquisition. Remotive needs no credentials; Adzuna remains unconfigured until permitted access and credentials are supplied.

## Start the application

```sh
docker compose up --build
```

This workspace includes an ignored `.env` selecting **http://localhost:3100** for the website and **http://localhost:8100/docs** for API documentation, because the existing VISTRAH V1 containers use 3000 and 8000. Without that local `.env`, Compose defaults to **http://localhost:3000** and **http://localhost:8000/docs**. Copy `.env.example` to `.env` and choose free `WEB_PORT` and `API_PORT` values when setting up elsewhere.

Compose starts PostgreSQL, applies migrations, bootstraps the catalogue and plan once, and starts the API and frontend with health checks. Database and generated local signing secrets persist in named volumes. Ordinary startup, rebuilds and `docker compose down` preserve data. Database ports are not published; website and API bind to loopback only.

Create your own administrator interactively:

```sh
docker compose exec api python -m app.create_admin
```

There are no default admin credentials. Normal `/login` sends an ADMIN to the existing `/admin` dashboard and a CUSTOMER to `/account`. Explicit local return destinations, such as `/login?next=/admin/provider-requirements`, are preserved. Signed-in administrators see **Admin dashboard** in the desktop header and mobile navigation; the account sidebar also retains **Control center**. Anonymous admin visits redirect to login. Registration always creates a CUSTOMER; the backend checks roles for every admin endpoint.

Password recovery is available through **Forgot password?** on `/login`. Configure
authenticated SMTP privately in `.env` before real delivery; see
[authentication and recovery](docs/AUTHENTICATION.md) for provider settings, Gmail
App Password setup, reset security and safe isolated testing.

Stop without removing data:

```sh
docker compose down
```

**Destructive reset** (removes this Compose project's database and generated secret volumes):

```sh
docker compose down --volumes
docker compose up --build
```

Do not use the reset command against data you want to retain.

## What works

VISTRAH Finds is available at `/account/finds`, with job preparation plans, validated profiles/text uploads, permitted supplied vacancies, ranking, customer approval, factual drafts, checklists, results/evidence, retries, cancellation and durable history. `/admin/workflows` shows actual execution operations and worker/integration status. See [workflow engine](docs/WORKFLOWS.md) for actions, models, routes and remaining limitations. Compose now also runs the database-backed worker.

- A responsive public website with local illustrations, service search, eight categories, 59 services, deterministic routes, breadcrumbs and official email contact links.
- Official public contact: [info@vistrah.in](mailto:info@vistrah.in), centralized in `frontend/lib/contact.ts`. The existing `/call-vistrah` route now provides email contact. Service enquiry forms still save requests; personal/provider phone fields remain available. This public address does not configure a mailbox or SMTP delivery; see `docs/AUTHENTICATION.md` for recovery-email configuration.
- Customer registration, login, backend JWT validation, revocable sessions, HTTP-only cookies, profile editing and logout.
- Service requirement submission with persisted history and enforced request status transitions.
- Stored ₹129 membership plan, membership status, member-only service preparation guides and scoped offers with validity dates.
- An independent admin control center with real database counts, request review, catalogue CRUD and safe deletion, provider CRUD and evidence-based verification, provider/service association, offer configuration, sandbox transaction inspection, refunds, reconciliation and searchable/exportable immutable audit logs.
- Sandbox transaction creation with per-customer idempotency, signed webhook validation, replay handling, immutable credits and reversal records. Successful test events activate membership. Failed events do not. Refunds revoke the corresponding membership record. Renewals add another stored 30-day period and do not create automatic billing.

## Deliberately unfinished

The approved logo and photography were not supplied. The header uses a plain wordmark in its left-side position, with deliberate local vector illustrations. See [asset inventory](docs/ASSETS.md).

Source ingestion, acquisition jobs, source record review, company/shareholder/bank/employee management, general website/system settings, specialist marketing forms, service purchase checkout, live gateways, real refunds or disbursements, settlement recipients/rules/items and operational email/SMS notifications are not implemented. Their controls are omitted. Requests support administrator status review; individual staff/provider assignment is not yet represented by an assignment record. There is no email verification or automatic membership renewal. No fabricated providers, completed projects, customer testimonials or success metrics are seeded.

This is a working first version, not a declaration that every possible operational module in the larger specification is finished.

## Structure

```text
frontend/                 Next.js app, shared CSS/components, unit/browser tests
backend/app/              Models, schemas, authentication, catalogue, payment service, REST controllers
backend/migrations/       Versioned schema and append-only database triggers
backend/tests/            Backend integration tests
shared/catalogue.json     Canonical initial catalogue and member guide content
scripts/                  Explicit QA and catalogue authoring utilities
docs/                     Architecture, APIs, assets and validation records
compose.yaml              Local stack and persistent volumes
```

Catalogue JSON is used to bootstrap PostgreSQL, not as a fake API fallback. Public pages read the active catalogue from the API. Admin edits persist and are preserved by restart; bootstrap markers prevent recreating deleted catalogue records. To run a truly empty catalogue, set `SEED_CATALOGUE=false` before the first startup of a separate Compose project/database. Changing that flag does not erase an already populated database.

## Development and tests

Use Python 3.12+ and Node.js 22.13+ for the current application/test toolchain. Exact frontend versions and transitive dependencies are captured in `frontend/package-lock.json`; backend direct dependencies are pinned in `backend/requirements.txt` and the resolved dependency set is pinned in `backend/requirements.lock`. Docker installs the lockfile.

```sh
python -m venv .venv
# Windows: .venv\Scripts\python.exe -m pip install -r backend\requirements.lock
# Linux/macOS: .venv/bin/python -m pip install -r backend/requirements.lock
cd backend
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

Set `DATABASE_URL` to PostgreSQL for normal development. SQLite is a local smoke-test convenience, not the Compose production database. `JWT_SECRET` must have at least 32 characters if supplied; otherwise a random local secret is generated and persisted. Set `API_URL=http://127.0.0.1:8000` for a frontend outside Docker. Set `ALLOWED_ORIGINS` to the exact frontend origin if using a custom development port.

```sh
cd frontend
npm ci
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```

Backend SQLite integration suite:

```sh
cd backend
python -m pytest -q
```

Backend PostgreSQL suite against a separate, disposable test database:

```sh
docker compose exec db createdb -U vistrah vistrah_test
docker compose exec -e TEST_DATABASE_URL=postgresql+psycopg://vistrah:vistrah-local-only@db:5432/vistrah_test api python -m pytest -q -o cache_dir=/tmp/pytest-cache
```

The test fixtures use outer transactions and savepoints, including for application commits, and roll back their records after every test. Use a new test database for the fresh-migration test. Do not point `TEST_DATABASE_URL` at your normal application database.

Browser tests use installed Google Chrome by default. Set `BROWSER_CHANNEL=chromium` after `npx playwright install chromium` if Chrome is unavailable. Browser tests **create explicitly marked development QA records**. Run them only against a local development stack, ideally a separate Compose project. The PowerShell runner creates an explicit QA administrator with a random password held only for the test process:

```powershell
$env:BASE_URL='http://localhost:3100'
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-browser.ps1
```

Use `-DockerCommand` and `-NpmCommand` when those executables are not on PATH. The execution-policy override applies only to that test process. On other operating systems, set a random `QA_ADMIN_PASSWORD`, run `docker compose exec -e QA_MODE=true -e QA_ADMIN_PASSWORD api python -m app.qa_bootstrap`, then run `npm run test:e2e` in `frontend` with the same password and `BASE_URL` environment variables. The QA bootstrap refuses to alter an unrelated existing account. After successful tests, the runner deactivates exact QA providers and offers using `app.qa_cleanup`, preserving their historical records and audit evidence. Development customer/request/payment fixtures remain clearly marked in the local database.

See [architecture](docs/ARCHITECTURE.md), [API guide](docs/API.md), [validation results](docs/VALIDATION.md) and [security/deployment notes](docs/SECURITY.md).

Provider entry points, dynamic requirements, manual per-service review and private
evidence are documented in [provider onboarding](docs/PROVIDER_ONBOARDING.md).
Use admin **Provider Requirements** to draft/preview/publish service-specific forms
and **Provider Applications** to review submitted evidence.
