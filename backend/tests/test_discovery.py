"""All provider traffic is mocked; these tests do not consume API quotas."""
import logging
import time
from contextlib import nullcontext
from datetime import timedelta
import httpx
import pytest
from sqlalchemy import select, func
from app import workflow_engine as engine
from app.discovery_models import JobSource, Vacancy, VacancyProvenance, Acquisition, AcquisitionSource
from app.discovery_service import persist, public_record, reserve
from app.job_sources import ADAPTERS, RemotiveAdapter, AdzunaAdapter, SourceError, get_json
from app.discovery_schemas import DiscoveryInputs
from app.models import Service, now
from app.workflow_models import WorkflowRun, ActionRun, ExecutionAttempt, WorkflowEvidence

@pytest.fixture(autouse=True)
def allow_test_transport(monkeypatch):
    monkeypatch.setenv('SOURCE_NETWORK_ENABLED','true')
    monkeypatch.delenv('ADZUNA_APP_ID',raising=False)
    monkeypatch.delenv('ADZUNA_APP_KEY',raising=False)
    monkeypatch.delenv('ADZUNA_ACCESS_CONFIRMED',raising=False)

def remotive(id=1, **extra):
    return {'id':id,'url':f'https://remotive.com/remote-jobs/software-dev/python-engineer-{id}','title':'Python Engineer','company_name':'Fixture Employer','description':'<p>Python SQL engineering systems and software.</p>'+('Verified source text for deterministic acquisition tests. '*4),'candidate_required_location':'Worldwide','publication_date':'2026-01-02T12:00:00','job_type':'full_time',**extra}

def adzuna(id=1, **extra):
    return {'id':str(id),'redirect_url':f'https://www.adzuna.co.uk/jobs/land/ad/{id}','title':'Python Engineer','company':{'display_name':'Fixture Employer'},'location':{'display_name':'London'},'description':'Python engineering SQL software applications, supplied test text.','created':'2026-01-02T12:00:00Z',**extra}

def configure_adzuna(db,monkeypatch):
    monkeypatch.setenv('ADZUNA_APP_ID','private-test-id')
    monkeypatch.setenv('ADZUNA_APP_KEY','private-test-key')
    monkeypatch.setenv('ADZUNA_ACCESS_CONFIRMED','true')
    state=db.get(JobSource,'adzuna');state.enabled=True;db.commit()

def create(client,db,headers,sources=None,key='discovery-tests-123',values=None):
    from conftest import activate_test_membership
    activate_test_membership(client,headers)
    service=db.scalar(select(Service).where(Service.slug=='job-search-assistance'))
    response=client.post('/requests',headers=headers,json={'service_id':service.id,'requirements':'Discover engineering jobs through configured sources.','location':'London','phone':'6364456776'})
    assert response.status_code==201,response.text
    inputs=DiscoveryInputs(target_titles=['Python Engineer'],skills=['Python','SQL'],locations=['Worldwide'],arrangements=['REMOTE'],sources=sources or ['remotive']).model_dump()
    response=client.post('/finds/discovery',headers=headers,json={'request_id':response.json()['id'],'idempotency_key':key,'inputs':values if values is not None else inputs})
    assert response.status_code==201,response.text
    return response.json()

def execute(client,db,headers,run,handler):
    assert client.post(f'/finds/workflows/{run["id"]}/start',headers=headers).status_code==200
    return step(client,db,headers,run,httpx.MockTransport(handler))

def step(client,db,headers,run,transport):
    payload=engine.claim(db,run['id']);assert payload
    outcome=engine.execute(payload,lambda:nullcontext(db),transport)
    assert outcome[1] is None,outcome
    engine.finish(db,payload,*outcome)
    return client.get(f'/finds/workflows/{run["id"]}',headers=headers).json()

def result(run): return run['actions'][0]['result']

def test_configuration_has_no_secrets(monkeypatch):
    adapter=AdzunaAdapter();assert adapter.configuration()['status']=='not_configured'
    monkeypatch.setenv('ADZUNA_APP_ID','sensitive-id');monkeypatch.setenv('ADZUNA_APP_KEY','sensitive-key')
    assert adapter.configuration()['credential_ready'] and not adapter.configuration()['access_ready']
    monkeypatch.setenv('ADZUNA_ACCESS_CONFIRMED','true')
    assert adapter.configuration()['status']=='configured'
    assert 'sensitive' not in str(adapter.configuration())
    assert RemotiveAdapter().configuration()['status']=='configured'

def test_optional_fields_and_untrusted_html():
    row=RemotiveAdapter().normalize(remotive(company_name=None,salary=None,publication_date=None,candidate_required_location=None,job_type=None,description='<script>steal()</script><p>Python engineer</p>'))
    assert all(row[k] is None for k in ('salary_min','salary_max','currency','deadline','employer','published_at','location','employment_type'))
    assert row['description']=='Python engineer' and row['arrangement']=='REMOTE'
    assert row['required_skills']==[]
    predicted=AdzunaAdapter().normalize(adzuna(salary_is_predicted=1,salary_min=50000,salary_max=90000))
    assert predicted['salary_min'] is None and predicted['arrangement'] is None

@pytest.mark.parametrize('response',[httpx.Response(200,json=[]),httpx.Response(200,json={'jobs':'bad'}),httpx.Response(200,text='<html>Error</html>'),httpx.Response(302,headers={'location':'http://127.0.0.1/internal'})])
def test_invalid_responses_and_redirects(response):
    with pytest.raises(SourceError,match='INVALID_RESPONSE'):
        RemotiveAdapter().page({},1,time.monotonic()+10,httpx.MockTransport(lambda _:response))

def test_rate_limit_and_timeout_errors_are_safe():
    with pytest.raises(SourceError) as caught:
        RemotiveAdapter().page({},1,time.monotonic()+10,httpx.MockTransport(lambda _:httpx.Response(429,headers={'Retry-After':'180'})))
    assert caught.value.code=='RATE_LIMITED' and caught.value.retry_after==180
    def timeout(request): raise httpx.ReadTimeout('secret query path should not escape',request=request)
    with pytest.raises(SourceError,match='TIMEOUT'):
        RemotiveAdapter().page({},1,time.monotonic()+10,httpx.MockTransport(timeout))

def test_response_size_and_fixed_destinations(monkeypatch):
    import app.job_sources as sources
    monkeypatch.setattr(sources,'MAX_BYTES',100)
    with pytest.raises(SourceError,match='RESPONSE_TOO_LARGE'):
        get_json('https://remotive.com/api/remote-jobs',{},time.monotonic()+10,httpx.MockTransport(lambda _:httpx.Response(200,json={'jobs':[remotive()]})))
    with pytest.raises(SourceError,match='DESTINATION_BLOCKED'):
        get_json('http://127.0.0.1/private',{},time.monotonic()+10)
    monkeypatch.setattr(sources.socket,'getaddrinfo',lambda *a,**k:[(2,1,6,'',('127.0.0.1',443))])
    with pytest.raises(SourceError,match='DESTINATION_BLOCKED'):
        get_json('https://remotive.com/api/remote-jobs',{},time.monotonic()+10)

def test_complete_workflow_public_access_evidence_and_restart(client,db,seeded,customer):
    run=create(client,db,customer)
    done=execute(client,db,customer,run,lambda _:httpx.Response(200,json={'jobs':[remotive(),remotive(),remotive(2,title='Different Engineer')]}))
    found=result(done)
    assert done['status']=='COMPLETED' and found['status']=='COMPLETE'
    assert found['retrieved_count']==3 and found['removed_duplicates']==1 and len(found['matches'])==2
    assert all(m['score']<=100 and m['listing']['status']=='SOURCE_LISTED' for m in found['matches'])
    assert found['matches'][0]['listing']['published_at']!=found['matches'][0]['listing']['retrieved_at']
    assert len(done['actions'][0]['evidence'])==2
    assert 'Open status unconfirmed' in done['actions'][0]['evidence'][0]['description']
    public=client.get('/jobs');assert public.status_code==200 and public.json()['total']==2
    assert 'candidate_name' not in public.text and 'score' not in public.text
    assert client.get('/jobs/'+found['matches'][0]['listing']['id']).status_code==200
    db.expire_all()
    reloaded=client.get('/finds/workflows/'+run['id'],headers=customer).json()
    assert result(reloaded)==found and engine.claim(db,run['id']) is None
    assert db.scalar(select(func.count()).select_from(Acquisition))==1

def test_shared_cache_duplicate_acquisition_and_request_budget(client,db,seeded,customer):
    calls=[]
    run=create(client,db,customer)
    done=execute(client,db,customer,run,lambda req:(calls.append(str(req.url)) or httpx.Response(200,json={'jobs':[remotive()]})))
    run2=create(client,db,customer,key='other-discovery-456')
    second=execute(client,db,customer,run2,lambda _:pytest.fail('Fresh feed must not be fetched again'))
    assert len(calls)==1 and result(second)['sources'][0]['cache_used']
    assert db.scalar(select(func.count()).select_from(Vacancy))==1
    body={'request_id':run['request_id'],'idempotency_key':'discovery-tests-123','inputs':run['inputs']}
    duplicate=client.post('/finds/discovery',headers=customer,json=body)
    assert duplicate.status_code==201 and duplicate.json()['id']==done['id']
    assert db.scalar(select(func.count()).select_from(Acquisition))==2

def test_partial_failure_and_retry_preserves_success(client,db,seeded,customer,monkeypatch):
    configure_adzuna(db,monkeypatch)
    run=create(client,db,customer,['remotive','adzuna'])
    def first(request):
        return httpx.Response(200,json={'jobs':[remotive()]}) if request.url.host=='remotive.com' else httpx.Response(503,json={})
    done=execute(client,db,customer,run,first)
    assert result(done)['status']=='PARTIAL' and len(result(done)['matches'])==1
    assert done['actions'][0]['retry_eligible']
    original=result(done)['matches'][0]
    db.get(JobSource,'adzuna').next_request_at=now()-timedelta(seconds=1);db.commit()
    retry=client.post(f'/finds/workflows/{run["id"]}/actions/{done["actions"][0]["id"]}/retry',headers=customer)
    assert retry.status_code==200
    def second(request):
        assert request.url.host=='api.adzuna.com'
        return httpx.Response(200,json={'results':[adzuna()]})
    retried=step(client,db,customer,run,httpx.MockTransport(second))
    assert result(retried)['status']=='COMPLETE' and original in result(retried)['matches']
    assert len(result(retried)['matches'])==2 and db.scalar(select(func.count()).select_from(Acquisition))==1
    assert retried['actions'][0]['attempts']==2
    assert db.scalar(select(func.count()).select_from(WorkflowEvidence))==2

def test_unconfigured_disabled_all_unavailable_has_no_fallback(client,db,seeded,customer):
    db.get(JobSource,'remotive').enabled=False;db.commit()
    run=create(client,db,customer,['remotive','adzuna'])
    done=execute(client,db,customer,run,lambda _:pytest.fail('No eligible sources may contact the network'))
    assert result(done)['status']=='ALL_UNAVAILABLE' and result(done)['matches']==[]
    assert {s['error_code'] for s in result(done)['sources']}=={'DISABLED','NOT_CONFIGURED'}
    assert db.scalar(select(func.count()).select_from(Vacancy))==0

def test_unconfigured_enabled_source_diagnostic(client,db,seeded,customer):
    db.get(JobSource,'adzuna').enabled=True;db.commit()
    run=create(client,db,customer,['adzuna'])
    done=execute(client,db,customer,run,lambda _:pytest.fail('Missing credentials must prevent network access'))
    assert result(done)['sources'][0]['error_code']=='NOT_CONFIGURED'

def test_pagination_and_page_cap(client,db,seeded,customer,monkeypatch):
    configure_adzuna(db,monkeypatch)
    run=create(client,db,customer,['adzuna'])
    pages=[]
    def transport(request):
        page=int(request.url.path.rsplit('/',1)[-1]);pages.append(page)
        return httpx.Response(200,json={'results':[adzuna(i+page*100) for i in range(20)]})
    done=execute(client,db,customer,run,transport)
    assert pages==[1,2] and result(done)['status']=='PARTIAL'
    assert result(done)['sources'][0]['error_code']=='PAGE_LIMIT'
    assert result(done)['deduplicated_count']==40 and len(result(done)['matches'])==20
    assert not done['actions'][0]['retry_eligible']

def test_partial_page_resume_does_not_repeat_first_page(client,db,seeded,customer,monkeypatch):
    configure_adzuna(db,monkeypatch)
    run=create(client,db,customer,['adzuna'])
    pages=[]
    def first(request):
        page=int(request.url.path.rsplit('/',1)[-1]);pages.append(page)
        return httpx.Response(200,json={'results':[adzuna(i) for i in range(20)]}) if page==1 else httpx.Response(429,headers={'Retry-After':'90'})
    done=execute(client,db,customer,run,first)
    assert result(done)['status']=='PARTIAL' and pages==[1,2]
    state=db.get(JobSource,'adzuna');assert engine.aware(state.next_request_at)>now()+timedelta(seconds=80)
    state.next_request_at=now()-timedelta(seconds=1);db.commit()
    assert client.post(f'/finds/workflows/{run["id"]}/actions/{done["actions"][0]["id"]}/retry',headers=customer).status_code==200
    def second(request):
        assert request.url.path.endswith('/2')
        return httpx.Response(200,json={'results':[adzuna(30)]})
    retried=step(client,db,customer,run,httpx.MockTransport(second))
    assert result(retried)['deduplicated_count']==21 and result(retried)['sources'][0]['pages']==2

def test_global_quota_and_overlap_reservation(db,seeded):
    state=db.get(JobSource,'remotive');token=reserve(db,state,ADAPTERS['remotive'])
    assert token and state.lease_token==token
    with pytest.raises(SourceError,match='SOURCE_BUSY'): reserve(db,state,ADAPTERS['remotive'])
    state.lease_until=now()-timedelta(seconds=1);db.commit()
    with pytest.raises(SourceError,match='RATE_LIMITED'): reserve(db,state,ADAPTERS['remotive'])

def test_quota_all_windows(db,seeded,monkeypatch):
    configure_adzuna(db,monkeypatch);state=db.get(JobSource,'adzuna')
    state.request_times=[(now()-timedelta(seconds=10)).isoformat()]*25;db.commit()
    with pytest.raises(SourceError,match='RATE_LIMITED'): reserve(db,state,ADAPTERS['adzuna'])
    assert state.next_request_at

def test_conservative_dedup_and_cross_source_provenance(db,seeded):
    a=RemotiveAdapter().normalize(remotive());first=persist(db,a,now())
    b={**a,'source':'adzuna','source_record_id':'different-provider-id','source_url':'https://www.adzuna.co.uk/jobs/land/ad/999','attribution':'Adzuna'}
    second=persist(db,b,now());assert first['id']==second['id']
    assert len(second['provenance'])==2
    different=persist(db,{**a,'source_record_id':'second','source_url':'https://remotive.com/remote-jobs/second','description':'An entirely different vacancy requiring Python and analytics. '*5},now())
    assert different['id']!=first['id']
    assert db.scalar(select(func.count()).select_from(Vacancy))==2
    assert db.scalar(select(func.count()).select_from(VacancyProvenance))==3

def test_invalid_records_report_partial_not_fake_success(client,db,seeded,customer):
    run=create(client,db,customer)
    done=execute(client,db,customer,run,lambda _:httpx.Response(200,json={'jobs':[remotive(),{'id':None},remotive(3,url='http://127.0.0.1/job')]}))
    assert result(done)['status']=='PARTIAL' and result(done)['sources'][0]['invalid_count']==2
    assert len(result(done)['matches'])==1

def test_stale_status_is_derived_not_confirmed_closed(client,db,seeded,customer):
    run=create(client,db,customer)
    done=execute(client,db,customer,run,lambda _:httpx.Response(200,json={'jobs':[remotive()]}))
    vacancy=db.scalar(select(Vacancy));vacancy.retrieved_at=now()-timedelta(days=2)
    action=db.get(ActionRun,done['actions'][0]['id']);snapshot=dict(action.result)
    snapshot['matches']=[{**snapshot['matches'][0],'listing':{**snapshot['matches'][0]['listing'],'retrieved_at':vacancy.retrieved_at.isoformat()}}];action.result=snapshot;db.commit()
    assert client.get('/jobs/'+vacancy.id).json()['status']=='STALE'
    assert result(client.get('/finds/workflows/'+run['id'],headers=customer).json())['matches'][0]['listing']['status']=='STALE'
    assert action.result['matches'][0]['listing']['status']=='SOURCE_LISTED'

def test_authorization_and_admin_queued_idempotency(client,db,seeded,customer,admin):
    assert client.get('/jobs').status_code==200
    assert client.get('/finds/sources').status_code==401
    for method,path,body in [('GET','/admin/job-sources',None),('PATCH','/admin/job-sources/remotive',{'enabled':False}),('POST','/admin/job-sources/remotive/acquire',{'idempotency_key':'admin-source-test-123'})]:
        assert client.request(method,path,headers=customer,json=body).status_code==403
    assert client.patch('/admin/job-sources/adzuna',headers=admin,json={'enabled':True}).status_code==409
    assert client.get('/admin/job-sources',headers=admin).json()['sources'][1]['status']=='not_configured'
    body={'idempotency_key':'admin-source-test-123'}
    first=client.post('/admin/job-sources/remotive/test',headers=admin,json=body)
    second=client.post('/admin/job-sources/remotive/test',headers=admin,json=body)
    assert first.status_code==202 and first.json()['workflow_id']==second.json()['workflow_id']
    run=create(client,db,customer)
    assert client.get('/finds/workflows/'+run['id'],headers=admin).status_code==404
    inspect=client.get('/admin/workflows/'+run['id'],headers=admin).json()
    assert 'inputs' not in inspect and all('result' not in a for a in inspect['actions'])

def test_credentials_redacted_from_logs_outcomes_and_admin(client,db,seeded,customer,admin,monkeypatch,caplog):
    configure_adzuna(db,monkeypatch);caplog.set_level(logging.INFO,logger='httpx')
    run=create(client,db,customer,['adzuna'])
    def denied(request):
        assert request.url.params['app_key']=='private-test-key'
        return httpx.Response(403,json={'error':'private-test-key'})
    done=execute(client,db,customer,run,denied)
    response=client.get('/admin/job-sources',headers=admin)
    assert 'private-test-key' not in caplog.text+str(done)+response.text
    assert 'private-test-id' not in caplog.text+str(done)+response.text
    assert result(done)['sources'][0]['error_code']=='ACCESS_DENIED'

def test_expired_lease_recovers_without_repeating_committed_source(client,db,seeded,customer):
    run=create(client,db,customer)
    assert client.post('/finds/workflows/'+run['id']+'/start',headers=customer).status_code==200
    payload=engine.claim(db,run['id']);assert payload
    outcome=engine.execute(payload,lambda:nullcontext(db),httpx.MockTransport(lambda _:httpx.Response(200,json={'jobs':[remotive()]})))
    assert outcome[1] is None
    action=db.get(ActionRun,payload[1]);action.lease_until=now()-timedelta(seconds=1);db.commit();db.expire_all()
    recovered=engine.claim(db,run['id']);assert recovered and recovered[2]!=payload[2]
    second=engine.execute(recovered,lambda:nullcontext(db),httpx.MockTransport(lambda _:pytest.fail('Committed acquisition must survive a lost finish')))
    engine.finish(db,recovered,*second)
    assert db.scalar(select(func.count()).select_from(Vacancy))==1
    assert db.scalar(select(func.count()).select_from(Acquisition))==1
    assert db.get(ExecutionAttempt,payload[3]).status=='INTERRUPTED'
    engine.finish(db,payload,*outcome)
    assert db.get(ActionRun,payload[1]).attempts==2

def test_prepare_selected_real_job_and_private_ownership(client,db,seeded,customer,admin):
    run=create(client,db,customer)
    done=execute(client,db,customer,run,lambda _:httpx.Response(200,json={'jobs':[remotive()]}))
    body={'vacancy_ids':[result(done)['matches'][0]['listing']['id']],'idempotency_key':'prepare-source-test-123'}
    response=client.post('/finds/workflows/'+run['id']+'/prepare',headers=customer,json=body)
    assert response.status_code==201,response.text
    assert response.json()['template_id']=='job-preparation@1' and len(response.json()['actions'])==5
    assert response.json()['inputs']['listings'][0]['title']=='Python Engineer'
    assert client.post('/finds/workflows/'+run['id']+'/prepare',headers=admin,json=body).status_code==404
    assert client.post('/finds/workflows/'+run['id']+'/prepare',headers=customer,json={**body,'vacancy_ids':['not-my-result']}).status_code==404

def test_filter_preferences_and_missing_profile(client,db,seeded,customer):
    run=create(client,db,customer)
    done=execute(client,db,customer,run,lambda _:httpx.Response(200,json={'jobs':[remotive(),remotive(2,title='Designer',description='Creative illustrations for magazines.'),remotive(3,candidate_required_location='United States')]}))
    # Worldwide is an explicit broad geographic preference, not eligibility.
    assert len(result(done)['matches'])==2
    assert 'experience_years' in result(done)['missing_profile']
    assert 'geographic eligibility' in result(done)['method']
