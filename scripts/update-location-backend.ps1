# Controlled update for the authorized, existing PostgreSQL deployment at revision 006.
# No automatic database restore, downgrade, seed, volume deletion or web rebuild.
[CmdletBinding()]
param([string]$ProjectRoot = 'E:\Vistrah 2.0')
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$maintenanceStarted = $false
$backupDirectory = $null
$compose = @('compose', '-p', 'vistrah20', '-f', 'compose.yaml', '-f', 'compose.api-runtime.yaml')
function Run-Native {
    param([string]$Program, [string[]]$Arguments, [switch]$Capture)
    # Windows PowerShell treats native stderr as errors; Alembic writes progress there.
    $priorPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        if ($Capture) { $result = @(& $Program @Arguments); $exitCode = $LASTEXITCODE }
        else { & $Program @Arguments | Out-Host; $exitCode = $LASTEXITCODE }
    } finally { $ErrorActionPreference = $priorPreference }
    if ($exitCode -ne 0) { throw "$Program failed (exit $exitCode). Update stopped." }
    if ($Capture) { return $result }
}
function Preserve-Image {
    param([string]$Image, [string]$Container, [string]$Tag)
    # A running container can survive removal of its original image metadata.
    $priorPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & docker.exe image inspect $Image *> $null
        $imageExists = ($LASTEXITCODE -eq 0)
    } finally { $ErrorActionPreference = $priorPreference }
    if ($imageExists) {
        Run-Native -Program 'docker.exe' -Arguments @('image', 'tag', $Image, $Tag)
        $method = 'original-image-tag'
    } else {
        Write-Host 'Original image is unavailable; preserving the existing container as a local recovery image (brief pause).'
        Run-Native -Program 'docker.exe' -Arguments @('container', 'commit', '--pause=true', $Container, $Tag)
        $method = 'container-snapshot'
    }
    $preserved = ((Run-Native -Program 'docker.exe' -Arguments @('image', 'inspect', '--format', '{{.Id}}', $Tag) -Capture) -join '').Trim()
    if ($preserved -notmatch '^sha256:[a-f0-9]{64}$') { throw 'Recovery image could not be verified.' }
    return [ordered]@{image=$preserved;method=$method;tag=$Tag}
}
function Compose {
    param([string[]]$Arguments, [switch]$Capture)
    Run-Native -Program 'docker.exe' -Arguments ($compose + $Arguments) -Capture:$Capture
}
function Container-State {
    param([string]$Id)
    $raw = Run-Native -Program 'docker.exe' -Arguments @('inspect', '--format', '{{json .State}}', $Id) -Capture
    return (($raw -join "`n") | ConvertFrom-Json)
}
function Sql {
    param([string]$Query)
    return ((Run-Native -Program 'docker.exe' -Arguments @('exec', $script:databaseId, 'psql', '-U', $script:databaseUser, '-d', $script:databaseName, '-At', '-v', 'ON_ERROR_STOP=1', '-c', $Query) -Capture) -join "`n").Trim()
}
function Require-Revision {
    param([string]$Expected)
    $revision = Sql -Query 'SELECT version_num FROM alembic_version'
    if ($revision -ne $Expected) { throw "Expected database revision $Expected; found $revision. No further changes will be made." }
}
function Stop-Writers {
    Compose -Arguments @('stop', '-t', '30', 'worker', 'api')
    foreach ($id in @($script:workerId, $script:apiId)) {
        if ((Container-State -Id $id).Running) { throw 'API or worker is still running. Update stopped.' }
    }
}
try {
    Set-Location -LiteralPath $ProjectRoot
    foreach ($program in @('docker.exe', 'git.exe', 'icacls.exe')) {
        if (-not (Get-Command $program -ErrorAction SilentlyContinue)) { throw "$program is required." }
    }
    foreach ($path in @('compose.yaml', 'compose.api-runtime.yaml', 'backend\Dockerfile', 'backend\migrations\versions\011_location_services.py')) {
        if (-not (Test-Path -LiteralPath $path)) { throw "Missing $path. Pull the review branch first." }
    }
    $branch = ((Run-Native -Program 'git.exe' -Arguments @('branch', '--show-current') -Capture) -join '').Trim()
    if ($branch -ne 'reference-theme-mobile') { throw 'Use the reference-theme-mobile branch for this prepared update.' }
    Run-Native -Program 'git.exe' -Arguments @('diff', '--quiet', 'HEAD', '--', 'backend', 'shared', 'compose.yaml', 'compose.api-runtime.yaml')
    $sourceCommit = ((Run-Native -Program 'git.exe' -Arguments @('rev-parse', 'HEAD') -Capture) -join '').Trim()
    $script:apiId = ((Compose -Arguments @('ps', '-q', 'api') -Capture) -join '').Trim()
    $script:workerId = ((Compose -Arguments @('ps', '-q', 'worker') -Capture) -join '').Trim()
    $script:databaseId = ((Compose -Arguments @('ps', '-q', 'db') -Capture) -join '').Trim()
    if (-not $apiId -or -not $workerId -or -not $databaseId) { throw 'Expected existing running API, worker and database containers. Update stopped.' }
    foreach ($id in @($apiId, $workerId, $databaseId)) {
        if (-not (Container-State -Id $id).Running) { throw 'An expected service is not running.' }
    }
    $script:databaseUser = ((Run-Native -Program 'docker.exe' -Arguments @('exec', $databaseId, 'printenv', 'POSTGRES_USER') -Capture) -join '').Trim()
    $script:databaseName = ((Run-Native -Program 'docker.exe' -Arguments @('exec', $databaseId, 'printenv', 'POSTGRES_DB') -Capture) -join '').Trim()
    if (-not $databaseUser -or -not $databaseName) { throw 'Database identity could not be read.' }
    Require-Revision -Expected '006'
    $oldApiImage = ((Run-Native -Program 'docker.exe' -Arguments @('inspect', '--format', '{{.Image}}', $apiId) -Capture) -join '').Trim()
    $oldWorkerImage = ((Run-Native -Program 'docker.exe' -Arguments @('inspect', '--format', '{{.Image}}', $workerId) -Capture) -join '').Trim()
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
    $backupRoot = Join-Path ([System.IO.Directory]::GetParent((Get-Location).Path).FullName) 'Vistrah-backups'
    $backupDirectory = Join-Path $backupRoot $stamp
    if (Test-Path -LiteralPath $backupDirectory) { throw 'Backup folder already exists. Update stopped.' }
    New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
    $userSid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    Run-Native -Program 'icacls.exe' -Arguments @($backupDirectory, '/inheritance:r', '/grant:r', "*${userSid}:(OI)(CI)F", '*S-1-5-18:(OI)(CI)F')
    $apiTag = "vistrah-api:before-location-$stamp"
    $workerTag = "vistrah-worker:before-location-$stamp"
    $apiRecovery = Preserve-Image -Image $oldApiImage -Container $apiId -Tag $apiTag
    $workerRecovery = Preserve-Image -Image $oldWorkerImage -Container $workerId -Tag $workerTag
    $manifest = [ordered]@{source_commit=$sourceCommit;original_revision='006';target_revision='011';api_image=$oldApiImage;api_backup_tag=$apiTag;worker_image=$oldWorkerImage;worker_backup_tag=$workerTag;api_recovery=$apiRecovery;worker_recovery=$workerRecovery;database_container=$databaseId;created_at=(Get-Date).ToString('o')}
    $manifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $backupDirectory 'manifest.json') -Encoding UTF8
    Write-Host 'Building the new API and worker before maintenance. Existing services stay running during this step.'
    Compose -Arguments @('build', 'api', 'worker')
    $heads = ((Compose -Arguments @('run', '--rm', '--no-deps', '-T', 'api', 'alembic', 'heads') -Capture) -join "`n").Trim()
    if ($heads -notmatch '^011 \(head\)$') { throw "Unexpected migration head: $heads" }
    Write-Host 'Pausing API and worker; database remains running.'
    $maintenanceStarted = $true
    Stop-Writers
    Require-Revision -Expected '006'
    $connections = Sql -Query "SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND backend_type='client backend'"
    if ($connections -ne '0') { throw 'Other database clients are connected. Leave services paused and review those clients before migrating.' }
    $containerDump = "/tmp/vistrah-before-location-$stamp.dump"
    $hostDump = Join-Path $backupDirectory 'database.dump'
    Write-Host 'Creating the database backup.'
    Run-Native -Program 'docker.exe' -Arguments @('exec', $databaseId, 'pg_dump', '-U', $databaseUser, '-d', $databaseName, '-Fc', '-f', $containerDump)
    # Check the archive before copying binary bytes with docker cp (never a PowerShell text pipe).
    $archive = Run-Native -Program 'docker.exe' -Arguments @('exec', $databaseId, 'pg_restore', '--list', $containerDump) -Capture
    if (($archive -join "`n") -notmatch 'TABLE DATA.*alembic_version') { throw 'Backup archive is missing the database revision data.' }
    Run-Native -Program 'docker.exe' -Arguments @('cp', "${databaseId}:$containerDump", $hostDump)
    if (-not (Test-Path -LiteralPath $hostDump) -or (Get-Item -LiteralPath $hostDump).Length -lt 100) { throw 'Backup copy is missing or empty.' }
    $hostHash = (Get-FileHash -LiteralPath $hostDump -Algorithm SHA256).Hash.ToLowerInvariant()
    $containerHash = ((Run-Native -Program 'docker.exe' -Arguments @('exec', $databaseId, 'sha256sum', $containerDump) -Capture) -join '').Split(' ')[0].Trim()
    if ($hostHash -ne $containerHash) { throw 'Backup copy hash did not match.' }
    $hostHash | Set-Content -LiteralPath (Join-Path $backupDirectory 'database.sha256') -Encoding ASCII
    $archive | Set-Content -LiteralPath (Join-Path $backupDirectory 'archive-list.txt') -Encoding UTF8
    $manifest['database_backup_sha256'] = $hostHash
    $manifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $backupDirectory 'manifest.json') -Encoding UTF8
    Write-Host "Verified backup: $hostDump"
    Write-Host 'Checking the backup and rehearsing migrations in a disposable database (no published ports).'
    $retainedCounts = [ordered]@{}
    $tableNames = (Sql -Query "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename") -split "`n"
    foreach ($table in $tableNames) {
        if ($table -notmatch '^[a-z_][a-z0-9_]*$') { throw 'Unexpected table name during preservation checks.' }
        $retainedCounts[$table] = Sql -Query "SELECT count(*) FROM public.$table"
    }
    $retainedCounts | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $backupDirectory 'retained-table-counts.json') -Encoding UTF8
    $testNetwork = "vistrah-location-check-$stamp"
    $testNetworkCreated = $false
    $testDbId = $null
    try {
        Run-Native -Program 'docker.exe' -Arguments @('network', 'create', '--internal', '--label', 'vistrah.disposable=location-update-check', $testNetwork)
        $testNetworkCreated = $true
        $testDbId = ((Run-Native -Program 'docker.exe' -Arguments @('run', '-d', '--pull=never', '--name', $testNetwork, '--label', 'vistrah.disposable=location-update-check', '--network', $testNetwork, '--network-alias', 'backup-check-db', '--tmpfs', '/var/lib/postgresql/data', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:16.6-alpine') -Capture) -join '').Trim()
        if ($testDbId -notmatch '^[a-f0-9]{64}$') { throw 'Disposable database container could not be identified.' }
        $testReady = $false
        for ($attempt=0; $attempt -lt 30; $attempt++) {
            try {
                $null = Run-Native -Program 'docker.exe' -Arguments @('exec', $testDbId, 'pg_isready', '-U', 'postgres', '-d', 'postgres') -Capture
                $testReady = $true; break
            } catch { Start-Sleep -Seconds 1 }
        }
        if (-not $testReady) { throw 'Disposable backup-check database did not start.' }
        Run-Native -Program 'docker.exe' -Arguments @('cp', $hostDump, "${testDbId}:/tmp/backup.dump")
        Run-Native -Program 'docker.exe' -Arguments @('exec', $testDbId, 'pg_restore', '-U', 'postgres', '-d', 'postgres', '--exit-on-error', '--no-owner', '--no-privileges', '/tmp/backup.dump')
        $newApiImage = ((Run-Native -Program 'docker.exe' -Arguments @('image', 'inspect', '--format', '{{.Id}}', 'vistrah20-api') -Capture) -join '').Trim()
        # This container has no normal volumes or normal DATABASE_URL/secret; only the disposable DB is reachable.
        Run-Native -Program 'docker.exe' -Arguments @('run', '--rm', '--pull=never', '--network', $testNetwork, '-e', 'DATABASE_URL=postgresql+psycopg://postgres@backup-check-db:5432/postgres', '-e', 'JWT_SECRET=disposable-location-migration-check-0000000000000000', '-e', 'SOURCE_NETWORK_ENABLED=false', '-e', 'SEED_CATALOGUE=false', '--entrypoint', 'alembic', $newApiImage, 'upgrade', '011')
        $testRevision = ((Run-Native -Program 'docker.exe' -Arguments @('exec', $testDbId, 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1', '-c', 'SELECT version_num FROM alembic_version') -Capture) -join '').Trim()
        if ($testRevision -ne '011') { throw 'Disposable rehearsal did not reach revision 011.' }
        foreach ($table in $retainedCounts.Keys) {
            $count = ((Run-Native -Program 'docker.exe' -Arguments @('exec', $testDbId, 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1', '-c', "SELECT count(*) FROM public.$table") -Capture) -join '').Trim()
            if ($count -ne $retainedCounts[$table]) { throw "Rehearsal changed the retained row count for $table. Normal migration will not run." }
        }
        'Restore and migrations 007-011 succeeded; existing table row counts retained.' | Set-Content -LiteralPath (Join-Path $backupDirectory 'rehearsal-passed.txt') -Encoding UTF8
    } finally {
        if ($testDbId -and $testDbId -match '^[a-f0-9]{64}$') { Run-Native -Program 'docker.exe' -Arguments @('rm', '-f', $testDbId) }
        if ($testNetworkCreated) { Run-Native -Program 'docker.exe' -Arguments @('network', 'rm', $testNetwork) }
    }
    Require-Revision -Expected '006'
    foreach ($id in @($workerId, $apiId)) {
        if ((Container-State -Id $id).Running) { throw 'A writer restarted during rehearsal. Update stopped.' }
    }
    $connections = Sql -Query "SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND backend_type='client backend'"
    if ($connections -ne '0') { throw 'Other database clients connected during rehearsal. Update stopped.' }
    foreach ($table in $retainedCounts.Keys) {
        if ((Sql -Query "SELECT count(*) FROM public.$table") -ne $retainedCounts[$table]) { throw 'Database row counts changed during rehearsal. Update stopped.' }
    }
    Write-Host 'Applying migrations 007 through 011. Seeding is not run.' 
    Compose -Arguments @('run', '--rm', '--no-deps', '-T', 'api', 'alembic', 'upgrade', '011')
    Require-Revision -Expected '011'
    foreach ($table in $retainedCounts.Keys) {
        if ((Sql -Query "SELECT count(*) FROM public.$table") -ne $retainedCounts[$table]) { throw "Normal migration changed the retained row count for $table. Services will remain paused." }
    }
    if ((Sql -Query "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='saved_location'") -ne '1') { throw 'Saved-location column is missing after migration.' }
    Compose -Arguments @('up', '-d', '--no-deps', '--no-build', 'api')
    $healthy = $false
    for ($attempt=0; $attempt -lt 30; $attempt++) {
        try {
            $health = Invoke-RestMethod 'http://127.0.0.1:8100/health' -TimeoutSec 3
            if ($health.status -eq 'ok') { $healthy=$true; break }
        } catch { }
        Start-Sleep -Seconds 2
    }
    if (-not $healthy) { throw 'Updated API did not become healthy.' }
    $openapi = Invoke-RestMethod 'http://127.0.0.1:8100/openapi.json' -TimeoutSec 10
    $locationPath = $openapi.paths.PSObject.Properties['/me/location']
    if ($null -eq $locationPath -or $null -eq $locationPath.Value.PSObject.Properties['get'] -or $null -eq $locationPath.Value.PSObject.Properties['put']) { throw 'The updated location read/save endpoint is missing.' }
    Compose -Arguments @('up', '-d', '--no-deps', '--no-build', 'worker')
    $updatedWorkerId = ((Compose -Arguments @('ps', '-q', 'worker') -Capture) -join '').Trim()
    $workerHealthy = $false
    for ($attempt=0; $attempt -lt 30; $attempt++) {
        $state = Container-State -Id $updatedWorkerId
        if (-not $state.Running) { throw 'Updated worker exited.' }
        if ($state.Health.Status -eq 'healthy') { $workerHealthy=$true; break }
        Start-Sleep -Seconds 2
    }
    if (-not $workerHealthy) { throw 'Updated worker did not become healthy.' }
    $maintenanceStarted = $false
    Write-Host 'SUCCESS: database 011; API and worker healthy; location read/save endpoint available.'
    Write-Host "Protected backup and old image references: $backupDirectory"
    Write-Host 'Keep compose.api-runtime.yaml in future API/worker Compose commands to avoid automatic migration/seeding.'
    Write-Host 'Reload the app, sign in if needed, choose a location and try Save this location.'
} catch {
    Write-Host "STOPPED: $($_.Exception.Message)" -ForegroundColor Red
    if ($maintenanceStarted) {
        Write-Host 'Keeping API and worker paused. No automatic restore or downgrade will be attempted.'
        try { Compose -Arguments @('stop', '-t', '30', 'worker', 'api') } catch { Write-Host 'Could not confirm services are paused. Check Docker service status immediately.' -ForegroundColor Red }
    }
    if ($backupDirectory) { Write-Host "Backup/checkpoint folder: $backupDirectory" }
    throw
}
