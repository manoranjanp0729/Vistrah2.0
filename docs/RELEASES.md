# CI and release controls

Phase 2 source preparation, 13 October 2026. No production deployment is wired.

## Checks

`.github/workflows/ci.yml` runs on pushes to `main` and
`reference-theme-mobile`, every pull request, and release-workflow calls.

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

## Manual test candidates — Task 013

Reuse the existing registered `Publish release images` workflow, selecting
`chore/protect-local-source-20261020` and supplying `candidate_sha` as the full
lowercase 40-character commit SHA. The commit must be an ancestor of the selected
workflow commit and contain the updated FFmpeg `backend/Dockerfile`. Main with a
blank candidate SHA retains the existing production-release process; a candidate
SHA on main cannot start either publishing path. Nothing deploys automatically.

Before the first candidate run:

1. Separately authorize pushing these local workflow changes and dependencies.
   The protected development branch must contain the exact source commit.
2. Configure repository environment `test-candidates` with required reviewers,
   prevention of self-approval, and a branch policy allowing only the protected
   development branch. Disable administrative bypass where supported. Keep the
   environment free of AWS, database or runtime credentials. No environment or
   repository settings were created by this source change.
3. Confirm the private repository's GitHub plan supports required-reviewer
   environment gates. The workflow reads environment metadata with Actions-read
   permission and fails closed if reviewers/self-review protection are missing
   or access is denied. Do not weaken the gate or make the repository public.
   [GitHub environment availability and API permissions](https://docs.github.com/en/rest/deployments/environments)
   remain an owner/account dependency; existing branch protection is not proven.
4. Confirm Actions/GHCR permissions, private package visibility, available quota
   and approved public map-key variables. No paid capacity is enabled implicitly.
   Existing CI type/lint/test/dependency findings must pass; no checks are bypassed.

After approval, the existing reusable CI checks out the exact candidate SHA in
every job. The three image jobs use that same SHA and publish only Linux amd64
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
