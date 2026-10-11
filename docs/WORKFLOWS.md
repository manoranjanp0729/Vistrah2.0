# VISTRAH Finds

VISTRAH Finds supports real API vacancy discovery and preparation from selected or supplied vacancies. Existing authentication, requests, membership gates and sandbox payments remain in place. The existing Compose worker orchestrates both templates; no second scheduler or scraper was introduced. See [source documentation and configuration](JOB_SOURCES.md).

Customer routes: `/account/finds` and `/account/finds/{workflow-id}`. Admin routes: `/admin/workflows` and `/admin/job-sources`. Public source listings: `/jobs` and `/jobs/{vacancy-id}`, without signup or membership.

Unsaved profile/vacancy edits disable Start until they are saved. During execution, customers can reopen the exact frozen profile and preferences before deciding whether to authorize draft preparation.

Expand an owned open Jobs & Careers request to create a plan. Supply factual profile/resume, name, titles, skills, experience, locations, arrangements and vacancy descriptions with permitted public source URLs. Salary and search notes are optional. Save, review the plan, then start. Matching pauses for customer approval before personal drafts. Review results/evidence, download drafts, record your application status, retry eligible failures or cancel remaining work. Other service categories explicitly have no executable template yet.

## Real discovery

Expand an owned career request and choose **Discover real vacancies**. Recent profile/preferences from that request are copied into the new editable plan. Select sources, target titles, location (`Worldwide` permits broad geographic review), arrangement, result limit and page cap. Skills, experience, factual resume and salary improve matching but do not prevent discovery when absent. Save and start; the ordinary worker persists acquisition progress. Review per-source outcomes, cache use, retrieval times, counts, provenance, source links, unknown/stale status, scoring explanations and missing-profile guidance. Selected complete vacancies can create the existing preparation plan; missing details are explicitly reported. Unknown preparation currency uses `XXX` (no currency), never an invented salary currency.

`job-discovery@2` contains `jobs.discover@2`: an external read that validates, queries, normalizes, deduplicates, persists provenance and reuses the existing ranker. `COMPLETE`, `PARTIAL` and `ALL_UNAVAILABLE` describe acquisition outcomes separately from workflow execution status. Useful successful source results survive another source's failure. Retry uses the same acquisition and resumes failed sources/next pages with persisted backoff. Provider-page caps or excluded invalid records require a new plan. Submission stays disabled. Public listings never reveal customer criteria, scores, documents or draft text.

## Executable actions

| Action | Dependencies | Genuine behavior |
|---|---|---|
| `jobs.discover@2` | None | Bounded authorized API acquisition, normalization, provenance, deduplication and explained matching |
| `jobs.import@1` | None | Validate authorized supplied vacancies, without network calls |
| `jobs.normalize@1` | Import | Canonicalize/deduplicate source URL, title and employer |
| `jobs.rank@1` | Normalize | Explain deterministic skill/preference scoring |
| `jobs.drafts@1` | Rank | Factual resume and cover-letter text drafts after explicit customer approval |
| `jobs.checklist@1` | Rank, drafts | Role-specific review/manual submission checklist |

Scores assign 50 points for matched skills, 20 for title, 10 each for location/remote preference, arrangement and matching salary. Missing salaries earn no salary points. Salary inputs are annual currency amounts. These are keyword heuristics, not hiring predictions. Experience and search notes are retained for review, not inferred eligibility. Drafts preserve supplied facts and contain review placeholders, without fabricated achievements.

`jobs.discover@1`, `jobs.submit@1` and `jobs.track@1` await an authorized integration. `workflow_integrations.py` defines discovery and submission/receipt/status protocols. The original disabled discovery contract is retained for history; its replacement is `jobs.discover@2` with Remotive and Adzuna API adapters. Remotive is configured without credentials. Adzuna requires authorised environment configuration. External submissions, outreach, spending and automatic tracking cannot execute. The worker permits only the exact registered `jobs.discover@2` external-read handler and rejects other external side effects even if accidentally marked executable. Future adapters require permission/terms review, least-privilege credentials, endpoint constraints, hard transport timeouts, stable provider idempotency and confirmed receipts.

Planned versioned boundaries for property, procurement, marketing, compliance, business services, IT and local/professional services are disabled/unsupported. Definitions declare versions, categories, inputs/validation, prerequisites, handler, integrations/permissions, approval, risk/side effects, timeouts/retries, results/evidence and real executability. Definition/template contracts are append-only: changed contracts need new versions. Earlier local planned contract versions remain preserved.

## Models and transitions

The scheduler selects input/result validation models by registered handler and required fields by template actions. A non-job input contract is exercised by an isolated test without changing orchestration code. New internal verticals register their schemas, handlers and ordered definitions/templates; their collection UI/controllers remain vertical-specific. Additional external actions remain disabled until genuine adapters and authorization/recovery implementations exist.

Migration `003` adds action definitions, templates, documents, workflow/action runs, dependencies, approvals, execution attempts, evidence, events, worker heartbeats and manual application records. Inputs are validated and frozen by hash at start. Approval scope identifies actor, action/version, frozen input hash, source references, decision and time. Admins cannot authorize on behalf of customers.

| Object | Valid states and transitions |
|---|---|
| Workflow | `DRAFT` ↔ `READY` through input saves; `READY` → `QUEUED` on start; aggregate worker states `RUNNING`, `QUEUED`, `WAITING_APPROVAL`, `COMPLETED`, `FAILED`, `PARTIALLY_COMPLETED`; eligible failed/partial retry; remaining noncompleted runs → `CANCELLED` |
| Action | `PENDING` → `QUEUED` after successful prerequisites or `WAITING_APPROVAL`; approved → `QUEUED`, rejected → `REJECTED`; `QUEUED` → `RUNNING` → `COMPLETED`/`FAILED`; unsuccessful prerequisites → `BLOCKED`; eligible retry/safe interruption → `QUEUED`; remaining work → `CANCELLED` |
| Approval | `PENDING` → `APPROVED`/`REJECTED` by owner, or `CANCELLED`; identical owner decisions are idempotent, conflicting decisions rejected |
| Attempt | `RUNNING` → `COMPLETED`, `FAILED`, `TIMED_OUT`, `INTERRUPTED`, `CANCELLED` |
| Manual application | `SAVED`, `APPLIED`, `INTERVIEW`, `OFFER`, `REJECTED`, `WITHDRAWN`; explicitly user-reported, with audited updates |

The Compose worker locks workflow rows using `FOR UPDATE SKIP LOCKED`, commits a unique 30-second lease, then executes outside that transaction. Completion requires the current token. Cancellation invalidates it; stale results are discarded. Expired internal and the approved discovery-read leases can recover below the three-attempt limit. Ordinary failures require an eligible explicit retry. Completed internal actions never reset. A completed discovery action with retryable source failures may requeue while retaining committed source successes; acquisition remains unique per action. Blocked downstream actions resume against the same frozen scope. Actual heartbeat timestamps determine worker health.

Preparation handlers are bounded internal computations. Discovery additionally applies fixed destinations, bounded network reads, source budgets/backoff and durable page progress. Work exceeding 30 seconds cannot commit success. A blocking handler is not forcibly terminated; leases permit recovery by another worker or after process restart. Additional network/process handlers need explicit execution/transport timeouts and cancellation contracts. This version targets a single Compose worker and modest volume.

Creation is idempotent per customer/key; different request/template/inputs conflict. Attempts keep a stable action-run execution key. There is no workflow webhook; existing signed sandbox payment replay handling is untouched. Events/evidence/registry contracts are database-enforced append-only. Orchestration mutations append existing audit records, with sanitized codes and no document/credential logging.

## API and access

Text values must be valid UTF-8 without binary controls. Validation errors do not echo document/profile contents. Cancelled runs are never presented as retry eligible.

All Finds routes require the existing session, with ownership enforced server-side. Browser calls use the existing HTTP-only-cookie, origin-checked proxy. Workflow bodies are capped at 128 KB, inputs at 100 KB.

| Method | Backend routes |
|---|---|
| GET | `/finds/sources` |
| POST | `/finds/discovery`, `/finds/workflows/{id}/prepare` |
| GET | `/jobs?page=1&q=python`, `/jobs/{id}` (public) |
| GET / PATCH | `/admin/job-sources`, `/admin/job-sources/{source-id}` |
| POST | `/admin/job-sources/{source-id}/test`, `/admin/job-sources/{source-id}/acquire` |
| GET | `/finds/requests`, `/finds/actions`, `/finds/workflows?page=1`, `/finds/workflows/{id}` |
| POST / GET | `/finds/documents`, `/finds/documents/{id}` |
| POST | `/finds/workflows`, `/finds/workflows/{id}/start`, `/finds/workflows/{id}/cancel` |
| PUT | `/finds/workflows/{id}/inputs`, `/finds/workflows/{id}/applications` |
| POST | `/finds/workflows/{id}/approvals/{approval-id}`, `/finds/workflows/{id}/actions/{action-id}/retry` |
| GET | `/admin/workflows?page=1&status=FAILED`, `/admin/workflows/{id}` |
| POST | `/admin/workflows/{id}/actions/{action-id}/retry` |

Admin operations expose numeric customer/request references, real counts, statuses, retry eligibility, durations/attempts, customer approval counts and integration/worker status. They omit resume inputs, personal draft contents, source evidence and approval source scope. No administrator approval is applicable to installed actions.

UTF-8 `.txt` uploads only: 12,000 characters, browser limit 48 KB, 50 documents/account. Backend rejects paths, binary controls and unsupported extensions. Owner-only retrieval; content is PostgreSQL data, never executable instructions. Pasted profiles are supported. PDF/Word parsing, antivirus scanning, document deletion, automated retention and object storage are absent. Public deployment needs explicit retention, encryption/backup and operational controls.

## Changed files and checks

Backend additions: `workflow_models.py`, `workflow_schemas.py`, `action_registry.py`, `workflow_integrations.py`, `workflow_engine.py`, `workflow_routes.py`, `workflow_worker.py`, `workflow_worker_health.py`, `workflow_restart_probe.py`. Existing `main.py`, `seed.py`, and migration metadata integrate them. Schema migration: `migrations/versions/003_workflows.py`, frozen explicitly.

Frontend: `components/finds.tsx`, `components/admin-workflows.tsx`, `lib/workflows.ts` and tests; existing account/admin routes/components, central CSS and proxy are extended. Compose and the isolated QA override add the worker. New backend tests augment all existing tests; the migration assertion advances to `004` and additionally verifies an empty workflow table.

The QA-only restart probe creates labelled records, completes import once and leaves a committed unfinished normalization lease. After API/frontend restart and worker startup, verification checks safe recovery, no repeated import, required approval and full completion. No records or volumes are deleted. See [validation](VALIDATION.md) for actual results.


## Phase 2 persistence and delivery

Migration 004 adds `job_sources`, `vacancies`, `vacancy_provenance`, `job_acquisitions` and `job_acquisition_sources`, with unique source identities, canonical URLs, per-action acquisition and per-acquisition source progress. Provider calls, cursors, raw/invalid counts, filtered frozen snapshots, budget reservations and leases survive worker restart. Source-result events append sanitized status/counts to the existing audit/event system. Public listing reads do not query providers or expose private searches. Access withdrawal suppresses Adzuna acquired listings without erasing execution histories.

Added modules: `discovery_models.py`, `discovery_schemas.py`, `job_sources.py`, `discovery_service.py`, `discovery_routes.py`, `discovery_smoke.py`; the existing integration boundary re-exports the reusable API source protocol. Registry/orchestrator/routes/seed and persistence verification extend the existing execution path. Frontend additions are public job pages, `vacancies.tsx`, `admin-job-sources.tsx`, discovery types/tests and new browser checks. Existing Finds, shared UI/CSS, admin navigation, Compose and environment examples are extended.

The current completion report, executed results, initial failures and remaining limits are in [validation](VALIDATION.md). Adapter configuration/access/attribution/rate documentation is in [job sources](JOB_SOURCES.md); endpoint contracts are in [API guide](API.md).
