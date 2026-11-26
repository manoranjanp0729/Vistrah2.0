resource "random_password" "database" {
  length  = 40
  special = false
}

resource "random_password" "jwt" {
  length  = 48
  special = false
}

resource "random_password" "payment_webhook" {
  length  = 48
  special = false
}

resource "aws_secretsmanager_secret" "database_url" {
  name                    = "${var.name_prefix}/DATABASE_URL"
  recovery_window_in_days = 7
  tags                    = { Component = "secrets" }
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id     = aws_secretsmanager_secret.database_url.id
  secret_string = "postgresql+psycopg://${var.db_username}:${random_password.database.result}@${aws_db_instance.staging.address}:${aws_db_instance.staging.port}/${var.db_name}"
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${var.name_prefix}/JWT_SECRET"
  recovery_window_in_days = 7
  tags                    = { Component = "secrets" }
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt.result
}

resource "aws_secretsmanager_secret" "next_public_api_url" {
  name                    = "${var.name_prefix}/NEXT_PUBLIC_API_URL"
  recovery_window_in_days = 7
  tags                    = { Component = "secrets" }
}

resource "aws_secretsmanager_secret" "payment_environment" {
  name                    = "${var.name_prefix}/PAYMENT_ENVIRONMENT"
  recovery_window_in_days = 7
  tags                    = { Component = "secrets" }
}

resource "aws_secretsmanager_secret_version" "payment_environment" {
  secret_id     = aws_secretsmanager_secret.payment_environment.id
  secret_string = "sandbox"
}

resource "aws_secretsmanager_secret" "payment_provider_secret" {
  name                    = "${var.name_prefix}/PAYMENT_PROVIDER_SECRET"
  recovery_window_in_days = 7
  tags                    = { Component = "secrets" }
}

resource "aws_secretsmanager_secret" "payment_webhook_secret" {
  name                    = "${var.name_prefix}/PAYMENT_WEBHOOK_SECRET"
  recovery_window_in_days = 7
  tags                    = { Component = "secrets" }
}

resource "aws_secretsmanager_secret_version" "payment_webhook_secret" {
  secret_id     = aws_secretsmanager_secret.payment_webhook_secret.id
  secret_string = random_password.payment_webhook.result
}
