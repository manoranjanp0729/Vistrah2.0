from datetime import timedelta
from sqlalchemy import select, func, text
import pytest
from app import workflow_engine as engine
from app import action_registry as registry
from app.models import Service, User, now
from app.security import passwords, issue_token
from app.workflow_models import WorkflowRun, ActionRun, ExecutionAttempt, WorkflowApproval, WorkflowEvent, WorkflowEvidence

def inputs():
    return {'candidate_name':'Test Candidate','resume_text':'Software engineer with Python and SQL experience on internal tools.','target_titles':['Software Engineer'],'skills':['Python','SQL'],'experience_years':0,'locations':['Bengaluru'],'arrangements':['REMOTE','HYBRID'],'salary_expectation':900000,'search_preferences':'Direct employers only.','source_permission':True,'listings':[{'title':'Software Engineer','company':'Fixture Employer','location':'Bengaluru','arrangement':'REMOTE','source_url':'https://jobs.example.com/engineer?utm_source=test','description':'Deterministic test vacancy requiring Python and SQL for internal tools.','salary_min':800000,'salary_max':1200000}]}

def request(client,db,customer):
    from conftest import activate_test_membership
    activate_test_membership(client,customer)
    service=db.scalar(select(Service).where(Service.slug=='job-search-assistance'))
    result=client.post('/requests',headers=customer,json={'service_id':service.id,'requirements':'Please help me prepare job applications for engineering roles.','location':'Bengaluru','phone':'6364456776'})
    assert result.status_code==201,result.text
    return result.json()['id']

def create(client,db,customer,key='workflow-test-123',values=None):
    result=client.post('/finds/workflows',headers=customer,json={'request_id':request(client,db,customer),'idempotency_key':key,'inputs':inputs() if values is None else values})
    assert result.status_code==201,result.text
    return result.json()

def step(db):
    payload=engine.claim(db)
    if payload:
        engine.finish(db,payload,*engine.execute(payload))
    return payload

def through_ranking(client,db,customer):
    run=create(client,db,customer)
    assert run['status']=='READY'
    assert client.post(f'/finds/workflows/{run["id"]}/start',headers=customer).status_code==200
    for _ in range(3): assert step(db)
    run=client.get(f'/finds/workflows/{run["id"]}',headers=customer).json()
    assert run['status']=='WAITING_APPROVAL'
    assert run['completed_actions']==3
    return run

def test_creation_discovery_prerequisites_and_missing_inputs(client,db,seeded,customer):
    run=create(client,db,customer,values={})
    assert run['status']=='DRAFT' and 'listings' in run['missing_inputs']
    assert len(run['actions'])==5 and run['actions'][1]['prerequisites']==[run['actions'][0]['id']]
    assert client.post(f'/finds/workflows/{run["id"]}/start',headers=customer).status_code==409
    updated=client.put(f'/finds/workflows/{run["id"]}/inputs',headers=customer,json=inputs())
    assert updated.status_code==200 and updated.json()['status']=='READY'
    assert updated.json()['inputs']['experience_years']==0
    registry_response=client.get('/finds/actions',headers=customer).json()
    assert next(a for a in registry_response if a['id']=='jobs.discover@1')['availability']=='AWAITING_CONFIGURATION'
    assert not next(a for a in registry_response if a['id']=='jobs.submit@1')['executable']

@pytest.mark.parametrize('update',[{'experience_years':-1},{'skills':['']},{'arrangements':['ANY']},{'unexpected':'field'},{'source_permission':'invalid'}])
def test_invalid_inputs(client,db,seeded,customer,update):
    request_id=request(client,db,customer)
    response=client.post('/finds/workflows',headers=customer,json={'request_id':request_id,'idempotency_key':'invalid-inputs-123','inputs':inputs()|update})
    assert response.status_code==422
    assert db.scalar(select(func.count()).select_from(WorkflowRun))==0

@pytest.mark.parametrize('url',['file:///etc/passwd','http://127.0.0.1/a','http://localhost/a','https://user:password@example.com/a','javascript:alert(1)','http://10.0.0.1/a'])
def test_unsafe_source_urls(client,db,seeded,customer,url):
    values=inputs();values['listings'][0]['source_url']=url
    response=client.post('/finds/workflows',headers=customer,json={'request_id':request(client,db,customer),'idempotency_key':'bad-source-url-123','inputs':values})
    assert response.status_code==422

def test_ownership_role_and_private_documents(client,db,seeded,customer,admin):
    run=create(client,db,customer)
    doc=client.post('/finds/documents',headers=customer,json={'filename':'resume.txt','text':inputs()['resume_text']}).json()
    other=User(name='Other Customer',email='other-finds@example.com',password_hash=passwords.hash('other-customer-password'))
    db.add(other);db.commit();other_headers={'Authorization':'Bearer '+issue_token(db,other)}
    assert client.get(f'/finds/workflows/{run["id"]}',headers=other_headers).status_code==404
    assert client.get(f'/finds/documents/{doc["id"]}',headers=other_headers).status_code==404
    assert client.get(f'/finds/documents/{doc["id"]}',headers=admin).status_code==404
    assert client.get('/admin/workflows',headers=customer).status_code==403
    assert client.get('/finds/actions').status_code==401
    assert client.post(f'/finds/workflows/{run["id"]}/start',headers=admin).status_code==404
    detail=client.get(f'/admin/workflows/{run["id"]}',headers=admin).json()
    assert 'inputs' not in detail and 'applications' not in detail
    assert all('result' not in a and 'evidence' not in a for a in detail['actions'])
    assert inputs()['resume_text'] not in str(detail)

def test_upload_validation_and_snapshot(client,db,seeded,customer):
    for filename,text_content in [('resume.pdf',inputs()['resume_text']),('../resume.txt',inputs()['resume_text']),('resume.txt','binary\x00'+'a'*40)]:
        assert client.post('/finds/documents',headers=customer,json={'filename':filename,'text':text_content}).status_code==422
    doc=client.post('/finds/documents',headers=customer,json={'filename':'resume.txt','text':inputs()['resume_text']})
    assert doc.status_code==201
    run=create(client,db,customer,values=inputs()|{'resume_text':'','document_id':doc.json()['id']})
    assert run['inputs']['resume_text']==inputs()['resume_text'] and run['status']=='READY'

def test_untrusted_text_rejects_binary_and_invalid_unicode_without_echo(client,db,seeded,customer):
    import json
    from app.workflow_models import WorkflowDocument
    for bad_text in ['Private resume content: '+'a'*40+'\x00','Private resume content: '+'a'*40+'\ud800']:
        response=client.post('/finds/documents',headers=customer,content=json.dumps({'filename':'resume.txt','text':bad_text}))
        assert response.status_code==422
        assert 'Private resume content' not in response.text and 'input' not in response.json()['detail'][0]
    assert db.scalar(select(func.count()).select_from(WorkflowDocument))==0
    body={'request_id':request(client,db,customer),'idempotency_key':'binary-profile-123','inputs':inputs()|{'resume_text':'Private profile content'+'a'*40+'\x00'}}
    response=client.post('/finds/workflows',headers=customer,json=body)
    assert response.status_code==422 and 'Private profile content' not in response.text

def test_idempotency_and_duplicate_start_claim(client,db,seeded,customer):
    rid=request(client,db,customer);body={'request_id':rid,'idempotency_key':'repeat-workflow-123','inputs':inputs()}
    first=client.post('/finds/workflows',headers=customer,json=body).json()
    second=client.post('/finds/workflows',headers=customer,json=body).json()
    assert first['id']==second['id']
    assert client.post('/finds/workflows',headers=customer,json=body|{'inputs':inputs()|{'candidate_name':'Different Person'}}).status_code==409
    assert client.post(f'/finds/workflows/{first["id"]}/start',headers=customer).status_code==200
    assert client.post(f'/finds/workflows/{first["id"]}/start',headers=customer).status_code==409
    claim=engine.claim(db);assert claim
    assert engine.claim(db) is None
    assert db.scalar(select(func.count()).select_from(ExecutionAttempt))==1
    engine.finish(db,claim,*engine.execute(claim))
    engine.finish(db,claim,*engine.execute(claim))
    assert db.scalar(select(func.count()).select_from(WorkflowEvidence))==1

def test_full_job_workflow_results_evidence_tracking_and_approval(client,db,seeded,customer,admin):
    run=through_ranking(client,db,customer)
    draft=run['actions'][3];approval=draft['approval']
    assert draft['attempts']==0 and approval['scope']['authorization'].startswith('Create internal')
    assert client.post(f'/finds/workflows/{run["id"]}/approvals/{approval["id"]}',headers=admin,json={'decision':'APPROVED'}).status_code==404
    assert client.put(f'/finds/workflows/{run["id"]}/inputs',headers=customer,json=inputs()).status_code==409
    url=f'/finds/workflows/{run["id"]}/approvals/{approval["id"]}'
    assert client.post(url,headers=customer,json={'decision':'APPROVED'}).status_code==200
    assert client.post(url,headers=customer,json={'decision':'APPROVED'}).status_code==200
    assert client.post(url,headers=customer,json={'decision':'REJECTED'}).status_code==409
    assert step(db) and step(db)
    run=client.get(f'/finds/workflows/{run["id"]}',headers=customer).json()
    assert run['status']=='COMPLETED' and run['completed_actions']==5
    match=run['actions'][2]['result']['matches'][0]
    assert match['score']==100 and match['matched_skills']==['Python','SQL']
    assert len(run['actions'][3]['result']['artifacts'])==2
    assert inputs()['resume_text'] in run['actions'][3]['result']['artifacts'][0]['text']
    assert run['actions'][0]['evidence'][0]['discovered_at']
    normalized_url=match['listing']['source_url']
    track=client.put(f'/finds/workflows/{run["id"]}/applications',headers=customer,json={'source_url':normalized_url,'status':'APPLIED'})
    assert track.status_code==200 and track.json()['applications'][0]['status']=='APPLIED'
    assert client.put(f'/finds/workflows/{run["id"]}/applications',headers=customer,json={'source_url':'https://example.com/other','status':'APPLIED'}).status_code==409
    assert engine.claim(db) is None
    assert db.scalar(select(func.count()).select_from(ExecutionAttempt))==5

def test_rejection_partial_completion(client,db,seeded,customer):
    run=through_ranking(client,db,customer)
    approval=run['actions'][3]['approval']
    response=client.post(f'/finds/workflows/{run["id"]}/approvals/{approval["id"]}',headers=customer,json={'decision':'REJECTED'}).json()
    assert response['status']=='PARTIALLY_COMPLETED'
    assert response['actions'][3]['status']=='REJECTED' and response['actions'][4]['status']=='BLOCKED'
    assert not response['actions'][3]['retry_eligible'] and engine.claim(db) is None

def test_failed_action_retry_preserves_completed_work(client,db,seeded,customer,monkeypatch):
    run=create(client,db,customer);client.post(f'/finds/workflows/{run["id"]}/start',headers=customer)
    assert step(db)
    original=registry.HANDLERS['normalize']
    def fail(*args): raise RuntimeError('Sensitive resume content must never be logged')
    monkeypatch.setitem(registry.HANDLERS,'normalize',fail)
    assert step(db)
    failed=client.get(f'/finds/workflows/{run["id"]}',headers=customer).json()
    assert failed['status']=='PARTIALLY_COMPLETED' and failed['actions'][1]['error']=='HANDLER_FAILED'
    assert 'Sensitive' not in str(failed['events'])
    monkeypatch.setitem(registry.HANDLERS,'normalize',original)
    assert client.post(f'/finds/workflows/{run["id"]}/actions/{failed["actions"][1]["id"]}/retry',headers=customer).status_code==200
    assert step(db) and step(db)
    updated=client.get(f'/finds/workflows/{run["id"]}',headers=customer).json()
    assert updated['status']=='WAITING_APPROVAL'
    assert updated['actions'][0]['attempts']==1 and updated['actions'][1]['attempts']==2
    assert client.post(f'/finds/workflows/{run["id"]}/actions/{updated["actions"][0]["id"]}/retry',headers=customer).status_code==409

def test_interruption_recovery_stale_result_and_cancellation(client,db,seeded,customer):
    run=create(client,db,customer);client.post(f'/finds/workflows/{run["id"]}/start',headers=customer)
    old=engine.claim(db)
    action=db.get(ActionRun,old[1]);action.lease_until=now()-timedelta(seconds=1);db.commit()
    new=engine.claim(db);assert new and new[2]!=old[2]
    engine.finish(db,old,*engine.execute(old))
    assert db.get(ActionRun,old[1]).status=='RUNNING'
    engine.finish(db,new,*engine.execute(new))
    attempt=db.scalar(select(ExecutionAttempt).where(ExecutionAttempt.action_id==old[1],ExecutionAttempt.number==1))
    assert attempt.status=='INTERRUPTED'
    pending=engine.claim(db);assert pending
    response=client.post(f'/finds/workflows/{run["id"]}/cancel',headers=customer)
    assert response.status_code==200 and response.json()['status']=='CANCELLED'
    engine.finish(db,pending,*engine.execute(pending))
    assert db.get(WorkflowRun,run['id']).status=='CANCELLED'
    assert engine.claim(db) is None
    assert client.post(f'/finds/workflows/{run["id"]}/cancel',headers=customer).status_code==409

def test_timeout_and_retry_limit(client,db,seeded,customer):
    run=create(client,db,customer);client.post(f'/finds/workflows/{run["id"]}/start',headers=customer)
    for attempt in range(3):
        payload=engine.claim(db);assert payload
        result,error,elapsed=engine.execute(payload)
        engine.finish(db,payload,result,error,31)
        response=client.get(f'/finds/workflows/{run["id"]}',headers=customer).json()
        assert response['status']=='FAILED' and response['actions'][0]['error']=='TIMEOUT'
        retry=client.post(f'/finds/workflows/{run["id"]}/actions/{payload[1]}/retry',headers=customer)
        assert retry.status_code==(200 if attempt<2 else 409)

def test_cancelled_failures_are_not_presented_as_retryable(client,db,seeded,customer,admin):
    run=create(client,db,customer);client.post(f'/finds/workflows/{run["id"]}/start',headers=customer)
    payload=engine.claim(db);engine.finish(db,payload,None,'HANDLER_FAILED',0)
    failed=client.get(f'/finds/workflows/{run["id"]}',headers=customer).json()
    assert failed['retry_eligible'] and failed['actions'][0]['retry_eligible']
    cancelled=client.post(f'/finds/workflows/{run["id"]}/cancel',headers=customer).json()
    assert not cancelled['retry_eligible'] and not cancelled['actions'][0]['retry_eligible']
    operations=client.get(f'/admin/workflows/{run["id"]}',headers=admin).json()
    assert not operations['retry_eligible'] and not operations['actions'][0]['retry_eligible']
    assert client.post(f'/finds/workflows/{run["id"]}/actions/{payload[1]}/retry',headers=customer).status_code==409

def test_integration_unavailable_fails_closed(client,db,seeded,customer,monkeypatch):
    run=create(client,db,customer);client.post(f'/finds/workflows/{run["id"]}/start',headers=customer)
    monkeypatch.setitem(registry.REGISTRY,'jobs.import@1',registry.REGISTRY['jobs.import@1']|{'executable':False})
    assert engine.claim(db) is None
    response=client.get(f'/finds/workflows/{run["id"]}',headers=customer).json()
    assert response['status']=='FAILED' and response['actions'][0]['error']=='INTEGRATION_UNAVAILABLE'
    assert response['actions'][0]['result'] is None

def test_normalization_dedup_and_unknown_salary():
    values=inputs();job=values['listings'][0]
    normalized=registry.normalize(values,{'jobs.import@1':{'listings':[job,job|{'source_url':'https://jobs.example.com/engineer'}]}})
    assert len(normalized['listings'])==1 and normalized['removed_duplicates']==1
    job=normalized['listings'][0]|{'salary_max':None}
    result=registry.rank(values,{'jobs.normalize@1':{'listings':[job]}})
    assert result['matches'][0]['score']==90 and 'unknown' in result['matches'][0]['explanation'][4]

def test_event_history_append_only(client,db,seeded,customer):
    run=create(client,db,customer)
    from sqlalchemy.exc import DatabaseError
    with pytest.raises(DatabaseError):
        with db.begin_nested():
            db.execute(text('UPDATE workflow_events SET kind=:kind WHERE workflow_id=:id'),{'kind':'EDITED','id':run['id']})
    assert db.scalar(select(WorkflowEvent.kind).where(WorkflowEvent.workflow_id==run['id']))=='CREATED'

def test_waiting_approvals_do_not_starve_new_work(client,db,seeded,customer):
    first=through_ranking(client,db,customer)
    # A sizeable approval backlog must not hide eligible work behind a page limit.
    for index in range(25):
        clone=WorkflowRun(id=engine.uid(),user_id=db.get(WorkflowRun,first['id']).user_id,request_id=first['request_id'],template_id=first['template']['id'],idempotency_key=f'approval-backlog-{index}',status='WAITING_APPROVAL',inputs=inputs(),input_hash=engine.digest(inputs()))
        db.add(clone)
    db.commit()
    second=create(client,db,customer,key='new-queued-work-123')
    assert client.post(f'/finds/workflows/{second["id"]}/start',headers=customer).status_code==200
    payload=engine.claim(db)
    assert payload and payload[0]==second['id']

def test_request_size_and_admin_retry_limits(client,db,seeded,customer,admin):
    assert client.post('/finds/documents',headers=customer,content=b' '*128001).status_code==413
    run=create(client,db,customer)
    assert client.post(f'/admin/workflows/{run["id"]}/actions/{run["actions"][0]["id"]}/retry',headers=admin).status_code==409
    assert client.get('/admin/workflows?status=UNKNOWN',headers=admin).status_code==422

def test_engine_accepts_a_registered_non_job_input_contract(client,db,seeded,customer,monkeypatch):
    from pydantic import BaseModel, Field, ConfigDict
    from app.workflow_schemas import WorkflowCreate
    class InternalInput(BaseModel):
        model_config=ConfigDict(extra='forbid')
        topic: str=Field(min_length=3,max_length=100)
    class InternalResult(BaseModel):
        summary: str
    monkeypatch.setitem(registry.INPUT_MODELS,'test_internal',InternalInput)
    monkeypatch.setitem(registry.RESULT_MODELS,'test_internal',InternalResult)
    spec=registry.definition('test.internal','Test internal preparation','Summarize the supplied topic.','test_internal',required=('topic',))
    spec['input_schema']=InternalInput.model_json_schema();spec['result_schema']=InternalResult.model_json_schema();spec['evidence_requirements']=[]
    monkeypatch.setitem(registry.REGISTRY,spec['id'],spec)
    monkeypatch.setitem(registry.HANDLERS,'test_internal',lambda values,deps:{'summary':values['topic'].upper()})
    template={'id':'test-internal@1','name':'Test internal template','categories':['jobs-careers'],'actions':[spec['id']]}
    monkeypatch.setitem(registry.TEMPLATES,template['id'],template)
    request_id=request(client,db,customer)
    user=db.scalar(select(User).where(User.email=='customer@example.com'))
    data=WorkflowCreate(request_id=request_id,template_id=template['id'],idempotency_key='generic-contract-123')
    run=engine.create(db,user,data,{'topic':'Internal preparation'})
    assert run.status=='READY'
    engine.start(db,run,user);assert step(db)
    assert run.status=='COMPLETED'
    assert engine.actions_for(db,run)[0].result=={'summary':'INTERNAL PREPARATION'}

def test_closed_and_unsupported_requests(client,db,seeded,customer,admin):
    rid=request(client,db,customer)
    assert client.patch(f'/admin/requests/{rid}',headers=admin,json={'status':'CANCELLED'}).status_code==200
    assert client.post('/finds/workflows',headers=customer,json={'request_id':rid,'idempotency_key':'closed-request-123','inputs':inputs()}).status_code==409
    service=db.scalar(select(Service).where(Service.slug=='property-search'))
    response=client.post('/requests',headers=customer,json={'service_id':service.id,'requirements':'Help find a home with the supplied requirements.','location':'Bengaluru','phone':'6364456776'})
    assert client.post('/finds/workflows',headers=customer,json={'request_id':response.json()['id'],'idempotency_key':'unsupported-request-123','inputs':inputs()}).status_code==409
