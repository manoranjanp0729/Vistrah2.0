param([switch]$Start)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Invoke-Docker([string[]]$Arguments) {
    $output = & docker @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Docker preflight/action failed. Check Docker Desktop and the existing vistrah20 containers."
    }
    return $output
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot
try {
    if (-not (Test-Path 'compose.yaml') -or -not (Test-Path 'compose.api-runtime.yaml')) {
        throw 'Expected Compose files are missing.'
    }
    Invoke-Docker -Arguments @('info', '--format', '{{.ServerVersion}}') | Out-Null
    foreach ($service in @('db', 'api', 'admin', 'web')) {
        Invoke-Docker -Arguments @('inspect', '--format', '{{.Id}}', "vistrah20-$service-1") | Out-Null
    }
    $apiCommandJson = Invoke-Docker -Arguments @('inspect', '--format', '{{json .Config.Cmd}}', 'vistrah20-api-1')
    $apiCommand = ($apiCommandJson -join "`n") | ConvertFrom-Json
    if (-not $apiCommand -or $apiCommand[0] -ne 'uvicorn') {
        throw 'API command is not the controlled Uvicorn runtime. Do not start a migration/seed command through this helper.'
    }
    if (-not $Start) {
        Write-Host 'Preflight passed. No containers changed. Use -Start to resume the existing local services.'
        return
    }
    Invoke-Docker -Arguments @('compose', '-p', 'vistrah20', '-f', 'compose.yaml', '-f', 'compose.api-runtime.yaml', 'up', '-d', '--no-build', '--no-recreate', '--wait', '--wait-timeout', '120', 'db', 'api', 'admin', 'web') | Out-Null
    $apiHealth = Invoke-RestMethod 'http://127.0.0.1:8100/health' -TimeoutSec 15
    if ($apiHealth.status -ne 'ok') { throw 'API health did not return ok.' }
    Write-Host 'Existing services resumed; API health is ok. Website: http://localhost:3100'
    Write-Host 'Mobile browser preview also needs its API proxy and Expo windows.'
} finally {
    Pop-Location
}
