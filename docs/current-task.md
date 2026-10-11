# Current task

- Website responsive refinement: Quick Access shows 6.5/4.5/3.5 individual-service cards at desktop/tablet/phone widths, Digital Marketing first. Added five-service automatic hero with pause/reduced-motion behavior, charcoal photo category cards (4–6 columns), and compact desktop typography/spacing. Website typecheck/lint/production build and 101 focused tests passed. Browser visual review remains pending. Source only; normal deployed web unchanged.

- Services for you compact category tiles now use uniform charcoal grey, soft-white labels and subtle grey borders; photos and four-column layout preserved. Typecheck/lint verified.

- Added local category photo thumbnails to Services for you, retaining four columns. Existing licensed website images and their provenance are bundled in mobile. Typecheck/lint verified.

- Changed Grow your business featured photograph to the existing licensed Dylan Gillis collaboration image, updated accessible description and provenance. Typecheck/lint verified.

- Every mobile service detail now includes a compact 112px illustration banner. Current service subjects have specific visual mappings, with category fallback for future catalogue services; illustrations are local code-native graphics with accessible descriptions. Typecheck/lint verified.

- Location selection moved into the tab header with existing temporary location behavior. Quick Access now links to up to ten individual active services; Digital Marketing leads, then popular-flagged services. Preserves 3.5-card viewport and category grid. Typecheck/lint verified.

- Reduced mobile typography, line heights and section/card spacing. Replaced static homepage hero with up to five active catalogue services, prioritizing popular flags, auto-advancing every four seconds while focused; swipe pauses rotation and Play/Pause control is available. Cards link to real service pages. Typecheck/lint verified; device visual review pending.

- Quick Access card width now derives from its measured viewport: three full cards and half of the fourth, accounting for three 12px gaps. Typecheck/lint verified.

- Homepage Quick Access now scrolls horizontally with up to ten functional cards: public jobs, up to eight API categories and provider entry. No placeholder destinations. Typecheck/lint verified.

- Mobile homepage categories now use four compact icon/title tiles per row, including phone widths; category descriptions stay on the service/category journey. Services-tab layout unchanged. Typecheck/lint verified.

- Fixed native raw-text warning: empty error/optional text values now use boolean JSX guards across Jobs and related screens. Typecheck/lint verified.

- Services-tab refinement: main categories first (four columns on wide displays, two on phones); selecting a category opens a dedicated service list. Mobile package typecheck and lint verified.

## Reference theme and new mobile source prepared - 11 October 2026

- New authorized source scope: apply the supplied dark/orange layout to the website and create mobile application code inside Vistrah 2.0. Working base main: b15b7805164267693c5412add227e736b66a079b.
- Website changes: frontend/app/(public)/page.tsx, frontend/app/layout.tsx, new frontend/app/reference-theme.css. Preserve existing routes, membership enforcement, three service tabs, location controls and provider-review behavior.
- New mobile/: Expo SDK 57 / React Native Android/iOS app with Discover, Services, Requests and Account tabs; native auth/profile, public jobs, service detail, three gated service tabs, provider directory, guides, enquiries/history, membership status and temporary manual/explicit-GPS location. No production fake catalogue or providers.
- Provider evidence/onboarding, seller ownership/listing management, admin, recovery and checkout open the existing website. These flows are not implemented natively. See docs/MOBILE.md for scope and setup.
- Passed: web production build/TypeScript/lint and 101 focused frontend tests; mobile TypeScript/lint and 4 focused tests; Android/iOS Hermes and web bundle exports; isolated HTTP checks of 8 website routes, reference sections, anonymous 3-tab gates, a saved member enquiry/history and nonmember rejection.
- Browser visual/interaction QA blocked by browser runtime; native hardware/GPS/keychain behavior and signed APK/IPA builds not verified. Full photography decoding test blocked by missing unrelated image bytes in sparse local checkout; existing remote photo assets untouched. Online dependency directory verification unavailable; installed SDK compatibility metadata and bundle exports passed.
- User authorized commit/push to a new branch and a draft PR. Web and mobile retain separate packages, lockfiles, client API contracts and release configuration. Publishing review branch reference-theme-mobile; review/merge is the next step. Deployment, signed store builds, backend migration, worker action and normal-container replacement remain outside this action.
- Prior deployed frontend and paused API-rollout context remains below; this new source has not been deployed.

## Previously deployed frontend-only replacement - 11 October 2026

- Approved command completed from E:\Vistrah 2.0: docker compose -p vistrah20 -f compose.yaml up -d --no-deps --build web. Latest redesign is live, Next build qvXvCqucsTB9vXMNO9a4p. Only web replaced; API/database/worker IDs, start times and zero restart counts unchanged. No migrations, seeds, volume operations or configuration changes.
- Web/API healthy; frontend /api/health and API /health return 200. Public catalogue via frontend proxy works. Docker production build and TypeScript passed.
- Read-only live browser verification passed homepage, /services, Resume Building detail and guarded directory at 1440/390 px. Chooser below header beside search desktop, stacked above search mobile; not inside header. Manual temporary selection, GPS only on explicit action with denial fallback, 2/5/10/25 km options, unavailable-provider disclosure, eight actual categories, all three gated detail tabs and no horizontal overflow verified.
- Nearby section remains anonymous membership-gated. Affiliate section has no configured brands/links and accurately stays empty. No invented providers/content. Authenticated live data/carousel controls not verified: running API lacks /me/location and /services/{service_id}/nearby. Earlier isolated source checks cover member/nonmember behavior and carousel controls; do not describe them as live checks.
- Updated frontend/scripts/location-entry-live-check.mjs and four planning documents. Initial script run failed due to scrolling caused by tab checks; test corrected and rerun passed eight combinations. Focused lint/whitespace checks passed. Evidence in artifacts/wp05-entry/live-diagnosis.json and live-home-initial-{1440,390}.png, plus full-page screenshots. No account login or normal database writes.
- API rollout remains stopped at earlier maintenance preflight: last observed normal revision 006, worker heartbeat writes prevent a verified write-free window while worker must remain untouched. No API build/replacement, protected backup/image tagging or migrations performed. Revision not queried again during frontend deployment.
- Next prerequisite: explicit authorization to quiesce worker writes, or externally established verified write-free maintenance window, before separately resuming approved API rollout. Do not stop/fence worker implicitly. Recheck revision 006, preserve image/protected backup, apply 007-011 without seeds, use direct-Uvicorn API override and stop on failure. Never automatically downgrade/restore. No further development authorized by this handoff.

