# VISTRAH user journeys

These journeys define the target behavior and open decision gates. The canonical work items live in [REFINEMENT_BACKLOG.md](REFINEMENT_BACKLOG.md); evidence and completion claims are in [FUNCTIONAL_INVENTORY.md](FUNCTIONAL_INVENTORY.md). Do not treat a proposed journey as implemented merely because its route exists.

## Completed baseline journeys

### I1 — Membership access and safe destination

1. A visitor enters a protected membership/service journey.
2. The application checks the current session and membership/access rules at the server/API boundary as well as the rendered page.
3. An unauthenticated visitor is sent through sign-in with a validated in-app destination.
4. After sign-in, navigation returns only to a safe approved destination; external or malformed redirects are rejected.
5. Membership restrictions remain enforced for the requested action.

Status: completed per supplied evidence. Do not replace with a new flow without a scoped requirement.

### I2 — Three accessible service tabs

1. A visitor opens the service discovery surface.
2. They can navigate among the three approved service tabs with keyboard and assistive technology and identify the active tab/panel.
3. Each panel presents its intended content and works at desktop and mobile widths.

Status: completed; evidence includes reported live desktop/mobile verification after frontend replacement. Reverify only if an approved change touches the tabs or their shared layout.

## Journeys requiring planning or implementation

### I3 — Prior increment journey (definition recovery required)

The existing I3 title, actor, preconditions, and acceptance criteria cannot be recovered from the current checkout. Repository code includes current/recent workflow implementation; preserve it. First compare the original I3 definition to existing routes, API, tests, and live artifact, then record status as complete, partial, or not implemented with evidence. No behavior change is authorized by this unresolved mapping.

### Seller owns and publishes a listing (approved safeguards; exact steps to recover)

1. Seller signs in and sees only seller-owned draft/listing records.
2. Seller edits or submits content only for owned records.
3. Admin/moderator reviews a submitted listing and records a decision.
4. Only approved content is publicly visible; rejected/pending content does not leak through public APIs or cached pages.
5. Ownership and review decisions are tested through API as well as UI.

Decision gate: recover exact seller roles, editable fields, and approval states from the missing audit evidence before changing contracts.

### Admin manages video and homepage carousel (new)

1. Authorized admin creates or edits video metadata and attaches media stored persistently through an approved private storage workflow.
2. Validation and moderation occur before public placement.
3. Homepage video carousel displays only approved/active media with accessible controls, captions/poster/fallback behavior, and usable reduced-motion behavior.
4. Admin can review status and audit history; public users cannot access private upload controls or unapproved media.

Open decisions: accepted file/source types, upload provider, size/duration/codec limits, public-vs-private object strategy, moderation roles, replacement/archive/delete, retention, subtitles/captions, autoplay, consent, and fallback.

### Services Near You and provider discovery (new)

1. Visitor explicitly chooses whether to share location or enter a coarse area manually.
2. The service requests only the approved precision and explains why it is needed.
3. The visitor sees eligible providers and can review their details; denied/unknown location has a useful manual fallback.
4. A Recommended label appears only after the existing human-reviewed selection workflow; proximity alone never earns that label.
5. Private coordinates are not included in public provider pages, logs, analytics, or shareable URLs.

Open decisions: map vendor, precision/radius, consent persistence, retention, user controls, ranking/order, coverage, and whether location is processed transiently or stored.

### Homepage discovery carousels (new)

- **Services Near You:** follows the location journey above and honors consent and eligibility.
- **Affiliate products:** displays only approved product records and reviewed outbound destinations, with disclosure and accessible carousel controls.
- **Video:** displays only approved media that passes the admin content workflow.

Open decisions: ordering, empty state, responsive card counts, keyboard/swipe behavior, labels/disclosures, editorial ownership, loading/error recovery, and personalization. Paid position or impression billing is out of scope pending approval.

### Affiliate products and website directory (new)

1. Admin/editor adds a merchant/product/site record and its destination URL.
2. Required moderation, safety checks, ownership/relationship disclosure, and link validation are completed.
3. Public user may open the destination. If the record is an ordinary outbound link, the system records no commission claim.
4. If a tracked affiliate arrangement is separately approved, attribution data is processed under disclosed privacy rules.
5. Commission reporting accepts verified statements/events from the merchant/network and records corrections with provenance. Clicks are not revenue evidence.

Open decisions: who may submit/manage entries, allowed categories, review/expiry process, external URL validation, disclosures, tracking provider, attribution and consent, evidence format, reversals, reporting permissions, payout ownership, and dispute process.

### Campaign eligibility and redemptions

1. Admin defines an approved campaign and eligibility rules.
2. Server evaluates eligibility at the relevant action and records a reason/evidence reference.
3. User sees clear terms and a result without seeing another user's personal data.
4. Refund, cancellation, expiry, and abuse handling follow approved campaign rules.

Open decisions: exact eligibility predicates, stacking, caps, audience permissions, audit retention, and edge-case handling. Client-side flags alone do not grant eligibility.

### Service fee, marketplace settlement, and reconciliation (new)

1. Customer makes an approved service payment through the configured provider.
2. Backend records the provider transaction and applies only approved, versioned fee/allocation terms.
3. Refunds, disputes, and reversals create linked adjustments; original ledger rows remain auditable.
4. Settlement is initiated only for eligible, verified recipients under approved timing/hold rules.
5. Reconciliation matches internal records to provider settlement and fee reports; unmatched items are visible with evidence and resolution history.

Current code is sandbox-only and its reconciliation is local-ledger checking. Production provider integration, recipient onboarding, actual transfers, fee/commission terms, and report imports are not implied by this target journey.

## Global journey safeguards

Authentication, seller ownership, admin permissions, listing approval, location consent, campaign eligibility, data minimization, accessibility, and safe redirects are server-enforced where applicable. External integrations, paid listings, provider billing, production deployment, and live payment remain explicit approval gates.
