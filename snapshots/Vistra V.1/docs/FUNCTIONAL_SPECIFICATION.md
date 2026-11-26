# VISTRAH functional specification

This specification records approved invariants, new requirements, and open decisions for the canonical eight-package backlog in [REFINEMENT_BACKLOG.md](REFINEMENT_BACKLOG.md). Inventory evidence and legacy increment mapping are in [FUNCTIONAL_INVENTORY.md](FUNCTIONAL_INVENTORY.md); journeys are in [USER_JOURNEYS.md](USER_JOURNEYS.md).

## Preservation rules

1. Preserve application-wide VISTRAH positioning and approved copy; do not add unverified claims.
2. I1 membership/API/SSR access and safe destinations are complete baseline work. Preserve membership restrictions and access checks.
3. I2’s three accessible service tabs are complete baseline work. Evidence includes reported live desktop and mobile inspection after frontend replacement; this planning update did not repeat that inspection.
4. I3 is not declared untouched or complete. Keep current implementation intact until the original increment definition is restored and compared to repository evidence.
5. Keep seller ownership checks, listing review/approval, private location handling, campaign eligibility, and data-protection safeguards intact. Exact field-level policies and original acceptance evidence must be recovered from the missing audit set before implementation changes.
6. “Eligible provider recommendations” means providers eligible for consideration and explicitly human-reviewed through the approved Recommended workflow. Do not represent results as automated, personalized, ranked, guaranteed, or system-recommended absent an explicit approval and accurate evidence.
7. Membership benefits do not imply free services. Payment, membership and service transactions remain distinct. Existing payment work is sandbox-only; do not enable live payment processing.
8. Paid provider placement, seller billing, production deployment, and unresolved commercial or money-flow rules remain blocked behind explicit approval.

## Requirements by work package

### 01 — Audit and plan

Maintain one canonical backlog with stable IDs and cross-references. Preserve I1–I12 and prior backlog IDs when source records are available. The prior four audit files are absent in this checkout; restore them before claiming an exact mapping for I3–I12 or prior backlog items. Do not create a second competing task list.

### 02 — Foundation and critical defects

Fix only evidenced defects with reproduction steps and a scoped regression. Preserve route compatibility, existing data, access controls, and approved visuals. Do not bundle unrelated redesigns or dependency upgrades.

### 03 — Identity, membership and service journeys

Preserve existing access control, membership restrictions, API/SSR behavior and safe return destinations (I1). Validate a customer journey end-to-end against current backend contracts before changing it. Never trust client-provided identity, ownership, amount, or eligibility for an authorization or transaction decision.

### 04 — Seller management and admin content

New requirement: admin video management and persistent video storage. Admin privileges, upload/replace/archive/delete policy, moderation, audit history, upload constraints, retention, and public visibility are unresolved. No public upload or storage-bucket access is authorized by this requirement alone. Seller-owned content and listings remain scoped to their owner; listing publication requires the existing/approved review gate.

### 05 — Location, maps and provider discovery

Preserve location privacy. Do not expose exact home/customer coordinates or retain location longer than approved. Clarify consent, precision, storage/retention, map vendor, search radius, and fallback behavior before implementation. A map marker or proximity filter must not be described as a recommendation. Human-reviewed eligible provider selections remain the only approved Recommended workflow.

### 06 — Homepage and discovery UI

I2’s accessible three-tab service UI remains approved. New requirements: homepage video carousel and Services Near You carousel. Define data source, empty/loading/error states, sort/order, mobile interactions, keyboard behavior, media accessibility, and location consent before implementation. Do not insert paid or sponsored ordering without explicit commercial approval and labeling rules.

### 07 — Campaigns, payments and financial reconciliation

New requirements: marketplace settlements, VISTRAH service fees, and affiliate commission reporting. These need explicit approval of fee basis, payer/payee, tax treatment, refund/chargeback behavior, settlement timing, minimums, rounding, reserve/hold rules, currency, dispute handling, reporting access, and reconciliation evidence. Do not infer rates, promise payout timing, or create production money movement. Campaign eligibility remains enforced on the server using approved criteria and auditable decisions. Existing gateway stays sandbox-only until separately approved.

### 08 — Affiliate marketplace and final validation

New requirements: affiliate product carousel, affiliate products, and an affiliate website directory. Separate these concepts and capabilities:

- An ordinary outbound link navigates to the external destination and is not by itself a commission record.
- A tracked commission requires an identified affiliate arrangement, approved tracking method, explicit attribution rules, and verified provider evidence.
- Reconciliation requires source transaction/commission reports or equivalent signed/authoritative data; click counts, impressions, estimates, and inferred conversions cannot be presented as commission earned.
- External integrations require a named integration, data-sharing assessment, credentials handling, failure/retry behavior, and explicit approval.

Product/site sourcing, merchant onboarding, link moderation, prohibited content, disclosures, ranking, duplicate handling, attribution window, cookie/privacy choices, commission statements, and payout relationship are unresolved. Do not publish unreviewed destinations or imply endorsement. Final validation must cover permissions, data protection, functional journeys, accessible UI, and responsive behavior after approved implementation; it does not authorize deployment.

## Cross-cutting acceptance requirements

- Authorization and ownership are enforced server-side on every protected read/write.
- Personal data is minimized; secrets, exact private locations, and payment credentials are not exposed in client code, logs, URLs, or public media metadata.
- New admin or seller operations are auditable and have explicit role/ownership behavior.
- Media and external URLs are validated and moderated according to an approved policy; unknown policy is a blocker, not a default-open behavior.
- Money reporting is based on immutable transaction records and authoritative provider/merchant evidence; adjustments preserve an audit trail.
- UI is accessible by keyboard and assistive technology and has tested empty/loading/error states at supported responsive sizes.
- Verification distinguishes source tests, built artifact, running container, and live browser observation. A source test alone does not prove a running site has updated.
