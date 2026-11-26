# Security baseline

- Never commit secrets.
- Keep uploaded documents in a private S3 bucket.
- Use short-lived signed URLs for document access.
- Validate file type, size and ownership server-side.
- Verify Razorpay webhook signatures server-side.
- Use Cognito or another proven identity provider rather than storing raw passwords.
- Apply least-privilege IAM.
- Encrypt data at rest and in transit.
- Add database backups before production.
- Log security-relevant events without storing unnecessary sensitive data.
- Review tax/legal/document workflows with qualified professionals before offering them commercially.
