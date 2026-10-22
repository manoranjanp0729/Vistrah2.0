# V Ads controlled-release runbook

## GHCR preflight ready; explicit dispatch approval pending - 20 October 2026

Reuse the owner's completed Free-quota/$0-budget/blocked-overage review; do not
request an upgrade or purchase. Exact candidate `4cc5e2f` uses standard runners
and preserved checks, with no package-visibility change. Metadata inspection was
blocked by missing `read:packages`, then owner confirmed all three packages
absent. New packages default private and link to the publishing repository via
GITHUB_TOKEN. Request explicit first-publication authorization for exact source
`4cc5e2f`; do not dispatch now. Actual registry access/private status, FFmpeg
checks and all three immutable digests must pass during the approved run. The detailed
evidence in [RELEASES.md](RELEASES.md) supersedes the older unverified billing gate.

## Current execution boundary - 20 October 2026

The approved registration-only stub is now the sole addition in main commit
`902c88e`; GitHub recognizes workflow `390740934`. User subsequently instructed
**Hold candidate publishing**. The exact `4cc5e2f` development source and manual
request are prepared; no dispatch, image build, FFmpeg smoke or publication ran.
Before resuming, verify included Actions quota/no paid overage and private GHCR
package/repository Actions access; the configured credentials cannot read those
prerequisites. No production exception is granted by the isolated test scope.
AWS Test public HTTPS health passes, but new V Ads routes are not deployed;
administrative login remains expired. Preserve existing running services/data.
Android APK auth/signing/quota and device checks remain open. Detailed evidence
and the exact approval/hold history are maintained in [RELEASES.md](RELEASES.md).

## Earlier preparation checkpoint - 20 October 2026 (historical)

Use the protected source branch `chore/protect-local-source-20261020`.
[RELEASES.md](RELEASES.md#integrated-aws-test-milestone---20-october-2026)
records passing hosted application checks, the authorized isolated
server-image CI scope, unexecuted bounded FFmpeg/validator smoke, and a concrete
registration-only default-branch proposal. At this earlier checkpoint the
workflow was unregistered; the execution boundary above records its subsequent
registration and explicit publication hold. Do not deploy to solve a source gate.
AWS login remains expired; no cloud resource/capacity/recovery claim is verified.
Existing media limits, backup/restore, writer fencing, migration approval and
direct-Uvicorn activation gates below remain mandatory. No deployment, main
change, candidate build/dispatch or normal database/container action occurred.
Physical Android APK and hardware acceptance remain pending; Expo web export
and passing source tests do not establish a working installed application.

Preparation completed 19 October 2026. **Production verdict: BLOCKED.**
This document does not authorize execution. No command in the deployment,
backup, migration, build or rollback blocks below was executed during Phase 4.
Historical and newly executed checks are distinguished in
[the implementation checklist](V_ADS_IMPLEMENTATION_STATUS.md).

## Current evidence and unresolved gates

- Source migration chain is linear: `001` through `020`; V Ads is `018 → 019 → 020`.
  `018` is the provider-catalogue-request dependency, not a V Ads-only change.
  `019` adds advertisers/videos/engagement/private-upload registrations. `020`
  adds a nullable media FK and unique index, preserving legacy video rows.
  Phases 2–4 add no schema migration. Stage B verifies local `vistrah20` at **013**;
  production revision is unknown. Historical `006` is not current evidence.
- Prior Phase 1–3 permission, playback, range, migration and management results
  remain baseline evidence; their whole suites/browser groups were not rerun.
- New Phase 4: 13 targeted tests pass, including PostgreSQL duplicate-view and
  rate-cap races, Linux root permissions, capacity rejection, directory-sync
  failure recovery and HTTP 206/416. Separate disposable-container probes verify
  private-volume persistence, UID 1000/mode 0700 and object mode 0600. Tests used
  cached development images, **not** a newly built release image.
- New runtime/client Compose templates parse together with synthetic values,
  remain disabled by default, use direct single-worker Uvicorn, and mount an
  explicitly provisioned API-only media volume. Nothing was applied.
- Still required: reviewed artifacts and candidate build/scan/smoke/rollback
  rehearsal; actual target inventory/revision/commands; approved capacity,
  resource limits and private-volume provisioning; protected backup/restore
  proof; real admin interaction and physical Expo QA; resolution or explicitly
  approved disposition of the three unrelated mobile type errors. No general
  production entitlement or infrastructure readiness is established here.

## Approval gates

### Temporary Android feed session — 20 October 2026

User authorized preparing an Android-accessible temporary feed while preserving
the existing application. **Backend is running/verified on loopback only; LAN
gateway is NOT running until phone Wi-Fi IPv4 is supplied.** Never describe
`http://10.134.38.224:18102` as reachable before that gate is completed.

- New container `vads-android-20261019-api`, cached tested dev image, read-only
  app/migrations/shared/fixture mounts; no normal volumes/credentials. Only a new
  tmpfs SQLite database initialized through 020 and synthetic media/identity.
- Three approved 6-second H.264/AAC color/tone clips plus pending/rejected rows.
  Test adapter reuses current API routes but blocks all writes and non-feed paths.
  No seller/admin/auth changes exposed, no normal users copied.
- Verified `http://127.0.0.1:8112/health` 200;
  `/v-ads/reels` exactly three approved entries; all returned media URLs return
  206/32-byte ranges with Content-Range; mutation attempt 403. Audio encoded,
  not yet heard/decoded on a physical Android device.
- Limits: 384 MiB RAM/0.5 CPU/64 PIDs; 1 GiB virtual tmpfs with 600 MiB test-only
  reserve; actual observed container memory ~91.77 MiB. Source upload cap stays
  100 MiB, no compressor/policy change. Not a full-size capacity benchmark.
- Dedicated `vads-android-20261019-private` bridge, ICC disabled, loopback port
  8112 only. Ordinary bridge NAT exists; no outbound workflow/network sources
  enabled, no normal-service network membership. An initial internal bridge did
  not permit host access here and was removed with only its disposable fixture.
  Log-rotation setting corrected only on the disposable launch.
- Server auto-exits after one hour from fixture initialization; `--rm` destroys
  its DB/media. Empty dedicated network may remain for explicit scoped cleanup.

Prepared `artifacts/v-ads-android-20261019/enable-phone.ps1` (syntax checked)
reuses existing `mobile/scripts/dev-api-proxy.cjs` via a one-hour wrapper, Node
already installed locally, hidden background process and separate logs. It binds
PC Wi-Fi `10.134.38.224:18102`, admits only supplied phone IPv4 and PC, forwards
only to disposable loopback 8112, and changes only child-process environment.
No change to normal helper 18101, Expo 8082, root/mobile env or firewall rules.
Do not invent the phone IP or widen the allowlist.

After phone IP is supplied and disposable health still ready, execute only this
session launcher (replace placeholder; **not executed yet**):

```powershell
& .\artifacts\v-ads-android-20261019\enable-phone.ps1 -PhoneIP 'REPLACE_WITH_PHONE_WIFI_IPV4'
```

Then phone health is `http://10.134.38.224:18102/health`, feed
`http://10.134.38.224:18102/v-ads/reels`, media URL = that base + returned relative
`video_url` (no `/api` prefix for this new helper). Check from phone before claiming
reachability. Existing Expo continues using its existing endpoint; using this
feed in Expo requires a separately selected session pointed at this temporary
base, not rewriting/restarting the working session. No signed APK change implied.

Evidence/scripts: `artifacts/v-ads-android-20261019/{serve_fixture.py,gateway.cjs,
enable-phone.ps1,readiness.json}`; ignored/local, outside recovery ZIP.
If container expires before phone setup, report expiry and recreate only this
disposable fixture under the same safety limits; never restart normal services.
Manual cleanup, only after verifying `vistrah.scope=vads-android-disposable` on
the named resources: stop `vads-android-20261019-api` if still running, remove
empty `vads-android-20261019-private`. Gateway self-expires; any earlier shutdown
must match PID **and** start time/path recorded by launcher, never kill all Node.

### Executed disposable reels and playback URLs — 19 October 2026

User authorized fresh disposable DB/media verification. **One end-to-end scenario
PASS** in cached dev image with current source read-only, no network, no host ports,
no normal volumes or private envs. Created only tmpfs SQLite schema through 020,
synthetic seller/admin and real generated H.264 MP4 (2,288 bytes); container and
all disposable DB/media auto-removed. No normal database or service changes.

| Check | Result |
|---|---|
| Approved/pending/rejected feed and advertiser profile | Only approved reel listed |
| Returned playback URL | Same `/v-ads/media/{upload_id}` in feed and direct reel; no query credentials |
| Anonymous approved full playback response | 200, `video/mp4`, bytes identical to validated MP4 |
| Playback range / invalid range | 206 with exact bytes and Content-Range / 416; private no-store |
| Pending/rejected direct reel / anonymous media | 404 / 401 for both |
| Owner pending/rejected private preview | 200, exact MP4 bytes |
| Advertiser suspension | Feed empty, approved direct reel 404, anonymous media 401 |

Limits: 384 MiB RAM, 0.5 CPU, 64 PIDs; 1 GiB tmpfs virtual ceiling and 600 MiB
test-only minimum-free setting. Actual fixture is tiny; cgroup caps real memory.
Not a 100 MiB upload-throughput, PostgreSQL or durability benchmark. Generated
video validity was checked by actual FFprobe upload processing; request tests are
in-process ASGI, **not** a browser/phone decoding/audio test or live proxy test.
Existing Starlette/httpx warning only; no dependencies changed. Evidence:
`artifacts/v-ads-local-reels-20261019/probe.py` and `result.json`, ignored/local
and outside the prior recovery ZIP. Existing 77-file archive remains untouched.

Further release work remains candidate scan/build budget, device/proxy playback,
protected independent backup/restore and separately approved operational gates.
Do not point these checks at the existing revision-013 database or enable media
on normal services merely because disposable API responses pass.

### Executed cached-image local checks — 19 October 2026

**Local no-build source checks PASS; full candidate/release remains BLOCKED.**
User explicitly requested the existing contract test. One test executed, not a
suite rerun: `native media URL and file validation fail closed`, **1 passed,
0 failed**, using the exact cached web image recorded below, `--pull never`,
network disabled/read-only, 192 MiB/0.25 CPU/32 PIDs and three source-only mounts.
Node emitted its expected experimental type-stripping warning. Temporary
container auto-removed; no ports, service mounts, env secrets or DB access.

Cached backend image verified present:
`sha256:73eb91d244f4dbd40a32c5be48c2204e968ae9448f9faf98ec4fc2121607bccc`
(942,916,983 bytes image metadata, already occupying disk; no download/build).
One fresh disposable probe used current `backend/app` and `shared` read-only,
UID 1000, no network, read-only root, 384 MiB RAM/0.5 CPU/64 PIDs, 128 MiB tmpfs,
capabilities dropped and no-new-privileges. Synthetic process-local configuration
only; no host/private env or normal volumes. Results:

- `python -m pip check`: **No broken requirements found**. Cache disabled because
  UID 1000 cannot write image user's cache; no packages installed.
- Disabled-media database-free preflight passed; FFmpeg and FFprobe present,
  both **5.1.9-0+deb12u1**.
- Current `app.main` import passed with `Engine.connect` replaced by a fail-fast
  guard in the probe process; no server, migration, seed or DB connection started.

Resource snapshot after contract test: host available **1,481,396,224 bytes
(~1.380 GiB)**; C: free **8,082,976,768 bytes (~7.528 GiB)**; E: free
**53,132,279,808 bytes (~49.483 GiB)**. Both isolated containers completed within
their hard limits. This establishes practical capacity for bounded sequential
source/dependency probes, not build headroom or full-size upload throughput.
Existing services were neither exec targets nor restarted/reconfigured.

**Answer:** current backend source can use the cached development dependencies
for isolated local checks **without rebuilding Docker**. It is not the release
candidate or a successful enabled-media/full-API rehearsal. For the next full
backend flow use the same cached image plus an explicitly disposable, tmpfs-backed
database at schema 020 and disposable media, no ports/normal credentials/volumes;
do not connect it to running local revision 013. Database creation/migration even
there must be separately authorized under the current no-database-change scope.
For now no further old suites need rerunning. Candidate scan, actual device,
independent backup/restore and production gates remain open.

Recovery ZIP/receipt remain unchanged and verified for their point-in-time
77-file snapshot. These subsequent test-result documentation additions postdate
that snapshot; no archive overwritten and no Git publication performed.

### Authorized 77-file local recovery snapshot — 19 October 2026

User authorized protection of the 77 unpublished files; no Git publication or
runtime/database action. Recovery ZIP:
`E:\Vistrah 2.0\backups\v-ads-source-20261019.zip`; verification receipt:
`E:\Vistrah 2.0\backups\v-ads-source-20261019.receipt.json`.
**Protection is verified only when the receipt reports `verified: true`.**
Both are exclusive-create, never overwrite existing files; ACL restricted to
the current owner and SYSTEM. ZIP includes all 77 approved paths under `files/`,
`RECOVERY_MANIFEST.json` (per-file bytes/SHA-256, baseline HEAD/branch), and
`RESTORE_README.txt`. Verification reopens the ZIP, validates all entry lengths
and hashes, compares current source hashes, and records ZIP SHA-256 in receipt.
The receipt is the authoritative execution result, not this preparation text.
Ignored backups stay outside Git; no stage/commit/push/reset.

This snapshot protects those paths against accidental working-tree loss. It is
not a complete repository/database backup, does not include ignored test artifacts
or private settings, and shares E: with the workspace. Other unpublished pending
dependency/user work still needs separate preservation before a full release.
Restore into a new empty directory, validate manifest/receipt, and compare with
recorded HEAD; never extract over the live workspace automatically. Required
014–018 dependencies are not all in the 77-file scope.

**Smallest safe next local test:** no candidate build is needed for one
client-contract check. Reuse cached immutable web image
`sha256:f2a6511a1a191797666baea737feada1af2383fac603a33fbac64ef4e03b8245`
(Dockerfile specifies Node 22.16.0; confirm cached runtime before use), with
`--pull never`, `--network none`, read-only root,
dropped capabilities/no-new-privileges, at most 192 MiB RAM/0.25 CPU/32 PIDs.
Mount only `mobile/tests`, `mobile/src/lib` and `shared` read-only at matching
paths in a disposable work directory; expose no ports or database credentials,
mount no normal volumes/private envs, and override entrypoint to Node. Run only:

```text
node --experimental-strip-types --test --test-name-pattern="native media URL and file validation fail closed" mobile/tests/v-ads.test.ts
```

That test checks media URL/100 MiB input boundaries without API or database access.
It is existing baseline coverage, so do not rerun unless explicitly requested or
affected behavior changes. A future backend/media rehearsal requires separately
scoped disposable infrastructure; existing running DB must never be its target.
Neither test is deployment or proof of physical Expo/full release readiness.

### Registry metadata, source protection and budget review — 19 October 2026

**BLOCKED; 100 MiB limit unchanged; no 5 MB compression implemented.** No image
pull/build, prune, migration, worker/API stop, deployment, Git commit or push.

**Verified prospective base (metadata only):**

```text
docker.io/library/python:3.12-slim@sha256:a6e34c598f2467ed0e9a8d349809fcd8b5c603269512df273a0bb1784edc11b1
linux/amd64 manifest: sha256:2b4f19dae3a777dfc3b76730bda1e82e1f66ab2a2686fa93ca78edbfb4f04ffe
```

At `2026-10-19T17:59:33.9683593Z`, obtained a public repository-scoped token
from `https://auth.docker.io/token?service=registry.docker.io&scope=repository:library/python:pull`,
then GET metadata from
`https://registry-1.docker.io/v2/library/python/manifests/3.12-slim` and its
linux/amd64 digest endpoint. Raw-response SHA-256 matched each
`Docker-Content-Digest` header; platform digest also matched the OCI index entry.
No token retained in docs and **no layer downloaded**. Listed compressed layers
total **43,259,288 bytes**; this is not unpacked/build-cache size. This immutable
reference satisfies the Dockerfile's Python 3.12 slim family requirement, but is
not a vulnerability/compatibility pass or an already-used candidate base. The
candidate remains unbuilt and `ARG PYTHON_BASE_IMAGE` remains without a default.
This resolves prior missing-registry-reference evidence, not artifact readiness.

**Capacity and budget:** reuse Stage C measured available host RAM 1.918 GiB,
WSL available 6.134 GiB, six containers ~0.408 GiB, Docker 8 CPUs/7.607 GiB
configured and verified C:-backed VHDX. Latest read-only free space:
**C: 8,182,165,504 bytes (~7.620 GiB); E: 53,217,017,856 bytes (~49.562 GiB)**.
No available memory was reserved, cache reclaimed or virtual capacity converted
to host space. Exact build peak/minimum remains unknown.

Proposed **initial isolated rehearsal budget for approval, not a measured
requirement or capacity guarantee**: 2 GiB build RAM / 1 CPU / 256 PIDs and 4 GiB
additional temporary image/cache growth, retaining 2 GiB host available RAM and
5 GiB C: free throughout. This requires at least 4 GiB host available RAM and
9 GiB backing-disk free before starting, plus a reviewed enforceable builder
limit/abort mechanism. Current observations do not meet those proposed gates.
Earlier 384 MiB/1 CPU/64 PID runtime probes establish only test-container evidence;
full-size upload/runtime throughput still needs measured sizing. Do not assume
that an unconstrained `docker build` obeys these budgets or change/prune running
Docker to create room. A smaller budget needs separate measured justification.

**Updated actual-file scenarios:** two additional optimized assets are now
accessible in `frontend/public/videos/v-ads/optimized/`:
`Vistrah Business.mp4` **2,715,088 bytes** and `Vistrah Users.mp4` **2,816,796
bytes** (total **5,531,884 bytes**, mean **2,765,942 bytes**). Originals remain
31,946,162 and 46,903,151 bytes. Prior read-only running-web evidence found the
originals, not these optimized files. Optimized assets demonstrate existing small
files, not a compressor in seller upload code or a new server limit. No asset or
player changed. Both originals and optimized files are untracked locally.

| Illustrative 200 distinct retained videos | Retained GiB | Primary + current 600 MiB allowance + 1 GiB reserve |
|---|---|---|
| Optimized two-file mean, not a demand forecast | 0.515197 | 2.101134 GiB |
| Original two-file mean, not a demand forecast | 7.343415 | 8.929352 GiB |
| Enforced 100 MiB upper bound | 19.531250 | 21.117188 GiB |

These exclude orphan/retention, filesystem, DB/state, thumbnail-if-introduced and
backup overhead as detailed below. Static examples packaged in web images consume
image/cache space, not automatically the private-media quota. Do not add them
again as uploaded objects unless actually copied there. No per-video generated
thumbnail pipeline was found; no invented thumbnail allowance is a measured cost.
Twenty references per advertiser and ten advertisers remain cap/scenario, not
approved demand or a lifetime retention bound.

At the upper bound, one full media backup plus one restored media clone need
**39.0625 GiB** on destinations in addition to primary; ~49.562 GiB E: free leaves
~10.499 GiB before DB/state/archive/orphans, clone scratch/reserves and growth.
Raw space is not approved backup/restore capacity. No destination ACL/encryption,
retention generations, RPO/RTO, independent/off-host protection or restore budget
verified. Workspace owner is `MANORANJAN\\manor`, inherits ACLs; ownership alone
does not establish protected backup access. C: cannot support the worst-case
primary growth from current free space. Keep backup/restore/provisioning gated.

**Source protection audit (scoped metadata, no resets/staging):** live read-only
`git ls-remote` confirms GitHub feature branch and local HEAD/upstream all equal
`2c1d80fa06ebacc34a20881bf160c840787f2d83`. A 77-path V Ads core/integration,
tests/assets/runtime/docs inventory has **66 untracked + 11 tracked modified**
files. None of those working-tree changes is included in that branch HEAD.
Untracked groups: `backend/app/v_ads*.py`, tests, migrations 019/020, shared
contracts, web/native/admin V Ads screens/proxies, frontend test/browser scripts,
runtime templates, these two release documents and four MP4 assets. Modified
integration files: `backend/app/main.py`, `backend/migrations/env.py`,
`admin/components/admin-navigation.tsx`, `frontend/components/{seller,shell}.tsx`,
`mobile/src/app/(tabs)/v-ads.tsx`, `mobile/src/app/_layout.tsx`,
`mobile/src/app/seller/index.tsx`, `mobile/src/lib/api.ts`,
`mobile/.env.production.example`, and `docs/current-task.md`.

This is **not proof of complete independent protection**: underlying pending
014–018/dependency work and other user edits also need preservation, and no
verified source snapshot was supplied. Test evidence in ignored `artifacts/` is
not GitHub-backed; local private envs/caches correctly remain ignored. Do not
bulk-add secrets, artifacts, generated `.next-*` output or unrelated edits. Preserve
all working files; source completeness includes required dependency/integration
changes, not only filenames containing V Ads.

**One smallest safe next approval:** authorize a verified **source-only local
recovery snapshot**, before image work, at
`E:\Vistrah 2.0\backups\v-ads-source-20261019.zip` (exclusive creation; stop if
already present). Include working source/tests/public examples/config templates/
docs and required pending dependency changes over recorded HEAD, with path/hash
manifest and read-back verification; exclude secrets, private envs, databases,
generated caches and dependency trees. This is local accidental-loss protection,
not an off-host backup or GitHub push. Do not execute until approved; confirm
source selection/size and restricted archive access first. Git publication,
base download, budgeted build and operational approvals remain separate.

### Video-size/compression evidence review — 19 October 2026

**No implemented less-than-5-MB limit found in the current V Ads upload path.**
Do not replace the Stage C worst-case calculation with a presumed compressed
size. Read-only source/tests/asset metadata review; no feature changes or tests
rerun. Relevant evidence:

| Location | Existing behavior |
|---|---|
| `mobile/src/lib/v-ads-upload.ts:9` | Document picker copies MP4 to cache; validates selected size, then uploads the same file-backed bytes. No compression/transcoding call. Finally deletes its cache copy (or revokes browser blob URL). Source user's original is not intentionally removed. |
| `shared/v-ads.ts:13` | `maxVideoBytes=100*1024*1024`; accepts 1 through **104,857,600 bytes inclusive**. This is 100 MiB, although UI says 100 MB. Shared web/mobile input limit. |
| `frontend/components/v-ads-seller.tsx:29` | Same validator, raw selected File upload; no web compression stage. |
| `backend/app/v_ads_media_routes.py:70` / `:94` | Declared Content-Length and actual received stream both bounded by MAX_VIDEO_BYTES; mismatches rejected. Two concurrent uploads/process, twenty VALIDATED references/advertiser at `:116`. |
| `backend/app/v_ads_video_validation.py:12` | Same 100 MiB file limit, H.264/AAC MP4 and up to 60 seconds; FFprobe inspects, does not transcode. `-probesize 5000000` bounds probe bytes; `-analyzeduration 5000000` is analysis time in microseconds, not a 5 MB output target. |
| `backend/app/v_ads_video_service.py:26`, `v_ads_video_staging.py:50`, `v_ads_video_storage.py:58` / `:136` | Size checked before inspection, during staging/storage; bytes copied unchanged into SHA-256-addressed immutable objects with deduplication. Stored size checked against inspected size. No compressed output variant. |
| `backend/app/v_ads_media_cleanup.py:13` | Offline-only dry-run default, grace at least 86,400 seconds; preserves every VALIDATED reference including unsubmitted media. Only stale unreferenced objects/staging can be deleted after approved maintenance. No automatic retained-video TTL. |
| `mobile/tests/v-ads.test.ts:14`, `backend/tests/test_v_ads_video_validation.py:34`, `backend/tests/test_v_ads_media_lifecycle.py:149` | Existing tests reject 104,857,601 bytes; lifecycle tests also cover size mismatch, retention quota, staging cleanup and shared-object retention. Storage tests cover dedup/integrity. No 5 MB compression/output assertion found in these tests. Existing historical pass evidence reused, not newly executed. |

Thus **5 MB is neither an enforced input limit nor an enforced compressed-output
limit** in this implementation. The server's unchanged stored object is bounded
by 100 MiB; there is no separately produced compressed output. No V Ads thumbnail
generation/store or thumbnail field exists in the inspected client/API contract;
generated per-video thumbnail overhead is **zero for this current path**, not a
promise that future thumbnails or filesystem metadata cost zero. UI/playback
optimizations and file-size compression must not be conflated.

Actual accessible video metadata (no media content modified):

- `frontend/public/videos/v-ads/Vistrah Business.mp4`: **31,946,162 bytes**.
- `frontend/public/videos/v-ads/Vistrah Users.mp4`: **46,903,151 bytes**.
- Same byte sizes in existing web container at
  `/app/frontend/public/videos/v-ads/`; total **78,849,313 bytes**. Both exceed
  either decimal 5 MB or binary 5 MiB. These are existing static examples, not
  customer-upload measurements or a representative average. The older
  `mobile/src/app/(tabs)/v-ads.tsx.before-optimized.bak` references those same
  two static paths; its name does not establish compression.
- Read-only `find /data -maxdepth 4 -type f -name '*.mp4'` on current API found
  none. Stage B already established DB revision 013 / no dedicated private media
  mount; do not claim production/cloud media is absent. Synthetic test artifact
  MP4s are not customer media and were excluded from demand sizing.

Recalculation uses the **illustration**, not an agreed business volume, of
10 advertisers × 20 distinct retained videos = 200 objects. Twenty is a current
validated-reference cap; ten advertisers is an assumption. Content dedup may
reduce usage but is not credited in worst-case sizing.

| Scenario | Retained objects | Current conservative primary budget | One full retained-object backup, separate destination |
|---|---|---|---|
| Implemented 100 MiB maximum | 19.531250 GiB | **21.1171875 GiB** = retained + 600 MiB concurrent-copy allowance + 1 GiB reserve | +19.531250 GiB; **40.6484375 GiB aggregate** before allowances |
| Hypothetical strictly <5,000,000 bytes/video, NOT implemented | <0.931323 GiB | <2.517261 GiB, retaining current 600 MiB minimum/reserve policy | <0.931323 GiB additional; not a release estimate |
| Hypothetical 5 MiB/video, NOT implemented | 0.9765625 GiB | 2.5625 GiB with current minimum/reserve | +0.9765625 GiB; MB and MiB differ |

Add to these rows: retained rejected/orphan bytes awaiting offline cleanup,
filesystem/directory overhead, actual generated thumbnails if introduced, DB/API
state and backup archive/metadata overhead. For K full backup generations add
`K × (retained media + included retained orphans/thumbnails)` plus each DB/state
backup and archive overhead; compression savings are not assumed for MP4. A
restored clone needs another retained-media copy plus restored DB/state and its
own rehearsal scratch/reserve. Backups/clone capacity cannot be charged solely
against the primary upload reserve. The 600 MiB allowance is conservative for
two three-copy pipelines, including their eventual objects; hard-link publication
does not create an extra full physical copy. Phone cache is separate from server
storage and can need one input-sized copy per selection until cleanup.

**Conclusion:** Stage C's **21.117 GiB remains the correct conservative subtotal
under the implemented limit**, not a total including retention, backup and
restore. A smaller estimate requires evidence of another existing pipeline or a
separately approved policy/implementation change; none made here. Remaining
decisions: decimal/binary and strict/inclusive intended 5 MB policy, actual video
volumes, orphan retention/maintenance cadence, thumbnail policy, K/RPO/RTO,
independent protected backup/clone capacity and enforceable quota. Base digest,
build budget, device and migration/activation gates remain unchanged.

### Stage C preparation-only correction and capacity snapshot — 19 October 2026

**BLOCKED for candidate build/release; PC-to-Expo health connectivity verified.**
No image download/build/scan, cache cleanup, worker stop, migration, provisioning
or deployment. Stage C supersedes the Stage B inference from `/health` alone.

- Existing `EXPO_PUBLIC_API_URL=http://10.134.38.224:18101`:
  **`/api/health` HTTP 200**, `/health` HTTP 404. Direct API
  `http://127.0.0.1:8100/health` remains HTTP 200. The 404 is a path distinction,
  not a LAN connectivity failure. No URL/proxy setting changed. This is a PC
  request to the configured LAN endpoint, not proof from the phone. Verify phone
  access using `/api/health`, allowed-client IP, installed bundle values, and
  actual API/media path contracts before device sign-off; do not append/remove
  `/api` in existing configuration solely on this health result.
- **Exact reviewed candidate base digest: not defined.** Candidate Dockerfile
  uses `ARG PYTHON_BASE_IMAGE` / `FROM ${PYTHON_BASE_IMAGE}` without a default.
  Existing ordinary backend uses the mutable tag `python:3.12.10-slim`, not a
  reviewed candidate digest. Filtered local inventory contains neither a
  `vistrah-vads-candidate:*` image nor a `python:*` image. No candidate has been
  built, so there is no digest it has used. A running/dev image ID, registry
  tag or newly guessed digest must not be represented as that reviewed value.

Resource figures below are one read-only sample, not reserved capacity:

| Resource | Measured figure | Meaning |
|---|---|---|
| Host RAM | 16,858,701,824 bytes total; **2,059,689,984 bytes available (1.918 GiB)** | Incremental physical-memory pressure is constrained by Windows and existing workloads. |
| Docker / WSL RAM | Docker configured 8,168,017,920 bytes / 8 CPUs; WSL available **6,432,208 KiB (6.134 GiB)**; swap 2 GiB, unused | WSL reclaimable/available RAM is not an independent host allocation; do not add it to Windows free RAM or count swap as safe build memory. |
| Running containers | Six containers total sampled **438,210,396 bytes (~0.408 GiB)** | Includes all running containers; excludes build peak, host processes and other WSL/engine overhead. |
| Actual backing file | `C:\Users\manor\AppData\Local\Docker\wsl\disk\docker_data.vhdx`, file length **35,244,736,512 bytes** | Verified backing location on C:; file length is not a guarantee of allocated extents or future growth allowance. |
| Host disk free | **C: 8,290,390,016 bytes (7.721 GiB)**; E: 53,217,296,384 bytes (49.562 GiB) | Docker VHDX growth competes for C: space. E: free space cannot automatically extend Docker capacity. |
| Linux disk | **971,306,148 KiB (~926.310 GiB)** available on `/mnt/docker-desktop-disk` | Thin virtual filesystem ceiling, not 926 GiB of host-backed free space. Conservative growth ceiling is at most C: free minus operator reserve and other growth. |
| Existing Docker usage | Images 5.051 GB, containers 92 MB, volumes 596 MB, build cache **25.63 GB** | Docker-reported units; do not sum as unique physical allocation because layers/cache may overlap. 21.4 GB cache is reported reclaimable, not reclaimed; no prune/compaction authorized. |

**Build assessment:** verified safe additional build allocation is **not
established**. Raw current ceilings are 1.918 GiB host available RAM and 7.721 GiB
C: growth space before reserves; neither is a safe budget. No measured apt/pip/
FFmpeg build peak, bounded builder configuration, image/cache growth or agreed
host reserve exists. A conservative illustrative 2 GiB host free-memory reserve
would leave `max(0, 1.918 − 2) = 0 GiB` additional budget; this is a scenario,
not a new approved policy. Existing services can remain running unchanged, but
support for the additional candidate build/runtime without impact is unproven.
Do not prune caches, resize/move the VHDX, add swap or reduce service resources.

**Media/retention/backup:** retain the Stage A worksheet and Stage B measured
state sizes. For 10 advertisers × 20 distinct 100 MiB objects, retained objects
alone are 19.531 GiB; adding 600 MiB transient and 1 GiB reserve gives **21.117
GiB before orphan/filesystem allowance and backups**. This already exceeds
current C: free growth space; 926 GiB virtual free is not a quota. Twenty validated
references are not a lifetime retained-object cap. Operator decisions remain:
advertiser/retained-object demand, growth horizon, rejected/orphan retention and
offline cleanup window, enforceable media quota and alerts, plus encrypted,
access-controlled backup location/retention/RPO/RTO and space for an isolated
restore. A backup inside the same Docker VHDX is not independent recovery storage.
No retention deletion, quota allocation or backup operation was performed.

**Smallest next step/approval:** supply and review an immutable Python 3.12 slim
digest plus explicit build memory/disk reserve and cache-growth budget first.
Only then seek approval for **download of that exact base digest**, with no
build, prune, storage change or activation. Stage C does not authorize that
download; an unknown digest/budget cannot receive meaningful concrete approval.
Keep backup/restore writer-free maintenance, local `013 → 020` migration range,
private storage and separate API/web/admin activation approvals independent.

### Stage B read-only deployment preflight — 19 October 2026

**BLOCKED. No build, candidate scan, provisioning, stop, migration or deployment.**
This snapshot covers the existing local `vistrah20` project only, not AWS or
production. Stage B supersedes the earlier unknown local revision/worker state;
Stage A capacity/tooling observations and Phase 4 tests are reused, not rerun.

| Check | Read-only finding / exact remaining blocker |
|---|---|
| Reviewed base | No reviewed `python:3.12-slim@sha256:…` value is supplied in candidate configuration; Stage A found no cached Python base. Digest identity/provenance cannot be verified without a concrete reference. Do not substitute the running API/dev image or invent a digest. |
| Build headroom | One local-project sample: API 81.67 MiB, web 132 MiB, admin 42.35 MiB, worker 61.78 MiB, DB 57.37 MiB; each has no explicit container memory limit. This excludes other workloads and build peaks. Reuse Stage A host available RAM ~2.50 GiB and C: free ~7.79 GiB; configured Docker RAM ~7.61 GiB is not free capacity. No approved build memory/cache budget or verified host backing-disk location/quota; safe build headroom remains unproven. |
| Persistent capacity | Existing API is UID/GID 1000, mounts `vistrah20_api_data:/data`; state uses 8 KiB. DB mounts `vistrah20_postgres_data:/var/lib/postgresql/data`, directory uses 102,580 KiB (~100.18 MiB), database size 14,283,235 bytes (~13.62 MiB). Linux reports ~926.31 GiB available on the shared virtual filesystem; thin virtual capacity is not host-backed capacity, a media quota or backup reserve. No dedicated private media mount is present on API. |
| Projected media | Reuse Stage A worksheet: 10 advertisers × 20 distinct 100 MiB objects = 19.53 GiB retained; add 600 MiB transient + 1 GiB reserve + measured orphan/filesystem allowance, plus separate protected backup space. Actual advertiser demand, retained lifetime objects, growth, retention, hard quota/alerts and backing capacity remain unspecified. The current DB has not applied V Ads migrations; do not infer a release forecast from current storage usage. |
| Migration range | A successful `BEGIN TRANSACTION READ ONLY` query returned single revision **013**. Pending **014–020 inclusive**: commerce listings, commerce orders, commerce taxonomy, business membership, provider catalogue requests, V Ads, video/media link. This is seven migrations, not a V Ads-only upgrade. Prior fresh-disposable migration success is baseline, not a restored-copy rehearsal of this database. No migration executed. |
| Writers / startup | API runs `python -m uvicorn app.main:app --host 0.0.0.0 --port 8000`, with no startup migration/seed. Worker is **running** with `python -m app.workflow_worker`; source commits heartbeat each tick and workflow claim/outcomes. Both share `/data`. API, worker and any external jobs/admin/client writers must be fenced for a cross-database/media snapshot; one connection sample cannot prove absence of writers. Do not restart either service. |
| Protected backup / restore | No approved destination, ACL/encryption evidence, retention/RPO/RTO or independent backing capacity. DB-directory size is not a dump-size guarantee; budget DB/WAL growth, API state/secrets, future media, dump plus restored clone and temporary copies. Pin PostgreSQL 16.6 compatibility; restore only to a new isolated database/network/volumes, no host exposure by default, no live credentials/notifications/acquisition/worker, with controlled access and agreed destruction/retention. No backup or restore performed. |
| Android connectivity | API binding is `127.0.0.1:8100`, direct PC `/health` HTTP 200. Existing mobile public configuration uses `http://10.134.38.224:18101`; that address is listening, but PC `/health` returned **404**, so it is not a verified API transport. Expo listens on 8082. Native device reachability/allowed-client IP, routing/firewall and actual proxy target still need diagnosis; no settings changed. |

Android prerequisites before device QA: phone and PC must have an approved route;
the LAN helper must admit the phone's current private IP without widening access.
Source helper defaults to loopback 18100 → API 8100; a listener at 18101 alone
does not prove it runs that helper or forwards correctly. Diagnose only read-only
until a concrete proxy/config fix is separately authorized. Verify `/health` from
the phone, then authenticated API and video-range access against an isolated
V Ads-enabled test endpoint. Native HTTP works only in development and remains
subject to the installed Android runtime's cleartext policy; release needs valid
HTTPS. Existing `EXPO_PUBLIC_WEB_URL=http://10.0.2.2:3100` is emulator-only, so a
physical phone needs an approved reachable share origin. Native cookie-mode must
remain unset; public values are bundled, and the installed build's actual values
must be verified. EAS `aws-test` pins public API/admin origins but supplies no web
origin itself; neither that profile nor templates prove an installed APK's values.
No phone, firewall, Expo restart, bundle or external HTTPS endpoint was exercised.

**Smallest next authorization:** first supply a reviewed immutable Python 3.12
slim digest and approved cache location/free-space and memory budget. Then request
approval **only to download that exact base digest** into that budget (no build,
scan, publication or service change). A placeholder digest is not an actionable
approval. Existing Stage A conditional preparation does not override Stage B's
no-build scope. Backup/migration/activation approvals below remain separate:

- Backup/clone: name protected destination, ACL/encryption, retention/RPO/RTO,
  clone resource ceiling, and explicit maintenance window to fence API, worker
  and all other writers; approve snapshot and isolated restore only, not migration.
- Migration: after clone evidence, approve precisely local `013 → 020` (all seven
  migrations) for the named target. A production target needs its own inventory.
- Activation: approve distinct API/web/admin immutable artifacts, private-volume
  provisioning/quota, resource limits and media flag only after artifact/device/
  restore gates pass. No AWS/native publication authority is implied.

### Stage A local verification — 19 October 2026

**BLOCKED; no candidate built or scanned.** Stage A authorizes a separate local
candidate build only when configuration and resources are verified; it does not
authorize activation. Reviewed Dockerfile uses a required digest-pinned Python
3.12 slim base, locked Python packages, apt-installed FFmpeg/FFprobe, UID 1000,
direct single-worker startup and media disabled. No reviewed base digest is
supplied; read-only local image inventory contains no Python base image. Existing
application/dev images are not substitutes for that reviewed base. Apt packages
are resolved at build time, so record their exact versions in candidate evidence.

Read-only host observations: C: free 8,359,026,688 bytes (7.79 GiB), E: free
53,218,033,664 bytes (49.56 GiB); host available RAM 2,618,040 KiB (2.50 GiB).
Docker reports 8,168,017,920 bytes configured RAM and 8 CPUs, not available build
headroom. Docker backing-store location/quota/free space, peak build memory and
impact on existing workloads remain unverified. Windows drive space does not
establish Linux-volume or production capacity. No build budget was assumed, no
cache/images pruned, and no storage provisioned/resized.

Docker Scout v1.24.0 is installed; Trivy, Grype and pip-audit were not found on
PATH. Existing CI audits npm packages; publishing targets the ordinary backend
Dockerfile, not this candidate Dockerfile, and has no image/Python CVE scan.
Do not invoke publishing for Stage A. Scout help supports `local://` resolution;
this prevents registry image fallback, **not** vulnerability-service network use.
Scanner authentication/network/service availability is not verified. No scanner
was installed and no cached development image was scanned as candidate evidence.

After a reviewed base digest and an isolated resource budget are available,
Stage A permits the separate local build documented below; obtaining an absent base and
package downloads must fit the approved network/source policy. Then run only
these essential checks against the recorded immutable candidate ID (not executed):

```powershell
if (-not $candidate -or $candidate -notmatch '^sha256:[0-9a-f]{64}$') { throw 'Verified candidate image ID required' }
docker run --rm --network none --read-only --memory 384m --cpus 1 --pids-limit 64 --cap-drop ALL --security-opt no-new-privileges --tmpfs /tmp:rw,noexec,nosuid,size=134217728 --entrypoint sh $candidate -c 'python -m pip check && ffmpeg -version && ffprobe -version && python -m app.v_ads_readiness'
if ($LASTEXITCODE -ne 0) { throw 'Candidate dependency/preflight check failed' }
docker scout cves "local://$candidate" --only-severity critical,high --exit-code
if ($LASTEXITCODE -ne 0) { throw 'Scan findings or scanner failure: release remains blocked; preserve output' }
```

The probe budget above matches earlier disposable-test limits, not measured
production sizing. Do not install another scanner if Scout access is unavailable;
record the blocker. Resolve findings or obtain an explicit documented risk
disposition. A clean scan is not a substitute for enabled-media artifact rehearsal.

Storage sizing worksheet: plan retained unique media bytes plus staging peaks,
orphan/rejected retention, filesystem overhead and operational reserve. At the
100 MiB ceiling, 20 validated references represent up to 1.953 GiB per advertiser;
this is not a total lifetime cap on submitted/retained objects. Two concurrent
three-copy uploads need up to 600 MiB transient headroom. A conservative initial
budget is retained bytes + 600 MiB transient + 1 GiB reserve + measured orphan/
filesystem allowance, with protected backup capacity separately budgeted. For
example, 10 advertisers each retaining 20 distinct maximum-size objects already
need 19.53 GiB before these additions. This is a scenario, not a usage forecast or
provisioning recommendation. Advertiser count, actual sizes/retention/growth,
backup retention and target backing-volume capacity are unknown: capacity gate
remains blocked. Do not infer a quota from host E: free space or the 1 GiB upload
admission setting.

Remaining approvals: select target and storage/resource budget; approve a
protected backup destination/retention and isolated restore resources plus an
explicit API/worker/all-writer maintenance window; inventory actual revision and
approve the full pending migration range only after clone rehearsal; separately
approve API, website and admin replacements and media enablement. Device/admin
QA and exact-candidate persistence/smoke/rollback evidence must precede activation.

1. **Artifact preparation:** approve a new candidate-image build/download/scan
   and isolated candidate rehearsal, with reviewed source provenance. This is
   separate from deploying it. No registry publication or Git action is implied.
2. **Target and sizing:** name the target Compose project/environment and approve
   API limits, media backing filesystem/quota, free-space reserve, monitoring,
   backup location/retention and any provisioning. No new paid service is selected.
3. **Maintenance and backup:** explicitly approve quiescing the API, worker and
   every other database/media writer, the maintenance window, protected backups
   and isolated restore validation. Existing worker heartbeat writes mean an
   API stop alone does not prove a write-free window.
4. **Database:** approve the complete pending migration range after actual
   revision inventory and clone rehearsal. If below `018`, do not describe
   upgrading to `020` as applying only two V Ads migrations.
5. **Activation:** separately approve API, website and separate-admin image
   replacements and media activation. Native/phone-web publication, AWS, DNS,
   TLS and production environment changes require their own approvals.

Stop at any failed gate. Never use the ordinary backend image command that runs
`alembic upgrade head && python -m app.seed`. Never execute a rollback restore,
schema downgrade, volume deletion, `compose down -v` or automatic seed.

## Runtime and storage preparation

Prepared sources, not deployed configuration:

- `backend/Dockerfile.v-ads-runtime`: reviewed digest-pinned Python base supplied
  at build time; locked Python dependencies and FFmpeg/FFprobe; UID/GID 1000;
  media disabled by default; read-only preflight entrypoint; one Uvicorn worker;
  no migrations or seeding. Build, vulnerability scan and candidate compatibility
  remain unverified. The image does not include backend tests/local DB files.
- `compose.v-ads-runtime.example.yaml`: API image override and explicit resource
  requirements; read-only root, dropped capabilities, no-new-privileges and
  128 MiB temporary filesystem. Existing non-media `/data` state is preserved.
  A **separate external media volume** mounts at `/data/v-ads`, only on API.
  The existing worker also mounts `api_data:/data`, so the former suggestion to
  place private media directly in that shared volume is superseded for release.
- `v-ads.runtime.env.example`: public additive template; sizing/image/volume
  values intentionally blank and activation `0`. Do not overwrite an existing
  private environment file. Do not run the API-only image as the worker: its
  entrypoint permits Uvicorn only; worker rollout is outside this change.
- `compose.v-ads-clients.example.yaml`: optional explicit website/admin image
  overrides; existing cookie/origin boundaries retained. No host ports change.

Linux media root must already exist, be owned by the API UID and have mode 0700;
all ancestors must be non-symlinks. New runtime umask is 0077 and objects are
0600. HTTP access fails closed on unsafe/unreadable roots. Windows development
does not certify NTFS ACLs or release filesystem semantics.

Uploads are at most 100 MiB, two in flight per API process and twenty validated
references per advertiser. Staging/validation/immutable copying can consume
three copies per upload. Upload admission now requires 1 GiB free by default;
`V_ADS_MIN_FREE_BYTES` cannot be below 600 MiB. This is a **reserve, not a hard
quota or total retained-media cap**: revoked/orphan objects await offline cleanup.
Approve backing-storage quota and alerts; do not infer usable capacity from an
empty named volume. More workers/replicas need a new aggregate capacity review.
Full-object hashing on each range request also needs measured throughput.

Directory fsync now precedes database-reference commit, including retry/dedup
after a failed sync. These probes establish ordinary Linux local-volume behavior,
not power-loss durability for an untested network filesystem/driver. Use durable
storage with tested hard-link and fsync semantics; containers' writable layers
and `/tmp` are not persistent object storage.

### Candidate commands — only after artifact-preparation approval

PowerShell, repository root. Supply approved values privately; placeholders are
deliberately non-executable until replaced. No normal container is rebuilt.

```powershell
$releaseId = 'REPLACE_WITH_REVIEWED_UNIQUE_RELEASE_ID'
$pythonBase = 'docker.io/library/python:3.12-slim@sha256:a6e34c598f2467ed0e9a8d349809fcd8b5c603269512df273a0bb1784edc11b1'
if ($releaseId.StartsWith('REPLACE_') -or $pythonBase.StartsWith('REPLACE_')) { throw 'Approval values required' }
docker image inspect $pythonBase --format '{{.Id}}'
if ($LASTEXITCODE -ne 0) { throw 'Base image absent; request download approval' }
docker build --pull=false --build-arg "PYTHON_BASE_IMAGE=$pythonBase" -f backend/Dockerfile.v-ads-runtime -t "vistrah-vads-candidate:$releaseId" .
if ($LASTEXITCODE -ne 0) { throw 'Candidate build failed' }
$candidate = docker image inspect "vistrah-vads-candidate:$releaseId" --format '{{.Id}}'
docker run --rm --network none --read-only --tmpfs /tmp:rw,noexec,nosuid,size=134217728 --entrypoint python $candidate -m app.v_ads_readiness
```

Do not activate after this disabled-default check alone. Require an approved
vulnerability scan and isolated rehearsal of this exact image, including full
100 MiB uploads, memory/CPU/PID behavior, disk-reserve failure, private 0700
volume, playback ranges, auth/moderation and restart persistence. Preserve the
image ID/digest and scan/QA evidence. No scanner or registry account is assumed.

Website/admin artifacts may be built separately after the same approval using
`docker build --pull=false -f frontend/Dockerfile -t "vistrah-vads-web:$releaseId" .`
and the equivalent `admin/Dockerfile`/`vistrah-vads-admin` tag. Preserve their
immutable IDs and the existing approved public build settings/MapTiler keys.
Existing release CI/publishing rules remain in [RELEASES.md](RELEASES.md);
uncommitted feature work is not an approved published release artifact.

## Configuration and device QA

| Target | Required configuration / check |
|---|---|
| Local website/admin | Existing same-origin `/api` proxies; server `API_URL` points at the intended API. Dedicated `vistrah_session` vs `vistrah_admin_session`; exact mutation origins. No admin UI on public website. |
| Local Expo | Native API must be reachable from the device; `localhost` is the phone itself. Existing LAN addresses/proxies are temporary, not release configuration. `EXPO_PUBLIC_WEB_URL` must be reachable for sharing. |
| Disposable test | Separate project, database, volume and ports under existing environment boundaries. Use only synthetic identities; never seed/migrate the normal database for QA. |
| Production preparation | Approved HTTPS API and website origins, separate admin origin/cookie and secure cookies; existing restricted MapTiler keys. Keep native cookie-mode variable unset. No real env was edited. |
| Hosted Expo phone website | Use the established cookie-mode build/proxy and `/app` routing from `docs/MOBILE.md`; verify links against the actual selected hosting layout before publication. No assumption that desktop and phone images are interchangeable. |

`mobile/.env.production.example` now includes the already documented website
origin as `EXPO_PUBLIC_WEB_URL`; the missing value would otherwise disable
native V Ads sharing. Examples do not prove that those endpoints are deployed.
Never put private credentials in `EXPO_PUBLIC_*` values. Preserve manual location
and explicit GPS behavior; V Ads needs no location or provider/billing changes.

Compact physical Android/iOS checklist, on an approved isolated candidate:

Android Expo sign-off (record device/Android/Expo version, artifact ID, API origin
and pass/fail; physical-device execution is still pending):

1. Open V Ads via the unchanged five tabs; play three approved reels, swipe fast
   both directions, verify only the visible reel autoplays and pause/resume works.
2. Toggle audio; open/close comments, background/foreground and navigate away/
   back; verify expected audio/player pause and resume without overlapping sound.
3. Like/unlike and post a comment as a synthetic signed-in customer; reopen to
   verify server persistence. Check guest, expired-session, offline and retry states.
4. Open advertiser profile and its approved videos; share an approved reel and
   open the link on the intended website/device without credentials in the URL.
5. As a synthetic seller, choose/upload a valid MP4 and submit; verify pending
   status/review reasons. Try invalid/oversized media, interruption and saved-upload
   recovery; confirm another seller's private upload cannot be accessed.

Additional release checks:

- Confirm Discover, Services, V Ads, Requests, Account and existing service gates;
  homepage Ads & Marketing remains a separate destination.
- Swipe quickly between at least three approved reels: one active player;
  autoplay, pause/resume, sound toggle, comments pause, navigation/background
  pause and return behavior; offline/slow-network recovery and loading/empty states.
- Guest cannot mutate; customer likes survive reload, comments persist; profile
  video links and native share link open the intended approved reel on the website.
- Seller A cannot access B's media/performance; pick valid/invalid/oversized MP4,
  interrupt upload/submission, recover saved upload, check review reasons and
  account-edit re-review/withdrawal; picker cache does not accumulate files.
- Independent admin previews with ranges, reviews with reason/acknowledgement,
  rejects without storage, suspends/removes; own approval and stale decisions fail.
- Only progressing signed-in playback counts; owner/admin/guest excluded from
  new events, same account/video/day deduplicated; visible comments/likes match.
- Check expiry/sign-out and separate admin login; no token in URL/share/logs.
  No real customer account mutation or normal database test record.

Phase 2 browser results and Phase 3 focused type checks are historical baselines,
not completed physical QA. The three unrelated mobile type errors remain
unchanged and need a separate approved fix/disposition before a release build.

## Approved deployment sequence — DO NOT EXECUTE during preparation

Run only after all gates above. PowerShell examples reuse these operator-selected
values; never paste private env contents or database URLs into a report.

```powershell
$project = 'REPLACE_WITH_APPROVED_TARGET_PROJECT'
$targetEnv = 'REPLACE_WITH_EXISTING_PRIVATE_ENV_FILE'
$backupRoot = 'REPLACE_WITH_NEW_PROTECTED_BACKUP_DIRECTORY'
if ($project.StartsWith('REPLACE_') -or $targetEnv.StartsWith('REPLACE_') -or $backupRoot.StartsWith('REPLACE_')) { throw 'Target and backup approval required' }
if (-not (Test-Path -LiteralPath $targetEnv)) { throw 'Private target environment missing' }
$dc = @('--project-name',$project,'--env-file',$targetEnv,'-f','compose.yaml','-f','compose.api-runtime.yaml','-f','compose.v-ads-runtime.example.yaml')
# Fill these from the reviewed release record; these are NOT recommended sizes.
$env:V_ADS_API_IMAGE = $candidate
$env:V_ADS_PRIVATE_VOLUME = 'REPLACE_WITH_APPROVED_PRIVATE_VOLUME_NAME'
$env:V_ADS_API_MEMORY_LIMIT = 'REPLACE_WITH_APPROVED_MEMORY_LIMIT'
$env:V_ADS_API_CPUS = 'REPLACE_WITH_APPROVED_CPU_LIMIT'
$env:V_ADS_API_PIDS_LIMIT = 'REPLACE_WITH_APPROVED_PID_LIMIT'
$env:V_ADS_MIN_FREE_BYTES = '1073741824'
# Also set V_ADS_WEB_IMAGE / V_ADS_ADMIN_IMAGE only for an approved client rollout.
if (($env:V_ADS_PRIVATE_VOLUME,$env:V_ADS_API_MEMORY_LIMIT,$env:V_ADS_API_CPUS,$env:V_ADS_API_PIDS_LIMIT | Where-Object { $_.StartsWith('REPLACE_') }).Count -gt 0) { throw 'Capacity/volume approval values required' }
$env:V_ADS_MEDIA_ENABLED = '0'
docker compose @dc config --quiet
if ($LASTEXITCODE -ne 0) { throw 'Do not continue with an invalid resolved configuration' }
$apiId = docker compose @dc ps -q api
$dbId = docker compose @dc ps -q db
if (-not $apiId -or -not $dbId) { throw 'Target inventory does not match approval' }
$previousApiImage = docker inspect --format '{{.Image}}' $apiId
$previousCommand = docker inspect --format '{{json .Config.Cmd}}' $apiId
$previousEntrypoint = docker inspect --format '{{json .Config.Entrypoint}}' $apiId
$apiMounts = docker inspect --format '{{json .Mounts}}' $apiId | ConvertFrom-Json
```

1. **Inventory privately:** verify project/container labels, actual command and
   entrypoint, image IDs, actual database revision, database/volume identities,
   API UID, existing media location/references and all writers. Preserve previous
   API/web/admin/phone image IDs/configurations without replacing anything.
   Do not print environment arrays. If media already exists, stop before an
   empty external mount shadows it: approve a hash-verified copy/migration plan.
   Do not recursively chmod/chown existing `/data` or normal volumes.
2. **Provision only the approved new media volume:** verify its exact name and
   backing quota before creation; record whether it is genuinely new. Initialize
   only that new volume to API UID/GID 1000 and 0700 in an approved maintenance
   container. Verify preflight as UID 1000 with this volume and media enabled,
   without starting the API. Do not change ownership of an existing volume.
   The external-volume template deliberately refuses to auto-create it.

```powershell
# Execute only if Gate 2 explicitly approves creation of this exact NEW volume.
docker volume inspect $env:V_ADS_PRIVATE_VOLUME
# If it already exists, STOP and inspect; do not initialize it as if empty.
# If absent and creation is approved:
docker volume create --label purpose=vistrah-vads-private $env:V_ADS_PRIVATE_VOLUME
docker run --rm --network none --read-only --user 0 --cap-drop ALL --cap-add CHOWN --mount "type=volume,source=$env:V_ADS_PRIVATE_VOLUME,target=/media" --entrypoint python $candidate -c "import os; os.chmod('/media',0o700); os.chown('/media',1000,1000)"
docker run --rm --network none --read-only --user 1000:1000 --cap-drop ALL --security-opt no-new-privileges --tmpfs /tmp:rw,noexec,nosuid,size=134217728 --mount "type=volume,source=$env:V_ADS_PRIVATE_VOLUME,target=/data/v-ads,readonly" --env V_ADS_MEDIA_ENABLED=1 --env V_ADS_PRIVATE_ROOT=/data/v-ads --env "V_ADS_MIN_FREE_BYTES=$env:V_ADS_MIN_FREE_BYTES" --entrypoint python $candidate -m app.v_ads_readiness --require-enabled
```

3. **Freeze and back up (Gate 3):** drain requests and explicitly stop/fence
   **all** writers, including the worker. Confirm the write-free window by the
   approved operational procedure; this document cannot prove it. Only then
   capture a consistent database, non-media API-state and private-media snapshot.
   Backups contain personal data and possibly runtime secrets: owner-only ACLs,
   encrypted storage, approved retention; never add them to Git or upload them.

```powershell
# Requires explicit permission to stop BOTH existing services and all other writers.
docker compose @dc stop api worker
if ($LASTEXITCODE -ne 0) { throw 'Write-free window not established' }
if (Test-Path -LiteralPath $backupRoot) { throw 'Use a new backup directory; do not overwrite a prior snapshot' }
New-Item -ItemType Directory -Path $backupRoot | Out-Null
# Apply/verify approved owner-only ACL/encryption before writing backups.
# File-based pg_dump avoids Windows PowerShell binary stdout corruption.
docker compose @dc exec -T db sh -c 'test ! -e /tmp/vads-release-pre.dump || exit 42; pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --file=/tmp/vads-release-pre.dump'
if ($LASTEXITCODE -ne 0) { throw 'Database backup failed; do not migrate' }
docker cp "${dbId}:/tmp/vads-release-pre.dump" (Join-Path $backupRoot 'database.pre.dump')
# Set these ONLY from inspected mounts, never from an assumed project-name prefix.
$apiStateVolume = 'REPLACE_WITH_VERIFIED_API_DATA_VOLUME'
if ($apiStateVolume.StartsWith('REPLACE_')) { throw 'Verify /data mount first' }
docker run --rm --network none --read-only --user 0 --mount "type=volume,source=$apiStateVolume,target=/source,readonly" --mount "type=bind,source=$backupRoot,target=/backup" --entrypoint python $candidate -c "import tarfile; archive=tarfile.open('/backup/api-data.pre.tar','x'); archive.add('/source',arcname='api-data'); archive.close()"
docker run --rm --network none --read-only --user 0 --mount "type=volume,source=$env:V_ADS_PRIVATE_VOLUME,target=/source,readonly" --mount "type=bind,source=$backupRoot,target=/backup" --entrypoint python $candidate -c "import tarfile; archive=tarfile.open('/backup/vads-media.pre.tar','x'); archive.add('/source',arcname='vads-media'); archive.close()"
Get-FileHash -Algorithm SHA256 (Join-Path $backupRoot 'database.pre.dump'),(Join-Path $backupRoot 'api-data.pre.tar'),(Join-Path $backupRoot 'vads-media.pre.tar')
```

Do not overwrite the container-side dump from an earlier maintenance attempt;
the operator must first verify that `/tmp/vads-release-pre.dump` is absent, or
choose a unique approved name and change both commands consistently. Do not
delete an old dump implicitly. Verify exit codes and nonempty archive contents,
checksums, storage encryption/ACLs and required PostgreSQL roles/extensions.
**Listing a dump is not a restore drill.** Before migration, restore the snapshot
into an explicitly disposable, access-controlled database and separate volumes;
verify actual media hashes/references and old/candidate application compatibility.

Restore command, only inside that approved disposable PostgreSQL container after
copying the protected dump to it and confirming its initially empty target:

```powershell
$restoreContainer = 'REPLACE_WITH_VERIFIED_DISPOSABLE_RESTORE_CONTAINER'
if ($restoreContainer.StartsWith('REPLACE_')) { throw 'Isolated restore target required' }
docker exec $restoreContainer sh -c 'pg_restore --exit-on-error --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB" /tmp/database.pre.dump'
```

Rehearse the full pending upgrade to `020` and code rollback on that clone.
Never use backend pytest/seed fixtures on the normal database or this protected
snapshot indiscriminately; synthetic fixture insertion is a separate clone-only
operation. A restore requiring overwrite, a different database engine/version,
or a change in ownership/extensions is a new reviewed recovery procedure.

4. **Migrate exactly to `020` (Gate 4):** the API/worker remain fenced. Inspect
   the actual revision first. If it is unknown/unexpected, multiple heads exist,
   or the clone rehearsal failed, stop. A revision already above `020` needs a
   fresh compatibility review. Never automatically downgrade or run `head`.

```powershell
docker image inspect $env:V_ADS_API_IMAGE --format '{{.Id}}'
if ($LASTEXITCODE -ne 0) { throw 'Approved local image missing; do not build/pull implicitly' }
docker compose @dc run --rm --no-deps --pull never --entrypoint python api -m alembic current
# STOP here until the observed complete migration range is explicitly approved.
docker compose @dc run --rm --no-deps --pull never --entrypoint python api -m alembic upgrade 020
if ($LASTEXITCODE -ne 0) { throw 'Migration failed; keep writers fenced; preserve evidence' }
docker compose @dc run --rm --no-deps --pull never --entrypoint python api -m alembic current
```

5. **Activate approved API (Gate 5):** set media `1` only after private volume,
   preflight, backup/restore and schema checks succeed. This template's image
   entrypoint validates storage before direct Uvicorn; no startup migration/seed.

```powershell
$env:V_ADS_MEDIA_ENABLED = '1'
docker compose @dc up -d --no-deps --no-build --pull never api
if ($LASTEXITCODE -ne 0) { throw 'API activation failed; do not resume writers' }
docker compose @dc ps api
```

6. **Smoke and separately approved client rollout:** health/OpenAPI/schema first,
   then synthetic accounts in the approved test environment for mutations. Actual
   normal-runtime verification should be read-only unless a separate approved
   operator test account/data scope exists. Verify approved-feed/profile reads,
   anonymous private-preview denial, range `bytes=0-31` → 206 with Content-Range,
   invalid range → 416, cache/no-sniff headers, independent cookie sessions and
   normal services/navigation/authentication. Verify uploads stay private until
   independent approval, suspension/removal hide content, reasons/audits/counters
   match, free-space reserve and monitoring work. Re-check the actual API command.

```powershell
# Only if both client image replacements have their own approval and evidence.
$clients = $dc + @('-f','compose.v-ads-clients.example.yaml')
docker compose @clients config --quiet
docker compose @clients up -d --no-deps --no-build --pull never web admin
```

Stop on any failed smoke check. Resume the previously fenced worker only after
its schema/runtime compatibility and resumption are explicitly approved:
`docker compose @dc start worker`. Do not replace it with the new API-only image.
Do not publish Expo/phone-web/store updates or change URLs/DNS as a side effect.

## Rollback and offline cleanup

Prefer keeping writers fenced and reverting **application images/configuration**
only, after the clone rehearsal proves the previous code can read the `020`
schema and new records. Retain all media and audit history. To stop media access,
set `V_ADS_MEDIA_ENABLED=0` and use the approved API-only replacement command;
this still requires replacement approval. This flag does not remove routes or
hide every feed entry, and does not replace maintenance-mode/recovery planning.

```powershell
# Only with explicit rollback approval and proven schema compatibility.
$env:V_ADS_MEDIA_ENABLED = '0'
$env:V_ADS_API_IMAGE = $previousApiImage
docker compose @dc up -d --no-deps --no-build --pull never api
# Revert web/admin immutable IDs similarly only if their rollback is approved.
```

Verify the retained image's actual entrypoint/command before starting it; an
overridden CMD alone is insufficient if a custom entrypoint seeds/migrates.
Do **not** run `alembic downgrade`: `019` intentionally refuses downgrade, and
`020` downgrade removes ownership associations. Leave additive schema in place
when compatible. If compatibility is not proven, remain in maintenance and seek
an approved forward fix or recovery plan. A database restore after new writes
requires explicit data-loss/reconciliation approval; restore into a new target
first, preserve the failed target and never drop/overwrite normal volumes.

Cleanup is offline only, not a cron job or an emergency live disk-delete action.
Revoke eligible references through authenticated APIs before maintenance. Freeze
all media readers/writers and use the same approved database and private volume.
First run the existing dry-run helper and review every relative path:

```powershell
docker compose @dc run --rm --no-deps --pull never --entrypoint python api -c "import os; from pathlib import Path; from app.database import SessionLocal; from app.v_ads_video_storage import VideoStorage; from app.v_ads_media_cleanup import cleanup_media; session=SessionLocal(); print(cleanup_media(session,VideoStorage(Path(os.environ['V_ADS_PRIVATE_ROOT'])),offline=True)); session.close()"
```

Only after explicit approval of that candidate list may the same call use
`apply=True`. Minimum grace is 24 hours; validated shared-hash references and
audit/database rows are retained. `offline=True` is an operator assertion, not
automatic proof of quiescence. Never run it on the normal volume during QA, use
`docker volume prune`, or delete immutable objects based solely on age.
