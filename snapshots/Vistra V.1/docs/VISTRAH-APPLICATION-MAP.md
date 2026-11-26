# VISTRAH application map

## Public application

| Area | URL or location | Responsibility |
| --- | --- | --- |
| Homepage and category directory | `/` | Public landing page and service category discovery |
| Category | `/service/{category}` | Lists direct services or subcategories using `features/catalogue/pages/CategoryPage.tsx` |
| Subcategory | `/service/{category}/{subcategory}` | Lists normalized catalogue services using `SubcategoryPage.tsx` |
| Direct service | `/service/{category}/{service}` | Shows service detail using `ServicePage.tsx`; second-segment route checks subcategory data first |
| Nested service | `/service/{category}/{subcategory}/{service}` | Shows a service within a subcategory using `ServicePage.tsx` |
| Marketing request | `/service/marketing/{subcategory}/{service}` | Custom request form and field workflow; existing URLs are preserved |
| Outdoor provider directory | `/service/civil-construction/outdoor-lifestyle-design/retractable-roofing/companies` | Lists currently configured providers |
| Provider detail | `/service/civil-construction/outdoor-lifestyle-design/retractable-roofing/companies/{provider}` | Provider-specific information and service options |
| Public shell primitives | `app/components/PublicPageTemplates.tsx` | Shared public header/footer framing, breadcrumbs, sections, and card grid |

## Catalogue data flow

`app/data/*` legacy records and `features/catalogue/data/additional*` extension records are adapted by catalogue lookup functions. Next route adapters resolve the URL and render one of three shared catalogue templates: `CategoryPage`, `SubcategoryPage`, or `ServicePage`. The homepage merges extension categories only when the API has not supplied the same category.

## Specialized workflow boundaries

- Marketing request forms retain their dedicated client form and request-field definitions.
- RayShade provider routes retain provider-specific records and navigation.
- Login, authentication, account, request, and payment flows remain outside generic catalogue rendering.
- Admin routes remain isolated from the public header and footer through the conditional shell components.

## Extension points

Add a generic category in `features/catalogue/data/categories.ts`, a subcategory in `features/catalogue/data/subcategories.ts`, and services in `features/catalogue/data/services.ts`. These records automatically resolve through the dynamic route adapters. See [ARCHITECTURE.md](ARCHITECTURE.md) for exact record shapes and URL behavior.

## Membership and payment workflows

- `/membership` shows the stored plan, the signed-in user's membership state, and only currently active, in-window offers.
- `/sandbox-checkout` is the local payment simulation. `/api/v1/membership/*`, `/api/v1/payments/*`, and `/api/v1/webhooks/{gateway}` own checkout, status, and signed event processing.
- `/admin/membership` manages plans, offers, membership status, and membership transactions.
- `/admin/payments` manages allocation rules, recipients, onboarding, refunds, settlements, and reconciliation.

The current adapter is sandbox-only. Recipient verification and payment success are event-driven; admins cannot set verified/eligible state directly. See [ARCHITECTURE.md](ARCHITECTURE.md) for ledger guarantees, extension steps, and the production activation sequence.
