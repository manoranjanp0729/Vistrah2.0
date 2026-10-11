# Phase 4 imagery audit and implementation

The later [image registry correction report](imagery/REPORT.md) supersedes the original mappings below. The current catalogue has 57 distinct service photographs and two documented specialist gaps. Use [the generated inventory](imagery/inventory.md) and `npm run audit:images` for current coverage, provenance and intentional reuse.

## Audit before implementation

The app uses Next.js, one global stylesheet, shared catalogue templates and
client-side account/admin shells. There is no Tailwind or separate component
styling system. Before Phase 4, the only visual assets were eleven local SVG
illustrations. No route had photography. Fonts, logo treatment, colour tokens,
navigation, API data and operational logic are preserved.

| Page or route family | Sections audited | Previous visual / gap | Required treatment |
| --- | --- | --- | --- |
| `/` | Hero, category cards, popular services, process, membership, trust, contact | SVG hero and catalogue illustrations | Relevant assistance photo in hero; distinct category and service photos. Keep explanatory process icons. |
| `/services` and search/empty results | Introduction, search, category/results grids | SVG cards; empty results have no image | Compact consultation visual plus topic-specific 4:3 cards. |
| `/service/{category}` (8 categories) | Introduction, specialist links, services, contact | Category SVG and service SVGs | Topic-specific editorial image and 4:3 service photos. |
| `/service/civil-construction/outdoor-lifestyle-design` | Introduction, services, contact | Only service illustrations | Outdoor-design editorial photo plus relevant cards. |
| All 59 seeded service details | Introduction, inclusions, process, preparation, related services | Repeated category illustrations | Deliberately selected subject photo, 3:2 editorial and 4:3 related cards. |
| Provider directories and detail routes | Intro, provider/contact records, verification information | Initial avatars; no photograph | Small service-context image, explicitly illustrative; retain initials and verification evidence. |
| All service request routes | Sign-in gate, requirements form, confirmation | No image | Same relevant service-context image in form/confirmation; small planning image in access states. |
| `/jobs` and `/jobs/{id}` | Search, source notice, vacancy records, pagination | No image | Career-research visual; no invented employer portraits or per-row stock thumbnails. |
| `/membership` | Plan, conditions, FAQs | No image | Editorial planning/membership photograph. |
| `/call-vistrah` | Phone/action links, conversation checklist | No image | Consultation photograph; never labelled as VISTRAH staff. |
| `/login`, `/register` | Welcome panel, authentication forms/errors | Business SVG, hidden on mobile | Planning photo visible at all widths. |
| `/sandbox-checkout` | Summary, simulated payment outcomes | No image | Restrained membership-planning visual. |
| `/account` | Overview, links, access/loading/error states | Initial avatar only | Compact personal-planning visual. |
| `/account/profile` | Profile form | No image | Compact workspace visual. |
| `/account/requests` | Request records and empty state | No image | Compact requirements/planning visual. |
| `/account/finds` and workflow detail | Profile/resume, plan, approval, applications, history | No image | Career-research visual outside the operational controls. |
| `/account/membership`, `/account/orders`, `/account/payments` | Offers, status, order/payment tables | No image | Context-specific planning/documents/accounting visuals. |
| `/admin` | Metrics, reviews, payment environment | No image | Small operations image in existing heading. |
| `/admin/catalogue` | Category/subcategory/service tabs, forms, dialogs, tables | Image selection is an existing SVG identifier | Small service-planning visual; keep database image identifiers and CRUD unchanged. |
| `/admin/providers`, `/admin/provider-services` | Provider details, evidence, verification, mappings | Initials only | Small consultation image; retain evidence and initial avatars. |
| `/admin/requests` | Approval/actions, records and empty state | No image | Small document-review visual. |
| `/admin/offers`, `/admin/payments`, `/admin/audit` | Offers, ledger/reconciliation, audit tables | No image | Small planning/accounting/document visuals. |
| `/admin/workflows`, `/admin/job-sources` | Workflow review, acquisition controls, source health | No image | Small career-research/technology visual; preserve compact tables. |
| Not found, error, unauthorized admin/account | Recovery and access actions | No image | Small assistance/planning photo with stable bounds. |
| Shared header, footer, navigation, dialogs, alerts | Branding, links, forms, status | Existing wordmark/icons | Preserve branding and useful icons. Pages supply photography; do not clutter every control/dialog with stock photos. |
| `/api/{path}` | API proxy | Not a designed page | No imagery; unchanged. |

Source inventory, crop decisions and validation results follow once assets have
been verified and integrated. Contextual stock photographs must never imply
that their subjects are VISTRAH employees, listed providers, available properties,
verified installations or completed customer projects.


## Implemented system

`frontend/components/visual.tsx` is the shared Next.js Image component.
`frontend/lib/imagery.ts` defines subject selection and responsive variants.
`frontend/lib/photo-assets.json` is the asset/provenance/crop manifest. Existing
catalogue image identifiers still select relevant imagery; curated seeded
services receive specific photographs unless an administrator changes their
image selection. API payloads, catalogue data and database records are unchanged.

| Variant | Reserved ratio | Use |
| --- | --- | --- |
| Hero | 16:9 | Homepage consultation photo; the only preloaded photo |
| Card | 4:3 | Category and service groups, consistent at every breakpoint |
| Editorial | 3:2 | Category/service introductions, membership, contact and request forms |
| Compact | 3:2 | Account, Finds, admin, search, access and recovery; 96-156px wide |
| Thumbnail | 1:1 | Available for a future justified small image; no unnecessary list thumbnails added |

Each box reserves its aspect ratio before loading. Next.js provides responsive
srcsets and same-origin optimization. The originals are resized to at most
1440px wide and 1600px tall, encoded as WebP at quality 78, with metadata stripped.
Below-the-fold images load lazily. Only the homepage hero uses `preload`.
Login and registration send their complete welcome/form layout in the initial
server response, including the reserved image box. The same next-destination
validation and authentication requests remain in place; this removes the
previous client-only loading-placeholder shift.
Responsive `sizes` match their layouts. All photography is bundled locally;
there are no remote image requests, remote patterns, font changes, DNS changes
or deployment-configuration changes.

Per-image `object-position` preserves the intended subjects. Portraits receive
deliberate focal crops; the printing machinery uses `contain` to retain the whole
press. Photographs are not stretched. Informative images have descriptive alt
text; the shared component supports empty alt text for explicitly decorative
uses. The existing wordmark and useful process/status icons remain unchanged.
Provider pages explicitly identify stock photography as service context, not
the provider's work. Text stays on solid surfaces. An image load error leaves the
same reserved box with an accessible, explicit “Photograph unavailable” message
instead of a broken image or an unrelated replacement.

## Sources and rights

Verified on 9 October 2026 against the official
[Unsplash License](https://unsplash.com/license) and
[Pexels License](https://www.pexels.com/license/).
Both permit downloading, modification and commercial website use without
mandatory attribution. Photographer credits are retained below and in the
manifest. Do not imply endorsement by photographed people or depict them as
VISTRAH employees/providers. No premium Unsplash+ assets, AI generation, API
image integration or third-party hotlinks were used.

Unsplash selections were identified through the official photo search galleries
as free downloads, separately from premium results; the exact download links
identified each photographer/photo ID and its official CDN file. Direct source
pages returned an access challenge in the acquisition environment, so the
manifest retains the gallery verification URL as well as the exact photo source
and CDN acquisition URLs. Pexels selections were checked against their
individual free-photo pages. All downloaded images were visually inspected
before assignment, then their rendered 4:3 and 3:2 crops were reviewed together.

Downloaded source dimensions in the JSON manifest describe the 1600px source
copies used for optimization, not the photographers' full-resolution masters.
The dimensions below are the actual bundled file dimensions. Hashes and byte
sizes are recorded in the JSON manifest.

## Bundled photo inventory

All paths are relative to `frontend/public`; all files are WebP. Every image
supports its assigned card/editorial/compact ratio through the shared component.

| Asset path | Intrinsic dimensions | Photographer / exact source | Licence | Fit / position | Crop decision |
| --- | --- | --- | --- | --- | --- |
| `/images/photos/collaboration.webp` | 1440 x 960 | [Dylan Gillis](https://unsplash.com/photos/KdeqA3aTnBY) | [Unsplash License](https://unsplash.com/license) | cover; 50% 45% | Keep the shared notes and hands; faces are incidental in the original composition. |
| `/images/photos/architecture.webp` | 1440 x 810 | [Daniel McCullough](https://unsplash.com/photos/HtBlQdxfG9k) | [Unsplash License](https://unsplash.com/license) | cover; 50% 55% | Retain the drawing and ruler; the upper body is intentionally outside the composition. |
| `/images/photos/plumbing.webp` | 1067 x 1600 | [Jacek Dylag](https://unsplash.com/photos/Vve7XkiUq_Y) | [Unsplash License](https://unsplash.com/license) | cover; 50% 20% | Portrait source: upper crop retains the hand, tap and running water. |
| `/images/photos/electrical.webp` | 1440 x 961 | [Emmanuel Ikwuegbu](https://unsplash.com/photos/zWOgsj3j0wA) | [Unsplash License](https://unsplash.com/license) | cover; 50% 35% | Keep the hard hat and face above the tool; not a listed provider portrait. |
| `/images/photos/outdoor.webp` | 1440 x 960 | [Tile Merchant Ireland](https://unsplash.com/photos/lCmZqcHM-OY) | [Unsplash License](https://unsplash.com/license) | cover; 50% 40% | Keep the roof and support posts; illustrates outdoor design, not a verified product installation. |
| `/images/photos/consultation.webp` | 1440 x 960 | [Amy Hirschi](https://unsplash.com/photos/JaoVGh5aJ3E) | [Unsplash License](https://unsplash.com/license) | cover; 50% 35% | Keep both faces and the laptop; no text over their faces. |
| `/images/photos/resume.webp` | 1440 x 960 | [Resume Genius](https://unsplash.com/photos/9si2noVCVH8) | [Unsplash License](https://unsplash.com/license) | cover; 50% 50% | Keep the resume and hands; the document is stock context, not customer data. |
| `/images/photos/servers.webp` | 1440 x 808 | [Taylor Vick](https://unsplash.com/photos/M5tzZtFCOfs) | [Unsplash License](https://unsplash.com/license) | cover; 50% 50% | Keep the equipment and cabling across the frame. |
| `/images/photos/pest.webp` | 1440 x 960 | [Pro Pest Control Canberra](https://unsplash.com/photos/UjGSnzfDUl8) | [Unsplash License](https://unsplash.com/license) | cover; 35% 45% | Keep the technician and spray wand. |
| `/images/photos/billboard.webp` | 1200 x 1600 | [Patrick Robert Doyle](https://unsplash.com/photos/csDVMvtsS50) | [Unsplash License](https://unsplash.com/license) | cover; 50% 50% | Focus on the complete display rectangle, with surrounding architecture as context. |
| `/images/photos/property.webp` | 1440 x 961 | [Max Vakhtbovych](https://www.pexels.com/photo/modern-house-exterior-7587880/) | [Pexels License](https://www.pexels.com/license/) | cover; 60% 50% | Keep the facade and garden; no implication that the property is listed for sale. |
| `/images/photos/construction.webp` | 1440 x 975 | [Huu Loi Nguyen](https://www.pexels.com/photo/view-of-people-working-on-a-large-construction-site-12354092/) | [Pexels License](https://www.pexels.com/license/) | cover; 50% 55% | Retain the foundation grid, workers and concrete equipment. |
| `/images/photos/finance.webp` | 1440 x 960 | [Mikhail Nilov](https://www.pexels.com/photo/a-person-examining-documents-8296970/) | [Pexels License](https://www.pexels.com/license/) | cover; 50% 50% | Keep the calculator, hand and documents; no country-specific tax form claims. |
| `/images/photos/marketing.webp` | 1440 x 1080 | [Kindel Media](https://www.pexels.com/photo/people-in-the-office-discussing-a-project-7688336/) | [Pexels License](https://www.pexels.com/license/) | cover; 50% 50% | Overhead composition preserves the group and central charts. |
| `/images/photos/documents.webp` | 1440 x 1080 | [Kindel Media](https://www.pexels.com/photo/people-working-with-documents-in-an-office-7688100/) | [Pexels License](https://www.pexels.com/license/) | cover; 50% 55% | Keep the hands and chart under discussion. |
| `/images/photos/technology.webp` | 1440 x 961 | [Christina Morillo](https://www.pexels.com/photo/black-and-gray-laptop-computer-turned-on-doing-computer-codes-1181271/) | [Pexels License](https://www.pexels.com/license/) | cover; 55% 50% | Keep the screen and code; background reflection is incidental. |
| `/images/photos/interior.webp` | 1440 x 961 | [Max Vakhtbovych](https://www.pexels.com/photo/modern-living-room-interior-with-a-brick-wall-7587827/) | [Pexels License](https://www.pexels.com/license/) | cover; 55% 50% | Retain sofa, windows and material finishes. |
| `/images/photos/air-conditioning.webp` | 1067 x 1600 | [Airam Dato-on](https://www.pexels.com/photo/air-conditioner-in-a-house-16592625/) | [Pexels License](https://www.pexels.com/license/) | cover; 50% 55% | Portrait source: crop around the complete air conditioning unit. |
| `/images/photos/printing.webp` | 1067 x 1600 | [Antoni Shkraba](https://www.pexels.com/photo/complex-press-in-a-graphic-design-studio-6620985/) | [Pexels License](https://www.pexels.com/license/) | contain; 50% 50% | Contain the portrait to retain the complete machinery. |
| `/images/photos/planning.webp` | 1440 x 960 | [Breakingpic](https://www.pexels.com/photo/desk-laptop-notebook-pen-3059/) | [Pexels License](https://www.pexels.com/license/) | cover; 50% 50% | Keep the notebook and laptop as personal-planning context. |
| `/images/photos/events.webp` | 1067 x 1600 | [Caleb Oquendo](https://www.pexels.com/photo/engaged-audience-in-conference-hall-38786014/) | [Pexels License](https://www.pexels.com/license/) | cover; 50% 75% | Portrait source: lower focal position retains the foreground attendee and seated audience. |

## Page and section assignments

The route-family inventory above covers loading, empty, denied-access and
recovery states as well as successful data states. Cards use the same
subject-selection functions as their detail pages.

| Page/section | Photo key(s) | Ratio / location |
| --- | --- | --- |
| Homepage | consultation; eight category subjects; four popular service subjects | 16:9 hero, 4:3 cards |
| Services search, including no results | consultation; relevant result subjects | 3:2 compact introduction, 4:3 results |
| Category introductions | resume, property, construction, marketing, finance, technology, collaboration, interior | 3:2 introduction |
| Outdoor & Lifestyle Design | outdoor | 3:2 compact introduction |
| Provider directories/details | Associated service subject | 3:2 compact in introduction/profile, captioned illustrative context |
| Request forms/confirmations | Associated service subject | 3:2 form introduction / compact confirmation |
| Public jobs and vacancy details | planning | 3:2 compact career-research header |
| Membership | collaboration | 3:2 editorial beside plan information |
| Contact | consultation | 3:2 in the existing conversation checklist card |
| Login/register | planning | 3:2 welcome-panel photo, visible on mobile |
| Checkout | collaboration | 3:2 compact summary header |
| Account overview/profile/Finds, including workflow detail | planning | 3:2 compact above controls |
| Account requests/orders | documents | 3:2 compact |
| Account membership/payments | collaboration / finance | 3:2 compact |
| Admin overview/catalogue | marketing / planning | 3:2 compact in existing heading |
| Admin providers/provider-services | consultation | 3:2 compact in existing heading |
| Admin requests/audit | documents | 3:2 compact in existing heading |
| Admin offers/payments | collaboration / finance | 3:2 compact in existing heading |
| Admin workflows/job-sources | resume / servers | 3:2 compact in existing heading |
| Not found/error/account access | planning | 3:2 compact near recovery actions |
| Admin access/error/loading | Relevant admin section subject | 3:2 compact |

### Every seeded service

| Category / service | Photo key | Card / detail treatment |
| --- | --- | --- |
| Jobs & Careers / Resume Building | `resume` | 4:3 card, 3:2 detail; cover; 50% 50% |
| Jobs & Careers / Job Application Assistance | `resume` | 4:3 card, 3:2 detail; cover; 50% 50% |
| Jobs & Careers / LinkedIn Profile | `planning` | 4:3 card, 3:2 detail; cover; 50% 50% |
| Jobs & Careers / Interview Preparation | `consultation` | 4:3 card, 3:2 detail; cover; 50% 35% |
| Jobs & Careers / Career Consultation | `consultation` | 4:3 card, 3:2 detail; cover; 50% 35% |
| Jobs & Careers / Job Search Assistance | `planning` | 4:3 card, 3:2 detail; cover; 50% 50% |
| Real Estate / Property Search | `property` | 4:3 card, 3:2 detail; cover; 60% 50% |
| Real Estate / Property Verification | `architecture` | 4:3 card, 3:2 detail; cover; 50% 55% |
| Real Estate / Property Valuation | `finance` | 4:3 card, 3:2 detail; cover; 50% 50% |
| Real Estate / Buy Property | `property` | 4:3 card, 3:2 detail; cover; 60% 50% |
| Real Estate / Sell Property | `property` | 4:3 card, 3:2 detail; cover; 60% 50% |
| Real Estate / Rental Assistance | `interior` | 4:3 card, 3:2 detail; cover; 55% 50% |
| Civil & Construction / Residential Construction | `construction` | 4:3 card, 3:2 detail; cover; 50% 55% |
| Civil & Construction / Commercial Construction | `construction` | 4:3 card, 3:2 detail; cover; 50% 55% |
| Civil & Construction / Architecture & Design | `architecture` | 4:3 card, 3:2 detail; cover; 50% 55% |
| Civil & Construction / Civil Engineering | `architecture` | 4:3 card, 3:2 detail; cover; 50% 55% |
| Civil & Construction / Estimation & BOQ | `architecture` | 4:3 card, 3:2 detail; cover; 50% 55% |
| Civil & Construction / Tenders | `documents` | 4:3 card, 3:2 detail; cover; 50% 55% |
| Civil & Construction / Contracts & Documentation | `documents` | 4:3 card, 3:2 detail; cover; 50% 55% |
| Civil & Construction / Contractors & Subcontractors | `construction` | 4:3 card, 3:2 detail; cover; 50% 55% |
| Civil & Construction / Inspection & Verification | `construction` | 4:3 card, 3:2 detail; cover; 50% 55% |
| Civil & Construction / Equipment & Materials | `construction` | 4:3 card, 3:2 detail; cover; 50% 55% |
| Civil & Construction / Retractable Roofing | `outdoor` | 4:3 card, 3:2 detail; cover; 50% 40% |
| Civil & Construction / Bioclimatic Pergolas | `outdoor` | 4:3 card, 3:2 detail; cover; 50% 40% |
| Civil & Construction / Glass Systems | `property` | 4:3 card, 3:2 detail; cover; 60% 50% |
| Civil & Construction / Outdoor Structures | `outdoor` | 4:3 card, 3:2 detail; cover; 50% 40% |
| Marketing / Digital Marketing | `marketing` | 4:3 card, 3:2 detail; cover; 50% 50% |
| Marketing / Outdoor Advertising | `billboard` | 4:3 card, 3:2 detail; cover; 50% 50% |
| Marketing / LED & Digital Displays | `billboard` | 4:3 card, 3:2 detail; cover; 50% 50% |
| Marketing / Signage & Branding | `billboard` | 4:3 card, 3:2 detail; cover; 50% 50% |
| Marketing / Print Advertising | `printing` | 4:3 card, 3:2 detail; contain; 50% 50% |
| Marketing / Events & Promotions | `events` | 4:3 card, 3:2 detail; cover; 50% 75% |
| Marketing / Media Advertising | `marketing` | 4:3 card, 3:2 detail; cover; 50% 50% |
| Marketing / Marketing Consultation | `marketing` | 4:3 card, 3:2 detail; cover; 50% 50% |
| Tax & Compliance / Income Tax Return Filing | `finance` | 4:3 card, 3:2 detail; cover; 50% 50% |
| Tax & Compliance / GST Registration | `finance` | 4:3 card, 3:2 detail; cover; 50% 50% |
| Tax & Compliance / GST Filing | `finance` | 4:3 card, 3:2 detail; cover; 50% 50% |
| Tax & Compliance / Business Registration | `documents` | 4:3 card, 3:2 detail; cover; 50% 55% |
| Tax & Compliance / TDS Compliance | `finance` | 4:3 card, 3:2 detail; cover; 50% 50% |
| Tax & Compliance / Tax Consultation | `finance` | 4:3 card, 3:2 detail; cover; 50% 50% |
| IT & Technology / Website Development | `technology` | 4:3 card, 3:2 detail; cover; 55% 50% |
| IT & Technology / Mobile App Development | `technology` | 4:3 card, 3:2 detail; cover; 55% 50% |
| IT & Technology / Cloud Services | `servers` | 4:3 card, 3:2 detail; cover; 50% 50% |
| IT & Technology / DevOps Services | `servers` | 4:3 card, 3:2 detail; cover; 50% 50% |
| IT & Technology / IT Support | `technology` | 4:3 card, 3:2 detail; cover; 55% 50% |
| IT & Technology / Software Consultation | `technology` | 4:3 card, 3:2 detail; cover; 55% 50% |
| Business Services / Business Setup | `collaboration` | 4:3 card, 3:2 detail; cover; 50% 45% |
| Business Services / Business Consultation | `collaboration` | 4:3 card, 3:2 detail; cover; 50% 45% |
| Business Services / Market Research | `marketing` | 4:3 card, 3:2 detail; cover; 50% 50% |
| Business Services / Documentation Services | `documents` | 4:3 card, 3:2 detail; cover; 50% 55% |
| Business Services / Vendor Assistance | `consultation` | 4:3 card, 3:2 detail; cover; 50% 35% |
| Business Services / Business Process Support | `documents` | 4:3 card, 3:2 detail; cover; 50% 55% |
| Local & Professional Services / Home Services | `interior` | 4:3 card, 3:2 detail; cover; 55% 50% |
| Local & Professional Services / AC Service & Repair | `air-conditioning` | 4:3 card, 3:2 detail; cover; 50% 55% |
| Local & Professional Services / Electrical Services | `electrical` | 4:3 card, 3:2 detail; cover; 50% 35% |
| Local & Professional Services / Plumbing Services | `plumbing` | 4:3 card, 3:2 detail; cover; 50% 20% |
| Local & Professional Services / Pest Control | `pest` | 4:3 card, 3:2 detail; cover; 35% 45% |
| Local & Professional Services / Professional Consultation | `consultation` | 4:3 card, 3:2 detail; cover; 50% 35% |
| Local & Professional Services / Interior Design | `interior` | 4:3 card, 3:2 detail; cover; 55% 50% |

## Remaining subject gaps and verification limits

- No approved photos of actual providers, staff, customer properties or completed
  projects were supplied. Initial avatars, real verification records and the
  existing logo are retained. Stock images provide context only.
- The pergola photo illustrates outdoor design. It does not establish that an
  installation is retractable or bioclimatic. The modern home's glazing provides
  architectural context for glass systems. Product-specific installations need
  approved provider photography before making any visual performance claim.
- The blank illuminated display represents signage/digital advertising context;
  it does not demonstrate a particular LED product or customer campaign.
- Future custom catalogue subjects without a curated mapping use their existing
  selected image identifier's subject. The general assistance choice depicts a
  consultation. New specialist subjects should receive a reviewed subject asset
  and a provenance entry, rather than an arbitrary external URL.
- The application-wide error component was inspected in code; the photographed
  not-found and access states are exercised in the browser. No production API
  outage was induced to force the error boundary.
- Live job-source acquisition remains outside this imagery task; the optional
  live acquisition test is intentionally skipped. A genuine Remotive vacancy detail was inspected from the existing 19-item
  cache at 1440/768/390px without contacting a source. Provider details were
  inspected with explicitly labelled QA data at the same widths.

## Changed files

- New: `frontend/components/visual.tsx`, `frontend/lib/imagery.ts`,
  `frontend/lib/photo-assets.json`, `frontend/lib/imagery.test.ts`,
  `frontend/e2e/imagery.spec.ts`, 21 `frontend/public/images/photos/*.webp`.
- Shared integration: `frontend/components/ui.tsx`, `catalogue-templates.tsx`,
  `customer.tsx`, `admin.tsx`, and `frontend/app/globals.css`.
- Browser regression maintenance: `frontend/e2e/marketplace.spec.ts` now brings
  lazy images into view before checking that they decode successfully.
- Public routes: homepage, services, membership, contact, jobs and job detail,
  login and registration (initial layout rendering);
  root error/not-found pages. Account, authentication, request, checkout and admin
  route paths use their existing shared components without URL changes.
  Exact route files: `frontend/app/(public)/page.tsx`,
  `frontend/app/(public)/services/page.tsx`,
  `frontend/app/(public)/membership/page.tsx`,
  `frontend/app/(public)/call-vistrah/page.tsx`,
  `frontend/app/(public)/jobs/page.tsx`,
  `frontend/app/(public)/jobs/[id]/page.tsx`,
  `frontend/app/(public)/login/page.tsx`,
  `frontend/app/(public)/register/page.tsx`,
  `frontend/app/error.tsx`, `frontend/app/not-found.tsx`.
- Documentation: this inventory, `docs/ASSETS.md`, `docs/VALIDATION.md`, and
  `frontend/public/images/photos/README.md`.

## Validation

- ESLint and TypeScript checks passed. Production builds passed locally and in
  the local Docker runtime. Only the local web container was refreshed; API,
  worker and database containers/data volumes were preserved.
- All 19 unit tests passed, including decoding every WebP and checking its
  dimensions, hash, provenance and complete 8-category/59-service coverage.
- The complete browser suite passed 29 tests; one optional live-source test was
  skipped. It covered all category/subcategory/service routes, provider
  directories, all account/admin sections, Finds workflow behavior, authentication,
  requests, sandbox membership, provider verification, ledger, audit, navigation,
  responsive layouts and the existing typography checks at 200% text.
- Photography checks ran at 1440/1024/768/390/320px on public pages and
  1440/1024/768/390px on account/admin screens. Every photograph was locally
  served and decoded; image bounds, aspect ratios, lazy loading, responsive
  sizes and lack of document overflow were checked.
- Cold delayed-photo loading and explicit image failure were exercised in the
  browser with reserved aspect-ratio boxes and CLS below 0.1. The login fallback
  inspection measured approximately 0.00034 CLS after initial-layout rendering
  replaced the existing client-only loading placeholder (previously 0.245).
- Source previews and all 4:3/3:2 crop pairs were visually inspected. The event
  portrait received a lower focal position to retain the foreground attendee.
  Homepage, authentication, service, membership, jobs, provider detail and loaded
  workflow/source-management screenshots were reviewed. A genuine cached vacancy
  and a labelled QA provider detail were checked at 1440/768/390px.
- A final focused customer/request/provider regression group passed both tests,
  checking provider photos and captions at 1440/768/390px after moving the contextual photo into
  the existing profile layout. This avoids a detached photo/caption block above
  the provider's contact information on mobile.
- Screenshots and crop reviews are in `artifacts/imagery/`. Playwright's report
  at `frontend/playwright-report/` describes the latest run, including any final
  focused verification.

Chrome was used; Safari/Firefox were not run. Not every individual data record
or possible error state was visually inspected. The runtime error boundary was
reviewed in code without inducing an API outage. Backend tests were not rerun
because backend code, contracts and schema were unchanged.

The existing labelled QA fixture lifecycle was used for browser tests, with
selective QA-provider/offer deactivation and historical records preserved.
No non-QA records or data volumes were reset/deleted. Local environment files,
ports, deployment settings and DNS were not changed; no deployment was performed.
The final local website and API health endpoints both returned HTTP 200.
