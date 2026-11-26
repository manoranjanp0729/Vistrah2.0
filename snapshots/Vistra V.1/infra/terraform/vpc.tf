resource "aws_vpc" "staging" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Component = "network" }
}

resource "aws_internet_gateway" "staging" {
  vpc_id = aws_vpc.staging.id
  tags   = { Component = "network" }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.staging.id
  cidr_block              = local.subnet_cidrs.public[count.index]
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true
  tags                    = { Name = "${var.name_prefix}-public-${count.index + 1}", Component = "network" }
}

resource "aws_subnet" "app" {
  count                   = 2
  vpc_id                  = aws_vpc.staging.id
  cidr_block              = local.subnet_cidrs.app[count.index]
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = false
  tags                    = { Name = "${var.name_prefix}-app-${count.index + 1}", Component = "network" }
}

resource "aws_subnet" "db" {
  count                   = 2
  vpc_id                  = aws_vpc.staging.id
  cidr_block              = local.subnet_cidrs.db[count.index]
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = false
  tags                    = { Name = "${var.name_prefix}-db-${count.index + 1}", Component = "network" }
}

resource "aws_eip" "nat" {
  domain = "vpc"
  tags   = { Component = "network" }
}

resource "aws_nat_gateway" "staging" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id
  depends_on    = [aws_internet_gateway.staging]
  tags          = { Component = "network" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.staging.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.staging.id
  }
  tags = { Component = "network" }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "app" {
  vpc_id = aws_vpc.staging.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.staging.id
  }
  tags = { Component = "network" }
}

resource "aws_route_table_association" "app" {
  count          = 2
  subnet_id      = aws_subnet.app[count.index].id
  route_table_id = aws_route_table.app.id
}

resource "aws_route_table" "db" {
  vpc_id = aws_vpc.staging.id
  tags   = { Component = "network" }
}

resource "aws_route_table_association" "db" {
  count          = 2
  subnet_id      = aws_subnet.db[count.index].id
  route_table_id = aws_route_table.db.id
}
