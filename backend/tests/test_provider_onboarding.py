import base64
import copy
import json
import struct
import zlib
from datetime import datetime,timezone
from sqlalchemy import select
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
import pytest
from app.models import User,ProviderService,Audit
from app.provider_models import ProviderRequirement,ProviderApplicationEvent
from app.provider_requirements import Requirements,condition_matches
from app.security import passwords,issue_token

COMMON={'legal_name':'Example Application Business','structure':'Individual','contact_name':'Example Contact','email':'provider@example.com','phone':'6364456776','address':'Test business address Bengaluru','location':'Bengaluru','service_areas':['Bengaluru'],'accuracy':True,'consent':True}
def chunk(name,data):return struct.pack('>I',len(data))+name+data+struct.pack('>I',zlib.crc32(name+data)&0xffffffff)
PNG=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',1,1,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b'\x00\xff\xff\xff'))+chunk(b'IEND',b'')

def defaults(configuration):
    answers={}
    cfg=Requirements.model_validate(configuration)
    for section in cfg.sections:
        for f in section.fields:
            if not condition_matches(f.visible_if,answers):continue
            if f.id=='registration_applicability':answers[f.id]='Not applicable'
            elif f.type=='boolean':answers[f.id]=False
            elif f.required or (f.required_if and condition_matches(f.required_if,answers)):
                answers[f.id]=[f.options[0]] if f.type=='multi_select' else 3 if f.type=='number' else 'Relevant experience and scope for manual review.'
    for d in cfg.declarations:answers[d.id]=True
    return answers

def start(client,headers,category,indexes=(0,)):
    response=client.post('/provider-applications',headers=headers,json={'category_id':category['id'],'service_ids':[category['services'][i]['id'] for i in indexes]})
    assert response.status_code==201,response.text
    return response.json()

def complete(client,headers,app,overrides=None):
    services={str(s['service_id']):defaults({**s['requirements']['configuration'],'checklist':[{'id':'review','label':'Review'}]}) for s in app['services']}
    if overrides:
        for sid,values in overrides.items():services[str(sid)].update(values)
    response=client.put('/provider-applications/'+app['id'],headers=headers,json={'revision':app['revision'],'common':COMMON,'services':services})
    assert response.status_code==200,response.text
    return response.json()

def submit(client,headers,app,ack=False):
    return client.post('/provider-applications/'+app['id']+'/submit',headers=headers,json={'revision':app['revision'],'acknowledge_versions':ack})

def decision(client,admin,app,sid,status='APPROVED',**kw):
    detail=client.get('/admin/provider-applications/'+app['id'],headers=admin).json()
    service=next(s for s in detail['services'] if s['service_id']==sid)
    return client.post(f"/admin/provider-applications/{app['id']}/services/{sid}/review",headers=admin,json={'revision':detail['revision'],'status':status,'reason':'Evidence and service applicability manually reviewed.','checklist':{c['id']:True for c in service['requirements']['configuration']['checklist']},**kw})

def test_initial_templates_use_actual_ids_and_distinct_questions(client,seeded,customer,db):
    categories=client.get('/catalogue').json()
    ids=[s['id'] for c in categories for s in c['services']+[s for sub in c['subcategories'] for s in sub['services']]]
    assert len(ids)==59
    rows=list(db.scalars(select(ProviderRequirement)))
    assert {r.service_id for r in rows}==set(ids)
    for row in rows:Requirements.model_validate(row.configuration)
    resume=client.get(f"/provider-requirements/{categories[0]['services'][0]['id']}",headers=customer).json()
    interview=client.get(f"/provider-requirements/{categories[0]['services'][3]['id']}",headers=customer).json()
    assert 'checklist' not in resume['configuration']
    assert resume['configuration']!=interview['configuration']
    assert all(f['basis']!='LEGAL' for r in rows for s in r.configuration['sections'] for f in s['fields'])

def test_multi_service_draft_submit_approval_and_lead_eligibility(client,seeded,customer,admin):
    category=client.get('/catalogue').json()[0];sids=[s['id'] for s in category['services'][:2]]
    app=start(client,customer,category,(0,1));app=complete(client,customer,app)
    resumed=client.get('/provider-applications/'+app['id'],headers=customer).json()
    assert resumed['common']==COMMON and resumed['services'][0]['answers']==app['services'][0]['answers']
    assert client.get(f'/services/{sids[0]}/providers').status_code==401
    assert client.get(f'/services/{sids[0]}/providers',headers=customer).status_code==403
    response=submit(client,customer,app);assert response.status_code==200,response.text;app=response.json()
    assert client.put('/provider-applications/'+app['id'],headers=customer,json={'revision':app['revision'],'common':COMMON,'services':{}}).status_code==409
    approved=decision(client,admin,app,sids[0]);assert approved.status_code==200,approved.text;app=approved.json()
    applicant_history=client.get('/provider-applications/'+app['id'],headers=customer).json()['history']
    assert all('checklist' not in event['details'] for event in applicant_history)
    assert all('checklist' not in event['details'].get('common_configuration',{}) for event in applicant_history)
    assert any('checklist' in event['details'] for event in app['history'])
    from conftest import activate_test_membership
    activate_test_membership(client,customer)  # Onboarding/approval above did not need membership.
    providers=client.get(f'/services/{sids[0]}/providers',headers=customer).json();assert len(providers)==1
    assert client.get(f'/services/{sids[1]}/providers',headers=customer).json()==[]
    def request(sid):return client.post('/requests',headers=customer,json={'service_id':sid,'requirements':'A test requirement for manual service delivery.','location':'Bengaluru','phone':'6364456776'}).json()['id']
    rid=request(sids[0]);pid=providers[0]['id']
    assert client.post(f'/admin/requests/{request(sids[1])}/provider',headers=admin,json={'provider_id':pid}).status_code==409
    assert client.post(f'/admin/requests/{rid}/provider',headers=admin,json={'provider_id':pid}).status_code==201
    assert len(client.get('/provider-leads',headers=customer).json())==1
    assert decision(client,admin,app,sids[0],'SUSPENDED').status_code==200
    assert client.get(f'/services/{sids[0]}/providers',headers=customer).json()==[]
    assert client.get('/provider-leads',headers=customer).json()==[]
    assert client.post(f'/admin/requests/{request(sids[0])}/provider',headers=admin,json={'provider_id':pid}).status_code==409

def test_conditional_validation_document_ownership_and_binary_download(client,seeded,customer,admin,db):
    app=start(client,customer,client.get('/catalogue').json()[1]);sid=app['services'][0]['service_id']
    app=complete(client,customer,app,{sid:{'represents_owners':True}})
    invalid=submit(client,customer,app);assert invalid.status_code==422
    assert any(e['field'].endswith('authority_document') for e in invalid.json()['detail']['errors'])
    upload={'service_id':sid,'field_id':'authority_document','filename':'../../unsafe.png','media_type':'image/png','content_base64':base64.b64encode(PNG).decode()}
    response=client.post(f"/provider-applications/{app['id']}/documents",headers=customer,json=upload)
    assert response.status_code==201,response.text;document=response.json()
    assert '/' not in document['filename'] and document['filename'].endswith('.png')
    url=f"/provider-applications/{app['id']}/documents/{document['id']}"
    assert client.get(url,headers=customer).content==PNG
    assert client.get(url,headers=admin).content==PNG
    stranger=User(name='Other applicant',email='other-provider@example.com',password_hash=passwords.hash('test-password-123'));db.add(stranger);db.commit()
    other={'Authorization':'Bearer '+issue_token(db,stranger)}
    assert client.get(url,headers=other).status_code==404
    assert client.get(url).status_code==401
    assert client.get('/provider-applications/'+app['id'],headers=other).status_code==404
    bad={**upload,'content_base64':base64.b64encode(b'<script>unsafe</script>').decode()}
    assert client.post(f"/provider-applications/{app['id']}/documents",headers=customer,json=bad).status_code==422
    app=complete(client,customer,app,{sid:{'represents_owners':True,'authority_document':document['id']}})
    assert submit(client,customer,app).status_code==200
    assert all('content' not in d for d in client.get('/provider-applications/'+app['id'],headers=customer).json()['documents'])

def test_config_validation_version_history_and_explicit_migration(client,seeded,customer,admin,db):
    app=start(client,customer,client.get('/catalogue').json()[0]);app=complete(client,customer,app);sid=app['services'][0]['service_id'];old=app['services'][0]['requirement_id']
    assert client.post(f'/admin/provider-requirements/{sid}/drafts',headers=customer).status_code==403
    draft=client.post(f'/admin/provider-requirements/{sid}/drafts',headers=admin).json();cfg=copy.deepcopy(draft['configuration'])
    invalid=copy.deepcopy(cfg);invalid['sections'][0]['fields'][0]['visible_if']={'field':'not_a_previous_field','value':True}
    payload={'configuration':invalid,'change_note':'Test invalid draft then correction','effective_at':datetime.now(timezone.utc).isoformat()}
    assert client.put(f"/admin/provider-requirements/versions/{draft['id']}",headers=admin,json=payload).status_code==200
    assert client.post(f"/admin/provider-requirements/versions/{draft['id']}/publish",headers=admin).status_code==422
    cfg['sections'][0]['fields'].append({'id':'new_evidence','label':'New review explanation','type':'text','required':True,'min_length':10})
    payload['configuration']=cfg
    assert client.put(f"/admin/provider-requirements/versions/{draft['id']}",headers=admin,json=payload).status_code==200
    assert client.post(f"/admin/provider-requirements/versions/{draft['id']}/publish",headers=admin).status_code==200
    assert client.put(f"/admin/provider-requirements/versions/{draft['id']}",headers=admin,json=payload).status_code==409
    assert client.get('/provider-applications/'+app['id'],headers=customer).json()['services'][0]['requirement_id']==old
    assert submit(client,customer,app).status_code==409
    response=submit(client,customer,app,True);assert response.status_code==200;app=response.json()
    assert decision(client,admin,app,sid,'CHANGES_REQUESTED',require_current_version=True).status_code==200
    newer=client.post(f'/admin/provider-requirements/{sid}/drafts',headers=admin).json()
    assert client.post(f"/admin/provider-requirements/versions/{newer['id']}/publish",headers=admin).status_code==200
    assert client.post(f"/admin/provider-requirements/versions/{draft['id']}/retire",headers=admin).status_code==409
    app=client.get('/provider-applications/'+app['id'],headers=customer).json()
    assert app['services'][0]['required_requirements']['id']==draft['id']
    assert app['services'][0]['latest_requirements']['id']==newer['id']
    assert submit(client,customer,app,True).status_code==409
    response=client.post(f"/provider-applications/{app['id']}/services/{sid}/version",headers=customer,json={'revision':app['revision'],'requirement_id':draft['id'],'acknowledge':True})
    assert response.status_code==200,response.text;app=response.json()
    assert app['services'][0]['requirement_id']==draft['id']
    app=complete(client,customer,app);assert submit(client,customer,app,True).status_code==200
    history=list(db.scalars(select(ProviderApplicationEvent).where(ProviderApplicationEvent.application_id==app['id'],ProviderApplicationEvent.kind=='SUBMITTED').order_by(ProviderApplicationEvent.id)))
    assert len(history)==2 and history[0].details['services'][0]['requirement_id']==old
    assert client.get('/admin/provider-applications?requirement_id='+str(draft['id']),headers=admin).status_code==200

def test_tampering_review_checklist_and_stale_writes_are_rejected(client,seeded,customer,admin):
    category=client.get('/catalogue').json()[0];app=start(client,customer,category);sid=app['services'][0]['service_id']
    invalid={'revision':app['revision'],'common':{'unknown_secret':'do-not-echo-this-value'},'services':{str(sid):{'experience':'wrong'}}}
    response=client.put('/provider-applications/'+app['id'],headers=customer,json=invalid)
    assert response.status_code==422 and 'do-not-echo-this-value' not in response.text
    app=complete(client,customer,app)
    assert client.put('/provider-applications/'+app['id'],headers=customer,json={**invalid,'revision':1}).status_code==409
    app=submit(client,customer,app).json()
    assert client.post(f"/admin/provider-applications/{app['id']}/services/{sid}/review",headers=customer,json={'revision':app['revision'],'status':'APPROVED','reason':'Unauthorized review attempt'}).status_code==403
    response=client.post(f"/admin/provider-applications/{app['id']}/services/{sid}/review",headers=admin,json={'revision':app['revision'],'status':'APPROVED','reason':'Attempt without completing manual verification','checklist':{}})
    assert response.status_code==422
    from conftest import activate_test_membership
    activate_test_membership(client,customer)
    assert client.get(f'/services/{sid}/providers',headers=customer).json()==[]

def test_not_applicable_requires_permission_and_a_reason(client,seeded,customer):
    category=client.get('/catalogue').json()[4];app=start(client,customer,category);sid=app['services'][0]['service_id']
    app=complete(client,customer,app,{sid:{'qualification_evidence':{'not_applicable':True,'reason':'Evidence not relevant to the explained service scope.'}}})
    assert submit(client,customer,app).status_code==200
    bad=start(client,customer,category)
    response=client.put('/provider-applications/'+bad['id'],headers=customer,json={'revision':bad['revision'],'common':COMMON,'services':{str(sid):{'qualification_evidence':{'not_applicable':True,'reason':'no'}}}})
    assert response.status_code==422

def test_historical_configuration_and_submission_guards_are_enforced_in_database(client,seeded,customer,db):
    app=complete(client,customer,start(client,customer,client.get('/catalogue').json()[0]))
    assert submit(client,customer,app).status_code==200
    config_id=app['services'][0]['requirement_id']
    with pytest.raises(DBAPIError):
        with db.begin_nested():db.execute(text("UPDATE provider_requirements SET configuration='{}' WHERE id=:id"),{'id':config_id})
    with pytest.raises(DBAPIError):
        with db.begin_nested():db.execute(text('DELETE FROM provider_application_events WHERE application_id=:id'),{'id':app['id']})
    assert db.get(ProviderRequirement,config_id).configuration['sections']

def test_hidden_answers_and_oversized_or_unsafe_json_are_not_trusted(client,seeded,customer,admin):
    app=start(client,customer,client.get('/catalogue').json()[1]);sid=app['services'][0]['service_id']
    values=defaults({**app['services'][0]['requirements']['configuration'],'checklist':[{'id':'review','label':'Review'}]})
    values.update(represents_owners=False,authority_document='another-applicant-document')
    response=client.put('/provider-applications/'+app['id'],headers=customer,json={'revision':app['revision'],'common':COMMON,'services':{str(sid):values}})
    assert response.status_code==422 and 'authorized document' in response.text
    response=client.post('/admin/provider-requirements/validate',headers={**admin,'Content-Type':'application/json'},content='{"sections":NaN}')
    assert response.status_code==422
    response=client.post('/admin/provider-requirements/validate',headers={**admin,'Content-Type':'application/json'},content='{"x":'+'['*30+'0'+']'*30+'}')
    assert response.status_code==422
    assert client.post('/provider-applications',headers=customer,content='x'*128001).status_code==413

def test_future_configurations_do_not_replace_effective_requirements(client,seeded,customer,admin):
    service=client.get('/catalogue').json()[0]['services'][0]
    old=client.get(f"/provider-requirements/{service['id']}",headers=customer).json()
    draft=client.post(f"/admin/provider-requirements/{service['id']}/drafts",headers=admin).json()
    payload={'configuration':draft['configuration'],'change_note':'Future version for staged application rollout','effective_at':'2099-01-01T00:00:00Z'}
    assert client.put(f"/admin/provider-requirements/versions/{draft['id']}",headers=admin,json=payload).status_code==200
    assert client.post(f"/admin/provider-requirements/versions/{draft['id']}/publish",headers=admin).status_code==200
    assert client.get(f"/provider-requirements/{service['id']}",headers=customer).json()['id']==old['id']
    assert client.post(f"/admin/provider-requirements/versions/{old['id']}/retire",headers=admin).status_code==409
