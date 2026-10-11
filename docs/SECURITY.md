# Security and deployment notes

The application is configured for local use. Docker binds frontend/API ports to loopback. Database access remains inside the Compose network. Database credentials in Compose defaults are clearly local development defaults.

Passwords use Argon2. Backend JWT validation fixes the algorithm, issuer, audience and required claims, and checks a persisted revocable session. Backend role checks and ownership queries protect every customer/admin resource. Registration rejects unexpected fields, including role. Login/registration attempts are rate-limited by normalized email and connection identity in persistent database storage.

The browser token uses HTTP-only, SameSite=Lax cookies; enable `COOKIE_SECURE=true` for HTTPS. Exact mutation origins must be configured through `ALLOWED_ORIGINS`. Same-origin errors are preserved instead of silently bypassed. The browser-facing proxy limits JSON requests; the webhook limits payload length. API routes are same-origin and no permissive CORS configuration is enabled.

No card data is collected. The sandbox-only database constraint prevents marking a transaction as live. Payment validation covers amount, currency, mode, timestamp, signature, ownership and conflicting retries. Immutable ledger/audit histories use database triggers. Audit CSV export protects cells that could be interpreted as spreadsheet formulas. Provider contact data is public only after reviewed verification and activation; provenance/evidence stays in admin APIs.

The UI includes content-type, framing, referrer, permissions and Content Security Policy headers. The CSP allows inline script/style required by the current Next.js setup; a nonce-based CSP is future hardening. React escapes displayed content. Catalogue image paths are limited to inventoried local assets. No user-supplied HTML is rendered.

For future Cloud Run use, inject explicit persistent `JWT_SECRET` and `WEBHOOK_SECRET` through Secret Manager, set secure cookies and exact HTTPS frontend origins, use managed PostgreSQL with appropriate TLS/connector settings, and point `API_URL` to the authenticated/internal backend destination. The API and Next.js processes honor the injected `PORT`. Run migrations as a separate controlled job before scaling replicas. Do not depend on the generated filesystem secret in an ephemeral Cloud Run instance. No cloud deployment was performed.

The dependency audits on 9 October 2026 report zero known advisories across the pinned frontend dependency tree and the complete pinned backend dependency set. The initial audit findings in older JWT and test libraries were addressed before final validation.

Before public launch, configure/test recovery email delivery, implement email verification, agreed provider verification procedures, operational monitoring, backup/restore drills, business-reviewed legal/privacy content and a tested live gateway if payments are required. This local rebuild does not claim those operational capabilities are complete.

Password recovery uses short-lived, single-use hashed tokens, authenticated TLS
SMTP, neutral responses and session revocation. See [authentication and recovery](AUTHENTICATION.md)
for configuration, limitations and isolated verification. No reset-token bypass
or public token-disclosure endpoint exists in development or production.

## Provider applications and evidence

Provider onboarding uses the existing revocable sessions, HttpOnly cookies, origin
checks, role checks and ownership queries. Supporting files live in the private
database, with bounded type/content validation and authorized attachment downloads.
Published requirement payloads, private submission history and evidence are protected
by DB triggers. Public audit metadata excludes sensitive application answers and
files. Exact per-service approval and global provider eligibility are enforced in
backend directory/lead queries; payment never grants approval.

No antivirus, full PDF decoder, inline preview or government-register verification
is installed. Reviewers must establish authenticity and legal applicability manually.
See [provider onboarding](PROVIDER_ONBOARDING.md) for precise security and retention
limits; the implementation does not claim external certification.
