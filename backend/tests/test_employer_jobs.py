from datetime import timedelta
import pytest
from sqlalchemy import select
from app.models import User, Provider, Audit
from app.security import passwords, issue_token
from app.employer_job_models import EmployerJob
from app.employer_job_routes import today

DATA={'title':'Project Engineer','description':'Coordinate construction projects and review site plans with our engineering team.','location':'Bengaluru','arrangement':'ONSITE','employment_type':'FULL_TIME','salary_text':'Salary discussed at interview','application_url':'https://employer.example.com/careers/engineer','deadline':None}

@pytest.fixture
def employer(db,client):
    user=User(name='Employer',email='employer@example.com',password_hash=passwords.hash('fixture-only-password'),seller_enabled=True)
    other=User(name='Other employer',email='other-employer@example.com',password_hash=passwords.hash('fixture-only-password'),seller_enabled=True)
    db.add_all([user,other]); db.flush()
    provider=Provider(owner_user_id=user.id,slug='synthetic-employer',name='Employer',company='Synthetic Employer',email='employer@example.com',phone='9000000000',address='Test address',location='Bengaluru',provenance='Synthetic disposable test fixture',verification_status='VERIFIED',active=True)
    db.add(provider); db.commit()
    headers={'Authorization':'Bearer '+issue_token(db,user)}
    payment=client.post('/membership/subscriptions/checkout',headers=headers,json={'plan_key':'BASIC','billing_period':'MONTHLY','idempotency_key':'employer-membership-fixture'}).json()
    assert client.post('/payments/'+payment['id']+'/simulate',headers=headers,json={'outcome':'SUCCEEDED'}).status_code==200
    return {'provider':provider,'user':user,'headers':headers,'other':{'Authorization':'Bearer '+issue_token(db,other)}}

def create(client,employer,data=None):
    path=f'/seller/businesses/{employer["provider"].id}/jobs'
    response=client.post(path,headers=employer['headers'],json=data or DATA)
    assert response.status_code==201,response.text
    return path,response.json()

def submit(client,employer,path,row):
    response=client.post(path+'/'+row['id']+'/submit',headers=employer['headers'],json={'revision':row['revision']})
    assert response.status_code==200,response.text
    return response.json()

def review(client,admin,row,status='APPROVED'):
    return client.post('/admin/employer-jobs/'+row['id']+'/review',headers=admin,json={'revision':row['revision'],'status':status,'reason':'Independent review of employer and job details.'})

def test_private_drafts_ownership_and_roles(client,employer,customer,admin):
    path,row=create(client,employer)
    assert client.get('/employer-jobs').json()['total']==0
    assert client.get('/employer-jobs/'+row['id']).status_code==404
    assert client.get(path,headers=employer['other']).status_code==404
    assert client.get(path).status_code==401
    assert client.get(path,headers=customer).status_code==403
    assert client.get('/admin/employer-jobs',headers=employer['headers']).status_code==403
    queue=client.get('/admin/employer-jobs?status=DRAFT',headers=admin)
    assert queue.status_code==200 and queue.json()['total']==1
    assert 'no-store' in queue.headers['cache-control']

def test_approval_only_publishes_current_submitted_revision(client,employer,admin,db):
    path,row=create(client,employer)
    assert review(client,admin,row).status_code==409
    submitted=submit(client,employer,path,row)
    assert review(client,admin,row).status_code==409
    assert client.get('/employer-jobs').json()['total']==0
    approved=review(client,admin,submitted)
    assert approved.status_code==200,approved.text
    public=client.get('/employer-jobs?q=Engineer').json()
    assert public['total']==1 and public['items'][0]['employer']=='Synthetic Employer'
    assert not {'actor_id','reviewer_id','review_note','revision','provider_id'} & public['items'][0].keys()
    assert client.get('/employer-jobs?q=%').json()['total']==0
    assert client.get('/employer-jobs/'+row['id']).status_code==200
    assert client.get('/jobs').json()['total']==0
    assert db.scalar(select(Audit.id).where(Audit.action=='EMPLOYER_JOB_APPROVED')) is not None
    assert client.patch(path+'/'+row['id'],headers=employer['headers'],json={**DATA,'revision':approved.json()['revision']}).status_code==409
    closed=client.post(path+'/'+row['id']+'/close',headers=employer['headers'],json={'revision':approved.json()['revision']})
    assert closed.status_code==200
    assert client.get('/employer-jobs').json()['total']==0
    assert client.get('/employer-jobs/'+row['id']).status_code==404

def test_self_review_is_denied(client,employer,db):
    employer['user'].role='ADMIN'; db.commit()
    path,row=create(client,employer); submitted=submit(client,employer,path,row)
    assert review(client,employer['headers'],submitted).status_code==403

def test_rejection_edit_and_resubmit_require_fresh_review(client,employer,admin):
    path,row=create(client,employer); row=submit(client,employer,path,row)
    rejection=review(client,admin,row,'REJECTED'); assert rejection.status_code==200
    row=rejection.json()
    assert client.get('/employer-jobs').json()['total']==0
    assert client.post(path+'/'+row['id']+'/submit',headers=employer['headers'],json={'revision':row['revision']}).status_code==409
    edited=client.patch(path+'/'+row['id'],headers=employer['headers'],json={**DATA,'title':'Updated Engineer','revision':row['revision']})
    assert edited.status_code==200 and edited.json()['status']=='DRAFT'
    row=submit(client,employer,path,edited.json()); assert review(client,admin,row).status_code==200

def test_expired_or_unverified_or_transferred_employer_jobs_are_hidden(client,employer,admin,db):
    path,row=create(client,employer); row=submit(client,employer,path,row); assert review(client,admin,row).status_code==200
    employer['provider'].active=False; db.commit(); assert client.get('/employer-jobs').json()['total']==0
    employer['provider'].active=True; employer['provider'].verification_status='PENDING'; db.commit(); assert client.get('/employer-jobs').json()['total']==0
    employer['provider'].verification_status='VERIFIED'; employer['provider'].owner_user_id=None; db.commit(); assert client.get('/employer-jobs').json()['total']==0
    employer['provider'].owner_user_id=employer['user'].id; job=db.get(EmployerJob,row['id']);job.deadline=today()-timedelta(days=1);db.commit()
    assert client.get('/employer-jobs').json()['total']==0

def test_submission_checks_business_and_deadline(client,employer,db):
    path,row=create(client,employer,{**DATA,'deadline':str(today()-timedelta(days=1))})
    assert client.post(path+'/'+row['id']+'/submit',headers=employer['headers'],json={'revision':row['revision']}).status_code==409
    employer['provider'].active=False; db.commit()
    path,row=create(client,employer)
    assert client.post(path+'/'+row['id']+'/submit',headers=employer['headers'],json={'revision':row['revision']}).status_code==409

@pytest.mark.parametrize('link',['javascript:alert(1)','http://example.com/job','https://localhost/job','https://user:password@example.com/job','https://127.0.0.1/job'])
def test_application_links_and_server_fields_are_validated(client,employer,link):
    path=f'/seller/businesses/{employer["provider"].id}/jobs'
    assert client.post(path,headers=employer['headers'],json={**DATA,'application_url':link}).status_code==422
    assert client.post(path,headers=employer['headers'],json={**DATA,'status':'APPROVED'}).status_code==422
