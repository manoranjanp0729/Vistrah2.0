# V3 source import — in progress

Source: V2 GitHub main at pinned commit `90fe80d411ab9142a4e3119c839cf32908b0c0d9` (not necessarily latest local uncommitted V2 work). Destination: isolated branch `feature/v2-source-import`.

**Partial import only:** initial build metadata copied; the web, mobile, backend and assets are **not yet fully imported**. Do not run this branch as an application or merge it as a complete copy.

V2 GitHub tree contains 360 tracked files, including ~81 binary assets. Git object SHA references cannot be reused directly across these two private repositories; each file must be transferred and verified. Preserve existing V3 docs and the shared-contract PR. Do not copy secrets, .env, data volumes, .git, node_modules or local databases.

## Isolation findings from V2 source

V2 Compose supports WEB_PORT/API_PORT and project-scoped named volumes. V3 should use project `vistrah30`, ports 3200/8200, distinct database credentials and named volumes, and must never use V2's compose project. The mobile Expo app uses `in.vistrah.app` Android package and `vistrah` URI scheme; V3 needs distinct identifiers to avoid installing over V2. Current Expo source also requires an independent V3 API URL. V2's payments are sandbox only.

## Verification gates

1. Transfer all selected source files and binary assets, verify counts and Git object checksums.
2. Review copied config and supply private secrets outside Git.
3. Set distinct Android package and URI scheme without changing app UI.
4. Validate compose config and frontend/mobile checks, then perform visual comparison.
5. Never start V3 DB/worker until explicit approval.
