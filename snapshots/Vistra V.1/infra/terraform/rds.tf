resource "aws_db_subnet_group" "staging" {
  name       = "${var.name_prefix}-db-subnets"
  subnet_ids = aws_subnet.db[*].id
  tags       = { Component = "database" }
}

resource "aws_db_instance" "staging" {
  identifier                      = "${var.name_prefix}-postgres"
  engine                          = "postgres"
  engine_version                  = "16"
  instance_class                  = var.db_instance_class
  allocated_storage               = var.db_allocated_storage_gb
  max_allocated_storage           = 100
  storage_type                    = "gp3"
  storage_encrypted               = true
  db_name                         = var.db_name
  username                        = var.db_username
  password                        = random_password.database.result
  db_subnet_group_name            = aws_db_subnet_group.staging.name
  vpc_security_group_ids          = [aws_security_group.rds.id]
  publicly_accessible             = false
  multi_az                        = false
  backup_retention_period         = var.db_backup_retention_days
  copy_tags_to_snapshot           = true
  deletion_protection             = var.db_deletion_protection
  skip_final_snapshot             = false
  final_snapshot_identifier       = var.db_final_snapshot_identifier
  auto_minor_version_upgrade      = true
  performance_insights_enabled    = false
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  apply_immediately               = false
  tags                            = { Component = "database" }
}
