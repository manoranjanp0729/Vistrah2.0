# Asset inventory

No approved bird-logo asset was supplied. The existing left-side text wordmark
is preserved. Phase 4 adds real stock photography without replacing the logo.

All referenced assets exist in `frontend/public/images/`: `hero.svg`, `career.svg`, `property.svg`, `construction.svg`, `marketing.svg`, `finance.svg`, `technology.svg`, `business.svg`, `home.svg`, `outdoor.svg`, `service.svg`.

These retained local vector illustrations are not photographs of actual providers
or completed projects. Their existing catalogue identifiers remain valid; the
shared presentation layer selects relevant photography without changing stored
data. Category/service illustrations use a 340×220 viewBox; hero uses 560×520.
No remote image or font is essential to the interface.

Replace the text Brand component with the approved logo after it is supplied, preserving its design and left-side placement. Update this inventory when adding assets.

The typography refinement adds locally bundled Inter variable normal/italic and
DM Serif Display regular/italic fonts in `frontend/app/fonts/`, with their SIL
Open Font License notices. See [the typography system](TYPOGRAPHY.md) and the
[font provenance inventory](../frontend/app/fonts/README.md). The existing text
wordmark and typography treatment are preserved.

Phase 4 bundles 21 verified free Unsplash/Pexels photographs as optimized WebP
files in `frontend/public/images/photos/` (2,561,284 bytes in total). See the
[application imagery inventory](IMAGERY.md) for every route/section assignment,
source, licence, credit, intrinsic dimensions, intended ratio and focal crop.
[Public photographer credits](../frontend/public/images/photos/README.md) and
the [machine-readable manifest](../frontend/lib/photo-assets.json) accompany
the files. Stock photography illustrates the service context; it does not
represent actual VISTRAH staff, providers, available properties or customer work.
