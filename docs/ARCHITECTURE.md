# Architecture

Current source baseline: 13 October 2026. Runtime health and deployment are
separate evidence; see current-task.md and PRODUCTION_PLAN.md. The existing
application is a service/job marketplace with sandbox membership payments,
not a finished product-commerce platform.

## Components and dependencies

| Component | Implementation | Configuration / dependency authority |
|---|---|---|
| Desktop website | Next.js App Router, React, TypeScript; standalone image in frontend/ | frontend/package.json, package-lock.json, Dockerfile |
| Native app | Expo/React Native with Expo Router; Android APK profiles and iOS preparation | mobile/package.json, package-lock.json, app.json, app.config.js, eas.json |
| Phone website | Production React Native Web export from mobile/src, hosted under /app | frontend/Dockerfile.phone, infra/aws-test/Caddyfile.phone |
| Independent admin | Next.js app in admin/ with its own authentication/proxy and interface | admin/package.json, Dockerfile, admin/app/ |
| Shared API | FastAPI, SQLAlchemy, revocable JWT authentication, Alembic | backend/requirements.txt, requirements.lock, app/, migrations/ |
| Async worker | Database-backed leased workflow execution, source budgets and retries | backend/app/workflow_worker.py and workflow modules |
| Database | PostgreSQL 16.6 in normal Compose; SQLite or isolated PostgreSQL for tests | compose.yaml, backend/app/database.py |
| Reverse proxy | Caddy HTTPS and website/API/admin/phone routing for cloud testing | infra/aws-test/Caddyfile and compose.cloud.yaml |

Local normal URLs are website localhost:3100, API localhost:8100 and admin
localhost:3200 when using the documented .env template. Container ports are
3000 for web/admin and 8000 for API. Database ports remain unpublished.
Compose defaults without an env file differ; explicit environment selection
is required. Environment boundaries and commands are in ENVIRONMENTS.md.

## Shared API and authentication

- Native requests go to the shared API with a bearer JWT. SecureStore persists
  the native session; the API verifies issuer/audience/expiry and a revocable
  database session. Customer and seller use one identity; seller access is a
  capability with ownership checks. Administrator role checks remain independent.
- Desktop browser requests use frontend/app/api/[...path]/route.ts. The proxy
  holds the session in an HttpOnly cookie, validates mutation origins and body
  limits, strips token fields and preserves backend errors.
- The production phone website uses the same cookie proxy under /api, while
  rendering the native screen source under /app. Legacy website bookmarks are
  translated to native routes. Local Expo browser preview uses the loopback
  development proxy and a development API URL; it is not production cookie mode.
- The independent admin application uses its own cookie/proxy. Public website
  login does not automatically enter admin routes. Backend authorization is
  authoritative; UI visibility is not an access-control boundary.
- Password recovery uses hashed, expiring single-use tokens, neutral responses,
  persistent throttles and session revocation. Actual SMTP delivery requires
  private configuration and a real acceptance/inbox check.

All clients share PostgreSQL-backed business, service, account and job data.
Client-specific layouts do not create separate backends or databases.

## Discovery, services and seller workflows

The initial shared/catalogue.json bootstraps catalogue data. Runtime catalogue
lookup/editing reads PostgreSQL, not a JSON fallback. Website URL construction
and relation checks live in frontend/lib/urls.ts; native catalogue/service IDs
and the synthetic Find Jobs entry live in mobile/src/lib/catalogue.ts.

Public catalogue browsing and public job listings are available separately
from membership-protected provider information, preparation guides and service
enquiries. The three service pathways remain Find Service Provider, VISTRAH
Recommended and VISTRAH Services. Enquiries request human review; they do not
create bookings or guarantee provider availability.

Business ownership, private evidence, provider applications and each service
listing require their existing review gates. Published requirement versions,
conditional form rules and proposed publication changes retain revision guards
and histories. Seller dashboards expose owned businesses, listings and leads;
admin reviews do not expose private customer workflow profiles/results.
Employer jobs are drafted for an owned business and independently approved
before eligible public publication.

Homepage migration 013, admin /admin/homepage and GET /homepage now provide
private draft/publish/restore configuration for banners, grids and carousels.
Desktop and native/shared-phone clients render the same published sequence;
the original source-composed homepage remains the fallback. Provider requirement
and publication editors retain their separate purpose. Source implementation
has not migrated/replaced the normal runtime; see the Phase 3 rollout gate.

## Payments and production boundary

Current payment checkout purchases a sandbox membership plan only. Commerce
migration 015 provides private carts and an unpaid development-only TEST order
request/confirmation/fulfilment lifecycle. /commerce/orders is separate from
/me/orders (enquiry history). Client cart/order screens and live ordering remain
pending; no tax invoice, gateway charge or appointment reservation is implied. Payment amount/ownership/signature/timestamp,
idempotency and refund/reconciliation rules are enforced on the API; financial
history is append-only at the application/database-trigger level.

Sandbox paid access qualifies only under explicitly configured development.
Production membership access fails closed because a real gateway/entitlement
adapter is not implemented. Phase 5 must extend the sandbox-only model through
reviewed migrations/tests; changing APP_ENV alone or weakening membership
checks is not a production payment integration.

Phase 4 defines the commerce domain and shared order contract; Phase 5 supplies
verified live payment events and entitlement/refund behavior. Existing service
enquiries and seller approval semantics remain distinct.

## Worker and external integrations

Finds/workflow execution persists definitions, inputs, dependencies, approvals,
leases, attempts, private documents/results and histories. External job
acquisition reads approved configured sources through budgeted adapters;
public jobs read the cache. Execution completion does not imply every source
succeeded, nor does it submit candidate applications.

Workflow/source launch is explicit. Copied cloud plans must be reviewed before
starting the worker. Existing temporary cloud configuration keeps the worker
optional and source acquisition disabled. Customer location is temporary unless
explicitly saved; GPS/geocoding requires the opt-in chooser and preserves manual
fallback/privacy. Existing MapTiler keys are public, restricted client keys;
new provider/billing choices require separate authorization.

## Persistence, schema and deployment

- Named PostgreSQL volumes retain records across container replacement/restart.
  Private evidence is currently stored in the database. Bundled public images
  live in frontend/public and mobile/assets; no S3 media system is implemented.
- The backend Dockerfile default command migrates and seeds on startup.
  compose.api-runtime.yaml and the cloud test runtime run Uvicorn directly after
  controlled schema rollout. Normal restart verification must use the existing
  controlled runtime and never silently migrate or seed the normal database.
- Migration 012 adds employer jobs; source migration 013 adds homepage draft and
  immutable published history without seeding content. Migrations and domain tests must first run
  against disposable data; normal rollout needs backup/recovery and explicit
  authorization. Existing requirements/publication schemas retain immutability
  triggers and history guards.
- Dockerfiles use pinned base versions and non-root runtime users; web/admin
  use standalone production bundles. Source pushes do not rebuild running
  containers, the shared phone export or installed APKs.
- Native icons/splash/modules need a new native build. Native startup/loading
  and first-run light theme are implemented; saved preferences are respected.
- AWS Terraform provisions a temporary EC2/VPC/subnet/security-group test stack.
  The earlier trial was deployed and HTTPS verified, but teardown was requested;
  current availability is unconfirmed. The root disk is deleted on termination,
  including host-bound Docker volumes. Domain registration/local data are separate.
- The cloud test Compose explicitly uses development/sandbox mode. Phase 7
  creates staging/production wiring after live application and security gates;
  environment templates alone are not production-ready deployment manifests.

## Verification and roadmap

Dependency manifests/locks are authoritative; do not force-upgrade framework
trees to resolve file locks. Current mobile npm audit findings require triage in
Phase 6 (or earlier for exposed/runtime risk); older zero-advisory records are
historical. Unit/integration tests and scoped builds do not replace physical
Android/browser, live gateway, SMTP, backup and production rollout verification.

Use module-map.md to find code, API.md for routes, MOBILE.md for device/build
details, SECURITY.md for current safeguards/limits, and PRODUCTION_PLAN.md for
phase completion gates. Only read the references relevant to the current task.

Commerce operator is explicit SELLER or admin-created VISTRAH (services only),
not inferred from names. Seller-entered stock batch quantity, delivery methods/
fees and cancellation cutoffs are proposed/unpublished until independent review;
admin approval requires an acknowledgement of configured terms. Cart/request
holds no units; confirmation atomically allocates approved stock. Cancellable
orders return that allocation once; completed sales retain it. Order price and
policy snapshots survive later listing edits. VISTRAH services are managed by
admin-owned businesses and fulfilled via admin-only transitions. Seller-managed
orders retain current business ownership guards. Mutations are development-only
until live tax/payment/refund integration; all operational/release gates remain.
