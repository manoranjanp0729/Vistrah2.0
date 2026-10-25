"""Local-only PowerShell preparation checks; no fixtures, containers or cloud calls."""
from hashlib import sha256
import json
import os
from pathlib import Path
import shutil
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[2]
POWERSHELL = shutil.which('powershell.exe') or shutil.which('pwsh')


@unittest.skipUnless(POWERSHELL, 'Windows PowerShell or pwsh is required')
class DeploymentPreparationTests(unittest.TestCase):
    def powershell(self, source):
        env = dict(os.environ, VISTRAH_PREFLIGHT_TEST_ROOT=str(ROOT))
        return subprocess.run([POWERSHELL, '-NoProfile', '-NonInteractive', '-Command', source],
                              cwd=ROOT, env=env, capture_output=True, text=True, timeout=60)

    def test_dependency_mapping_and_digest_validation_without_running_entrypoint(self):
        result = self.powershell(r'''
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = $env:VISTRAH_PREFLIGHT_TEST_ROOT
$tokens = $null; $errors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile((Join-Path $root 'deploy.ps1'), [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw 'PowerShell syntax errors' }
# Load only pure helper definitions, never the deployment entrypoint.
foreach ($statement in $ast.EndBlock.Statements) {
    if ($statement -is [Management.Automation.Language.FunctionDefinitionAst]) { . ([scriptblock]::Create($statement.Extent.Text)) }
}
function Assert-Services([string[]]$Paths, [string[]]$Expected) {
    $plan = Get-RebuildPlan -Paths $Paths
    if (($plan.services -join ',') -cne ($Expected -join ',')) { throw ('Incorrect dependencies: ' + ($Paths -join ',')) }
    if ('worker' -in $plan.images) { throw 'Worker must reuse the API artifact' }
}
Assert-Services @('shared/locales/en.json') @('api','web','admin','phone-web','worker')
Assert-Services @('.dockerignore') @('api','web','admin','phone-web','worker')
Assert-Services @('backend/app/main.py','backend/migrations/versions/deleted.py') @('api','worker')
Assert-Services @('mobile/assets/fonts/a.ttf','frontend/Dockerfile.phone','infra/aws-test/Caddyfile.phone') @('phone-web')
Assert-Services @('admin/lib/v-ads-preview.ts') @('web','admin')
Assert-Services @('frontend/components/photo-card.tsx','scripts/interface-phrases.json') @('web')
Assert-Services @('admin/components/edit-vistrah.tsx') @('admin')
Assert-Services @('backend/tests/test_example.py','docs/current-task.md','infra/aws-test/Caddyfile') @()
$plan = Get-RebuildPlan -Paths @('frontend/old.tsx','admin/new.tsx')
if (($plan.services -join ',') -ne 'web,admin') { throw 'Cross-directory rename/deletion coverage failed' }
$commit = 'a' * 40
$record = [pscustomobject]@{schemaVersion=1;environment='aws-test';sourceCommit=$commit;workflowRun='https://github.com/owner/repo/actions/runs/123';images=[pscustomobject]@{}}
foreach ($name in @('api','web','admin','phone-web')) { $record.images | Add-Member -NotePropertyName $name -NotePropertyValue ('ghcr.io/owner/repo/' + $name + '@sha256:' + ('b' * 64)) }
if (@(Get-ImageLockErrors $record 'owner/repo' $commit).Count) { throw 'Valid digest record rejected' }
foreach ($invalid in @('ghcr.io/owner/repo/api:latest','ghcr.io/owner/repo/candidate-api@sha256:' + ('b'*64),'ghcr.io/other/repo/api@sha256:' + ('b'*64),'$(echo bad)')) {
    $record.images.api = $invalid
    if (-not @(Get-ImageLockErrors $record 'owner/repo' $commit).Count) { throw 'Unsafe image accepted' }
}
$record.images.api = 'ghcr.io/owner/repo/api@sha256:' + ('b'*64)
$record.environment = 'production'
if (-not @(Get-ImageLockErrors $record 'owner/repo' $commit).Count) { throw 'Production accepted' }
$record.environment = 'aws-test'; $record.sourceCommit = 'c'*40
if (-not @(Get-ImageLockErrors $record 'owner/repo' $commit).Count) { throw 'Wrong commit accepted' }
$record.sourceCommit = $commit; $record.schemaVersion = $true
if (-not @(Get-ImageLockErrors $record 'owner/repo' $commit).Count) { throw 'Boolean schema version accepted' }
$migration = Get-SourceMigrations $root
if ($migration.sourceHeads.Count -ne 1 -or $migration.count -lt 1) { throw 'Migration graph invalid' }
$forbidden = @('aws','ssh','scp','docker','docker.exe','gh','Invoke-WebRequest','Invoke-RestMethod','Invoke-Expression','Start-Process','New-Item','Set-Content','Out-File','Remove-Item')
foreach ($command in $ast.FindAll({param($node) $node -is [Management.Automation.Language.CommandAst]}, $true)) {
    if ($command.GetCommandName() -in $forbidden) { throw 'Preflight contains a mutating or external-service command' }
}
Write-Output 'PASS: dependency graph, renames, immutable image/source/environment constraints, migration metadata, no external/mutating commands.'
''')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_actual_preflight_preserves_index_and_reports_blocked(self):
        index = ROOT / '.git' / 'index'
        before = sha256(index.read_bytes()).hexdigest() if index.is_file() else None
        result = subprocess.run([POWERSHELL, '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
                                 '-File', str(ROOT / 'deploy.ps1'), '-Preflight', '-Format', 'Json'],
                                cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertFalse(report['deploymentAllowed'])
        self.assertEqual(report['target']['environment'], 'aws-test')
        self.assertEqual(report['target']['liveState'], 'NOT CHECKED')
        self.assertTrue(report['blockers'])
        self.assertNotIn('worker', report['proposed']['images'])
        if before:
            self.assertEqual(sha256(index.read_bytes()).hexdigest(), before, 'Git index changed')

    def test_no_implicit_deployment_entrypoint(self):
        result = subprocess.run([POWERSHELL, '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', str(ROOT / 'deploy.ps1')],
                                cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('only -Preflight', result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
