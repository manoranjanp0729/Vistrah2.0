# VISTRAH Codex Lean Mode

Scope: this repository at `E:\Vistrah 2.0`. Do not access or edit `E:\Vistra V.1`.

## Work efficiently

- Use [module-map](docs/module-map.md) to locate relevant code and [current-task](docs/current-task.md) for the handoff. Read each once; reuse unchanged documentation.
- Inspect only files needed for the requested task. Prefer scoped `rg` searches and small reads. Do not scan the whole repository or Git history.
- Exclude dependency trees, `.venv`, `.tools` caches, `.next`, artifacts and generated files from exploration. Read an exact dependency guide only when applicable frontend instructions require it.
- Existing [architecture](docs/ARCHITECTURE.md) and planning documents are authoritative references; read additional documents only when relevant or explicitly requested. Do not create duplicate documentation.
- Prefer minimal diffs. Preserve working behavior and existing user edits. Never perform unrelated refactoring or automatically implement optional improvements.
- Avoid dependency installations and full Docker rebuilds unless necessary for the authorized task.
- Run the smallest relevant verification first. Broaden only for a concrete unresolved concern. Documentation-only changes need path/content checks, not application tests or builds.
- After two unsuccessful repair attempts on the same issue, stop debugging. Report the blocker and attempts, and await user direction; do not enter repeated debugging loops.
- Keep final reports under 100 words: result, relevant verification, blockers and requested next action.

## Preserve project boundaries

- Follow `frontend/AGENTS.md` for frontend work; consult only its relevant Next.js guide.
- Preserve I1 membership enforcement, I2 three service tabs, positioning, seller ownership, listing approvals and the shared business/listing models.
- Customer location is temporary unless explicitly saved. GPS requires **Use my location**; retain manual fallback and location privacy. Live map/geocoder providers remain unapproved.
- Test database writes only with verified disposable data. Never migrate/seed the normal database or alter/delete normal volumes as part of routine verification.
- Do not restart normal containers, rebuild/replace the frontend, deploy, change DNS, enable paid services, commit or push unless explicitly authorized for that action. Finish reviewable source changes and verification before requesting such approval.
- API startup runs migrations and seeding (`backend/Dockerfile`); a normal API rebuild/restart is not a harmless verification step.
- Stop without editing if required workspace writes are denied. Report unknown facts rather than inventing paths, modules or commercial decisions.

## Maintain the handoff

Update `docs/current-task.md` concisely when task status changes: scope, relevant paths, completed verification, blockers and next authorized step. Distinguish source evidence from the running build. Do not resume paused development merely because it appears in the handoff.
