# VISTRAH mobile application

The new `mobile/` project is an Expo SDK 57 / React Native application for
Android and iOS, with a web preview for development. It uses the existing
FastAPI API directly. It is not a WebView wrapper. The Next.js website remains
in `frontend/`; the two projects keep independent dependency lockfiles. Mobile
owns its API type declarations and has no build-time imports from frontend.
Both clients use the same backend accounts and data, while releases are independent.

Deploy the website from `frontend/` using the existing web build/hosting setup.
Build Android/iOS from `mobile/` using its EAS profiles and approved HTTPS API
configuration. A mobile release does not rebuild the website, and a website
release does not rebuild mobile. The Expo web output is a development preview;
`frontend/` remains the production website. Website handoff features require
`EXPO_PUBLIC_WEB_URL` to point to the deployed website.

Both interfaces follow the October 11 reference: black canvas, charcoal
surfaces, orange primary actions, white headings, rounded cards, pastel service
categories, quick access and featured opportunities. Homepage categories come
from the API; Real Estate and Tax & Compliance lead the presentation when
present. No products, providers, vacancies or success metrics are fabricated.
The hero artwork is a local procedural visual interpretation of the reference.

## Implemented native flows

- Discover, catalogue search and category filtering, including nested services.
- Source-listed public jobs with pagination, provenance and original links.
- Customer registration/sign-in using the existing identity, profile editing,
  secure native session restoration and logout.
- Three service tabs: Find Service Provider, VISTRAH Recommended and VISTRAH
  Services. Eligible membership gates provider data, preparation guides and
  service enquiries. Backend authorization remains authoritative.
- Member provider directory, service preparation guides, intent-preserving
  enquiries and the customer's request history.
- Manual temporary coordinates and explicit foreground GPS action; 2/5/10/25 km
  radius selection and an explicitly triggered nearby search. No geocoder,
  external map, background tracking or automatic location saving.
- Membership plan and current eligibility. No real-payment activation.

Provider evidence forms, ownership claims, business/listing drafts, admin
management, password recovery and sandbox checkout open the existing website.
They are not native implementations in this first mobile release. Browser
authentication is separate; tokens are never placed in URLs or sent to the
website. Seller membership exemption and independent reviews remain enforced
by the existing server flows.

## Configure and run

From the repository root:

```powershell
cd mobile
npm ci
Copy-Item .env.example .env
# Edit .env with reachable API and website addresses.
npm start
```

For an Android emulator, the example uses `http://10.0.2.2:8100` for the API
and `http://10.0.2.2:3100` for the website. Use the actual ports selected in
your root development configuration. The app does not change Compose ports,
bind addresses, containers or backend startup.

The existing Compose API binds to loopback. A physical phone cannot reach that
API by substituting the computer's LAN IP. For an Android device connected by
USB, developer-authorized `adb reverse tcp:8100 tcp:8100` and
`adb reverse tcp:3100 tcp:3100` can forward the existing local ports; use
`http://127.0.0.1:8100` / `http://127.0.0.1:3100` in mobile/.env then.
An iOS simulator uses its Mac's loopback address. A physical iPhone needs a
separately configured reachable development service. Do not expose or replace
the running API implicitly.

`EXPO_PUBLIC_API_URL` points to FastAPI, without the Next.js `/api` prefix.
`EXPO_PUBLIC_WEB_URL` points to Next.js. Both are public configuration bundled
into the app; never put passwords, tokens or secret keys in these variables.
Restart Metro after changing them. Missing configuration produces an error
instead of fake catalogue data. Native HTTP is allowed only during development;
release builds require HTTPS. The web preview also needs the API's explicit
allowed CORS origin. Configure an isolated development API rather than changing
the normal deployment for a preview.

Use `npm run android`, `npm run ios` or `npm run web` for local development.
The native dependencies include `expo-dev-client`; use a development build
when the installed Expo Go version cannot support this project's SDK/modules.
See the [Expo development-build guide](https://docs.expo.dev/develop/development-builds/introduction/).

## Authentication and privacy

Native JWTs are stored in Expo SecureStore and validated with `/me` on startup.
API requests send bearer credentials to the configured API only, with a timeout
and redirects rejected. A rejected session clears the device token. Sign-out
clears native storage and attempts server revocation; an unreachable server is
reported after local sign-out. The web preview keeps its token in memory only.
No passwords or session data are logged or checked into source.

Location lives in memory. Selecting coordinates does not write `/me/location`.
Coordinates are sent only when the user explicitly starts nearby discovery;
the backend applies radius and provider coverage. Coordinates are not included
in enquiries. A missing nearby endpoint reports that the API version does not
support the feature and leaves the member directory available.

## Checks and current limits

Completed in this task:

- Website TypeScript, lint and production build; 101 frontend tests passed.
- Mobile TypeScript, lint and four focused API/catalogue tests passed.
- Expo exported Android and iOS Hermes bundles and a web bundle successfully.
- SDK dependency versions checked against the installed SDK's compatibility
  metadata; online React Native Directory checks were unavailable.
- Eight website HTTP routes, reference sections, three anonymous service tabs,
  member enquiry persistence and nonmember denial passed against an isolated
  in-memory QA fixture. No normal database writes.

The full frontend image suite was attempted but its binary-file decoding check
could not run in the sparse checkout, which materialized only the photograph
needed here. Its registry and catalogue tests passed. Existing photo files in
GitHub have not been changed.

Browser screenshot/interaction verification was blocked by the environment's
browser runtime. Layout and on-device GPS/keychain/navigation behavior remain
to be checked on Android and iOS. Bundle export is not a signed APK/IPA or an
app-store submission. No deployment, signing, store upload, migrations or
normal-container changes occurred.

The existing handoff records the live API behind the source schema/endpoints.
Source-level mobile capabilities are not proof that those endpoints are
available on the current running API. Keep the separately paused API rollout
and worker-maintenance authorization boundary intact.

## Build preparation

`eas.json` provides development, internal Android APK preview and production
profiles. Configure your Expo project and approved HTTPS services before making
a signed build. Confirm app identifiers `in.vistrah.app` before registering them
with either store. Signing credentials and actual EAS builds/submissions need
their own authorization and are not part of this source change.

Verification:

```sh
cd mobile
npm run typecheck
npm run lint
npm run test
npx expo export --platform all
```

## Assets and references

The native featured image reuses the existing consultation photograph by
Amy Hirschi, [source](https://unsplash.com/photos/JaoVGh5aJ3E), under the
[Unsplash License](https://unsplash.com/license). Its authoritative provenance
is in `frontend/lib/photo-assets.json`. Mobile's V mark is a code-generated
placeholder based on the current VISTRAH wordmark, not a newly approved logo.

Implementation references:
[SDK 57](https://docs.expo.dev/versions/v57.0.0/),
[Router](https://docs.expo.dev/router/installation/),
[SecureStore](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/),
[Location](https://docs.expo.dev/versions/v57.0.0/sdk/location/).
