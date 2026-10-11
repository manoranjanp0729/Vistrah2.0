# Service landing pages and Explore listings

Implemented locally on 9 October 2026. The shared service template covers all
59 active catalogue services in eight categories, including the four nested
Outdoor & Lifestyle services. Catalogue category/subcategory pages remain
selection indexes: customers choose an actual service before submitting an
enquiry. The category hero now points to its service chooser.

## Audit and implementation

The existing FastAPI `/requests` operation validates an active catalogue service,
requires authentication and saves the request against its owner. `/me/requests`
returns only the customer's records. No new enquiry endpoint was necessary.
The provider APIs already validate active categories/subcategories/services and
return only active, VERIFIED providers with an explicit service association.
Their detail operation also checks that association. No ownership/in-house field,
live chat integration or service/provider recommendation engine exists in the
current models or configuration. Finds job scoring is a separate private workflow,
not a recommendation capability for every service.

The six cards appear in this order before Explore:

| Pathway | Behavior |
|---|---|
| Mail Enquiry | Opens the existing authenticated service request form with the real service selected. Validated requirements/location/phone are saved and a request ID/status confirmation is shown. The form explicitly explains that it saves an enquiry, rather than sending SMTP email. |
| Chat Now | Explicitly says live chat is unavailable; opens the same service's contact enquiry. No simulated session or online status. |
| Email VISTRAH | Direct `mailto:info@vistrah.in` link, centralized in `frontend/lib/contact.ts`. Missing/invalid email values use the existing saved contact-enquiry form. Mail Enquiry remains a separate backend request submission. |
| Explore Service Providers | Opens the selected service's public directory. Displays supplied company/contact name/location/verification status; actual phone/email are available on detail pages. No ratings, prices or availability are inferred. Empty directories offer the service enquiry. |
| VISTRAH Recommendations | Opens an enquiry for human review based on requirements; explicitly explains that it is not automated. |
| VISTRAH In-house | Explains that no explicitly classified in-house offering exists in the current catalogue; offers a delivery-options enquiry without claiming VISTRAH ownership or delivery. Third-party records are never reclassified. |

Known enquiry purposes are validated against a fixed allowlist. The purpose
survives registration/sign-in through the existing `next` parameter. Contact,
recommendation and delivery enquiries store a short purpose prefix in the existing
requirements field. The textarea allowance accounts for this prefix and stays
within the server's 5,000-character limit. Customer-entered requirements still
need at least 20 characters. Unknown/repeated purpose parameters fall back to a
normal service enquiry. These labels are request text, not ownership assertions.

## Routes

Existing service/request and outdoor provider URLs are preserved. Direct services
gain these provider routes:

```text
/service/{category}/service/{service}/companies
/service/{category}/service/{service}/companies/{providerSlug}
```

Nested services retain:

```text
/service/{category}/{subcategory}/{service}/companies
/service/{category}/{subcategory}/{service}/companies/{providerSlug}
```

Unknown services/providers return 404. All provider data comes from the existing
service-filtered server API. Service cards lead to service landing pages, and
none of the six cards requires the generic contact page.

## Explore availability and source access

| Category | External feed |
|---|---|
| Jobs & Careers | Existing public `/jobs?page=1` cache, up to three preview cards, plus `/jobs` and `/jobs/{id}`. Reuses the existing vacancy renderer and original source links. |
| Real Estate | Disabled: no authorized property feed implemented. |
| Civil & Construction | Disabled: no authorized tender/project/contract feed implemented. |
| Marketing | Disabled: no authorized external opportunity/provider feed implemented. |
| Tax & Compliance | Disabled: no authorized external resource/provider feed implemented. |
| IT & Technology | Disabled: no authorized opportunity/resource feed implemented. |
| Business Services | Disabled: no authorized opportunity/resource feed implemented. |
| Local & Professional Services | Disabled: no authorized external opportunity/provider feed implemented. |

Jobs previews are public source listings, not personalized matches. Source name,
source record ID, attribution, original URL, publication/deadline when supplied,
first observation, actual successful retrieval and last check remain distinct in
the existing records/cards. No refresh, worker or third-party request is triggered
by browsing a landing page. Existing acquisition normalization, deduplication,
budgets, backoff, authorization and revoked-access publication checks are reused.
Empty and failed cache reads have distinct availability states.

No source was enabled or configured in this task. Existing Remotive access and
attribution rules remain as documented in [JOB_SOURCES.md](JOB_SOURCES.md),
including its 24-hour API delay and unconfirmed open status. Existing Adzuna
access remains disabled/unconfigured pending server credentials and appropriate
commercial permission. No third-party live acquisition was used for validation.

`frontend/lib/explore.ts` provides the disabled category registry, result contract
and a future `CategoryListingAdapter` contract. Future adapters must document
permission evidence, normalize/deduplicate records, bound I/O, distinguish errors
from empty data, retain original IDs/URLs/attribution and retrieval/publication/
update dates, and keep credentials server-side. Each optional image requires its
own rights evidence. No new adapters, scrapers, credentials or external images
are enabled. Current listings use text cards; existing service photographs remain
service context and are never presented as photographs of a vacancy/provider.

Registered providers, public external listings and VISTRAH delivery options are
separate concepts in the UI. Unavailable Explore sections link to actual
service-filtered registered directories, without presenting those records as an
acquired external feed.

## Changed files

- `frontend/components/service-pathways.tsx`, `service-explore.tsx`: reusable cards and category Explore section.
- `frontend/lib/service-pathways.ts`, `explore.ts`, `contact.ts`: pathway/enquiry purposes, feed/adapter contracts and shared official public email.
- `frontend/lib/urls.ts`: provider URL generation and resolution for direct services.
- `frontend/components/catalogue-templates.tsx`: service integration, provider routes and honest directory empty states.
- `frontend/components/customer.tsx`: enquiry explanations, sign-in continuation and saved purpose.
- `frontend/app/(public)/service/[...segments]/page.tsx`: allowlisted enquiry purpose from server query parameters.
- `frontend/components/ui.tsx`, `shell.tsx`, `frontend/app/(public)/call-vistrah/page.tsx`: reuse the official contact token.
- `frontend/app/globals.css`: responsive card grids using existing fonts, green palette, spacing and radius tokens.
- `frontend/lib/service-pathways.test.ts`, `explore.test.ts`, `frontend/e2e/service-discovery.spec.ts`, `backend/tests/test_service_discovery.py`: targeted regression coverage.
- `frontend/e2e/marketplace.spec.ts`: email assertion follows the public email pathway.
- `docs/SERVICE_DISCOVERY.md`, `VALIDATION.md`: implementation and exact validation record.

Next development mode generated `frontend/AGENTS.md` and refreshed generated
Next type references; these contain framework instructions/types, not product
configuration. Backend application code, API contracts, schema, migrations,
catalogue records, providers, workflow configuration, environment files and
deployment settings are unchanged. No database migration or reset is required.
Browser persistence checks create clearly labelled QA customers/enquiries in the
existing local database; pre-existing records are preserved.

## Validation

See the service-discovery entry in [VALIDATION.md](VALIDATION.md) for exact
commands, outcomes, the initial harness failures and intentional omissions.

## Remaining capabilities

Live chat, automated cross-category recommendations, confirmed in-house
offerings, outbound enquiry email and the seven external feeds are not provided
by the current system. Their pathways have explicit working enquiry fallbacks.
Next, obtain an authorized category feed and documented ownership/delivery
evidence before enabling additional listings or implementing an in-house
classification. Additional source credentials must remain on the server.
