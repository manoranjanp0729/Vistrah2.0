locals {
  common_tags = {
    Project     = "VISTRAH"
    Environment = "staging"
    ManagedBy   = "Terraform"
  }

  selected_azs = length(var.availability_zones) == 2 ? var.availability_zones : data.aws_availability_zones.available.names
  azs          = slice(local.selected_azs, 0, 2)

  subnet_cidrs = {
    public = [cidrsubnet(var.vpc_cidr, 8, 0), cidrsubnet(var.vpc_cidr, 8, 1)]
    app    = [cidrsubnet(var.vpc_cidr, 8, 10), cidrsubnet(var.vpc_cidr, 8, 11)]
    db     = [cidrsubnet(var.vpc_cidr, 8, 20), cidrsubnet(var.vpc_cidr, 8, 21)]
  }

  https_enabled  = var.staging_hostname != "" && var.route53_hosted_zone_id != ""
  staging_url    = local.https_enabled ? "https://${var.staging_hostname}" : "http://${aws_lb.staging.dns_name}"
  api_public_url = var.web_build_api_url != "" ? var.web_build_api_url : "${local.staging_url}/api/v1"

  task_secrets = [
    aws_secretsmanager_secret.database_url.arn,
    aws_secretsmanager_secret.jwt_secret.arn,
    aws_secretsmanager_secret.payment_webhook_secret.arn,
  ]
}

data "aws_availability_zones" "available" {
  state = "available"
}
