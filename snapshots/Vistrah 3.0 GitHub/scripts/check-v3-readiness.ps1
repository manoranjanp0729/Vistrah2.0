# Read-only V3 migration readiness checks; does not start containers or touch V2.
param([string]$V2Root = '')
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$required = @('frontend/package.json','frontend/package-lock.json','frontend/app/layout.tsx','frontend/app/fonts.ts','frontend/Dockerfile','backend/Dockerfile','backend/app/main.py','backend/migrations/versions/011_location_services.py','shared/catalogue.json','mobile/package.json','mobile/app.json','mobile/src/app/_layout.tsx','compose.yaml')
$missing = @()
foreach ($p in $required) { if (-not (Test-Path -LiteralPath (Join-Path $root $p) -PathType Leaf)) { $missing += $p } }
$assets = @('frontend/app/fonts/DMSerifDisplay-Regular.ttf','frontend/app/fonts/InterVariable.woff2','frontend/public/images/photos/consultation.webp','mobile/assets/icon.png','mobile/assets/android-icon-foreground.png','mobile/assets/consultation.webp')
foreach ($p in $assets) { if (-not (Test-Path -LiteralPath (Join-Path $root $p) -PathType Leaf)) { $missing += $p } }
$expo = Get-Content -LiteralPath (Join-Path $root 'mobile/app.json') -Raw | ConvertFrom-Json
if ($expo.expo.slug -ne 'vistrah3' -or $expo.expo.android.package -ne 'in.vistrah.app.v3' -or $expo.expo.ios.bundleIdentifier -ne 'in.vistrah.app.v3') { throw 'V3 mobile app identity is not isolated.' }
$compose = Get-Content -LiteralPath (Join-Path $root 'compose.yaml') -Raw
if ($compose -notmatch '(?m)^name:\s*vistrah30\s*$' -or $compose -notmatch 'WEB_PORT:-3200' -or $compose -notmatch 'API_PORT:-8200' -or $compose -notmatch 'POSTGRES_DB:-vistrah3') { throw 'V3 Compose isolation checks failed.' }
if ($V2Root) {
  $source = (Resolve-Path -LiteralPath $V2Root).Path
  if ($source -eq $root) { throw 'V2 and V3 must be different directories.' }
  $assetDirs = @('frontend/app/fonts','frontend/public/images/photos','mobile/assets')
  foreach ($folder in $assetDirs) {
    $from = Join-Path $source $folder
    if (-not (Test-Path -LiteralPath $from -PathType Container)) { throw "V2 asset directory missing: $from" }
    Get-ChildItem -LiteralPath $from -File -Recurse | Where-Object { @('.png','.jpg','.jpeg','.webp','.woff','.woff2','.ttf','.ico','.gif','.pdf') -contains $_.Extension.ToLowerInvariant() } | ForEach-Object {
      $rel = $_.FullName.Substring($source.TrimEnd([char]'\').Length).TrimStart([char]'\')
      $dest = Join-Path $root $rel
      if (-not (Test-Path -LiteralPath $dest -PathType Leaf)) { $missing += $rel }
      elseif ((Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash) { throw "Asset differs from V2: $rel" }
    }
  }
}
if ($missing.Count) { Write-Host 'V3 is NOT ready; missing files:'; $missing | Sort-Object -Unique | ForEach-Object { Write-Host " - $_" }; exit 1 }
Write-Host 'Source/asset and isolation checks passed. Builds, runtime and visual parity still require testing.'
