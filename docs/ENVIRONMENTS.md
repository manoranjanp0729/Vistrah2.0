# Environment boundaries and local startup

Environment templates are public examples. Existing private environment files,
local EAS project linkage, signing keys and databases must be preserved.
Do not replace a working `.env` just to pick up a new template.

| Environment | Configuration | Boundary |
|---|---|---|
| Local Docker | Root `.env` based on `.env.example` | Existing `vistrah20` project; web 3100, API 8100, admin 3200; private PostgreSQL volume. |
| Local mobile browser | Existing `mobile/.env` plus API URL override, or `.env.browser.example` | Expo localhost:8082; loopback proxy 18100 forwards to API 8100. Both windows must stay open. |
| Native development | `mobile/.env.example` | Android emulator API 10.0.2.2:8100; a physical device needs a reachable development API. Loopback proxy is not a physical-phone endpoint. |
| Disposable integration testing | Private `.env.test` from `.env.test.example` | Separate `vistrah-test` project/database/volumes; web 3111, API 8111, admin 3211. Never apply this to `vistrah20`. |
| Production preparation | Private `.env.production` and native public-endpoint configuration | Exact HTTPS origins, secure cookies, private credentials, no normal startup seeds. This template alone does not create a production deployment. |

## Validate values without changing runtime

Python 3 standard library is sufficient; no project dependencies are needed.
Shell environment variables for recognized fields override values from the file,
matching Compose's environment precedence. The parser accepts simple unquoted
or quoted `KEY=value` lines, comments and optional `export`; it does not execute
shell text or expand variable interpolation.

```powershell
cd "E:\Vistrah 2.0"
python .\scripts\check-environment.py --env-file .env --mode development
```

For test preparation, copy only if the private file does not already exist:

```powershell
if (-not (Test-Path .env.test)) { Copy-Item .env.test.example .env.test }
python .\scripts\check-environment.py --env-file .env.test --mode test --compose-project vistrah-test
```

Test-mode checks reject the normal project/database/ports. Commands that actually
start test containers must still explicitly specify both the test env file and
test project. Never point backend test fixtures at the normal database. Schema
bootstrap and fixtures belong only to the disposable test environment.

Production example validation is expected to fail until real credentials are
supplied privately. Use a randomly generated URL-safe PostgreSQL password of at
least 16 characters and a random JWT signing secret of at least 32 characters.
The current Compose connection string interpolates the password into a URL;
the validator therefore requires URL-safe password characters. Do not paste
credentials into chat or commit them.

```powershell
python .\scripts\check-environment.py --env-file .env.production --mode production
```

Passing this check validates values only. It does not verify DNS, certificate
issuance, SMTP, data restoration, gateway capture or production entitlements.
Current sandbox memberships deliberately do not grant access under
`APP_ENV=production`; live payment/entitlement work is Phase 5. The existing
AWS test Compose explicitly uses development mode and is not the production
runtime. Phase 7 provides staging/runtime wiring after the application gates.

## Resume the existing local application after a Windows restart

Open Docker Desktop and wait for its Linux engine to run. Preflight first:

```powershell
cd "E:\Vistrah 2.0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
```

To resume the existing containers, run the explicit action:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-local.ps1 -Start
```

The helper requires the existing db/api/admin/web containers, refuses a
migration/seed API command, uses `--no-build --no-recreate`, waits for health and
checks the API. It does not create a fresh database or replace containers. If a
preflight fails, inspect the reported condition before taking another action.
Worker launch/acquisition and frontend rebuilds are separate explicit actions.

## Mobile browser preview: two windows

Proxy window, kept open:

```powershell
cd "E:\Vistrah 2.0"
node .\mobile\scripts\dev-api-proxy.cjs
```

Expo window, kept open:

```powershell
cd "E:\Vistrah 2.0\mobile"
$env:EXPO_PUBLIC_API_URL = "http://127.0.0.1:18100"
npx.cmd expo start --web --clear --port 8082
```

Use localhost:8082 and a full browser reload to re-run startup loading. The proxy
is for the PC browser only. When installing dependencies, stop Expo first;
Windows may keep native dependency files locked. Do not use forced dependency
upgrades to bypass install/file-lock problems.

Native APKs use their build-profile endpoint configuration. Public variables
are bundled and must contain no secrets. `aws-test` remains an internal APK
profile pointed at the domain; it does not prove the backend is online or that
the application is production-ready. Production signing/store channels are
completed in Phase 8. Native modules, splash settings and launcher icon changes
require a new native build.
