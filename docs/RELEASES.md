# CI and release controls

Phase 2 source preparation, 13 October 2026. No production deployment is wired.

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

### Reviewable registration-only proposal (NOT APPLIED)

Smallest approval: add ONLY the following new
`.github/workflows/publish-images.yml` file to `main`, then manually select
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

This is a proposal in documentation, not an applied main-branch file or a
verified candidate run. Package privacy/read permissions, available Actions/GHCR
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
