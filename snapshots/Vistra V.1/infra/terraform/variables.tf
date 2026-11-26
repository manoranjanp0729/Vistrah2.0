variable "aws_region" {
  description = "AWS region for the staging environment."
  type        = string
  default     = "ap-south-1"
}

variable "name_prefix" {
  description = "Prefix for AWS staging resource names."
  type        = string
  default     = "vistrah-staging"
}

variable "vpc_cidr" {
  description = "CIDR range for the dedicated staging VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "availability_zones" {
  description = "Optional explicit pair of AZs. Leave empty to use the first two available AZs in the region."
  type        = list(string)
  default     = []
  validation {
    condition     = length(var.availability_zones) == 0 || length(var.availability_zones) == 2
    error_message = "Provide either no availability zones or exactly two."
  }
}

variable "db_name" {
  description = "Staging PostgreSQL database name."
  type        = string
  default     = "vistrah"
}

variable "db_username" {
  description = "Staging PostgreSQL master username. The password is generated and stored in Secrets Manager."
  type        = string
  default     = "vistrah_admin"
  sensitive   = true
  validation {
    condition     = can(regex("^[A-Za-z][A-Za-z0-9_]{0,15}$", var.db_username))
    error_message = "PostgreSQL master username must start with a letter and contain up to 16 alphanumeric or underscore characters."
  }
}

variable "db_instance_class" {
  description = "Small staging RDS instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage_gb" {
  description = "Initial encrypted RDS storage allocation in GiB."
  type        = number
  default     = 20
}

variable "db_backup_retention_days" {
  description = "Automated backup retention period."
  type        = number
  default     = 7
}

variable "db_deletion_protection" {
  description = "Protect staging RDS from accidental deletion. Disable deliberately before teardown."
  type        = bool
  default     = true
}

variable "db_final_snapshot_identifier" {
  description = "Unique final snapshot identifier to use when destroying the RDS instance."
  type        = string
  default     = "vistrah-staging-final-snapshot"
}

variable "web_image" {
  description = "Full ECR image URI and immutable tag for the web task."
  type        = string
  default     = ""
}

variable "api_image" {
  description = "Full ECR image URI and immutable tag for the API task."
  type        = string
  default     = ""
}

variable "web_cpu" {
  description = "Fargate CPU units for one web task."
  type        = number
  default     = 256
}

variable "web_memory" {
  description = "Fargate memory in MiB for one web task."
  type        = number
  default     = 512
}

variable "api_cpu" {
  description = "Fargate CPU units for one API task."
  type        = number
  default     = 256
}

variable "api_memory" {
  description = "Fargate memory in MiB for one API task."
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "Desired task count per ECS service."
  type        = number
  default     = 1
  validation {
    condition     = var.desired_count >= 1 && var.desired_count <= 2
    error_message = "Staging desired_count must be 1 or 2."
  }
}

variable "log_retention_days" {
  description = "CloudWatch log retention for staging containers."
  type        = number
  default     = 14
}

variable "staging_hostname" {
  description = "Optional staging hostname, for example staging.vistrah.com. Leave blank until a domain is approved."
  type        = string
  default     = ""
}

variable "route53_hosted_zone_id" {
  description = "Existing Route 53 public hosted zone ID. No zone is created or discovered automatically."
  type        = string
  default     = ""
}

variable "web_build_api_url" {
  description = "NEXT_PUBLIC_API_URL baked into the Next.js image at build time. Set to https://<staging-hostname>/api/v1 when a hostname is configured."
  type        = string
  default     = ""
}
