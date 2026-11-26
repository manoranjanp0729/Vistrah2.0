# Image registry correction

Audited 8 categories, 1 subcategory and all 59 seeded services, including their category/search/related cards, landing pages, enquiry forms and confirmations, and provider directories/details. The registry also inventories public landing pages, account/Finds contexts, authentication/recovery states and all ten admin sections: 97 stable subject/context entries in total. Navigation, tables, forms and dialogs do not contain separate photographic mappings. Provider initials and source vacancy records remain intact.

## Findings and results

The actual previous resolver is captured in `before.json`. Fifty-nine services resolved to only 21 photos, producing 38 repeated assignments. The main causes were a service-slug-only map assigning a single category photograph to many children, legacy SVG-path overrides winning over the curated subject, a hard-coded outdoor subcategory selection, and generic consultation/category defaults for unknown records. There are no runtime external image queries: repeated verification gallery queries in old provenance records describe acquisition evidence, not rendered image selection.

Thirty-nine real photographs were added as optimized local WebP assets, including one Jobs category photograph and 38 service photographs. Forty service mappings changed. Available services now resolve to 57 distinct photographs with zero service-to-service duplicates. The 38 repeated assignments were eliminated, including removal of misleading outdoor imagery from the two missing specialist subjects. The complete 60-asset bundle totals 6,279,436 bytes; no external image requests are needed by the application.

## Registry and missing imagery

`frontend/lib/image-registry.json` uses composite canonical identifiers: `category/{slug}`, `subcategory/{category}/{subcategory}` and `service/{category}/{optional-subcategory}/{service}`. These do not depend on display names or database IDs. Each entry records subject, asset reference, alt text, aspect ratio, focal position, route and all usage surfaces. Its asset reference joins to `photo-assets.json` for the local path, dimensions, object fit, crop notes, author, source page, licence URL, verification evidence, download URL and hash. `current.json` provides the expanded inventory including the previous path.

Shared components use these identifiers, including subcategory headings, enquiry and provider contexts. Legacy backend image fields are retained but cannot override the curated registry. Unknown identifiers and known missing assets render an accessible fixed-ratio message, never an unrelated fallback photograph. Source load failures retain the same box and a separate unavailable message. Editorial contexts use 3:2, cards 4:3, the home hero 16:9, thumbnails 1:1; existing responsive `next/image` sizing and lazy loading remain.

Two licensed subject photographs remain missing: **Retractable Roofing** and **Bioclimatic Pergolas**. Ordinary fixed pergolas and domestic roof repairs do not establish either product. Their cards, pages and enquiry/provider contexts explicitly show “Photograph not yet available”. Glass systems now use a glazed sunroom; outdoor structures retain the genuine fixed pergola photograph. No URLs, licences or attribution were fabricated. The initially selected software-review download returned HTTP 404 and was replaced with a verified downloadable photograph before integration.

All new photographs were selected from official Pexels photo pages with free-download links under the [Pexels License](https://www.pexels.com/license/). Exact download URLs, authors, acquisition dates and original hashes are retained. The 21 existing asset/source/licence records are preserved; existing Unsplash verification records reference official gallery pages. Credits for every asset are in `frontend/public/images/photos/README.md`. These are contextual stock photographs, not VISTRAH staff, listed providers, available properties, advertised employers, completed projects or official Indian tax forms. No AI images were used. No new asset has an unresolved licence record.

## Intentional reuse

`frontend/lib/image-reuse.json` documents 17 exact reuse groups. Seven category headings use a representative service subject, and the outdoor subcategory shares its fixed-structure image with Outdoor Structures. Other reuse is limited to matching contexts: public assistance conversations; member assistance; Jobs workplace context; account/authentication/navigation planning; organized records; administrative requests; professional coordination; business reporting; technical workflows; and cloud/job-source infrastructure. Every exception lists its exact stable identifiers and rationale. All 57 photographed services have different assets. A service's own photo intentionally repeats on its cards, landing, enquiry and provider context surfaces.

The audit rejects new or changed reuse unless its exact identifiers are documented, as well as duplicate asset paths, hashes, source pages and download URLs. It detects renamed copies, missing catalogue coverage, invalid provenance/local paths, missing alt text/crop/ratio/usage records, missing files or modified hashes, stale exceptions and hard-coded component photo props. Missing subject assets require an explicit reason and are reported separately from validation errors.

## Changed files

- Registry and rendering: `frontend/lib/imagery.ts`, `image-registry.json`, `image-reuse.json`, `photo-assets.json`; `frontend/components/visual.tsx`, `catalogue-templates.tsx`, `customer.tsx`.
- Public contexts: `frontend/app/(public)/page.tsx`, `services/page.tsx`, `call-vistrah/page.tsx`, `membership/page.tsx`, `jobs/page.tsx`, `jobs/[id]/page.tsx`; `frontend/app/error.tsx`, `not-found.tsx`.
- Assets and credits: 39 added WebPs under `frontend/public/images/photos/`; its `README.md` lists every filename and credit. Existing binary assets were retained.
- Checks: `frontend/scripts/audit-images.mjs`, `audit-images.test.mjs`, `frontend/lib/imagery.test.ts`, `frontend/e2e/image-registry.spec.ts`, `imagery.spec.ts`, `frontend/vitest.config.ts`, `frontend/package.json` (`audit:images`).
- Reports: `docs/imagery/before.json`, `current.json`, `inventory.md`, this report; the current-registry notice in `docs/IMAGERY.md`. Local acquisition/bundling/contact-sheet helpers and originals remain under `.tools/` for traceability and are excluded from Docker builds.

## Validation

Final checks used the workspace's portable Node 22.16.0:

| Check | Exact result |
|---|---|
| `npm run audit:images -- --write` | Exit 0; 0 errors, 2 explicitly documented missing subjects; 8 categories, 1 subcategory, 59 services, 97 entries, 60 assets; 57 unique service photographs, 0 repeated service assignments; 39 added assets, 40 changed service mappings, 17 exact reuse groups. |
| `npm run test -- lib/imagery.test.ts scripts/audit-images.test.mjs` | Exit 0; 2 files, 9 tests passed. Decoded all 60 WebPs and checked their actual dimensions, hashes and provenance; coverage/stable identifiers/missing behavior plus duplicate, renamed-copy and missing-asset guard failures. |
| `npm run lint` | Exit 0; no errors or warnings. |
| `npm run typecheck` | Exit 0; no TypeScript errors. |
| Targeted Playwright below | Exit 0; 6 passed in 28.2 seconds against the local production frontend on port 3100. |
| `docker compose up --build -d --no-deps web` | Exit 0 after adding Docker Desktop's existing credential-helper directory to this command's PATH; one completed frontend production build, compiled successfully, build TypeScript passed, 7 static pages generated. Only the local web container was refreshed. |

The exact browser selection was:

```powershell
$env:BASE_URL='http://localhost:3100'
node node_modules/@playwright/test/cli.js test e2e/image-registry.spec.ts e2e/imagery.spec.ts --grep 'live catalogue|representative service|specialist cards|enquiries, provider|cold local|authentication sends'
```

Browser checks matched the live API catalogue's 59 canonical identifiers and inspected cards on all 8 category pages. They opened representative services from all 8 categories; checked the outdoor subcategory and its two missing specialist pages plus glass systems; and verified enquiry/provider context, account/profile/requests/Finds and admin overview/providers/workflows at desktop and mobile widths. Widths included 1280, 768, 390 and 320 pixels. Source paths, alt text, local requests, responsive sizing, ratios, overflow, stable reload mappings, initial auth rendering and next-destination handling passed. Cold-load and broken-image layout shift checks remained below 0.1. Account/admin rendering used read-only browser API fixtures; no accounts or database fixtures were created. New contact-sheet assets and representative service/workflow screenshots were visually reviewed.

The initial development-server browser attempt failed because Next development reloads looped under the existing strict CSP (`unsafe-eval` is absent). The security policy was preserved; the final checks used the normal local production runtime. An initial browser test-loader JSON-import error was corrected by reading the registry JSON in the test, then all six selected cases passed. Docker's first build attempt could not locate its credential helper; the process-only PATH correction resolved it without modifying local configuration files.

All 59 mappings were inspected through the generated inventory and live-catalogue checks; individual browsers were not opened for every service, provider detail or authenticated operational subsection. The two absent specialist photographs remain the only documented asset gaps. No complete backend suite, database matrix or unrelated production builds were run. No database, API, authentication, workflow, route, environment file, Docker volume, DNS or remote deployment changes were made.
