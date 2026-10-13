# API guide

VISTRAH Finds endpoints and approval/state contracts are described in [workflow API and engine](WORKFLOWS.md), with existing authentication and backend ownership/role checks.

The generated, complete OpenAPI reference is `/docs` on the API. Browser calls use the same paths with an `/api` prefix on the website. The API returns JSON; validation failures use FastAPI's `detail` structure, and domain errors use `{"detail":"message"}`. Foreign-key/uniqueness conflicts return 409 without exposing SQL.

Protected API calls require `Authorization: Bearer <JWT>`. `/auth/register` and `/auth/login` return a token for API clients. The frontend proxy removes the token from its JSON response and sets an HTTP-only cookie. JWTs expire after 12 hours. `/auth/logout` revokes the backend session.

| Area | Endpoints |
|---|---|
| Health/catalogue | `GET /health`, `GET /catalogue`, `GET /catalogue/lookup?category=…&service=…&subcategory=…` |
| Providers | `GET /services/{id}/providers`, `GET /services/{id}/providers/{slug}` |
| Member information | `GET /services/{id}/member-information` (active membership required) |
| Authentication | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout` |
| Account | `GET /me`, `PATCH /me`, `GET /me/requests`, `GET /me/orders`, `GET /me/payments`, `GET /me/membership` |
| Requests | `POST /requests` with `service_id`, `requirements`, `location`, `phone` |
| Membership | `GET /membership/plan`, `GET /membership/offers` (authenticated and membership-filtered) |
| Sandbox | `POST /payments/checkout`, `POST /payments/{id}/simulate`, `POST /payments/webhook` |
| Admin overview/review | `GET /admin/overview`, `GET /admin/requests`, `PATCH /admin/requests/{id}` |
| Admin providers | `GET/POST /admin/providers`, `PUT /admin/providers/{id}`, `POST /admin/providers/{id}/verification`, `PATCH /admin/providers/{id}/active`, `PUT /admin/providers/{id}/services` |
| Admin catalogue | `GET /admin/catalogue`, `POST /admin/catalogue/{kind}`, `PUT/DELETE /admin/catalogue/{kind}/{id}` |
| Admin offers | `GET/POST /admin/offers`, `PUT /admin/offers/{id}` |
| Admin payments | `GET /admin/payments`, `GET /admin/payments/{id}/ledger`, `POST /admin/payments/{id}/refund`, `POST /admin/reconciliation` |
| Audit | `GET /admin/audit?q=…&action=…&page=1`, `GET /admin/audit/export?q=…&action=…` |

Catalogue kinds are `categories`, `subcategories`, `services`. Category is required for subcategories and services; a service's subcategory must belong to its category. Parent records cannot be deleted while dependants exist. Reserved route slugs are rejected. Service member guide notes are editable with `member_information` in catalogue administration.

Request transition graph: NEW → UNDER_REVIEW → ASSIGNED → IN_PROGRESS → COMPLETED. CANCELLED is allowed from any nonterminal state; ASSIGNED may return to UNDER_REVIEW. Terminal states cannot be reopened.

Providers start PENDING and inactive. PENDING can be VERIFIED, REJECTED or INACTIVE. VERIFIED can return to PENDING or become REJECTED/INACTIVE. REJECTED can return to PENDING or INACTIVE; INACTIVE must return to PENDING before verification. Every verification transition requires evidence/reason of at least 10 characters. Activation requires VERIFIED status. Editing provider identity/contact details resets verification and deactivates it.

Offers contain `scope` (ALL/CATEGORY/SERVICE/PROVIDER), `target_id` (null for ALL), `type` (PERCENT/FIXED), `value`, `terms`, timezone-aware `starts_at`/`ends_at`, and `active`. Fixed offer amounts are paise; percent values cannot exceed 100. Offers are informational, not automatically applied to a service checkout that does not yet exist.

Checkout body: `{"idempotency_key":"a-unique-key-at-least-16-characters"}`. The amount comes from the stored plan, never the client. Simulation body: `{"outcome":"SUCCEEDED"}` or `{"outcome":"FAILED"}`. Only the owner can simulate their transaction. A finalized payment cannot receive a contradictory outcome.

Webhook body contains `event_id`, `payment_id`, `amount`, `currency` (INR), `status`, and a Unix `timestamp`. `X-Signature` is the hex HMAC-SHA256 of the exact raw request body using `WEBHOOK_SECRET`. The built-in sandbox adapter signs local simulation events internally. No live credentials or external gateway are involved. Refunds are full sandbox reversals only and require a reason.

No card numbers, CVV, UPI PIN or bank credentials are accepted by any payment schema.

## Vacancy discovery (migration 004)

| Method | Endpoint | Access and behavior |
|---|---|---|
| GET | `/jobs?page=1&q=python` | Public, 20 cached records/page, no private profiles or scores |
| GET | `/jobs/{vacancy-id}` | Public complete normalized vacancy and provenance; 404 for absent or access-withdrawn data |
| GET | `/finds/sources` | Authenticated, safe source readiness/enabled/health/budget information |
| POST | `/finds/discovery` | Owned open career request, creates versioned discovery plan; same-key/same-input retries are idempotent |
| PUT | `/finds/workflows/{id}/inputs` | Owner only, discovery or original preparation inputs, frozen after start |
| POST | `/finds/workflows/{id}/start` | Owner only; queues the existing worker |
| POST | `/finds/workflows/{id}/actions/{action-id}/retry` | Owner only, eligible source-failure retries retain successful acquisition progress |
| POST | `/finds/workflows/{id}/prepare` | Owner only; selected discovered IDs create original preparation template, never submit an application |
| GET | `/admin/job-sources` | Admin only; source metadata, queued operations and latest 20 acquisition summaries; no profiles/results/credentials |
| PATCH | `/admin/job-sources/{source-id}` | Admin only, body `{"enabled":true}`; unconfigured enablement returns 409 |
| POST | `/admin/job-sources/{source-id}/test` | Admin only, persistent one-page connection check through the worker |
| POST | `/admin/job-sources/{source-id}/acquire` | Admin only, persistent acquisition through the worker, up to three pages |

Discovery body example:

```json
{
  "request_id": 123,
  "template_id": "job-discovery@2",
  "idempotency_key": "customer-search-unique-123",
  "inputs": {
    "target_titles": ["Python Engineer"],
    "skills": ["Python", "SQL"],
    "locations": ["Worldwide"],
    "arrangements": ["REMOTE"],
    "sources": ["remotive"],
    "result_limit": 20,
    "max_pages": 2
  }
}
```

Required before starting: sources, titles, locations and arrangement. Other existing profile/preferences fields are optional; absent information is reported. `sources` permits distinct `remotive`/`adzuna` IDs, 1–50 matches and 1–3 provider pages. Supplied `listings` must be empty for this template. Plain-text document references must belong to the customer. Credentials, URLs to fetch and server configuration are not accepted as search parameters.

Action `jobs.discover@2` returns acquisition ID, `COMPLETE`/`PARTIAL`/`ALL_UNAVAILABLE`, search timestamp, per-source statuses/counts/pages/cache use/invalid counts/sanitized errors/retry times, retrieval/deduplication counts, ranked snapshots with provenance, missing-profile guidance and next action. Workflow `COMPLETED` describes completed execution; it does not imply every provider succeeded. Empty/unavailable results never include sample vacancies. Frozen scores remain stable, while stale presentation is derived from actual retrieval age.

Preparation body: `{"vacancy_ids":["uuid-from-this-owned-result"],"idempotency_key":"unique-preparation-key"}` (1–10 IDs). Unknown/other-result IDs return 404; incomplete source fields return 409 with a manual-preparation next step. The new plan can be a draft until profile requirements are filled. All original customer approvals and disabled submission boundaries apply.

Admin test/acquire body: `{"idempotency_key":"unique-source-operation-key"}` (10–60 characters recommended). Response 202 includes `workflow_id`, status and cache/worker explanation. A shared fresh feed can satisfy a health check without a new network request; source metadata retains the actual last connection-check time. Poll admin source history or inspect `/admin/workflows/{id}`. No source action directly fetches network data during the HTTP request.

See [source terms, access, quotas and limits](JOB_SOURCES.md). Source budgets and leases are global, database-backed and reserved before requests. Public endpoints read the cache and never fetch provider URLs. Validation errors for Finds and job-source management do not echo posted field values.

## Provider onboarding endpoints

Existing authentication and administrator roles apply. All routes are backend paths;
browser clients use the existing `/api` proxy.

| Method / path | Purpose |
| --- | --- |
| GET `/provider-requirements/{service_id}` | Effective published questions; reviewer checklist omitted. |
| POST / GET `/provider-applications` | Create draft / list own applications. |
| GET / PUT `/provider-applications/{id}` | Authorized detail / revision-checked draft answers. |
| POST `/provider-applications/{id}/submit` | Validate complete answers and freeze for review. |
| POST `/provider-applications/{id}/services/{sid}/version` | Explicitly adopt an effective published version. |
| POST `/provider-applications/{id}/documents` | Private bounded base64 upload to an existing file question. |
| GET `/provider-applications/{id}/documents/{document_id}` | Authorized binary attachment. |
| GET `/provider-leads` | Own assignments gated by current service eligibility. |
| GET `/admin/provider-requirements/{sid}` | Configuration versions, counts and validation errors. |
| POST `/admin/provider-requirements/{sid}/drafts` | Fork/create a configuration draft. |
| PUT `/admin/provider-requirements/versions/{id}` | Edit an unpublished configuration. |
| POST `/admin/provider-requirements/validate` | Errors and normalized configuration for preview. |
| POST `/admin/provider-requirements/versions/{id}/publish` | Publish a valid draft. |
| POST `/admin/provider-requirements/versions/{id}/retire` | Retire with an effective replacement available. |
| GET `/admin/provider-requirements/versions/{id}/history` | Metadata audit history. |
| GET `/admin/provider-applications` | Paged review queue, optional requirement_id filter. |
| GET `/admin/provider-applications/{id}` | Private review detail and checklist. |
| POST `/admin/provider-applications/{id}/services/{sid}/review` | Revision-checked manual service decision. |
| POST `/admin/providers/{pid}/services/{sid}/review` | Manual grant review for legacy associations only. |
| GET `/admin/services/{sid}/eligible-providers` | Currently eligible lead recipients. |
| POST `/admin/requests/{id}/provider` | Assign an eligible provider to an open service request. |

Application lists use page size 30. Draft edits supply `revision`, `common`, and
`services` keyed by service ID. Review supplies revision, status, reason and checklist.
Document upload supplies service_id, field_id, filename, media_type and content_base64.
Validation failures return a message and field errors; stale revisions return 409.
See [provider onboarding](PROVIDER_ONBOARDING.md) for safe configuration examples,
limits and lifecycle behavior.

## Reviewed employer jobs

- Public `GET /employer-jobs?page=1&q=` and `GET /employer-jobs/{id}` expose only approved jobs with an inclusive, unexpired deadline (India Standard Time calendar), an active verified employer business and unchanged ownership. Public output excludes review notes and account/reviewer IDs. This table/feed is separate from acquired `/jobs` vacancies.
- Seller `GET/POST /seller/businesses/{provider_id}/jobs` list owned postings and save a draft. `PATCH .../jobs/{id}` edits only the author's DRAFT/REJECTED record and resets it to DRAFT. Payload: title, description, location, arrangement (ONSITE/HYBRID/REMOTE), employment_type (FULL_TIME/PART_TIME/CONTRACT/INTERNSHIP/TEMPORARY), optional salary_text/deadline and required public HTTPS application_url; PATCH adds revision.
- Seller `POST .../jobs/{id}/submit` and `/close` take `{revision}`. Submission requires an active verified business, current ownership and unexpired deadline. Closing immediately removes a job from the public feed.
- Admin `GET /admin/employer-jobs?page=1&status=SUBMITTED` serves a private review queue. `POST /admin/employer-jobs/{id}/review` takes `{revision,status,reason}` with APPROVED/REJECTED and a 10–2000 character reason. Author/current employer owner cannot self-review. Only the current submitted revision can be decided. Mutations are audited and compare revisions atomically.
- Migration 012 creates employer_jobs; no changes to external vacancy ingestion or memberships. Applications use the employer link and are not stored by this API. Runtime rollout is separate from source verification.

## Shared homepage configuration (source migration 013)

Public `GET /homepage` returns only `{version,layout}`. Before publication, and
for an empty published layout, clients use the existing homepage. The layout
has `schema_version:1` and at most 12 ordered sections. Every section contains
`id`, `template`, `title`, `subtitle`, `size` and ordered `service_ids`.
Banner: exactly one card, wide/square. Service grid: 2–16 cards, compact.
Service carousel: 2–12 cards, compact. Section IDs and per-section service IDs
must be unique; IDs must reference active services/categories/subcategories.
There are no arbitrary HTML, URL or media-upload fields.

Admin-only endpoints, all private/no-store:

| Endpoint | Purpose |
|---|---|
| `GET /admin/homepage/templates` | Supported templates, sizes and card/section limits |
| `GET /admin/homepage/draft` | Saved private draft, revision and published version; revision 0 when absent |
| `PUT /admin/homepage/draft` | Save `{revision,layout}`; revision 0 creates the first draft |
| `POST /admin/homepage/publish` | Publish saved draft using `{revision}`; revalidate availability; advances revision |
| `GET /admin/homepage/versions?offset=0&limit=20` | Published history; maximum page size 50 |
| `POST /admin/homepage/restore` | Copy `{revision,version}` into draft; publication is a separate action |

Stale writes/publishes/restores return 409. Mutations are audited; published
snapshots have database update/delete guards. Restore plus publish creates a
new version and preserves history. Migration 013 creates only new tables and
triggers, seeds no layout, and refuses downgrade with drafts/history. Runtime
migration and backup/rollout authorization remain separate from source work.

Admin editor: `/admin/homepage`. Draft preview is a private content preview,
with phone/desktop widths; clients retain their respective final styles.
Desktop reads the published API on page refresh; native/phone website reads it
when Discover gains focus or is reloaded. Disabled/missing service cards are
omitted, with no invented destinations. Existing service-detail membership
rules remain authoritative.
