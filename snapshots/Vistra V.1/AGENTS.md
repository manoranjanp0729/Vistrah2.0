# VISTRAH project instructions

## Architecture and source of truth

- The VISTRAH app is a Next.js frontend in `apps/web`, a FastAPI backend in `backend/api`, and PostgreSQL initialized from `database/` through Docker Compose. Existing catalogue adapters and route templates are documented in `docs/ARCHITECTURE.md` and `docs/VISTRAH-APPLICATION-MAP.md`.
- Planning source of truth: `docs/FUNCTIONAL_INVENTORY.md` (evidence/status), `docs/FUNCTIONAL_SPECIFICATION.md` (requirements/constraints), `docs/USER_JOURNEYS.md` (flows), and `docs/REFINEMENT_BACKLOG.md` (single canonical work list). Preserve I1/I2 evidence and unresolved I3 scope recorded there.
- Keep changes minimal. Preserve approved page behavior, seller ownership, listing approvals, membership restrictions, safe destinations, human-reviewed Recommended-provider workflow, location privacy, campaign eligibility, and data-protection controls. Paid placement/providers, billing, production deployment, and unresolved money rules require explicit approval. Payments stay sandbox-only unless separately approved.

## Database and runtime behavior

- Treat normal local startup as migration/seeding-capable: `scripts/dev.ps1 -Action up` brings up Compose then applies the admin SQL script; on a newly initialized PostgreSQL volume, mounted `database/init` scripts run and seed data. FastAPI process startup itself currently does not invoke a migration runner. Do not rely on reinitialization of an existing volume to rerun init scripts.
- Never use a developer database/volume for destructive tests. Create and name a dedicated isolated Compose project/database for database integration tests; keep its ports/project separate from the local app and remove only that explicitly scoped disposable test volume when approved by the task.
- The standard frontend Docker image is built from `apps/web` and the normal Compose service has no source bind mount. Source tests or a local build do not prove the running site contains the change. For UI changes, update the approved container, identify its build/image, and verify the live route at affected desktop/mobile sizes before reporting completion.

## Verified checks

- Frontend scripts in `apps/web/package.json`: `npm run lint`, `npx tsc --noEmit`, and `npm run build`.
- API tests run from `backend/api`: `python -m pytest -q` (database tests require the isolated test database configured by the task).
- `scripts/dev.ps1 -Action fresh-test` runs the isolated admin DB integration test and live API health/unauthenticated-admin checks; review the script before use because it creates containers/volumes and invokes Docker.
- Run only checks appropriate to the changed task; do not repeat broad audits or app/container tests for documentation-only work.
