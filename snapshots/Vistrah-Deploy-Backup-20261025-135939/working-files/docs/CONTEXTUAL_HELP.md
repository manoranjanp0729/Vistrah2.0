# Contextual educational help

## Audit inventory and coverage

The source-of-truth audit used the actual components below and their API rules,
including `provider_routes.py`, `main.py`, `payments.py` and the installed workflow
and job-source controls. No new capabilities are implied by the explanations.

| Surface | Items explained | Owning component or route |
|---|---|---|
| Public navigation and catalogue | Navigation, search, category/service cards, official email | `shell.tsx`, `ui.tsx`; `/`, `/services`, category/subcategory templates |
| All 59 service landing pages | Saved enquiry, chat fallback, email, providers, human recommendations, unconfirmed in-house delivery | `service-pathways.tsx` |
| Account and enquiry | Eight account sections, request requirements/location/personal phone, submission, request/payment/membership statuses, sandbox checkout, password/recovery | `customer.tsx`; `/account/*`, login/registration and service request routes |
| Membership and public jobs | Plan scope/sandbox limitations, cached search, listing attribution/timestamps | `/membership`, `/jobs`, `vacancies.tsx` (also vacancy details and service Explore) |
| Admin navigation/overview | All 12 sections, stored counts, search, workflow filter | `admin.tsx`, `admin-workflows.tsx`; `/admin/*` |
| Catalogue/providers/offers | URL identifiers, active flags, preparation guides, offer scope/paise, verification, material-edit consequences, service associations, delete confirmation | `admin.tsx` |
| Requests/finance/audit | Allowed request transitions, eligible lead assignment, ledger, full sandbox refund/membership revocation, reconciliation | `admin.tsx`, `admin-provider-onboarding.tsx` |
| Provider requirements | Draft/version selection, field identifiers/types/configuration, effective dates, preview/publish/retire, change reasons | `admin-provider-onboarding.tsx` |
| Provider reviews | Manual checks, require-current-version, approve/reject/suspend/request-changes/begin-review, per-service status | `admin-provider-onboarding.tsx` |
| Provider onboarding | Service selection, draft/save/submit, adoption, private uploads, declarations, applicability/basis notes, status/history/leads | `provider-onboarding.tsx`, `provider-forms.tsx` |
| Job sources | Configured availability, enable/disable, connection checks, acquisition and history | `admin-job-sources.tsx` |
| Finds/workflow operations | Plan creation, discovery, profile/resume/search limits, start/frozen inputs, authorization, retries/cancellation, user-reported application tracking, worker health | `finds.tsx`, `vacancies.tsx`, `admin-workflows.tsx` |

Existing inline notices, question descriptions, source notes, validation messages,
declarations and confirmations remain visible. Decorative text, self-explanatory
pagination/close controls and every repeated record cell do not need individual
icons. Dynamic provider questions retain their configured help text; the shared
icon explains upload and evidence-basis semantics rather than inventing legal advice.
No administrator-editable help database, new financial controls, automatic job
submission, live chat or unsupported delivery feature was added.

## Adding guidance

1. Verify the current UI and backend behavior, including prerequisites, permissions
   and consequences. Write one or two plain sentences; add a practical example
   for a complex feature. Essential requirements still belong in visible inline text.
2. Add a stable semantic identifier to `frontend/lib/help-content.ts`. `HelpId`
   is derived from its keys, so integrations are type checked. Optional `example`
   and `link: {href, label}` support richer guidance; link only to real destinations.
3. Import `ContextHelp` beside a heading or use `HelpPair` around a control with
   the help icon as its sibling. Never nest the help button in another link/button
   or inside an implicit form label. For fields, use `className="help-field"`;
   for navigation, `className="help-nav-row"`.

```tsx
<HelpPair id="requirements.publish">
  <button type="button" onClick={publish}>Publish configuration</button>
</HelpPair>

<HelpPair id="request.phone" className="help-field">
  <label>Contact number<input name="phone" type="tel" required /></label>
</HelpPair>

<Status value={service.status} context="service" />
```

Use the correct status domain: application aggregates, individual service approval,
provider identity, customer request, payment and workflow states mean different things.
Navigation and review mappings use stable route slugs/status enums, not display-name
matching. Mount role-specific content only in its owning authenticated screen;
help is informational and never an authorization boundary.

## Interaction and accessibility

The client leaf uses React state and native non-modal Popover API top-layer rendering;
no runtime package or API call is added. The existing green/Inter CSS tokens are used.
Hover or focus opens guidance; a 300ms pointer-travel delay prevents flicker. Click/tap
pins it. Close, Escape, focus leaving and outside clicks dismiss it. Focus returns to
the trigger when closed from inside, and only one help panel stays open at a time.
Open-only listeners and a ResizeObserver reposition it during scrolling/resizing.
Viewport bounds, scrollable content and reduced-motion styles support narrow screens
and enlarged text. Native top-layer rendering avoids table clipping and modal stacking.

The trigger has an explicit accessible name, `aria-expanded`, `aria-controls`,
`aria-haspopup="dialog"` and open-state description association. The panel is a
labelled non-modal dialog with a keyboard-accessible close button; no focus trap or
modal backdrop blocks unrelated controls. Help interactions never call feature handlers.

Validate content contracts with `npm test` and behavior with
`BASE_URL=http://localhost:3100 npm run test:e2e -- e2e/context-help.spec.ts`.
Browser tests stub privileged API responses and mutations: never use personal admin
credentials or real decisions to test explanatory UI. See `VALIDATION.md` for results.
