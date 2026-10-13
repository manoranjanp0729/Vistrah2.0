# Module map

Use only rows relevant to the task. Paths describe source, not deployment status.

| Area | Source and verification |
|---|---|
| Public discovery and service routing | `frontend/app/(public)/page.tsx`, `services/page.tsx`, `service/[...segments]/page.tsx`; `frontend/lib/urls.ts`; `frontend/components/catalogue-templates.tsx` |
| Native app and shared phone website | `mobile/src/app/`, `mobile/src/components/`, `mobile/src/lib/api.ts`, `session.tsx`, `theme.ts`, `website-routes.ts`; `mobile/tests/`; `frontend/Dockerfile.phone`, `infra/aws-test/Caddyfile.phone` |
| Independent admin | `admin/app/`, `admin/components/`, `admin/Dockerfile`; admin cookie/proxy boundary remains separate from public web |
| Membership and three service tabs | `frontend/components/service-pathways.tsx`, `service-access.tsx`, `member-information.tsx`; `frontend/lib/service-access.test.ts`; backend `security.py`, `main.py`, `payments.py` |
| Customer/account and API boundary | `frontend/components/customer.tsx`; `frontend/app/api/[...path]/route.ts`; `frontend/lib/api.ts`, `server.ts`; backend `schemas.py`, `models.py`, `recovery.py` |
| Sellers, claims and reviewed publication | Frontend `seller.tsx`, `ownership-claims.tsx`, `publication.tsx`, `provider-onboarding.tsx`; backend `seller_routes.py`, `ownership_contact.py`, `publication_routes.py`, `provider_routes.py`, `provider_models.py`, `provider_requirements.py` |
| Customer location and nearby providers | Frontend components `customer-location.tsx`, `nearby-providers.tsx`, `location-map.tsx`, `business-location.tsx`, plus `frontend/lib/location.ts`, native `mobile/src/lib/location.tsx`; backend `location_routes.py`, `location_schemas.py`; tests `backend/tests/test_location_services.py`, `frontend/lib/location.test.ts`, `frontend/scripts/location-browser-check.mjs` |
| Finds/workflow execution | Frontend `finds.tsx`, `admin-workflows.tsx`; backend `workflow_engine.py`, `workflow_routes.py`, `workflow_models.py`, `workflow_integrations.py`, `workflow_worker.py`, `action_registry.py` |
| Public jobs and acquisition | Frontend `vacancies.tsx`, `admin-job-sources.tsx`, `service-explore.tsx`; backend `discovery_routes.py`, `discovery_service.py`, `discovery_models.py`, `job_sources.py` |
| Shared presentation | `frontend/components/shell.tsx`, `ui.tsx`, `context-help.tsx`, `visual.tsx`; `frontend/app/globals.css`, `frontend/app/reference-theme.css`; `frontend/public/` |
| Database/schema | `backend/app/database.py`, `models.py`, domain model files; `backend/migrations/versions/`, `backend/alembic.ini`; `backend/tests/conftest.py` |
| Homepage configuration/editor (planned) | Phase 3 in `docs/PRODUCTION_PLAN.md`; current homepage UI is source-composed. Provider requirement/publication editors are different features. |
| Environment and phase gates | `docs/ENVIRONMENTS.md`, `docs/PRODUCTION_PLAN.md`, root/mobile env examples, `scripts/check-environment.py`, `scripts/tests/test_environment.py`, `scripts/start-local.ps1` |
| Runtime and configuration | `compose.yaml`: `web`, `api`, `worker`, `db`, `admin`; `frontend/Dockerfile`, `backend/Dockerfile`; frontend `package.json`, backend `requirements.txt`/`requirements.lock`; `shared/catalogue.json` |

Frontend component names above are relative to `frontend/components/`; backend module names are relative to `backend/app/`. `services/page.tsx` and `service/[...segments]/page.tsx` are under the public route group. Tests are in `frontend/lib/`, `frontend/scripts/`, `frontend/e2e/` and `backend/tests/`; explicit QA utilities are under `scripts/`.

Existing references: [architecture](ARCHITECTURE.md), [API](API.md), [security](SECURITY.md), [workflows](WORKFLOWS.md), [provider onboarding](PROVIDER_ONBOARDING.md), [refinement backlog](REFINEMENT_BACKLOG.md), [validation](VALIDATION.md). Do not read them all by default.
