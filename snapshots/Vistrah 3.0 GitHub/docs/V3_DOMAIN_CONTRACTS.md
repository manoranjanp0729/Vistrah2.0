# VISTRAH 3.0 — domain model and API contract v0.1

**Design draft, not implemented API.** No V3 backend or database is running. Identifiers use opaque strings (UUID recommended). All timestamps ISO 8601 UTC; money stored as integer paise with currency INR. Responses must exclude private verification documents and credentials. Every mutation requires authentication, role/ownership authorization, CSRF/origin protections where relevant, audit trails and idempotency for financial operations.

## Entities

- `Account`: id, name, email, phone?, status, roles (`CUSTOMER`, `SELLER`, `ADMIN`); one identity may be both customer and seller. Admin assigned only by trusted administration.
- `SellerBusiness`: id, ownerAccountId, displayName, businessDetails, verificationStatus (`DRAFT|PENDING|APPROVED|REJECTED|SUSPENDED`), evidence references private.
- `Category`, `Subcategory`, `ServiceDefinition`: discoverable taxonomy, slugs, images, status.
- `ServiceListing`: id, businessId or vistrahOwned, serviceDefinitionId, title, description, priceMode (`FIXED|STARTING_AT|QUOTE`), pricePaise?, images, approvalStatus, availability, coverage. Seller proposes, admin approves; VISTRAH admin owns internal listings.
- `Enquiry`: id, customerAccountId, listingId, message, preferredLocation?, status, sellerResponse?; public listing browsing is membership-free.
- `Order`: id, enquiryId?, listingId, customerAccountId, providerBusinessId?, status, amountPaise?, fulfillmentType, cancellationCutoff. Seller confirms seller fulfillment; VISTRAH confirms VISTRAH-owned fulfillment.
- `MembershipPlan`: BASIC ₹14900, PLUS ₹79900, PREMIUM ₹189900 paise per monthly cycle, entitlements per BUSINESS_REQUIREMENTS.md.
- `SellerSubscription`: id, businessId, planId, currentPeriodStart/End, status; only verified successful renewals grant allowances.
- `EntitlementGrant`: id, businessId, type, quantity, issuedAt, expiresAt?, sourceTransactionId; job credits expire after 90 days; debit with immutable ledger and earliest-expiring-first allocation.
- `JobPosting`: id, businessId, title, description, approvalStatus, publishedAt?, expiresAt?, consumedGrantId?; duration policy pending.
- `MarketingCampaign`: id, businessId, channel, creativeReferences, requestedSpendPaise, allocatedCreditPaise, approvedStatus, dates, reportReferences. Spend requires seller approval and separate billing above allowance.
- `PaymentTransaction`, `CreditLedgerEntry`, `AuditEvent`: immutable financial/security evidence, external references, idempotency keys.

## Proposed REST resources

| Method | Path | Audience | Purpose |
| --- | --- | --- | --- |
| GET | `/api/v1/catalogue` | Public | Categories/services |
| GET | `/api/v1/listings` | Public | Filter approved visible listings |
| GET | `/api/v1/listings/{id}` | Public | Listing details |
| POST | `/api/v1/enquiries` | Customer | Create enquiry |
| GET | `/api/v1/me/enquiries` | Customer | Own enquiries |
| POST | `/api/v1/seller/businesses` | Account | Start business onboarding |
| GET | `/api/v1/seller/businesses/{id}` | Owner | Own business |
| POST | `/api/v1/seller/listings` | Approved seller | Submit listing draft |
| GET | `/api/v1/seller/subscription` | Seller | Plan and entitlements |
| GET | `/api/v1/seller/credits` | Seller | Expiring credit balances |
| POST | `/api/v1/seller/jobs` | Seller | Create draft job; publish consumes credit atomically |
| POST | `/api/v1/seller/campaigns` | Seller | Request marketing campaign |
| GET | `/api/v1/admin/reviews` | Admin | Pending approvals |
| POST | `/api/v1/admin/reviews/{id}/decision` | Admin | Approve/reject with audit |
| GET | `/api/v1/orders/{id}` | Customer/owner/admin | Scoped order |
| POST | `/api/v1/orders/{id}/confirm` | Seller owner/VISTRAH | Confirm correct fulfillment |

## Frontend fixture boundary

Implement typed in-memory fixtures and adapters matching these response shapes. Mark all enquiry, approval, payment and order demo states as **simulation only**; never suggest requests were sent or money charged. UI should not import backend Python models directly. Replace fixture adapter with API client at Stage 3 without rewriting pages.

## Unresolved decisions

Exact payment provider, GST inclusion, subscription cancellation/renewal policy, ad credit rollover, order cancellation timing, hiring post validity, geographic search provider, marketing channels and verification workflow details require separate approval before production contracts are frozen.
