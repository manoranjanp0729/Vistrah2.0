resource "aws_ecs_cluster" "staging" {
  name = "vistrah-staging"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  tags = { Component = "compute" }
}

resource "aws_ecs_task_definition" "web" {
  family                   = "vistrah-staging-web"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.web_cpu
  memory                   = var.web_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn
  container_definitions = jsonencode([{
    name         = "web"
    image        = var.web_image != "" ? var.web_image : "${aws_ecr_repository.web.repository_url}:staging-bootstrap"
    essential    = true
    portMappings = [{ containerPort = 3000, hostPort = 3000, protocol = "tcp" }]
    environment  = [{ name = "NEXT_PUBLIC_API_URL", value = local.api_public_url }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.web.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }
    healthCheck = {
      command     = ["CMD-SHELL", "node -e \"fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])
  tags = { Component = "web" }
}

resource "aws_ecs_task_definition" "api" {
  family                   = "vistrah-staging-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.api_cpu
  memory                   = var.api_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn
  container_definitions = jsonencode([{
    name         = "api"
    image        = var.api_image != "" ? var.api_image : "${aws_ecr_repository.api.repository_url}:staging-bootstrap"
    essential    = true
    portMappings = [{ containerPort = 8000, hostPort = 8000, protocol = "tcp" }]
    environment = [
      { name = "APP_ENV", value = "staging" },
      { name = "AWS_REGION", value = var.aws_region },
      { name = "CORS_ORIGINS", value = local.staging_url },
      { name = "PAYMENTS_MODE", value = "sandbox" },
      { name = "PAYMENT_GATEWAY", value = "sandbox" },
    ]
    secrets = [
      { name = "DATABASE_URL", valueFrom = aws_secretsmanager_secret.database_url.arn },
      { name = "JWT_SECRET", valueFrom = aws_secretsmanager_secret.jwt_secret.arn },
      { name = "PAYMENT_WEBHOOK_SECRET", valueFrom = aws_secretsmanager_secret.payment_webhook_secret.arn },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.api.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }
    healthCheck = {
      command     = ["CMD-SHELL", "python -c \"import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3)\""]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 30
    }
  }])
  tags = { Component = "api" }
}

resource "aws_ecs_service" "web" {
  name                               = "vistrah-staging-web"
  cluster                            = aws_ecs_cluster.staging.id
  task_definition                    = aws_ecs_task_definition.web.arn
  desired_count                      = var.desired_count
  launch_type                        = "FARGATE"
  platform_version                   = "LATEST"
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100
  health_check_grace_period_seconds  = 120

  network_configuration {
    subnets          = aws_subnet.app[*].id
    security_groups  = [aws_security_group.web.id]
    assign_public_ip = false
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.web.arn
    container_name   = "web"
    container_port   = 3000
  }
  depends_on = [aws_lb_listener.http, aws_iam_role_policy_attachment.ecs_execution_managed, aws_iam_role_policy.ecs_execution_secrets]
  tags       = { Component = "web" }
}

resource "aws_ecs_service" "api" {
  name                               = "vistrah-staging-api"
  cluster                            = aws_ecs_cluster.staging.id
  task_definition                    = aws_ecs_task_definition.api.arn
  desired_count                      = var.desired_count
  launch_type                        = "FARGATE"
  platform_version                   = "LATEST"
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100
  health_check_grace_period_seconds  = 60

  network_configuration {
    subnets          = aws_subnet.app[*].id
    security_groups  = [aws_security_group.api.id]
    assign_public_ip = false
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8000
  }
  depends_on = [aws_lb_listener.http, aws_iam_role_policy_attachment.ecs_execution_managed, aws_iam_role_policy.ecs_execution_secrets]
  tags       = { Component = "api" }
}
