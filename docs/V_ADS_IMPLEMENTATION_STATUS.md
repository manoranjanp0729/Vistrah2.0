# V Ads implementation status

## Integrated AWS Test checkpoint - 20 October 2026

Current protected source branch: `chore/protect-local-source-20261020`.
Reused Phase 1-4 functionality; 100 MiB limit and all UI/assets remain unchanged.
Public reel/profile engagement queries now batch counts (six videos: 13/14 to
3/4 SELECTs), with approved-only visibility and visible-only comments retained.
Run #50 verifies 457 backend tests passed/six skipped on disposable PostgreSQL,
249 frontend tests and 40 mobile tests passed; all three client jobs pass.
The known mobile dependency audit still fails; production remains BLOCKED.
No new Docker candidate, AWS deployment, migration, normal-service change or
Android hardware verification. Candidate-only FFmpeg/validator smoke and scoped
API/web/admin checks are prepared, statically verified and not executed.
Actual external gates: candidate workflow absent from default main/unregistered;
AWS CLI session still expired and earlier SSH authentication unresolved; target
capacity/media backup/restore, images/scans and physical Android QA unverified.
Exact evidence, scope, registration-only approval proposal and remaining
acceptance are in [RELEASES.md](RELEASES.md#integrated-aws-test-milestone---20-october-2026).
The dated implementation/preview evidence below is historical, not live proof.

Updated 19 October 2026. Branch: `feature/recovered-design-taxonomy-integration`.
Scope: Phase 1 source work followed by explicitly authorized Phase 2 integration
and Phase 3 advertiser/admin management.
Source and isolated-preview evidence below is not normal running-build evidence.

| Task | Status | Evidence / remaining gate |
|---|---|---|
| Authenticated private uploads | COMPLETE | Raw `video/mp4` POST `/v-ads/advertisers/{id}/uploads`; authenticated approved owner only; returns upload ID, never a filesystem path. No multipart dependency. |
| Upload and processing bounds | COMPLETE | Required and verified Content-Length; 100 MiB maximum; 60-second body deadline; two active uploads per API process; twenty retained validated uploads per advertiser under PostgreSQL account lock. FFprobe has 15-second timeout, allocation/probe bounds, file-only protocol, MOV demuxer restriction, bounded metadata reads and discarded stderr. |
| Private staging and validation | COMPLETE | Unique temporary files, H.264/AAC MP4-brand checks, stream/dimension/duration checks, immutable SHA-256 storage; staging removed on success/failure. |
| Owned media registration | COMPLETE | Reuses existing registration and audit services; ownership checked before receiving and rechecked under lock before registration. |
| Persistent storage configuration | PARTIAL | Phase 4 adds Linux 0700/ownership checks, free-space reserve, durable directory sync, API-only volume template and successful disposable persistence probes. Actual target mount/quota/provisioning/candidate restart validation remain gated. |
| Pending submission | COMPLETE | POST `/v-ads/videos/submit` accepts advertiser ID, upload ID, title and description only. Integrity and ownership checked; new revision 020 adds a nullable unique media FK. External URLs/storage keys cannot be submitted. |
| Administrator review | COMPLETE | POST `/admin/v-ads/videos/{id}/review`; independent admin, approved advertiser and valid owned bytes required for approval; canonical serving URL; trimmed review reason and audit event; conditional PENDING update prevents duplicate review. |
| Authorized range serving | COMPLETE | GET `/v-ads/media/{upload_id}`; unapproved media requires owner/admin bearer token. Anonymous access only after video and advertiser approval. Revocation denies access; integrity verified; FileResponse handles ranges/416; private no-store and nosniff headers. |
| Retention and recovery | COMPLETE | Owner can revoke unused/rejected media through DELETE `/v-ads/uploads/{id}`; pending/approved references protected. Offline-only cleanup helper defaults to dry-run, requires >=24h grace, preserves every validated shared-hash reference, recovers orphan objects/stale staging. Database commit failure recovery tested. No cleanup executed against normal data. |
| Targeted local verification | COMPLETE | 67 tests passed across nine V Ads test modules using fresh disposable SQLite. Additional real FFmpeg/FFprobe upload→submission→approval→206 serving test passed in the existing isolated image, with no network, read-only source, temporary DB, CPU/memory/PID limits. Revision 020 upgrade preserves legacy videos/views with valid FKs on SQLite. |
| PostgreSQL migration/concurrency | COMPLETE | Two additional tests passed against newly created PostgreSQL 16.6 with temporary storage and no host ports: revision 020 upgrade, duplicate concurrent submissions/reviews, one audit event, and concurrent upload quota enforcement. Cached images only; private internal test network and test DB container removed afterward. Total verification: 70 passing checks across the runs. |
| Normal runtime activation | BLOCKED | Normal migrations/service replacement are prohibited in this run. Candidate runtime image, private volume provisioning, capacity and restart-persistence still require separately authorized verification. No production readiness claim. |
| Phase 2 — website/mobile | COMPLETE | Safe source integration and targeted isolated verification completed; see the Phase 2 checklist below. Runtime activation remains blocked and physical-device QA remains unverified. |
| Phase 3 — advertiser/admin UI | COMPLETE | Safe source work and focused tests complete; see Phase 3 checklist. Separate admin boundary retained; runtime/browser/device and production-scale gates remain open. |
| Phase 4 — release readiness | PARTIAL | Safe preparation and unresolved-counter/storage checks completed; production verdict BLOCKED. See Phase 4 checklist and release runbook; no normal activation. |

## Phase 1 changed files

- `backend/app/main.py` — add complete media/submission routers; existing edits preserved.
- `backend/app/v_ads_models.py` — nullable unique owned-media association.
- `backend/app/v_ads_video_submission_routes.py` — replace disabled draft with owned-media submission.
- `backend/app/v_ads_media_routes.py` — bounded uploads, review, serving and revocation.
- `backend/app/v_ads_media_cleanup.py` — offline recovery helper.
- `backend/app/v_ads_video_storage.py` — reject symlink ancestors of private root.
- `backend/app/v_ads_video_validation.py` — bounded probing and stricter container/metadata checks.
- `backend/migrations/env.py` — register V Ads metadata; existing edits preserved.
- `backend/migrations/versions/020_v_ads_video_media.py` — additive owned-media link; 019 preserved.
- `backend/tests/test_v_ads_media_lifecycle.py` — API boundaries, failure recovery and real-media integration.
- `backend/tests/test_v_ads_media_migration.py` — legacy-preserving disposable migration check.
- `backend/tests/test_v_ads_media_postgres.py` — opt-in disposable PostgreSQL concurrency checks.
- `backend/tests/test_v_ads_video_validation.py` — malicious/malformed probe metadata checks.
- `docs/V_ADS_IMPLEMENTATION_STATUS.md` and `docs/current-task.md` — status/handoff.

## Configuration and operational gates

Keep media disabled by default. Before separately authorized activation, use an
FFprobe-capable candidate image and direct-Uvicorn startup (existing
`compose.api-runtime.yaml`), never the default migration/seed command. Configure
the private root inside a persistent non-public mount. Phase 4 supersedes the
earlier shared `api_data` suggestion with a separately provisioned API-only
external volume at `/data/v-ads`, since the existing worker shares `api_data`.
Only the API service account should have filesystem access. Never mount this
directory in web/admin public assets. Set process/container memory, CPU and PID
limits; limit API worker count because the two-upload semaphore is per process.
The twenty-upload cap bounds retained media per advertiser, not total disk use.
Reserve capacity and monitor disk usage before enabling uploads.

Serving verifies the whole object before responding, including range requests;
measure throughput before release. The isolated real-media test used 384 MiB,
one CPU, 64 PIDs and a 128 MiB temporary filesystem; these are test settings,
not production capacity recommendations. No new commercial allowance is implied.

For offline recovery, an authorized operator must first verify **all** writers
and readers against that storage are stopped. Call
`cleanup_media(db, storage, offline=True)` to review candidate relative paths;
only then use `apply=True` within that separately authorized maintenance window.
Do not stop normal services or run this helper as routine QA. Validated uploads
are retained until explicitly revoked, including unsubmitted media. Revoked rows
and audit history remain; shared physical bytes remain while any validated owner
reference exists. Commit-failure orphan files wait for the same offline/grace policy.

All safely verifiable Phase 1 source tasks are implemented. Normal storage
activation/persistence gates remain separately controlled. Phase 2 source work
was subsequently authorized and is recorded below. No normal runtime activation
or paused rollout is implied.

## Phase 2 — website and Expo integration, 19 October 2026

| Task | Status | Evidence / limits |
|---|---|---|
| Shared API contracts | COMPLETE | `shared/v-ads.ts`: feed, individual approved reel, viewer likes, comments, profiles, seller workspace, advertiser registration and owned-upload submission. Shared pagination deduplication, upload limits, safe media URLs and canonical public share links. No arbitrary playback hosts or external submission URLs. |
| Expo approved Reels | COMPLETE | Existing card styles, vertical paging, list render/window settings, autoplay/pause, sound, focus and AppState safeguards retained. API feed pagination and deep links replace local demo records; no unapproved fallback. Playback retry respects current focus/activity. |
| Expo engagement and profiles | COMPLETE | Persisted likes hydrate from authenticated engagement reads; authenticated idempotent like/unlike and comments; public paginated comments, actual advertiser profile/video links and public share links. Mutations protected from duplicate taps. |
| Responsive website Reels | COMPLETE | `/v-ads` and `/v-ads/advertisers/[id]`; same theme tokens/public shell, vertical scroll snap, visibility-based autoplay, pause/sound, background pause, likes/comments/profile/sharing. Browser autoplay begins muted. Existing four website links preserved with V Ads inserted to match the required five destinations. Expo five-tab file unchanged. |
| Seller advertiser status and submission | COMPLETE | `/seller/v-ads` on both clients, linked from seller dashboards. Existing seller gates; advertiser registration/status; MP4 picker/raw upload; validated-upload recovery; title/description submission; pending/approved/rejected history and review reasons. Backend still enforces all ownership/publication checks. |
| Loading / empty / offline / authentication / errors | COMPLETE | Initial loading, explicit empty approved feed, retry/error panels, guest and expired-session sign-in paths, disabled submission when storage capability is unavailable. Upload ID survives a failed submission and can be recovered from private workspace after refresh. |
| Website media/session boundary | COMPLETE | Dedicated `/api/v-ads/[...path]` streams media and raw uploads; forwards Range/If-Range and 206/416 headers; validates origin, cookie authentication, size/type/body limits; token stays HttpOnly/server-side. JSON and video use separate bounds; ordinary proxy unchanged. |
| Minimal supporting backend reads | COMPLETE | Existing routers gain GET `/v-ads/me`, `/v-ads/reels/{id}`, `/v-ads/reels/{id}/engagement`. Approved-only deep links, private seller ownership/status/reasons and storage capability; no new migration or Phase 1 gate activation. |
| Targeted automated checks | COMPLETE | 14 website contract/proxy tests + 4 mobile contract/auth-transport/playback-preservation tests + 34 backend tests passed. One existing real-FFprobe test skipped on Windows; Phase 1 real-media isolated evidence remains separate. Website TypeScript and changed-file lint pass; mobile changed-file lint passes with two pre-existing BOM warnings. |
| Isolated browser verification | COMPLETE | Six groups pass: autoplay/pause/resume/sound/scroll/background behavior; persisted likes/comments/profile/share/deep link; 320/390/1440 responsiveness; raw upload→PENDING; disabled capability; empty/offline/retry. Eight real MP4 range requests, four synthetic mutations, zero browser errors. Screenshots inspected. `artifacts/v-ads-phase2-browser/result.json` and three viewport images. Separate Next dev directory/API; preview process stopped; generated Next files restored. Dev browser used CSP bypass for Next development scripts; production same-origin media policy was not changed or certified. |
| Full mobile TypeScript | BLOCKED | Three diagnostics in untouched files: `src/app/profile.tsx:12` references undefined `copy` twice; `src/components/homepage-connect.tsx:64` uses `StyleSheet.absoluteFillObject`. No changed V Ads file reports a type error. Unrelated files preserved. |
| Physical Expo/native upload and playback QA | BLOCKED | No physical device exercised; native picker, file-backed Blob transport, audio/background behavior and device persistence still require device verification. No Expo/package rebuild, dependency install or running-server restart. |
| Normal runtime integration | BLOCKED | Phase 1 storage/image/migration/persistence gates remain disabled and unexecuted. Older running APIs may correctly show unavailable/error states. Do not represent isolated mocks or source as live backend activation. |
| Phase 3 readiness | COMPLETE | Safe Phase 2 source work is ready for review and separately authorized Phase 3 source development. Native/type/runtime gates remain prerequisites for release, not claims of deployment readiness. Admin UI, moderation/analytics and distributed abuse controls remain Phase 3; none implemented implicitly. |

### Phase 2 changed files

- Backend: `backend/app/v_ads_account_routes.py`, `backend/app/v_ads_engagement_routes.py`, `backend/tests/test_v_ads_media_lifecycle.py`.
- Shared: `shared/v-ads.ts`.
- Website UI: `frontend/components/v-ads.tsx`, `v-ads-seller.tsx`, `v-ads.module.css`, existing `shell.tsx` and `seller.tsx`.
- Website pages: `frontend/app/(public)/v-ads/page.tsx`, `v-ads/advertisers/[id]/page.tsx`, `seller/v-ads/page.tsx`.
- Website boundary/tests: `frontend/app/api/v-ads/[...path]/route.ts`, `frontend/lib/v-ads-proxy.ts`, `v-ads.test.ts`, `v-ads-proxy.test.ts`, `frontend/scripts/v-ads-browser-check.mjs`.
- Expo screens: `mobile/src/app/(tabs)/v-ads.tsx`, `advertiser-profile.tsx`, `seller/v-ads.tsx`, existing `_layout.tsx` and `seller/index.tsx`.
- Expo transport/tests: `mobile/src/lib/api.ts`, `v-ads.ts`, `v-ads-upload.ts`, `mobile/tests/v-ads.test.ts`.
- Handoff: this file and `docs/current-task.md`.

No normal service or container restart/rebuild, normal database migration,
production/AWS/environment-file change, commit, push, merge or deployment.
Pre-existing changes preserved. Phase 3 was subsequently authorized and is
recorded below; normal activation remains separately gated.

## Phase 3 — advertiser and admin management, 19 October 2026

| Task | Status | Evidence / limits |
|---|---|---|
| Seller profile editing | COMPLETE | Owner-only name/description edits with content revision token and atomic stale-write guard. Handle/ownership unchanged. Changed approved/rejected profiles return to PENDING; approved videos remain hidden until account re-approval. Suspended sellers cannot bypass moderation by editing. No-op edits preserve status. |
| Seller video management | COMPLETE | Existing submitted listings/status/reason displays retained. Owner can withdraw PENDING/APPROVED/REJECTED videos to terminal REMOVED with reason and audit. Existing revocation reused to release unused or rejected/removed media. No seller restoration or direct publication. Website/Expo add expandable management controls and paginated performance to the existing seller screen. |
| Admin advertiser dashboard | COMPLETE | New `/admin/v-ads` page in the separate admin app/navigation; PENDING/APPROVED/REJECTED/SUSPENDED queues, independent approvals/rejections, reason fields and paginated actor/decision history. New UI binds reviews to current profile token. Suspension requires current APPROVED state; returning SUSPENDED accounts to PENDING requires another recorded admin action and does not publish them. Existing review API retained, with atomic duplicate protection and optional revision checking for backward compatibility. |
| Admin video moderation | COMPLETE | Paginated video queues across all states; descriptions, advertiser eligibility and metrics; private preview, approval/rejection and terminal removal with reasons/audits. Own-account/video admin moderation forbidden. Approval UI requires loaded private preview and explicit review acknowledgement; server retains independent admin/owned-media/integrity/publication checks. Rejection/removal remain possible with media storage disabled; approval stays fail-closed. |
| Private admin preview boundary | COMPLETE | Dedicated admin-only streaming proxy uses `vistrah_admin_session`, verifies ADMIN before media fetch, forwards Range/If-Range and partial response headers, never forwards caller Authorization or exposes tokens. Backend preview independently enforces admin role, validated upload and file integrity. Ordinary admin/public proxies and session boundaries unchanged. |
| Basic analytics | COMPLETE | Owner-scoped and admin-scoped paginated video performance: video totals, recorded signed-in views, likes and visible comments. Other sellers cannot inspect private performance. Anonymous historical view rows excluded from these metrics; removed-video history retained. These are basic counts, not billable impressions or verified unique humans. |
| Duplicate/abusive views | COMPLETE | Authenticated endpoint only; new events exclude advertiser owner and ADMIN. Deterministic UUID primary key permits one event per viewer/video/UTC day; database user-row lock coordinates API processes. Caps: 30 new counted events/minute and 300/rolling 24h per user. No anonymous IP/device fingerprinting. Website/Expo send after >=3 seconds of progressing active playback; pauses, large seeks, inactive cards, comments/background and guests do not qualify. Tracking failures do not interrupt playback. |
| Permissions and integrity verification | COMPLETE | 12 new backend cases pass on fresh disposable SQLite: ownership, stale profile/review/status, suspension/re-review, preview authorization/range, terminal removal/withdrawal, audit uniqueness, revocation, deduplicated/capped views, analytics privacy and visible-comment counts, storage-off rejection. Five directly affected existing advertiser-review tests also pass. Seven new shared management/admin-preview contract tests pass. Total executed: 24 tests (19 new + 5 affected baseline). No Phase 2 52-test batch or six browser groups rerun. |
| Focused source checks | COMPLETE | Changed V Ads entry points/imports pass no-emit checks for admin, website and Expo using `frontend/scripts/check-v-ads-phase3.mjs`. Changed-file lint passes across all three; existing Expo Reels BOM warning preserved. No whole-app TypeScript check/build, install or Docker/browser run. Three unrelated mobile diagnostics left untouched. |
| Runtime and release verification | BLOCKED | Phase 1 normal image/storage/migration/persistence gates remain disabled. New Phase 3 browser interactions, physical Expo behavior, PostgreSQL view-counter concurrency and production-scale capacity/abuse resistance remain Phase 4 validation gates. SQLite sequential/integrity tests do not establish PostgreSQL operational readiness; Phase 1 concurrency evidence is not proof for new counters. |
| Phase 4 readiness | COMPLETE | Ready for separately authorized release-readiness review/validation. No deployment/production readiness claim; unresolved runtime, device and baseline mobile type gates remain open. |

### Phase 3 changed files

- `backend/app/v_ads_management_routes.py` — owner management, moderation/history, private previews, analytics and view deduplication/rate caps.
- `backend/app/v_ads_account_routes.py` — content review tokens, rejected account queue, pagination and owned media/reason metadata.
- `backend/app/v_ads_review_routes.py` — stale profile review guard and atomic pending decision.
- `backend/app/v_ads_media_routes.py` — permit safe rejection without enabling storage; preserve approval gate.
- `backend/app/main.py` — register the new management router; prior edits retained.
- `backend/tests/test_v_ads_management.py` — new Phase 3 permission/integrity tests.
- `shared/v-ads.ts`, `shared/v-ads-management.ts` — additive management types, shared client/decision/watch-time contracts.
- `admin/components/v-ads-management.tsx`, `admin/app/admin/v-ads/page.tsx`, `admin/components/admin-navigation.tsx` — separate admin dashboard and navigation entry.
- `admin/lib/v-ads-preview.ts`, `admin/app/api/admin/v-ads/videos/[id]/preview/route.ts` — private admin media proxy.
- `frontend/components/v-ads-management.tsx`, `frontend/components/v-ads-seller.tsx` — additive seller management/performance.
- `mobile/src/components/v-ads-management.tsx`, `mobile/src/app/seller/v-ads.tsx` — corresponding Expo seller controls.
- `frontend/components/v-ads.tsx`, `mobile/src/app/(tabs)/v-ads.tsx` — isolated qualified-view effects; existing playback/UI controls retained.
- `frontend/lib/v-ads-management.test.ts`, `frontend/scripts/check-v-ads-phase3.mjs` — focused contracts and no-emit source verification.
- `docs/V_ADS_IMPLEMENTATION_STATUS.md`, `docs/current-task.md` — checklist/handoff.

All changes are source only on the required feature branch. No schema change or
new migration, normal database access/migration, running service/container
restart/rebuild, AWS/production setting change, commit, push, merge or deployment.
No Phase 2 browser/test blanket rerun. Existing user edits and the five-tab
navigation are preserved. Phase 4 was subsequently authorized and is recorded below.

## Phase 4 — controlled-release preparation, 19 October 2026

### Temporary Android feed preparation — 20 October 2026

**Loopback feed READY; Android LAN access PENDING phone IPv4.** Separate
`vads-android-20261019-api` uses the tested cached image, current source read-only,
fresh tmpfs SQLite through 020 and three generated approved H.264/AAC clips;
pending/rejected fixtures stay out of feed. HTTP health 200, exactly three feed
items, each playback URL range 206/32 bytes, all mutations denied 403. Evidence
`artifacts/v-ads-android-20261019/readiness.json`; no normal data or identities.

Only `127.0.0.1:8112` published; 384 MiB/0.5 CPU/64 PIDs, no normal volumes,
dedicated `vads-android-20261019-private` bridge with container-to-container
communication disabled. This bridge has ordinary NAT, not no-network isolation;
normal services are not attached and no normal credentials used. Backend exits
one hour after fixture initialization, container/tmpfs auto-removed. Initial local
log option and inaccessible internal-bridge setup corrected only on disposable
resources; no existing container/network restarted/reconfigured.

Existing LAN helper reused by prepared `enable-phone.ps1` + `gateway.cjs`, new
port 18102, allowlists phone + PC and auto-exits in one hour. Launcher syntax
checked, **not launched** because phone IPv4 is required. No firewall rules,
mobile env, existing Expo/18101/API/worker/web/admin/DB changes. User question
pending: current phone Wi-Fi IPv4. Runbook records URLs, limits and scoped cleanup.

### Authorized disposable reels/playback test — 19 October 2026

**PASS: one isolated end-to-end API scenario**, no full suites rerun. Cached dev
image, fresh tmpfs-only SQLite initialized to 020, synthetic seller/independent
admin and generated real 2,288-byte H.264 MP4. Approved reel alone appears in feed
and profile; its returned `/v-ads/media/{upload_id}` matches direct reel payload,
contains no credentials and serves identical MP4 bytes (200), range (206) and
invalid-range rejection (416). Pending/rejected reels return 404, anonymous media
401; owner previews succeed. Suspending advertiser empties feed, hides direct
reel and denies anonymous media (401).

384 MiB/0.5 CPU/64 PIDs, no network/ports/normal mounts; source read-only. Fresh
schema/media existed only inside container tmpfs and were destroyed on exit.
Tmpfs virtual size 1 GiB with synthetic reserve 600 MiB is not full-size capacity
evidence; actual allocation small and bounded by cgroup. No running app/Expo/API/
worker/web/admin or normal database touched. No builds/downloads/deployments.
Evidence: `artifacts/v-ads-local-reels-20261019/{probe.py,result.json}` (ignored,
not GitHub-backed). Existing harmless TestClient deprecation only. This verifies
backend URL/access/range semantics, not physical-device/browser playback or live
proxy activation. Release and independent backup/device gates remain open.

### Requested contract test and cached backend feasibility — 19 October 2026

**PASS for bounded local no-build checks; release remains BLOCKED.** Requested
existing native media URL/file-validation contract: **1 passed, 0 failed** in
cached web image, network disabled/read-only, 192 MiB/0.25 CPU/32 PIDs, no DB.
No other old suites rerun. Cached backend dev image
`sha256:73eb91d244f4dbd40a32c5be48c2204e968ae9448f9faf98ec4fc2121607bccc`
passed pip dependency integrity, disabled-media preflight, FFmpeg/FFprobe
5.1.9-0+deb12u1 and current ASGI source import with database connections prohibited.
Probe used current app/shared read-only, UID 1000, no network, 384 MiB/0.5 CPU/
64 PIDs and 128 MiB tmpfs; no server, normal volume or database activity.

Observed host available RAM ~1.380 GiB, C: free ~7.528 GiB, E: ~49.483 GiB.
Sequential bounded probes work without rebuild; build/full upload/production
capacity is not established. Complete backend flows require separately authorized
disposable schema-020 DB/media, never running revision-013 data. Existing API,
worker, web/admin/Expo unchanged; no pull/build/prune/commit/push/deployment.
Recovery ZIP remains the verified point-in-time 77-file copy; this new result
entry and handoff additions postdate it. Runbook records exact evidence/limits.

### Approved local recovery protection — 19 October 2026

77-file source/test/asset/runtime/doc recovery snapshot authorized. Exclusive
ZIP `backups/v-ads-source-20261019.zip`, with per-file SHA-256 manifest and baseline
HEAD; owner/SYSTEM-only ACL. Receipt
`backups/v-ads-source-20261019.receipt.json` records archive hash, all 77 entry
size/hash checks, live-source comparison and ACL verification. **COMPLETE only
if that receipt has `verified: true`**; read receipt for actual execution result.
No secrets, database content, generated output, commits or pushes included.
This is scoped local protection, not an off-host/full-repository backup; other
unpublished dependency work and ignored historical evidence remain outside it.

Smallest next local verification is one existing Node client-contract test using
the cached web image in a network-disabled/read-only 192 MiB disposable container,
with three source-only mounts and no DB/env/normal volumes. Runbook records exact
test filter and isolation; no build needed. Not executed merely to repeat prior
passing coverage. Candidate/security, broader dependency protection, device and
release/backup/migration gates remain. No deployment or database action authorized.

### Immutable-base and source-protection review — 19 October 2026

**BLOCKED. 100 MiB limit retained; no 5 MB compressor or other feature change.**
Official `library/python:3.12-slim` registry metadata verifies OCI index
`sha256:a6e34c598f2467ed0e9a8d349809fcd8b5c603269512df273a0bb1784edc11b1`
and linux/amd64 manifest
`sha256:2b4f19dae3a777dfc3b76730bda1e82e1f66ab2a2686fa93ca78edbfb4f04ffe`.
Raw SHA-256/header/index matches verified; compressed layers total 43,259,288
bytes. Metadata only, no layers pulled. Prospective base satisfies Dockerfile
family, but candidate remains unbuilt/unscanned and compatibility unproven.

Newly accessible optimized examples: 2,715,088 and 2,816,796 bytes under
`frontend/public/videos/v-ads/optimized/`; originals unchanged. This supplements
the earlier original-only inspection, not evidence of seller compression. For
illustrative 200 objects, observed optimized mean implies 2.101134 GiB primary
subtotal, original mean 8.929352 GiB, enforced maximum 21.117188 GiB. Backup/clone,
orphans and other overhead are extra. Upper-bound backup+clone media need
39.0625 GiB; E: free ~49.562 GiB is not approved protected capacity. Latest C:
free ~7.620 GiB; reuse host available RAM 1.918 GiB. Runbook proposes explicitly
unvalidated initial rehearsal budget (2 GiB build RAM/1 CPU/256 PIDs/4 GiB growth
plus 2 GiB host RAM and 5 GiB C: reserves); current observations fail it.

Live GitHub branch/local HEAD/upstream all `2c1d80fa06ebacc34a20881bf160c840787f2d83`.
Scoped 77-file core/integration/test/asset/doc inventory: **66 untracked, 11
tracked modified**, not in that pushed HEAD. Full independent source protection
is **not verified**; required prior dependency work and ignored test evidence
also need preservation. Runbook lists groups/exact modified integrations. No
commit/push/fetch/reset/overwrite or runtime action. Smallest next approval is
source-only recovery ZIP at the runbook's exclusive-create local path, with
manifest/read-back checks and secrets/caches excluded; not executed. No old tests
rerun; registry/GitHub metadata and documentation checks only.

### Video compression/size evidence review — 19 October 2026

**5 MB input/output restriction not found in the current implementation.**
Mobile picker (`mobile/src/lib/v-ads-upload.ts:9`) uploads selected bytes without
compression. Shared validator (`shared/v-ads.ts:13`), server body validation
(`backend/app/v_ads_media_routes.py:70`), FFprobe validator, staging and immutable
storage consistently allow up to **104,857,600 bytes inclusive (100 MiB)**.
There is no compressed output variant. FFprobe's `5000000` probe/analyze settings
are not a video file-size cap. Existing size tests reject 104,857,601 bytes; no
5 MB compression assertion found. Tests reviewed, not rerun.

Workspace and running web static clips are **31,946,162** and **46,903,151 bytes**
(`frontend/public/videos/v-ads/Vistrah Business.mp4`, `Vistrah Users.mp4`). These
are examples, not a customer volume forecast. No MP4 found in current API `/data`
within depth four; no claim about cloud/production media. No generated per-video
thumbnail pipeline in inspected V Ads contracts. Cache/staging cleanup and offline
24-hour-minimum unreferenced-object grace exist; VALIDATED media has no automatic
TTL and twenty-reference cap is not a lifetime disk cap.

For illustrative 200 distinct maximum-size videos, Stage C **21.1171875 GiB**
subtotal stands: 19.53125 GiB retained + 600 MiB transient allowance + 1 GiB reserve.
One separate full media backup adds 19.53125 GiB (40.6484375 GiB aggregate), before
orphans/filesystem/archive/DB/state overhead; clone storage is additional. A
strictly <5,000,000-byte policy would yield <2.517261 GiB primary with the current
reserve policy, but is hypothetical and cannot replace release sizing. Runbook
contains exact locations, formulas, thumbnail/cache/retention caveats and remaining
policy/backup/quota decisions. No feature/build/database/service changes.

### Stage C — preparation-only connectivity and capacity, 19 October 2026

**BLOCKED for candidate/release; configured Expo LAN health verified from PC.**
Correct path `http://10.134.38.224:18101/api/health` returns **200**; `/health`
returns 404 and direct API `/health` returns 200. Stage B's connectivity-failure
inference is corrected: the 404 alone was a path distinction. No mobile/proxy
configuration changed; phone reachability and actual API/media contracts remain
device QA prerequisites, not failed checks.

Exact reviewed candidate base digest **does not exist in supplied configuration**:
required `PYTHON_BASE_IMAGE` has no value/default; no candidate or Python-tagged
image is locally present. Ordinary backend's `python:3.12.10-slim` tag is not a
reviewed candidate digest. No image downloaded, built or scanned.

New read-only resource sample: host available RAM **1.918 GiB**; WSL available
**6.134 GiB**, configured Docker RAM ~7.607 GiB / 8 CPUs; six running containers
~0.408 GiB total. Docker VHDX verified on **C:**, file length 35,244,736,512 bytes;
C: free **7.721 GiB**, E: free **49.562 GiB**. Linux virtual free **926.310 GiB**
does not represent host-backed growth space. Build cache 25.63 GB (21.4 GB
reported reclaimable, not reclaimed). Build peaks/reserves and cache budget are
unmeasured, so no safe additional build/runtime headroom is established. No cache
cleanup or Docker/resource change.

Illustrative 200 maximum-size retained objects + staging + reserve need **21.117
GiB before orphan/FS allowance and backups**, exceeding present C: growth space.
Demand, hard quota, retention/cleanup, protected independent backup destination
and restore budget remain decisions. Runbook records exact figures and scope.
Smallest next approval remains exact-base download only **after** digest and
resource budgets are supplied/reviewed; no concrete download approval requested
for an unspecified artifact. Reuse Stage B revision 013/pending 014–020 and writer
evidence. No database queries, migrations, stops, tests or deployment this stage.

### Stage B — read-only deployment preflight, 19 October 2026

**BLOCKED.** Local `vistrah20` metadata and read-only SQL inspected; no build,
scan, storage provisioning, service stop/restart, migration or deployment.
Successful read-only transaction establishes **revision 013**, hence **014–020
inclusive (seven migrations)** pending, including commerce/membership/catalogue
changes. This supersedes earlier unknown **local** revision; production remains
uninventoried. API runs direct Uvicorn; worker is running and writes heartbeats/
workflow outcomes; both share `vistrah20_api_data`. Protected snapshot must fence
both plus all other writers. No backup/clone was created.

Stage A base/tooling/host-capacity evidence reused. No reviewed base digest
supplied; build backing-store/resource budget unverified. Local-project memory
sample totals ~375 MiB, without per-container caps; this is not build headroom.
API state 8 KiB, DB directory ~100.18 MiB, database ~13.62 MiB. Linux virtual
filesystem free ~926.31 GiB does not establish host-backed quota. Dedicated media
mount, demand/retention forecast, protected backup capacity/ACL/encryption and
restore resource budget remain unapproved. Runbook retains projected 19.53 GiB
for 200 distinct maximum-size objects before transient/reserve/retention overhead.

Direct API `/health`: HTTP 200; existing Expo-configured LAN endpoint on 18101:
HTTP 404 for `/health`, despite listener present. Physical-phone routing/client
allowlist and API forwarding remain unverified; share URL is emulator-only.
No phone or runtime/config changes; existing UI and tests untouched. Runbook
details Android prerequisites and exact backup/clone, migration and activation
approvals. Smallest next authorization is only an exact reviewed base download,
after operator supplies digest and cache/memory budget; no placeholder approval,
build or rollout is implied. Prior suites were not rerun.

### Stage A — final local verification, 19 October 2026

**BLOCKED.** Candidate configuration and existing tooling inspected on the required
feature branch. Docker Scout v1.24.0 is available; existing CI has npm audit but no
image/Python CVE scan, and publishing uses the ordinary backend Dockerfile. No
reviewed Python base digest is supplied/cached; build backing-store headroom and
peak resource budget remain unverified (host available RAM ~2.50 GiB, C: free
~7.79 GiB, E: free ~49.56 GiB; Docker configured RAM ~7.61 GiB is not free RAM).
Conditional candidate build was therefore not attempted; no candidate scan or
runtime dependency result is claimed. No tools/dependencies installed or images
downloaded; no prior test suite rerun.

Runbook now records observations, conservative sizing worksheet, exact pending
candidate dependency/Scout commands and short Android Expo QA checklist. Target
storage quota, actual retained media/advertiser counts, growth/retention and backup
budget are unknown; no storage provisioned/resized. Physical-device/admin QA,
exact-artifact rehearsal and existing unrelated mobile type disposition remain
open. Next approvals are target/resources, protected backup + isolated restore and
API/worker/all-writer maintenance window, complete pending migration range after
revision inventory/clone rehearsal, and separate API/web/admin/media activation.
Stage A permits conditional local candidate preparation, not any live operation.

**Production-readiness verdict: BLOCKED.** Preparation is complete within the
authorized scope. Deployment, production provisioning and normal data operations
were not performed. [V_ADS_RELEASE_RUNBOOK.md](V_ADS_RELEASE_RUNBOOK.md) is the
ordered preparation/approval/backup/migration/activation/smoke/rollback procedure.

| Gate | Status | New evidence / remaining work |
|---|---|---|
| Source/migration review | COMPLETE | Single head `020`; metadata chain `001`–`020`, specifically `018 → 019 → 020`. V Ads FKs target existing users/advertisers/media; nullable unique media link preserves legacy rows. No new schema migration. `019` downgrade deliberately refuses; `020` downgrade loses associations. Normal revision remains unknown; older pending migrations require their own scope approval. |
| Private-root and admission safeguards | COMPLETE | HTTP media gate now enforces API-owned Linux mode 0700 and non-symlink ancestors; unreadable/unsafe root returns 503. Uploads require configurable free-space reserve (default 1 GiB; minimum 600 MiB for two three-copy pipelines), returning 507 before receiving/probing when insufficient. Playback is not blocked merely by low free space. No quota or billing provisioned. |
| Durable object registration | COMPLETE | File contents already fsynced; now hard-link/shard/object/root directory metadata is fsynced before registration, including retry/dedup after sync failure. Existing staging/failure cleanup/retention policies retained. |
| Linux private persistence/ranges | COMPLETE | New disposable volume: UID 1000, root 0700, object 0600, immutable content persisted and hash-verified from a second container with read-only mount. New root-gated HTTP 206/416 checks pass. These are local Linux cached-dev-image results, not proof for an unbuilt candidate or untested storage driver. |
| New counter PostgreSQL races | COMPLETE | Three previously unresolved tests pass on a fresh isolated PostgreSQL 16.6 database: eight same-viewer requests count once; concurrent requests admit one remaining slot at both minute and rolling-day caps. No earlier PostgreSQL suites rerun. |
| Runtime/environment templates | COMPLETE | No-seed/preflight/single-worker/non-root FFprobe runtime Dockerfile prepared; read-only/resource-limited Compose override plus API-only external private volume and separate client image override; defaults disabled and sizing/image names deliberately require approval. Composed configuration parsed/asserted with synthetic values only. Existing Compose/private env settings unchanged. Candidate not built/scanned. |
| Website/Expo configuration | COMPLETE | Local cookie/bearer and reachable-device API boundaries reviewed. Native public sharing required a website-origin template value; added `EXPO_PUBLIC_WEB_URL` to `mobile/.env.production.example` only. No actual production env modified. Compact device/hosted-phone routing checklist is in runbook. |
| Focused newly executed tests | COMPLETE | 11 new Linux/PostgreSQL tests passed, plus two additional storage sync-retry/filesystem-denial cases passed in a fresh network-disabled container: 13 total. Two separate private-volume persistence probes pass. Migration metadata/syntax checks and Compose template assertions pass. No old full suites, browser groups, broad type/lint checks or image builds executed. Existing harmless testclient/cache-option warnings remain. |
| Target capacity/provisioning/backup | BLOCKED | Target project, actual revision/commands/UIDs, private-volume identity/backing quota/alerts and approved resource limits are not inventoried/activated. Protected consistent backup + isolated restore/old-image compatibility proof and approved writer-free window remain required. All normal services/data untouched. |
| Release candidate and UI/device proof | BLOCKED | New candidate image build/download/scan and exact-artifact smoke/persistence/rollback rehearsal need approval. New Phase 3 admin browser interactions and physical Expo QA remain unexecuted. Three unrelated mobile type errors unchanged. Existing source/baseline tests are not proof of live or signed-build readiness. |
| Controlled deployment | BLOCKED | Requires explicit approval of maintenance/API+worker quiescence, complete migration range, private storage provisioning/capacity and API/web/admin replacements/media enablement. Native/phone-web publication and any production/AWS/DNS changes are separate decisions; none executed. |

### Phase 4 changed files

- `backend/app/v_ads_readiness.py` — database-free read-only runtime preflight, Linux permissions and reserve validation.
- `backend/app/v_ads_media_routes.py` — fail-closed private root and pre-body upload headroom checks.
- `backend/app/v_ads_video_storage.py` — directory fsync including retry/dedup durability.
- `backend/Dockerfile.v-ads-runtime` — unbuilt controlled-runtime source, no migration/seed startup.
- `compose.v-ads-runtime.example.yaml`, `compose.v-ads-clients.example.yaml`, `v-ads.runtime.env.example` — inactive additive templates.
- `backend/tests/test_v_ads_readiness.py`, `backend/tests/test_v_ads_view_concurrency.py` — only new/affected release gates.
- `mobile/.env.production.example` — missing public website share-origin template entry.
- `docs/V_ADS_RELEASE_RUNBOOK.md`, this checklist and `docs/current-task.md` — approval-separated operational handoff.

The two cached images were reused solely for disposable tests. The newly created
database container/internal network/media volume were removed; temporary test
containers used no normal mounts or host ports. No normal service/website/Expo
restart/replacement, normal database migration/seed, AWS/production configuration
change, dependency installation, commit, push, merge or deployment. Existing Git
work and five-tab navigation preserved. Next step is owner review/approval of
candidate preparation and remaining gates, not automatic activation.
