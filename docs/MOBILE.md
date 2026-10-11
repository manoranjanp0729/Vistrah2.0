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
  radius selection and an explicitly triggered nearby search. Configurable MapTiler
  reverse lookup turns GPS into area/city labels, with a tiled map preview and zoom
  controls. No background tracking or automatic location saving. Explicit save/clear is available.
- Membership plan, current eligibility and active offers; native sandbox checkout and payment history. No real-payment activation.
- Native password-recovery request; reset links retain the existing secure website flow.

Provider evidence forms, ownership claims, business/listing drafts, admin
management and career workflow tools open the existing website.
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

Location stays temporary unless the user explicitly selects Save this location. Selecting coordinates does not write `/me/location`; save/clear actions use that endpoint and report unavailability on an older API. Saved preferences can be restored on sign-in; account changes clear the previous location.
MapTiler receives coordinates after Use my location for place lookup, and receives
tile requests when a map is displayed. The backend receives coordinates only for
explicit nearby discovery or Save this location and applies radius/provider coverage. Coordinates are not included
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

The native featured image reuses the existing collaboration photograph by
Dylan Gillis, [source](https://unsplash.com/photos/KdeqA3aTnBY), under the
[Unsplash License](https://unsplash.com/license). Its authoritative provenance
is in `frontend/lib/photo-assets.json`. Mobile's V mark is a code-generated
placeholder based on the current VISTRAH wordmark, not a newly approved logo.

Implementation references:
[SDK 57](https://docs.expo.dev/versions/v57.0.0/),
[Router](https://docs.expo.dev/router/installation/),
[SecureStore](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/),
[Location](https://docs.expo.dev/versions/v57.0.0/sdk/location/).

Category tile photographs reuse the existing website assets (resume, property, construction, marketing, finance, technology, collaboration and home-maintenance). Their photographer/source/license records are in `mobile/assets/photo-provenance.json`; all retain the recorded Unsplash license.

## Matched website and mobile interface

`shared/interface-copy.json` is the source for common labels and descriptions.
Run `python scripts/sync-interface-copy.py` after editing it, then
`python scripts/check-interface-parity.py`. Each client bundles its own generated
copy snapshot, so builds keep independent dependencies and release settings.

Matched primary navigation: Discover, Services, Requests, Account. Both offer a
header location selector, the same homepage section order, Digital Marketing
first in Quick Access, five-service hero, photo categories, and business feature.
Website Quick Access retains 6.5/4.5/3.5 cards at desktop/tablet/phone sizes;
native Quick Access shows 3.5. Category/service/search, service-tab descriptions,
member gates, enquiries including PIN and consent-based exact address, requests,
profile, membership/active offers, payment history and provider entry share their
main copy/options. Website rendering retains wider desktop grids.

Mobile added native sandbox checkout and recovery requests. Seller registration,
evidence uploads, owned business/listing drafts, admin management, career workflows,
provider-application history and additional discovery remain established website
flows, with matching account/provider entry labels. These specialized tools are
not new native implementations. Browser handoff/privacy instructions necessarily
explain the mobile behavior. Reset email links open the existing secure website.
Authentication uses secure native tokens versus website HTTP-only cookies.

The live API may not support newer source-level location or publication features.
No API rollout, migrations, seeding, normal-container changes or production
payment setup is authorized by this interface work.


## Live MapTiler location setup

The customer website uses an interactive Leaflet basemap; mobile uses a centred
raster-tile preview with zoom controls, not the paid static-image endpoint.
Use my location requests GPS once, reverse-geocodes the area/city, and immediately
sets a temporary header label. The actual GPS coordinates remain the search point;
a geocoder city centroid never replaces them. Exact street addresses are not
copied from geocoding into enquiry/address fields. No typed-address autocomplete
or automatic reverse lookup on map drags is enabled. Lookup failures leave valid
coordinates for manual locality entry; missing keys keep manual controls available.

1. Create an account at https://cloud.maptiler.com/ and open **API keys**. Choose a
   plan appropriate for your intended commercial use and quotas. No subscription
   or provider account is created by this repository.
2. Create a browser key. For local development, Allowed HTTP origins should list
   `localhost` and `127.0.0.1` (without protocol/port, per provider guidance). Use a
   separate production key restricted to your deployed domain. Keep website and
   native keys separate; origin and User-Agent restrictions combine with AND logic.
3. Add the browser key locally, without committing it:
   - Docker website: root `.env`: `NEXT_PUBLIC_MAPTILER_API_KEY=your_browser_key`
   - Local website dev: `frontend/.env.local`: same variable.
   - Expo browser preview: `mobile/.env`: `EXPO_PUBLIC_MAPTILER_WEB_API_KEY=your_browser_key`
4. For Android/iOS, create a separate key with Allowed User-Agent header set to
   `Vistrah-Mobile-2.0`, then add `EXPO_PUBLIC_MAPTILER_API_KEY=your_native_key` to
   `mobile/.env`. Native geocoding and tile images send that User-Agent.
5. Pull the source and rebuild only the Docker website with:

   ```powershell
   Set-Location 'E:\Vistrah 2.0'
   git pull --ff-only origin reference-theme-mobile
   if ($LASTEXITCODE -eq 0) {
       docker compose -p vistrah20 -f compose.yaml up -d --no-deps --build web
   }
   ```

   Stop the mobile dev server with Ctrl+C, then restart in another terminal:

   ```powershell
   Set-Location 'E:\Vistrah 2.0\mobile'
   npm.cmd start -- --clear
   ```

Public map keys are bundled into clients intentionally; protect them with the
provider's restrictions. Backend passwords/tokens must never be put in these
variables. Native/production restrictions and device headers need a live device
check before release. HTTPS is needed for browser GPS outside localhost.

References: [API keys](https://docs.maptiler.com/guides/credentials/api-key/),
[reverse geocoding](https://docs.maptiler.com/cloud/api/geocoding/),
[Leaflet raster tiles](https://docs.maptiler.com/leaflet/examples/raster-tiles-in-leaflet-js/).


## Restart the local Expo browser preview

Keep Docker Desktop open. Closing PowerShell stops Expo and the local CORS helper,
but normally leaves Docker containers running. Check API health before changing
backend services; this helper never starts, rebuilds or restarts them.

Window 1 (keep open):

```powershell
Set-Location 'E:\Vistrah 2.0'
git pull --ff-only origin reference-theme-mobile
if ($LASTEXITCODE -eq 0) { node.exe mobile/scripts/dev-api-proxy.cjs }
```

In `mobile/.env`, the browser API address must be
`EXPO_PUBLIC_API_URL=http://127.0.0.1:18100`. Keep map keys and other settings.

Window 2 (keep open):

```powershell
Set-Location 'E:\Vistrah 2.0\mobile'
npm.cmd start -- --clear
```

Open the URL Expo displays. The helper allows only localhost/127.0.0.1 origins
on ports 8081 and 8082; it binds only to 127.0.0.1 and is not a production server.
If it reports the backend is unreachable, run the read-only check
`Invoke-RestMethod 'http://127.0.0.1:8100/health'` and share the result.
