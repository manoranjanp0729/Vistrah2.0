"""Acquisition executed by the existing leased workflow action, not a scheduler."""
import hashlib
import json
import os
import time
from datetime import timedelta, datetime, timezone
from uuid import uuid4
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
from sqlalchemy import select
from .models import now
from .workflow_models import ActionRun, WorkflowRun
from .discovery_models import JobSource, Vacancy, VacancyProvenance, Acquisition, AcquisitionSource
from .job_sources import ADAPTERS, SourceError

ERRORS = {
    'NOT_CONFIGURED':'Administrator must supply credentials and confirm permitted API access.',
    'DISABLED':'This source is disabled by an administrator.',
    'NETWORK_DISABLED':'Outbound source access is disabled in the server environment.',
    'RATE_LIMITED':'Provider or local request budget reached. Retry after the displayed time.',
    'SOURCE_BUSY':'Another acquisition is refreshing this source. Retry after it finishes.',
    'ACCESS_DENIED':'Provider rejected access. An administrator must check access and credentials.',
    'NETWORK_UNAVAILABLE':'The provider could not be reached. Successful cached data is retained.',
    'PROVIDER_UNAVAILABLE':'Provider reported a server failure. Retry after backoff.',
    'TIMEOUT':'Source request exceeded its time budget. Retry after backoff.',
    'INVALID_RESPONSE':'Provider returned an unsupported response. No replacement data was invented.',
    'INVALID_RECORDS':'Some provider records were invalid and were excluded.',
    'RESPONSE_TOO_LARGE':'Provider response exceeded the 8 MB safety limit.',
    'DESTINATION_BLOCKED':'The registered destination did not pass network safety checks.',
    'PAGE_LIMIT':'The configured page limit was reached; available results are shown.',
}

def display_permitted(record):
    adzuna = record.get('source')=='adzuna' or any(p['source']=='adzuna' for p in record.get('provenance',[])) or urlsplit(record.get('source_url','')).hostname in ('adzuna.co.uk','www.adzuna.co.uk')
    return not adzuna or ADAPTERS['adzuna'].configuration()['access_ready']

def aware(value):
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value

def sources_init(db):
    for key in ADAPTERS:
        if db.get(JobSource,key) is None:
            enabled = key == 'remotive' and os.getenv('REMOTIVE_ENABLED','true').lower() == 'true'
            db.add(JobSource(id=key, enabled=enabled))
    db.flush()

def source_summary(db, key):
    state = db.get(JobSource,key)
    adapter = ADAPTERS[key]
    return {'id':key,'name':adapter.name,'adapter':f'{key}@{adapter.version}', **adapter.configuration(), 'enabled':state.enabled,'checked_at':state.checked_at,'succeeded_at':state.succeeded_at,'next_request_at':state.next_request_at,'error_code':state.error_code,'error':ERRORS.get(state.error_code),'requests_last_24h':sum(aware(datetime.fromisoformat(t)) > now()-timedelta(days=1) for t in state.request_times)}

def canonical(url):
    parts = urlsplit(url)
    # Adzuna redirect attribution parameters are retained on source URLs. Their
    # tracking query is irrelevant to identity but may carry referral routing.
    pairs = [(k,v) for k,v in parse_qsl(parts.query) if not k.lower().startswith('utm_')]
    return urlunsplit((parts.scheme.lower(),parts.netloc.lower(),parts.path.rstrip('/') or '/',urlencode(sorted(pairs)),''))

def fingerprint(record):
    fields = [record.get(k) for k in ('title','employer','location','description','arrangement','employment_type')]
    # An unknown employer/location or short snippet cannot support cross-source
    # fingerprint deduplication. Source ID / canonical URL still apply.
    if not all(fields[:4]) or len(fields[3]) < 120: return ''
    normalized = [' '.join(str(v or '').casefold().split()) for v in fields]
    return hashlib.sha256(json.dumps(normalized).encode()).hexdigest()

def persist(db, record, retrieved_at):
    if record['source_record_id'] in ('None','', 'null'): raise ValueError('Missing source ID')
    url = canonical(record['source_url'])
    provenance = db.scalar(select(VacancyProvenance).where(VacancyProvenance.source_id==record['source'],VacancyProvenance.source_record_id==record['source_record_id']))
    row = db.get(Vacancy,provenance.vacancy_id) if provenance else db.scalar(select(Vacancy).where(Vacancy.canonical_url==url))
    fp = fingerprint(record)
    if row is None and fp:
        row = db.scalar(select(Vacancy).where(Vacancy.fingerprint==fp))
    if row is None:
        row = Vacancy(id=str(uuid4()),canonical_url=url,fingerprint=fp,record=record,first_seen_at=retrieved_at,last_checked_at=retrieved_at,retrieved_at=retrieved_at)
        db.add(row); db.flush()
    else:
        row.record=record;row.last_checked_at=retrieved_at;row.retrieved_at=retrieved_at;row.fingerprint=fp
    if provenance is None:
        provenance = VacancyProvenance(vacancy_id=row.id,source_id=record['source'],source_record_id=record['source_record_id'],source_url=record['source_url'],attribution=record['attribution'],retrieved_at=retrieved_at)
        db.add(provenance)
    else:
        provenance.source_url=record['source_url'];provenance.retrieved_at=retrieved_at
    db.flush()
    return public_record(db,row)

def public_record(db,row):
    provenance = [{'source':p.source_id,'source_record_id':p.source_record_id,'source_url':p.source_url,'attribution':p.attribution,'retrieved_at':aware(p.retrieved_at).isoformat()} for p in db.scalars(select(VacancyProvenance).where(VacancyProvenance.vacancy_id==row.id).order_by(VacancyProvenance.id))]
    return {**row.record,'id':row.id,'first_seen_at':aware(row.first_seen_at).isoformat(),'last_checked_at':aware(row.last_checked_at).isoformat(),'retrieved_at':aware(row.retrieved_at).isoformat(),'status':'STALE' if aware(row.retrieved_at)<now()-timedelta(hours=24) else 'SOURCE_LISTED','provenance':provenance}

def feed_cache(db,state):
    if state.succeeded_at is None: return []
    rows = db.scalars(select(Vacancy).join(VacancyProvenance).where(VacancyProvenance.source_id==state.id,VacancyProvenance.retrieved_at==state.succeeded_at)).unique()
    return [public_record(db,row) for row in rows]

def reserve(db,state,adapter):
    current = now()
    if os.getenv('SOURCE_NETWORK_ENABLED','true').lower() != 'true': raise SourceError('NETWORK_DISABLED')
    if not state.enabled: raise SourceError('DISABLED')
    if adapter.configuration()['status'] != 'configured': raise SourceError('NOT_CONFIGURED')
    if state.lease_until and aware(state.lease_until)>current: raise SourceError('SOURCE_BUSY')
    if state.next_request_at and aware(state.next_request_at)>current:
        raise SourceError('RATE_LIMITED',int((aware(state.next_request_at)-current).total_seconds()))
    recent = [t for t in state.request_times if aware(datetime.fromisoformat(t))>current-timedelta(days=31)]
    limits = ((86400,4),) if adapter.shared_feed else ((60,25),(86400,250),(604800,1000),(2678400,2500))
    for seconds,limit in limits:
        counted=[aware(datetime.fromisoformat(t)) for t in recent if aware(datetime.fromisoformat(t))>current-timedelta(seconds=seconds)]
        if len(counted)>=limit:
            state.next_request_at=min(counted)+timedelta(seconds=seconds)
            db.commit()
            raise SourceError('RATE_LIMITED',int((aware(state.next_request_at)-current).total_seconds()))
    token = str(uuid4())
    state.request_times=recent+[current.isoformat()]
    state.next_request_at=current+timedelta(hours=6) if adapter.shared_feed else None
    state.lease_token=token;state.lease_until=current+timedelta(seconds=25);state.checked_at=current
    db.commit()  # Budget reservation survives interruption, before outbound I/O.
    return token

def eligible(record, criteria):
    # Soft skills/salary criteria are scored, not exclusions. A listed unknown
    # arrangement is retained for review, never inferred from remote keywords.
    from .action_registry import contains
    title = record['title']; body = title+' '+record['description']
    if criteria['target_titles'] and '*' not in criteria['target_titles'] and not (any(contains(title,t) for t in criteria['target_titles']) or any(contains(body,s) for s in criteria['skills'])): return False
    if record['arrangement'] and criteria['arrangements'] and record['arrangement'] not in criteria['arrangements']: return False
    location = record.get('location') or ''
    if location and location.casefold() != 'worldwide' and criteria['locations'] and not any(contains(location,p) for p in criteria['locations']) and 'Worldwide' not in criteria['locations']: return False
    return True

def source_page(db, progress, inputs, deadline, transport=None):
    adapter=ADAPTERS[progress.source_id]
    state=db.scalar(select(JobSource).where(JobSource.id==adapter.id).with_for_update().execution_options(populate_existing=True))
    if adapter.configuration()['status']!='configured': raise SourceError('NOT_CONFIGURED')
    if not state.enabled: raise SourceError('DISABLED')
    if adapter.shared_feed and state.succeeded_at and state.next_request_at and aware(state.next_request_at)>now():
        rows=feed_cache(db,state)
        progress.cache_used=True;progress.checked_at=now();progress.retrieved_count=len(rows);progress.snapshots=[r for r in rows if eligible(r,inputs)]
        progress.error_code=state.error_code
        progress.status='PARTIAL' if state.error_code else 'SUCCEEDED'
        progress.next_page=1 if state.error_code and state.error_code!='INVALID_RECORDS' else None
        db.commit();return
    token=reserve(db,state,adapter)
    try:
        raw, more = adapter.page(inputs,progress.next_page or 1,deadline,transport)
        timestamp=now()
        state=db.scalar(select(JobSource).where(JobSource.id==adapter.id).with_for_update().execution_options(populate_existing=True))
        if state.lease_token!=token: raise SourceError('SOURCE_BUSY')
        snapshots=list(progress.snapshots)
        invalid=0
        for incoming in raw:
            try:
                if not isinstance(incoming,dict): raise ValueError('Invalid record')
                normalized=adapter.normalize(incoming)
                row=persist(db,normalized,timestamp)
                if eligible(row,inputs): snapshots.append(row)
            except (ValueError, TypeError, KeyError, AttributeError):
                invalid+=1
        if raw and invalid==len(raw): raise SourceError('INVALID_RESPONSE')
        progress.retrieved_count+=len(raw);progress.invalid_count+=invalid;progress.pages+=1;progress.snapshots=snapshots;progress.checked_at=timestamp
        progress.next_page=(progress.next_page or 1)+1 if more else None
        progress.status='PENDING' if more else 'PARTIAL' if progress.invalid_count else 'SUCCEEDED'
        progress.error_code='INVALID_RECORDS' if progress.invalid_count else None
        state.succeeded_at=timestamp;state.error_code=progress.error_code;state.lease_token=None;state.lease_until=None
        db.commit()
    except SourceError as exc:
        state=db.scalar(select(JobSource).where(JobSource.id==adapter.id).with_for_update().execution_options(populate_existing=True))
        if state.lease_token==token:
            state.lease_token=None;state.lease_until=None;state.error_code=exc.code
            backoff=now()+timedelta(seconds=exc.retry_after)
            if state.next_request_at is None or aware(state.next_request_at)<backoff: state.next_request_at=backoff
            db.commit()
        raise

def acquire(db, payload, inputs, transport=None):
    sources_init(db)
    acquisition=db.scalar(select(Acquisition).where(Acquisition.action_id==payload[1]))
    if acquisition is None:
        acquisition=Acquisition(id=str(uuid4()),workflow_id=payload[0],action_id=payload[1]);db.add(acquisition);db.flush()
        for key in inputs['sources']: db.add(AcquisitionSource(acquisition_id=acquisition.id,source_id=key))
        db.commit()
    deadline=time.monotonic()+18
    for progress in db.scalars(select(AcquisitionSource).where(AcquisitionSource.acquisition_id==acquisition.id).order_by(AcquisitionSource.id)).all():
        if progress.status=='SUCCEEDED' or (progress.status=='PARTIAL' and progress.next_page is None): continue
        progress.status='PENDING';progress.error_code=None;db.commit()
        while progress.next_page is not None:
            # Cancellation/stale action leases cannot commit private results.
            action=db.get(ActionRun,payload[1],populate_existing=True)
            run=db.get(WorkflowRun,payload[0],populate_existing=True)
            if action.lease_token!=payload[2] or run.status=='CANCELLED': raise SourceError('SOURCE_BUSY')
            if progress.pages>=inputs['max_pages']:
                progress.status='PARTIAL';progress.error_code='PAGE_LIMIT';progress.next_page=None;db.commit();break
            try:
                source_page(db,progress,inputs,deadline,transport)
                if progress.status=='PARTIAL': break
            except SourceError as exc:
                state=db.get(JobSource,progress.source_id)
                if ADAPTERS[progress.source_id].shared_feed and state.succeeded_at:
                    cached=feed_cache(db,state)
                    progress.snapshots=[r for r in cached if eligible(r,inputs)]
                    progress.cache_used=True
                progress.status='PARTIAL' if progress.snapshots else 'FAILED';progress.error_code=exc.code;progress.checked_at=now();db.commit();break
        from .workflow_engine import event
        event(db,db.get(WorkflowRun,payload[0]),'SOURCE_RESULT',action=db.get(ActionRun,payload[1]),details={'source_id':progress.source_id,'status':progress.status,'pages':progress.pages,'retrieved_count':progress.retrieved_count,'invalid_count':progress.invalid_count,'cache_used':progress.cache_used,'error_code':progress.error_code})
        db.commit()
    records=list(db.scalars(select(AcquisitionSource).where(AcquisitionSource.acquisition_id==acquisition.id)))
    seen={}
    for progress in records:
        for snapshot in progress.snapshots:
            if snapshot['id'] not in seen: seen[snapshot['id']]=snapshot
            else:
                existing=seen[snapshot['id']]
                existing['provenance']=list({(p['source'],p['source_record_id']):p for p in existing['provenance']+snapshot['provenance']}.values())
    # Reuse the installed keyword scorer with absent values only represented as
    # empty strings at the scoring boundary. Persisted/public fields stay null.
    from .action_registry import rank
    scoring=[{**r,'company':r.get('employer') or '', 'location':r.get('location') or ''} for r in seen.values()]
    ranking=rank(inputs,{'jobs.normalize@1':{'listings':scoring}})
    matches=[]
    for match in ranking['matches'][:inputs['result_limit']]:
        listing=seen[match['listing']['id']]
        matches.append({**match,'listing':listing})
    succeeded=any(r.status in ('SUCCEEDED','PARTIAL') and (r.snapshots or r.error_code is None) for r in records)
    failed=any(r.status!='SUCCEEDED' for r in records)
    status='PARTIAL' if succeeded and failed else 'COMPLETE' if succeeded else 'ALL_UNAVAILABLE'
    acquisition.status=status;acquisition.finished_at=now();db.commit()
    total=sum(len(r.snapshots) for r in records)
    return {'acquisition_id':acquisition.id,'status':status,'search_time':aware(acquisition.finished_at).isoformat(), 'sources':[{'id':r.source_id,'name':ADAPTERS[r.source_id].name,'status':r.status,'error_code':r.error_code,'error':ERRORS.get(r.error_code),'pages':r.pages,'retrieved_count':r.retrieved_count,'invalid_count':r.invalid_count,'cache_used':r.cache_used,'checked_at':aware(r.checked_at).isoformat() if r.checked_at else None,'retry_at':aware(db.get(JobSource,r.source_id).next_request_at).isoformat() if db.get(JobSource,r.source_id).next_request_at else None} for r in records], 'retrieved_count':sum(r.retrieved_count for r in records),'deduplicated_count':len(seen),'removed_duplicates':total-len(seen),'matches':matches,'missing_profile':[key for key in ('skills','experience_years','resume_text','salary_expectation') if inputs.get(key) in (None,'',[])], 'method':ranking['method']+' Remote preference scoring does not establish geographic eligibility. Remotive is delayed 24 hours; source listing is not confirmation of an open vacancy.', 'next_action':'Review the original source and eligibility; use the preparation plan with selected vacancy details to create drafts. Submission remains disabled.' if matches else 'Broaden your titles or locations, or ask an administrator to configure or enable sources. Retry transient failures after backoff.'}
