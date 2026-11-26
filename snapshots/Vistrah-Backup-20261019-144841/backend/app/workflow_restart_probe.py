"""QA-only committed lease/restart verification. Never resets existing records."""
import os
import sys
import secrets
import time
from sqlalchemy import select
from .database import SessionLocal
from .models import User, Service, ServiceRequest
from .security import passwords
from .workflow_schemas import WorkflowCreate
from .workflow_models import WorkflowRun, WorkflowApproval, ExecutionAttempt
from . import workflow_engine as engine

def prepare():
    with SessionLocal() as db:
        user=db.scalar(select(User).where(User.email=='qa-workflow-restart@example.com'))
        if user and (user.name!='Development QA Workflow Restart' or user.role!='CUSTOMER'):
            raise RuntimeError('Refusing to alter an unrelated account')
        if user is None:
            user=User(name='Development QA Workflow Restart',email='qa-workflow-restart@example.com',password_hash=passwords.hash(secrets.token_urlsafe(32)))
            db.add(user);db.flush()
        service=db.scalar(select(Service).where(Service.slug=='job-search-assistance'))
        request=ServiceRequest(user_id=user.id,service_id=service.id,requirements='Development QA restart recovery of job preparation; deterministic fixture.',location='Bengaluru',phone='6364456776')
        db.add(request);db.commit()
        data=WorkflowCreate(request_id=request.id,idempotency_key='qa-restart-'+engine.uid(),inputs={'candidate_name':user.name,'resume_text':'QA profile: Python and SQL work on internal engineering tools.','target_titles':['Engineer'],'skills':['Python','SQL'],'experience_years':2,'locations':['Bengaluru'],'arrangements':['REMOTE'],'source_permission':True,'listings':[{'title':'Engineer','company':'Development QA Fixture','location':'Bengaluru','arrangement':'REMOTE','source_url':'https://jobs.example.com/restart-qa','description':'Deterministic QA fixture requiring Python and SQL for engineering tools.'}]})
        run=engine.create(db,user,data,data.inputs.model_dump());engine.start(db,run,user)
        first=engine.claim(db,run.id);engine.finish(db,first,*engine.execute(first))
        interrupted=engine.claim(db,run.id)
        assert interrupted and interrupted[4]['id']=='jobs.normalize@1'
        print(run.id) # A committed RUNNING lease remains unfinished.

def verify(id):
    for _ in range(50):
        with SessionLocal() as db:
            run=db.get(WorkflowRun,id)
            if not run or not run.idempotency_key.startswith('qa-restart-'):
                raise RuntimeError('Not a restart QA workflow')
            if run.status=='WAITING_APPROVAL':
                actions=engine.actions_for(db,run)
                assert actions[0].status=='COMPLETED' and actions[0].attempts==1
                assert actions[1].status=='COMPLETED' and actions[1].attempts==2
                attempts=list(db.scalars(select(ExecutionAttempt).where(ExecutionAttempt.action_id==actions[1].id).order_by(ExecutionAttempt.number)))
                assert [a.status for a in attempts]==['INTERRUPTED','COMPLETED']
                approval=db.scalar(select(WorkflowApproval).where(WorkflowApproval.action_id==actions[3].id))
                assert approval.status=='PENDING' and actions[3].attempts==0
                engine.decide(db,run,approval.id,db.get(User,run.user_id),'APPROVED')
                break
        time.sleep(1)
    else: raise RuntimeError('Lease recovery did not reach customer approval')
    for _ in range(15):
        with SessionLocal() as db:
            run=db.get(WorkflowRun,id)
            if run.status=='COMPLETED':
                actions=engine.actions_for(db,run)
                assert [a.attempts for a in actions]==[1,2,1,1,1]
                assert len(actions[3].result['artifacts'])==2
                print('Restart recovery passed: import retained, interrupted lease recovered once, approval enforced, all five actions completed.')
                return
        time.sleep(1)
    raise RuntimeError('Approved workflow did not complete')

if __name__=='__main__':
    if os.getenv('QA_MODE')!='true': raise SystemExit('Explicit QA_MODE=true required')
    if len(sys.argv)==2 and sys.argv[1]=='prepare': prepare()
    elif len(sys.argv)==3 and sys.argv[1]=='verify': verify(sys.argv[2])
    else: raise SystemExit('Use prepare or verify WORKFLOW_ID')
