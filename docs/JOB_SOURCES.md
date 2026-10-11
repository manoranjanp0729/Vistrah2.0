# Job-source integrations

Documentation verified on 9 October 2026. The installed adapters use documented JSON APIs, fixed HTTPS destinations and no scraping. These are the only implemented providers.

| Source | Adapter | Local configuration | Access method |
|---|---|---|---|
| Remotive | `remotive@1` | Configured, enabled by default on first bootstrap; no credentials | `https://remotive.com/api/remote-jobs` |
| Adzuna UK | `adzuna@1` | `not_configured`, disabled until server credentials and access confirmation are supplied | `https://api.adzuna.com/v1/api/jobs/gb/search/{page}` |

Remotive's [official API documentation and terms](https://github.com/remotive-com/remote-jobs-api/blob/master/README.md) require Remotive attribution and original listing links, prohibit signup-gated listings and third-party job-board syndication, delay data 24 hours, and advise at most four requests daily. VISTRAH exposes complete listings at `/jobs` and `/jobs/{id}` without authentication or membership. Private profiles and scoring stay in Finds. A database-backed global feed cache reserves requests before I/O, enforces six hours between requests and at most four in a rolling 24 hours. Health checks and manual acquisitions share this budget. Cached retrieval retains its actual timestamp. No structured Google Jobs export is generated.

Adzuna's [search documentation](https://developer.adzuna.com/docs/search) specifies application ID/key authentication, paginated search, snippets, stable IDs and redirect URLs. [Terms](https://developer.adzuna.com/docs/terms_of_service) permit listed uses, impose default limits of 25/minute, 250/day, 1000/week and 2500/month, and may require written commercial permission beyond the validation trial. Before enabling, obtain access appropriate to VISTRAH's use; setting a flag does not grant a licence. Each displayed advert carries a linked Adzuna wordmark at least 116 × 23 pixels. Predicted salaries are omitted. Actual ranges remain as provided, and currency stays unknown unless supplied. Queries never follow content-provider links. Monthly limits use a conservative rolling 31-day window.

## Server configuration

Set in the ignored `.env` or a secure deployment environment, then recreate API and worker with `docker compose up --build -d`:

```dotenv
SOURCE_NETWORK_ENABLED=true
REMOTIVE_ENABLED=true
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
ADZUNA_ACCESS_CONFIRMED=false
```

`REMOTIVE_ENABLED` applies only when inserting a missing source; restart preserves admin enable/disable edits. `SOURCE_NETWORK_ENABLED=false` stops outbound acquisition, while existing cached listings remain readable. Adzuna requires both nonempty credentials and an explicit confirmation of permitted access. Admin > Job Sources enables it only after configuration is ready. Credentials are never entered in browser settings, stored in acquisition records, or returned by the API. HTTP diagnostic logging redacts credential query parameters and configured values. Provider exception/response bodies are not persisted. Credential-bearing query values are removed from source links.

Do not enable Adzuna while access is uncertain. If Adzuna terminates access, its terms require removal of acquired data from website pages; disable acquisition and set `ADZUNA_ACCESS_CONFIRMED=false` and recreate API/worker to suppress its cached listings in public pages, private results and preparation. Histories remain stored; publication is blocked. Do not publish its data again without valid access.

## Retrieval, matching and limits

`VacancySourceAdapter` in `backend/app/job_sources.py` provides identity/version, configuration readiness, paginated retrieval and normalization. Source health is established by bounded retrieval through `jobs.discover@2`; it is not inferred from an enabled flag. Admin Test connection queues a one-page operation; Acquire vacancies permits up to three pages. Remotive's full feed has no paging; customers filter the shared feed locally by title/skill keywords, location and known arrangement. Adzuna queries the first title/location, or up to three skills for a broad administrative request. Additional preferences are evaluated locally. Names, resume text, experience and search notes are never sent to providers.

Customer limits: 1–50 displayed matches, 1–3 API pages; Adzuna returns at most 20 records/page. Public listings use pages of 20. Skills and salary affect ranking rather than excluding jobs. `Worldwide` is an explicit broad geographic preference; it does not prove eligibility. The existing 50/20/10/10/10 scorer is reused. Remote preference can earn location points, so customers must review geographic restrictions. Missing profile fields, unknown salaries/currency and unverified experience are displayed honestly. No inferred skills, deadline, employer or publication date is inserted.

Network requests use only two registered HTTPS hosts, public-address checks, disabled redirects/proxies, three-second connection and four-second read timeouts, an 18-second acquisition I/O budget, an 8 MB decompressed response limit and a 4000-record feed ceiling. The existing workflow lease is 30 seconds. Invalid records are skipped and counted; an entirely invalid nonempty response fails. HTML becomes bounded plain text; React escapes it. Descriptions cannot invoke tools, execute instructions or cause further network calls.

Identity uses source ID, then canonical URL without `utm_*`, then exact normalized title/employer/location/description/arrangement/employment fingerprints. Fingerprint merging needs a known employer/location and at least 120 description characters. Different roles with the same title stay separate. Provenance retains source IDs, original links, attribution and retrieval timestamps. Numeric salary ranges and text salaries are separate. Dates returned without a timezone retain that ambiguity. Descriptions are limited to 12,000 characters, and preparation to 6,000.

`SOURCE_LISTED` means observed in a source response, with open status unconfirmed. At 24 hours since successful retrieval, presentation becomes `STALE`; disappearance from a feed does not prove closure. These adapters provide no confirmed-closed evidence. Frozen search results preserve exact search-time records; read-time stale status is derived without changing the stored matching result.

## Resilience and operation

No schedules are implemented or enabled. An owned Finds request or explicit admin action queues the ordinary Compose worker. Acquisition is unique per action, with independently committed per-source page/cursor/snapshot progress. Restart can reclaim an expired action lease, skip completed sources and resume the next uncommitted page. Database source leases prevent overlapping provider requests; request reservations survive interruption. Transient errors respect Retry-After or at least 60 seconds of backoff. Remotive retains its six-hour floor after failures. Valid older cached data can be shown as a partial result after refresh failure.

Execution completion and acquisition success are distinct: an action may complete with `COMPLETE`, `PARTIAL` or `ALL_UNAVAILABLE`. This allows useful partial matches to remain visible. Eligible customer/admin retries use the same acquisition/action, preserve successful source snapshots and resume failed sources; at most three workflow attempts. A page-cap or excluded invalid-record partial outcome requires a new plan rather than repeatedly querying identical data. No external application submission, outreach or tracking is enabled.

## Optional live smoke

Ordinary tests mock provider HTTP and require no third-party access. To queue a real acquisition through the worker, after an existing administrator and career service are present:

```powershell
docker compose exec -T api python -m app.discovery_smoke --live --source remotive
```

Use `--source adzuna` only after authorised configuration. The command prints sanitized counts/status, never credentials or profile text. It uses a fresh cache when available. It creates a labelled operational request/workflow, not sample vacancies. See [validation](VALIDATION.md) for actual executed results.
