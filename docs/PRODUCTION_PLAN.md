# Production implementation plan

Status: Phase 1 source prepared and checked 13 October 2026; user-PC runtime verification is pending. This plan is the
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
- Commerce scope needs concrete pricing, stock/availability, fulfilment,
  cancellation and refund decisions before Phase 4 schema work. If a
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
