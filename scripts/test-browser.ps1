param([string]$DockerCommand = 'docker', [string]$NpmCommand = 'npm.cmd')
$ErrorActionPreference = 'Stop'
$env:QA_ADMIN_PASSWORD = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
$taskWorkspace = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Push-Location $taskWorkspace
try {
  & $DockerCommand compose exec -T -e QA_MODE=true -e "QA_ADMIN_PASSWORD=$env:QA_ADMIN_PASSWORD" api python -m app.qa_bootstrap
  if ($LASTEXITCODE -ne 0) { throw 'QA administrator setup failed.' }
  Push-Location (Join-Path $taskWorkspace 'frontend')
  try { & $NpmCommand run test:e2e; if ($LASTEXITCODE -ne 0) { throw 'Browser tests failed.' } }
  finally { Pop-Location }
  & $DockerCommand compose exec -T -e QA_MODE=true api python -m app.qa_cleanup
  if ($LASTEXITCODE -ne 0) { throw 'QA fixture cleanup failed.' }
}
finally { Pop-Location; Remove-Item Env:QA_ADMIN_PASSWORD -ErrorAction SilentlyContinue }
