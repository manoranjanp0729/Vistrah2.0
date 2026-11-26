# VISTRAH 3.0 isolated local launch (not a production deployment)

This checklist uses only the V3 checkout. Never use V2 credentials, database volumes, or Compose project names. V3 is not ready until its original binary assets have been imported and verified.

## 1. Checkout and import original assets

In PowerShell, with a clean V3 checkout:

```powershell
cd "E:\\Vistrah 3.0"
git fetch origin
git switch feature/v2-source-import
git pull --ff-only origin feature/v2-source-import
.\\scripts\\import-v2-assets.ps1 -V2Root "E:\\Vistrah 2.0"
.\\scripts\\check-v3-readiness.ps1 -V2Root "E:\\Vistrah 2.0"
git status --short
```

Review the asset additions before committing them to V3. Do not commit secrets or local environment files. The import copies assets only from V2 into V3; it does not change V2.

## 2. Configure V3 secrets and ports

```powershell
Copy-Item config/v3.env.example .env.v3
# Edit .env.v3: set a unique strong POSTGRES_PASSWORD and, if desired, a unique JWT_SECRET.
# Keep APP_ENV=development for local testing.
docker compose --env-file .env.v3 -f compose.yaml -f compose.v3.yaml config --quiet
```

**Important:** V3 uses project `vistrah30`, website port 3200, API port 8200, and its own Postgres volumes. The worker is disabled by default. Do not run migration or reset commands against V2. Inspect the resolved Compose config before starting.

## 3. Start V3 only

```powershell
docker compose --env-file .env.v3 -f compose.yaml -f compose.v3.yaml up -d --build db api web
docker compose --env-file .env.v3 -f compose.yaml -f compose.v3.yaml ps
Invoke-WebRequest http://127.0.0.1:8200/health
Invoke-WebRequest http://127.0.0.1:3200/api/health
```

Visit http://localhost:3200. Check all customer, seller, admin, category, search, photo and location flows against V2. Running containers and passing health checks do **not** establish functional or visual parity.

## 4. Mobile (Expo)

```powershell
cd mobile
Copy-Item .env.example .env
npm install
npm run typecheck
npm test
npx expo start
```

For Android emulator, `10.0.2.2` maps to the host machine. For a physical device, set `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_WEB_URL` to your computer's reachable LAN address and make the V3 API/web ports reachable only on your trusted network. Do not expose V2 or reuse its credentials. Expo Go compatibility is not guaranteed; a development build may be required.

## 5. Safety and release gate

Keep the V3 branch unmerged until assets, backend migrations, frontend builds, mobile typecheck, API tests and visual parity have passed. Do not deploy publicly, publish Android/iOS builds, or activate live payments without explicit approval.
