# VISTRAH 2.0 user journeys

## Integrated AWS Test milestone — 20 October 2026

This matrix supersedes historical scope/paused statements only for the newly
authorized milestone. Paths below are inspected source, not proof of deployment.
Dynamic category/service routes retain canonical IDs and approved imagery; the
five tabs and three membership-gated service pathways remain unchanged.
`S` = implemented/source traced, `L` = prior isolated/local evidence, `H` = hosted
CI evidence, `U` = live/device result unverified. Synthetic test success never
means an existing account/payment/publication was changed.

| Role / source action | Input and destination | API / backend authority | Durable effect and success | Permission / error and retry | Evidence / remaining acceptance |
|---|---|---|---|---|---|
| Customer: homepage discovery (`frontend/app/(public)/page.tsx`, `mobile/src/app/(tabs)/index.tsx`) | Search/category/service ID → `/services`, `/category/[slug]`, `/service/[id]` | `/catalogue`, `/marketplace/taxonomy/resolve`; `main.py` | Read catalogue; correct selected classification | Public; loading/empty/error, no fabricated fallback data | S/L; AWS and physical-device U |
| Customer: location chooser (`customer-location.tsx`, native `location.tsx`) | Manual location or explicit GPS → discovery | `/me/location`, `/services/{service_id}/nearby`; `location_routes.py` | Temporary unless explicitly saved; own saved location only | Membership for provider access; GPS opt-in/manual fallback; failed lookup retry | S/L; live location API and device permission U |
| Customer: service pathways (`frontend/components/service-pathways.tsx`, native `service/[id].tsx`) | Canonical service + intent → directory/recommended/managed enquiry | `/services/{service_id}/providers`, `/services/{service_id}/member-information`, `/requests`; `main.py` | Read eligible provider/guide or persist enquiry with service/intent | Backend membership recheck; unavailable offerings remain explicit | S/L; authenticated full journey U |
| Customer: provider selection (`frontend/components/service-explore.tsx`) | Service/provider slug → existing provider detail route | `/services/{service_id}/providers/{slug}`; `main.py` | Read permitted provider information | Membership; not-found/private fields fail closed | S/L; external-provider integration not assumed |
| Customer: estimate (`mobile/src/app/estimate/[id].tsx`) | Service-specific answers → own request | `POST /requests`; `main.py` | Persist human-review enquiry, not automatic price | Membership, field validation; preserve inputs on error | S/L; AWS persistence/confirmation U |
| Customer: request/history (`mobile/src/app/request/[id].tsx`, `(tabs)/requests.tsx`) | Service/intent/contact consent → request list/status | `POST /requests`, `/me/requests`; `main.py` | Own request record, real reference/status | Auth/membership; unauthorized/validation/network errors | S/L; recipient/seller/admin follow-up U |
| Customer/seller: auth (`frontend/components/customer.tsx`, native `auth.tsx`) | Customer/seller login/register → account/seller | `/auth/login`, `/auth/register`, `/auth/seller/login`, `/auth/seller/register`; `main.py` | Revocable session/user; no role escalation | Exact origin/cookie vs native bearer; validation/error retry; consent resets on mode change | S/L; legal choices still frontend-only, backend consent gate open |
| Customer: profile/settings (`mobile/src/app/profile.tsx`, frontend language provider) | Own edits/language/theme → account/settings | `GET/PATCH /me`; `main.py`; preference storage | Own profile and saved language/theme | Session; storage failure surfaced, no cross-user private cache | S/L; hosted/current Android U |
| Customer: jobs (`frontend/app/(public)/jobs/[id]/page.tsx`, native `jobs.tsx`) | Source/filter/job → actual job/contact destination | `/employer-jobs`, `/employer-jobs/{job_id}`, discovery APIs; `employer_job_routes.py`, `discovery_routes.py` | Read approved eligible job; external handoff labelled | Public visibility/expiry; unavailable source remains error/empty | S/L; native dedicated details/application acceptance U |
| Customer: V Ads (`frontend/components/v-ads.tsx`, native `(tabs)/v-ads.tsx`) | Feed/video/like/comment/share → reel/advertiser | `/v-ads/reels`, `/v-ads/advertisers/{advertiser_id}`, engagement/media routes | Approved feed, durable engagement; bounded signed-in views | Approved advertiser/video; anonymous/private-media rules; retry without fake engagement | S/L; real media/device/audio/lifecycle U |
| Seller: business workspace (`frontend/components/seller.tsx`, native `seller/business/[id].tsx`) | Business ID → owned details/services/leads | `/seller/businesses`, `/seller/businesses/{provider_id}`; `seller_routes.py` | Existing owned business data/status | Seller capability + ownership; no other-business access | S/L; full AWS read/write U |
| Seller: multi-service onboarding (`provider-onboarding.tsx`, native `provider-applications/`) | Categories/subcategories/services/evidence → draft/submit/status | `/provider-applications/batch`, `/{id}/services`, `/{id}/submit`; `provider_routes.py` | Application/service/document records; pending until review | Relationships, published requirements, ownership; preserve failed drafts | S/L; live upload and review round-trip U |
| Seller: missing catalogue request (`frontend/lib/catalogue-requests.ts`) | Missing classification/context → own request status | `/seller/catalogue-requests`; `catalogue_request_routes.py` | Traceable pending catalogue request | Seller/owned context; validated kind/parents, no automatic public classification | S/L; admin round-trip U |
| Seller: publication/ownership (`ownership-claims.tsx`, `publication.tsx`) | Business/evidence/reason → claim/draft status | `/seller/ownership-claims`, `/seller/businesses/{provider_id}/publication-drafts`; seller/publication routes | Private evidence/proposal + audited independent decision | Verified contact/owner/recusal rules; expiry/stale conflict, SMTP dependency | S/L; actual mail and AWS evidence recovery U |
| Seller: leads (`mobile/src/app/seller/leads.tsx`) | Owned business/request → permitted enquiry detail/status | `/seller/leads`; `seller_routes.py` | Read assigned enquiries without saved customer GPS | Owner isolation; unavailable/unauthorized errors | S/L; dedicated detail/response coverage U |
| Seller: hiring (`mobile/src/app/employer-jobs.tsx`) | Owned business/job + entitlement → draft/submit/status | `/seller/businesses/{provider_id}/jobs`, `/{job_id}/submit`; `employer_job_routes.py` | Job/review/credit ledger under approved rules | Ownership, independent approval, atomic credits; no unverified paid grants | S/L; full credit→approval→public job U |
| Seller: membership/marketing (`business-membership.tsx`, native membership screens) | Existing plan or benefit request → subscription/request status | `/membership/plans`, `/me/business-membership`, `/membership/benefit-requests`; `business_membership_routes.py` | Sandbox subscription/benefit records only | Production paid entitlement fails closed; prices unchanged | S/L; live gateway/tax/refund/business decisions remain blocked |
| Seller: V Ads (`frontend/components/v-ads-seller.tsx`, native `seller/v-ads.tsx`) | Advertiser/profile/MP4 ≤100 MiB → upload/submission/status | Advertiser/media/submission/management routes | Private owned media + pending video, durable review history | Owner/status, FFprobe validation, quotas/private mode; retry/recovery, no external URL bypass | S/L; candidate storage/restart/Android picker U |
| Seller/customer: commerce (`frontend/components/commerce*.tsx`, native `commerce/`) | Listing/cart/order/transition → record detail | Commerce/listing/order routes | Reviewed listing and unpaid test order/status transitions | Ownership, stock/price/transition checks; live ordering/payment gated | S/L; whole lifecycle and rollback U |
| Admin: separate entry (`admin/app/admin/[[...section]]/page.tsx`) | Independent admin login → management queue/detail | `/admin/*`; backend `admin_user` + domain routes | Actual operational records/decisions | Backend ADMIN, separate cookie proxy, no customer-login privilege escalation | H: prior admin checks passed; AWS admin session U |
| Admin: provider/catalogue/publication/ownership | Actual queue ID/reason → persisted review + seller-visible status | Provider/catalogue/seller/publication admin routes | Transactional decision, eligible publication, audit | ADMIN, independent reviewer, ownership/contact/version guards | S/L; full private evidence/status round-trip U |
| Admin: jobs/V Ads (`admin/app/admin/employer-jobs`, `v-ads`) | Pending ID/status/reason → review/history | Employer/V Ads review/management routes | Approved-only public results; rejection/removal recorded | ADMIN, no self-approval, stale/invalid decisions fail | S/L/H: queue fixture corrected; run #50 PostgreSQL backend passes; real AWS review U |
| Admin: commerce/memberships/marketing | Record/transition/reason → updated queue | Commerce/order/business-membership admin routes | Order/benefit/review/audit records | ADMIN + transition/ledger safeguards; no invented commercial fulfilment | S/L; integrated AWS U |
| Admin: homepage (`admin/app/admin/homepage/page.tsx`) | Draft/version → preview/publish/restore | `/admin/homepage/*`; `homepage_routes.py` | Versioned draft/publication; public clients refresh same data | ADMIN, revision/validation; immutable history | S/L; real admin→website→Android refresh U |
| Operations: worker/recovery | Approved synthetic workflow → leased execution/status | `workflow_worker.py`, workflow routes | Persistent leases/retries/results; safe external actions only | Explicit worker activation, external source/SMTP controls; no token/private data in logs | S/L; AWS worker/SMTP/restore gates U |

Acceptance remains open until each supported action has an inspected destination,
actual API result, appropriate durable effect, negative permission/error case and
recorded client evidence. The matrix is a starting trace, not a completion claim.
Missing external providers, email delivery, payment integration and native detail
coverage are explicit gaps, not authorization to invent providers or pricing.

## Frontend redesign live verification - 11 October 2026

- Approved web-only command completed: `docker compose -p vistrah20 -f compose.yaml up -d --no-deps --build web`. The redesigned frontend is now live; API/database/worker identities and start times are unchanged.
- Live homepage, `/services`, Resume Building detail and guarded directory passed read-only browser checks at 1440/390 px. Location chooser is below the header beside search on desktop and above search on mobile, rather than inside the header. Manual temporary selection, optional GPS denial fallback, four radii, three gated detail tabs and no horizontal overflow verified.
- Homepage shows eight real catalogue category cards. Nearby providers remain membership-gated; affiliates correctly show no configured brands/links. API health/connectivity works, but `/me/location` and `/services/{service_id}/nearby` are absent from the running API. Persistent save and eligible live carousel data cannot be verified. No external providers or invented content used.
- Detailed build, health and evidence: `docs/REFINEMENT_BACKLOG.md`, Frontend redesign live verification section. No migrations, seeds, volume operations or configuration changes.

## Approved API rollout preflight — 11 October 2026

Customer journeys remain on the existing running frontend/API: no location rollout or redesign deployment occurred in this task. API rollout is stopped because the worker writes continuously and may not be paused under the current constraint. The proposed frontend-only replacement would expose the tested redesign while leaving API/worker/database unchanged; absent live save/nearby routes and affiliate data must remain explicit blockers. See [approval plan](REFINEMENT_BACKLOG.md#approved-api-rollout-preflight--11-october-2026).

## Presentation-only discovery refresh — 11 October 2026

The source discovery introduction now places Choose your location beside service search, stacking on mobile. Customers scan compact category thumbnails/titles/counts, then use the existing category/service links and three service tabs. Provider actions remain available; expanding Provider access and review reveals the complete notice and existing application link. Member-only nearby cards retain horizontal scrolling; missing affiliate content retains an accurate empty state. See [visual evidence](REFINEMENT_BACKLOG.md#presentation-only-discovery-refresh--11-october-2026).

## Location API source reconciliation — 11 October 2026

Source save/change/clear and nearby APIs already match the customer UI. Signed-in customers can explicitly persist or clear their own location; another account cannot alter it. Eligible members obtain coverage-filtered business results without persisting the search point. Seller leads receive only supplied locality/PIN and explicitly supplied enquiry address, not the saved customer point. Live availability remains unchanged because containers were not rebuilt/restarted. See [isolated verification](REFINEMENT_BACKLOG.md#location-api-source-reconciliation--11-october-2026).

## Messaging and homepage carousels — 11 October 2026

Customers see the approved discovery/provider headline and shared Services. Simplified. branding. In source, eligible members select a catalogue service under Services Near You, confirm their temporary location and browse horizontally through real returned providers. Farther covering providers remain separate. Anonymous/nonmember users see access guidance and receive no provider data/map. Affiliate brands displays no configured brands/links. No separate About page exists; the shared footer description communicates platform positioning. See [verification](REFINEMENT_BACKLOG.md#messaging-and-homepage-carousels--11-october-2026).

## Frontend-only live replacement — 11 October 2026

Customers can now open **Choose your location** on the live homepage, `/services` and Resume Building detail at desktop/mobile widths. Manual address/locality/PIN/landmark plus coordinates can be confirmed temporarily after optional GPS is denied. No GPS is requested automatically. Anonymous users still encounter the provider directory sign-in gate; three detail tabs remain. Save/nearby services are blocked by missing API routes. See [live evidence](REFINEMENT_BACKLOG.md#frontend-only-live-replacement--11-october-2026).

## Customer location entry-point verification — 11 October 2026

In source, customers start with **Choose your location** in the homepage hero, above `/services` search or in the service introduction before its three tabs. Expand to enter locality/PIN and coordinates manually, or explicitly request GPS; denial leaves manual selection usable. Confirm a temporary location, choose a radius, change/clear it, or explicitly save after sign-in. Public selection does not unlock protected results, pins or enquiries. The running site still lacks these entry points; [backlog evidence](REFINEMENT_BACKLOG.md#customer-location-entry-point--11-october-2026) records rebuild and API blockers.

## Current reconciliation and work-package index (11 October 2026)

**Verified project:** `E:\Vistrah 2.0`, established from this repository's README, root `compose.yaml`, and matching `frontend/`, `backend/`, and `docs/` structure. The four original VISTRAH 2.0 audit/planning documents are present here; no recovery copy was needed and no V1 files were imported. Historical pause/no-proceed statements below describe the earlier I2-only phase and remain as evidence; this dated reconciliation supersedes them for current planning.

**Completion boundary:** initial documentation audit, application-wide positioning, I1 existing membership/API/SSR access and safe destinations, I2 three accessible service tabs, and I3 shared identity/ownership work are complete to their documented evidence. I2 has reported live desktop/mobile verification after frontend replacement. I3 identity and ownership are implemented. WP03-02 now includes private claim evidence/review, resubmission/recusal, verified business-email control and independent ownership approval in source. Approval requires complete evidence, fresh contact verification and an unowned business; phone claims and unconfigured email delivery remain blocked. I3 is not represented as deployed. I4/I5 source changes and checks are separately documented. Recorded evidence is bounded to its stated environment and does not imply production verification.

**Eight-package index:** WP01 Audit and plan (I00/I06; V00/V01/V02); WP02 Foundation and critical defects (I00/I06; B17/B18); WP03 Identity, membership and service journeys (I1/I3; B01/B02/B04/B07); WP04 Seller management and admin content (I4/I5/I6 plus remaining I3 claim work; B08/B09/B15/B16); WP05 Location, maps and provider discovery (I7/I8; B10/B11/B14); WP06 Homepage and discovery UI (positioning/I2; B03/B06); WP07 Campaigns, payments and financial reconciliation (I9/I10/I11; B02/B05/B12/B13); WP08 Affiliate marketplace and final validation (I12; B17/B18 plus new marketplace scope). I and B identifiers remain canonical. Here I10 means V02 increment I10; inventory heading “I10 - Implemented three-tab service experience” is an inventory section, not that increment. Task-level acceptance, dependencies and evidence are in `REFINEMENT_BACKLOG.md`.

## WP05-01 current location status (11 October 2026)

Steps 1–3 implement validated reviewed business pins/per-service circular coverage, explicit GPS/manual temporary location with Save/change/clear privacy controls, and authoritative nearby/Also serves your area filtering. Step 4 implements a Leaflet manual coordinate map and synchronized pins/tiles; live tiles/address lookup remain blocked on provider terms/cost approval. Existing I3/I4 business/listing/publication models are reused, with reversible additive migration 011 tested only on disposable synthetic SQLite and RAM-backed PostgreSQL 16. No PostGIS, public OSM service, paid provider, normal migration/restart or deployment is enabled. Backend membership/catalogue/owner/approval controls and straight-line distance labels remain authoritative. See [the location implementation record](REFINEMENT_BACKLOG.md#wp05-01-location-services-implementation-11-october-2026) for behavior, code paths, migration/provider limits, **78 passing SQLite backend / 62 passing frontend tests**, **21 overlapping backend tests passing on PostgreSQL 16**, passing 1440/390 px browser flows, TypeScript and focused ESLint. Migration 011 passed populated upgrade/downgrade retention checks on both database engines; normal databases/containers were untouched. PostgreSQL workload/concurrency and live geographic accuracy are not claimed.

**Location code paths:** backend `app/location_schemas.py`, `app/location_routes.py`, `app/models.py`, `app/database.py` (SQL parameter masking), `app/publication_routes.py`, enquiry schemas/lead serialization and `migrations/versions/011_location_services.py`; frontend `lib/location.ts`, `components/nearby-providers.tsx`, `components/location-map.tsx`, `components/business-location.tsx`, and customer/publication/catalogue integration. Isolated checks: `backend/tests/test_location_services.py`, `test_location_migration.py`, `frontend/lib/location.test.ts`, `frontend/scripts/location-browser-check.mjs`, `scripts/test-location-postgres.py`. The next location task is a permitted provider adapter and India-quality evaluation after terms/cost/privacy approval, with workload/concurrency validation before rollout.


## I4 - Reviewed business/listing publication and I5 storage decision (11 October 2026)

**I4 implemented in source:** `provider_routes.CreateApplication` accepts an optional explicit owned `provider_id` and explicit catalogue `subcategory_id`. Capability/owner/active parent checks are server-side, including nested services and legitimate direct-category services. Existing omitted-parent legacy requests remain compatible. Owned service application creation atomically reserves the existing composite `ProviderService(provider_id,service_id)` in PENDING with its application reference; repeated business/service creation returns 409, preserving the original application/history. The composite primary key is the database uniqueness barrier; real PostgreSQL racing-request verification is not claimed. Category/subcategory changes clear selected services in the onboarding UI, and explicit business context survives authentication through the narrow safe-return allowlist.

`provider_publication_drafts` stores immutable proposed/prior payloads, actor, base publication revision, draft/review revision, status and review reason. Owners save new business/profile or listing-description proposals and separately submit them. Saved proposals never change public fields. `/seller/businesses/{id}/publication-drafts` and nested submit enforce capability/explicit ownership/actor/nested IDs, without membership; `/admin/publication-drafts` requires ADMIN and an independent reviewer. Approval rejects stale base versions, inactive/unverified business and nonapproved service grants. Profile changes and manually validated contact changes preserve independent per-service approvals; listing description publication additionally requires that service's approval. No channel-verification/SLA/verified-result claim is made. Contact syntax uses existing profile/email/phone constraints and independent review reason; no invented email-only ownership proof.

`Provider` is the last approved business version; `ProviderService.description` is the last approved listing text. Member-only provider directory/detail expose only these approved fields. The existing ADMIN Provider PUT now saves a submitted review draft rather than immediately resetting verification/deactivating; admin slug/provenance/source metadata also waits for independent review. Owner invalid-information reports immediately deactivate the business and stop discovery/eligible leads; existing admin suspension still blocks read-time visibility. Service-association withdrawal now suspends rather than deletes the row; readding it returns to PENDING review. Historical grants/application links/draft/evidence/lead/request rows stay stored.

**UI/source paths:** `components/publication.tsx`, Seller Dashboard business editor, `/admin/publication-drafts`, reviewed admin editor/help, `provider-onboarding.tsx` dependent selectors and explicit labels, `/provide-service?business=...`, provider description rendering, safe destination tests. At the historical I4 boundary, maps/pins/coverage/images/campaigns were unavailable. Current WP05-01 adds reviewed pins/coverage and the manual Leaflet map; live providers, images and campaigns retain their blockers. Seller navigation stays in the mobile menu, avoiding header crowding.

**Migration:** additive reversible `008` follows `007`, adding profile/listing publication counters, default-empty approved description and publication-draft history. No backfill changes eligibility/ownership; normal PostgreSQL remains untouched. Dedicated populated synthetic SQLite 007->008->007->008 round trip passed, preserving owners and service approval records. SQLite and PostgreSQL history-trigger branches are implemented; only SQLite execution was tested. Downgrades remove new feature metadata and require a separately reviewed backup/rollout plan; they have never run against normal data.

**Actual executed checks:** full inspected backend suite before the final non-destructive withdrawal correction: **181 passed**, mocked integrations and source networking disabled, synthetic SQLite only. Final withdrawal correction/relevant existing regressions: **39 passed** (`test_publication_drafts.py`, `test_marketplace.py`, `test_provider_onboarding.py`). Earlier combined I3/I4 focused suite: **100 passed**. Migration-008 and media-storage targeted run: **4 passed**. Existing Starlette/httpx deprecation warning remains; no dependencies installed. Frontend **13 files / 98 tests passed**, lint and TypeScript passed. Expanded synthetic `scripts/i3-browser-check.mjs` passed at 1440/390px with four auth entries/capability/claims/admin denial plus owner business/listing draft save/submit, unchanged publication, direct/nested parent selections/reset; no page runtime errors. Screenshots `artifacts/i3/publication-1440.png`, `publication-390.png` and seller captures, mobile visually inspected. Explicit catalogue labels corrected a failed label-selector assertion. I1 synthetic return-flow browser passed after hydration timing was made explicit; I2 synthetic browser passed all 59 canonical routes, three tabs, keyboard/ARIA/1440/390/320px/200% text, access/activation returns, legacy URLs and saved recommendation/delivery history. Initial test-harness timing/cleanup failures are not product/live failures; temporary Next trees were cleaned independently.

**I5 independent reversible work:** unconfigured `app/media_storage.py` storage primitive requires an explicit absolute root, uses immutable digest keys, same-filesystem staging, file fsync and exclusive publication, verifies integrity and removes only its own new temporary file on failure. It never chooses `/data`, creates a normal volume, deletes old/shared objects, configures serving or accepts an application upload. Three storage-only synthetic byte tests passed for reuse/history/failure/traversal/integrity. This is NOT full I5 persistence or media-format validation; no production/Windows-power-loss/durable-volume/restore verification is claimed.

**Decision blocker for dependency order:** I5 cannot connect storage/metadata/serving without an approved dedicated media destination and serving/access design. Existing API volume contains runtime secrets and must not become public media. Decide dedicated filesystem volume versus object storage, authorized public-derivative serving, operational backup owner and approved upload bounds/scanning requirements. No provider purchase/billing/root/configuration choice is guessed. WP03-02 now implements evidence, verified stored-business email control and independent reviewer/recusal in source; pending claims remain blocked until those checks pass, and live SMTP/PostgreSQL rollout remains unverified. I6 depends on I5; geo/media/campaign/payment/retention decisions remain open. All independent work above is reviewable in source; normal containers/data and deployed I2 stay untouched.

> **I3 implementation - 11 October 2026:** latest user authorization resumes the refinement program in dependency order and supersedes historical I3-I12-paused/no-implementation language. I1/I2 and positioning remain; normal containers/data are untouched in this development increment.

## I3 - Shared identity and explicit ownership (current increment)

**Model and paths:** `User.seller_enabled` is a capability independent of CUSTOMER/ADMIN role; `Provider.owner_user_id` is the nullable explicit business owner. No duplicated Business/User system is added. `ProviderService(provider_id, service_id)` retains its existing composite primary key, one business/catalogue-service record and independent approval linkage. New manually approved provider applications create explicitly owned businesses; additional approvals reuse only explicitly owned businesses. Existing ownerless businesses are never backfilled from email or historical application links. Applicants retain private applications, version pins, immutable documents/events and history; ownerless legacy business management/leads remain unavailable pending approved claims.

**Authentication/navigation:** existing `/auth/register` and `/auth/login` retain customer/admin behavior. `/auth/seller/register`, `/auth/seller/login` share email uniqueness, password/session/rate checks and stored identity; existing-email registration returns 409 and asks users to sign in. `/auth/seller/enable` lets an authenticated customer add seller capability without a second account. Role is never changed; no membership predicate grants seller access. `/seller/login`, `/seller/register`, `/seller` and four labelled footer entries exist; Provide a service points to seller authentication or eligible dashboard. Header/mobile seller navigation reflects stored capability. Cookie proxy handles seller login/register tokens without exposing them to browser JSON. Safe return adds only `/seller` and `/admin/ownership-claims`, rejecting arbitrary seller paths/queries; I1/I2 tab destinations remain.

**Authorization:** `seller_user` checks fresh capability; all new `/seller` routes enforce it without customer membership. Business/detail/service/application/document reads filter explicit owner and nested business ID; application reads additionally require the original applicant, so claiming a business would not inherit another applicant's private evidence. Document ID must belong to the authorized application. `/seller/leads` and compatible `/provider-leads` derive businesses from explicit owners, retaining existing approval/active eligibility. ADMIN claim queue/review uses `admin_user` and prohibits self-review. Seller capability never grants ADMIN.

**Claims decision (WP03-02 continuation):** claims start PENDING and duplicate business/user claims are rejected. Private registered/unregistered evidence, reasoned request-info/resubmission/rejection and permanent reviewer recusal are retained. Seller-only `/seller/ownership-claims/{id}/contact-challenge` and `/contact-verify` prove control of the stored business email; account email matching or an arbitrary submitted contact is insufficient. Independent non-recused ADMIN approval requires complete evidence, verification within 24 hours, no outstanding information request and a still-unowned business. Approval records APPROVED/reviewer/time/reason plus immutable event/audit history and assigns `Provider.owner_user_id` atomically. No transfer, automatic backfill, membership prerequisite or arbitrary-owner endpoint is added. Pending/rejected claims grant no business/documents/leads; approval does not transfer another applicant's private application/documents or change service approvals.

**Migration:** additive reversible Alembic `007` follows `006`, adding only capability, nullable owner and claim storage. All legacy owners remain NULL and existing capabilities default false. SQLite uses direct nullable FK-column addition rather than rebuilding referenced providers; PostgreSQL branch uses a named FK. Migration is NOT applied to normal PostgreSQL and no normal API restart occurs. Synthetic populated SQLite test proves 006->007->006->007 preserves users/providers/per-service grant/application/document/event rows. PostgreSQL execution and production rollout are unverified and separately gated.

**Executed I3 checks so far:** isolated `TEST_DATABASE_URL=sqlite:///E:/Vistrah 2.0/.tools/i3-isolated-tests.db`; `python -m pytest tests/test_seller_migration.py tests/test_seller_ownership.py tests/test_provider_onboarding.py tests/test_admin_access.py tests/test_service_access.py -q -x --tb=short -p no:cacheprovider`: **71 passed**, existing Starlette/httpx deprecation warning only. Tests cover shared identity, no duplicates/role injection, membership separation, capability withdrawal, owner/nested/document cross-owner denial, email-insufficient claims/blocked approval/rejection/self-review, new owned approval and service uniqueness, application history, existing lead/doc/onboarding/admin/I1 access. New browser `node scripts/i3-browser-check.mjs`: **passed**, memory-only synthetic API/ephemeral Next/Chrome, 1440/390px four auth entries, cookie/session and safe tab return, ineligible-customer service access, seller enable without duplicate authentication, dashboard/claims/nav, admin denial, no page runtime errors; screenshots `artifacts/i3/seller-1440.png`, `seller-390.png`. Frontend unit tests: **13 files / 98 passed**; TypeScript passed; full lint passed after missing test-harness URL import was corrected. Initial backend tests could not open synthetic SQLite under sandbox; explicit isolated rerun outside sandbox succeeded. Fixture-only email/domain and minimum test-secret corrections precede final passing results. No installation or real gateway/SMTP/source/DB calls.

**I3 status (reconciled):** shared identity, explicit ownership, one business/service association and seller authorization are implemented in source. WP03-02 adds private evidence/review, verified stored-business email control and guarded independent approval, covered by 26 isolated ownership/migration tests. Claims without complete evidence/fresh verification remain blocked; phone delivery and live rollout are unverified. I4 publication-draft functionality is now separately implemented in source and described above. Neither I3 nor I4 is established as deployed by these source checks; the normal application deployment status is the separately recorded live/container evidence. See the current package reconciliation above for the next task and open decision.

> **I2 frontend-only rollout verified - 11 October 2026:** supersedes the stale-running-container diagnosis below. User explicitly approved rebuilding/replacing only web. `docker compose up -d --no-deps --build web` completed successfully; production compilation, TypeScript and static generation passed. API/database/worker IDs and start timestamps remained identical before/after; no down, volume operations, separate migrations/seeds or other container starts were issued. Web is running healthy.

Live Chrome regression `node scripts/i2-running-page-check.mjs` passed with exit 0 / zero failures, including a repeat after adding direct panel-guidance assertions. `/`, `/services`, `/service/jobs-careers` and `/service/jobs-careers/service/resume-building` returned HTTP 200 at 1440px and 390px. The service landing page now exposes exactly three primary tabs with the approved labels and three associated panels (one visible). All three selected anonymous panels show Sign in to continue without textarea forms; desktop/mobile keyboard activation and secondary official email passed. Recommendation/in-house/contact legacy request routes retain expected sign-in guidance and safe next destinations. Current screenshots overwrite `artifacts/i2-running/service-1440.png` and `service-390.png`; the updated mobile capture was visually inspected. Earlier six-card screenshot/results below are historical rather than the current files. No live authenticated save/payment/activation is claimed by this read-only deployment check; prior synthetic source checks remain the evidence for those workflows. I3 stays paused.

> **I2 running-container diagnosis - 11 October 2026:** Live journey correction: users on localhost:3100 currently encounter six legacy service cards, not the three-tab source journey documented below. Homepage and /services/category pages are discovery pages; the affected service landing route is /service/jobs-careers/service/resume-building.

**Live evidence (11 October 2026):** fresh HTTP and Chrome checks at `http://localhost:3100` inspected `/`, `/services`, `/service/jobs-careers` and `/service/jobs-careers/service/resume-building`. All returned HTTP 200. Discovery pages do not expose primary service pathways; the actual service landing page shows six primary cards and zero ARIA tabs at both 1440px and 390px. Screenshots: `artifacts/i2-running/service-1440.png` and `service-390.png`; mobile capture visually inspected. The six IDs are mail/chat/email/providers/recommendations/in-house. This is server output, not a browser cache result.

**Trace/root cause:** dynamic catalogue route -> `ServicePage` in `components/catalogue-templates.tsx` -> `ServicePathways` -> `lib/service-pathways.ts`. Workspace source has exactly three tab definitions and one shared service renderer; direct/nested routes share it. Running web container command is `node server.js`, mount list is empty, and Dockerfile builds/copies standalone production output. It has no workspace source or development hot reload. Recovery started the existing old image without rebuilding it, as authorized. No application source change would update that running process.

**Executed checks:** 54 focused tests across service-pathways/destinations/service-access passed; full frontend lint and TypeScript passed, and lint/TypeScript were repeated after the new check was finalized. New read-only `scripts/i2-running-page-check.mjs` failed with eight live regressions: two desktop/mobile tab-count failures and six legacy-intent sign-in-guidance failures. Anonymous recommendation/in-house/contact responses contain no textarea; `/me/membership` rejects unauthenticated access with HTTP 401. Live legacy UI differs from expected I1 guidance; successful save/return or live member behavior is not claimed. Initial browser-check drafts were interrupted to remove unnecessary waits; the final exit-1 run is the evidence above. Prior synthetic saved-enquiry and nested-route results in V05 remain source evidence only.

**Changes/boundary:** added the running-page regression and corrected all four audit records; no product source/configuration/container/data changes. I1, positioning, three-tab source, historical enquiry intents/URLs/prefixes are untouched. Normal-site correction is still pending. Hot reload is impossible in the existing production container. A frontend-only build/replacement requires explicit authorization to relax the current no-restart/keep-existing-container constraint; API/database/worker startup must remain outside that action. Do not proceed to I3.

> **I2 implementation update - 11 October 2026:** J17 is the current three-tab journey. Earlier six-card/I2-paused journey records remain historical; I1 and completed positioning are retained. I3-I12 remain paused.

## J17 - Current I2 tab and saved-enquiry journey

1. Open any existing canonical service URL. Public catalogue descriptions remain visible. The primary selector contains exactly Find Service Provider, VISTRAH Recommended, VISTRAH Services. Navigate with arrows/Home/End, move focus into the associated panel or choose a labelled tab directly. Mobile labels use a readable vertical arrangement with Up/Down navigation. Official email/help remains secondary.
2. Anonymous users see sign-in/register guidance for the chosen tab; authenticated ineligible users see active-membership guidance. There are no operational forms/provider records in these panels. An eligibility-service failure shows a retry notice instead of claiming access. The canonical `?tab=` destination survives login/register switching, membership and sandbox checkout.
3. Pending/success browser state alone does not establish access. I1 checks backend membership before returning from checkout; only eligible development testing can use sandbox terms. The original service and selected tab return after confirmation. Genuine paid access remains unconfigured.
4. Find Service Provider opens the existing guarded directory and provider details. Backend verification/per-service approval rules remain authoritative. WP05-01 now adds reviewed geo/coverage filtering and a manual Leaflet map on the guarded directory, while live providers/campaigns/imagery retain their separate blockers. The service breadcrumb returns to the provider tab.
5. VISTRAH Recommended opens `request?intent=recommendations`. Save the human-reviewed enquiry, retaining its existing recommendation prefix, and follow it in My requests. No instant recommendation, automated matching or turnaround guarantee. The form breadcrumb returns to the recommendation tab.
6. VISTRAH Services shows **No VISTRAH-managed offering available for this service.** With eligible membership, optionally open `request?intent=in-house`, save a delivery-options enquiry with the historical prefix and track it in My requests. Independent providers are not labelled managed. This does not confirm delivery or book work.

Existing direct/nested request/provider URLs remain valid destinations; historical `recommendations`/`in-house` intents on a service page choose the corresponding tab. General/contact enquiries remain behind I1 and official email remains public without becoming a saved request. Changing a selected tab cannot grant access; direct protected visits and submits independently recheck backend eligibility.

Actual validation uses a synthetic catalogue/API and ephemeral Next/Chrome processes, with memory-only enquiries/payment fixtures and dedicated screenshots. It does not modify normal records or verify live/production commerce. See [V05](REFINEMENT_BACKLOG.md#v05---i2-implementation-and-actual-validation-11-october-2026) for completed checks and limitations. All later functional increments remain open.

> **Positioning update - 11 October 2026:** J16 records the authorized frontend refinement and isolated synthetic-data verification. Historical audit journeys and I1 findings below are retained; seller tools, three-tab consolidation and other functional increments remain paused.

## J16 - Current platform discovery and participation

Visitors see **Get a service. Provide a service.**, the exact approved supporting description and the shared **Get services. Offer services.** descriptor. Find a service opens `/services`; its labelled search retains the `q` query, catalogue cards and existing category/service URLs. Public descriptions remain browsable. Provide a service explains that seller registration/login/dashboard are unavailable; it does not navigate. Existing provider application is a separately labelled link to authenticated `/provide-service` and requires no customer membership.

Service pages retain six cards with existing links/intents. Find Service Provider reaches the protected directory; VISTRAH Recommended reaches the human-review enquiry; VISTRAH Services explains that no managed offering is confirmed and reaches the optional delivery-options enquiry. The intended three-tab structure remains I2, not a completed journey. Official email remains public and does not create a saved request.

Anonymous protected visits use I1 sign-in/return guidance; ineligible signed-in customers see Active membership required. Development sandbox membership is explicitly testing, with genuine paid access unconfigured. Eligible synthetic members can submit a service enquiry, keep its original intent prefix and follow it in My requests. No enquiry confirms a booking or delivery. Customer account copy focuses on profile, service enquiries, tracking and membership; existing provider applications remain business details/service decisions/private evidence/history. Administrator navigation and oversight continue to require ADMIN; provider participation never grants that role.

Finds describes an existing career-request workflow, source-listed vacancies and factual application drafts; external submission remains unavailable. Public jobs retain provenance, source links and their separate access boundary. Contact and help explain the actual platform and current controls. Password recovery and other contextual help retain their legitimate guidance.

**Executed journey scope:** desktop 1440x1000 and mobile 390x844, isolated Next process/synthetic loopback API, public catalogue/search/service options, auth/membership/contact/jobs, customer/profile-navigation context, requests/membership/provider applications/onboarding/Finds, ADMIN overview, keyboard actions, service-help focus/click/Escape and width checks. I1's separate browser harness covers auth/register return, sandbox refresh/failure and backend-confirmed return. Exact final results/limits are recorded in [V04](REFINEMENT_BACKLOG.md#v04---positioning-refinement-and-actual-validation-11-october-2026); no normal accounts/database or live provider/payment/SMTP service was used.

> **I1 implementation update - 11 October 2026:** the user separately authorized only existing service-access enforcement and safe destination preservation. The original audit findings and prior documentation-only validation below remain historical source evidence; the I1 addendum supersedes their statements that directory/detail are public, enquiries require authentication alone, SSR omits the session, or checkout loses the destination. All other implementation remains paused. D03 managed-only approach and empty-state/enquiry fallback are approved; actual offerings and terms remain open.

11 October 2026 · Source audit and proposed behavior; no runtime journey was executed for this audit.

[Inventory](FUNCTIONAL_INVENTORY.md) · [Specification](FUNCTIONAL_SPECIFICATION.md) · [Backlog](REFINEMENT_BACKLOG.md).

R01–R24 refer to confirmed requirements; S01–S12 to specification sections; D01–D12 track approved, partially approved and unresolved decisions. “Current” means inspected implementation, not verified live behavior. “Target” describes approved intended behavior plus explicitly identified proposals. No journey authorizes database/account/payment/provider changes.

**Approved decision update:** retain approved D01, partial D02 and D03 human-reviewed Recommended without automated matching/instant shortlist/guaranteed turnaround. D04–D12 additionally approve the policies traced below; technical/commercial/retention details remain open (S12). Three tabs/four auth entries/dashboard/dependent dropdowns retained. None of these journeys claims new runtime capability; implementation remains paused. Prior candidate radii/optional moderation/pan proposals are superseded explicitly; current-source findings unchanged.

## J01 — Anonymous visitor, authentication and recovery

**Trace:** R03/R06/R24; I01/I03; S01; B04/B07/B17.

Current: visitor browses catalogue and public jobs; header loads `/me` and offers sign in on no session. Protected request/account/provider-onboarding pages present login/register links with `next`; admin page redirects anonymous user to login. Auth accepts local relative next destination, defaults ADMIN to `/admin`, other users to `/account`. Directory/detail are currently public, unlike target paid requirement.

Target sequence:

1. Visitor browses public catalogue names/general descriptions/membership information/official contact, then selects one of three service tabs, preserving service ID/path and optional safe filter destination. No provider results/details/contact/promotional tiles/pins leak into public teasers.
2. Login as user or Sign up as user uses shared identity; switching forms retains destination. Login as seller and Sign up as seller are distinct entry points sharing that same identity (J06).
3. Server creates/checks revocable session; frontend then checks paid entitlement before protected content.
4. Active eligible member reaches original destination; nonmember enters J02; customer never receives admin role.

Recovery: choose Forgot password, enter email, receive same neutral confirmation whether account exists or not. With configured delivery, backend creates hashed expiring single-use reset record and attempts SMTP acceptance; user opens private link, supplies matching strong password, resets, then signs in. Reset revokes previous sessions and links without changing role. SMTP missing/error has configuration guidance in development and safe operational diagnostics, no public token or false sent claim. Current runtime configuration and accepted real mail are unverified; historical validation recorded unconfigured SMTP.

Failures: invalid login remains generic; throttle recoverable; unknown email does not disclose account/ADMIN existence; expired/used/bad reset link offers new request; passwords never echoed; unsafe external next path rejected; network error retains useful fields without claiming login succeeded. Backend rejects anonymous/customer admin URLs/APIs even if navigation manipulated.

## J02 — Nonmember, active member, renewal and inactive membership

**Trace:** R02–R04; I03/I04; S02; B01/B02/B04/B05; D01/D02.

Current: plan endpoint displays database price/days; seed default ₹129/30 days. Authenticated user creates SANDBOX transaction and chooses simulation outcome. Signed backend event creates test membership on success; failure does not. Account membership shows terms/offers; renewal starts after latest unrevoked expiry. Checkout ends at account membership, losing original service destination. Only member guide is protected; directory and authenticated request bypass target gate.

Target sequence:

1. Signed-in nonmember selects any primary option; backend refuses protected operation and UI explains approved membership terms.
2. Preserve original safe destination across payment creation, retry and authentication expiration.
3. Create server-priced owner-scoped order. Payment pending/success browser screen alone does not activate membership.
4. Trusted payment confirmation creates exactly one qualifying term; UI queries server status.
5. When backend confirms eligibility, return to requested service option; active member uses J03–J05.

Approved D01/D02 failure/recovery: failed/cancelled payment leaves no entitlement; timeout queries existing order; replay does not duplicate term; wrong amount/currency/environment/product denied. Future term is not active before start. Inactive entitlement denies new protected service actions, including provider results/details/contact/promotional tiles/pins/related enquiries. Authenticated owner still tracks existing requests and accesses payment receipts. Expiry alone does not cancel requests, Finds runs or independently paid seller campaigns. Where cancellation is supported it stops future renewal while valid paid term continues to expiry unless refunded/suspended; current source has no subscription cancellation feature. Refund revokes the affected term, preserves separately paid future terms. Price/duration/refund eligibility/detailed sequencing remain D02 decisions. Seller onboarding/owned management has no customer-membership prerequisite; public jobs/Finds access remains unchanged pending separate review. Production entitlement cannot be acquired through current sandbox simulator. No live checkout or refund performed in this audit.

## J03 — Find Service Provider

**Trace:** R01/R02/R05/R10/R18; I02/I03/I04; S02/S03/S05/S06; B01/B03/B09/B11.

Current: Explore Service Providers routes to service-scoped directory. Backend filters active verified providers and individually approved service associations; address/contact shown publicly. Service enquiry saves request under authenticated owner; no geographic/membership filtering.

Target: after J01/J02, customer chooses location/radius/filter through J08. API returns eligible third-party listings for exact catalogue service and approved coverage policy. Select tile or pin, open same listing, see truthful details/image and distance only where meaningful. Enquire via saved form; personal contact actions obey approved disclosure policy. Admin can assign eligible provider lead without exposing future precise GPS.

Failures: no matches gives usable filter/location changes and lawful enquiry alternative; stale/suspended listing disappears and detail/API denies access; member expires between browsing/submitting and server refuses new protected action; missing business image shows placeholder, not unrelated photograph. No blank content masked as successful search.

## J04 — VISTRAH Recommended

**Trace:** R01/R02/R05; I02; S02/S03; B03/B06; D03.

Current: Recommendations is a human-review enquiry with requirements prefix. It does not produce a verified ranked provider list or automatic matching.

Approved target: eligible member opens VISTRAH Recommended tab, sees a clearly described human-reviewed enquiry workflow, submits service/location/requirements through existing saved enquiry and tracks request. Do not claim automated matching, an instant shortlist or a guaranteed turnaround. No curated shortlist product is approved; detailed review criteria/disclosures and any future product remain separate decisions. Human enquiry does not automatically confer seller verification, listing approval or VISTRAH delivery.

Failures: incomplete requirements show field errors; backend failure keeps draft; duplicate click cannot imply two confirmed outcomes; no suitable provider is explicit; old recommendation URL retains compatible form after primary-card consolidation. Staff backlog is not a fake immediate recommendation.

## J05 — VISTRAH Services

**Trace:** R01/R02/R05; I02/I04; S02/S03; B03/B06; D03.

Current: In-house enquiry explicitly states no confirmed offering, saves delivery-options request; no managed-service classification exists.

Approved D03 target: member sees only genuinely VISTRAH-managed offerings for selected service with delivery scope/terms. The managed-only approach and honest empty-state/enquiry fallback are approved; actual offerings and terms remain open. Until actual offerings are approved, display the empty state and delivery-options enquiry subject to I1 eligibility; never relabel an independent seller. Preserve request tracking and original route compatibility.

Failures: inactive offering unavailable, unconfirmed fulfilment not represented as purchase/booking, data failure distinct from “no offering.” Paid membership gives option access, not a guarantee that every service has managed delivery.

## J06 — New seller and existing customer adding seller capability

**Trace:** R06–R08/R19; I01/I04; S01/S04; B07/B08; D04.

Current: any authenticated customer can enter `/provide-service`, create owned application, retain account access. Separate seller auth/dashboard/capability and direct Provider ownership are absent; ownership of provider leads is inferred from applications.

Target sequence:

1. “Provide a service” opens Login as seller with Sign up as seller option; an already authenticated eligible seller proceeds to seller dashboard. New seller uses seller signup; existing customer uses same identity, not a duplicate account. Sign up as user/Login as user remain distinct entry points.
2. Explain capability request versus business verification; CUSTOMER role stays unchanged.
3. Create owned business draft and supply profile; review statuses/required tasks visible in seller dashboard.
4. Continue customer account/requests while business/listings are reviewed.
5. Eligible seller login exposes Seller Dashboard navigation comparable to ADMIN dashboard entry, without ADMIN permissions. Seller edits only owned business/listings and sees owned applications/documents/campaigns and actual eligible assigned leads. Onboarding and owned-record management do not require customer membership; access/capability/ownership checks still apply.

Failures: existing email directs to shared authentication, no duplicate account/role promotion; cross-business IDs denied. Under D04 legacy admin-created business ownership requires the current WP03-02 private evidence flow, verified stored-business email control and independent non-recused ADMIN review; email matching alone is insufficient. A seller requests a code, enters it while signed in, then waits for evidence review. Expired/used codes allow a rate-limited new request; phone/unconfigured delivery remain blocked. Request-info preserves evidence and requires resubmission plus new contact verification; rejection retains history. No automatic backfill occurs. Preserve existing applications/documents/approvals/history. Initial business/service listing uniqueness enforced even for racing create requests. Seller login does not expose ADMIN; onboarding/owned management has no customer-membership prerequisite.

## J07 — Seller profile, listing, requirements, documents and independent approval

**Trace:** R07–R10/R16/R19; I03/I04/I05; S04/S05/S06; B08/B09/B10; D04/D05/D12.

Current: category and flattened service selection creates multi-service application; common business details and each service's versioned requirements saved with revisions. Private files stored in PG. Submit freezes answers; review history/config pins persist. ADMIN reviews per service, can request corrections, approve/reject/suspend; first approval may create verified active Provider. Approved grant does not approve other services. Standalone listing/profile/image/coverage editor missing.

Target sequence:

1. Save business physical address and validated map pin; separately declare service coverage. Preview map, correct ambiguous geocode, retain manual pin path.
2. Use dependent Category → Subcategory → Service dropdowns with existing IDs; parent change clears incompatible child, direct-category services skip without invented subcategory. Create an offering, not catalogue definition; initially one listing/business/service (D04), preserving previous application/approval history.
3. Enter listing-specific details and actual rights-approved photos. Review service-specific questions/declarations/document requirements.
4. Upload private evidence, save draft, then submit with explicit confirmation; view outstanding requirements and history.
5. ADMIN reviews checklist/evidence with reason and revision; seller sees actionable result. Correct only editable parts; explicitly adopt required new version when needed.
6. Each listing requires independent approval. Approved eligible listing appears in Find Service Provider for selected service and applicable location/coverage while business/catalogue/individual eligibility remain valid. Other pending listings remain hidden; results/details/contact and related enquiries are member-only under D01.

Approved edit journey D05: owner saves identity/address/pin/coverage/service/description/image edits as draft, compares with approved version, submits review before publication. Last approved version stays visible only while accurate/eligible; reported invalid information or ADMIN suspension removes affected listings/promotions immediately. Contact-only changes validate without full service reapproval. Independent approvals/history remain; no approval automatically transfers to changed service. Current ADMIN provider editor's immediate verification reset/deactivation is a source/target gap requiring explicit later design.

Failures: missing effective requirements, invalid hierarchy/file/answers, cross-owner document binding, lost network/stale revision produce recoverable errors. Evidence upload alone is not saved submission. Private evidence never automatically public. Existing assigned leads remain intended/eligible only. Current WP03-02 claim mechanics are documented separately; maps/media and live contact delivery remain unverified.

## J08 — GPS, manual location, saved location and synchronized map/tiles

**Trace:** R11/R15–R20; I05; S06/S08; B10/B11/B14; D05/D06/D07/D10.

Current WP05-01 source: reviewed existing-business coordinates and per-service circular coverage, guarded nearby/farther queries, explicit GPS/manual pin, temporary location/Save/change/clear and offline Leaflet map/list synchronization are implemented. Live tiles/geocoding, commercial providers and actual India address accuracy remain blocked/unverified; no address-to-coordinate lookup is fabricated. The sequence below is implemented for manual/GPS selection and ordinary providers; paid-campaign predicates and ambiguous live geocoder candidates remain separate future work. Enquiries carry locality/PIN and only the exact address explicitly supplied for that request.

Target sequence:

1. Explain location use; GPS permission requested only when customer presses Use my location. Manual address/locality/PIN/landmark search remains available.
2. With denied/unavailable/inaccurate GPS, manual search and map-pin adjustment remain usable. Select among ambiguous candidates rather than fabricate exact point.
3. Confirm temporary location; choose 2/5/10/25km. Save this location explicitly opts into account persistence; change/clear saved state and active caches later. Clearing is not historical request-address erasure.
4. Standard nearby API requires premises within selected radius AND coverage of customer/search location, plus member/service/approval/seller state, sorted straight-line distance. Eligible farther covered listings appear separately as Also serves your area. Paid nearby additionally campaign target/verified payment/ADMIN approval/time, clearly paid-labeled. Paid ordering and geometry/target representation open.
5. Pan/zoom alone leaves results unchanged; Search this area explicitly changes search location and synchronizes pins/tiles. Pin selection highlights tile and converse, same eligible detail ID.
6. Change service/radius/location/filter: stale responses ignored, disappeared selected listing cleared, useful empty state displayed.

Failure/recovery: geocoder quota/network/no match leaves manual pin; denied/inaccurate GPS remains manually correctable. Map failure leaves accessible list/controls with error; no coordinates means no fabricated distance. Nearby shop not covering customer excluded, farther covered shop only separate group; coordinate/geometry tampering denied. Sellers receive necessary locality/PIN, exact service address only explicitly supplied for request; routine logs/seller APIs exclude precise coordinates. Retain independently supplied historical request addresses when saved location cleared. Leaflet/replaceable provider/PostgreSQL/backend direction approved (D10), exact provider/India benchmark/quotas/extension open; no PostGIS install/billing approval.

## J09 — Seller nearby campaign, quote, payment, moderation and activation

**Trace:** R07/R11–R14/R16/R18; I05; S07; B05/B12/B13; D08/D09.

Current: campaign model/API/dashboard/promotional row missing; member Offer and membership sandbox payment are not campaign commerce.

Target sequence:

1. Seller selects owned approved eligible listing, applicable service/category and supported target area distinct from shop pin/coverage.
2. Choose ADMIN-published area/duration/offer/schedule; review listing/target/price/discount/applicable tax/preview/paid label and accepted quote/terms snapshot. Separate campaign versus membership purchases; actual prices/durations/tax/quote expiry/gateway unresolved.
3. Save Draft, create Payment Pending order, pay through approved supported provider.
4. Trusted verified real payment validates quote/product/amount/currency/event and moves to Awaiting Approval. Sandbox is only isolated testing, not real promotion eligibility.
5. Every campaign also requires ADMIN approval; then Scheduled→Active→Expired at eligible server times. Late payment/approval requires seller acceptance of revised schedule before activation; no automatic extension of purchased duration. Refusal outcome remains unresolved.
6. Customer sees real promotional tile above three options, actual listing image or explicit missing image, business/service/locality and reliable optional distance; opens exact listing.

Failures: unapproved/cross-owner listing/unsupported area invalid; expired quote refresh under policy; failed payment never publishes; callback replay no duplicate campaign/duration/charge; forged success not trusted. Payment never bypasses listing or mandatory campaign ADMIN approval. Late confirmation stays inactive pending accepted revised schedule; no silent duration extension. Exception transitions and refund/chargeback/refusal compensation remain open. Retry recovers order instead of double charge.

## J10 — Campaign schedule, expiry, suspension, cancellation and refund

**Trace:** R04/R14/R18; I05; S02/S07/S11; B05/B12/B13; D02/D05/D09.

Approved D09: seller tracks Draft→Payment Pending→Awaiting Approval→Scheduled→Active→Expired with financial/refund status separate. Backend read predicate enforces time/eligibility even during worker outage. Late payment/approval needs seller-accepted revised schedule, never automatic duration extension. Worker idempotently records transitions/health. Suspension or listing eligibility loss stops promotion immediately; customer tiles/detail recheck. Draft edits retain last approved version only while accurate/eligible under D05; unreviewed target/coverage cannot publish.

Owner/admin cancellation displays terms/effects, stops visibility but never implies completed refund. Financial status remains pending/failed/accepted according to separately approved transition design; preserve history/idempotent refund/cancel callbacks. Reconcile ambiguous outcomes. Membership expiry alone does not cancel independently paid campaign (D02); its customer tiles/pins remain member-only (D01). Refund eligibility/proration/rejection compensation/chargebacks/revised-schedule refusal and exception transitions remain D09; detailed membership sequencing remains D02.

Failure/recovery: missing worker does not extend advert; UTC boundary/start-end validation; network ambiguity queries existing state; provider outage keeps pending state without repeat charge; other seller cannot cancel/refund; invalid state conflict returns useful reload. No campaign scheduler or refund behavior is represented as currently implemented.

## J11 — Admin campaign configuration, moderation and reporting

**Trace:** R13/R14/R24; I01/I05; S07/S10; B12/B13; D08/D09.

Target: ADMIN enters existing dashboard, sets versioned pricing/discounts/eligible durations/areas/schedules and business/listing eligibility; validates terms/date/range before publish. Saved configuration affects new quotes, not paid immutable terms. Queue shows actual payment/moderation/eligibility evidence; reviewer approves/rejects with reason. Admin can pause/cancel under approved policy and sees audit plus aggregate performance/financial status. No customer role change, no seller verification shortcut. Analytics/paid metrics definitions need approval before promises.

Failures: CUSTOMER/seller direct API denied; stale config/review conflict reloads; invalid discount/area/date rejected; review alone does not override missing trusted payment; refund/report errors remain distinct. Existing Member Offers page is retained until campaign configuration is independently modeled, not silently repurposed.

## J12 — Admin local image upload, preview, replacement and clearing

**Trace:** R21–R23; I05; S09; B15/B16; D11/D12.

Current: admin Category/Service image selector saves allowlisted SVG path; curated photography ignores it. Subcategory lacks database image field, banners/context bundled. General CMS upload/replace/clear missing. Approved D11 target is dedicated persistent media separate from secrets/private evidence, server-validated JPEG/PNG/WebP with size/dimension limits/metadata stripping; bundled SVG remains. Limits/scanning/serving/backup implementation still open.

Target: ADMIN platform entity → current photo/alt/source → select/preview → durable write → reference replacement/save → public rendering/confirmation, same entity/history. Seller edits only owned business/listing images, drafts reviewed under D05 before publication; accurate eligible last approved remains. Cancel leaves reference unchanged; confirmed clear detaches with fallback, shared uses preserved. Physical delete only reference+retention checks after approval; no automatic old-asset/evidence removal. Pipeline remains isolated from private evidence/secrets.

Failures: unauthorized user denied even direct API; type/size/content/pixel attack rejected; interrupted upload keeps previous image; stale revision cannot overwrite newer photo; licensing attestation missing blocks publication where required. Shared asset used elsewhere cannot be physically deleted by detaching one reference. No record deletion/recreation or unrelated configuration change.

## J13 — Invalid uploads, missing images and durable recovery

**Trace:** R07/R10/R22/R23/R24; I03/I05; S05/S09/S11; B09/B15/B16.

Target: unsupported/MIME-mismatched/oversized/path/polyglot images return safe field errors; user chooses new file with metadata retained. Evidence upload keeps private app/service/field boundary and independent rules. Failed storage/database commit cleans only confirmed temporary staging files, retains prior approved reference; existing/orphan-looking assets are not automatically deleted before reference/retention checks. Missing/broken public asset has stable readable placeholder, never unrelated provider photograph.

Failed-upload cleanup targets confirmed temporary files only; no deletion of existing records/evidence/assets before retention approval. Later isolated restart/redeploy/coordinated database/media restoration must prove references/assets/privacy survive. No normal restart/redeploy or deletion attempted. Retention periods/backup frequency/scanning/serving/operational owners remain D11/D12 decisions.

## J14 — Existing account/admin/Finds workflows and operational failures

**Trace:** R24; I01–I06; S01/S10/S11; B17/B18.

Current source supports profile save/personal phone, requests/status tracking, sandbox membership history/offers, admin catalogue/provider CRUD and verification, per-service grants, requirements review, assigned leads, audit CSV, refund/reconciliation, workflow/source operations and help. Preserve these paths during refinement.

Customer Finds: choose own open request and compatible registered template; provide permitted source listings or bounded discovery preferences; save private text resume; create/start run; worker records outcomes/evidence; explicitly approve internal draft preparation; download/review drafts; submit independently through legitimate source and record user-reported application status. API acquisition uses configured authorized source/cache, never fabricated fallback. Admin operational view redacts private contents and retries only permissible actions. No configured automatic submission integration; label unavailable actions accordingly.

Failures: no compatible template/closed request/input missing cannot start; cancelled run cannot retry; timeout/partial source error visible, retry preserves successes; no active worker shows pending/health issue rather than fabricated completion. Source “Test connection” performs bounded queued retrieval and may update cache; schedules disabled. Public vacancies preserve provenance and unknown/stale facts; historical timezone hydration issue needs later isolated verification.

Admin controls: search/tabs/select/edit/confirm/cancel retain state on failures; valid transitions and backend ADMIN checks remain authoritative; provider business edit resets verification/deactivates and warns; catalogue deletion blocked by dependencies. Account profile email immutable, personal phone unaffected. Header/mobile navigation/account links/help remain keyboard-accessible; recent help suite incomplete, future focused browser checks must finish without claiming past partial run as a pass.

Approved D12 recovery/operations journey: a protected delivery job is pending until actual SMTP acceptance, retries/monitoring use safe job IDs/errors with no token/private-document/password/GPS logging, and expiry/use is rechecked before retry. Accepted is not guaranteed inbox delivery. Current background SMTP is not durable retry; exact outbox/secret-payload safeguards/backoff/setup and operational owner remain unresolved. Preserve financial/review/campaign history; coordinate DB/media restore plan and retention review before physical deletion. These intended operations do not authorize current runtime mutations.

## Journey validation boundary

All J01–J14 were traced from inspected source or explicitly specified as future behavior. No real accounts, campaigns, payments, reset links, uploads or location queries were created here. Future isolated tests are [V01 in the backlog](REFINEMENT_BACKLOG.md#v01--future-targeted-validation-not-run). Policy decisions are [S12](FUNCTIONAL_SPECIFICATION.md#s12--approval-decisions-and-future-validation). Review/approval precedes implementation.

## J15 - Current I1 service access and safe return

This supersedes only the pre-I1 access/return findings in J01?J05. The six pathways and original compatible routes remain; no three-tab consolidation or seller redesign has been implemented. An anonymous directory/detail/request visit now shows sign-in/register rather than provider data. An authenticated ineligible user sees membership required. An eligible development sandbox member receives guarded per-request server-rendered provider data and may submit a saved enquiry. The backend independently rechecks every protected request; ADMIN has no service-membership exemption.

Login/register switching retains the local selected service/intent. Membership passes it into sandbox checkout; refresh restores only the existing payment visible in the signed-in owner's payment history. Pending and failed outcomes do not return to protected content. A successful sandbox outcome enables a separate access check; return occurs only if the backend reports eligible membership. Inactive/expired/revoked/future terms, expired sessions, missing trusted payment relationships or non-development environments cannot qualify. Forged success URL parameters are ignored as entitlement evidence. Backend errors remain retryable errors without fake results or access.

Existing owner tracking/receipts, seller onboarding/owned management, public catalogue/contact, jobs/Finds and admin APIs remain available under their original boundaries. D03 managed-only behavior and empty-state/enquiry fallback are approved, actual offerings and terms open. Tests use synthetic accounts and isolated databases/API processes; they do not verify real payments or the normal localhost:3100 session. See V03 in the backlog for actual results and limitations. All work after I1 remains paused.

### Reconciliation note

The package index and current I3 status above supersede earlier phase-only “paused” wording while retaining it as historical evidence. I3 paths exist in source; recorded synthetic checks do not establish deployment, and legacy claims require the current WP03-02 evidence/contact/reviewer guards before approval. Details and the next focused task are in [the refinement backlog](REFINEMENT_BACKLOG.md#current-eight-package-plan-and-i3-reconciliation-11-october-2026). New video and affiliate journeys are requirements to design, not existing user flows.
### WP03-02 implementation note

WP03-02 continues the existing V2 claim flow with an expiring, single-use email challenge bound to the claim and the business email already on record. Only hashes are stored; send/recipient/IP and redemption limits apply. Verification lasts 24 hours, grants no ownership by itself, and is invalidated by request-info, resubmission or rejection. An independent, non-recused ADMIN must review complete evidence and record a reason; approval atomically assigns only an unowned business, preserves service approvals/leads/history and does not expose another applicant's documents. Phone verification is unavailable; missing/failed SMTP, mismatched contacts, stale/used tokens and conflicting ownership fail closed. Migration 010 performs no backfill and refuses a downgrade that would erase grants or new events. See [the verified-contact update](REFINEMENT_BACKLOG.md#wp03-02-verified-business-contact-control-11-october-2026) for paths and the **26 passing isolated tests**, TypeScript/lint results and operational limits. No normal DB/container, live email or PostgreSQL rollout was used. WP04-01 remains blocked on the existing persistent-media decisions.
