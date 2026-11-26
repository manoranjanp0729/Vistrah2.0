resource "aws_acm_certificate" "staging" {
  count             = var.staging_hostname == "" ? 0 : 1
  domain_name       = var.staging_hostname
  validation_method = "DNS"
  tags              = { Component = "certificate" }
  lifecycle { create_before_destroy = true }
}

resource "aws_route53_record" "certificate_validation" {
  for_each = var.staging_hostname != "" && var.route53_hosted_zone_id != "" ? {
    for dvo in aws_acm_certificate.staging[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}
  zone_id         = var.route53_hosted_zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "staging" {
  count                   = local.https_enabled ? 1 : 0
  certificate_arn         = aws_acm_certificate.staging[0].arn
  validation_record_fqdns = [for record in aws_route53_record.certificate_validation : record.fqdn]
}
