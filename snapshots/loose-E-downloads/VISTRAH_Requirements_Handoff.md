# VISTRAH --- Product Requirements Handoff

**Purpose:** Give this document to the ChatGPT account connected to the
VISTRAH GitHub repository so it can inspect the existing codebase and
align implementation with the agreed product requirements.

**Status:** Requirements and acceptance criteria only. Do not begin
broad implementation or rewrite existing code until the repository has
been inspected and the current architecture/task status understood.

------------------------------------------------------------------------

## 1. Instructions for the GitHub-connected ChatGPT account

1.  Inspect the current GitHub repository and the existing
    implementation before proposing changes.
2.  Read `AGENTS.md`, architecture documentation, module maps,
    current-task notes, and relevant README files if present.
3.  Compare the existing code with these requirements and report:
    -   already implemented;
    -   partially implemented;
    -   missing;
    -   conflicting with requirements;
    -   requiring a product decision.
4.  Preserve working functionality and the existing architecture
    wherever reasonable. Avoid unrelated refactors.
5.  Do not invent product rules where this document says a decision is
    not yet confirmed.
6.  First produce a requirements gap analysis and a small, prioritized
    implementation plan. Do not start coding until the user explicitly
    asks to implement.
7.  Treat security, privacy, payment integrity, auditability, and clear
    user consent as core requirements, not optional enhancements.
8.  Where requirements imply legal, payment-provider,
    advertising-platform, or privacy obligations, flag the item for
    appropriate review rather than claiming compliance without evidence.
9.  Use small, focused changes and update relevant tests and
    documentation as implementation proceeds.
10. The user prefers efficient, low-waste collaboration and wants to
    avoid unnecessary repeated questioning. Ask only questions that are
    essential and not answered here.

## 2. Product vision

**Brand:** VISTRAH\
**Slogan:** "VISTRAH --- Expand Your Possibilities."

VISTRAH is a platform connecting customers, businesses/service
providers, and service-delivery partners. It is more than a static
directory: it combines discovery, enquiries, booking and transaction
pathways, business visibility, managed advertising/marketing, and
coordinated services.

The platform is intended to support a mobile app and website. The app
experience uses configurable, vertically stacked homepage sections,
banners and card collections. Each section can have its own layout and
card limits. An editor is envisioned so authorized users can add, move,
remove and configure sections on homepages and landing pages. Inspect
the current implementation before treating the editor as already built.

VISTRAH helps customers discover relevant businesses and services. It
helps businesses generate leads and improve visibility both inside
VISTRAH and, through selected services, on external channels such as
social media and advertising platforms. VISTRAH may deliver services
using its own team or approved external providers, depending on the
service.

## 3. Core user types and access

-   **Guest/customer:** Can browse public content and use exposed
    external contact methods. Account registration/sign-in is required
    for account-based actions such as platform enquiries, saving
    businesses, in-app messaging and access to conversation history.
-   **Registered customer:** Can use eligible customer features, subject
    to the applicable membership/access rules.
-   **Business/seller:** Can manage business profile, branches,
    services, enquiries, campaigns, membership and analytics according
    to permissions and membership status.
-   **External service provider:** Can deliver approved VISTRAH services
    under the provider agreement and applicable permissions.
-   **VISTRAH staff/admin:** Access is role-based and restricted to
    assigned permissions.
-   **Super Admin:** Full administrative control, including pricing and
    platform configuration.

**Identity constraint:** One identity may have both user/customer and
seller/business capabilities; avoid forcing separate identities when the
same person legitimately uses both roles.

**Member-only service pathways:** The three service pathways described
below require an active paid membership. Keep this rule distinct from
public browsing and any other public features.

## 4. Main service landing page

The service landing page must have exactly these three member-only tabs:

1.  **Find Service Provider**
2.  **VISTRAH Recommended**
3.  **VISTRAH Services**

All three require active paid membership.

A **Nearby Service Providers** row appears above the tabs as
horizontally scrollable tiles. Its intended contents include eligible,
approved sellers with matching service area and an active scheduled paid
campaign. Verify the current code and campaign model before implementing
or changing this behavior.

### Find Service Provider

-   Discover approved providers/businesses and their approved service
    listings.
-   Sellers manage their businesses and create listings through a
    hierarchy of **category → subcategory → service**.
-   A submitted service/listing must go through the relevant approval
    process before appearing publicly.
-   Search and filters should help customers find relevant providers and
    services.

### VISTRAH Recommended

-   Show VISTRAH-selected or personalized recommendations.
-   Recommendations may use selected interests, location, relevant
    interactions and quality/relevance signals.
-   Paid placements must be clearly labelled and distinguishable from
    organic recommendations.
-   Users should be able to manage or reset relevant personalization
    preferences.

### VISTRAH Services

-   Show services supplied by VISTRAH directly or coordinated through
    approved external providers.
-   Service details must identify what is included, pricing or starting
    price, requirements, expected delivery approach and applicable
    charges before the customer commits.

## 5. Business onboarding, approval and profile lifecycle

-   Businesses may self-register or be onboarded with assistance from
    VISTRAH staff.
-   Every submitted business profile requires Admin review and approval
    before public visibility.
-   Flow: register/assisted onboarding → submit profile → Admin
    review/approval → select membership → pay → membership benefits
    activate after successful payment.
-   If membership expires, the business listing remains visible with
    limited information, but membership-based promotional visibility and
    benefits stop.
-   Businesses can edit approved profiles. Significant changes require
    approval before public visibility; routine/minor changes do not.
-   Admin controls available categories/subcategories. Businesses select
    from the available options and may suggest new categories; Admin
    reviews suggestions.
-   Profiles should support, as applicable: name, description,
    categories, address, business hours, contact details, photos/videos,
    products/services/prices, offers, multiple branches/locations,
    reviews and trust indicators.
-   Use category-specific profile templates with controlled
    customization.
-   Businesses manage product/service catalogues manually or by
    spreadsheet bulk import. Validate uploads and return clear import
    reports. Do not assume API-based catalogue imports are required.
-   Businesses manually mark products/services available or unavailable.
-   Support multi-branch businesses with centralized owner control and
    branch-level staff roles/permissions.
-   Ownership transfer requires Admin approval, identity/authority
    checks, additional checks for multi-branch businesses and active
    bookings/payments, and an audit record.

## 6. Memberships and billing

There are exactly three membership tiers: **Basic, Plus, Premium**. Each
is available monthly or annually; annual plans are discounted relative
to monthly billing.

### Benefits

-   **Basic:** Business listing, inclusion in relevant recommendations
    and visibility in VISTRAH search. No included free social
    image/video production. The business may purchase creative
    production and advertising as extra-charge services.
-   **Plus:** All Basic benefits plus social media marketing access and
    one free social media image creative per month.
-   **Premium:** All Plus benefits, two free social media image
    creatives per month, and one free AI-generated promotional video per
    month.

### Important cost separation

-   Free creative production is a production benefit; it does not mean a
    free advertising campaign.
-   Ad spend is charged separately based on the selected platform,
    campaign duration, budget and applicable pricing.
-   Premium's included AI-generated video covers production only;
    advertising spend for that video is extra.
-   Additional image/video creatives are charged separately.
-   AI video creation and video ads are available to all tiers for extra
    charges; Premium has the one-video production benefit described
    above.
-   Businesses may supply their own creatives or request
    VISTRAH-produced creatives for the applicable charge.
-   Mobility billboard advertising is available to all tiers at extra
    cost. Premium receives priority, not exclusivity.
-   A business needs at least Basic membership to purchase individual
    VISTRAH services.
-   Membership fees, creative production, ad spend, specialist services
    and external provider charges must be shown distinctly.

### Membership management

-   Super Admin controls membership pricing, including tier,
    monthly/annual price, additional-branch charges and
    discounts/introductory offers.
-   Changes to membership prices apply to all customers from their next
    renewal; existing members receive advance notification.
-   Membership upgrades/downgrades take effect immediately after
    successful payment, with applicable price adjustments. The exact
    proration/price-adjustment calculation is not yet specified; do not
    invent it.
-   At purchase, businesses choose automatic or manual renewal.
-   Failed automatic payments trigger notifications.
-   Cancellation stops future auto-renewal; benefits continue until the
    end of the paid period. No refund is given for unused membership
    time under the currently stated rule. After expiry, the listing
    remains visible with limited information and promotional benefits
    stop.

## 7. Search, ranking, location and discovery

-   Support natural-language search, typo correction, synonyms,
    category/subcategory filters, location, price, ratings and other
    relevant filters.
-   Let users control available sorting and filters.
-   Search/recommendation ranking combines query/category relevance,
    location where appropriate, membership-based promotional visibility
    and paid campaigns.
-   Paid placements must be labelled clearly and kept distinguishable
    from organic results.
-   Support device location only with permission, manual location
    selection, multiple saved locations (e.g. Home/Work) and location
    switching.
-   Online services may be discovered independently of geographic
    location where appropriate; in-person services should match service
    areas.
-   Providers choose service cities/areas and may configure service
    radius/travel distance.
-   Business search visibility must not imply that paid placement
    guarantees organic ranking.

## 8. Advertising, campaigns and V Ads

VISTRAH promotes businesses through profile listings,
search/recommendations, homepage and other app/website sections, Brand
Days, Campaign Days, V Ads and paid marketing services.

-   **Brand Days:** Dedicated promotional events for one brand or a
    collection of brands.
-   **Campaign Days:** Themed events in which multiple businesses can
    participate, such as seasonal, festival or offer campaigns.
-   Admin can create platform-wide campaigns, choose participating
    businesses, schedule and manage placements.
-   Businesses can propose campaigns, but proposed campaigns require
    approval.
-   Seller campaigns are paid and may include time-limited offers.
-   Campaign creation should support targeting, duration/scheduling,
    preview, approval status and tracking.
-   Paid placements and campaigns must be labelled transparently.
-   **V Ads:** Dedicated bottom-centre navigation button in the mobile
    app. Opens a full-screen, vertically swipeable feed of 9:16
    promotional videos from member businesses. The specific CTA behavior
    for each video (e.g. profile/contact/website) still needs validation
    against current implementation and should not be treated as a
    confirmed requirement unless already implemented/approved.
-   Ads require automated policy checks; Admin review is required for
    content that is risky or otherwise triggers review. Ads publish only
    after all required checks.
-   Targeting may be basic or advanced according to
    campaign/platform/package, while respecting applicable privacy and
    consent requirements.
-   Advertising analytics should include available impressions,
    reach/views, clicks, engagement, enquiries, conversions when
    trackable, spend, cost per click/enquiry, comparisons and
    recommendations. Do not report unverified conversions as confirmed.

## 9. Ads & Marketing service catalogue

The homepage includes a **"VISTRAH Ads & Marketing"** banner below
**"Services for You"**, followed by horizontally/vertically scrollable
service cards as appropriate to the existing design.

-   Each card opens a dedicated service detail page.
-   Each service page explains what is included, benefits, packages,
    starting price, requirements, tracking/measurement and applicable
    charges before commitment.
-   Eligible, standard services can be purchased directly.
-   Complex or custom campaigns use a consultation/enquiry flow.
-   Businesses can request growth recommendations on demand and may opt
    into personalized suggestions.
-   Suggestions can cover marketing, creative production, advertising, V
    Ads, mobility billboard and other relevant services.
-   Pricing must be transparent. No service or campaign may be purchased
    automatically without the business's approval.
-   VISTRAH's internal team delivers services it can handle. Approved
    external providers deliver other services, coordinated by VISTRAH
    under defined quality standards.
-   VISTRAH manages customer complaints/disputes according to applicable
    policies.

## 10. Enquiries, lead management and communications

-   Support direct contact methods (phone, WhatsApp, email, website,
    etc.) and enquiries submitted through VISTRAH.
-   Businesses can choose which supported contact channels they expose.
-   In-app messaging, enquiry management and conversation history
    require sign-in; guests may browse and use external contact options
    where exposed.
-   Provide a business dashboard for enquiries/leads with configurable
    notifications, assignment, status tracking, reminders, history and
    source tracking where available.
-   Suggested enquiry states: **New, Assigned, In Progress, Responded,
    Converted, Closed**.
-   Provide branch-level permissions and assignment where relevant.
-   Track source where possible, distinguishing organic and paid sources
    without overstating attribution.
-   In-app messaging should support text, images, documents and voice
    messages, subject to file-size/type restrictions and security
    checks. Apply malware scanning where supported.
-   Only participants and authorized staff may access a conversation.
    Provide abuse reporting.
-   Track response rate/time and relevant targets. Public response
    indicators may be used where appropriate, considering business hours
    and enquiry volume. Repeated poor response can affect quality
    assessment, but evaluation should account for context.

## 11. Ratings, reviews, verification and trust

-   Reviews use a verified-interaction model. A registered user must
    have a verifiable interaction, such as an enquiry, booking or
    purchase, to rate/review.
-   Distinguish a **verified enquiry** from a **verified transaction**.
-   Support business review responses, review reporting, moderation,
    appeals and human review of suspicious reviews.
-   Automated systems may flag suspicious reviews for human review.
-   A negative review alone is not grounds for removal.
-   Public trust indicators may include ratings/reviews, verification
    level, response performance, verified years in business, verified
    booking/transaction counts and completion indicators where reliable.
-   Business verification has multiple levels based on business
    type/risk. Admin reviews, approves, suspends or revokes
    verification.
-   Each verification badge must state exactly what has been verified;
    never imply broader verification than actually performed.

## 12. Booking and service delivery

VISTRAH supports both an intermediary model and a VISTRAH-managed model
depending on the service: - **Intermediary:** VISTRAH connects the
customer to the business/provider; the provider fulfils the service. -
**VISTRAH-managed:** VISTRAH coordinates delivery; an external provider
may fulfil the service.

### Availability and booking

-   Standard services may use fixed published prices; customized/complex
    services may use quote requests. The user confirmed **both**
    approaches.
-   Scheduling supports both instant booking of published slots and
    manual confirmation, depending on the service.
-   Online, in-person and hybrid delivery modes are configurable per
    service.
-   Eligible bookings can be rescheduled through VISTRAH; other
    arrangements may be handled directly. Platform changes must update
    records and notify affected parties.
-   Both customer and provider can initiate cancellations. Rules depend
    on timing, service type, reason and applicable charges.
-   No-show rules are service-specific and published. Either party may
    report a dispute; VISTRAH investigates exceptional or contested
    cases.
-   Reminders are configurable by service/time/preferences, use
    appropriate in-app/push and email/SMS channels where available and
    consented, and avoid duplicate reminders after
    cancellation/rescheduling.
-   Completion flow: provider marks completed; customer confirms or
    disputes; eligible bookings may auto-complete after a configurable
    period unless disputed. Disputed/cancelled bookings are excluded.
    Completion may trigger payout subject to terms/checks. Notify
    relevant parties and record audit events.
-   After completion, invite feedback: service/provider quality,
    punctuality and overall rating; written reviews; photos where
    appropriate; provider public response; optional follow-up surveys.
    Maintain verified-interaction and moderation requirements.
-   Repeat booking support: customers can revisit providers and book
    again, see booking history, and receive relevant
    reminders/personalized suggestions where appropriate. Customers
    remain in control of whether to book.

### Pricing and payments

-   Integrated platform transactions are supported, but customers may
    also contact providers directly and pay them directly.
-   VISTRAH recommends platform payments for a safer and more trackable
    transaction experience, but must not promise guaranteed refunds or
    protection unless actually backed by policy and provider terms.
-   **Advance-payment rules remain undecided.** A later clarification
    question about full upfront vs deposit vs flexible service-specific
    payment was not answered. Do not treat any option as confirmed.
-   Refund principle given by the user: **Refund will be made if no
    charges are incurred to VISTRAH from service providers.** Implement
    only after the policy is defined precisely for relevant scenarios;
    do not invent refund percentages, deadlines or fees.
-   VISTRAH decides booking cancellations/refunds under its refund
    policy.
-   For disputes, VISTRAH investigates, gives both parties an
    opportunity to respond and makes the final decision under applicable
    policies.
-   Display the relevant pricing, taxes/fees where applicable,
    cancellation/refund terms and payment status before commitment.
-   Use a suitable payment provider and secure, auditable transaction
    handling.

## 13. External provider onboarding and operations

-   Providers may self-register or receive assisted onboarding.
-   Before public availability, verify identity/business details as
    appropriate, review services/pricing/portfolio and require Admin
    approval.
-   Providers must accept the applicable standard agreement/platform
    policies, service-specific terms, agreed commissions/payout rules,
    and cancellation/refund obligations before transactions are enabled.
-   Record agreement version and acceptance timestamp.
-   Super Admin can configure provider commissions by
    provider/category/service, as fixed amounts or percentages.
-   Automate payouts where possible; schedules are configurable. Support
    manual adjustments and holds/reviews for disputes/refunds, with
    transaction history and audit logs.
-   Track provider ratings, completion, cancellations, response times,
    complaints and compliance. Use performance scores/recommendations
    and proportionate warnings, restrictions or suspension with fair
    evaluation.
-   Providers configure service areas, cities/areas, service
    radius/travel distance and service delivery mode.
-   VISTRAH coordinates delivery quality and manages customer
    complaints/disputes according to policy.

## 14. Cancellation, disputes and enforcement

-   Cancellations may be initiated by either customer or provider, with
    rules based on service type, timing, reason and applicable costs.
-   VISTRAH handles contested cancellation/refund cases and no-show
    disputes, investigates the evidence and gives both parties an
    opportunity to respond.
-   Business enforcement may include temporary suspension or permanent
    removal depending on severity.
-   User enforcement may include warnings, feature restrictions,
    suspension or permanent ban. Where necessary and appropriate,
    prevent banned users from simply creating new accounts.
-   Ensure enforcement actions have appropriate authorization, audit
    trails and review/appeal handling where defined by policy.
-   Do not create unsupported claims about guaranteed outcomes or legal
    rights.

## 15. Wallets, campaign billing and analytics

-   Advertising payments support direct campaign payment or a prepaid
    advertising wallet.
-   Unused ad-wallet balance may be retained or refunded on request,
    subject to policy and applicable charges. Spent funds are handled
    separately.
-   Show clear transaction history, spend and available balance.
-   Provide business analytics beyond ads: profile views, search
    appearances, enquiries, contact clicks, messaging, leads, branch
    performance, trends, customer interest and actionable
    recommendations.
-   Distinguish organic from paid activity.
-   Report only data supported by instrumentation; label estimated or
    inferred metrics appropriately and respect privacy.

## 16. Notifications and personalization

-   Support essential and optional promotional notifications.
-   In-app and push notifications are default channels where supported;
    email/SMS may be used for essential updates and selected promotional
    communications with consent.
-   Avoid duplicate or stale booking notifications after
    cancellation/rescheduling.
-   Personalization can use user-selected interests, location and
    relevant interactions, with controls to change/reset preferences.
-   Do not purchase or launch a campaign automatically from a
    recommendation; explicit business approval is required.

## 17. Security, privacy and administration

Security must be designed into the mobile app, website, backend, APIs,
admin functions, business dashboard, messaging and payment flows.

### Authentication and authorization

-   Support secure authentication options such as email/mobile plus
    password, OTP and optional authenticator-based 2FA, according to the
    product's existing architecture.
-   Require stronger mandatory 2FA for admins.
-   Require additional verification for sensitive actions.
-   Apply session/login limits and secure account recovery.
-   Use least-privilege, role-based permissions for Super Admin,
    Admin/staff, businesses, branches, providers and customers.
-   Enforce authorization server-side; do not rely only on hiding UI
    elements.

### Auditability

-   Log important administrative, financial, business-account,
    ownership, membership, moderation, campaign and permission changes.
-   Capture actor, action/change, timestamp and relevant target/context.
-   Protect audit logs against unauthorized modification/deletion and
    restrict access.

### Data protection

-   Minimize personal data collection; protect data in transit and at
    rest as appropriate to the architecture.
-   Validate and sanitize inputs, protect APIs, rate-limit sensitive
    endpoints, securely store secrets, and avoid exposing private
    records or credentials in logs/client bundles.
-   Apply appropriate controls to uploads and messages, including file
    validation and malware scanning where supported.
-   Use secure payment-provider integration and do not store sensitive
    payment credentials unless the system is explicitly designed and
    authorized to do so.
-   Respect consent and privacy requirements for location, messaging,
    analytics, notifications and ad targeting.
-   Treat security as an ongoing engineering requirement: threat
    modeling, dependency review, automated tests, logging/monitoring,
    backups and incident handling should be evaluated against the
    current stack.

## 18. Homepage/content section editor

The product direction includes a flexible page composition model: -
Pages are composed of vertically stacked sections of different sizes. -
Each section can contain one or more cards that occupy the relevant
section area. - Authorized editors can add, move, delete and configure
sections on homepages and landing pages. - Sections may have
minimum/maximum card counts and distinct feature/configuration rules. -
Support multiple reusable section types and card layouts. - The editor
must respect permissions, validate configuration and avoid allowing
content changes to bypass approval rules for businesses/ads. - Inspect
the existing code before deciding whether to extend or replace the
current layout system.

## 19. Admin and platform controls

-   Super Admin has full control.
-   Other Admin/staff roles have explicitly limited permissions.
-   Admin tools should cover business/provider approvals, category
    management, verification, campaigns, ads, moderation, membership
    pricing, provider commissions/payout oversight, disputes, refunds,
    enforcement and platform content.
-   Use role-based access and audit logs for sensitive actions.
-   Changes to membership pricing are effective from next renewal and
    require advance notice to existing members.
-   Business-proposed campaigns and ads are subject to the defined
    approval process.
-   Admin decisions should be traceable and appropriately restricted.

## 20. Product rules that must not be misinterpreted

1.  The three member-only service tabs are exactly **Find Service
    Provider**, **VISTRAH Recommended**, and **VISTRAH Services**.
2.  An active paid membership is required to access those three service
    pathways.
3.  One identity can have both customer and seller capabilities.
4.  Business profile submission requires Admin approval before public
    visibility.
5.  Membership benefits activate only after successful payment.
6.  An expired business membership does not automatically delete the
    listing; the listing remains with limited information and
    promotional benefits stop.
7.  Basic, Plus and Premium have the specific creative benefits
    described above.
8.  Free creative production is not free ad spend.
9.  Premium mobility billboard access means priority, not exclusivity.
10. Paid placement must be labelled; paid visibility is not the same as
    organic ranking.
11. Service bookings can be intermediary or VISTRAH-managed depending on
    the service.
12. Customers can contact providers and pay directly, or transact
    through VISTRAH.
13. Refund principle is conditional on whether charges are incurred to
    VISTRAH from service providers; detailed policy scenarios remain to
    be specified.
14. Advance-payment/deposit rules have **not** been decided.
15. Do not auto-purchase marketing services or launch campaigns from
    recommendations without explicit approval.
16. Negative reviews alone are not grounds for removal.
17. Do not claim guaranteed refunds, conversions, verification, security
    or regulatory compliance without a substantiated basis.

## 21. Current development context to verify

The mobile app is being developed with Expo. The API proxy has been
running in PowerShell and backend content has been visible in the app.
The user has also been modifying code in GitHub through another ChatGPT
account, pulling changes to a local machine and checking them in a
browser. The user wants the mobile and web app to be highly secure and
wants a way to run the system without relying on VS Code being open.

Treat these as reported development context, not proof that production
deployment, authentication, security hardening, or always-on hosting is
complete. Verify the actual repository, runtime, API setup, deployment
configuration and current state before making claims or changes.

## 22. Suggested acceptance-checklist format

For each feature, record: - Requirement ID - Requirement/behavior - User
role(s) - Preconditions - Expected behavior - Negative/error cases -
Authorization/privacy requirements - Analytics/audit events - Current
implementation status (implemented / partial / missing / conflict /
unknown) - Relevant file/module/test - Priority and dependencies

Do not assume a feature is implemented merely because it is described
here.

## 23. First deliverable requested from the coding account

Before editing code, produce:

1.  A concise summary of the repository's current architecture and major
    modules.
2.  A requirements-to-code gap matrix using this document.
3.  A list of security-sensitive or payment-sensitive gaps.
4.  A prioritized, incremental implementation roadmap.
5.  A short list of truly blocking unanswered product decisions only.
    The advance-payment model is one known unanswered decision; do not
    ask it again unless implementation of a specific payment flow
    requires it.
6.  A clear recommendation for the next small implementation task,
    without making code changes until explicitly authorized.
