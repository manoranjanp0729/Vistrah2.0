# VISTRAH 2.0 AWS security audit

Audit date: 23 October 2026. Region: ap-south-1 (Mumbai).
Scope: current AWS metadata, ordinary public HTTP/TLS requests, and relevant local application/infrastructure/workflow source in E:/Vistrah 2.0. Infrastructure identifiers in this report should remain internal.

## 1. Current posture and audit boundaries

The test environment has a reasonable network and encryption baseline: HTTPS works, SSH is restricted to individual IP addresses, the attached EBS disk is encrypted, IMDSv2 is required, and unauthenticated account/admin requests were rejected. The largest gaps are routine access through the root principal, limited verified recovery arrangements, and missing configured alarms/durable audit trails.

This is not production security approval or a penetration test. No compromise was established. Public payment-mode metadata identifies this deployment as SANDBOX, and reviewed cloud configuration intentionally uses development-mode membership behavior. Preserve that separation; changing it without a release plan could disrupt test access.

Evidence labels used below:

- **AWS confirmed:** read/list/describe responses from the authenticated account in Mumbai.
- **HTTP confirmed:** ordinary unauthenticated GET requests and TLS certificate checks.
- **Source only:** local configuration/code; deployment parity has not been established.
- **Unverified:** requires additional access, owner information, or separately authorized verification.

Only AWS read/list/describe operations were used. No SSH connection, SSM session/command, port scan, vulnerability scan, database write, migration, resource creation, deployment, container operation, IAM/network change, or paid-service activation was performed. Local report/handoff documentation are the only audit writes. No credentials, session tokens, passwords, private keys, or sensitive environment values were printed, requested, copied, or stored.

## 2. CLI access and safer temporary audit access

AWS CLI is installed at C:/Program Files/Amazon/AWSCLIV2/aws.exe: version 2.33.12, Python 3.13.11, Windows/AMD64. The initial sandbox could not read the normal AWS configuration and reported no credentials. Approved execution outside that sandbox found authenticated profiles; the initial result did not mean the account was unconfigured.

All three profiles, `default`, `vistrah-login`, and `vistrah-terraform`, returned account `172030246584` and principal `arn:aws:iam::172030246584:root`. The default profile has login-session configuration. This does **not** establish static root keys: account summary reports root MFA enabled and zero root access keys. It does establish that none of the inspected profiles provides a restricted audit identity.

For subsequent audits, have an authorized administrator establish an IAM Identity Center permission set or an MFA-protected assumed audit role with temporary sessions. Start with reviewed SecurityAudit permissions and add only missing metadata reads. Avoid AdministratorAccess, PowerUserAccess, broad secret-value reads, and access to application data. Root should remain a protected break-glass identity, not the routine CLI identity. No identity changes were made here.

Example setup after that identity exists, to be run outside the repository:

```powershell
aws configure sso --profile vistrah-audit
aws sso login --profile vistrah-audit
aws sts get-caller-identity --profile vistrah-audit --region ap-south-1
```

These examples were not executed. The SSO region may differ from Mumbai. Confirm the result is the intended assumed role rather than root. Let AWS CLI manage its normal user-profile cache; never paste credentials into source, chat, .env files, or this report. See [AWS root guidance](https://docs.aws.amazon.com/IAM/latest/UserGuide/root-user-best-practices.html), [CLI SSO configuration](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html), and [SecurityAudit policy](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/SecurityAudit.html).

## 3. AWS inventory and network exposure

### Hosting instance

| Property | AWS-confirmed value |
| --- | --- |
| Instance | i-0dbdebb8b05f15783, Name vistrah-test |
| State/type/AZ | Running, t3.small, ap-south-1a |
| Launch time | 17 October 2026, 11:15:14 UTC |
| Public/private IPv4 | 35.154.22.29 / 10.80.1.210 |
| VPC | vpc-0affee0f5f26ff95f, 10.80.0.0/16, nondefault |
| Subnet | subnet-04556778c214a1513, 10.80.1.0/24; public-IP assignment enabled |
| Network interface | eni-0b4978b82abde38d0; one security group; no IPv6 returned |
| Security group | sg-0bfc5b562b0051b03 |
| Metadata service | IMDS enabled; tokens required; hop limit 2; instance tags disabled |
| Health/monitoring | System and instance checks OK; detailed monitoring disabled |
| Termination protection | Disabled |
| Elastic IP | None associated with this instance returned |

vistrah.in, api.vistrah.in, and admin.vistrah.in resolved to this public IP during the audit. Instance tags, matching addresses, and successful application responses support identifying this instance as the current VISTRAH test host. Basic EC2 metrics remain available despite detailed monitoring being disabled.

### Security group and public ports

| Direction | Protocol/port | Allowed source/destination | Interpretation |
| --- | --- | --- | --- |
| Inbound | TCP 80 | 0.0.0.0/0 | Public HTTP; observed redirect to HTTPS |
| Inbound | TCP 443 | 0.0.0.0/0 | Public HTTPS |
| Inbound | TCP 22 | 106.192.244.113/32; 122.172.83.81/32; 106.202.105.225/32 | SSH restricted to three IPv4 addresses |
| Outbound | All protocols/ports | 0.0.0.0/0 | Unrestricted IPv4 egress |

No other inbound or IPv6 rules were returned. Ports 80/443 are permitted from the general internet; port 22 is permitted only from the listed addresses. Database/API raw ports such as 5432/8000/3000 are not allowed by the attached security group. Actual host listeners and Docker publishing remain unverified; this was not an all-port reachability scan.

The explicit subnet route table rtb-06304977f30efc4b9 routes 0.0.0.0/0 through igw-018060f4f51f4e8be. The VPC main table rtb-0e9cc3f41c4e45b46 is local-only; the explicit subnet association determines this instance's route.

Default network ACL acl-0d2bfd56b8f08a87e allows all IPv4 traffic in both directions at rule 100, followed by the default deny. This is permissive defense in depth, but does not override the security group's inbound restrictions. No regional VPC flow logs were returned.

Local Terraform validates one /32 SSH input, while the live group has three /32 entries. Review their owners and necessity before changing anything; there is no evidence that these addresses are unauthorized or stale. SSH is **not** world-open.

### IAM role and host access

The attached instance profile/role is Vistrah-EC2-SSM-Role. Its trust principal is ec2.amazonaws.com and its only returned attached policy is AmazonSSMManagedInstanceCore; no inline policies were returned. No wildcard trust principal was found.

SSM inventory reports the instance Online, Amazon Linux 2023, agent 3.3.5390.0. No usable existing SSH configuration/default private identity/agent identity was available in the inspected local access setup. No private key was opened or requested. SSM StartSession and SendCommand were deliberately not used because they exceed the requested AWS read/list/describe scope. A working operator recovery session is therefore unverified.

IMDSv2 is a positive control. Hop limit 2 can support container credential access; assess actual container need before reducing it or changing the role. No credential theft or exploit was demonstrated.

## 4. Storage, snapshots, and recovery

The attached root volume vol-0ecbbbe6208bb85c0 is 20 GiB gp3 and encrypted with KMS. DeleteOnTermination is enabled. Regional EBS encryption by default is disabled, so future volumes can be created unencrypted even though the current disk is encrypted.

One completed, encrypted owner snapshot of this volume was returned: snap-09f77f82f56f173e3, created 20 October 2026 at 09:42:55 UTC. Snapshot sharing permissions were empty: no public or cross-account grants were returned. The AMI base snapshot is not treated as an application backup.

AWS Backup plans, vaults, and protected resources were empty in Mumbai. DLM lifecycle policies were also empty. Consequently no AWS-managed recurring backup schedule was established, and the observed recovery point is approximately three days old. Host cron, database dumps, S3, external tooling, other regions, and backup consistency remain unverified; this does not prove that no other backups exist.

The combination of a single host, a deletable root disk, disabled termination protection, and no discovered managed backup schedule creates significant recovery risk. Local Compose uses persistent database storage, but the deployed volume placement was not inspected. No restore was attempted. KMS key policy/rotation was not audited. See [regional EBS encryption defaults](https://docs.aws.amazon.com/ebs/latest/userguide/encryption-by-default.html); enabling the default concerns future creation/copies and does not require replacing this already encrypted disk.

## 5. Monitoring and security alerts

| Check | AWS-confirmed result and limit |
| --- | --- |
| CloudWatch metric/composite alarms | None returned in Mumbai |
| CloudTrail configured trails, including shadow trails | None returned |
| AWS Config recorders | None returned |
| IAM Access Analyzer analyzers | None returned in Mumbai |
| VPC flow logs | None returned in Mumbai |
| VISTRAH CloudWatch log groups | None identified; one unrelated Container Insights group was returned |
| GuardDuty and Security Hub | SubscriptionRequiredException; status and findings unavailable |

Do not interpret the absence of a configured trail as absence of all CloudTrail records: AWS provides a separate free, regional 90-day management-event history. A durable trail was not established by this audit. Event history contents, external monitoring, alarm delivery, and historical incidents were not reviewed. GuardDuty/Security Hub subscription errors are not proof that either service is healthy or disabled. Nothing was enabled. See [CloudTrail event-history limits](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events.html).

## 6. Public HTTPS and application controls

### Observed live behavior

| Ordinary GET request | Result |
| --- | --- |
| http://vistrah.in/ | 308 redirect to HTTPS |
| https://vistrah.in/ | 200; security headers present |
| https://vistrah.in/app/ | 200; Caddy and mobile-web security headers |
| https://admin.vistrah.in/login | 200; security headers present |
| https://api.vistrah.in/health | 200; status OK; payment mode SANDBOX |
| API /me and /admin/overview | 401 without authentication |
| Admin and main-site proxied /api/admin/overview | 401 without authentication |
| https://api.vistrah.in/docs | 200; public Swagger UI |

Certificates were trusted and matched all three hosts; observed TLS negotiation was TLS 1.3. Certificates expire 15 January 2027 at 14:12:33 UTC. Older protocol/cipher support and automatic renewal were not tested.

Main web/admin responses include CSP, X-Frame-Options DENY, nosniff, a restrictive referrer policy, and camera/microphone restrictions. CSP frame-ancestors is none. HSTS was absent from tested HTTPS responses. The main web/admin script CSP permits unsafe-inline; /app/ does not permit unsafe-inline scripts. This weakens XSS defense in depth but is not evidence of a demonstrated XSS exploit.

An untrusted Origin on unauthenticated API /me did not receive permissive CORS response headers. This is a useful sample, not a complete authenticated CORS/CSRF assessment. API JSON responses need not carry every HTML-page header.

Account responses used private/no-store caching. The public static admin login page had s-maxage=31536000; this does not establish that authenticated private pages are cached. Successful authentication cookie flags were not verified live. Only a logout/deletion cookie was observed; its attributes cannot establish flags on issued session cookies. No cookie values were recorded.

### Source controls and deployment limits

- `infra/aws-test/compose.cloud.yaml` publishes only Caddy ports 80/443; API, database, web, admin, and optional phone-web are internal in this template. The cloud API command explicitly runs Uvicorn directly, overriding the image's migration/seed default. Actual container commands, published ports, mounted volumes, health, and image digests were not inspected.
- `infra/aws-test/Caddyfile` and `Caddyfile.phone` define reverse proxy/automatic TLS and mobile-web routing. Live headers support some controls, but exact deployed file parity remains unverified.
- `backend/app/security.py` implements recommended password hashing, issuer/audience/expiry-checked JWTs, hashed revocable database sessions, and customer/seller/admin dependencies. Membership enforcement is fail-closed outside development and validates sandbox payment allocation in the test flow.
- Backend login includes per-email/IP throttling and dummy hashing for unknown emails. Admin routes require the admin role; seller routes scope data to the owning seller; commerce review prevents self-approval. These are source findings, not a full signed-in permission-matrix test.
- Google token verification checks signature, issuer, audience and verified email in source. Google login configuration/runtime behavior was not tested.
- Main/admin Next.js proxies enforce mutation origins. Source session cookies are HttpOnly, SameSite=Lax, with Secure controlled by configuration; cloud source sets Secure true. Customer and seller cookies are separate, and the admin proxy validates the admin role and uses a route allowlist.
- `prepare-cloud.sh` uses umask 077, cryptographically generated secrets, and refuses to overwrite existing .env. Actual remote file permissions, secret rotation, process environment and logging practices are unverified. Real environment files were not opened.
- Targeted tracked-file checks found no matching .env/.env.local, private-key extensions, or .aws files. Ignore files exclude these classes. This is not a full source/history secret scan.
- Dockerfiles use non-root application users in source. Installed OS/dependency vulnerabilities and actual runtime user/capabilities are unverified.

### GitHub workflows

Reviewed `.github/workflows/ci.yml` and `publish-images.yml`. Positive source controls include SHA-pinned Actions, read-only default token permissions, checkout without persisted credentials, checks using disposable test storage, and npm audit at high severity. Manual image publishing grants package-write permission only where needed and uses GITHUB_TOKEN; no AWS static credential deployment was found in these workflows.

Publication gates include exact commit/branch confirmation and image digest recording. These are candidate API/web/admin publications, not a complete Android release approval. Cloud Compose references mutable latest tags, so the deployed image-to-reviewed-commit relationship remains unverified. No automated AWS deployment workflow was found in the reviewed files.

No backend dependency audit, container OS scan, SAST/CodeQL, or secret scan was identified in these two workflow files. Repository-level scanning settings, branch protection, actual recent run results, and platform-native secret scanning were not verified; absence from workflow source does not establish absence across GitHub. No workflow was dispatched.

## 7. Severity-ranked findings and recommendations

Severity reflects potential impact and current evidence, not proof of exploitation.

| ID / priority | Confirmed finding or bounded risk | Recommended next action |
| --- | --- | --- |
| H1 / High | All inspected CLI profiles authenticate as root. MFA and no root access keys mitigate some risk but do not limit root authority. | Establish temporary least-privilege operator/audit roles; reserve protected root access for root-required tasks. |
| H2 / High recovery risk | One recent encrypted snapshot; no discovered Backup/DLM schedule; deletable root disk and termination protection off. Other backup methods unknown. | Confirm RPO/RTO and actual data placement; establish consistent recurring backups and isolated restore verification; enable approved termination protection. |
| M1 / Medium | No configured alarms, durable CloudTrail trail, or identified VISTRAH central log group in Mumbai. | Review free event history now; design bounded-cost alarms and durable audit/application logs with retention. |
| M2 / Medium | HSTS absent from tested HTTPS hosts. | Verify renewal and HTTPS coverage; introduce a short HSTS policy first. Avoid preload/includeSubDomains until all applicable hosts are ready. |
| M3 / Medium, defense in depth | Main web/admin CSP allows inline scripts. No XSS demonstrated. | Validate nonce/hash-based CSP in staging before enforcement to avoid breaking Next.js or Google login. |
| M4 / Medium, future resources | Regional EBS encryption default disabled; current disk is encrypted. | Enable the regional default after approval; review future volume templates. No current disk replacement is needed. |
| M5 / Medium, hardening | Unrestricted IPv4 egress and permissive default NACL. | Inventory required outbound dependencies before considering egress restrictions. Do not blindly tighten stateless ACLs or break DNS/SSM/updates. |
| M6 / Medium, release assurance | Source uses mutable image tags; reviewed CI lacks several scan classes; deployed provenance unknown. | Record/verify running image digests; prefer reviewed immutable release references and add scoped dependency/secret/container scanning. |
| L1 / Low, access hygiene | SSH permits three /32 addresses versus one-address source input. | Confirm ownership and ongoing need. Prefer existing SSM access after a separately approved operator-access validation. |
| L2 / Low | Public API docs and server fingerprints disclose interface details. | Decide whether public docs are intended; restrict production docs if unnecessary. Authorization remains the primary control. |
| L3 / Low, availability | No associated Elastic IP; current public IPv4 may change after stop/start. | Document DNS recovery and stable-address strategy before planned instance lifecycle changes; assess costs separately. |

No world-open SSH, public database security-group rule, unencrypted attached disk, public snapshot grant, or unauthenticated admin access was confirmed in the checked samples. This does not certify all endpoints, ownership rules, or attack paths.

## 8. Items that could not be verified

- Host Docker state, listeners, firewall, image provenance, patch level, volumes, resource limits, container capabilities, and remote secret permissions: no existing host identity was available; no SSM session/command was opened.
- Backup application consistency, external/cross-region schedules, usable database/media recovery and restoration time: no host inventory or restore was performed.
- GuardDuty/Security Hub state/findings: subscription errors. Other accounts/regions and external detection were outside scope.
- Successful session-cookie flags, admin MFA, account recovery, Google login, authenticated cross-role/ownership abuse, complete CORS/CSRF and membership behavior: no signed-in sessions, mutations or test accounts used.
- Full TLS protocol/cipher matrix, certificate renewal, arbitrary public-port reachability, and exploitability: no intrusive scans performed.
- GitHub settings/run results/native scanning and full historical secret exposure: not verified by local workflow review.
- KMS policies/rotation, broad account-wide IAM analysis and unrelated AWS workloads: outside the targeted metadata inspection.

## 9. Staged implementation plan with downtime controls

All stages below are recommendations requiring separate approval. Nothing here authorizes their execution.

### Stage 0: establish ownership and restricted access first

Create/reuse a temporary read-only role and MFA-backed operator access; retire routine root use while retaining secure break-glass recovery. Confirm SSH allowlist owners, application/data owners, current backup jobs and acceptable RPO/RTO. Review free CloudTrail event history. These steps do not require restarting the application. Use existing identity facilities where possible; verify applicable pricing before adding services.

### Stage 1: low-impact safeguards

After approval, enable termination protection and regional encryption defaults. These do not require replacing the encrypted live volume. Confirm HTTPS renewal and apply a short HSTS policy through a validated graceful proxy configuration reload. Keep API/database containers untouched. Retain the previous proxy configuration and validate all three domains; do not assume any particular reload procedure until the host has been inspected.

### Stage 2: recovery and actionable alerts

Choose a bounded backup retention policy based on the agreed recovery target; daily backups retained seven days are a planning example, not an implemented policy. Include database and uploaded media consistency, encryption and restricted access. Verify a restore in isolated disposable infrastructure only with explicit authorization; never overwrite the live database.

Add basic instance/status/CPU and meaningful application health alarms with an owned notification route. Disk/memory metrics require host instrumentation and are not supplied by basic EC2 monitoring. Add durable CloudTrail/application logs with short, deliberate retention initially. Backups, alarms, storage, ingestion and restore resources can incur charges; obtain a cost decision first.

### Stage 3: application and release assurance in staging

Test stronger CSP, authenticated cookie flags, administrator MFA, role/ownership boundaries, Google login and production secret handling using disposable accounts/data. Preserve seller/customer session independence, membership enforcement and sandbox/production separation. Add relevant CI scans and document accepted findings; verify deployed image digests against a reviewed commit before a release.

### Stage 4: controlled rollout and rollback

Apply only reviewed changes with a written health check and rollback path. Keep database migrations and unrelated UI changes outside security hardening releases. A single-instance container replacement cannot guarantee zero downtime: genuinely uninterrupted binary rollout needs separately approved parallel capacity/blue-green routing and a cost review. Header-only graceful reloads and AWS metadata safeguards can avoid app restarts when validated for this host.

### Stage 5: confirm the outcome

Recheck allowed ports, issued session cookies, headers, least-privilege identity, alarms/notification delivery, backup completion and isolated restore results. Record exact deployed versions and recovery instructions. Enable GuardDuty, Security Hub, Config, extra capacity or other potentially chargeable services only after explicit approval; do not label them universally free.

## 10. Evidence reference

AWS read families used included STS identity; EC2 instances/status/attributes, interfaces, security groups, VPCs/subnets/routes/ACLs, addresses, volumes/snapshots/sharing/encryption defaults and flow logs; IAM account summary/profile/role/trust/policy metadata; SSM instance inventory; AWS Backup list operations; DLM lifecycle policy reads; CloudWatch alarms; CloudTrail trail descriptions; CloudWatch log-group descriptions; Config recorders; Access Analyzer lists; and attempted GuardDuty/Security Hub metadata reads. No write or session-execution APIs were used.

Relevant local source: `infra/aws-test/{compose.cloud.yaml,Caddyfile,Caddyfile.phone,main.tf,prepare-cloud.sh}`, `backend/app/{security.py,main.py,seller_routes.py,commerce_routes.py,recovery.py}`, main/admin API proxies and Next.js configs, Dockerfiles/ignore files, and the two GitHub workflows. Source observations do not establish the exact running build.

Report status: read-only investigation complete; remediation not started. No AWS/application resources changed, no commit or push performed.

## 11. Master AWS and Android hardening request: audit extension and implementation plan

Added 23 October 2026 in response to the supplied master task. The attachment ends mid-sentence in Phase 7 after "User, seller and advertising data cannot". No missing requirements have been inferred. This extension is planning and source review, not implementation approval. The existing production plan remains authoritative; this report supplements its security gates rather than replacing it.

### Additional identity observations

Read-only inventory returned one IAM user, manu, and six roles: five AWS service-linked roles and Vistrah-EC2-SSM-Role. The user has AdministratorAccess and AmazonEC2FullAccess attached, no inline policies, no group memberships, and zero registered IAM MFA devices. PasswordLastUsed was null; that does not establish whether console or programmatic access is usable. This is an additional **High-priority identity configuration finding**: an administrator-capable IAM user without a registered MFA device. Actual authentication use and any policy/session-based MFA enforcement were not established. Review its necessity, protect it with MFA and least privilege, and verify replacement access before retiring anything. No user credentials were inspected and no login was attempted.

Mumbai Identity Center list-instances returned an empty list; this does not rule out an Identity Center instance in another region. No verified replacement operator/admin session exists in this audit. Do not disable, rotate or delete current root access until replacement access, MFA, required permissions and recovery have been demonstrated independently.

### Android source findings and release unknowns

| Area | Source evidence | Remaining release gate |
| --- | --- | --- |
| API transport | mobile/src/lib/api.ts rejects non-HTTPS API bases outside development and blocks redirect following in the shared fetch transport. | Inspect release artifact and physical-device traffic; the separate native upload transport needs redirect/credential-leak review. |
| Environment separation | validate-build-environment.cjs pins preview/aws-test to the reviewed test HTTPS origins; production rejects those known test origins and requires public HTTPS origins. | Verify actual EAS production values and the independently provisioned production backend. A production profile name does not establish production infrastructure. |
| Native token storage | session.tsx uses expo-secure-store, separate customer/seller keys, and memory token scopes. Web mode uses the cookie proxy rather than this storage. | Device-level storage/backup behavior, reinstall/restore handling, and signed artifact inspection remain unverified. |
| Logout and expiry | Logout attempts server revocation, deletes the scoped stored token and clears scoped memory/user state. Unauthorized responses clear the affected scope. Server-unreachable revocation is reported. | Test offline logout, SecureStore deletion failure, race conditions and revoked/expired sessions in isolation. A storage-deletion failure occurs before in-memory cleanup completes in current source; assess and repair this failure path as an independent source change. |
| Uploads | v-ads-upload.ts uses HTTPS API base, seller bearer token, file-size validation and temporary-file cleanup in finally. | Server ownership/MIME/size checks, interrupted upload cleanup, download authorization, redirect behavior and device cache cleanup need isolated tests. Client validation alone is not authorization. |
| Android permissions | app.json explicitly requests coarse/fine foreground location; location plugin disables background location. | Inspect merged release manifest: dependency plugins can add permissions. Confirm GPS occurs only after Use my location and manual fallback remains available. |
| Links | Employer applicationLink allows HTTPS and rejects embedded credentials. API paths reject traversal/backslash and protocol-relative paths. App declares custom vistrah scheme. | Review all external-link call sites and incoming route parameters; verify reset/OAuth link binding and reject unexpected schemes/hosts where appropriate. One helper does not certify every link. |
| OTA | app.config.js configures EAS Update with fingerprint runtime policy, HTTPS update URL and launch checks; EAS profiles have separate channels. | Verify project access, publisher permissions, environment/channel binding and device rollback. No OTA signature policy was established here; assess update code signing and applicable plan constraints before proposing it. |
| Signing/debugging/secrets | No signing material was opened. Reviewed client files contain public configuration, not private AWS credentials. | Actual signing custody, EAS account MFA, artifact debuggable/cleartext flags, dependency advisories, bundled secret scan and release log redaction are not verified. A targeted source review cannot certify the whole APK. |

No APK/AAB was built, downloaded, signed or published. No EAS credentials or remote settings were requested. Native SecureStore source usage is a positive finding, not a declaration that the future APK has passed a security audit.

### Phase-by-phase implementation batches and rollback preparation

| Master phase | First bounded deliverable | Verification and rollback before any rollout |
| --- | --- | --- |
| 1 Identity | Design separate temporary audit, operator and deployment access; verify current user permissions and regional identity setup. | Prove replacement MFA-backed sessions and required read/admin recovery in parallel. Keep existing root access intact until verified. IAM changes need explicit approval. |
| 2 Network/EC2 | Obtain separately authorized read-only host access; record socket listeners, exact Docker published ports, firewall rules and OS update availability without printing environment/inspect secrets. | Preserve current rules/configuration and recovery access. Do not remove SSH or change egress until SSM/operator access and dependency requirements are demonstrated. No updates/reboots under audit scope. |
| 3 HTTPS/web | Prepare a minimal HSTS source change after hostname HTTPS checks; separately design compatible CSP improvements. | Stage Google login/maps/ads/web/native-browser journeys. Save prior proxy configuration; validate syntax and graceful reload procedure before approval to touch runtime. |
| 4 FastAPI/auth | Map existing ownership/session/membership tests to each protected resource; add only missing negative tests and fixes on an isolated feature branch. | Use verified disposable databases/accounts. Cover cross-customer, cross-seller service/listing/ad access, non-admin denial, expired/revoked sessions and server-side membership. Revert only the batch's own edits; no live database rollback/migration implied. |
| 5 PostgreSQL/data | Inventory runtime volume/role names and backup mechanism without selecting/exporting customer records or exposing credentials. Specify RPO/RTO and consistent encrypted recovery procedure. | Require a verified backup and isolated restore before declaring protection complete or approving data/schema changes. Never restore over normal data. Capture prior backup schedule before changing it. |
| 6 Docker/server | Compare actual runtime with Compose; prepare per-service capability/no-new-privileges/resource-limit/health-check proposals only after compatibility review. | Validate candidate Compose offline and test disposable services. Record exact previous image digests/configuration; do not blindly add read-only filesystems or remove capabilities needed by Caddy/PostgreSQL. Runtime replacement needs approval. |
| 7 Android | Review logout failure cleanup, upload redirects, links, release manifest, logs, dependencies and signing/OTA controls. | Run targeted existing/local tests first; use disposable account/data on a separately authorized test APK. Retain known-good binary/channel/runtime and a tested compatible rollback. No release/publish implied. |

The audit has not yet executed the full isolated authorization matrix or established runtime OS/database configuration. Existing test filenames include seller ownership, V Ads media permissions, Google auth and business membership; their presence is not evidence of passing this audit. Tests touching a database must first establish disposable-data isolation. Do not run normal-container migrations/seeds or use real customer/seller records.

### Zero-additional-cost-first ordering and approval gates

1. Finish source-only test mapping and small reviewable fixes first, on an isolated branch; preserve concurrent work. Local code/test preparation does not authorize AWS or GitHub settings changes, workflow dispatch, publication or deployment.
2. Prove replacement identity and recovery access before retiring any access. Confirm the current user's permissions/MFA; do not create long-lived keys as a shortcut. Existing account features and local checks should be considered before new services.
3. Seek approval for a specific AWS safeguard batch, with exact resources, expected effect and reversal. Termination protection and future-volume encryption defaults do not require container replacement; retain recovery options.
4. Propose backup and alert designs with retention, estimated usage and current official prices before requesting any potentially billable activation. No new paid feature is approved by this master task. Existing capacity cannot guarantee off-host recovery by itself.
5. Release web/API hardening only after scoped tests, provenance and recovery gates. Do not combine with migrations, live payments or unrelated UI work. Preserve the production plan's sandbox fail-closed membership requirement.
6. Build an AWS-test APK only after separate build approval and applicable EAS quota/cost review; publish/store rollout requires further approval. Physical-device and backend negative tests must pass before controlled production release.

For every implementation batch, record affected files/resources, verification, cost implications, backup/recovery prerequisites and exact rollback steps before execution. Source rollback must preserve unrelated edits; do not use broad git reset. IAM rollback must preserve verified access. Single-host binary replacement still cannot promise zero downtime; choose an approved maintenance window or separately approved parallel-capacity strategy.

Current decision: planning/source inspection complete for this extension. No security remediation, AWS/database/GitHub change, code edit, test run, build, deploy, credential retirement or publication performed. The next proposed implementation is local-only logout failure-path hardening plus focused session/authorization test mapping, followed by owner review of a separate identity-access plan.
