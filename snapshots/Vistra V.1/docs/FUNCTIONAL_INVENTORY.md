# VISTRAH functional inventory and refinement status

This inventory is the planning reference for the eight work packages in [REFINEMENT_BACKLOG.md](REFINEMENT_BACKLOG.md). Scope and acceptance rules are in [FUNCTIONAL_SPECIFICATION.md](FUNCTIONAL_SPECIFICATION.md); end-user and operational flows are in [USER_JOURNEYS.md](USER_JOURNEYS.md).

## Evidence and preservation note

The requested prior audit files were not present in this checkout or its reachable Git history. This inventory consolidates the available architecture/functionality docs, current repository evidence, the explicit completed-task evidence in the refinement request, and preserves legacy increment labels I1–I12 without inventing missing descriptions. Recover the original audit snapshot before resolving unknown legacy item mappings. Do not replace existing implementations while this evidence gap remains.

## Work package and increment index

| Package | Work area | Legacy mapping | Current inventory status |
|---|---|---|---|
| 01 | Audit and plan | Audit evidence; unmapped legacy backlog IDs remain unverified | Initial documentation audit completed; current four planning documents are reconstructed here because their prior copies are absent. |
| 02 | Foundation and critical defects | I4–I12 feature allocation awaits source audit | No completion claim. Inventory concrete defects only when a source issue/evidence is recorded. |
| 03 | Identity, membership and service journeys | I1; I3 only if the original increment definition confirms it | I1 completed per recorded evidence. I3 is not safely attributable to a scope from this checkout; related code exists, so it must not be treated as untouched. |
| 04 | Seller management and admin content | I4–I12 allocation awaits source audit | Existing admin surfaces exist; new admin video/content management is a new requirement, not verified as implemented. |
| 05 | Location, maps and provider discovery | I4–I12 allocation awaits source audit | Existing provider directory records exist. Location-aware discovery and privacy behavior are not verified. |
| 06 | Homepage and discovery UI | I2; I4–I12 allocation awaits source audit | I2 completed per reported live desktop/mobile verification after frontend replacement. New homepage video and discovery carousels are requirements, not verified implementations. |
| 07 | Campaigns, payments and financial reconciliation | I4–I12 allocation awaits source audit | Membership/payment foundation is sandbox-only. Marketplace fee, affiliate commission reporting, and external financial reconciliation require decisions and implementation. |
| 08 | Affiliate marketplace and final validation | I4–I12 allocation awaits source audit | Ordinary referral documentation exists; it does not establish an affiliate product marketplace or commission ledger. |

### Legacy increment ledger

| ID | Preserved scope/status evidence | Package mapping |
|---|---|---|
| I1 | Existing membership/API/SSR access and safe destinations: completed. Carry forward as a verified baseline; do not reimplement. | 03 |
| I2 | Three accessible service tabs: completed, including reported live desktop/mobile verification after frontend replacement. This is reported evidence, not independently reverified in this planning task. | 06 |
| I3 | Current status: unresolved, with evidence of ongoing/recent implementation in repository history and existing workflow code. The former increment definition and acceptance evidence are absent, so neither “untouched” nor “complete” is justified. Preserve current code; restore its original definition and compare before editing. | 01 evidence gate; implementation destination TBD after scope match |
| I4 | ID retained; scope, status, tests, and original backlog references unavailable in this checkout. | 01 holding for source recovery; feature destination TBD |
| I5 | ID retained; scope, status, tests, and original backlog references unavailable in this checkout. | 01 holding for source recovery; feature destination TBD |
| I6 | ID retained; scope, status, tests, and original backlog references unavailable in this checkout. | 01 holding for source recovery; feature destination TBD |
| I7 | ID retained; scope, status, tests, and original backlog references unavailable in this checkout. | 01 holding for source recovery; feature destination TBD |
| I8 | ID retained; scope, status, tests, and original backlog references unavailable in this checkout. | 01 holding for source recovery; feature destination TBD |
| I9 | ID retained; scope, status, tests, and original backlog references unavailable in this checkout. | 01 holding for source recovery; feature destination TBD |
| I10 | ID retained; scope, status, tests, and original backlog references unavailable in this checkout. | 01 holding for source recovery; feature destination TBD |
| I11 | ID retained; scope, status, tests, and original backlog references unavailable in this checkout. | 01 holding for source recovery; feature destination TBD |
| I12 | ID retained; scope, status, tests, and original backlog references unavailable in this checkout. | 01 holding for source recovery; feature destination TBD |

No legacy backlog-item identifiers were found. New work IDs in the canonical backlog must not be mistaken for replacements of missing legacy IDs.

## Existing application inventory

| Capability | Repository evidence | Status and verification limit |
|---|---|---|
| Public catalogue and service routes | `apps/web/features/catalogue/`, `apps/web/app/service/` | Implemented; this task did not run application checks. |
| Authentication/account | `apps/web/app/login/`, `signup/`, `profile/`; `backend/api/app/core/auth.py` | Present; detailed approved privacy/role rules must be preserved from recovered audit/source evidence. |
| Membership | `apps/web/features/membership/`, `/membership`, `/sandbox-checkout`, membership API/domain | Present; I1 completion evidence is user-supplied/documented, not rerun here. Sandbox only. |
| Admin | `/admin`, `/admin/membership`, `/admin/payments`, `backend/api/app/api/v1/admin*` | Present; new video storage/management is not evidenced. |
| Provider discovery | `apps/web/app/data/civil.ts`, provider-specific routes | Existing configured listing, not a verified location-based or automated recommendation system. |
| Recommended workflow | Existing project requirement: human-reviewed eligible provider recommendations | Preserve human review and “eligible” meaning; do not claim algorithmic ranking or automated recommendations. |
| Payments/settlements | `backend/api/app/domain/payments/`, migration `database/migrations/20261008_membership_payments.sql` | Existing foundation is sandbox-only; no production provider reconciliation evidence. Do not run or alter the migration in planning work. |
| Affiliates | `docs/business/referral-program.md` | Describes user referral rewards, not an affiliate catalog, tracked commission, or verified commission reporting. |
| Video, map, affiliate marketplace | No implementation evidence recorded in this inventory | New requirements pending decisions and work. |

## Verification ledger

- Initial documentation audit: completed, according to the supplied task evidence; the actual audit artifacts are missing from this checkout.
- Application-wide positioning: completed, according to supplied task evidence. Preserve the positioning as the baseline; the source audit record should be recovered for exact copy/claims.
- I1: completed with existing membership/API/SSR access and safe destinations, according to supplied evidence.
- I2: completed with three accessible service tabs and reported live desktop/mobile verification after frontend replacement. No new visual verification was performed for this planning update.
- I3: not determinable as complete or untouched. Repository contains relevant/recently implemented workflows, but legacy scope and test evidence are missing.
- Planning-document consistency only: checked by reviewing repository paths and references; no application tests, build, browser session, or container operation was performed.


