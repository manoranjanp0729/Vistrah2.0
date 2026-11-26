# Vistra Terraform

This is the intentionally cost-conscious starter layer.

Run:
```bash
terraform init
terraform plan
terraform apply
```

Do not apply production infrastructure until variables, IAM, networking, encryption, backups, domain, secrets and deployment strategy have been reviewed.

The application is designed so the initial backend can run in a low-cost container environment and later move to ECS/RDS without changing the business API.
