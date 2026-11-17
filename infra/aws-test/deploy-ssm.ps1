<#
.SYNOPSIS
Zero-SSH deployment helper for VISTRAH 2.0 via AWS Systems Manager (SSM Run Command).

.DESCRIPTION
Executes container image pulls (optional ECR), safe rollback tagging, Docker Compose
service recreation, and local + HTTPS health checks on EC2 instance i-08287d636ff13ddf0
(ap-south-1) over IAM-authenticated SSM without opening TCP Port 22 on sg-0bfc5b562b0051b03.
Never touches PostgreSQL containers/volumes or triggers automatic DB migrations/seeding.
#>
[CmdletBinding()]
param(
    [ValidatePattern('^i-[a-f0-9]{8,17}$')]
    [string]$InstanceId = 'i-08287d636ff13ddf0',

    [ValidatePattern('^[a-z]{2}-[a-z]+-\d+$')]
    [string]$Region = 'ap-south-1',

    [string]$Profile = 'vistrah-manu',

    [ValidateSet('api', 'web', 'phone-web', 'admin')]
    [string[]]$Services = @('api', 'web', 'phone-web'),

    [string]$EcrRegistry = '',

    [ValidatePattern('^[A-Za-z0-9._-]+$')]
    [string]$ImageTag = 'latest',

    [int]$TimeoutSeconds = 300,

    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($EcrRegistry -and $EcrRegistry -notmatch '^\d{12}\.dkr\.ecr\.[a-z0-9-]+\.amazonaws\.com$') {
    throw "Invalid ECR registry host '$EcrRegistry'. Expected '<12-digit-account>.dkr.ecr.<region>.amazonaws.com'."
}

$uniqueServices = $Services | Select-Object -Unique
$serviceList = $uniqueServices -join ' '

$remoteCommands = @(
    'set -euo pipefail',
    'cd /home/ec2-user/vistrah',
    '[[ -f compose.cloud.yaml ]] || { echo "Missing compose.cloud.yaml in /home/ec2-user/vistrah" >&2; exit 1; }',
    '# Hydrate /home/ec2-user/vistrah/.env from KMS-encrypted AWS SSM Parameter Store (/vistrah/prod/*)',
    "python3 - '$Region' <<'PY'",
    'import json, os, pathlib, subprocess, sys',
    'region = sys.argv[1]',
    'raw = subprocess.check_output(["aws", "ssm", "get-parameters-by-path", "--region", region, "--path", "/vistrah/prod/", "--recursive", "--with-decryption", "--output", "json"], text=True)',
    'params = json.loads(raw).get("Parameters", [])',
    'if not params:',
    '    raise SystemExit("Refusing rollout: zero parameters found under /vistrah/prod/ in SSM Parameter Store")',
    'lines = []',
    'for item in sorted(params, key=lambda x: x["Name"]):',
    '    k = item["Name"].rsplit("/", 1)[-1]',
    '    v = item["Value"].replace("\r", "").replace("\n", "")',
    '    lines.append(f"{k}={v}")',
    'target = pathlib.Path("/home/ec2-user/vistrah/.env")',
    'tmp = pathlib.Path("/home/ec2-user/vistrah/.env.ssm.tmp")',
    'fd = os.open(str(tmp), os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)',
    'with os.fdopen(fd, "w", encoding="utf-8") as fh:',
    '    fh.write("\n".join(lines) + "\n")',
    'tmp.replace(target)',
    'print(f"Hydrated {len(lines)} SecureString parameters from /vistrah/prod/* into .env (0600)")',
    'PY',
    'sudo chown ec2-user:ec2-user /home/ec2-user/vistrah/.env && sudo chmod 600 /home/ec2-user/vistrah/.env',
    '[[ -f .env ]] || { echo "Missing .env in /home/ec2-user/vistrah" >&2; exit 1; }',
    '# Safety invariant: ensure api service runs uvicorn directly (never alembic/seed)',
    'grep -Eq "command:.*uvicorn" compose.cloud.yaml || { echo "Refusing rollout: api command in compose.cloud.yaml does not specify direct uvicorn" >&2; exit 1; }',
    'stamp=$(date -u +%Y%m%d-%H%M%S)',
    'declare -A rollback_tags=()',
    "for svc in $serviceList; do",
    '  cname="vistrah-cloud-${svc}-1"',
    '  if sudo docker inspect "$cname" >/dev/null 2>&1; then',
    '    current_img=$(sudo docker inspect "$cname" --format "{{.Image}}")',
    '    rtag="vistrah20-${svc}:rollback-${stamp}"',
    '    sudo docker image tag "$current_img" "$rtag"',
    '    rollback_tags[$svc]="$rtag"',
    '  fi',
    'done'
)

if ($EcrRegistry) {
    $ecrRegion = ($EcrRegistry -split '\.')[3]
    $remoteCommands += @(
        "aws ecr get-login-password --region $ecrRegion | sudo docker login --username AWS --password-stdin $EcrRegistry",
        "for svc in $serviceList; do",
        "  remote_ref=`"$EcrRegistry/vistrah20-`${svc}:$ImageTag`"",
        '  sudo docker pull "$remote_ref"',
        '  sudo docker image tag "$remote_ref" "vistrah20-${svc}:latest"',
        'done'
    )
}

$remoteCommands += @(
    'rollback_services() {',
    '  echo "Rollout failed; restoring previous container image tags..." >&2',
    "  for svc in $serviceList; do",
    '    if [[ -n "${rollback_tags[$svc]:-}" ]]; then',
    '      sudo docker image tag "${rollback_tags[$svc]}" "vistrah20-${svc}:latest"',
    '    fi',
    '  done',
    "  sudo docker compose --ansi never -f compose.cloud.yaml up -d --no-deps --wait --wait-timeout 90 $serviceList || true",
    '}',
    "if ! sudo docker compose --ansi never -f compose.cloud.yaml up -d --no-deps --wait --wait-timeout 120 $serviceList; then",
    '  rollback_services',
    '  exit 1',
    'fi',
    'sudo docker image prune -f >/dev/null',
    'sudo docker compose --ansi never -f compose.cloud.yaml ps',
    'curl --fail --silent --show-error --max-time 15 https://vistrah.in/api/health',
    'echo ""',
    'df -h /'
)

$ssmParameters = @{ commands = $remoteCommands } | ConvertTo-Json -Compress -Depth 4

if ($DryRun) {
    Write-Output "[DryRun] Target Instance: $InstanceId ($Region) | Services: $serviceList"
    Write-Output "[DryRun] SSM AWS-RunShellScript payload:"
    Write-Output ($remoteCommands -join "`n")
    return
}

$awsBaseArgs = @('--region', $Region)
if ($Profile) {
    $awsBaseArgs += @('--profile', $Profile)
}

Write-Output "1/4 Verifying SSM agent connectivity on $InstanceId ($Region)..."
$pingStatus = & aws ssm describe-instance-information @awsBaseArgs `
    --filters "Key=InstanceIds,Values=$InstanceId" `
    --query 'InstanceInformationList[0].PingStatus' `
    --output text

if ($LASTEXITCODE -ne 0 -or $pingStatus.Trim() -ne 'Online') {
    throw "Instance $InstanceId is not Online in SSM (status: '$pingStatus'). Attach the AmazonSSMManagedInstanceCore instance profile first (see infra/aws-test/README.md)."
}

Write-Output "2/4 Dispatching Zero-SSH rollout for [$serviceList] via AWS SSM Run Command..."
$paramFile = Join-Path ([System.IO.Path]::GetTempPath()) ("vistrah-ssm-params-" + [guid]::NewGuid().ToString('N') + ".json")
try {
    [System.IO.File]::WriteAllText($paramFile, $ssmParameters, (New-Object System.Text.UTF8Encoding($false)))
    $commandId = (& aws ssm send-command @awsBaseArgs `
        --instance-ids $InstanceId `
        --document-name 'AWS-RunShellScript' `
        --comment "VISTRAH Zero-SSH rollout ($serviceList)" `
        --timeout-seconds $TimeoutSeconds `
        --parameters "file://$paramFile" `
        --query 'Command.CommandId' `
        --output text).Trim()
    if ($LASTEXITCODE -ne 0 -or -not $commandId) {
        throw 'Failed to dispatch AWS SSM send-command.'
    }
} finally {
    Remove-Item -Force $paramFile -ErrorAction SilentlyContinue
}

Write-Output "3/4 Waiting for SSM CommandId $commandId to complete..."
$deadline = (Get-Date).AddSeconds($TimeoutSeconds + 30)
$invocation = $null
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 4
    $raw = & aws ssm get-command-invocation @awsBaseArgs `
        --command-id $commandId `
        --instance-id $InstanceId `
        --output json 2>$null
    if ($LASTEXITCODE -eq 0 -and $raw) {
        $invocation = $raw | ConvertFrom-Json
        if ($invocation.Status -in @('Success', 'Failed', 'Cancelled', 'TimedOut', 'Cancelling')) {
            break
        }
    }
}

if (-not $invocation) {
    throw "Timed out polling SSM CommandId $commandId on $InstanceId."
}

if ($invocation.StandardOutputContent) {
    Write-Output $invocation.StandardOutputContent.TrimEnd()
}
if ($invocation.StandardErrorContent) {
    Write-Warning $invocation.StandardErrorContent.TrimEnd()
}
if ($invocation.Status -ne 'Success') {
    throw "SSM deployment command $commandId ended with status '$($invocation.Status)' (ResponseCode: $($invocation.ResponseCode))."
}

Write-Output "4/4 Verifying external HTTPS health endpoint..."
$healthResp = Invoke-WebRequest -Uri 'https://vistrah.in/api/health' -Method Get -UseBasicParsing -TimeoutSec 20
if ([int]$healthResp.StatusCode -ne 200) {
    throw "External health probe returned HTTP $([int]$healthResp.StatusCode)."
}
Write-Output "Zero-SSH SSM deployment succeeded: https://vistrah.in/api/health -> HTTP $([int]$healthResp.StatusCode) $($healthResp.Content)"
