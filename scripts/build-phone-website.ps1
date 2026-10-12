param([string]$OutputDirectory = 'E:\Vistrah-deploy')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$dockerOs = docker info --format '{{.OSType}}'
if ($LASTEXITCODE -ne 0 -or $dockerOs.Trim() -ne 'linux') { throw 'Docker Desktop must be running with Linux containers.' }

# Only public map keys are read; private deployment settings are not copied.
function Get-PublicEnvValue([string]$Name, [string]$FilePath) {
    $value = [Environment]::GetEnvironmentVariable($Name)
    if (-not $value -and (Test-Path $FilePath)) {
        foreach ($line in Get-Content $FilePath) {
            if ($line -match ('^\s*' + [regex]::Escape($Name) + '\s*=\s*(.*)$')) {
                $value = $Matches[1].Trim().Trim('"').Trim("'")
            }
        }
    }
    return $value
}
$browserKey = Get-PublicEnvValue 'EXPO_PUBLIC_MAPTILER_WEB_API_KEY' (Join-Path $root 'mobile\.env')
$buildArgs = @('build', '-f', 'frontend/Dockerfile.phone', '-t', 'vistrah20-phone-web:latest')
if ($browserKey) { $buildArgs += @('--build-arg', "EXPO_PUBLIC_MAPTILER_WEB_API_KEY=$browserKey") }
$buildArgs += '.'
& docker @buildArgs
if ($LASTEXITCODE -ne 0) { throw 'Phone website image build failed; nothing was deployed.' }
New-Item -ItemType Directory -Force $OutputDirectory | Out-Null
$archive = Join-Path $OutputDirectory 'phone-website.tar'
docker image save -o $archive vistrah20-phone-web:latest
if ($LASTEXITCODE -ne 0) { throw 'Image export failed; nothing was deployed.' }
Get-Item $archive | Select-Object -Property @('FullName', 'Length')
(Get-FileHash $archive -Algorithm SHA256).Hash
Write-Host 'Phone website image exported. Upload and activate it separately.'

# Refresh the existing website proxy image for the shared browser form limits.
$webKey = Get-PublicEnvValue 'NEXT_PUBLIC_MAPTILER_API_KEY' (Join-Path $root '.env')
if (-not $webKey) { $webKey = Get-PublicEnvValue 'NEXT_PUBLIC_MAPTILER_API_KEY' (Join-Path $root 'frontend\.env') }
$webBuildArgs = @('build', '-f', 'frontend/Dockerfile', '-t', 'vistrah20-web:latest')
if ($webKey) { $webBuildArgs += @('--build-arg', "NEXT_PUBLIC_MAPTILER_API_KEY=$webKey") }
$webBuildArgs += '.'
& docker @webBuildArgs
if ($LASTEXITCODE -ne 0) { throw 'Website proxy image build failed; nothing was deployed.' }
$webArchive = Join-Path $OutputDirectory 'website-proxy.tar'
docker image save -o $webArchive vistrah20-web:latest
if ($LASTEXITCODE -ne 0) { throw 'Website proxy image export failed; nothing was deployed.' }
Get-Item $webArchive | Select-Object -Property @('FullName', 'Length')
(Get-FileHash $webArchive -Algorithm SHA256).Hash
