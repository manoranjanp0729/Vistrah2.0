# VISTRAH functionality matrix

| Capability | Data source | Page/template | Behavior |
| --- | --- | --- | --- |
| Category directory | API categories plus catalogue category adapter/extensions | Homepage and `CategoryPage` | Browse categories; category page lists direct services or subcategories |
| Subcategory directory | Marketing/outdoor adapters plus `additionalSubcategories` | `SubcategoryPage` | Browse services within a category |
| Generic service detail | Legacy adapters plus `additionalServices` | `ServicePage` | Shared detail page with configured return action |
| Marketing request | `app/data/marketing.ts` request records and field definitions | Dedicated Marketing request form | Collects the existing service-specific request fields |
| Outdoor provider directory | Civil/provider data | Provider directory route | Lists configured providers |
| RayShade provider/service | `app/data/civil.ts` | Provider-specific routes and shared catalogue service display | Preserves provider identity and service navigation |
| Authentication and account | Existing auth/account implementation | Dedicated auth/account routes | Custom identity and account behavior |
| Requests and payments | Existing request/payment implementation | Dedicated workflow routes | Transaction-specific behavior, separate from catalogue pages |
| Administration | Existing admin implementation | `/admin/*` | Admin workflow with public shell excluded |

Generic catalogue pages share three feature templates and the public page primitives. Specialized workflows retain dedicated screens where they collect input, handle identity, transact, or enforce administrative access.

| Membership and offers | `subscription_plans`, `memberships`, `membership_offers` | `/membership`, `/admin/membership` | Server-priced checkout; user-scoped status; offers filtered by active window and scope |
| Payment checkout and history | `payment_transactions`, membership transaction links | Membership and service payment APIs; `/sandbox-checkout` | Sandbox adapter only; verified signed events change transaction state |
| Allocation and settlement | Settlement rules, targets, immutable allocation and reversal rows, recipient records, settlements | `/admin/payments` | Checkout snapshots rule targets; refunds append reversals; settlement is blocked until signed recipient verification |
| Webhooks and reconciliation | Webhook event log, reconciliation runs/issues | API webhook route and admin payments screen | HMAC verification and idempotent event IDs; local ledger checks only, no provider report import yet |

Production gateway setup, KYC, secrets, report import, sandbox certification, and explicit finance approval are prerequisites to live money; this phase does not enable it. See [ARCHITECTURE.md](ARCHITECTURE.md) for exact activation and extension steps.
