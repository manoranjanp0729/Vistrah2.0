# CI and release controls

Phase 2 source preparation, 13 October 2026. No production deployment is wired.

## Read-only readiness audit - Phase 2, 25 October 2026

**Verdict: BLOCKED. No deployment or publication is authorized.** This audit
used local source/profile/container metadata and connected GitHub read APIs only.
No AWS API request, authentication/login, SSH connection, Instance Connect key
authorization, container start/stop, build, migration, volume operation, workflow
dispatch or billing/security change occurred. V Ads publishing remains ON HOLD.
Only this audit record and the handoff were updated; application/release code and
all pending user changes were retained.

### Access and live-inventory boundary

- Current AWS configuration identifies `default` and `vistrah-login` as **root
  login sessions**. `vistrah-terraform` delegates its credential process to
  `vistrah-login`; it does not establish a separate restricted role. No role/SSO
  profile or environment-backed non-root identity was evidenced. Credentials were
  not refreshed or used: even STS identity verification would use the prohibited
  root sessions. Validity/expiry was therefore not probed with AWS APIs.
- Existing records identify instance **i-0dbdebb8b05f15783**, region
  **ap-south-1**, previously recorded type **t3.small**. **Current running state
  and type are NOT VERIFIED.** Historical observations are not a live inventory.
  No public addresses, account identifiers or private environment values are
  included in this audit record.
- There is no local SSH config/project alias, and the existing SSH agent reports
  no available identities. Known-host records exist, but prove neither permission
  nor current authentication. The earlier successful preflight used temporary
  EC2 Instance Connect authorization; permanent SSH access was not established
  by that event. The old script's `-UseInstanceConnect` would perform a cloud
  write and was **not invoked**. No private key was opened, copied or repaired.
- Consequently **remote host inspection stopped**. Actual EC2 health/capacity,
  Docker state/images, live mounts, free storage and database revision remain
  unknown. Do not infer that AWS is healthy, stopped or broken from this boundary.

### Verified local runtime versus AWS source

The following five **local** `vistrah20` containers are running and healthy.
These observations are not AWS checks and do not prove the pending source is
already running. IDs below are shortened Docker image IDs, **not GHCR manifest
digests** or accepted rollback artifacts.

| Local service | Configured image reference | Running image ID | Verified local state mounts |
|---|---|---|---|
| API | `vistrah20-api` | `0f977e75dc5d` | `vistrah20_api_data` at `/data`; development bind at `/data/v-ads-e` |
| Worker | `vistrah20-worker` | `a9e4fd17c97b` | Same `vistrah20_api_data` at `/data` |
| Website | `vistrah20-web` | `f574fc18a81c` | None |
| Admin | `vistrah20-admin` | `e605ba3d2563` | None |
| PostgreSQL | `postgres:16.6-alpine` | `1d04b9ba1d49` | `vistrah20_postgres_data` at `/var/lib/postgresql/data` |

Local API uses direct Uvicorn, local worker uses its workflow-worker command,
and neither has a custom entrypoint. Container image metadata/retained-image and
registry digest evidence were not successfully established; running-container
health does not prove that an old image can be recreated for rollback.

| Arrangement | Source/observed difference |
|---|---|
| Local `compose.yaml` | Builds API/worker separately from the same backend Dockerfile and builds website/admin; API/worker share persistent `/data`. Phone development is separate from those five containers. Actual local refs/IDs are above. |
| AWS `compose.cloud.yaml` source | No app builds; five local `vistrah20-*:latest` refs with `pull_policy: never`; direct Uvicorn; worker opt-in; PostgreSQL/Caddy volumes, but **no API `/data` mount**. Actual remote files/overrides/images are unverified. |
| Prepared `compose.release.yaml` | Four digest-pinned GHCR artifact refs; worker shares the normal API artifact; still explicit-pull/never-implicit-pull. Image refs only: no data, command, environment, profile or mount changes. Not applied. |

Do not copy the local development mirror bind to AWS or attach local/test volumes
to a different environment. Do not replace the live Compose file with the source
template without preserving inspected existing mounts and overrides.

### Data, backups and source review

- Source head is **023**, not a verified live database revision. No database was
  queried. The old 006/011 helpers, restore-at-012 script and 020 runbook examples
  are not current migration instructions. Default backend image CMD still
  migrates/seeds; inspect actual entrypoints/commands and retain direct-Uvicorn
  activation. Never use migration/seed execution as an inventory check.
- `backend/app/edit_vistrah_store.py` stores CMS drafts/publications in
  `/data/edit_vistrah_data.json` when `/data` exists, unless explicitly configured
  otherwise. That is **outside PostgreSQL**. V Ads media is also file-backed.
  If the AWS API uses an unmounted container layer, replacement can lose this
  information. Actual files/existence/sizes/mounts were not inspected remotely,
  so this is a concrete source-based risk, not proof that AWS data is already
  lost. A PostgreSQL-only backup would not preserve those files.
- No relevant failed-copy backup log was found in the checked known project,
  release-artifact or adjacent backup locations. No archive or application data
  was opened. The two reported failed copies cannot be diagnosed or counted as
  successful recovery evidence without their actual log and verified artifacts.
  Hash listing and an existing snapshot alone are not a restore rehearsal.
- The branch is unchanged at `feature/simplify-admin-dashboard`, HEAD
  `2300942e523a87d4da3401692b21acaac2cb5458`, with **65 pending paths**. Counts:
  admin7, backend3, frontend4, mobile37, shared6, scripts2, docs3, workflows1,
  infra1 and root deploy1. They require four image builds and five service
  reviews, not automatic replacement of every service.
- Filename review and high-confidence AWS/GitHub-token/private-key-envelope
  checks in candidate text files under1MB found no matching secrets. This is a
  limited heuristic, **not** a no-secret guarantee or approval to commit all.
  Private envs, keys, DB dumps, signing files, dependency trees and generated
  artifact/build directories are ignored in the tested paths. No generated
  cache directory was present in the 65-path plan.
- `mobile/src/components/Untitled-1.txt` is an unclassified scratch file: review
  it privately and exclude it from any proposed commit until purpose/content
  is approved; do not delete it automatically. A hypothetical root `image.tar`
  is **not Git-ignored**, although Docker context exclusions cover tar files.
  Keep exported images out of Git through a separately reviewed ignore/output
  decision. There is no such archive in the current candidate list.
- The font TTFs, OFL notices, provenance JSON and bundled license JSON are
  intentional source assets for the approved Settings feature, not disposable
  build caches. Preserve them with the reviewed feature; do not strip notices
  or blindly exclude them merely because a helper generated their metadata.

### GitHub publishing readiness

The connected GitHub read API works; installing GitHub CLI is not a prerequisite
to reading metadata. A fresh read of `main/.github/workflows/publish-images.yml`
shows the **registration-only stub**, blob
`8f0a45535c6bbf42c5fefa599f4d90fe8fef7a65`, whose only job instructs branch
selection and exits1. It is not the locally prepared full release publisher.
[Verified remote file](https://github.com/manoranjan247p-source/Vistrah2.0/blob/main/.github/workflows/publish-images.yml).

The connector found no PR-triggered workflow runs for local HEAD; its endpoint
does not enumerate every event type, so this is not a claim that all historical
CI is absent. No green full-CI evidence for the pending working tree or complete
approved four-image digest record was established. Registry visibility/access,
current quota, image retention, scans/runtime smoke and rollback evidence remain
unverified. The held candidate path only produces three server images and may
not be substituted for the four-image production/phone path.

### Ordered blockers and exact safe fixes (not executed)

1. **Permitted identity/access first.** Use an already approved, verified
   **non-root read-only operator session** for the next inventory. Do not log in
   as root, run the delegated root credential process, create access keys/roles,
   request AdministratorAccess or change security rules in this audit. If no
   such existing session is available, stop until an authorized access owner
   resolves that prerequisite outside this run.
2. **Verify the actual instance, then permitted SSH.** An authorized non-root
   operator can run the following narrowly projected read (not executed here):

   ```powershell
   aws ec2 describe-instances --profile EXISTING_APPROVED_NONROOT_PROFILE --region ap-south-1 --instance-ids i-0dbdebb8b05f15783 --query 'Reservations[].Instances[].{InstanceId:InstanceId,State:State.Name,Type:InstanceType}' --output json --no-cli-pager
   ```

   Do not add addresses/envs to the projection. Establish that an existing SSH
   session/key is already authorized before host inspection; do not send an
   Instance Connect key, weaken host-key checks or change an allowlist as a
   shortcut. Record actual project labels, container images/entrypoints/commands,
   volume identities and free disk/RAM through that permitted session only.
3. **Prove persistence and recovery before replacement.** Collect metadata-only
   evidence of `/data`/CMS/media existence, sizes and backing mounts without
   printing file contents or private envs. Obtain the two failed-copy logs from
   their actual location and resolve the evidenced error, not a guessed cause.
   Before migration/deployment, separately approve consistent protected backups,
   checksum verification and restore rehearsal on a disposable target. Never
   overwrite an existing database/volume or create a shadow empty mount.
4. **Review source hygiene and immutable source identity.** Resolve/exclude the
   scratch file and generated image-archive handling with user approval; review
   the complete diff and only explicitly approved files. Committing, pushing and
   merging require separate authorization. Do not stash/reset/switch branches or
   install GitHub CLI merely to bypass the missing source-approval step.
5. **Repair the approved publishing path, not the hold.** After explicit source
   approval, review/merge the prepared publisher to the intended branch and pass
   full CI/audits. Only a later explicit instruction may resume publishing;
   retain the V Ads hold until then. Require main's exact SHA/confirmation and a
   complete successful four-image digest/run record, private registry access,
   runtime/scan evidence and retained previous artifacts. Do not dispatch the
   registration stub or use a partial/held candidate as a deployable release.
6. **Approve schema-compatible activation last.** Determine the actual database
   revision and every pending migration up to the approved source; rehearse the
   full range and previous-image compatibility. Separately approve writer
   fencing, migration and precise service/digest rollout. Preserve PostgreSQL,
   API state and media mounts; worker remains opt-in. Stop on failed checks;
   rollback application refs/config only when compatible, never an automatic
   downgrade, normal-volume deletion or database restore.

Recommended immediate next action: obtain the sanitized instance inventory and
established-access evidence from an **existing non-root read-only operator**.
Until that prerequisite is met, more deployment attempts cannot establish live
readiness. No new AWS resources, services, paid capacity or workflow jobs were
started by this audit. **AWS deployment readiness remains BLOCKED.**

## One-command AWS preparation - Phase 1, 25 October 2026

**Local preparation only. V Ads publishing remains ON HOLD; production is
BLOCKED.** No build, image publication, GitHub dispatch, AWS/SSH access, database
operation or deployment is authorized by this section. Earlier approval/hold
records below remain in force. No existing local changes were committed/stashed
or moved to another branch. This deployment-preparation phase is separate from
the numbered production implementation phases.

From Windows PowerShell at `E:\Vistrah 2.0`:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\deploy.ps1 -Preflight
```

It requires only Git and Windows PowerShell 5.1 or newer. It reads local source,
Git paths and tool availability; it does not load private env files or invoke
Docker, AWS, SSH, GitHub, HTTP, builds or other deployment helpers. Git optional
index refresh/fsmonitor/external diff/textconv are disabled. The index and all
working files are retained. Exit **2** means a blocked preparation report (the
expected result), not a failed rollout. Missing `-Preflight` refuses execution;
no publish/deploy/force/bypass mode is implemented.

For a complete source comparison, supply the **full last verified deployed
commit** from the release record; do not guess it from HEAD. Optional image-record
validation remains offline and cannot prove registry or CI success:

```powershell
# Replace with reviewed evidence; no credentials belong in the JSON record.
.\deploy.ps1 -Preflight -BaseCommit <40-character-deployed-sha> -ReleaseFile .\approved-release.json -Format Json
```

Without `-BaseCommit`, the report covers pending tracked/untracked edits relative
to HEAD only; committed changes since the last deployment are unknown. Renames
are conservatively treated as deletion plus addition. The manifest must contain
`schemaVersion: 1`, `environment: "aws-test"`, `sourceCommit` matching inspected
HEAD, this repository's `workflowRun` URL and an `images` object with **all four**
`api`, `web`, `admin`, `phone-web` values of the form
`ghcr.io/manoranjan247p-source/vistrah2.0/<component>@sha256:<64-lowercase-hex>`.
Tags, `latest`, candidate packages, foreign namespaces, a separate worker image,
wrong source and production records are rejected. A valid format is **not**
verified-image promotion; the report always keeps deployment disabled.

### Build impact and reuse

The mapping follows the inspected Dockerfile COPY boundaries, including shared
inputs; it is conservative, not a replacement for full CI or API compatibility QA.

| Changed input | Proposed services | Published artifact |
|---|---|---|
| `backend/app`, migrations, requirements, Alembic config, backend Dockerfiles | API and worker review | Normal `api` image; worker stays opt-in |
| `frontend/` except `Dockerfile.phone` | Website | `web` |
| `admin/` | Admin | `admin` |
| `admin/lib/v-ads-preview.ts` | Website and admin | `web`, `admin` |
| `mobile/`, `frontend/Dockerfile.phone`, `infra/aws-test/Caddyfile.phone` | Phone website | `phone-web` (not an APK or OTA update) |
| `shared/`, `.dockerignore` | All five service reviews | All four images |
| `scripts/interface-phrases.json` | Website | `web` |
| Compose, proxy configuration, workflows, operational scripts | Explicit operational review | No inferred service recreation |
| Backend tests/docs only | CI/review | No app image inferred |

Only `publish-images.yml` builds/publishes approved release images; `ci.yml` stays
the reusable validation pipeline. Main release dispatch now additionally requires
`release_confirmation` exactly **PUBLISH VERIFIED RELEASE** and `release_sha`
equal to the approved full main workflow commit, checked before full CI and the
unchanged four-image matrix. Candidate SHA/confirmation/ancestry,
three-image scope and isolated server-only CI exception remain unchanged. This
confirmation is operator intent, not an independent approval or a waiver of the
V Ads hold. MapTiler's existing public variable is now passed to the main website's
actual `NEXT_PUBLIC_MAPTILER_API_KEY` argument, as already done for candidates.
No keys, provider, private credential or paid configuration was added.

### How approved local changes will reach AWS (future, separately authorized)

1. Review the local diff/untracked files; separately authorize the exact commit,
   push and PR/merge. Current `feature/simplify-admin-dashboard` is not a publishing
   target. Dirty local bytes cannot be included by a GitHub build. Do not auto-pull,
   switch/stash/reset or commit to make a dirty checkout look release-ready.
2. Resume publication only on explicit approval after resolving the hold and
   existing blockers. Reuse the main workflow with full CI/mobile audit gates;
   hosted registration/current workflow bytes remain unverified by local checks.
   The held protected candidate path produces only API/web/admin test candidates,
   not a complete phone-web release, and is not an alternate production path.
3. Record the successful **complete** publish run, source SHA, four GHCR manifest
   digests, `linux/amd64` architecture, public build settings and smoke/scan results.
   Verify private package/read access without printing credentials. The existing
   candidate FFmpeg/FFprobe/MP4-validator smoke is reusable evidence logic; main
   publication alone does not prove that smoke ran. Do not accept a partial matrix
   or translate a Docker image ID into a registry manifest digest by assumption.
4. Rehearse promotion and image/config rollback using synthetic data in an
   explicitly disposable environment. Then inventory the real EC2 project,
   commands/entrypoints, architecture, free disk/RAM, existing mounts and current
   schema. Verify protected backups and media/API-state preservation. These are
   future gates, not observations from Phase 1.
5. After **separate deployment confirmation** for exact digests/services/target,
   an operator explicitly pulls only approved GHCR digest refs, retaining the
   previous images/configuration. Use new opt-in
   `infra/aws-test/compose.release.yaml` after the existing `compose.cloud.yaml`
   with `VISTRAH_RELEASE_API_IMAGE`, `VISTRAH_RELEASE_WEB_IMAGE`,
   `VISTRAH_RELEASE_ADMIN_IMAGE`, `VISTRAH_RELEASE_PHONE_WEB_IMAGE` set from that
   record. Retain the previous verified refs for any services not selected for
   replacement; do not leave unapproved future refs in their effective config.
   Worker uses the **normal API** image with its inherited worker command;
   never substitute the Uvicorn-only V Ads runtime artifact.
6. Only after all gates, recreate the specifically approved app services using
   `up -d --no-deps --no-build --pull never --wait` with both Compose files and the
   **existing exact** project/private env. No unqualified `compose up`, `down -v`,
   prune, migration-on-start or `--profile worker` activation. The overlay changes
   only image refs, keeps explicit-pull `pull_policy: never`, and does not add or
   alter PostgreSQL, volumes, media, API state, proxy, ports, commands or profiles.
   Pulls happen explicitly before activation, never as an implicit side effect.

Legacy `build-phone-website.ps1`, `deploy-phone-website.ps1` and
`activate-phone.sh` remain unchanged for their separately approved tar/local-tag
path; the new command does **not** call them or silently bypass GHCR/CI. In
particular, the legacy `-PreflightOnly -UseInstanceConnect` sends a temporary
SSH public key and creates key copies, so it is not this offline read-only mode.
The historical 006/011 migration helpers and `restore-cloud.sh` are not generic
AWS updaters and must not be called against today's normal database.

### State, migration, health and application rollback gates

- **Source head is currently 023; live revision is unknown.** Old 020 runbook
  commands are dated evidence, not the current approved migration range. Source
  preflight reads revision declarations without importing/running the backend.
  Determine the actual full pending range privately before rollout. Explicitly
  authorize all-writer fencing, protected file-based PostgreSQL backup/hash and
  restore rehearsal on a disposable clone. Never seed or run `upgrade head` or
  automatic downgrade/restore. A release with no changed migration file still
  needs schema/API compatibility checks against the actual target.
- **API file-state blocker:** base AWS Compose has no `/data` mount. Existing
  CMS content/evidence/state may reside in a container layer or an uninspected
  override. Verify and preserve the real state before API replacement. Do not
  invent/create a new volume, shadow populated data with an empty mount, copy a
  private env into images, or attach test/production media interchangeably.
  Existing media overlays/volumes must be inventoried and retained unchanged.
- Inspect actual image entrypoint **and** command before activation/rollback.
  Default `backend/Dockerfile` CMD migrates/seeds; the cloud source overrides it
  with direct Uvicorn. Never start that default CMD for routine verification.
- Post-change health: API `/health`; website/admin `/api/health`; phone `/app/`
  and referenced JS/font assets with correct types/content; container health and
  image digest/ID mapping. Check login/session separation, read-only page journeys
  and mobile/desktop routing; 200 from an HTML fallback alone is not asset proof.
  Check worker heartbeat only if it was already active and its change/resumption
  is separately approved. Health does not establish V Ads, real paid membership,
  physical Android acceptance or a verified restore drill.
- On failure, stop the rollout; do not update remaining services/resume fenced
  writers. With explicit rollback approval and proven schema compatibility,
  restore previous **app image refs and configuration only** using the same
  targeted `--no-deps --no-build --pull never` path; repeat health checks. Retain
  PostgreSQL/media volumes and audit history. Do not run legacy whole-config
  restoration if it would drop current media mounts. If old code cannot use the
  upgraded schema, remain fenced and seek an approved forward fix/recovery plan;
  never implicitly restore/delete normal data.

No Terraform/ECR/ECS/ALB/RDS/S3/resource/DNS/billing change is introduced. Local
preparation has no AWS deployment cost. Future Actions/GHCR usage and EC2 image
disk/network needs must fit the existing approved limits; keep paid overage
blocked. No quota, storage visibility or current AWS capacity is verified here.
Main's new confirmation job uses the existing standard runner (two-minute
timeout); it is not dispatched by preflight. Production launch gates, membership
sandbox separation, V Ads media/capacity controls and publication hold remain.

## GHCR-only safety preflight - 20 October 2026

The owner has reviewed GitHub Free billing: 2,000 included Actions minutes,
approximately $3.55 displayed usage against approximately $12 included, and
$0 paid budgets with overage blocked. Accept this as owner-provided billing
evidence; no upgrade, purchase, spending-limit change or new billing-API audit
is needed. Actual candidate publication still requires explicit authorization.

Static verification of exact source `4cc5e2ff54c9d33504a671657d43d15adb947588`
passes: manual dispatch/confirmation and full-SHA ancestry checks; only three
API/web/admin candidates; standard `ubuntu-24.04` runners; no paid reviewer
environment; `GITHUB_TOKEN` with job-local `packages: write`; upstream CI and
audit gates preserved; no visibility-changing API/command. Combined timeout
ceiling remains 205 runner-minutes. This workflow does not enable paid capacity;
the owner's blocked-overage setting must remain in force. Included capacity
does not guarantee a build will complete if quota or another limit is reached.

The exact package-read blocker is now proven, not an inferred generic 403:
GitHub says **You need at least read:packages scope to list packages.** The
configured OAuth login grants only `gist, repo, workflow`; no credentials or
scopes were changed. Anonymous GHCR pull-token requests return 403 for each of
`manoranjan247p-source/vistrah2.0/candidate-api`, `candidate-web`, `candidate-admin`.
That proves those anonymous requests were denied, not that package metadata is
absent/private or that existing-package Actions write access is granted.

[GitHub documents private visibility for first publication and automatic
repository linkage with GITHUB_TOKEN](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).
Publishing an existing package retains its visibility: the private source
repository alone is not a package-privacy guarantee. An owner can separately
change package visibility; this reviewed workflow contains no such change.
[Package metadata access requires read:packages](https://docs.github.com/en/rest/packages/packages?apiVersion=2022-11-28).
Current repository Actions settings and job token configuration support new
associated packages; existing packages additionally need verified repository
Actions access. No actual write/push has been tested or performed.

The owner subsequently confirmed **all three packages are absent**. This is
owner-provided package evidence, not a successful metadata-API read. There is
therefore no pre-existing package permission/visibility to inherit. Combined
with verified repository Actions settings, job-local `GITHUB_TOKEN` package
write and GitHub's documented private-first-publication/repository-link behavior,
the controls are **READY FOR EXPLICIT TEST-CANDIDATE AUTHORIZATION**. Existing
main/production checks and the unresolved mobile security release gate remain
unchanged. This is not production/Android release readiness or proof of an
actual registry push: login, first push, private package status, FFmpeg smoke and
all immutable digests must be verified during the authorized run. A failed or
partial matrix is not an accepted candidate set.

The next approval is one manual `publish-images.yml` dispatch, selecting
`chore/protect-local-source-20261020` and exact source
`4cc5e2ff54c9d33504a671657d43d15adb947588`, confirmation
`PUBLISH TEST CANDIDATE`, producing ONLY the three test candidate images. Use
included capacity with blocked paid overage; never change billing/visibility
settings to repair a failed build. No dispatch, build, publication, AWS action,
DB change or application/UI change occurred here. Never paste credentials.
Sanitized local evidence: `artifacts/milestone-release/ghcr-safety-preflight.json`
and `ghcr-workflow-safety.json`; these are ignored operational artifacts.

## Registration completed; candidate publishing ON HOLD - 20 October 2026

The user approved only the documented default-branch registration change, then
explicitly answered **Hold candidate publishing** when quota/package access
could not be verified. No workflow dispatch, Docker build, registry publication,
AWS mutation, migration or deployment was performed.

- Verified `main` at `d365d7ca7f5fea58e67e0583afa4d86c002b1a6d` had no
  `.github/workflows/publish-images.yml`. GitHub Contents API created commit
  `902c88e371e3fd7a1626dd40d0c679f123638dc4` with ONLY that new file.
  Remote bytes match the approved stub below; SHA-256
  `340baaec789628093b7dc1ec7d32e584cb72523ec05c1cf97547f58fc2315b10`.
  No application files, existing workflows or local branches were changed.
- GitHub workflow ID `390740934` is active. The protected development branch
  still points to `4cc5e2ff54c9d33504a671657d43d15adb947588`, whose existing
  dispatch definition accepts the exact SHA and confirmation. Branch selection
  is prepared; execution has deliberately not been tested by dispatching.
- Development CI #51 completed: backend, all three clients, environment and
  frontend/admin audits passed. Only the unchanged mobile dependency audit
  failed. The server-candidate scope remains an isolated-test exception, never
  production or Android release approval.
- Actions is enabled and permits the pinned actions. Default token permissions
  are read; candidate publishing explicitly requests `packages: write`.
  Billing usage returned 404 even with the current API version; package listing
  returned 403 and individual candidate lookups returned 404. These responses
  do NOT prove available quota, package absence/privacy or registry write access.
  No credentials, spending limits or account settings were changed.
- Prepared, not submitted: `artifacts/milestone-release/candidate-publication-request.json`
  targets the exact protected SHA above, workflow `publish-images.yml`, and
  `PUBLISH TEST CANDIDATE`. Ten standard Linux runner jobs have a combined
  timeout ceiling of 205 runner-minutes (5 resolve + 5 environment + 20 backend
  + 2x25 clients + 2x10 audits + 3x35 image builds); actual usage is unknown.
  Do not publish until the user resumes and confirms included quota/no paid
  overage plus private GHCR package/repository Actions access.

Read-only AWS Test endpoint evidence: `vistrah.in`, `api.vistrah.in` and
`admin.vistrah.in` resolve to `35.154.22.29`. HTTPS returns 200 for the website
and admin `/api/health`, and the direct API `/health`; direct API `/api/health`
returns 404, which does not invalidate its working `/health`. Public API
`/openapi.json` returns 200, but `/v-ads/reels`, `/v-ads/me` and
`/admin/v-ads/advertisers` are absent; a public feed request returns 404.
Current health therefore does not establish the new V Ads runtime is deployed.
AWS CLI `vistrah-login` still reports an expired session; host RAM/disk/images,
database revision, media/backup capacity and snapshot recovery remain unverified.

Android preparation reuses the linked `in.vistrah.app` project and existing
`aws-test` profile: internal APK, development client false, HTTPS AWS-test API,
website and admin origins. No `EXPO_TOKEN` is present in this process; that
alone does not establish whether an EAS account has a saved session. EAS CLI,
account/signing access and included build quota remain unverified; no install,
cloud build or signing change was attempted. With those prerequisites approved,
the existing command is `eas build --platform android --profile aws-test
--non-interactive` from `mobile/`. It must not silently enable paid capacity or
create/replace credentials. Physical-device acceptance remains pending.

## Integrated AWS Test milestone - 20 October 2026

The current master directive authorizes routine verified development-branch
commits/pushes and isolated test preparation; older per-task `do not push`
notes are historical. Production gates remain unchanged. Existing source/UI,
local containers and data are preserved. Journey traceability and acceptance
gaps are recorded in USER_JOURNEYS.md rather than a parallel checklist.

- Published source fixes: `d8879b2` (React patterns), `9ef50e4` (bounded public
  reel/profile engagement queries and reviewed disposable fixture schemas),
  `9eef919` (localized/current-contract client test fixtures).
- Local evidence: 11 targeted backend tests on a fresh disposable SQLite database;
  43 directly affected frontend tests and affected-file lint; five previously
  failing native configuration/membership/navigation assertions pass. The
  query-budget test measured six-video feed/profile SELECTs at 13/14 before,
  3/4 after, retaining approved-only visibility and visible comment counts.
- Hosted evidence: run #49 at
  https://github.com/manoranjan247p-source/Vistrah2.0/actions/runs/39446934524
  first exposed the route-teardown failure. Run #50 at
  https://github.com/manoranjan247p-source/Vistrah2.0/actions/runs/39451654345
  verifies the fix: 457 PostgreSQL-backend tests passed/six skipped, 249 frontend
  tests and 40 mobile tests passed; all three Client jobs (including their
  type/lint/build or web-export steps), environment and web/admin audits passed.
  Fourteen targeted account/review-then-moderation tests also pass locally.
  The unchanged mobile audit is the only failing job (four documented families). Do not
  represent earlier/local SQLite results as PostgreSQL or device evidence.
- Added candidate-only API runtime smoke preparation: after the immutable API
  image is published, run FFmpeg/FFprobe, core Python imports, generate a tiny
  synthetic H.264 MP4 and validate it with the existing validator. The container
  has no network, no volumes, a read-only root, a 16 MiB ephemeral tmpfs,
  256 MiB/one CPU/64-process limits and an explicit shell entrypoint; it never
  starts Uvicorn, migrates, seeds or connects to a database. YAML/Bash syntax and
  preservation of full push/PR/main checks were checked. The candidate build also
  passes the existing approved public map-key variable to the actual Next.js
  `NEXT_PUBLIC_MAPTILER_API_KEY` build argument (the old Expo-only argument did
  not populate the desktop map configuration). Main publishing is unchanged. This smoke
  has NOT executed: no candidate was built or dispatched. Publication alone is
  not acceptance if the post-publication smoke fails.

### Remaining external gates and smallest next action

AWS `vistrah-login` still reports an expired session after the user's refresh;
`vistrah-terraform` correctly delegates to it. No EC2/snapshot/capacity result
is currently verified. Do not treat snapshot `snap-09f77f82f56f173e3` as a tested
backup. Prior SSH public-key rejection remains separate from AWS CLI login.
Next access action: obtain a successful local STS check in the same Windows
account/profile (no credentials/account output in chat), then repeat only the
blocked read-only AWS checks. No new resources or access-policy changes.

The master's explicit isolated-test exception is now implemented as a narrow
`server_images_only` reusable-CI input, default false. Only exact-SHA protected
development-branch candidates use it; they run backend/environment plus ALL
website/admin type/lint/test/build and audit checks. Their three Dockerfiles do
not copy mobile dependencies. A guard rejects using this scope on main or
without a full source SHA. Full push/PR/main client and audit matrices retain
mobile, with no audit suppression or production exemption. The default-main
publication path remains full-CI-gated. Phone-web and Android are not in this
three-image candidate matrix and need their own verified artifacts; a web export
is not an installable APK. No paid quota was enabled or verified.

A real readiness read found a separate registration blocker: repository-scoped
GitHub credentials CAN read Actions, but only `ci.yml` and
`catalogue-request-checks.yml` are registered. `publish-images.yml` is absent
from `main` (Contents API 404); its workflow API also returns 404. Earlier
`registered workflow` wording was an unverified assumption, corrected here.
[GitHub's manual-run documentation](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow?tool=cli)
requires the workflow file on the default branch. No dispatch was attempted.

### Approved registration-only stub (applied 20 October 2026)

The user approved adding ONLY the following new
`.github/workflows/publish-images.yml` file to `main`; it is now applied. Once
publishing is resumed and prerequisite gates pass, manually select
`chore/protect-local-source-20261020` to run the full reviewed candidate workflow
from that branch with an exact protected source SHA and confirmation phrase.
This proposal merges no application source, changes no existing main workflow,
never builds/publishes on main and cannot deploy. Do not merge the whole
feature branch to register it. Recheck main's current file absence and latest
head immediately before an approved change; stop if either conflicts.

```yaml
name: Publish release images
on:
  workflow_dispatch:
    inputs:
      candidate_sha:
        description: Full reviewed development commit SHA
        required: true
        type: string
      candidate_confirmation:
        description: Type PUBLISH TEST CANDIDATE and select the development branch
        required: true
        type: string
permissions:
  contents: read
jobs:
  select_development_branch:
    runs-on: ubuntu-24.04
    timeout-minutes: 1
    steps:
      - run: |
          echo 'Select chore/protect-local-source-20261020; this registration stub never publishes or deploys.'
          exit 1
```

The applied main-branch file matches this stub exactly; no candidate run has
occurred. Package privacy/read permissions, available Actions/GHCR
quota, image scans and immutable runtime smoke remain acceptance gates after
registration. No AWS/registry credentials are embedded in this proposal.

After access and artifact gates: inspect actual cloud commands/images/revision,
RAM/disk/private media and active writers; verify protected DB+media backup and
restore into a new disposable target. Obtain explicit approval before fencing
writers, migrating existing data, replacing services, changing routing/DNS or
using paid capacity. Use direct-Uvicorn override and immutable references;
never invoke the default migrate/seed image command for routine startup.

Android acceptance remains pending: authorized EAS account/project/signing and
quota; AWS-test APK using `aws-test` profile (HTTPS test origins, no laptop),
install on a physical Android device; registration/customer/seller identity,
three membership-gated service tabs, temporary/manual/explicit GPS and consent,
request persistence/status, advertiser upload?independent review?public reel,
play/pause/swipe/audio/resume, likes/comments/profile/share, errors/offline,
account switching/logout and admin browser separation. Capture exact APK SHA,
source SHA, API revision and results. Native tokens must stay out of URLs/logs.
No production endpoint/store/billing decision is implied by test acceptance.

### Operational milestone handoff (not a completion claim)

| Area | Verified result / remaining evidence |
|---|---|
| Source | Protected development branch; logical fixes pushed, prior local handoff edits preserved. Latest exact SHA is available from branch/CI records. Main untouched. |
| Optimization | Public six-video feed/profile SELECTs 13/14 to 3/4; same public rules and payload fields. |
| Builds | Hosted Next.js website/admin builds and Expo web export passed in #50. No new Docker digest or installable APK exists for this checkpoint. |
| AWS Test | No new deployment. Expired AWS session and prior SSH rejection block current health/endpoint/capacity verification. |
| Database/media | #50 disposable PostgreSQL suite passes (457/six skipped). Existing AWS data/media, backup restoration and migration rollout remain unverified/unexecuted. |
| Customer | Hosted client tests and source checks pass; complete signed-in AWS journeys and visual/hardware acceptance remain open in USER_JOURNEYS.md. |
| Seller | Synthetic owned-account/submission/publication coverage passes in backend suite; full AWS upload/review/status round-trip pending. |
| Admin | Separate admin build/type/lint passes; V Ads permissions/moderation tests pass. Real admin session/evidence/operational dashboard acceptance pending. |
| Android | 40 native-source tests and Expo browser export pass. No signed APK, installation, hardware audio/GPS or AWS-connected native acceptance claimed. |
| Security | Four known mobile advisory families unchanged; only isolated server-image testing scoped; full mobile/production audit stays blocking. Image/Python artifact scans pending. |
| Rollback | Retain old images/config and protected DB/media; rehearse compatible old/candidate/old in disposable infrastructure before promotion. No blind downgrade/restore or normal-volume overwrite. Existing V Ads runbook provides ordered gated commands; no rehearsal executed here. |
| Next external actions | Approve only the reviewed default-branch dispatcher registration; restore working AWS login/SSH separately. Then candidate/scans/restore/capacity/device gates must pass before any separately approved data migration/runtime activation. |

## Checks

`.github/workflows/ci.yml` runs on pushes to `main`, `reference-theme-mobile`
and `chore/protect-local-source-20261020`, every pull request, and release-workflow calls.

- Environment tests and local/disposable-test template validation.
- Backend tests and Alembic migrations against a fresh runner PostgreSQL
  service named `vistrah_ci_test`. Fixtures create synthetic users/data; this
  database disappears with the job and never connects to normal data.
- Independent frontend/admin/mobile installs, type checks and lint. Frontend
  and mobile run their existing unit tests; admin has no unit-test script yet.
  Next clients build; mobile exports the shared phone website.
- JavaScript lockfile audits fail on high/critical advisories. Existing mobile
  findings may block the first green run. Fix compatible dependencies and
  review changes; do not force-upgrade the Expo stack or bypass this gate.

Python advisory scanning, image vulnerability scans and physical Android/E2E
journeys remain Phase 6/8 work. A green CI run does not certify those checks.
Actions are pinned to verified commit SHAs, checkout credentials are removed,
PR jobs have read-only repository permissions, and there are no deployment
credentials. No `pull_request_target` workflow executes untrusted PR code.

## Registry and manual publishing

`publish-images.yml` is manually dispatched on `main` only, after the reviewed
change is merged. It reruns all checks before publishing four Linux amd64
images to GitHub Container Registry: `api`, `web`, `admin`, `phone-web` under
`ghcr.io/manoranjan247p-source/vistrah2.0/`. Worker uses the API image with its
worker command; it needs no separate source image. Existing runtime Compose
files are unchanged and do not consume these names automatically.

GitHub's Container Registry documentation specifies private visibility for new
packages. Verify that every published package stays private, is linked to this
repository and has the intended read access. Existing packages may have other
visibility. Publishing uses the job-scoped `GITHUB_TOKEN` (`packages: write`),
not AWS keys or a stored personal token. Repository/package policy and available
Actions/registry quota must be checked before the first manual publish; do not
enable additional billed usage implicitly.

Reference: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry

Set repository Actions **variable** `EXPO_PUBLIC_MAPTILER_WEB_API_KEY` to the
existing approved public browser key when map previews are needed. It is
embedded in the clients and must have provider origin restrictions; do not put
private credentials in this variable or Docker build arguments. Runtime secrets
remain outside images. `.dockerignore` excludes env variants, private keys,
dumps, archives and Terraform private state/variables from the build context.

Each image receives a full `sha-<commit>` tag. The job summary records
`image@sha256:<digest>`; use the digest for deployment because tags can be moved.
A failed matrix can leave some candidate images uploaded. Promote a release
only when all four publish jobs succeed; record every digest and the workflow
run URL together. Retain the previously verified release for rollback.

## Manual test candidates — Tasks 013/014

After the default-branch registration gate above is approved and completed,
use the `Publish release images` workflow, selecting
`chore/protect-local-source-20261020` and supplying `candidate_sha` as the full
lowercase 40-character commit SHA and `candidate_confirmation` exactly
`PUBLISH TEST CANDIDATE`. Missing or incorrect confirmation fails before CI/builds.
This is explicit operator confirmation, not independent reviewer approval; no
GitHub environment or paid reviewer feature is required.
The commit must be an ancestor of the selected
workflow commit and contain the updated FFmpeg `backend/Dockerfile`. Main with a
blank candidate SHA retains the existing production-release process; a candidate
SHA on main cannot start either publishing path. Nothing deploys automatically.

Before the first candidate run:

1. Separately authorize pushing these local workflow changes and dependencies.
   The protected development branch must contain the exact source commit.
2. An authorized repository operator reviews the exact SHA and manually enters
   the confirmation phrase on the protected development branch. No environment
   policy API call, Actions-read permission or separate reviewer job is used.
   Keep existing repository access controls; branch protection is not proven.
3. Confirm Actions/GHCR permissions, private package visibility, available quota
   and approved public map-key variables. No paid capacity is enabled implicitly.
   Candidate-scoped server CI type/lint/test/dependency findings must pass.
   Full development/production mobile security gates remain unchanged.

After confirmation, the existing reusable server-candidate CI checks out the
exact candidate SHA in every job. Full main release checks retain the mobile
client/audit; the isolated three-image test scope excludes mobile only. The three image jobs use that same SHA and publish only Linux amd64
`candidate-api`, `candidate-web` and `candidate-admin` packages. API uses the
updated default Dockerfile with FFmpeg. Phone-web/native artifacts are separate
and are not published by the candidate matrix.

Tags contain full source SHA, run ID and run attempt, so reruns never intentionally
reuse a tag. GHCR tags are not inherently immutable: deploy only the recorded
`image@sha256:digest`. Each image job summary records commit, unique tag, digest
and run URL. A partial/failed matrix is not a usable candidate set. Verify all
three jobs succeeded and retain their digests together. Actual image/codec
execution, vulnerability scans and isolated persistence/rollback checks remain
separate release gates. API startup must use the existing direct-Uvicorn override
because the default image command still migrates/seeds. No AWS/SSH/deployment
credentials, runtime activation, database migration or service command exists
in this workflow.

## Review and protection

Review changes through pull requests into `main`. Required checks should be
Environment boundaries, Backend and migrations, all three Client checks and all
three Dependency audit checks. Require a review and disallow force pushes when
the account supports it. The repository rulesets API currently returns 403 with
an account-plan limitation; protection has **not** been configured. Keep the
repository private. An upgrade needs the owner's decision; the manual review
procedure does not provide the enforcement of branch protection.

## Promotion and rollback rehearsal

Production promotion remains disabled until the Phase 8 release gate. Phase 7
will supply the tested Compose image override and deployment health script.
Before any staging or production replacement:

1. Record the release commit, workflow URL, four immutable image references,
   public build configuration and schema compatibility requirements.
2. Preserve the previous image/configuration references. Verify the database
   backup and restore procedure separately; never include secrets in the record.
3. In an explicitly disposable test project, start the previous release with
   synthetic data, switch only the intended app images to the candidate digests,
   verify API/web/admin/phone health and a login/read-only journey, then switch
   back and repeat health checks. Confirm the test project's data persists.
4. Stop if the prior application cannot read the candidate schema. Do not
   automatically downgrade a migration or restore a database to roll back code.
5. Capture the rehearsal's results. Actual deployment requires its separate
   authorized rollout, with measured post-release health and retained images.

Outstanding Phase 2 gates: successful hosted PR checks, account protection
resolution, verified private image publication, and isolated rollback rehearsal.
