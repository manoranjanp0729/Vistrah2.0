# Provider onboarding and manual verification

Category landing pages use the existing catalogue's database category ID to link
`Provide a service` to `/provide-service?category=<id>`, beside the unchanged
`Choose a service` anchor. All eight current categories are covered. The existing
login/registration flow retains this destination; no separate provider login exists.

Applicants choose one or more services in that category, enter shared business
details once, complete each service's questions, upload requested evidence, and
review and submit. `Save draft` persists answers; account → **My provider
applications** resumes the saved reference. Changing steps keeps unsaved answers
in memory; save before leaving. Submitted answers are frozen until a reviewer
requests changes. Each service has its own requirements version and decision.

## Registry and initial coverage

`backend/app/provider_requirements.py` validates a bounded declarative schema.
`provider_requirements` stores actual service IDs, version, state, effective date,
configuration, actor, timestamps and change note. Display names come from the
existing catalogue. Conditions and validations never execute administrator code.

Initial published version 1 configurations cover **59 existing services in eight
categories**, including the existing Outdoor & Lifestyle Design subcategory.
They request evidence for VISTRAH review and conditional applicability, rather
than asserting statutory obligations:

| Existing category | Additional starting questions |
| --- | --- |
| Jobs & Careers | Recruitment activity, conditional employer authority, candidate privacy; Resume Building has an optional redacted sample; Interview Preparation has a coaching approach question. |
| Real Estate | Property experience; owner representation requires supporting authority evidence. |
| Civil & Construction | Project types, repeatable completed projects, safety approach. |
| Marketing | Campaign portfolio, optional evidence, team capability. |
| Tax & Compliance | Qualifications, evidence or a documented permitted non-applicability response. |
| IT & Technology | Delivery approach, portfolio/work evidence where applicable. |
| Business Services | Delivery approach, portfolio/work evidence where applicable. |
| Local & Professional Services | Trade experience, safety, team and applicable evidence; includes Home Services. |

Every template includes capability, experience, declarations and a manual
verification checklist. Registration applicability offers **Registered**, **Not
applicable**, and **Unsure**. Registered applicants supply details and evidence;
other selections require an explanation. Reviewers must resolve applicability
before approving. No GST or other registration is universally mandatory. None of
the initial templates claims an established legal requirement or government lookup.

The `provider-requirements-v1` bootstrap marker makes initialization idempotent:
existing configurations and catalogue edits are preserved. For a service added
later, use its existing catalogue record in admin and create its configuration;
adding a new frontend form is unnecessary.

## Administrator configuration workflow

Open `/admin/provider-requirements`, select a catalogue service, and create a
draft. The guided editor adds, edits, removes and reorders sections/questions,
changes types/options, and controls required/non-applicable settings. Expand
**Full declarative configuration** to edit conditions, validation rules, document
questions, declarations, legal basis and reviewer checklist in JSON. Save the
draft, set its change note and effective date, then **Validate and preview form**.
Preview uses the same renderer as onboarding, with normalized schema defaults.
Invalid drafts remain editable but cannot be published.

Supported field types are `text`, `textarea`, `number`, `date`, `select`,
`single_choice`, `multi_select`, `boolean`, `address`, `service_area`, `file`, and
`repeatable`. Service areas are a list of entered locations; no external location
registry is required. Repeatable groups support up to ten entries of scalar
questions, with local conditions referencing earlier questions in the group.

Field identifiers are stable lowercase identifiers, not labels. Example:

```json
{
  "id": "authority_document",
  "label": "Evidence of authority to represent properties",
  "type": "file",
  "basis": "CONDITIONAL",
  "visible_if": {"field": "represents_owners", "operator": "equals", "value": true},
  "required_if": {"field": "represents_owners", "operator": "equals", "value": true}
}
```

Conditions reference a previous field in section order. Operators are `equals`,
`not_equals`, and `includes`; `includes` requires a multi-value source. Boolean
conditions use JSON booleans. Hidden retained values cannot activate follow-up
conditions, and their types and document ownership are still validated. Values
are not silently deleted when visibility changes.

Validation includes string length, number range, permitted choices, date and
predefined email/phone/URL formats. Custom error messages are supported. There is
no arbitrary regex, JavaScript, expression evaluation, or remote validation code.
`allow_na` permits `{ "not_applicable": true, "reason": "..." }`, with a required
5–500 character reason. `basis` is `VISTRAH_REVIEW`, `CONDITIONAL` or `LEGAL`;
`LEGAL` requires an established reference in `legal_basis`. The administrator must
confirm that reference and applicability: a filled string is not legal verification.

Limits: 12 sections, 30 fields per section, 100 top-level fields per service, 15
children per group, 50 choice values, 10 declarations and 20 reviewer checks.
At least one declaration and one check must be required. Configurations are
bounded to 100 KB. Nested groups and file uploads inside groups are unsupported.

Publishing creates an effective published version without modifying prior
versions. Future-dated published versions become selectable only when effective.
Retirement requires an effective published alternative and completion of any
open correction that requires adoption of the version being retired. Previous versions show
application counts, a link to their application queue, and metadata change history.
Only existing authorized administrators can manage these records.

## Persistence, corrections and version adoption

An application pins the effective published configuration for each service at
creation and snapshots its common form. Shared business answers, per-service
answers/declarations, document references and timestamps live in the existing DB.
Revision numbers and row locks reject stale saves or conflicting review decisions.
Applications allow up to 15 selected services; each account may keep 20 drafts.

Submission records an append-only private snapshot of answers and version
references. Published/retired configuration payloads and document/event records
have database immutability guards. New versions do not rewrite existing answers.
When submitting against an older pinned version, applicants explicitly acknowledge
keeping it or adopt the displayed newer version. Adoption retains only unchanged
question definitions, resets declarations and archives previous answers. A
reviewer can require adoption of the current version when requesting changes.
That exact requested version is previewed and adopted even if a newer version
is published before the applicant returns.

Review statuses are Draft, Submitted, Under review, Changes requested, Approved,
Rejected and Suspended. Approval of one service leaves others pending. Once any
service is approved, shared business information is frozen until its approvals
are reopened. An applicant sees correction reasons and can save/resubmit the
editable services. All event records remain stored; detail screens show the most
recent 100. Configuration history also displays the most recent 100 audit records.

## Manual approval and lead eligibility

Open `/admin/provider-applications`, inspect the shared and service answers,
download evidence privately, complete the service-specific checklist, enter a
reason, and approve/reject/request changes for that individual service. Review
decisions retain reviewer, timestamp, reason, version and checklist. Administrators
cannot approve their own application. Approved services can be suspended; the
existing provider editor still controls global identity verification and activation.

First approval creates a record in the existing `Provider` table; subsequent
applications for the same account reuse its provider reference. There is no new
parallel provider directory. Historical administrator-created records stay in the
existing provider workflow; the system does not grant ownership by matching email.
New legacy service associations need an explicit service review, in addition to
provider identity verification. Application-managed grants must be reviewed via
their versioned application, preventing a legacy editor from bypassing its checks.

Backend directory queries require an active, globally verified provider and an
`APPROVED` grant for the exact active service. The same gate protects lead routing.
In existing admin requests, **Route to approved provider** lists eligible providers
and assigns a lead; closed requests cannot receive new assignments. The applicant
account shows assigned leads only while provider/service eligibility remains valid.
Suspending/rejecting a grant or disabling the provider blocks visibility and leads.
No memberships, payments, paid ranking or lead charges grant approval. The free
verified entry remains independent of customer membership.

## Private evidence and security limits

Evidence is stored as bounded binary data in the existing private database:
PostgreSQL BYTEA / SQLite BLOB, not public files or a new storage service. Uploads
require an editable application owned by the applicant and a configured file field.
Only the owner or an administrator can download evidence. Each fetch requires
the existing authenticated, revocable session; no bearer URL is issued.

PDF, PNG and JPEG only; maximum 2 MB each and 100 retained files per account.
Extension, MIME and content signatures must agree. PNG structure/CRC/dimensions
and JPEG segment/dimension bounds are checked. PDFs require a header/EOF and
reject detected active, embedded or encrypted content. Names are generated UUIDs;
the original user filename is not used as a storage path. Downloads are attachments
with no-store, nosniff and sandbox headers. The Next proxy forwards binary bytes
unchanged, keeps HttpOnly authentication and checks mutation origins. JSON depth,
body size and non-finite values are bounded/rejected. Public audit records contain
metadata, not application answers, private correction reasons or document contents.

There is no antivirus engine, complete PDF/image decoder, external government or
professional-register integration, signed expiring storage URL, or inline document
preview. File checks cannot prove that evidence is authentic or malware-free;
reviewers download it for manual review. Existing DB security/backups apply, without
adding application encryption. Evidence is immutable and retained for history;
there is no applicant deletion/retention-management UI. Higher-volume storage,
retention policy and external verification require later operational work.

## Migration and changed files

Alembic **005**, after 004, adds six tables: `provider_requirements`,
`provider_applications`, `provider_application_services`, `provider_documents`,
`provider_application_events`, and `provider_leads`. It adds `approval_status` and
`application_id` to existing `provider_services`. Existing associations are
backfilled as approved to preserve prior manually verified visibility; new links
default to pending. Global verification/activation still applies. No existing
rows or volumes are deleted. Do not downgrade after applications/evidence exist.

Implementation files:

- Backend: `app/provider_models.py`, `provider_requirements.py`,
  `provider_templates.py`, `provider_routes.py`, plus `models.py`, `main.py`,
  `seed.py`, `migrations/env.py`, `migrations/versions/005_provider_onboarding.py`.
- Frontend: `app/(public)/provide-service/page.tsx`, `components/provider-onboarding.tsx`,
  `provider-forms.tsx`, `admin-provider-onboarding.tsx`, plus existing `catalogue-templates.tsx`,
  `customer.tsx`, `admin.tsx`, `app/(public)/account/[[...section]]/page.tsx`,
  `app/admin/[[...section]]/page.tsx`, `app/api/[...path]/route.ts`,
  `lib/api.ts`, `lib/provider-requirements.ts` and `app/globals.css`, `next.config.ts`.
- Imagery integration: `lib/image-registry.json`, `lib/image-reuse.json` and
  regenerated `docs/imagery/current.json` / `inventory.md` for the three new
  account/admin contexts. Existing licensed assets and explicit reuse are retained.
- Tests: backend `test_provider_onboarding.py`, `test_service_discovery.py`,
  `test_marketplace.py`; frontend `lib/provider-requirements.test.ts` and
  `e2e/provider-onboarding.spec.ts`.
- Local verification helpers: `.tools/provider-e2e.compose.yaml`,
  `test-provider-onboarding.ps1`, `provider-data-snapshot.py`,
  `provider-state-check.py`, `connect-provider-onboarding.py`; documentation in
  this guide, README, architecture/API/security/validation guides.

See [validation results](VALIDATION.md) for executed checks and local migration
verification. The focused browser runner uses its own named Compose project and
temporary PostgreSQL tmpfs database, with external source acquisition disabled.
It removes only those test containers; existing development data is untouched.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .tools/test-provider-onboarding.ps1
```

The helper uses the project's existing portable Node and local Docker paths. On
another machine, adjust executable paths rather than changing application settings.
