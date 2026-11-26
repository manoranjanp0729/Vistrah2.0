resource "aws_s3_bucket" "documents" {
  bucket = var.s3_bucket_name != "" ? var.s3_bucket_name : "${var.project_name}-${var.environment}-documents"
  tags = { Project=var.project_name, Environment=var.environment }
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket = aws_s3_bucket.documents.id
  block_public_acls = true
  block_public_policy = true
  ignore_public_acls = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_cloudwatch_log_group" "vistra_api" {
  name = "/vistra/${var.environment}/api"
  retention_in_days = 14
}

output "documents_bucket" { value = aws_s3_bucket.documents.bucket }
