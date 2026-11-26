resource "aws_cloudwatch_log_group" "web" {
  name              = "/vistrah/staging/web"
  retention_in_days = var.log_retention_days
  tags              = { Component = "web" }
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/vistrah/staging/api"
  retention_in_days = var.log_retention_days
  tags              = { Component = "api" }
}
