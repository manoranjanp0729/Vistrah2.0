# Production implementation plan

Status: Phase 1 source checked and user-PC local startup verified 13 October 2026. Phase 2 checks run; mobile audit and release gates remain open. User authorized deferring these gaps and continuing Phase 3 source implementation. This plan is the
implementation sequence; the earlier 85-item audit is a dated baseline, not a
production readiness certificate. Complete and verify each gate before moving
the running application forward. Work in the existing repository and stack.

| Phase | Deliverable | Completion gate |
|---|---|---|
| 1. Foundation and environments | Current architecture/module map; local/test/production environment templates; read-only environment validation; safe existing-container startup guidance. | Source checks pass; user-PC local API/web health confirmed; test environment is isolated. Production template is preparation only. |
| 2. CI and release controls | GitHub Actions lint/test/build/security checks; repository protection where account capabilities permit; immutable image versions and a private registry; controlled release/rollback runbook. | A clean pull request passes checks, a reproducible release image is published, and rollback is rehearsed in isolation. No automatic production deployment before Phase 8 approval. |
| 3. Shared homepage editor | Versioned homepage schema, PostgreSQL draft/published configuration, admin template library, card limits, add/remove/duplicate/reorder, preview/publish, desktop and native renderers. | Publishing a valid draft updates both clients on refresh; draft data remains private; invalid/excess cards are rejected; previous published version can be restored. |
| 4. Commerce and order workflows | Agreed product/service purchase rules; shared products, cart, server-priced orders, status transitions and web/native purchase views. Preserve enquiry flows. | Both clients complete the same test order lifecycle; prices/ownership/transitions are enforced on the API; duplicate submissions are safe. |
| 5. Live payments and membership | Chosen merchant/gateway integration, production payment/entitlement model, signed notifications, idempotency, refunds and reconciliation; verify Android payment-policy applicability. | Success/failure/retry/refund tests pass; verified paid events grant access and refunds revoke the correct entitlement; no sandbox transaction grants production access. |
| 6. Security and operational readiness | Resolve current dependency findings; recovery email and verification policy; admin/seller hardening; media storage where needed; scheduled offsite backups, restore drill, logging/monitoring and secret handling. | Recovery email is received, authorization tests pass, a scheduled backup restores successfully, and operational alerts are demonstrated. |
| 7. AWS staging | Confirm current resources; budget/alerts and least-privilege roles before provisioning; capacity measurements; Terraform/Compose/Caddy staging; private registry/media access; separate secrets, DNS and HTTPS. | Staging health, restart persistence, backup and rollback checks pass with controlled test data; measured capacity and cost are acceptable. |
| 8. Launch verification and release | Complete website/physical-Android journeys, web/native data synchronization, homepage publishing, gateway scenarios, performance checks, policy/privacy/store assets, AAB/internal-track testing and production rollout. | Documented launch checklist passes; explicit release approval; post-release health monitoring and rollback available. |
| 9. Post-launch ECS migration | ECR reuse, ECS/task/service definitions, external durable state/managed-DB evaluation, ALB/autoscaling evaluation, staging migration and traffic cutover. | Traffic/capacity/operations justify migration; staging validates persistence, health, rollback and expenditure. This phase is not required for the first production release. |

## Implementation rules

- Reuse Next.js, Expo/React Native, FastAPI, SQLAlchemy, PostgreSQL, Docker and
  Terraform. Keep Caddy as the reverse proxy; the original Nginx-specific audit
  item is a technology substitution to agree/document, not a reason to rewrite
  already working routing.
- Build API contracts and schema once. Desktop and native render the same data.
  The phone website already shares native screen source through `/app`.
- Begin the homepage editor with banner, service-card grid and carousel
  templates, plus button-based reordering. Add drag-and-drop only when it helps.
- Use existing bundled media for the first editor slice; add controlled media
  uploads/storage separately. Preserve existing private evidence access.
- Commerce listing scope is agreed: products and fixed-price service packages,
  seller-set INR prices, independent admin approval and seller fulfilment.
  Stock, schedules, delivery/tax, cancellation and refund decisions remain
  required before checkout/order implementation. If a
  services/jobs-only launch is selected, move commerce to a later release;
  do not silently remove it from the requested full-app scope.
- Phase 5 is essential before paid production access. Current payments are
  membership-only sandbox transactions and production membership fails closed.
  Do not fix this by weakening the existing entitlement checks.
- Introduce each migration through disposable-database tests, backup/recovery
  planning and an explicitly authorized runtime rollout. Do not run migrations
  or seeds against the normal database during verification.
- Infrastructure creation, billing changes, DNS, credentials and store release
  are separate external actions. Planning/source preparation does not perform them.
- Record source evidence, user-host runtime evidence and outstanding gates
  separately in current-task.md. Finish one phase before claiming the next gate.

## Phase 1 execution

Added public templates: `.env.example` (local), `.env.test.example`,
`.env.production.example`, `mobile/.env.browser.example` and
`mobile/.env.production.example`. Actual `.env*` files stay ignored.
`scripts/check-environment.py` reads values and prints only field-level errors;
it does not connect to services. `scripts/start-local.ps1` performs Docker/
existing-container preflight by default; `-Start` explicitly resumes existing
local db/api/admin/web without rebuild or recreation and verifies API health.
It refuses an API container whose command would migrate/seed on startup.

See ENVIRONMENTS.md for commands. Source verification is followed by user-PC
health confirmation; native/browser visual confirmation remains separate.

## Phase 2 execution

Added read-only PR/push checks and main-only manual image publishing, with pinned
actions, disposable PostgreSQL tests, client builds and blocking JavaScript
dependency audits. See RELEASES.md for registry, review and rollback controls.
User-PC Phase 1 output confirms db/api/web/admin healthy and API health ok.
CI execution, private image publication and rollback rehearsal are not yet
verified. Repository rulesets are blocked by the current GitHub account plan;
no protection, account upgrade or AWS deployment was performed.
## Deferred gates — retain through launch

User authorized feature implementation to continue while these gaps are open.
Deferral never changes the production publishing gate.

| Gap | Required follow-up | Timing |
|---|---|---|
| Mobile dependency audit: braces/node-forge have no patched published version; moderate decoder/uuid advisories | Reviewed compatible remediation and full audit/build tests; preserve blocking CI audit | Before production image publication |
| GitHub private-repository rulesets account limitation | Owner decision on enforceable protection; preserve private repository and PR review | Before production release |
| Private registry visibility/pull access and complete release digests | Verify first manual publication, package privacy/access and retention | After checks pass, before staging |
| Image/config rollback rehearsal | Run prior/candidate/prior app versions against an explicitly disposable project; verify health/persistence | Before runtime promotion |
| Homepage runtime migration, admin/phone/device QA | Backup/recovery preflight and separate controlled migration 013 rollout; publish/refresh/restore journey on all clients | Before closing Phase 3 runtime gate |
| Commerce stock/reservations, package schedules, delivery/tax and cancellation/refund scope | Listing pricing/approval/fulfilment agreed; settle remaining rules before checkout | Phase 4 |
| Live merchant/gateway and Android payment-policy decision | Verified payment/entitlement/refund/reconciliation implementation; sandbox remains fail-closed | Phase 5 |
| Recovery email, dependency/image/Python scans, private media, backup/monitoring | Complete operational/security checks and restoration drill | Phase 6 before launch |
| Current AWS resource state, budget/IAM/capacity/DNS/HTTPS | Review and authorize staging infrastructure and costs | Phase 7 |
| Physical Android, full journeys, performance, store/policy and release approval | Complete launch evidence and approve production promotion | Phase 8 |

## Phase 3 source implementation

Migration 013 and homepage models/routes provide the singleton draft, immutable
published snapshots, guarded restore/publish and template/card/service validation.
Admin /admin/homepage supplies template library, section/card ordering,
duplicate/remove, draft save, content preview, explicit publish and version
restore/history. Desktop and native/shared-phone render the same published
section/card sequence; absent/empty/unavailable configuration preserves the
existing homepage. Reuse bundled service imagery; media uploads remain later.
Source checks do not migrate or replace normal runtime. The API/editor/renderers
must pass hosted checks and user-host/physical-device QA before this gate closes.
## Phase 3 build/test gate — 14 October 2026

User requested building and exercising functionality before advancing phases.
Use scripts/test-homepage.ps1 and compose.homepage-test.yaml for the separate
local QA stack; see HOMEPAGE_QA.md. Docker/PowerShell and actual browser execution
must be confirmed on the user PC. Source guard/API/migration tests and test
collection are not browser journey evidence. Hosted API/admin/web/mobile checks
for ea586b2 passed; the mobile audit remains blocked. Normal migration 013 remains separately gated. The user subsequently authorized
Phase 4 source implementation with browser/device QA still open, and deferred
admin dashboard simplification. Physical native Android remains a separate device gate.

## Phase 4 first slice — 13 October 2026

User selected products plus fixed-price service packages, seller pricing with
admin approval, and seller fulfilment. Added commerce listing models, migration
014 and shared API for draft/edit/submit/independent review/archive and paginated
eligible publication. Package browsing preserves membership and approved service
grants. Editing an approved listing unpublishes it; revisions prevent stale writes.
Backend tests cover API rules, sandbox-production separation and migration data
preservation/downgrade refusal. No normal migration or runtime replacement occurred.

Next slices: seller/customer web/native listing screens, agreed availability and
fulfilment rules, then server-priced cart/orders and lifecycle tests. Checkout,
stock reservation, booking schedules, delivery/tax, cancellation/refund and live
payments remain unfinished. Admin dashboard simplification is deferred per user.
Phase 3 browser journey and production security/release gates remain open.

## Phase 4 client slice — 14 October 2026

Desktop and native/shared-phone customer listing/detail screens, seller draft
create/edit/submit/archive screens and a minimal existing-layout admin review queue
now consume the shared listing APIs. More discovery exposes browsing; native
business details and the desktop seller dashboard expose seller listing controls.
Both clients use shared/commerce.ts for exact rupee-to-paise conversion and input
preparation. Submitted/archived rows cannot be edited; approved edits warn that
publication is removed until review. The admin queue supports status filters,
pagination, review reasons and approve/reject; dashboard redesign stays deferred.

21 shared commerce tests and six native seller/privacy regressions passed;
three client typechecks/scoped lint, desktop build, phone export, Android Hermes
bundle export and standalone desktop route HTTP smoke passed. No real browser
interaction or APK/device test is claimed. Full admin hosted build and user-host
commerce journey remain open. Next: remaining commercial policy decisions,
server-priced cart/orders and shared lifecycle tests. All checkout/live payment
and normal runtime rollout gates remain intact.
