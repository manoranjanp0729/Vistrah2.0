# Stage 1 — V2 source audit (initial pass)

Baseline: `manoranjan247p-source/Vistrah2.0` commit `90fe80d411ab9142a4e3119c839cf32908b0c0d9`. Read-only; V2 main may move independently.

## Verified from source

- Web: Next.js App Router, React/TypeScript; public, customer, seller and admin route groups. Header in `frontend/components/shell.tsx`; current GitHub Brand is text plus descriptor, **not** the user's approved PNGs.
- Mobile: Expo Router, React Native; tabs, services, account, requests, jobs, provider and location screens. `mobile/src/lib/theme.ts` uses `#000000` page, `#222222` surface, `#343434` border, `#fafafa` text and `#f9aa45` accent. Existing mobile discover hero says 'Discover VISTRAH'; approved replacement headline is 'What can we help you with?'.
- Fonts: locally bundled Inter and DM Serif Display in `frontend/app/fonts/`; license files present. Source `frontend/app/reference-theme.css` sets dark visual tokens.
- Backend: FastAPI, SQLAlchemy, Alembic, PostgreSQL. Existing tables/models include User with `role CUSTOMER|ADMIN` and `seller_enabled`, Category, Subcategory, Service, Provider, ProviderService, ServiceRequest, AuthSession and PasswordReset.
- V2 ProviderService requires approval status; V2 includes seller ownership and publication workflow modules. Audit authorization before reuse.
- V2 stores ₹129 customer membership and gates certain discovery; V3's seller memberships and open customer discovery require **intentional domain change**, not blind migration.
- V2 docs mention mobile/desktop visual validation but this pass has **not captured fresh runtime screenshots**. Do not claim visual parity yet.

## Reuse decisions

| Area | Decision |
| --- | --- |
| Web/Expo frameworks | Retain; create clean V3 application packages |
| Visual tokens/fonts | Preserve after comparing approved assets/screens |
| Logo | Use user-uploaded light horizontal wordmark and dark square emblem; binary files still need Git commit |
| Catalogue | Reuse taxonomy/imagery selectively, check photo licenses and distinct images |
| Auth/session pattern | Review/reuse secure cookie and server role checks, adapt seller account lifecycle |
| Seller publication | Reuse audited approval concepts, not V2 database/records automatically |
| Payments/memberships | Redesign contracts for seller plans, ledger and credits; sandbox first |
| V2 database | No connection, migration, volume sharing or data copy without explicit approval |

## Open audit tasks

Capture fresh screenshots at 1440/390 px and native app; audit current local logos, image licensing, API route definitions, migrations, auth/security and exact typography. Review schema fields and plan migration only when Stage 3 begins. Do not infer V2 running deployment state from GitHub source.
