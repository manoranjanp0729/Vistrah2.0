resource "aws_route53_record" "staging_alias" {
  count   = local.https_enabled ? 1 : 0
  zone_id = var.route53_hosted_zone_id
  name    = var.staging_hostname
  type    = "A"
  alias {
    name                   = aws_lb.staging.dns_name
    zone_id                = aws_lb.staging.zone_id
    evaluate_target_health = true
  }
}
