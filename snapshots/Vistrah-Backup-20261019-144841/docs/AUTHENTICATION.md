# Authentication and password recovery

VISTRAH uses Argon2 password hashing, signed JWTs in HttpOnly cookies, and persisted
revocable sessions. The frontend proxies `/api/*` to its configured `API_URL`;
only the backend accesses PostgreSQL. Administrator authorization reads the current
database role on every request. Registration creates CUSTOMER accounts.

## Personal administrator bootstrap

Use the existing interactive command against the intended local Compose stack:

```powershell
docker compose exec api python -m app.create_admin
```

Choose an unused email, a display name and a unique private password/passphrase.
The command creates a separate ADMIN account. It refuses an existing email and
never promotes a CUSTOMER or changes the development QA administrator. The prompt
hides password input. Do not put a password in a command argument or chat.
Normal ADMIN login opens `/admin`; explicit validated return destinations are
preserved. CUSTOMER accounts cannot access admin pages or APIs.

## Recovery behavior

`/login` links to `/forgot-password`. `POST /auth/forgot-password` always returns
the same confirmation for registered/unregistered emails and throttled requests.
Account lookup, token issuance and SMTP work occur in a background task after the
generic response. No response claims that an email has been delivered.

Tokens contain 256 bits of cryptographic randomness. Only SHA-256 hashes are stored
in `password_resets`, introduced by additive migration 006. Links expire after
15 minutes. The link uses `/reset-password#token=...`: the fragment is never sent
in the page request URL, and the page removes it from browser history after loading.
The page sets `Referrer-Policy: no-referrer`; token-bearing API calls use POST bodies.
Tokens never appear in public API responses, server page props or application logs.

`POST /auth/reset-password` requires matching passwords of 15-128 characters,
rejects a small set of predictable patterns and leading/trailing whitespace, and
uses Argon2 for the replacement password. Successful reset atomically consumes
all the user's reset links and revokes all their sessions. Roles remain unchanged,
for both CUSTOMER and ADMIN. The user signs in normally afterward. A notification
email contains no password. User row locks serialize competing resets and login.

Recovery limits use the existing persistent login-attempt table with separate
scopes: three requests per email, 60 per API client IP and 20 redemption attempts
per API client IP, each over 15 minutes. PostgreSQL advisory locks serialize limit
checks. Behind the current frontend proxy, the API client IP is the web container,
so the IP limits apply across that proxy; email limits remain per account. Requests
do not lock accounts. Expired/used hashes and old attempt rows are retained; there
is no cleanup job in this change.

Email delivery is attempted once in-process, not through a durable mail queue.
SMTP/network failure produces a sanitized operational warning and the same public
response. A user can request another link within the rate limit. An acceptance log
is emitted only after SMTP accepts the message; acceptance is not proof of inbox
delivery. No development route exposes a token or bypasses reset validation.

## Configure email privately

Put real credentials only in the existing ignored `.env`. `.env.example` contains
empty credential placeholders. Preserve existing configuration when adding values.

| Variable | Purpose |
| --- | --- |
| `PUBLIC_APP_URL` | Exact frontend origin used in reset links; HTTPS required except loopback development |
| `SMTP_HOST` | Provider SMTP hostname |
| `SMTP_PORT` | Provider port: normally 587 for STARTTLS or 465 for implicit TLS |
| `SMTP_USERNAME` | SMTP account username |
| `SMTP_PASSWORD` | Provider SMTP credential/App Password, entered privately |
| `SMTP_FROM_EMAIL` | Provider-authorized sender address |
| `SMTP_FROM_NAME` | Display name, defaults to VISTRAH |
| `SMTP_USE_TLS` | Must be `true`; plaintext transport is rejected |
| `SMTP_TLS_MODE` | `starttls` or `ssl`, defaults to `starttls` |
| `APP_ENV` | `development` locally; set `production` for a production environment |

The provider can change to a vistrah.in domain mailbox through configuration alone.
TLS verifies the SMTP server certificate, and authentication occurs only after TLS.
Emails contain a VISTRAH-branded HTML reset button, a plain-text alternative, expiry
notice and instructions to ignore an unexpected request. No external email assets
or tracking pixels are used.

In development, `/auth/recovery-status` returns only a configuration boolean and
the recovery page clearly displays missing configuration. In production this
endpoint returns 404. Missing SMTP prevents reset-token issuance and real delivery;
it never enables a token fallback. Compose defaults its local public origin from
`WEB_PORT`; set `PUBLIC_APP_URL` explicitly for any production environment.

For Gmail, enable 2-Step Verification and create a Google App Password privately.
Use `smtp.gmail.com`, your full Gmail address as username/sender, and port 587 with
`starttls` or 465 with `ssl`. Use the App Password as `SMTP_PASSWORD`, never the
Google account password. Availability depends on Google account policy.
See [Google App Password guidance](https://support.google.com/mail/answer/185833)
and [Google SMTP guidance](https://support.google.com/a/answer/176600).

After configuring SMTP, recreate only the API to load its new environment. A real
test should request recovery for an account you control, check SMTP acceptance and
inbox delivery, use the link once, and verify the old password/session fails and
the new password works. A genuine reset changes that account's password and
revokes its sessions; do not reset the QA or customer account just to test mail.

## Safe tests without real email

```powershell
cd backend
$env:TEST_DATABASE_URL='sqlite:///./recovery-check.db'
..\.venv\Scripts\python.exe -m pytest -q --tb=no tests/test_password_recovery.py tests/test_admin_access.py
```

Tests capture mail in memory, use rolled-back fixtures and verify TLS transport
through mocks. `--tb=no` avoids dumping credentials from test fixture locals when
an assertion fails. Never point tests at the normal database.

The local `.tools/test-password-recovery.ps1` runner starts a separate PostgreSQL
Compose project on port 3120 with temporary process-only credentials and seeded
valid/expired tokens. No SMTP provider is configured and no real email is sent.
It exercises recovery and admin navigation in Chrome, then removes only the test
project. Recovery tests disable traces/screenshots/videos and sanitize runner output.
These local helpers are ignored development tooling, not application reset APIs.

Security design follows the [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).
