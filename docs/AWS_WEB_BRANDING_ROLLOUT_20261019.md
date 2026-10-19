# AWS web-only branding deployment checklist (2026-10-19)

Status: **PREPARATION ONLY — NOT DEPLOYED**.

## Scope
- New yellow/navy VISTRAH wordmark, shared public header/footer and site icons
- Website (Next.js) **only**. Do not rebuild, recreate, restart or migrate `api`, `worker`, or `db`.
- Source: merged PR #9, main branch. Note: SVGs are scalable recreations; review visual fidelity before production use.

## Preflight gate (on EC2, read-only)
1. Determine the exact live checkout path and whether its remote URL points to `manoranjan247p-source/Vistrah2.0`.
2. Identify Compose project name, active compose files (especially any `compose.cloud.yaml`), `web` service name, mounts, image tags, Docker version and image source.
3. Confirm `main` checkout is the same application revision as the running production website, not an older snapshot. Review `git status`, `git log`, and `git diff` before replacing anything.
4. Confirm backup / rollback image tag and disk space.
5. Verify current HTTPS health, database/API/worker container IDs and status. Record existing web container/image ID.
6. Build/test the candidate image safely **without** applying DB migrations or changing active containers.

## Deployment gate
Proceed **only after** the exact cloud Compose files and source revision are verified. A candidate command for the local `compose.yaml` service definition is:
```sh
docker compose -p vistrah20 -f compose.yaml up -d --no-deps --build web
```
This command is an **illustration, not an authorized EC2 execution command**. The active EC2 project and Compose file(s) may differ. Never use `docker compose up --build` for the entire stack, `down -v`, or `alembic upgrade` as part of this branding change.

## Post-deploy
- Confirm the published site returns HTTP 200 over HTTPS.
- On desktop and mobile check shared header and footer wordmark, layout/sizing and browser icon.
- Smoke-test home, services, navigation, sign-in entry and API proxy health.
- Confirm API, worker, database container IDs and health remain unchanged.
- If web health fails, roll back to the recorded prior web image/revision using the verified production Compose configuration.

## Blocker
GitHub currently has `compose.yaml` but no `compose.cloud.yaml`; the EC2 deployment configuration, current revision and AWS access are not available in this session. No direct rollout should happen until those are verified.
