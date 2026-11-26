param(
  [ValidateSet("setup", "build", "up", "status", "fresh-test")]
  [string]$Action = "status"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$web = Join-Path $root "apps/web"

if ($Action -eq "setup" -or $Action -eq "build") {
  $node = Get-Command node.exe -ErrorAction SilentlyContinue
  $nodeExe = if ($node) { $node.Source } else {
    Get-ChildItem (Join-Path $env:LOCALAPPDATA "Microsoft/WinGet/Packages/OpenJS.NodeJS.LTS*") -Filter node.exe -Recurse -ErrorAction SilentlyContinue |
      Select-Object -First 1 -ExpandProperty FullName
  }
  if (-not $nodeExe) { throw "Node.js was not found. Install Node.js 22 LTS or newer." }
  $nodeDir = Split-Path -Parent $nodeExe
  $npm = Join-Path $nodeDir "npm.cmd"
  if (-not (Test-Path -LiteralPath $npm)) { throw "npm.cmd was not found beside $nodeExe." }
  $env:Path = "$nodeDir;$env:Path"
}

if ($Action -ne "setup") {
  $docker = Get-Command docker.exe -ErrorAction SilentlyContinue
  $dockerExe = if ($docker) { $docker.Source } else {
    Join-Path $env:LOCALAPPDATA "Programs/DockerDesktop/resources/bin/docker.exe"
  }
  if (-not (Test-Path -LiteralPath $dockerExe)) { throw "Docker Desktop CLI was not found. Install and start Docker Desktop." }
  $dockerDir = Split-Path -Parent $dockerExe
  $env:Path = "$dockerDir;$env:Path"
}

Push-Location $web
try {
  if ($Action -eq "setup") {
    & $npm ci
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
  if ($Action -eq "build") {
    & $npm run build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
} finally {
  Pop-Location
}

Push-Location $root
try {
  if ($Action -eq "build") { & $dockerExe compose build }
  if ($Action -eq "up") {
    & $dockerExe compose up -d --build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & $dockerExe compose exec -T db psql -v ON_ERROR_STOP=1 -U vistra -d vistra -f /docker-entrypoint-initdb.d/03-admin-schema.sql
  }
  if ($Action -eq "status") { & $dockerExe compose ps }
  if ($Action -eq "fresh-test") {
    $suffix = [Guid]::NewGuid().ToString("N").Substring(0, 8)
    $project = "vistrah-fresh-$suffix"
    $env:VISTRAH_DB_PORT = [string](Get-Random -Minimum 20000 -Maximum 40000)
    $env:VISTRAH_API_PORT = [string](Get-Random -Minimum 40001 -Maximum 50000)
    $env:VISTRAH_WEB_PORT = [string](Get-Random -Minimum 50001 -Maximum 60000)
    try {
      & $dockerExe compose -p $project up -d --build db api
      if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
      $ready = $false
      for ($attempt = 0; $attempt -lt 60; $attempt++) {
        $health = & $dockerExe inspect --format '{{.State.Health.Status}}' "${project}-db-1" 2>$null
        if ($health -eq "healthy") { $ready = $true; break }
        Start-Sleep -Seconds 2
      }
      if (-not $ready) { throw "Fresh PostgreSQL container did not become healthy." }
      & $dockerExe compose -p $project exec -T api python -m pytest -q tests/test_admin_database_integration.py
      if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
      $apiUrl = "http://localhost:$env:VISTRAH_API_PORT"
      $healthResponse = Invoke-RestMethod -Uri "$apiUrl/health" -TimeoutSec 10
      $adminStatus = 0
      try { Invoke-WebRequest -Uri "$apiUrl/api/v1/admin/overview" -TimeoutSec 10 | Out-Null }
      catch { $adminStatus = [int]$_.Exception.Response.StatusCode }
      if ($adminStatus -ne 401) { throw "Fresh API unauthenticated admin check returned $adminStatus; expected 401." }
      Write-Output "Fresh Compose project: $project"
      Write-Output "Fresh Postgres health: $health"
      Write-Output "Fresh API health: $($healthResponse | ConvertTo-Json -Compress)"
      Write-Output "Unauthenticated admin route: HTTP $adminStatus (expected 401)"
      Write-Output "The isolated named volume is preserved when its containers are stopped."
    } finally {
      & $dockerExe compose -p $project down
      Remove-Item Env:VISTRAH_DB_PORT, Env:VISTRAH_API_PORT, Env:VISTRAH_WEB_PORT -ErrorAction SilentlyContinue
    }
  }
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}
