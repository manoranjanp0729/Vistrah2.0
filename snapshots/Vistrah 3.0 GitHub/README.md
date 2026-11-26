# VISTRAH 3.0

**Expand Your Possibilities.**

VISTRAH is a two-sided services marketplace: customers discover and request services; approved sellers list services, receive leads, advertise and recruit. VISTRAH administrators manage approvals, catalogue, VISTRAH-owned services and platform operations.

## Project status

**Architecture and frontend discovery phase.** No live backend, payment, database migration, or production deployment is authorized. This repository is separate from VISTRAH 2.0.

## Source baseline

Read-only reference: `manoranjan247p-source/Vistrah2.0` at commit `90fe80d411ab9142a4e3119c839cf32908b0c0d9` (do not automatically sync its moving main branch).

Preserve existing approved mobile UI, logo assets, exact theme colours, Inter and DM Serif Display typography, navigation and useful service images. The VISTRAH 2.0 asset inventory says the official logo was not committed there; verify the current locally supplied logo before claiming pixel-perfect preservation.

## Implementation strategy

1. Audit the pinned V2 web/mobile design, assets, dependencies, routes, permissions and business models. Capture desktop and mobile visual references.
2. Define business requirements and frontend/backend contracts before implementation; separate confirmed requirements from decisions pending approval.
3. Implement responsive website and native-mobile visual flows with typed fixture data; customer, seller, and admin journeys must be interactive and testable without a live backend.
4. Review visuals and interactions against V2; get explicit approval before changing branding.
5. Integrate or selectively migrate audited backend modules into an isolated V3 database with additive versioned migrations; never point V3 at V2's volumes or secrets.
6. Add end-to-end, accessibility, security and payment tests; deploy only with approval.

See [business requirements](docs/BUSINESS_REQUIREMENTS.md) and [migration guardrails](docs/MIGRATION_PLAN.md).
