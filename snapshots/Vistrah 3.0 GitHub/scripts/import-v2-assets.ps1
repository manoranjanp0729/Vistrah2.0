# Copy exact binary assets from a local V2 checkout into this V3 checkout.
# Run from the V3 repository root; source and destination must differ.
param([Parameter(Mandatory=$true)][string]$V2Root)
$ErrorActionPreference = 'Stop'
$source = (Resolve-Path -LiteralPath $V2Root).Path
$target = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
if ([string]::Equals($source.TrimEnd([char]'\'), $target.TrimEnd([char]'\'), [StringComparison]::OrdinalIgnoreCase)) { throw 'V2 and V3 paths must differ.' }
$paths = @('frontend/app/fonts','frontend/public/images/photos','mobile/assets')
$extensions = @('.png','.jpg','.jpeg','.webp','.woff','.woff2','.ttf','.ico','.gif','.pdf')
$count = 0
foreach ($relative in $paths) {
  $from = Join-Path $source $relative
  if (-not (Test-Path -LiteralPath $from -PathType Container)) { throw "Missing V2 source folder: $from" }
  Get-ChildItem -LiteralPath $from -File -Recurse | Where-Object { $extensions -contains $_.Extension.ToLowerInvariant() } | ForEach-Object {
    $sub = $_.FullName.Substring($source.TrimEnd([char]'\').Length).TrimStart([char]'\')
    $dest = Join-Path $target $sub
    $dir = Split-Path -Parent $dest
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    Copy-Item -LiteralPath $_.FullName -Destination $dest -Force
    if ((Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash) { throw "Hash mismatch: $sub" }
    $count++
  }
}
Write-Host "Copied and SHA256-verified $count original V2 binary assets into V3."
Write-Host 'Review git status and commit the assets to the V3 import branch before building.'
