# VISTRAH application architecture

## Frontend layers

- `apps/web/app/` contains Next.js routes. Catalogue routes are thin adapters that resolve URL parameters and delegate rendering to the catalogue feature.
- `apps/web/features/catalogue/` owns normalized catalogue data, lookup functions, and reusable category, subcategory, and service templates.
- `apps/web/app/components/PublicPageTemplates.tsx` and its stylesheet own shared public page framing, sections, cards, and layout primitives. Catalogue templates compose these primitives rather than recreating them.
- `apps/web/app/data/` remains the adapter source for the existing category, marketing request, civil/construction, provider, and image records. Existing custom workflows continue to use their existing data and UI.

## Catalogue routing

| URL shape | Resolution | Rendering |
| --- | --- | --- |
| `/service/{category}` | Category lookup | `CategoryPage` |
| `/service/{category}/{slug}` | Subcategory lookup first, then direct service lookup | `SubcategoryPage` or `ServicePage` |
| `/service/{category}/{subcategory}/{service}` | Service lookup within category and subcategory | `ServicePage` |

The subcategory-first rule preserves existing category/subcategory URLs. Existing static Civil & Construction and Marketing route adapters remain in place where they preserve legacy path behavior. Provider and marketing request routes retain their custom flow. Add a static Next route only when a path needs custom interactions or priority that catalogue data cannot express.

Authentication, account, request, payment, and admin workflows are separate from public catalogue templates. The admin layout continues to use the conditional public header/footer boundary.

## How to add a new category, subcategory, or service

Use kebab-case slugs and keep each slug unique within its category or subcategory.

### Add a category

1. Add a `CatalogueCategory` to `additionalCategories` in `apps/web/features/catalogue/data/categories.ts` (`slug`, `title`, `eyebrow`, `description`, optional `image`, and `listing`). Set `listing` to `subcategories` when its landing page should list subcategories; otherwise it lists direct services.
2. Add any direct services to `additionalServices` in `apps/web/features/catalogue/data/services.ts`, setting `categorySlug` to the new category slug.
3. For a category with subcategories, add those entries to `additionalSubcategories` in `apps/web/features/catalogue/data/subcategories.ts`, then add their services to `additionalServices` with matching `categorySlug` and `subcategorySlug`.

The homepage automatically includes categories in `additionalCategories` that are not already supplied by its API data. No route file is needed.

### Add a subcategory

1. Add a `CatalogueSubcategory` to `additionalSubcategories` with `categorySlug`, `slug`, `title`, `description`, and `image`.
2. Set the parent category's `listing` to `subcategories`.
3. Add its services to `additionalServices` with both slugs.

The route `/service/{categorySlug}/{subcategorySlug}` and nested service routes resolve from these records automatically.

### Add a service

Add a `CatalogueService` to `additionalServices` in `apps/web/features/catalogue/data/services.ts`. Required fields are `categorySlug`, `slug`, `title`, `description`, `eyebrow`, `backHref`, and `backLabel`; `image`, `status`, `cta`, and `providerNavigation` are optional. For a direct category service omit `subcategorySlug`; for a nested service provide it.

Direct service URLs use `/service/{categorySlug}/{serviceSlug}`. Nested service URLs use `/service/{categorySlug}/{subcategorySlug}/{serviceSlug}`. Existing Marketing request forms remain custom: their request fields are defined in `apps/web/app/data/marketing.ts`, and their interaction is implemented in the Marketing request route. Keep those records there when adding another interactive request form.

Images can use the shared placeholder. To register a new local image for the catalogue, update `apps/web/app/data/serviceImages.ts` and reference it from the catalogue record.

## Existing architecture boundaries

The current catalogue data is partly adapted from `app/data/categoryServices.ts`, `marketing.ts`, and `civil.ts`; these are kept as the source of truth for established listings and workflows. New generic entries belong in the `additional*` arrays above. This adapter boundary avoids duplicating established business data while allowing new pages to be data-driven. Marketing forms, provider details, authentication/account, and admin screens remain specialized because they have distinct interactions and access rules.

## Membership, payments, and settlement foundation

Phase 3 adds dedicated membership, payment, allocation, refund, settlement, webhook, and reconciliation domains in the API, with additive PostgreSQL objects in `database/migrations/20261008_membership_payments.sql`. Membership plans and offers are stored records; no fake customer offers are seeded. The initial sandbox plan is ?129 per month. Customer membership status and payment history come from authenticated APIs. `/membership` and `/sandbox-checkout` are dedicated workflow pages.

Checkout amounts and service ownership are derived by the API. Each transaction snapshots its selected settlement rule and recipient identities before checkout. Verified success events append allocation ledger rows; refunds append proportional reversal rows, leaving original ledger entries intact. Webhooks require HMAC verification and unique gateway event IDs for replay safety. The gateway adapter currently enables only `SANDBOX`; sandbox actions exercise the same event processing path and never move money.

Recipients start unverified. Onboarding produces a gateway account reference, while only a verified signed gateway event can mark a recipient eligible. Settlement submission checks active status, onboarding, verification, eligibility, and reference. Reconciliation currently checks the local ledger for allocation/refund mismatches, stale pending payments, failed settlements, and refunds after settlement. Production reconciliation must also import and compare gateway settlement and payout reports.

### Adding plans, offers, and allocation rules

Create plans and offers through the admin membership screens or `/api/v1/admin/membership/*`. Offers should remain inactive until reviewed and have explicit dates, scope, benefit, and terms. Create settlement recipients through `/api/v1/admin/payment-recipients`, complete the gateway onboarding flow, and wait for the signed verification event before using them in a rule. Allocation rules are created through `/api/v1/admin/settlement-rules`; percentage/fixed targets must balance exactly to the transaction amount when selected. Rule changes affect new checkouts only; each existing checkout retains its saved snapshot.

### Production activation sequence (not enabled)

1. Select and contract a payment provider that supports subscriptions, marketplace splits, refunds, recipient onboarding, settlements, signed webhooks, and downloadable reconciliation reports.
2. Implement and review a provider adapter and provider-specific webhook verification; retain idempotency, amount/currency checks, immutable ledger, and replay handling.
3. Complete legal, tax, KYC/AML, privacy, refund, and settlement-policy review; onboard the platform and each recipient through the provider. Store credentials in a managed secret store and rotate webhook secrets.
4. Apply the additive migration with a controlled backup/release; configure the production adapter, allowed origins, webhook endpoint, monitoring, and provider report import. Run provider sandbox certification and reconciliation before any live payment.
5. Obtain explicit business/finance approval, then enable live mode behind an operational feature flag with limits, alerts, refund and payout runbooks, and daily reconciliation. Production mode remains unavailable in this codebase until those gates and adapter work are complete.
