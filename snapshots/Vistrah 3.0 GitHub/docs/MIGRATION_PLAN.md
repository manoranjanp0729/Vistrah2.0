# VISTRAH 3.0 — migration and isolation guardrails

- V2 reference repository: `manoranjan247p-source/Vistrah2.0`, pinned Git tree/commit `90fe80d411ab9142a4e3119c839cf32908b0c0d9`.
- V2 stack identified: Next.js App Router/React/TypeScript frontend, Expo React Native mobile, FastAPI/SQLAlchemy/Alembic backend, PostgreSQL, Docker Compose.
- V2 typography documented as Inter and DM Serif Display; preserve licensed assets and their notices when copying permitted files. Verify exact tokens in source.
- V2 docs/ASSETS.md says official logo asset was not committed. The user has used a custom logo locally: **obtain and verify the actual approved logo before recreating the header**. Do not substitute a guessed mark.
- Do not clone V2 as V3 wholesale. First audit licenses, secrets, old ₹129 membership logic, customer membership gates, admin ownership and migrations; these conflict with updated V3 seller memberships.
- V3 must use unique Compose project, service names/ports and volumes, unique database credentials/secrets and separate staging environment. Never run V2 database migrations against V3 automatically.
- Read-only audit first; frontend fixture-driven implementation second; isolated backend integration third. All Git writes target V3 only.
- Capture and compare V2 screenshots and mobile UI before accepting visual changes; automated tests should cover brand typography, navigation, contrast, responsive layouts and primary flows.
