# VISTRAH Admin

Independent Next.js admin web application. Source, package/lockfile, build and deployment are separate from `frontend/` and `mobile/`. Reuses the existing FastAPI backend and existing administrator accounts; there is no new database or admin provisioning endpoint.

## Run locally in Windows PowerShell

Start the existing backend first. In a new window:

```powershell
Set-Location 'E:\Vistrah 2.0\admin'
npm.cmd ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm.cmd run dev
```

Open http://localhost:3200. Sign in with an existing administrator account. Customer accounts are denied. Keep this window open. Default API address is configured in `.env.local` as http://127.0.0.1:8100; adjust if needed.

## Docker

With the existing API already running, build/start only the new application:

```powershell
Set-Location 'E:\Vistrah 2.0'
docker compose -p vistrah20 -f compose.yaml up -d --no-deps --build admin
```

Compose exposes localhost:${ADMIN_PORT:-3200}; the container uses port 3000. Set ADMIN_APP_URL to this app's public HTTPS URL when deploying separately. The customer website's old `/admin` routes redirect there (default http://localhost:3200); applying those redirects to a running website requires its own rebuild.

Admin sign-in uses a separate HttpOnly cookie `vistrah_admin_session`. Cookies are not isolated by port, so distinct names prevent overwriting the customer session. Admin proxy forwards only admin endpoints, login/logout, identity and health; checks administrator role before forwarding admin requests; backend role checks remain authoritative. Mutation origins must match ALLOWED_ORIGINS. Use COOKIE_SECURE=true with HTTPS and separate hostnames in production. Do not expose development servers publicly.

Existing overview, request reviews/estimates, providers, catalogue, offers, payments, audit, jobs, workflow operations, provider applications/requirements, ownership claims and publication review remain at `/admin/...`.

Validation: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`. With Python installed, `python scripts/check-isolation.py` runs isolated HTTP checks without touching the normal backend/database. Full browser interaction and production deployment require their own review.
