# Cost-conscious AWS architecture

## Initial
- Static web delivery: S3 + CloudFront
- API: Docker container on a low-cost AWS container option
- Database: managed PostgreSQL at the smallest sensible tier
- Documents: private S3 bucket
- Authentication: Cognito
- Payment: Razorpay
- CI: GitHub Actions
- IaC: Terraform
- Logs: CloudWatch

## Growth path
API container -> ECS/Fargate
PostgreSQL -> RDS PostgreSQL
Add ALB when multiple application tasks are needed
Add SQS for meaningful asynchronous workloads
Add Redis only when measured cache/session/queue needs justify it
Do not introduce EKS/microservices merely for portfolio appearance.
