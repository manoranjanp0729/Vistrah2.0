# VISTRAH refinement backlog — canonical task list

This is the single source of truth for refinement work. Do not maintain a competing backlog. Package requirements are in [FUNCTIONAL_SPECIFICATION.md](FUNCTIONAL_SPECIFICATION.md); current feature evidence/status is in [FUNCTIONAL_INVENTORY.md](FUNCTIONAL_INVENTORY.md); journeys are in [USER_JOURNEYS.md](USER_JOURNEYS.md).

**Status vocabulary:** Complete = supported by recorded evidence; In progress = implementation/evidence is present but acceptance is incomplete; Planned = approved scope ready after dependencies; Blocked = a specific missing decision/evidence prevents safe work; Approval gated = requires explicit product/commercial/production approval. “Reported” is not independently reverified in this planning update.

## Legacy crosswalk

| Legacy ID | Work package | Preserved scope/status | Mapping status |
|---|---|---|---|
| I1 | 03 | Membership/API/SSR access and safe destinations; complete per supplied evidence. | Confirmed |
| I2 | 06 | Three accessible service tabs; complete with reported live desktop/mobile verification after frontend replacement. | Confirmed |
| I3 | 01 → destination after recovery | Current scope/status cannot be attributed from missing prior audit. Relevant/recent workflow code exists; preserve it. | Unresolved, not assumed untouched |
| I4 | 01 holding (source recovery) | ID retained; feature scope and status absent. Destination package TBD after source recovery. | Unresolved |
| I5 | 01 holding (source recovery) | ID retained; feature scope and status absent. Destination package TBD after source recovery. | Unresolved |
| I6 | 01 holding (source recovery) | ID retained; feature scope and status absent. Destination package TBD after source recovery. | Unresolved |
| I7 | 01 holding (source recovery) | ID retained; feature scope and status absent. Destination package TBD after source recovery. | Unresolved |
| I8 | 01 holding (source recovery) | ID retained; feature scope and status absent. Destination package TBD after source recovery. | Unresolved |
| I9 | 01 holding (source recovery) | ID retained; feature scope and status absent. Destination package TBD after source recovery. | Unresolved |
| I10 | 01 holding (source recovery) | ID retained; feature scope and status absent. Destination package TBD after source recovery. | Unresolved |
| I11 | 01 holding (source recovery) | ID retained; feature scope and status absent. Destination package TBD after source recovery. | Unresolved |
| I12 | 01 holding (source recovery) | ID retained; feature scope and status absent. Destination package TBD after source recovery. | Unresolved |
| Legacy backlog IDs | TBD | No original backlog item IDs were found. Do not replace or silently renumber them. | Unresolved pending source audit |

The work IDs below are additive identifiers for this plan; they do not replace legacy IDs. When original audit records are restored, update this crosswalk and attach exact legacy references without duplicating tasks.

## 01 — Audit and plan

### WP01-01 — Preserve the completed audit baseline
- **Status/evidence:** Complete per supplied task evidence: initial documentation audit and application-wide positioning are complete. Prior four audit artifacts are absent from this checkout and reachable history; current functional docs have been reconstructed from checked-in docs, explicit user evidence, and limited source checks.
- **Dependencies/decisions:** Restore/archive the original audit docs and original backlog IDs before claiming exact I3–I12 mappings. Exact positioning copy needs its approved source.
- **Scope:** Keep the evidence ledger and distinction between verified, reported, inferred, and unknown status current.
- **Exclusions:** No repeat of application-wide audit; no redesign or implementation.
- **Acceptance:** Inventory names the evidence source and verification limit for each completion claim; unknown legacy mappings remain visible.
- **Targeted checks:** Validate document links and crosswalk IDs; compare with restored audit snapshot when available.

### WP01-02 — Resolve I3 and legacy crosswalk
- **Status/evidence:** Blocked. `FUNCTIONAL_INVENTORY.md` records I3 as unresolved; repository contains existing/recent workflow code, but no original I3 description or acceptance test is present.
- **Dependencies/decisions:** Restore I3 scope, original backlog, and completed-task evidence.
- **Scope:** Compare exact acceptance points against relevant existing code, tests, and the currently deployed/built artifact; label each point complete, partial, or missing with evidence.
- **Exclusions:** No I3 implementation changes until scope comparison and approval.
- **Acceptance:** I3 has a traceable status and destination package; every recoverable I1–I12/backlog ID is cross-linked without duplicates.
- **Targeted checks:** Source-path/test inspection for only the recovered I3 scope; live verification only if the approved current container is meant to be evaluated.

## 02 — Foundation and critical defects

### WP02-01 — Fix one evidenced critical defect at a time
- **Status/evidence:** Planned. No critical-defect catalog with reproducible evidence was present in this checkout; do not infer one from general audits.
- **Dependencies/decisions:** A specific defect report, affected route/data/role, and an agreed severity/expected behavior.
- **Scope:** Minimal root-cause fix and focused regression, preserving existing route/API contracts and approved visual state.
- **Exclusions:** Broad refactors, dependency upgrades, unrelated cleanup, unapproved schema/API changes.
- **Acceptance:** Reproduction fails before and passes after; focused regression passes; unaffected approved journeys remain unchanged.
- **Targeted checks:** Smallest relevant API/UI regression, followed by applicable lint/type/build at integration point.

### WP02-02 — Confirm operational and data-safety invariants
- **Status/evidence:** Planned; existing project security and architecture docs contain baseline controls but the missing audit set may contain more exact rules.
- **Dependencies/decisions:** Restore source requirements for ownership, access, retention, and migration behavior.
- **Scope:** Record server-side authorization, safe redirects, private data handling, migrations/seeding lifecycle, and rollback expectations for future tasks.
- **Exclusions:** Changing startup behavior, database schema, credentials, or deployment.
- **Acceptance:** Each invariant points to an authoritative source and an applicable targeted check; no undocumented sensitive-data exposure is introduced.
- **Targeted checks:** Read-only code/test inspection now; isolated DB test only if later implementation changes data behavior.

## 03 — Identity, membership and service journeys

### WP03-01 — Preserve I1 access and membership behavior
- **Status/evidence:** Complete baseline per supplied evidence: existing membership/API/SSR access and safe destinations. Membership feature/API code is present; no tests were rerun for this planning task.
- **Dependencies/decisions:** None for preservation; restore exact I1 audit evidence for future modifications.
- **Scope:** Keep membership restrictions, server authorization, SSR/API access, and validated in-app destinations.
- **Exclusions:** Reimplementing I1, loosening restrictions, accepting client-side identity/eligibility, or changing membership/commercial terms.
- **Acceptance:** Protected server/API routes reject unauthorized access; valid users retain access; redirect targets remain safe and internal.
- **Targeted checks:** Existing focused auth/membership API tests and safe-destination tests; browser check after any approved UI/container change.

### WP03-02 — Reconcile and continue I3 only after evidence recovery
- **Status/evidence:** Blocked on WP01-02; relevant workflow code exists, so no assumption of untouched status.
- **Dependencies/decisions:** Original I3 scope plus permission/ownership expectations.
- **Scope:** Close only acceptance gaps proven by comparison, preserving current implementation.
- **Exclusions:** Replacing an existing journey or guessing I3 intent.
- **Acceptance:** Scope-to-code/test matrix is approved; each gap has a focused regression and documented status.
- **Targeted checks:** Tests named by recovered acceptance; live journey check if routing/rendering is part of scope.

## 04 — Seller management and admin content

### WP04-01 — Specify and implement persistent admin video management
- **Status/evidence:** Planned, new requirement; no video-management implementation evidence found.
- **Dependencies/decisions:** Approve roles, upload/source types, storage provider and access pattern, size/duration/codecs, retention/deletion, moderation, audit history, captions, public/private visibility, and replacement/archive process.
- **Scope:** Admin content workflow, server-side authorization/validation, durable media storage integration, review states, audit trail, and failure handling.
- **Exclusions:** Public user uploads, open/public storage bucket, unreviewed publish, autoplay policy, or selecting a paid vendor without approval.
- **Acceptance:** Authorized admin can create/update/submit/review according to approved roles; unapproved media is not publicly retrievable; media survives app/container replacement; invalid/oversized/unauthorized operations fail safely; audit history is queryable by authorized admins.
- **Targeted checks:** API permission and ownership tests; upload validation/storage integration tests using isolated test storage; moderation-state tests; no real media or production bucket in tests.

### WP04-02 — Seller ownership and listing approval regression
- **Status/evidence:** Planned/needs audit detail. Existing admin/seller code exists, but exact approved role and field rules are not in the checkout.
- **Dependencies/decisions:** Recover approved listing states, seller roles, editable fields, and moderator permissions.
- **Scope:** Verify seller can access/edit only owned content and public visibility follows approved review decisions.
- **Exclusions:** Changing seller monetization, listing fees, paid placement, or review policy.
- **Acceptance:** Cross-seller read/write is denied; pending/rejected listings do not appear publicly; approved listing is visible; admin decisions are auditable.
- **Targeted checks:** Isolated-database API tests for owner/admin/public role matrix and state transitions.

## 05 — Location, maps and provider discovery

### WP05-01 — Define privacy-safe Services Near You behavior
- **Status/evidence:** Planned, new requirement; existing configured provider listings are present, but no verified geolocation/map workflow found.
- **Dependencies/decisions:** Consent UX, precision/radius, map/geocoder provider, transient vs stored location, retention, fallback/manual area, provider coverage, ordering, and data-sharing approval.
- **Scope:** Privacy threat model and approved interaction/data contract before map implementation.
- **Exclusions:** Exact customer coordinates in public pages, logs, analytics, or shareable URLs; location-based recommendation claims; background tracking.
- **Acceptance:** User can decline and use manual fallback; only minimum approved precision is processed; retention/deletion behavior is defined; provider results respect listing eligibility and do not label proximity as Recommended.
- **Targeted checks:** Consent/denial/fallback tests, location redaction checks, and mocked geospatial tests after implementation.

### WP05-02 — Preserve human-reviewed Recommended provider workflow
- **Status/evidence:** Approved requirement recorded in specification; implementation and moderation evidence need recovery.
- **Dependencies/decisions:** Confirm reviewer role, eligibility criteria, review record, expiration/re-review, and public label copy.
- **Scope:** Present only eligible provider selections that pass the approved human review.
- **Exclusions:** Algorithmic or paid recommendation ranking, claims of personalization/guaranteed fit, automatic selection by distance.
- **Acceptance:** Ineligible/unreviewed/expired records cannot show Recommended; reviewer and decision provenance are auditable; ordinary browse listings are not mislabeled.
- **Targeted checks:** Eligibility/state API tests and UI label/accessibility check.

## 06 — Homepage and discovery UI

### WP06-01 — Preserve I2 accessible service tabs
- **Status/evidence:** Complete per supplied report: three accessible tabs, live desktop/mobile verification after frontend replacement. Not independently rechecked in this planning task.
- **Dependencies/decisions:** None unless a scoped homepage change touches the tab component.
- **Scope:** Preserve tab semantics, keyboard behavior, content, and current approved desktop/mobile layout.
- **Exclusions:** Redesign, replacing component, changing order/content without approval.
- **Acceptance:** Correct tab roles/states, keyboard navigation, panel association, responsive behavior; report distinguishes source test from live built-container check.
- **Targeted checks:** Accessibility/component test; desktop/mobile live check only after approved container update.

### WP06-02 — Homepage video and Services Near You carousels
- **Status/evidence:** Planned, new requirements; no implementation evidence found.
- **Dependencies/decisions:** WP04 video approval/storage and WP05 location/consent contract; editorial order, empty/loading/error behavior, cards per breakpoint, autoplay/reduced-motion, labels, keyboard/swipe behavior.
- **Scope:** Accessible carousel presentation for approved videos and privacy-safe eligible nearby providers.
- **Exclusions:** Unapproved media, silent location capture, automated Recommended labels, sponsored ordering without commercial approval.
- **Acceptance:** Correct approved data only; keyboard and touch work; reduced motion respected; useful empty/error/permission-denied states; responsive without horizontal page overflow.
- **Targeted checks:** Component/accessibility tests, API contract tests, responsive browser checks on approved running build.

## 07 — Campaigns, payments and financial reconciliation

### WP07-01 — Specify campaigns and eligibility safeguards
- **Status/evidence:** Planned. Existing payment foundation is sandbox-only; campaign terms/eligibility beyond existing referral documentation are unresolved.
- **Dependencies/decisions:** Eligibility predicates, caps, stacking, audience, expiry, cancellation/refund behavior, reason visibility and audit retention.
- **Scope:** Server-side evaluation contract and auditable campaign lifecycle after approval.
- **Exclusions:** Client-only eligibility, invented discounts, paid/provider-funded placements, real money movement.
- **Acceptance:** Eligibility is deterministically checked server-side and records a reason; ineligible users cannot redeem by API manipulation; terms and reversal cases are explicit.
- **Targeted checks:** Isolated-database boundary/abuse/state tests; no changes to live payment mode.

### WP07-02 — Define service fees, settlements, and VISTRAH/affiliate commission reporting
- **Status/evidence:** Approval-gated new requirement. Existing foundation records sandbox payments/allocations/refunds/settlements and local reconciliation only.
- **Dependencies/decisions:** Explicit approval of fee basis/rate, payer/payee, taxes, rounding, timing, holds, minimums, dispute/refund/chargeback treatment, currency, reporting permissions, affiliate attribution and payout relationship.
- **Scope:** After decisions, versioned fee/allocation rules, immutable ledger adjustments, recipient eligibility, provider report ingestion, reconciliation evidence, and permissioned statements.
- **Exclusions:** Live gateway transfers, production credentials, inferring a rate, promising payout timing, treating click estimates as revenue, editing existing migration in this planning task.
- **Acceptance:** Calculations reproduce from approved versioned terms; refunds/disputes create linked reversible adjustments; each commission/settlement row links to authoritative source evidence; mismatch is visible and cannot be silently discarded; admin/customer scopes are enforced.
- **Targeted checks:** Decimal/rounding unit cases; isolated-DB ledger/idempotency/refund tests; signed provider fixture/report reconciliation tests; permissions tests.

## 08 — Affiliate marketplace and final validation

### WP08-01 — Define affiliate products and website directory
- **Status/evidence:** Planned, new requirement. Existing `docs/business/referral-program.md` covers user referrals/rewards, not an affiliate catalog or commission ledger.
- **Dependencies/decisions:** Who may submit/manage, merchant relationship, product/site taxonomy, moderation, URL safety, disclosures, expiration, ranking, duplicate handling, external integrations and data-sharing review.
- **Scope:** Approved catalog records, reviewed outbound destinations, product and website directory presentation, required disclosure.
- **Exclusions:** Assuming every link is tracked/commissionable, unmoderated user submissions, paid ordering, unapproved external integrations.
- **Acceptance:** Only reviewed active entries are public; unsafe/expired entries are hidden; outbound vs tracked status is clear; disclosures are visible and accessible.
- **Targeted checks:** URL validation/moderation tests, role tests, public API visibility tests, accessible card/link checks.

### WP08-02 — Affiliate attribution and verified commission evidence
- **Status/evidence:** Approval-gated and dependent on WP07-02; no verified affiliate reporting implementation found.
- **Dependencies/decisions:** Named affiliate network/provider, attribution method/window, consent/cookie rules, currency/tax, evidence schema/signature/source report, reversals/disputes, reporting and payout roles.
- **Scope:** Separate tracked integration records and authoritative commission import/reconciliation from ordinary outbound clicks.
- **Exclusions:** Estimating commission from impressions/clicks, fabricating conversions, storing unnecessary identifiers, actual payout without approval.
- **Acceptance:** Commission report has source/provenance and reconciles idempotently; click counters never become financial amounts; adjustments retain history; consent and data minimization are enforced.
- **Targeted checks:** Fixture-based import/idempotency/reversal tests, privacy redaction tests, permissioned report tests.

### WP08-03 — Integrated release validation (not deployment)
- **Status/evidence:** Planned; I1/I2 remain completed baselines with the limits in the inventory.
- **Dependencies/decisions:** All preceding implementation approvals; a known build/container update; test accounts/data in isolated environments; visual sign-off for affected approved pages.
- **Scope:** Focused journey regression, access/privacy checks, accessibility, responsive live verification, and artifact/version evidence.
- **Exclusions:** Production deployment, DNS, billing, live payments, data migration, broad unrelated test reruns.
- **Acceptance:** Each changed journey has source tests and, where rendered output changes, a verified current running container/build at agreed desktop/mobile sizes; report artifact identity, findings, and limitations.
- **Targeted checks:** Changed-task tests first; integration regression only at milestone; browser QA against the updated container where UI changed.

## Execution order and gates

1. WP01-02 first: recover I3 and legacy backlog definitions. Parallel implementation is not assumed.
2. WP02 tasks address only evidenced critical defects.
3. WP03–WP06 retain approved baselines; location/video decisions precede their dependent UI.
4. WP07/WP08 money-flow, commercial, tracking, privacy, and external-provider decisions require explicit approval before financial implementation.
5. WP08-03 validates approved changes. No package grants deployment, billing, live payments, or production rollout authority.

