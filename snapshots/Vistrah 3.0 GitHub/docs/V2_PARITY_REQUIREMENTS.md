# Mandatory V2 visual and functional parity — V3 change control

## User directive (2026-10-14)

VISTRAH 3.0 website and Expo Android app **must look exactly like VISTRAH 2.0** in homepage and existing content. Preserve all current layout, navigation, fonts, colours, spacing, images, service cards, components, responsive behavior, tabs, and existing functioning flows. **No unsolicited redesign.** Only change the agreed core business model and add features/services such as VISTRAH Ads & Marketing, hiring, new memberships, admin workflows. Do not replace original screens with a generic new frontend starter.

## Source of truth

- Use latest user-approved V2 running visual state, not merely the old GitHub commit. V2 is concurrently changing in a separate window; audit the exact current reference before making a parity claim.
- Pin an immutable V2 commit for migration, collect screenshots for desktop (including 1440px), narrow mobile web (390px), and Expo Android, and compare screen-by-screen.
- Preserve V2's original bundled Inter/DM Serif fonts and all legally reusable assets. User-supplied approved light/dark logo files override older V2 logos; confirm exact reference in current V2 app before any replacement.
- Preserve existing V2 functionality by adapting verified code rather than recreating simplified screens.
- V3 runs with isolated git repository, processes, ports, credentials, storage and database. No V2 mutation.

## Permitted changes

1. Replace V2 customer-membership monetization and discovery gates with free customer browsing and seller plans: Basic ₹149, Plus ₹799, Premium ₹1,899 per month.
2. Add new membership page while retaining V2 visual components and layout conventions.
3. Add Ads & Marketing category and services, including business advertising, billboard and creative workflows, without moving/replacing existing homepage sections unless explicitly approved.
4. Add new approved catalogue services, seller/admin approvals, order workflows and job-credit entitlements.
5. Add navigation entries only where necessary and in existing V2 styles.

## Acceptance gates

- Existing V2 homepage and content: no unapproved visual diffs at matching viewport and fixture state.
- Existing mobile tabs, navigation, service discovery, account and seller entry: parity with latest approved V2 Android app.
- Existing functions: regression tests must pass before and after adding features.
- New screens: use V2 design tokens and existing components.
- Document all intentional visual changes and get user approval for exceptions.
- New payment, memberships, credit issuance and order authority require backend checks and isolated V3 persistence in Stage 3.

## Correction to prior plan

The standalone Next.js ZIP starter is a **temporary preview only**, **not** the approved V3 foundation. Do not commit or treat it as a replacement for V2 UI. V3 implementation must be a selective, auditable extension of V2 code after reference capture and license/security review.
