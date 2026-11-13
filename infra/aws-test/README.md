# Temporary AWS server

This provisions a dedicated Mumbai test VPC, public subnet, internet gateway,
route table, security group and one Amazon Linux 2023 x86_64 t3.small server.
It uses an existing EC2 key pair; keep its private key on your PC. SSH is restricted
to your specified IPv4 /32; only ports 80 and 443 are otherwise public.
PostgreSQL, API and admin container ports are not exposed by these rules.
Docker Engine is installed at first boot; Compose, image upload, application
configuration, HTTPS and database initialization remain separate steps.

Use your own AWS credentials locally; console login alone does not configure CLI
authentication. Never paste access keys into chat or Terraform files. The provider
checks your supplied account ID before operating. This does not upgrade your AWS
account plan or guarantee credit eligibility. Compute, EBS and public IPv4 consume
eligible credits. T3 Standard avoids surplus CPU-credit billing but may throttle.

Prerequisites: Terraform >=1.5, AWS CLI with authenticated local credentials,
existing Mumbai EC2 key pair and its private key. If you already manually launched
an instance, reconcile/import it first; do not create a duplicate by applying this.

In PowerShell from this folder:

```powershell
Copy-Item terraform.tfvars.example terraform.tfvars
notepad terraform.tfvars
aws sts get-caller-identity
terraform init
if ($LASTEXITCODE -ne 0) { throw "Terraform init failed" }
terraform fmt -check
if ($LASTEXITCODE -ne 0) { throw "Terraform formatting failed" }
terraform validate
if ($LASTEXITCODE -ne 0) { throw "Terraform validation failed" }
terraform plan -out=test.tfplan
if ($LASTEXITCODE -ne 0) { throw "Terraform plan failed" }
```

Review the plan before `terraform apply test.tfplan`. This configuration creates
11 resources; existing AWS resources and GoDaddy records are not managed.
Preserve the local state and provider lockfile; state is required for cleanup.
The public IP may change after stop/start; update DNS if that happens.
No DNS records, database backup, cloud database or running application are created.

## Run the exported images with the existing database

Copy `compose.cloud.yaml`, `Caddyfile`, `prepare-cloud.sh`, and `restore-cloud.sh`
to `/home/ec2-user/vistrah` beside the verified `database.dump`. If Windows Git
converted shell-script line endings, run `sed -i 's/\r$//' prepare-cloud.sh restore-cloud.sh`
on the server. Run `bash prepare-cloud.sh` once, then `bash restore-cloud.sh HASH`
with the matching full backup hash. The restore script refuses running app services
or a populated database and uses an atomic, no-owner/no-ACL restore, with no seed or
migration. Account passwords and database-stored private evidence are retained.
Fresh JWT signing credentials require existing users to sign in again; local tokens
are not copied. Keep `.env` private and back it up securely with the cloud data.

This is a temporary sandbox deployment: backend APP_ENV remains development so
existing simulated memberships retain their current test behavior. No real payments
or production membership mode is activated. SMTP is not copied; password recovery
and ownership email-code delivery need separate private mail configuration. External
job-source acquisition is disabled initially. Worker is an optional profile and stays
off while restored workflow plans are reviewed, so copied plans do not resume yet.

After GoDaddy A records for `@`, `api`, and `admin` point to the current server IP,
run `sudo docker compose -f compose.cloud.yaml up -d --wait`. Caddy is a separately
pulled public image and obtains HTTPS certificates once DNS resolves. Only Caddy
publishes ports; API, database and admin remain on the Docker network. The deployed
web paths are `https://vistrah.in` and `https://admin.vistrah.in`; native mobile uses
`EXPO_PUBLIC_API_URL=https://api.vistrah.in` and
`EXPO_PUBLIC_ADMIN_URL=https://admin.vistrah.in`. No website/mobile rebuild occurs.
The Expo browser development preview still requires its own CORS/proxy configuration.

Review restored workflow statuses before explicitly starting the worker with
`sudo docker compose -f compose.cloud.yaml --profile worker up -d --wait worker`.
Monitor memory on the 2 GiB host. Verify website, API health, admin login and native
account/service flows before declaring the public test complete.

After the public test and export of any data you want to retain:

```powershell
terraform plan -destroy -out=cleanup.tfplan
if ($LASTEXITCODE -ne 0) { throw "Cleanup plan failed" }
# Review the plan, then run:
terraform apply cleanup.tfplan
```

Destroy removes this server and its root disk, including any Docker database
volumes stored there. It takes the hosted app offline. Remove temporary GoDaddy
DNS records separately. Do not delete your local database, domain or AWS account.

## Shared phone website rollout

The phone website uses the exact mobile screen source via React Native Web. Phone/tablet visitors to the root domain are directed to `/app/`; desktop visitors keep the Next.js site. `/app/` is also directly available on desktop. Caddy routes `/api/*` to the existing website's secure-cookie proxy before phone detection. The separate API/admin hosts remain unchanged.

Run `scripts/build-phone-website.ps1` on the PC to create the phone/static image and refreshed website proxy image. It exports `phone-website.tar` and `website-proxy.tar`. Load both on the host before uploading `compose.cloud.yaml` as `compose.cloud.yaml.pending`, `Caddyfile` as `Caddyfile.pending`, and `activate-phone.sh`. Normalize CRLF, then run the activation script. Backups of previous configurations and image tags remain on the server. The script updates web/phone/proxy only; it does not recreate DB/API/admin/worker or run migrations/seeding. The full Docker runtime activation still requires user-host verification.

The restore helper also refuses a running phone-web service. Browser sign-in uses HttpOnly cookies and should persist after reload. Mail/worker behavior is unchanged. Test phone screen appearance and seller/customer flows before considering this rollout complete. The native APK already in the EAS queue is independent of this website image update.

