"""Documented fixed-destination API adapters. No scraping or user-URL fetching."""
import ipaddress
import json
import logging
import os
import re
import socket
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from typing import Protocol
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
import httpx
from .discovery_schemas import NormalizedVacancy

MAX_BYTES = 8_000_000

class CredentialRedaction(logging.Filter):
    def filter(self, record):
        message=record.getMessage()
        message=re.sub(r'(app_id|app_key)(=|%3D)[^&\s"\']+',r'\1=[redacted]',message,flags=re.I)
        for name in ('ADZUNA_APP_ID','ADZUNA_APP_KEY'):
            value=os.getenv(name,'')
            if value: message=message.replace(value,'[redacted]')
        record.msg=message;record.args=()
        return True

for log_name in ('httpx','httpcore','httpcore.connection','httpcore.http11','httpcore.http2','httpcore.proxy'):
    logging.getLogger(log_name).addFilter(CredentialRedaction())

class SourceError(Exception):
    def __init__(self, code, retry_after=60):
        super().__init__(code)
        self.code = code
        self.retry_after = min(max(retry_after, 60), 86400)

class PlainText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.hidden = 0
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'): self.hidden += 1
        if tag in ('p', 'br', 'li', 'div'): self.parts.append('\n')
    def handle_endtag(self, tag):
        if tag in ('script', 'style'): self.hidden = max(0, self.hidden - 1)
    def handle_data(self, data):
        if not self.hidden: self.parts.append(data)

def text(value, limit=12000):
    if not isinstance(value, str): return None
    parser = PlainText()
    parser.feed(value[:100000])
    clean = ''.join(c for c in ''.join(parser.parts) if ord(c) >= 32 or c in '\n\t').strip()
    return clean[:limit] or None

def timestamp(value):
    if not isinstance(value, str): return None
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00')).isoformat()
    except ValueError:
        return None

def source_link(value, domains):
    host = urlsplit(value).hostname if isinstance(value, str) else None
    if host not in domains: raise ValueError('Unexpected listing host')
    parts=urlsplit(value)
    secrets=[os.getenv(k,'') for k in ('ADZUNA_APP_ID','ADZUNA_APP_KEY') if os.getenv(k,'')]
    query=[(k,v) for k,v in parse_qsl(parts.query) if k.lower() not in ('app_id','app_key') and not any(secret in v for secret in secrets)]
    return urlunsplit((parts.scheme,parts.netloc,parts.path,urlencode(query),''))

def retry_delay(value):
    try: return int(value)
    except (ValueError, TypeError):
        try: return int((parsedate_to_datetime(value) - datetime.now(timezone.utc)).total_seconds())
        except (ValueError, TypeError, OverflowError): return 60

def get_json(url, params, deadline, transport=None):
    # URLs originate only from the registered adapters. Redirects and environment
    # proxies are disabled. Tests inject an HTTP transport, never a custom URL.
    host = urlsplit(url).hostname
    if host not in ('remotive.com', 'api.adzuna.com') or urlsplit(url).scheme != 'https':
        raise SourceError('DESTINATION_BLOCKED')
    if transport is None:
        try:
            addresses = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
            if not addresses or any(not ipaddress.ip_address(a[4][0]).is_global for a in addresses):
                raise SourceError('DESTINATION_BLOCKED')
        except OSError:
            raise SourceError('NETWORK_UNAVAILABLE') from None
    if time.monotonic() >= deadline: raise SourceError('TIMEOUT')
    try:
        with httpx.Client(timeout=httpx.Timeout(4, connect=3), follow_redirects=False, trust_env=False, transport=transport) as client:
            with client.stream('GET', url, params=params, headers={'Accept':'application/json', 'User-Agent':'VISTRAH/2.0 vacancy discovery'}) as response:
                if response.status_code == 429:
                    raise SourceError('RATE_LIMITED', retry_delay(response.headers.get('Retry-After')))
                if response.status_code in (401, 403): raise SourceError('ACCESS_DENIED')
                if response.status_code >= 500: raise SourceError('PROVIDER_UNAVAILABLE')
                if response.status_code != 200: raise SourceError('INVALID_RESPONSE')
                if 'json' not in response.headers.get('content-type', '').lower(): raise SourceError('INVALID_RESPONSE')
                chunks = []
                size = 0
                for chunk in response.iter_bytes():
                    size += len(chunk)
                    if size > MAX_BYTES: raise SourceError('RESPONSE_TOO_LARGE')
                    if time.monotonic() >= deadline: raise SourceError('TIMEOUT')
                    chunks.append(chunk)
                data = json.loads(b''.join(chunks))
                if not isinstance(data, dict): raise SourceError('INVALID_RESPONSE')
                return data
    except httpx.TimeoutException:
        raise SourceError('TIMEOUT') from None
    except (httpx.HTTPError, OSError):
        raise SourceError('NETWORK_UNAVAILABLE') from None
    except (ValueError, UnicodeError):
        raise SourceError('INVALID_RESPONSE') from None

class VacancySourceAdapter(Protocol):
    id: str
    version: int
    name: str
    shared_feed: bool
    def configuration(self) -> dict: ...
    def page(self, criteria: dict, page: int, deadline: float, transport=None) -> tuple[list, bool]: ...
    def normalize(self, record: dict) -> dict: ...

class RemotiveAdapter:
    id = 'remotive'
    version = 1
    name = 'Remotive'
    shared_feed = True
    def configuration(self):
        return {'status':'configured', 'credential_ready':True, 'access_ready':True, 'note':'Public delayed remote feed; listings are also available without login at /jobs.', 'quota':'At most 4 requests per rolling 24 hours; minimum 6 hours between feed requests.'}
    def page(self, criteria, page, deadline, transport=None):
        if page != 1: return [], False
        data = get_json('https://remotive.com/api/remote-jobs', {}, deadline, transport)
        jobs = data.get('jobs')
        if not isinstance(jobs, list) or len(jobs) > 4000: raise SourceError('INVALID_RESPONSE')
        return jobs, False
    def normalize(self, record):
        return NormalizedVacancy(source=self.id, source_record_id=str(record['id']), title=text(record['title'],300), employer=text(record.get('company_name'),300), description=text(record.get('description')) or '', location=text(record.get('candidate_required_location'),300), arrangement='REMOTE', employment_type=text(record.get('job_type'),100), salary_text=text(record.get('salary'),500), published_at=timestamp(record.get('publication_date')), tags=[text(t,150) for t in record.get('tags',[]) if isinstance(t,str) and text(t,150)][:30], source_url=source_link(record['url'], ('remotive.com','www.remotive.com')), attribution='Remotive').model_dump()

class AdzunaAdapter:
    id = 'adzuna'
    version = 1
    name = 'Adzuna (UK)'
    shared_feed = False
    def configuration(self):
        credentials = bool(os.getenv('ADZUNA_APP_ID','').strip() and os.getenv('ADZUNA_APP_KEY','').strip())
        approved = os.getenv('ADZUNA_ACCESS_CONFIRMED','false').lower() == 'true'
        return {'status':'configured' if credentials and approved else 'not_configured', 'credential_ready':credentials, 'access_ready':approved, 'note':'Requires server environment credentials and confirmation that your Adzuna access permits this use. UK endpoint only.', 'quota':'25/minute, 250/day, 1000/week, 2500 per rolling 31 days; lower server limits allowed.'}
    def page(self, criteria, page, deadline, transport=None):
        if self.configuration()['status'] != 'configured': raise SourceError('NOT_CONFIGURED')
        # Profile text, names and resumes are never sent to a provider. Adzuna's
        # what search uses the first title (or skills for a broad admin request).
        titles = [t for t in criteria['target_titles'] if t != '*']
        params = {'app_id':os.environ['ADZUNA_APP_ID'], 'app_key':os.environ['ADZUNA_APP_KEY'], 'results_per_page':20, 'what':titles[0] if titles else ' '.join(criteria['skills'][:3]), 'content-type':'application/json'}
        if criteria['locations'] and criteria['locations'][0].casefold() != 'worldwide': params['where'] = criteria['locations'][0]
        data = get_json(f'https://api.adzuna.com/v1/api/jobs/gb/search/{page}', params, deadline, transport)
        rows = data.get('results')
        if not isinstance(rows, list) or len(rows) > 20: raise SourceError('INVALID_RESPONSE')
        return rows, len(rows) == 20
    def normalize(self, record):
        # Predicted salary is deliberately omitted; no Jobsworth attribution is
        # needed because no salary estimates are published. Currency stays unknown
        # unless explicitly supplied by the source.
        advertised = str(record.get('salary_is_predicted')) == '0'
        return NormalizedVacancy(source=self.id, source_record_id=str(record['id']), title=text(record['title'],300), employer=text((record.get('company') or {}).get('display_name'),300), description=text(record.get('description')) or '', location=text((record.get('location') or {}).get('display_name'),300), employment_type=text(record.get('contract_type') or record.get('contract_time'),100), salary_min=record.get('salary_min') if advertised else None, salary_max=record.get('salary_max') if advertised else None, currency=record.get('currency') if advertised else None, published_at=timestamp(record.get('created')), source_url=source_link(record['redirect_url'],('adzuna.co.uk','www.adzuna.co.uk')), attribution='Adzuna').model_dump()

ADAPTERS: dict[str, VacancySourceAdapter] = {'remotive':RemotiveAdapter(), 'adzuna':AdzunaAdapter()}
