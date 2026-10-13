# Homepage build and functionality test

Use the dedicated **vistrah-homepage-test** project before advancing Phase 3.
This is local disposable development data, not a production security clearance.
The normal vistrah20 containers, database, volumes and image names are not used.

## Build and start on Windows

Docker Desktop must be running. From PowerShell:

```powershell
& {
    cd "E:\Vistrah 2.0"
    git pull --ff-only
    if ($LASTEXITCODE -ne 0) { throw "Pull failed" }
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-homepage.ps1
    if ($LASTEXITCODE -ne 0) { throw "Homepage test setup failed—stop here" }
}
```

The helper uses only compose.homepage-test.yaml and a fixed test project; builds
API/web/admin/phone images; validates Caddy routing; starts the separate PostgreSQL
volume; runs guarded fixture migrations/bootstrap; runs isolated homepage tests;
starts the clients and checks health/phone JavaScript routing. First build may
require several minutes. It does not start a worker, acquire external jobs,
configure SMTP, read normal secrets or run a normal database migration.

The fixture accepts only its named test database/user/host and development
project marker. A nonempty database without the fixture marker is refused.
Rerunning preserves existing test catalogue/homepage/user edits. Stop and share
an error rather than redirecting the helper to your normal data or deleting data.

## Open the test clients

Use a **private browser window** to keep test cookies separate from normal
localhost sessions. Cookies are not isolated by port alone.

| Client | URL |
|---|---|
| Desktop website | http://127.0.0.1:3111 |
| Admin homepage editor | http://127.0.0.1:3211/admin/homepage |
| Shared phone website | http://127.0.0.1:4111/app/ |
| Test API health | http://127.0.0.1:8111/health |

Test admin: **homepage-admin@example.com**. Test customer:
**homepage-customer@example.com**. Password for both:
**Homepage-test-only-2026!**. These are synthetic local test accounts; no normal
account or production password is created or changed.

The phone website is a production export of native screen source, served with
its same-origin cookie API proxy. It needs no Expo/Metro windows. Use browser
phone emulation at 390px/320px, plus tablet and desktop widths. This does not
establish signed APK/device-native, GPS or Android-version compatibility.

## Automated browser journey

After the helper succeeds, use a new PowerShell command:

```powershell
& {
    cd "E:\Vistrah 2.0\frontend"
    npx.cmd --no-install playwright install chromium
    if ($LASTEXITCODE -ne 0) { throw "Browser install failed" }
    $env:VISTRAH_HOMEPAGE_TEST = "1"
    try {
        npx.cmd --no-install playwright test --config playwright.homepage.config.ts
        if ($LASTEXITCODE -ne 0) { throw "Homepage browser test failed—share the failed step" }
    } finally {
        Remove-Item Env:VISTRAH_HOMEPAGE_TEST -ErrorAction SilentlyContinue
    }
}
```

The browser suite targets only the fixed test ports and requires the explicit
test flag. Ordinary e2e configuration excludes this mutation suite. It signs in
as the test admin, uses real controls to create all three templates, duplicates
and removes a section, reorders sections/cards, saves/previews/publishes, checks
anonymous draft refusal and stale-edit rejection, verifies desktop and 390px
phone rendering, restores a version, publishes and refreshes both clients.
Finally it restores the prior test homepage/draft content through normal APIs.
History remains append-only; it is not erased. A browser/network failure can
interrupt cleanup, so inspect the test editor before reusing it.

HTML report: frontend/playwright-report/homepage/index.html. Failure screenshots
and traces: frontend/test-results/homepage. Inspect with
`npx.cmd playwright show-report playwright-report/homepage` from frontend.
The commands are for the user PC; browser execution is not yet verified here.

## Manual acceptance checklist

- [ ] Admin sign-in and editor load; customer/anonymous cannot edit or read draft.
- [ ] Banner wide/square, grid and carousel limits/unique cards enforced.
- [ ] Add, duplicate, remove and reorder sections and cards; keyboard controls work.
- [ ] Draft preview at phone/desktop widths; unsaved edits never affect public pages.
- [ ] Saved draft stays private; publish updates desktop and shared phone on refresh.
- [ ] Photos and service links load; membership gates on service details remain.
- [ ] No unwanted horizontal overflow at 320/390/tablet/desktop widths.
- [ ] A second editor tab produces a stale revision warning instead of overwriting.
- [ ] Restore changes the draft only; publish restores public content as a new version.
- [ ] Publishing an empty layout returns to the existing homepage.
- [ ] Restart the **test** project and verify published layout persists.

Mark results using actual browser output. Desktop/server-source and shared-phone
exports are distinct from physical Android testing. Do not close the Phase 3
runtime/visual gate just because unit tests pass.

## Stop the test stack

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "E:\Vistrah 2.0\scripts\test-homepage.ps1" -Stop
```

Stops only this test project's containers and retains its test data. It does not
delete volumes or stop normal services. Normal migration 013/rollout remains a
separate backup/recovery and activation gate. The mobile dependency audit and
other production gaps stay open in PRODUCTION_PLAN.md.

## Phase 4 listing screens — separate manual acceptance

After pulling the commerce source, explicitly rerun the existing test setup
helper above to rebuild only the disposable project and apply its current head
(014). It retains synthetic test data. Normal vistrah20 remains untouched.
Do not use this helper against normal or production data.

Use the test clients in a private browser window. Create a synthetic seller
account and owned business through the existing provider application flow; use
the independent test admin to approve the business and at least one service grant.
Do not submit real business documents, credentials or customer data to this project.

- [ ] Desktop /seller and phone /app/seller: owned business exposes product/package controls.
- [ ] Save a product draft with price 0.29; confirm ₹0.29, draft privacy and no rounding.
- [ ] Invalid/zero/negative/three-decimal prices show a useful error without a write.
- [ ] Package selector contains only active approved services for this business.
- [ ] Submit a draft; edit controls disappear while SUBMITTED.
- [ ] Test admin /admin/commerce-listings: inspect description/price/business, enter reason, reject; seller sees reason, edits and resubmits.
- [ ] Approve as independent admin; desktop /commerce and phone /app/commerce show the same listing and exact unit price. Package browsing requires membership.
- [ ] Detail screens show full description, business and price; no ordering or payment action yet.
- [ ] Approved edit warns before save and unpublishes; independent reapproval is required.
- [ ] Stale revision returns reload guidance; Reload listings permits selecting the current row.
- [ ] Archive confirmation hides the listing; unavailable/ineligible listings stay out of public browsing.
- [ ] Pagination, retries, empty lists and 320px/390px/tablet/desktop layouts work.

This is a pending manual checklist. API/contract tests and bundle/build checks do
not prove browser interactions or physical Android compatibility. Admin dashboard
simplification, media uploads, cart/orders and live payments remain later slices.
