# Phase 1 only. Never builds, publishes, connects remotely, or changes runtime/data.
[CmdletBinding()]
param(
    [switch]$Preflight,
    [ValidatePattern('^[a-fA-F0-9]{40}$')][string]$BaseCommit,
    [string]$ReleaseFile,
    [ValidateSet('Text','Json')][string]$Format = 'Text'
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-RebuildPlan {
    param([string[]]$Paths)
    $components = @('api','web','admin','phone-web','worker')
    $reasons = @{}
    foreach ($name in $components) { $reasons[$name] = @() }
    $operations = @()
    $metadata = @()
    $migrations = @()
    foreach ($item in $Paths) {
        $path = $item.Replace('\','/')
        $affected = @()
        if ($path -eq '.dockerignore' -or $path -like 'shared/*') { $affected = $components }
        elseif ($path -like 'backend/app/*' -or $path -like 'backend/migrations/*' -or $path -like 'backend/Dockerfile*' -or $path -in @('backend/requirements.txt','backend/requirements.lock','backend/alembic.ini')) { $affected = @('api','worker') }
        elseif ($path -eq 'frontend/Dockerfile.phone' -or $path -like 'mobile/*' -or $path -eq 'infra/aws-test/Caddyfile.phone') { $affected = @('phone-web') }
        elseif ($path -like 'frontend/*' -or $path -eq 'scripts/interface-phrases.json') { $affected = @('web') }
        elseif ($path -eq 'admin/lib/v-ads-preview.ts') { $affected = @('admin','web') }
        elseif ($path -like 'admin/*') { $affected = @('admin') }
        elseif ($path -like 'infra/*' -or $path -like 'compose*' -or $path -like '.github/*' -or $path -eq 'deploy.ps1' -or $path -like 'scripts/*') { $operations += $path }
        elseif ($path -like 'docs/*' -or $path -like 'backend/tests/*' -or $path -in @('README.md','AGENTS.md','.gitignore','.gitattributes')) { $metadata += $path }
        else { $operations += $path } # Unknown inputs require review, never silent deployment.
        if ($path -like 'backend/migrations/*') { $migrations += $path }
        foreach ($name in $affected) { $reasons[$name] += $path }
    }
    $services = @($components | Where-Object { $reasons[$_].Count -gt 0 })
    $images = @($services | Where-Object { $_ -ne 'worker' })
    if ('worker' -in $services -and 'api' -notin $images) { $images += 'api' }
    return [pscustomobject]@{ services=$services; images=$images; reasons=$reasons; operationalChanges=@($operations); metadataOrTests=@($metadata); changedMigrations=@($migrations) }
}

function Get-ImageLockErrors {
    param($Record, [string]$Repository, [string]$Commit)
    $errors = @()
    if ($null -eq $Record -or $Record -isnot [pscustomobject]) { return @('Release file must contain a JSON object.') }
    foreach ($key in @('schemaVersion','environment','sourceCommit','workflowRun','images')) {
        if ($null -eq $Record.PSObject.Properties[$key]) { $errors += "Release file missing $key." }
    }
    if ($errors.Count) { return $errors }
    if (($Record.schemaVersion -isnot [int] -and $Record.schemaVersion -isnot [long]) -or $Record.schemaVersion -ne 1 -or $Record.environment -cne 'aws-test') { $errors += 'Release file must be schemaVersion 1 and environment aws-test; production is not supported.' }
    if ($Record.sourceCommit -cne $Commit) { $errors += 'Release sourceCommit does not match the inspected HEAD.' }
    if ([string]$Record.workflowRun -cnotmatch ('^https://github\.com/' + [regex]::Escape($Repository) + '/actions/runs/[0-9]+$')) { $errors += 'Release workflowRun must be a run URL in this repository.' }
    if ($Record.images -isnot [pscustomobject]) { return @($errors + 'Release images must be an object.') }
    $names = @($Record.images.PSObject.Properties.Name)
    foreach ($name in @('api','web','admin','phone-web')) {
        $property = $Record.images.PSObject.Properties[$name]
        $expected = '^ghcr\.io/' + [regex]::Escape($Repository.ToLowerInvariant()) + '/' + $name + '@sha256:[a-f0-9]{64}$'
        if ($null -eq $property -or $property.Value -isnot [string] -or $property.Value -cnotmatch $expected) { $errors += "Image $name must be this repository's full release package pinned by sha256 digest (no latest/tag/candidate)." }
    }
    if (@($names | Where-Object { $_ -notin @('api','web','admin','phone-web') }).Count) { $errors += 'Only four release images are accepted; worker reuses the normal API artifact.' }
    return $errors
}

function Get-SourceMigrations {
    param([string]$Root)
    $revisions = @()
    $parents = @()
    foreach ($file in Get-ChildItem -LiteralPath (Join-Path $Root 'backend/migrations/versions') -Filter '*.py' -File) {
        $source = [IO.File]::ReadAllText($file.FullName)
        $revision = [regex]::Match($source, '(?m)^revision\s*(?::[^=\r\n]+)?\s*=\s*[''"]([^''"]+)[''"]')
        if (-not $revision.Success) { continue }
        $parent = [regex]::Match($source, '(?m)^down_revision\s*(?::[^=\r\n]+)?\s*=\s*(?:[''"]([^''"]+)[''"]|(?<initial>None)\b)')
        if (-not $parent.Success) { throw 'Migration metadata needs manual review; no backend code was executed.' }
        $revisions += $revision.Groups[1].Value
        if ($parent.Groups[1].Success) { $parents += $parent.Groups[1].Value }
    }
    if (-not $revisions.Count -or @($revisions | Select-Object -Unique).Count -ne $revisions.Count -or @($parents | Where-Object { $_ -notin $revisions }).Count) { throw 'Migration graph is empty, duplicated, or incomplete.' }
    return [pscustomobject]@{ count=$revisions.Count; sourceHeads=@($revisions | Where-Object { $_ -notin $parents } | Sort-Object); targetRevision='NOT CHECKED (offline)' }
}

function Read-Git {
    param([string]$Root, [string[]]$Arguments)
    # No optional index refresh, fsmonitor hook, pager, external diff, or textconv.
    $gitCommand = Get-Command git -CommandType Application -ErrorAction Stop
    $previousPreference = $ErrorActionPreference
    try {
        # Windows PowerShell turns harmless native stderr (e.g. CRLF warnings)
        # into errors even when redirected; use the actual native exit status.
        $ErrorActionPreference = 'Continue'
        $output = @(& $gitCommand.Source --no-optional-locks -c core.fsmonitor=false -c core.quotePath=false -c core.pager=cat -C $Root @Arguments 2>$null)
        $status = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previousPreference }
    if ($status -ne 0) { throw 'A read-only Git query failed. Verify the branch/base commit and file permissions; nothing changed.' }
    return ($output -join "`n")
}

if (-not $Preflight) { throw 'Phase 1 supports only -Preflight. Publishing and deployment are not implemented or authorized.' }
$root = $PSScriptRoot
$blockers = @()
foreach ($file in @('infra/aws-test/compose.cloud.yaml','infra/aws-test/compose.release.yaml','.github/workflows/ci.yml','.github/workflows/publish-images.yml','docs/RELEASES.md','docs/V_ADS_RELEASE_RUNBOOK.md')) {
    if (-not (Test-Path -LiteralPath (Join-Path $root $file) -PathType Leaf)) { throw "Required preparation source missing: $file" }
}
$branch = Read-Git -Root $root -Arguments @('branch','--show-current')
$commit = Read-Git -Root $root -Arguments @('rev-parse','--verify','HEAD^{commit}')
if ($branch -ne 'feature/simplify-admin-dashboard') { $blockers += 'Expected feature/simplify-admin-dashboard; do not switch automatically.' }
$baseline = 'HEAD'
if ($BaseCommit) {
    $baseline = Read-Git -Root $root -Arguments @('rev-parse','--verify',($BaseCommit + '^{commit}'))
} else { $blockers += 'Last verified deployed commit not supplied. Default HEAD reports pending local edits only, not every change since deployment.' }
$tracked = Read-Git -Root $root -Arguments @('diff','--no-ext-diff','--no-textconv','--no-renames','--name-only','-z',$baseline,'--')
$pendingTracked = Read-Git -Root $root -Arguments @('diff','--no-ext-diff','--no-textconv','--no-renames','--name-only','-z','HEAD','--')
# Git ignore rules plus explicit cache exclusions prevent entering generated/test trees.
$untracked = Read-Git -Root $root -Arguments @('ls-files','--others','--exclude-standard','--exclude=.tmp_pytest_cache/','--exclude=backend/tmp_pytest/','--exclude=**/node_modules/','--exclude=**/.venv/','--exclude=**/.next*/','--exclude=artifacts/','--exclude=.tools/','-z')
$paths = @(($tracked -split "`0") + ($untracked -split "`0") | Where-Object { $_ } | Sort-Object -Unique)
$dirtyPaths = @(($pendingTracked -split "`0") + ($untracked -split "`0") | Where-Object { $_ } | Sort-Object -Unique)
if ($dirtyPaths.Count) { $blockers += 'Uncommitted/untracked files are preserved. Review and explicitly authorize committing/pushing approved source before CI publication; dirty working files are not in GHCR images.' }
$remote = Read-Git -Root $root -Arguments @('config','--get','remote.origin.url')
$match = [regex]::Match($remote, '^(?:https://(?:[^/@\r\n]+@)?github\.com/|git@github\.com:)([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+?)(?:\.git)?$')
if (-not $match.Success) { throw 'Cannot derive an approved GitHub image namespace from origin; remote URL was not printed.' }
$repository = ($match.Groups[1].Value + '/' + $match.Groups[2].Value).ToLowerInvariant()
$plan = Get-RebuildPlan -Paths $paths
$migrations = Get-SourceMigrations -Root $root
if ($migrations.sourceHeads.Count -ne 1) { $blockers += 'Source has multiple migration heads; resolve with review, never run upgrade head automatically.' }
$sourceCloud = [IO.File]::ReadAllText((Join-Path $root 'infra/aws-test/compose.cloud.yaml'))
$publishing = [IO.File]::ReadAllText((Join-Path $root '.github/workflows/publish-images.yml'))
if ($sourceCloud -notmatch 'command: \[uvicorn, app\.main:app, --host, 0\.0\.0\.0, --port, ''8000''\]') { $blockers += 'Cloud source no longer matches the inspected direct-Uvicorn command; review entrypoint and command before any restart.' }
if ($publishing -notmatch 'PUBLISH VERIFIED RELEASE') { $blockers += 'Main publishing workflow lacks the explicit release confirmation gate.' }
$imageLock = 'NOT SUPPLIED'
if ($ReleaseFile) {
    try {
        $record = [IO.File]::ReadAllText((Resolve-Path -LiteralPath $ReleaseFile).Path) | ConvertFrom-Json
        $lockErrors = @(Get-ImageLockErrors -Record $record -Repository $repository -Commit $commit)
        if ($lockErrors.Count) { $blockers += $lockErrors; $imageLock = 'INVALID' } else { $imageLock = 'FORMAT VALID ONLY - registry/CI evidence not verified offline' }
    } catch { $blockers += 'Release file is unreadable or malformed; its contents were not printed.'; $imageLock = 'INVALID' }
} else { $blockers += 'No approved complete four-image digest record supplied. Never promote a partial or failed publish matrix.' }
# These gates are intentionally not cleared by a local JSON file or switch.
$blockers += @(
    'V Ads candidate publication is ON HOLD. This preparation is not permission to resume it; separate explicit publishing/deployment approvals are required.',
    'Current feature branch is not a publishing target. Approved source must reach reviewed main with full CI, or a separately approved eligible candidate (which excludes phone-web).',
    'Hosted CI/audits, registry privacy/read access, quota with blocked overage, image scans/runtime smoke, build-time public settings and isolated rollback rehearsal are not verified by offline preflight.',
    'AWS/SSH access, actual EC2 architecture/capacity, running images/commands/mounts, private env and existing-volume identities are NOT CHECKED. No AWS, SSH, GitHub, Docker or HTTP call is made.',
    'Before API replacement: verify actual DB revision, full pending migration range, all-writer fencing and protected backup/restore rehearsal. Default backend image CMD migrates/seeds; inspect entrypoint and use direct Uvicorn.',
    'AWS base Compose has no persistent API /data mount. Verify existing file-backed CMS/evidence/state and preserve it before replacement; do not add/shadow/create volumes automatically.',
    'Worker stays opt-in. It may share only the normal API artifact, never the Uvicorn-only V Ads runtime image; inventory and separately approve any active-worker change.',
    'These domains and vistrah-cloud are AWS TEST (sandbox memberships). Production entitlement, security/media, device and release gates remain blocked; no production destination is prepared.'
)
$report = [ordered]@{
    phase='1 - local preparation only'; deploymentAllowed=$false; branch=$branch; sourceCommit=$commit; baseCommit=$baseline;
    target=[ordered]@{environment='aws-test';region='ap-south-1';project='vistrah-cloud';site='https://vistrah.in';admin='https://admin.vistrah.in';liveState='NOT CHECKED'};
    changedPaths=$paths; pendingLocalPathCount=$dirtyPaths.Count; proposed=$plan; migrations=$migrations; imageLock=$imageLock;
    imageNamespace=('ghcr.io/' + $repository); composeFiles=@('infra/aws-test/compose.cloud.yaml','infra/aws-test/compose.release.yaml');
    proposedHealthChecks=@('https://api.vistrah.in/health','https://vistrah.in/api/health','https://admin.vistrah.in/api/health','https://vistrah.in/app/','Existing approved worker only: app.workflow_worker_health');
    toolAvailability=@(foreach ($name in @('git','docker','gh','ssh','aws')) { [pscustomobject]@{tool=$name;onPath=[bool](Get-Command $name -ErrorAction SilentlyContinue)} });
    preserved=@('Git branch/index/working files','PostgreSQL database and volumes','persistent media/API state','private env/credentials','worker activation/profile','V Ads hold and production gates');
    blockers=$blockers;
    nextSteps=@('Review and separately authorize exact source commit/push/PR; never publish dirty local bytes.','Reuse publish-images.yml and ci.yml after hold/approval gates; full main four-image path requires PUBLISH VERIFIED RELEASE.','Record successful run, exact commit and all four digests; verify them and schema-compatible rollback before promotion.','Future approved operator explicitly pulls selected digests, retains prior digest/config record and changes only approved app services using the release overlay; no db/proxy/volume changes.');
    cost='No new AWS resources, paid services, registry or billing changes. Future Actions/GHCR usage, network transfer and existing EC2 disk capacity must stay within approved limits.'
}
if ($Format -eq 'Json') { $report | ConvertTo-Json -Depth 10 }
else {
    Write-Output 'VISTRAH deployment preflight: BLOCKED / PREPARATION ONLY'
    Write-Output "Branch: $branch | HEAD: $commit | baseline: $baseline"
    Write-Output "Target: existing AWS TEST vistrah-cloud / ap-south-1 (live state NOT CHECKED)"
    Write-Output ('Proposed service review: ' + ($plan.services -join ', '))
    Write-Output ('Build artifacts via existing workflow: ' + ($plan.images -join ', ') + ' (worker reuses API)')
    Write-Output ('Source schema head(s): ' + ($migrations.sourceHeads -join ', ') + '; live revision NOT CHECKED')
    Write-Output "Pending local paths: $($dirtyPaths.Count) | image lock: $imageLock"
    Write-Output ('Tools on PATH: ' + (($report.toolAvailability | ForEach-Object { $_.tool + '=' + $_.onPath }) -join ', '))
    Write-Output 'Rebuild reasons:'
    foreach ($name in $plan.services) { Write-Output ("  ${name}: $($plan.reasons[$name].Count) input(s); " + (($plan.reasons[$name] | Select-Object -First 4) -join ', ') + ' (full paths: -Format Json)') }
    Write-Output 'Blockers:'
    foreach ($blocker in $blockers) { Write-Output ('  - ' + $blocker) }
    Write-Output $report.cost
    Write-Output 'No build, publish, pull, workflow dispatch, remote check, deployment, migration or volume operation performed. Exit 2 is expected while blocked.'
}
exit 2
