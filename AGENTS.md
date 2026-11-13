# VISTRAH Codex Lean Mode

Scope: this repository at `E:\Vistrah 2.0`. Do not access or edit `E:\Vistra V.1`.

## Work efficiently

- Use [module-map](docs/module-map.md) to locate relevant code and [current-task](docs/current-task.md) for the handoff. Read each once; reuse unchanged documentation.
- Inspect only files needed for the requested task. Prefer scoped `rg` searches and small reads. Do not scan the whole repository or Git history.
- Exclude dependency trees, `.venv`, `.tools` caches, `.next`, artifacts and generated files from exploration. Read an exact dependency guide only when applicable frontend instructions require it.
- Use [production phases](docs/PRODUCTION_PLAN.md) and [environment boundaries](docs/ENVIRONMENTS.md) for production implementation; respect phase completion gates and distinguish templates from deployable runtime.
- Existing [architecture](docs/ARCHITECTURE.md) and planning documents are authoritative references; read additional documents only when relevant or explicitly requested. Do not create duplicate documentation.
- Prefer minimal diffs and keep changes strictly specific. Preserve working behavior and existing user edits. Never perform unrelated refactoring or automatically implement optional improvements.
- Avoid dependency installations and full Docker rebuilds unless necessary for the authorized task.
- Keep tests, verification, and iterations minimal to save time: run only the smallest relevant check directly tied to the change. Never run multiple test suites repeatedly for localized edits; avoid redundant verification loops.
- After two unsuccessful repair attempts on the same issue, stop debugging. Report the blocker and attempts, and await user direction; do not enter repeated debugging loops.
- Keep final reports under 100 words: result, relevant verification, blockers and requested next action.

## Preserve project boundaries

- Follow `frontend/AGENTS.md` for frontend work; consult only its relevant Next.js guide.
- Always consider security aspects: ensure strict access control, fail-closed authorization, safe credential and input handling, and secure data boundaries are respected with every specific change.
- Preserve I1 membership enforcement, I2 three service tabs, positioning, seller ownership, listing approvals and the shared business/listing models.
- Customer location is temporary unless explicitly saved. GPS requires **Use my location**; retain manual fallback and location privacy. Use the existing approved MapTiler configuration; new map/geocoder providers or billing changes require separate authorization.
- Test database writes only with verified disposable data. Never migrate/seed the normal database or alter/delete normal volumes as part of routine verification.
- Do not restart normal containers, rebuild/replace the frontend, deploy, change DNS, enable paid services, commit or push unless explicitly authorized for that action. Finish reviewable source changes and verification before requesting such approval.
- The default API image command migrates/seeds (`backend/Dockerfile`); the controlled `compose.api-runtime.yaml` runs Uvicorn directly. Inspect the actual container command before restart; never migrate/seed normal data during routine verification.
- Production env validation does not establish live paid access. Preserve fail-closed sandbox/production membership separation until the live gateway/entitlement phase is implemented.
- Stop without editing if required workspace writes are denied. Report unknown facts rather than inventing paths, modules or commercial decisions.

## Maintain the handoff

Update `docs/current-task.md` concisely when task status changes: scope, relevant paths, completed verification, blockers and next authorized step. Distinguish source evidence from the running build. Do not resume paused development merely because it appears in the handoff.
