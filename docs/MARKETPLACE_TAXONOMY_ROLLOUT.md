# Marketplace taxonomy reconciliation gate

The canonical 13-category, 117-subcategory, 695-listing-type specification lives in `shared/marketplace-taxonomy.json`. It is **not** the currently published database catalogue. Do not call `seed()` to remap existing records: `catalogue-v1` deliberately skips already bootstrapped databases.

Existing data has eight top-level categories: `jobs-careers`, `real-estate`, `civil-construction`, `marketing`, `tax-compliance`, `it-technology`, `business-services`, `local-professional-services`. The last seven are **not** safe one-to-one replacements for the new hierarchy. Preserve all category, subcategory, service, provider-service, enquiry, review, and commerce foreign keys and existing public URLs until mapping is reviewed.

## Proposed non-destructive rollout

1. Export counts and associations for every existing category, subcategory and service ID, including inactive rows, providers, requests and commerce listings, from a read-only snapshot.
2. Reconcile each legacy service by ID with a new category/subcategory/type. Flag ambiguous services for human review; do not guess based on names. Retain old slugs as redirects only after verifying target and link compatibility.
3. Add additive schema for ordered taxonomy nodes, category-specific attributes and alias mappings, with reversible migration and no implicit updates to existing FKs.
4. Seed only missing nodes using stable slugs and explicit sort order. Separate seller-created listing instances from service/type definitions; cross-category discovery must reference one listing ID.
5. Update web/mobile category routes, search, seller onboarding, commerce forms, admin editing and review with shared API contracts; enforce server-side validation and authorization.
6. Test migration against a disposable copy with legacy IDs and associations, verify rollback, and approve production backup/write window separately.

Do not show all proposed listing types as available inventory before providers have published and been approved. VISTRAH Ads & Marketing remains outside the 13-category marketplace, distinct from independent providers in Professional Services → Marketing & Branding.
