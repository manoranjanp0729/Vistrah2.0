# Validation record

Validated locally on 9 October 2026. The current local application, including Phase 2 discovery, passes the checks below. The broader specification's omitted modules are listed in README; these results do not claim those modules are implemented.

| Check | Result |
|---|---|
| Frontend lint | Passed, no errors or warnings |
| TypeScript | Passed |
| Next.js production build | Passed locally and inside Docker |
| Frontend unit tests | 16 passed (14 previous + 2 discovery presentation tests) |
| Backend integration tests, SQLite | 82 passed (55 previous + 27 source/acquisition cases) |
| Backend integration tests, PostgreSQL | 82 passed against `vistrah_discovery_fresh_20261009`; all previous tests remain active |
| Chrome end-to-end tests | 21 deterministic passed (15 previous + 6 discovery checks); 1 separate live-source smoke passed |
| Migrations | Revision 004 applied incrementally without resets; full 001–004 chain passed on a new isolated PostgreSQL database |
| Empty catalogue | Separate fresh PostgreSQL stack plus headless Chrome checks passed |
| Compose | PostgreSQL, API, workflow worker and frontend are healthy |
| Restart persistence | Stored record counts and SHA-256 fingerprint remained identical after restarting API and frontend; all services returned healthy |
| Workflow restart recovery | Passed with a committed unfinished lease: import retained at one attempt, normalization recovered once, customer approval enforced, all five actions completed |
| Full workflow record persistence | Marketplace, workflow, document, approval, attempt, evidence, source, vacancy, provenance and acquisition fingerprint stayed identical after a controlled API/frontend/worker restart |
| Frontend dependency audit | Zero known advisories across production and development dependencies |
| Full backend dependency audit | Zero known advisories across the pinned resolved dependency set |

Backend tests cover registration, password hashing, JWT/session revocation, profile persistence, customer/admin authorization, all 59 catalogue service lookups, unknown slugs, catalogue seeding/edit preservation, CRUD/safe deletion, requests/ownership/state transitions, provider evidence/activation/associations, membership-protected information, scoped/time-limited offers, checkout idempotency, failed payments, webhook signatures/amounts/timestamps/conflicting outcomes, refunds/reversals, reconciliation, audit export and database-enforced immutability.

Chrome tests directly load generated category, subcategory, service, request and provider-directory URLs, plus customer/admin/public routes. Unknown category, subcategory, service, provider and account/admin sections return HTTP 404. Search opens the exact selected service; call links use the specified telephone destination. Customer and admin mutations were checked after reload to confirm persistence. Cross-origin mutation rejection and HTTP-only cookies were checked.

Public and loaded admin pages were checked at **1440, 1024, 768 and 390 pixels**, including mobile navigation/sidebar controls, service images and horizontally scrollable tables. No document-level horizontal overflow or broken images were observed on the checked pages. Screenshots are in the ignored `artifacts/` directory: `home-{width}.png`, `admin-{width}.png`, and `empty-catalogue-mobile.png`. This is Chromium/Chrome coverage; Safari/Firefox were not tested.

Empty-catalogue testing used a distinct Compose project, distinct persistent PostgreSQL volume and ports 3101/8101. It confirmed the catalogue API returns an empty list, the homepage/catalogue/search render meaningful empty states, absent categories return 404, the plan remains available and the mobile page fits its viewport.

Normal startup seeds no users/providers. Browser tests create explicitly labelled development QA records. Exact test categories are removed through the normal safe-deletion API; QA providers and offers are deactivated after testing, while customer/request/payment/audit history remains in the local development database.

One non-failing backend warning remains: Starlette's TestClient reports that its httpx compatibility path is deprecated. Runtime API functionality and the entire test suite pass. The initial browser QA found a registration label problem and an origin mismatch behind Docker's external port; both were fixed and the complete browser suite passed afterward.

Cloud deployment, live payments, real settlements, email/SMS delivery, approved brand assets and the additional omitted operational modules were not tested or claimed as complete.

## VISTRAH Finds extension

Workflow tests cover owned request creation, missing/invalid information, safe source URLs, text upload validation/ownership, customer/admin separation, frozen inputs, prerequisites, approval/rejection, duplicate start/claim prevention, idempotency conflicts, complete deterministic preparation and evidence, manual application status, sanitized errors, retries preserving completed work, timeouts/attempt limits, interruption/stale results, cancellation, unavailable integrations, normalization/deduplication, append-only events, closed/unsupported requests, approval-backlog scheduling, body limits, admin retry guards and a registered non-job input/result contract using the same scheduler.

Chrome tests execute real text upload, input reload persistence, unsaved-edit start guards, frozen profile review, the actual Compose worker, approval across reload, scoped authorization, explained matches, downloaded drafts, source evidence, reported application-status persistence, rejection/partial results and cancellation. Customer Finds and loaded admin operations fit 1440, 1024, 768 and 390 pixels without document overflow. Screenshots: `artifacts/finds-{width}.png` and `artifacts/workflow-admin-{width}.png`. Fixtures are explicitly labelled Development QA with deterministic `example.com` vacancy references; no source URL is fetched.

The controlled restart check stopped the worker, created labelled QA data, completed import and committed an unfinished normalization lease. API/frontend were restarted; the worker recovered the expired lease without repeating import, waited for customer approval, then completed preparation. Attempt counts were `[1,2,1,1,1]`, with the first normalization attempt recorded as interrupted. No database volumes or prior application records were deleted.

Initial extension checks found and fixed a missing declared checklist dependency and JSX syntax error. The existing migration assertion advances to 003 and additionally checks the new table is empty. All original functional tests remain active. Dependency versions were unchanged during this extension; audit results above are from the original baseline.

Final guards additionally reject retry eligibility after cancellation and reject NUL/binary controls or invalid Unicode before persistence. Workflow validation responses contain safe field/message information without echoing private profile or document values.

See [workflow delivery details](WORKFLOWS.md) for models, transitions, installed actions, endpoints, files and limits. At the original workflow baseline, automated discovery, submission and tracking were unavailable. Phase 2 below adds real discovery; submission and tracking remain unavailable; other verticals are disabled/planned. Drafts are rule-based preparation using supplied facts. Uploads support UTF-8 text only.


## Phase 2 real discovery

Both implemented sources were researched against their official documentation and terms: [Remotive](https://github.com/remotive-com/remote-jobs-api/blob/master/README.md), [Adzuna search](https://developer.adzuna.com/docs/search) and [Adzuna terms](https://developer.adzuna.com/docs/terms_of_service). See [source configuration and limitations](JOB_SOURCES.md).

The genuine Remotive smoke through the ordinary Compose worker succeeded on 9 October 2026 at 08:43 UTC: **19 records retrieved, zero invalid, one API request, five displayed smoke matches**. All 19 normalized vacancies and source provenance records are publicly readable without an account. The subsequent optional Chrome smoke used that same genuine cache, registered a labelled QA customer, matched an actual vacancy, created the existing preparation plan, enforced customer approval and completed all five preparation actions. No extra Remotive request was required. Adzuna UK normalization, pagination, error handling and quotas were tested with mocked HTTP only; no Adzuna credentials or permission confirmation were supplied, so it remains `not_configured` and disabled. No live Adzuna success is claimed.

The **27 new backend cases** cover configuration and missing credentials/access, successful API normalization, missing optional information, HTML stripping, invalid response shapes and records, pagination/page limits, response-size limits, fixed destinations/redirect rejection/private-address rejection, 429/backoff, timeouts, global quotas/source overlap, shared-cache reuse, source-ID/URL/fingerprint deduplication, conservative separate vacancies, cross-source provenance, partial/all-unavailable outcomes, source-level retry/page continuation, credential log/response/link redaction, customer/admin authorization, admin idempotency, expired action recovery, committed progress replay, stale evidence/status, access withdrawal, source selection and preparation ownership. They use isolated databases and HTTP mock transports; no provider quota or paid credentials are needed. All 55 earlier marketplace/workflow tests still pass.

The deterministic Chrome suite runs **21 passing tests**; its optional live smoke is skipped by default and was run separately with `LIVE_SOURCE_SMOKE=true`. New coverage includes actual worker handling of unconfigured Adzuna, saved/reloaded search criteria, no synthetic fallback, customer/admin separation, public-page access, a clearly labelled browser-only mock for partial-result/preparation-error presentation, and public/source-admin layouts at **1440, 1024, 768 and 390 pixels**. That browser mock is never written into the provider cache. Screenshots: `artifacts/public-jobs-{width}.png` and `artifacts/job-source-admin-{width}.png`. Document overflow checks passed at every tested width.

Final lint, TypeScript and frontend unit checks passed. Production builds passed locally and in Docker. Migration 004 adds five tables: `job_sources`, `vacancies`, `vacancy_provenance`, `job_acquisitions`, `job_acquisition_sources`. Fresh PostgreSQL migration/test coverage and incremental application migration both passed; no volumes or application records were deleted/reset. After the controlled restart, all four services returned healthy, and the SHA-256 fingerprint of the stored marketplace/workflow/discovery records remained identical: `8c7e6453a08330b6866a3b708d7bfbdf09facab0d65aa83ed20959e70f8ea278`. It included 19 vacancies/provenance records and four acquisition/source-progress records, alongside all existing account/payment/workflow history. Worker heartbeat is excluded because it changes normally.

Initial checks found lint issues in the new public page's empty catch/unused initializer; both were corrected. The first extended browser run passed 20/21 tests and failed one assertion that expected an internal `NOT_CONFIGURED` code in the customer-facing explanation. The UI correctly showed the readable missing-credentials/access message; the assertion was corrected, then the entire suite passed. No final test failures remain. The pre-existing non-failing Starlette/httpx deprecation warning remains; Playwright also reports an informational color-environment warning. Dependency versions are unchanged; dependency audit results above are the original baseline, not a new audit.

Known limits: Remotive is a delayed remote-only feed and is refreshed at most once per six hours; Adzuna is UK-only and needs permitted access/credentials. Search matching is a keyword heuristic and does not prove geographic or experience eligibility. Optional source fields remain unknown, descriptions are bounded plain text and predicted salaries are excluded. Sources do not establish confirmed closure; retrieval age determines stale presentation. Schedules are not implemented/enabled. Submission, automatic external status tracking, other vertical adapters and live payments remain outside this delivery. A single existing Compose worker and bounded manual searches are the tested operating mode.

## Typography refinement - 9 October 2026

The application-wide typography refinement is implemented in the existing shared
stylesheet, root font definitions and layout. See [TYPOGRAPHY.md](TYPOGRAPHY.md)
for the audit, complete file inventory, token scale, role assignments and font
loading/licensing details. All public/account/Finds/admin templates inherit this
system; no backend, authentication, workflow, API, database, dependency or local
environment configuration changes were made.

Validation completed:

- ESLint and `tsc --noEmit` passed.
- Frontend unit suite: **16 passing tests** across three files.
- Full deterministic Chrome suite: **24 passing tests**, with the optional
  genuine-source smoke skipped. It exercises registration/profile, requests,
  sandbox membership, provider/catalogue/offer CRUD, ledgers/audit, Finds inputs,
  uploads/approval/drafts/history, real worker failure presentation and responsive
  public/account/workflow/admin layouts.
- The final **three focused typography tests** also passed after the wordmark
  containment adjustment. They verify real Inter and DM Serif Display faces,
  available UI weights, genuine editorial italics, local font requests,
  `font-synthesis:none`, cumulative layout shift below 0.1 with deliberately
  delayed fonts, one normal Inter download on a fresh authenticated admin load,
  Inter ledger text, dialogs at 1440/768/390/320px, header containment and preserved
  single-line wordmarks at 200% text size.
- Narrow public layouts passed at **320, 390, 768 and 1440px**, including 200% text
  at 390px. Existing responsive functional checks also cover 1024px. Loaded
  workflow/source-admin and account profile/Finds views passed at 390px with
  200% text and no document overflow. Tables and account navigation retain their
  intentional local horizontal scrolling.
- A final read-only public audit covered homepage, services, service detail,
  membership, login, registration, contact and public vacancies at
  **1440/1024/768/390/320px**: **40 page/viewport checks**, with no document overflow,
  visible heading/control clipping or computed text-contrast failures. The audit
  excludes hidden screen-reader labels, decorative SVGs and disabled controls.
- Production builds passed locally and in Docker. The local web and API health
  endpoints returned HTTP 200. Only the local web container was recreated;
  existing API/worker/database services, volumes and records were retained.

Representative screenshots were reviewed for public desktop/mobile pages,
account/Finds, workflow/admin views and dialogs, including enlarged-text account
and workflow screens. Local screenshots are in `artifacts/` and
`artifacts/typography/`; the current Playwright report is generated in
`frontend/playwright-report/`.

Responsive review identified and corrected fixed-height headers at 200% text,
long workflow status badges, intrinsic workflow filter widths, long identifiers
and stat-card reading space. Existing branded wordmark fonts/sizes/tracking are
preserved and protected from wrapping. UI text shades were strengthened for
contrast while retaining brand greens and backgrounds. No unresolved typography
regressions remain in the checked views.

Verification limits: Chrome was used; Safari/Firefox were not run. Every generated
service/provider/request destination was HTTP-smoke-checked, but every individual
data-specific page and every possible error/empty state was not visually reviewed.
The generic runtime error boundary was not deliberately triggered. Actual Adzuna
vacancy pages could not be inspected because credentials/access remain
unconfigured; shared vacancy rendering was exercised with the existing Remotive
cache and the existing labelled browser fixture. The optional live-source smoke
was intentionally left disabled for this typography task. Backend tests were not
rerun because backend code/contracts/schema were unchanged.

The existing browser fixture lifecycle was used. QA providers/offers were
selectively deactivated after successful runs; historical records were preserved.
Only explicit QA catalogue fixtures were created/removed by the existing CRUD
tests. No non-QA application records or volumes were reset/deleted. No deployment, DNS or local
port/environment configuration changes were performed.

## Phase 4: application-wide real imagery

See [the imagery audit and inventory](IMAGERY.md) for complete route/section
coverage, all 21 licensed photo files, credits, dimensions and crop decisions.

ESLint, TypeScript, 19 unit tests and local/Docker production builds passed.
The complete browser suite passed 29 tests with one optional live-source test
skipped. Public imagery was checked at 1440/1024/768/390/320px; account and all
admin sections at 1440/1024/768/390px. Every seeded category/service route and
provider directory had a locally loaded photograph. Responsive image bounds,
ratios, lazy loading, local-only requests, explicit image failure, CLS below 0.1
and the existing 200% typography checks passed.

Source images and rendered crops were reviewed. A genuine vacancy from the
existing Remotive cache and a labelled QA provider detail were visually checked
at desktop/tablet/mobile sizes. Both final focused registration/request/admin-CRUD
regression tests passed, including provider-placement screenshots at three widths.
Chrome was used; Safari/Firefox and a deliberately induced runtime-error boundary
were not exercised. Live acquisition was not requested or run.

Artifacts: `artifacts/imagery/`; the latest Playwright report is in
`frontend/playwright-report/`. Existing branding, fonts, APIs, workflows, schema,
non-QA data, environment files and deployment settings were preserved. The local
web runtime was rebuilt; no deployment or DNS changes were made.

## Service landing pages and Explore listings — 9 October 2026

Implementation, route changes, six pathway behaviors, source availability and
the changed-file inventory are in [SERVICE_DISCOVERY.md](SERVICE_DISCOVERY.md).
Testing was scoped to this feature, not the earlier full application matrices.

### Frontend checks

From `frontend`, using the existing portable Node 22.16.0 installation:

```powershell
npm.cmd run typecheck
npm.cmd run test -- lib/urls.test.ts lib/service-pathways.test.ts lib/explore.test.ts
npm.cmd exec eslint -- lib/contact.ts lib/service-pathways.ts lib/service-pathways.test.ts lib/explore.ts lib/explore.test.ts lib/urls.ts components/service-pathways.tsx components/service-explore.tsx components/catalogue-templates.tsx components/customer.tsx components/shell.tsx components/ui.tsx 'app/(public)/service/[...segments]/page.tsx' 'app/(public)/call-vistrah/page.tsx'
npm.cmd exec eslint -- e2e/service-discovery.spec.ts components/shell.tsx components/ui.tsx 'app/(public)/call-vistrah/page.tsx'
npm.cmd exec eslint -- e2e/service-discovery.spec.ts e2e/marketplace.spec.ts
npm.cmd exec eslint -- e2e/service-discovery.spec.ts
```

TypeScript and all scoped lint commands passed. The last e2e-file lint was run
again after adding accessibility coverage. All **16 targeted unit tests passed**:
canonical routing, all 59 pathway/directory destinations, required ordering,
safe enquiry-purpose parsing, phone fallback, disabled category feeds, cache
provenance preservation, empty cache and timeout/error states. No source adapter
was changed or enabled; no live external retrieval was used.

### Backend endpoint checks

From `backend`, against the isolated default SQLite test database:

```powershell
..\.venv\Scripts\python.exe -m pytest tests/test_service_discovery.py tests/test_marketplace.py::test_requests_persist_and_enforce_state_transitions tests/test_marketplace.py::test_request_validation tests/test_marketplace.py::test_provider_verification_and_association tests/test_discovery_access.py::test_source_access_revocation_hides_cached_listing_without_erasing_history -q
```

All **six tests passed**. They cover authenticated enquiry persistence and owner
isolation, catalogue service validation, request validation, active/verified
service-associated provider filtering and revoked-access cached-job suppression.
Tests use transactional fixtures, not the application's PostgreSQL volume.
The existing Starlette test-client deprecation warning was reported; no dependency
or application backend change was made.

### Targeted browser checks

The temporary development server used port 3120 with process-only
`API_URL=http://127.0.0.1:8100` and, for mutation checks,
`ALLOWED_ORIGINS=http://localhost:3120,http://127.0.0.1:3120`.
Environment files and Compose configuration were not edited. The temporary
server was stopped after validation.

Commands from `frontend`:

```powershell
# BASE_URL=http://localhost:3120
npm.cmd run test:e2e -- e2e/service-discovery.spec.ts
npm.cmd run test:e2e -- e2e/service-discovery.spec.ts --grep 'service-specific enquiry'

# BASE_URL=http://localhost:3100, built local web runtime
npm.cmd run test:e2e -- e2e/service-discovery.spec.ts e2e/marketplace.spec.ts --grep 'service-specific enquiry|search opens'
npm.cmd run test:e2e -- e2e/service-discovery.spec.ts --grep '200% text'
```

Five distinct browser tests passed across these scoped invocations:

1. Every active catalogue service page and provider directory loads; all six
   titles are ordered before Explore; unknown service/provider routes return 404.
2. Nine representative services (all eight categories plus the nested outdoor
   service) at **1440/768/390px**: correct actions, truthful unavailable states,
   six-card order, category Explore, genuine cached vacancy links/IDs/attribution,
   distinct publication/retrieval times, no invented listing images or overflow.
3. Registration continuation with recommendation purpose, short-requirement
   validation, successful request confirmation, persistence after account reload,
   invalid-service rejection, cross-origin rejection and a separate normal
   property enquiry. This passed in development and on the built port-3100 app.
4. Existing search-to-exact-service and direct official telephone link test,
   updated for the new landing-page action; passed on port 3100.
5. Jobs and property Explore/pathway wrapping at **390px and 200% text**, including
   the service-options anchor clearing the sticky header; passed on port 3100.

The initial run passed route and responsive checks but the enquiry test exposed
the temporary origin mismatch. After fixing the process-only origin setting,
the test exposed its own reload-before-navigation race. Adding an explicit URL
wait fixed that assertion without changing application routing or authorization.
Only the failed enquiry test was rerun, not all browser suites.

A read-only `.tools/inspect-service-discovery.cjs` inspection checked Jobs and
Real Estate at desktop/mobile widths, real hero-image decoding, six cards,
200% text, API health and the existing **19-vacancy cache**. Its initial production
pass found a 10px overflow from the new jobs Explore link inheriting `nowrap`.
A scoped wrapping rule fixed it; the script then passed against development.
Final anchor review also found sticky-header overlap; a scoped scroll margin and
the targeted production browser assertion fixed it. No clipping is hidden by
overflow suppression and no checks were weakened.

Screenshots were visually reviewed; artifacts are in
`artifacts/service-discovery/`. The latest Playwright HTML report corresponds to
the final focused accessibility run, not a full-suite run.

### Local runtime and intentional omissions

Only the web image/container was rebuilt:

```powershell
docker compose up --build -d --no-deps web
```

Production compilation and its TypeScript stage passed. The web-only command was
used for the feature, then for the two independently found CSS regressions so
port 3100 serves the corrected code. Dependency layers were cached. API, worker
and database containers were not rebuilt/recreated. No local standalone build,
complete backend suite, PostgreSQL test matrix, full browser suite, live source
acquisition, payment matrix or unrelated admin/workflow regression was run.
There is no application schema/migration change to validate. Browser enquiry
persistence exercised the existing local PostgreSQL-backed API.

Chrome was used. Safari/Firefox and additional non-job external sources were
not tested; those sources remain disabled. Positive provider filtering/detail
behavior was verified in isolated backend tests; no new provider fixtures were
published to the local catalogue. Clearly labelled browser-QA enquiries/customers
remain as test history. Existing non-QA data, volumes, auth and local settings
were preserved. No deployment, DNS or hosting changes were made.


## Provider onboarding, requirements and manual approval - 9 October 2026

This entry supersedes earlier feature-specific statements about unchanged provider
schemas/runtime. See [provider onboarding](PROVIDER_ONBOARDING.md) for changed
files, configuration examples, security limits and reviewer instructions.

### Executed checks

| Check | Actual final result |
| --- | --- |
| `npm run lint` | Passed; 0 errors, 0 warnings. |
| `npm run typecheck` | Passed. |
| `npm test` | 35 passed, 8 files. Includes 4 provider condition/visibility/status tests and existing frontend integration/unit checks. |
| SQLite focused backend checks | 12 passed, 1 existing Starlette/httpx deprecation warning; final run 5.56 seconds. |
| Fresh isolated PostgreSQL focused backend checks | 12 passed, 1 existing Starlette/httpx deprecation warning; final run 5.05 seconds. |
| Isolated Chrome provider browser checks | 5 passed in 41.4 seconds. |
| Final local app read-only category/browser smoke | 1 passed in 6.8 seconds; all 8 categories checked across desktop/mobile widths. |
| Production frontend build in Docker | Passed compilation, TypeScript, page generation and standalone image build. Final web build used `docker compose build web`; API image also built successfully. |
| `npm run audit:images -- --write` | 0 errors; 100 registry contexts, 59 services. Two previously documented specialist photo omissions remain; no new photos or missing contexts introduced. |
| Existing-data preservation | All 12 selected existing-table aggregate row fingerprints and counts matched before/after the local additive migration. |

Focused backend command (inside `backend`, with a separate test database):

```text
python -m pytest tests/test_provider_onboarding.py tests/test_service_discovery.py tests/test_marketplace.py::test_provider_verification_and_association -q --tb=short
```

SQLite used a newly created `provider-final-check.db` test file, never the normal
application database. PostgreSQL and complete browser journeys used project
`vistrah-provider-check`, its own temporary tmpfs database, random process-only
credentials and disabled external acquisition. `.tools/test-provider-onboarding.ps1`
ran fresh migrations, created the isolated QA administrator, ran the command above,
then `npm run test:e2e -- e2e/provider-onboarding.spec.ts`. Its final cleanup removed
only the named test project's containers/network, without deleting app volumes.
The Chrome runner emitted a harmless NO_COLOR/FORCE_COLOR environment warning.

Backend coverage includes all 59 real service IDs, distinct templates, conditional
requirements, declared non-applicability, server-side answer validation, tampering,
unauthorized review/configuration management, private application/document ownership,
binary downloads, disguised content, body/depth/non-finite JSON limits, stale writes,
manual checklist enforcement, immutable DB configuration/history guards, effective
version selection, explicit adoption/resubmission, requested versus newer published
versions, retirement protection for pending corrections, admin-only history data,
exact-service public visibility, lead eligibility and service suspension.

Browser coverage:

1. All category pages keep the customer anchor and link to the correct real category
   ID for onboarding. Desktop/mobile wrapping and anonymous login return context pass.
2. Resume Building plus Interview Preparation share common information once, render
   different questions, save/reload drafts, submit, receive independent manual review,
   and list only the approved service. Account status/history navigation works.
3. Mobile Real Estate conditionals hide/show authority evidence; missing evidence
   blocks submission. A valid PNG uploads privately and downloads byte-for-byte;
   authentication, no-store/nosniff and the document-specific sandbox CSP are checked.
   Manual approval then allows the public listing.
4. Admin creates a draft, cannot publish an invalid forward condition, previews the
   normalized form, publishes a valid version, and opens the immutable previous one.
5. A reviewer requests one configuration version, a newer version is published,
   and the applicant previews/adopts the exact requested version, retains unchanged
   answers, renews declarations and resubmits with explicit version acknowledgement.

Screenshots visually inspected: `artifacts/provider-onboarding/submitted-mobile.png`,
`manual-service-review-desktop.png`, and `provider-account-desktop.png`.
`requirements-preview-desktop.png` also records the tested admin form preview.

### Local migration and preservation

Only API and web containers were refreshed after the isolated checks passed:

```text
docker compose up -d --no-deps --wait --wait-timeout 90 api web
```

Startup applied Alembic **005** after 004 and initialized 59 published version 1
configurations for 59 existing services. Normal DB verification found **0 provider
applications and 0 supporting documents**: positive browser fixtures stayed isolated.
All 15 pre-existing service associations retained their original rows/eligibility
and received the documented legacy approval backfill. Normal app API/web, database
and worker were healthy; database and worker containers were not recreated.

Preservation fingerprints cover these existing tables and row counts:

| Table | Preserved rows |
| --- | ---: |
| users | 112 |
| categories | 8 |
| subcategories | 1 |
| services | 59 |
| providers | 15 |
| provider_services (original columns) | 15 |
| service_requests | 114 |
| payments | 16 |
| memberships | 16 |
| plans | 1 |
| offers | 14 |
| service_information | 59 |

The read-only snapshot helper hashes complete selected row sets without printing
row contents or credentials. New schema columns/configuration records and normal
bootstrap metadata are expected additions. Running job acquisition histories were
not frozen or compared; the existing worker remained running.

### Fixed findings and boundaries

The first isolated PostgreSQL run caught a trigger comparing JSON with an unsupported
operator; the guard now compares JSONB and passes direct mutation tests. Browser
assertions caught Next's global CSP overriding attachment headers; a narrowly scoped
private-document CSP now passes through the browser-facing route. A later requested
version no longer changes the version preview. Applicant history strips reviewer
checklists while full immutable admin history remains available.

Legal applicability, authority, credentials and evidence authenticity remain manual;
there is no government/professional-register lookup or malware scanner. Downloads
use authenticated attachment access, without inline previews or signed storage URLs.
Nested groups/group uploads are unsupported; account file quotas and the 100-event
history display limit are documented in the provider guide. No external notification
or automatic lead matching was added; the admin's working manual assignment action
uses the existing service requests and backend eligibility gate.

No complete backend/payment/database matrix, full unrelated workflow/admin browser
suite, external source acquisition, Firefox or Safari run was needed or performed.
No application data reset, environment edit, Docker volume deletion, remote
provisioning/deployment, paid infrastructure or DNS change occurred.

## Admin dashboard access - 10 October 2026

The existing `/admin/[[...section]]` route, dashboard and Provider Requirements
already rendered for an authenticated ADMIN. Before the fix, normal login always
sent administrators to `/account`, and both public header menus linked to
`/account` with "My account" for every authenticated role. Anonymous admin visits
showed a sign-in prompt instead of redirecting. Browser reproduction confirmed
these behaviors without runtime errors. Session hydration and backend role checks
were correct; all 41 admin endpoints use the existing administrator dependency.
The development QA administrator existed with the ADMIN role; no new account or
role/password change was needed.

Changes use the existing components: `frontend/components/customer.tsx` selects
`/admin` after ordinary ADMIN login while preserving validated explicit return
destinations; `frontend/components/shell.tsx` exposes "Admin dashboard" on desktop
and mobile for ADMIN; `frontend/components/admin.tsx` redirects anonymous visitors
to login with the requested admin section as `next`. CUSTOMER denial remains
intact. README documents these entry points. Regression coverage was added in
`frontend/e2e/admin-access.spec.ts` and `backend/tests/test_admin_access.py`.

Validation results:

- `npm run lint`: passed, no warnings or errors.
- `npm run typecheck`: passed.
- `npm test`: 35 tests passed across 8 files.
- `docker compose build web`: production build passed, including compilation,
  type checks and static generation.
- Focused backend authorization, existing authentication/logout and registration
  role-injection checks: 9 passed in 2.81 seconds against a separate SQLite test
  database; one existing Starlette/httpx deprecation warning.
- `npm run test:e2e -- e2e/admin-access.spec.ts`: 4 passed in 15.7 seconds using
  installed Chrome and a separate `vistrah-admin-check` Compose project on port
  3120. Actual password login, ADMIN/default and explicit destinations,
  desktop/mobile navigation, Provider Requirements/Applications, Job Sources,
  Workflows, anonymous redirects, logout revocation and CUSTOMER page/API denial
  passed. No page exceptions or HTTP 5xx responses were recorded.
- After refreshing only the normal web container, Chrome checks at
  `http://localhost:3100` confirmed ADMIN `/me` and overview 200, dashboard and
  Provider Requirements access, desktop/mobile admin links, CUSTOMER page denial
  and admin API 403, and anonymous login redirects. These checks used temporary
  sessions issued by the existing authentication helper for existing QA accounts;
  the normal QA password was neither requested nor changed. Sessions were revoked
  after verification. No browser runtime errors were recorded.
- Before/after read-only fingerprints matched for all 12 existing core tables.
  API, web, database and worker were healthy; only web was recreated. Existing
  users, roles, passwords, records, configuration and Docker volumes were preserved.

Local helper files `.tools/test-admin-access.ps1`,
`.tools/probe-admin-access.ps1`, `.tools/probe-admin-access.cjs` and
`.tools/admin-access-sessions.py` support the isolated tests and sanitized local
verification. No backend implementation, schema, routes or API contracts changed.
No database reset, remote deployment or DNS change was performed.

## Personal administrator and password recovery - 10 October 2026

Read-only inspection found one development QA administrator, 111 CUSTOMER users,
and the supplied existing login assigned CUSTOMER. The user approved a separate
personal administrator and explicitly confirmed its unused email/display name.
The existing `app.create_admin` command was run interactively against local
PostgreSQL `vistrah`. It created one ADMIN, resulting in 2 ADMIN/111 CUSTOMER.
Passwords were entered privately, not supplied in chat or command arguments.
The bootstrap implementation and existing CUSTOMER/QA records were unchanged.

Browser checks at `http://localhost:3100` with temporary sessions for the new
administrator confirmed ADMIN `/me` and overview 200, desktop/mobile admin links,
dashboard and Provider Requirements access. CUSTOMER navigation stayed intact,
direct admin pages were denied and admin APIs returned 403; anonymous admin visits
redirected to login and APIs returned 401. Temporary sessions were revoked.
This browser check proves authorization/rendering, not the original password.
The corrected private credential check returned login 401, also reproduced by
the user on the website; the user then explicitly requested a password reset.
A constrained, private local maintenance prompt was provided for only that newly
created administrator, using the existing Argon2/password policy and session
revocation. The user completed the approved reset and the private result marker
confirmed successful password-based sign-in through the frontend API, ADMIN role,
dashboard overview, `/admin` route and Provider Requirements access. All old
sessions for this personal account were revoked; the verification session was
also logged out. A final read-only fingerprint check confirmed all original 112
CUSTOMER/QA user rows remained identical, including their roles/password hashes
without displaying those values. API, web, database and worker remained healthy.
No reset bypass endpoint or change to the bootstrap process was added.

Password recovery implementation:

- `backend/app/recovery.py`: neutral responses, account lookup/issuance after the
  response, 256-bit random tokens with SHA-256-only storage, 15-minute expiry,
  persistent throttles, PostgreSQL locks, atomic single-use consumption, all-link
  invalidation/session revocation and unchanged account roles. SMTP supports
  authenticated certificate-verified STARTTLS/implicit TLS, branded HTML/plain
  text, sanitized failures and acceptance reporting only after SMTP acceptance.
- `backend/app/models.py` and migration `006_password_recovery.py`: one additive
  reset-token table. `main.py` registers recovery, strips sensitive authentication
  validation input/context and serializes login with resets using user row locks.
- `frontend/components/password-recovery.tsx`, both new public recovery pages,
  `customer.tsx` and `next.config.ts`: visible login link, neutral request state,
  matching password fields, missing/invalid/expired/success states, fragment-based
  token handling and no-referrer/no-store reset-page headers. Existing layouts,
  typography and imagery are reused.
- `compose.yaml` and `.env.example`: configurable SMTP/origin environment wiring
  and empty secret placeholders. The existing real `.env` was not edited.
- `backend/tests/test_password_recovery.py`, `frontend/e2e/password-recovery.spec.ts`,
  README, SECURITY and AUTHENTICATION documentation; ignored `.tools` runners and
  private operator prompts support local verification.

Actual validation results:

- Lint and TypeScript checks passed; 35 frontend tests across 8 files passed.
- API image build and web production build passed, including TypeScript and
  static generation for `/forgot-password` and `/reset-password`.
- Focused recovery/admin/existing authentication/logout/login-throttle checks:
  **27 passed** on separate SQLite (5.68 seconds) and disposable PostgreSQL
  (5.72 seconds); one existing Starlette/httpx deprecation warning in each run.
- PostgreSQL races for the same token and two different tokens each returned
  exactly one 200 and one 400, with role preserved and sessions revoked.
- Installed-Chrome browser tests: **9 passed in 26.3 seconds** (5 recovery,
  4 admin). Covered missing/unknown/expired links, matching fields, mobile
  configuration notice, password reset, old-session rejection, new-password
  login, CUSTOMER restrictions, actual ADMIN/default and explicit login,
  desktop/mobile navigation, Provider Requirements and logout revocation.
  All positive reset records/mail fixtures remained in the separate test project.
- Live local recovery-page checks passed: login link, clear development SMTP
  status, missing/invalid-link state, no-referrer response header, mobile layout
  without horizontal overflow and zero page runtime errors.
- Only normal API/web were refreshed after isolated checks. Migration 006 applied;
  all four normal services were healthy. All 12 core-table fingerprints matched
  across the refresh. The original 112 users' fingerprint also matched the earlier
  snapshot when excluding the explicitly created personal administrator.
- Normal database contained **0 reset-token records** after verification.

SMTP was **not configured**: `SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD` and
`SMTP_FROM_EMAIL` were missing. The effective local `PUBLIC_APP_URL` was correctly
`http://localhost:3100`; TLS/port/name defaults were supplied. No real SMTP test
was attempted or accepted, and no real email delivery is claimed. Configure
credentials privately and follow AUTHENTICATION.md to test actual SMTP acceptance
and inbox delivery. Transport/template tests used mocks; development status
exposes only a boolean and is 404 under `APP_ENV=production`.

Early validation failures were test/tool defects: an alert selector also matched
Next's route announcer; a token assertion selected another fixture's row; Windows
PowerShell stripped embedded native-command quotes. Selectors/token lookups were
restricted and private command code is now encoded before invocation. Recovery
tests disable trace/screenshots/video; runner output redacts temporary credentials.
No complete unrelated backend matrix, external acquisition or additional browser
engine runs were performed. No database reset, volume deletion, DNS change or
remote deployment occurred.

## Official public email contact — 10 October 2026

Audit completed before editing; findings and planned files were reported first.
The previous company number came from `frontend/lib/contact.ts`, shared header,
footer/banner, service help card/pathway, contact page and their documentation/tests.
The shared templates cover 59 services, eight categories and one subcategory.
Customer/provider phone fields, provider telephone links, personal test fixtures,
authentication and infrastructure settings were classified separately and retained.

Public contact now uses the single `officialContact.email = info@vistrah.in` token.
Header/mobile navigation, footer, banners, service help/pathway cards, missing-guide
help and contact-page actions resolve to `mailto:info@vistrah.in`. The existing
`/call-vistrah` URL remains compatible and renders the email contact page.
Mail Enquiry, contact/recommendation/delivery forms and provider discovery retain
their existing backend destinations and validation. Email does not replace saved
requests. No backend, authentication, role, migration or environment change was made.

Files changed for this scope:

- `frontend/lib/contact.ts`, `frontend/lib/service-pathways.ts`.
- `frontend/components/shell.tsx`, `ui.tsx`, `catalogue-templates.tsx`,
  `service-pathways.tsx`, `member-information.tsx`.
- `frontend/app/(public)/page.tsx`, `services/page.tsx`, `membership/page.tsx`,
  `call-vistrah/page.tsx`, and `frontend/app/globals.css`.
- `frontend/lib/contact.test.ts`, `service-pathways.test.ts`;
  `frontend/e2e/public-contact.spec.ts`, `service-discovery.spec.ts`,
  `marketplace.spec.ts`.
- `README.md`, `docs/SERVICE_DISCOVERY.md`, `docs/VALIDATION.md`.

Actual validation:

- `npm run lint` and `npm run typecheck`: passed, including the final test edits.
- `npm test`: **37 passed across nine files** (3.85 seconds). Checks include the
  email-only registry, safe destinations, every service's pathway and enquiry fallback.
- Focused backend SQLite checks: **7 passed** (4.20 seconds): service discovery,
  profile/personal phone, request validation/persistence/state transitions,
  authentication/revocable logout and registration/role-injection protection.
  One existing Starlette/httpx deprecation warning; the normal database was untouched.
- `docker compose build web`: passed Next.js production compilation, TypeScript
  and static generation. Only the normal local web container was refreshed.
- Chrome at **http://localhost:3100**: `public-contact.spec.ts` **3 passed**
  (18.2 seconds). Checked header/mobile navigation/footer/contact/service actions
  at 1440, 768, 390 and 320px; no horizontal overflow. HTTP inspection verified
  all 59 service pages, eight category pages and the subcategory page contain
  the official email link and no company telephone actions/numbers.
- Existing marketplace search-to-service/email-link check: **1 passed**
  (3.6 seconds). The three new tests also verify required personal-phone validation,
  submission wiring and request confirmation using mocked customer/API responses;
  no customer or request record was created in the normal database.
- Desktop/mobile contact screenshots were inspected. All **12 core-table
  fingerprints matched** before/after the frontend refresh and browser checks.

An initial browser run passed the contact/layout assertions but encountered the
existing vacancy timestamp hydration mismatch: `sourceTime` formats in the runtime
timezone, so Docker UTC and an Asia/Calcutta browser differ. Reproduced one error
in Asia/Calcutta and none in UTC; the contact test explicitly uses UTC and asserts
zero page errors there. This unrelated discovery formatting remains unchanged.
The broader service-discovery/marketplace suites were updated for the renamed
pathway, but only the focused tests above were executed; no complete backend matrix.

Final owned-source/content audit found no old company number or Call VISTRAH action
in served company contact content. The remaining production `tel:` link is
`ProviderDetailPage`'s **Call provider**, using that provider's supplied phone.
Personal test fixtures and the development workflow restart probe retain numeric
values that happen to match the former number; negative regression assertions also
contain it. Ignored historical `.tools/centralize-contact.py` and
`.tools/implement-service-discovery.py` contain obsolete scaffolding references;
they are not served and were not executed or changed. Dependency/build/report
artifacts were excluded from source searches. Historical validation notes above
about official telephone links are superseded by this section.

The development recovery-status endpoint still reports `configured: false`.
SMTP credentials, sender and recovery delivery behavior are unchanged. Publishing
the contact link does not establish that `info@vistrah.in` receives mail; mailbox
receipt and real SMTP delivery were not tested. No DNS changes, remote deployment,
database reset, user/permission changes or volume operations were performed.
