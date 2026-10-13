param([switch]$Stop, [switch]$Commerce)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$repoRoot = Split-Path -Parent $PSScriptRoot
$composeArgs = @('compose', '--env-file', '.env.test.example', '-p', 'vistrah-homepage-test', '-f', 'compose.homepage-test.yaml')
function Invoke-TestDocker([string[]]$Arguments) {
    & docker @Arguments
    if ($LASTEXITCODE -ne 0) { throw 'Homepage test action failed. Stop here; the normal vistrah20 project was not targeted.' }
}
Push-Location $repoRoot
try {
    Invoke-TestDocker -Arguments @('info', '--format', '{{.ServerVersion}}')
    Invoke-TestDocker -Arguments ($composeArgs + @('config', '--quiet'))
    if ($Stop) {
        Invoke-TestDocker -Arguments ($composeArgs + @('stop'))
        Write-Host 'Homepage test containers stopped. Test volumes and normal services retained.'
        return
    }
    Invoke-TestDocker -Arguments ($composeArgs + @('build', 'api', 'web', 'admin', 'phone-web'))
    Invoke-TestDocker -Arguments ($composeArgs + @('run', '--rm', '--no-deps', 'preview', 'caddy', 'validate', '--config', '/etc/caddy/Caddyfile'))
    Invoke-TestDocker -Arguments ($composeArgs + @('up', '-d', '--wait', '--wait-timeout', '120', 'db'))
    Invoke-TestDocker -Arguments ($composeArgs + @('run', '--rm', '--no-deps', 'api', 'python', '-m', 'app.homepage_test_fixture'))
    if ($Commerce) {
        Invoke-TestDocker -Arguments ($composeArgs + @('run', '--rm', '--no-deps', 'api', 'python', '-m', 'app.commerce_test_fixture'))
        Invoke-TestDocker -Arguments ($composeArgs + @('run', '--rm', '--no-deps', '-e', 'TEST_DATABASE_URL=sqlite:////tmp/commerce-qa-test.db', 'api', 'python', '-m', 'pytest', '-q', 'tests/test_commerce_listings.py', 'tests/test_commerce_orders.py', 'tests/test_commerce_fixture.py'))
    }
    Invoke-TestDocker -Arguments ($composeArgs + @('run', '--rm', '--no-deps', '-e', 'TEST_DATABASE_URL=sqlite:////tmp/homepage-qa-test.db', 'api', 'python', '-m', 'pytest', '-q', 'tests/test_homepage.py', 'tests/test_homepage_migration.py', 'tests/test_homepage_fixture.py'))
    Invoke-TestDocker -Arguments ($composeArgs + @('up', '-d', '--wait', '--wait-timeout', '180', 'api', 'web', 'admin', 'phone-web', 'preview'))
    $health = Invoke-RestMethod 'http://127.0.0.1:8111/health' -TimeoutSec 15
    if ($health.status -ne 'ok') { throw 'Disposable API health check failed.' }
    foreach ($url in @('http://127.0.0.1:3111/', 'http://127.0.0.1:3211/admin/homepage', 'http://127.0.0.1:4111/app/')) {
        $result = Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 20
        if ($result.StatusCode -ne 200) { throw 'Disposable client health check failed.' }
    }
    $phoneHtml = Invoke-WebRequest 'http://127.0.0.1:4111/app/' -UseBasicParsing -TimeoutSec 20
    $bundlePath = [regex]::Match($phoneHtml.Content, 'src="([^"<>]+\.js)"').Groups[1].Value
    if (-not $bundlePath.StartsWith('/app/')) { throw 'Phone export has no expected app JavaScript bundle.' }
    $bundle = Invoke-WebRequest ('http://127.0.0.1:4111' + $bundlePath) -UseBasicParsing -TimeoutSec 20
    if ($bundle.Headers['Content-Type'] -notmatch 'javascript') { throw 'Phone JavaScript routing returned the wrong content type.' }
    Write-Host 'Homepage QA ready. Use a private browser window for test cookies.'
    Write-Host 'Desktop: http://127.0.0.1:3111  Admin: http://127.0.0.1:3211/admin/homepage  Phone website: http://127.0.0.1:4111/app/'
    Write-Host 'Test admin: homepage-admin@example.com  Test customer: homepage-customer@example.com'
    Write-Host 'Disposable test password for both: Homepage-test-only-2026!'
    if ($Commerce) {
        Write-Host 'Commerce: /commerce/cart and /commerce/orders; admin /admin/vistrah-services and /admin/commerce-orders'
        Write-Host 'Synthetic seller: commerce-seller@example.com  Independent admin: commerce-reviewer@example.com'
        Write-Host 'Both use Homepage-test-only-2026!; service packages need sandbox test membership.'
    }
    Write-Host 'Next: follow docs/HOMEPAGE_QA.md. Production audit remains blocked.'
} finally { Pop-Location }
