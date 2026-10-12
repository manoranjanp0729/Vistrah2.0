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
