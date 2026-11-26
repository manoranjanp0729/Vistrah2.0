$ErrorActionPreference='Stop'
$root='E:\Vistrah 2.0'
if (-not (Test-Path -LiteralPath (Join-Path $root '.git'))) { throw 'VISTRAH 2.0 repo not found.' }
Set-Location -LiteralPath $root
if ((git branch --show-current).Trim() -ne 'reference-theme-mobile') { throw 'Expected reference-theme-mobile branch. Nothing changed.' }
$here=Split-Path -Parent $MyInvocation.MyCommand.Path
$targets=@(
 'frontend/components/reference-hero-carousel.tsx',
 'mobile/src/components/service-carousel.tsx',
 'frontend/app/(public)/page.tsx',
 'mobile/src/app/(tabs)/index.tsx'
)
foreach($f in $targets){if(-not(Test-Path -LiteralPath $f)){throw "Missing $f. Nothing changed."}}
$webPath=(Resolve-Path -LiteralPath 'frontend/app/(public)/page.tsx').Path
$mobilePath=(Resolve-Path -LiteralPath 'mobile/src/app/(tabs)/index.tsx').Path
$web=[IO.File]::ReadAllText($webPath)
$mobile=[IO.File]::ReadAllText($mobilePath)
if($web -notmatch '<ReferenceHeroCarousel\s*/>'){throw 'Website carousel integration not found. Nothing changed.'}
if($mobile -notmatch '<ServiceCarousel\s*/>'){throw 'Mobile carousel integration not found. Nothing changed.'}
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss'
$backup=Join-Path $root "hero-backup-$stamp"
New-Item -ItemType Directory -Path $backup | Out-Null
foreach($f in $targets){$dest=Join-Path $backup $f;New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent)|Out-Null;Copy-Item -LiteralPath $f -Destination $dest}
# Existing changes in the homepage and marketing remain untouched.
Copy-Item -LiteralPath (Join-Path $here 'reference-hero-carousel.tsx') -Destination 'frontend/components/reference-hero-carousel.tsx' -Force
Copy-Item -LiteralPath (Join-Path $here 'service-carousel.tsx') -Destination 'mobile/src/components/service-carousel.tsx' -Force
foreach($i in 1..5){
 foreach($folder in @('frontend/public/hero-journey','mobile/assets/hero-journey')){
  New-Item -ItemType Directory -Force -Path $folder | Out-Null
  Copy-Item -LiteralPath (Join-Path $here "step-$i.webp") -Destination (Join-Path $folder "step-$i.webp") -Force
 }
}
# Make carousel visible on the published-homepage branch too, without changing other sections.
$web=[IO.File]::ReadAllText($webPath)
$needle='<p className="reference-lead">{copy.home.description}</p></div></section><PublishedHomepage'
if($web.Contains($needle)){$web=$web.Replace($needle,'<p className="reference-lead">{copy.home.description}</p></div><ReferenceHeroCarousel/></section><PublishedHomepage')}
[IO.File]::WriteAllText($webPath,$web,(New-Object Text.UTF8Encoding($false)))
$mobile=[IO.File]::ReadAllText($mobilePath)
$needle='<Text style={styles.muted}>{copy.home.description}</Text><PublishedHomepage'
if($mobile.Contains($needle)){$mobile=$mobile.Replace($needle,'<Text style={styles.muted}>{copy.home.description}</Text><ServiceCarousel/><PublishedHomepage')}
[IO.File]::WriteAllText($mobilePath,$mobile,(New-Object Text.UTF8Encoding($false)))
Write-Host "Illustrated hero installed. Backups: $backup"
Write-Host 'Run frontend and mobile TypeScript checks before committing.'
