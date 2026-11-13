param(
    [Parameter(Mandatory=$true)][string]$KeyPath,
    [string]$Server = 'ec2-user@35.154.22.29',
    [switch]$PreflightOnly,
    [switch]$UseInstanceConnect
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
foreach ($tool in @('ssh','scp','docker','npm.cmd','node')) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "Required command unavailable: $tool" }
}
if (-not (Test-Path -LiteralPath $KeyPath -PathType Leaf)) { throw "Key not found: $KeyPath" }
$stamp = [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')
$image = "vistrah20-phone-web:ui-$stamp"
$archive = Join-Path $root "artifacts\aws-phone-$stamp.tar"
$privateDir = Join-Path ([IO.Path]::GetTempPath()) ('vistrah-phone-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $privateDir | Out-Null
try {
    # Restrict the temporary copy before putting a private key in this directory.
    $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
    $acl = New-Object Security.AccessControl.DirectorySecurity
    $acl.SetOwner($sid)
    $acl.SetAccessRuleProtection($true,$false)
    $acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow')))
    Set-Acl -LiteralPath $privateDir -AclObject $acl
    $privateKey = Join-Path $privateDir 'deployment.pem'
    $keyText = [IO.File]::ReadAllText((Resolve-Path -LiteralPath $KeyPath).Path)
    $keyMatch = [regex]::Match($keyText.Trim(),'\A-----BEGIN (RSA PRIVATE KEY|OPENSSH PRIVATE KEY|PRIVATE KEY)-----\s*([A-Za-z0-9+/=\s]+?)\s*-----END \1-----\z')
    if (-not $keyMatch.Success) { throw 'The key file has no supported private-key envelope; nothing deployed.' }
    $keyType = $keyMatch.Groups[1].Value
    $payload = [regex]::Replace($keyMatch.Groups[2].Value,'\s','')
    $wrapped = [regex]::Replace($payload,'.{1,64}',('$0' + "`n"))
    $normalized = "-----BEGIN $keyType-----`n" + $wrapped + "-----END $keyType-----`n"
    [IO.File]::WriteAllText($privateKey,$normalized,(New-Object Text.UTF8Encoding($false)))
    $sshArgs = @('-o','BatchMode=yes','-o','IdentitiesOnly=yes','-o','ConnectTimeout=15','-i',$privateKey)
    if ($UseInstanceConnect) {
        foreach ($tool in @('aws','ssh-keygen')) {
            if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "Required command unavailable: $tool" }
        }
        $instanceJson = & aws ec2 describe-instances --region ap-south-1 --instance-ids i-0dbdebb8b05f15783 --query 'Reservations[0].Instances[0].{IP:PublicIpAddress,Zone:Placement.AvailabilityZone}' --output json --cli-connect-timeout 10 --cli-read-timeout 10
        if ($LASTEXITCODE -ne 0) { throw 'Could not verify the EC2 Instance Connect target.' }
        $instance = $instanceJson | ConvertFrom-Json
        if ($Server -ne ('ec2-user@' + $instance.IP)) { throw 'Server does not match the approved EC2 instance; deployment stopped.' }
        $publicKey = & ssh-keygen -y -f $privateKey
        if ($LASTEXITCODE -ne 0) { throw 'Private key validation failed; deployment stopped.' }
        $publicKeyPath = Join-Path $privateDir 'deployment.pub'
        [IO.File]::WriteAllText($publicKeyPath,($publicKey.Trim() + "`n"),(New-Object Text.UTF8Encoding($false)))
    }
    function Enable-TemporarySshAccess {
        if (-not $UseInstanceConnect) { return }
        $result = & aws ec2-instance-connect send-ssh-public-key --region ap-south-1 --instance-id i-0dbdebb8b05f15783 --instance-os-user ec2-user --availability-zone $instance.Zone --ssh-public-key "file://$publicKeyPath" --output json --cli-connect-timeout 10 --cli-read-timeout 10
        if ($LASTEXITCODE -ne 0) { throw 'EC2 Instance Connect did not authorize the temporary connection.' }
        if (-not ($result | ConvertFrom-Json).Success) { throw 'EC2 Instance Connect authorization was rejected.' }
    }
    Enable-TemporarySshAccess
    & ssh @sshArgs $Server 'cd /home/ec2-user/vistrah && sudo docker inspect vistrah-cloud-phone-web-1 --format "{{.Image}}" && sudo docker compose -f compose.cloud.yaml config --quiet'
    if ($LASTEXITCODE -ne 0) { throw 'SSH/preflight failed; nothing built or deployed. Check the SSH error above: a connection timeout indicates host/port reachability, while Permission denied indicates authentication.' }
    if ($PreflightOnly) { Write-Output 'SSH and deployment preflight passed; no build or deployment performed.'; return }
    & npm.cmd --prefix mobile run typecheck
    if ($LASTEXITCODE -ne 0) { throw 'TypeScript failed; deployment stopped.' }
    & node --experimental-strip-types --test mobile/tests/font-policy.test.ts mobile/tests/navigation-policy.test.ts mobile/tests/marketplace-navigation.test.ts
    if ($LASTEXITCODE -ne 0) { throw 'Focused checks failed; deployment stopped.' }
    function Get-PublicValue([string]$Name) {
        $value = [Environment]::GetEnvironmentVariable($Name)
        if ($value) { return $value }
        foreach ($file in @('mobile\.env','mobile\.env.local','.env')) {
            $path = Join-Path $root $file
            if (Test-Path -LiteralPath $path) {
                foreach ($line in Get-Content -LiteralPath $path) {
                    if ($line -match ('^\s*' + [regex]::Escape($Name) + '\s*=\s*(.*)$')) {
                        return $Matches[1].Trim().Trim('"').Trim("'")
                    }
                }
            }
        }
        return ''
    }
    $buildArgs = @('build','-f','frontend/Dockerfile.phone','-t',$image)
    foreach ($name in @('EXPO_PUBLIC_MAPTILER_WEB_API_KEY','EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID','EXPO_PUBLIC_ADMIN_URL')) {
        $value = Get-PublicValue $name
        if ($value) { $buildArgs += @('--build-arg',"$name=$value") }
    }
    $buildArgs += '.'
    & docker @buildArgs
    if ($LASTEXITCODE -ne 0) { throw 'Phone website build failed; AWS unchanged.' }
    New-Item -ItemType Directory -Force (Split-Path -Parent $archive) | Out-Null
    & docker image save -o $archive $image
    if ($LASTEXITCODE -ne 0) { throw 'Image export failed; AWS unchanged.' }
    $remoteArchive = "phone-ui-$stamp.tar"
    Enable-TemporarySshAccess
    & scp @sshArgs $archive "${Server}:/home/ec2-user/vistrah/$remoteArchive"
    if ($LASTEXITCODE -ne 0) { throw 'Upload failed; AWS runtime unchanged.' }
    $activate = @'
set -euo pipefail
cd /home/ec2-user/vistrah
old=$(sudo docker inspect vistrah-cloud-phone-web-1 --format '{{.Image}}')
sudo docker tag "$old" vistrah20-phone-web:rollback-__STAMP__
sudo docker load -i phone-ui-__STAMP__.tar
sudo docker image inspect vistrah20-phone-web:ui-__STAMP__ >/dev/null
sudo docker tag vistrah20-phone-web:ui-__STAMP__ vistrah20-phone-web:latest
if ! sudo docker compose -f compose.cloud.yaml up -d --no-deps --force-recreate --wait --wait-timeout 90 phone-web; then
    sudo docker tag "$old" vistrah20-phone-web:latest
    sudo docker compose -f compose.cloud.yaml up -d --no-deps --force-recreate --wait --wait-timeout 90 phone-web
    echo 'Deployment failed; previous phone image restored.' >&2
    exit 1
fi
curl --fail --silent --show-error --max-time 20 https://vistrah.in/app/ >/dev/null
sudo docker inspect vistrah-cloud-phone-web-1 --format '{{.State.Health.Status}} {{.Image}}'
echo 'Phone website deployed: https://vistrah.in/app/'
'@
    Enable-TemporarySshAccess
    $activate.Replace('__STAMP__',$stamp).Replace("`r`n","`n") | & ssh @sshArgs $Server 'bash -s'
    if ($LASTEXITCODE -ne 0) { throw 'Remote deployment/verification failed; inspect terminal output.' }
} finally {
    # Delete only the exact temporary file and its now-empty directory.
    if ($privateKey -and (Test-Path -LiteralPath $privateKey)) { Remove-Item -LiteralPath $privateKey }
    if ($publicKeyPath -and (Test-Path -LiteralPath $publicKeyPath)) { Remove-Item -LiteralPath $publicKeyPath }
    if (Test-Path -LiteralPath $privateDir) { Remove-Item -LiteralPath $privateDir }
}
