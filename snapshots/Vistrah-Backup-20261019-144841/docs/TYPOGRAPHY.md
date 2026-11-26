# VISTRAH typography

## Architecture and audit

The application uses Next.js App Router, plain shared CSS and local React
components. There is no Tailwind configuration or separate component styling
framework. The root layout loads `app/globals.css` for public and admin routes.
Previously, the undefined `Vistrah Sans` family fell back to Arial, headings used
Georgia, and many breakpoint rules reduced UI text to 7–11px.

The refinement extends that same stylesheet and its existing design tokens.
There are no component-level font declarations or additional styling systems.
Existing wordmarks retain their Arial treatment, dimensions, tracking, weights
and responsive sizes. Brand greens, backgrounds, content, navigation, imagery,
routes and semantic heading levels are preserved. Muted text and warning/error
text shades were strengthened where necessary for contrast; spacing and layout
rules remain intact apart from wrapping and scroll accommodations for text.
Public and admin headers retain their original minimum heights and can grow
when enlarged text wraps, rather than clipping it inside a fixed height.

Audit coverage:

| Area | Shared templates/components |
| --- | --- |
| Public | Root/public layouts, header/mobile navigation/footer, homepage, services/search, category/subcategory/service details, provider directory/detail, membership, contact, public vacancies/details |
| Account | Login/register, auth gates, service request/confirmation, account navigation, overview/profile/requests/membership/orders/payments, sandbox checkout |
| Finds | Request list, capabilities, preparation/discovery plans, profile/preferences, vacancy inputs, approvals, progress/actions, saved facts, matches/drafts, application statuses, event/execution history |
| Operations | Admin shell, overview/stats, catalogue, providers/provider services, requests, offers, payments/ledger/audit, workflow history/worker health and job-source administration |
| Shared UI | Forms/labels/inputs/placeholders/help text, buttons/links, breadcrumbs, cards, table headers/cells/actions/pagination, badges, notices/errors, dialogs, summaries/legends, loading/empty/not-found/error states |

There is no custom tooltip component in the current app. Native browser UI
retains the browser's own rendering; application controls inherit Inter.

## Fonts

`frontend/app/fonts.ts` defines the requested fonts with
[next/font/local](https://nextjs.org/docs/app/api-reference/components/font).
The root layout applies their variables once. Original font files and SIL OFL
licenses are committed under `frontend/app/fonts/`; see that directory's README
for official sources, sizes and SHA-256 fingerprints.

Normal variable Inter (100–900) is preloaded. Inter italic, DM Serif Display
normal and DM Serif Display italic are separate faces with `preload:false`, so
unused faces need not be downloaded. Files have hashed local asset URLs and
immutable caching; builds require no font-service network access. All faces use
`display:swap`, with Next's metric-adjusted Arial/Times New Roman fallbacks.

The UI uses real Inter weights 400/500/600/700. Serif headings and their italic
emphasis use only DM Serif Display's available weight 400. `font-synthesis:none`
prevents synthetic bold/italic. Numbers in tables, metrics and prices use
tabular figures. Full font character sets are retained for names and currencies.

Inter is the default, including operational H1/H2 headings, forms and service
cards. DM Serif Display is restricted to public hero/page headlines, editorial
section headings, selected promotional/help headings and the existing membership
V motif. The shared `.type-editorial` role can opt a future promotional heading
into this treatment; `.type-display` supplies the hero scale independently of
heading semantics. Italic emphasis uses an actual italic face from the selected
family.

## Shared scale

Sizes below assume the default 16px root. Fluid sizes use `rem + vw` within
`rem` bounds, preserving user text scaling. Responsive rules never shrink reading
or interface text. Visual card and dense panel scales are independent of their
semantic heading levels.

| Token | Size |
| --- | --- |
| `--type-display` | 36–64px (about 36px at 390px, 52px at 1024px, 62px at 1440px) |
| `--type-h1` | 30–44px |
| `--type-h2` | 28–32px |
| `--type-h3` | 22–24px; also dense panel/dialog headings |
| `--type-h4` | 18–20px; service/category/action card headings |
| `--type-body-lg` | 18px |
| `--type-body` | 16px; body and text-entry controls |
| `--type-secondary` | 14px; navigation, labels, buttons, tables, secondary card copy |
| `--type-meta` | 13px; helper text and compact history metadata |
| `--type-caption` | 12px; badges, eyebrows, table captions and compact labels |

Weights are `--weight-regular/medium/semibold/bold` (400/500/600/700).
Line heights are `--leading-display` 1.1, `--leading-heading` 1.2,
`--leading-card` 1.35, `--leading-body` 1.65, `--leading-ui` 1.45,
and `--leading-label` 1.4. Tracking is `--tracking-display` −0.02em,
`--tracking-heading` −0.025em, `--tracking-normal` 0 and
`--tracking-label` 0.06em.

Additional shared tokens cover numerical metrics/prices, avatar initials and the
existing membership motif. The Adzuna attribution token remains 23px, preserving
its source-specific minimum dimensions. Branding lockups are intentionally
exempt from the reading scale.

## Validation

Validation results and limitations are recorded in `VALIDATION.md`.
`frontend/e2e/typography.spec.ts` verifies real local faces, UI weights, synthetic
font prevention, delayed-font layout stability, direct admin font loading,
responsive dialogs and narrow/text-scaled layouts. Existing functional browser
tests continue to exercise account, request, membership, Finds and admin flows.
Screenshots are retained under `artifacts/` and `artifacts/typography/` locally.

## Files changed

- `frontend/app/globals.css`: shared families, scale, weights, leading/tracking,
  role mappings, responsive reading sizes, wrapping/containment and text contrast.
- `frontend/app/layout.tsx`: apply the font variables once at the root.
- `frontend/app/fonts.ts`: local font loading, preloading and adjusted fallbacks.
- `frontend/app/fonts/InterVariable.woff2` and `InterVariable-Italic.woff2`.
- `frontend/app/fonts/DMSerifDisplay-Regular.ttf` and `DMSerifDisplay-Italic.ttf`.
- `frontend/app/fonts/Inter-OFL.txt` and `DMSerifDisplay-OFL.txt`.
- `frontend/app/fonts/README.md`: font provenance, fingerprints and weights.
- `frontend/e2e/typography.spec.ts`: font-loading/accessibility regressions.
- `docs/TYPOGRAPHY.md`, `docs/ASSETS.md`, `docs/VALIDATION.md`: system, asset
  inventory, coverage and validation notes.

No backend, business component, route, schema, dependency or environment
configuration files are changed by this task. Existing records and volumes are
preserved. Browser tests use the project's labelled development QA fixtures.
