import hashlib
import copy
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from .database import get_db
from .security import current_user, admin_user
from .models import User, now, ServiceRequest, Service, Category
from .catalogue import serialize
from .workflow_models import *
from .workflow_schemas import WorkflowCreate, JobInputs, ApprovalDecision, DocumentInput, ApplicationUpdate
from .action_registry import REGISTRY, TEMPLATES, missing_inputs
from . import workflow_engine as engine
from .discovery_schemas import DiscoveryInputs
from pydantic import ValidationError
from .discovery_service import display_permitted

router=APIRouter(tags=['VISTRAH Finds'])

def resolve_inputs(db,user,data):
    inputs=data.model_dump()
    if data.document_id:
        doc=db.scalar(select(WorkflowDocument).where(WorkflowDocument.id==data.document_id,WorkflowDocument.user_id==user.id))
        if not doc: raise HTTPException(404,'Document not found')
        inputs['resume_text']=doc.content
    return type(data).model_validate(inputs).model_dump()

def run_summary(db,run):
    actions=engine.actions_for(db,run)
    return {key:getattr(run,key) for key in ('id','request_id','template_id','status','created_at','updated_at')} | {'completed_actions':sum(a.status=='COMPLETED' for a in actions),'total_actions':len(actions),'retry_eligible':any(engine.can_retry(a,run) for a in actions)}

def detail(db,run,admin=False):
    actions=engine.actions_for(db,run); output=[]
    for action in actions:
        spec=REGISTRY[action.definition_id]; missing=missing_inputs(run.inputs,spec)
        item={key:getattr(action,key) for key in ('id','definition_id','status','ordinal','error','attempts','started_at','finished_at')}
        item.update(name=spec['name'],description=spec['description'],requires_approval=spec['requires_approval'],retry_eligible=engine.can_retry(action,run),missing_inputs=missing,availability='AWAITING_APPROVAL' if action.status=='WAITING_APPROVAL' else 'MISSING_INFORMATION' if missing else 'AVAILABLE',prerequisites=list(db.scalars(select(ActionDependency.prerequisite_id).where(ActionDependency.action_id==action.id))),duration_seconds=max(0,(engine.aware(action.finished_at)-engine.aware(action.started_at)).total_seconds()) if action.started_at and action.finished_at else None)
        item['execution_history']=[serialize(r) for r in db.scalars(select(ExecutionAttempt).where(ExecutionAttempt.action_id==action.id).order_by(ExecutionAttempt.number))]
        approval=db.scalar(select(WorkflowApproval).where(WorkflowApproval.action_id==action.id))
        item['approval']=({key:getattr(approval,key) for key in ('id','status','actor_id','created_at','decided_at')} | ({} if admin else {'scope':approval.scope})) if approval else None
        if not admin:
            item['result']=copy.deepcopy(action.result)
            if action.definition_id=='jobs.discover@2' and item['result']:
                for match in item['result']['matches']:
                    listing=match['listing']
                    if engine.aware(datetime.fromisoformat(listing['retrieved_at']))<now()-timedelta(hours=24): listing['status']='STALE'
            if item['result']:
                for key in ('matches','listings','artifacts','checklists'):
                    if key in item['result']:
                        item['result'][key]=[r for r in item['result'][key] if display_permitted(r.get('listing',r))]
            item['evidence']=[serialize(r) for r in db.scalars(select(WorkflowEvidence).where(WorkflowEvidence.action_id==action.id))]
            item['evidence']=[r for r in item['evidence'] if display_permitted(r)]
        output.append(item)
    result={**run_summary(db,run),'actions':output,'events':[serialize(e) for e in db.scalars(select(WorkflowEvent).where(WorkflowEvent.workflow_id==run.id).order_by(WorkflowEvent.id))],'missing_inputs':missing_inputs(run.inputs,action_ids=TEMPLATES[run.template_id]['actions']),'template':TEMPLATES[run.template_id]}
    if admin:
        result['customer_id']=run.user_id
    else:
        result['inputs']=copy.deepcopy(run.inputs)
        if 'listings' in result['inputs']:
            result['inputs']['listings']=[r for r in result['inputs']['listings'] if display_permitted(r)]
        result['applications']=[serialize(r) for r in db.scalars(select(ApplicationRecord).where(ApplicationRecord.workflow_id==run.id))]
    return result

@router.get('/finds/requests')
def requests(user: User=Depends(current_user),db: Session=Depends(get_db)):
    output=[]
    for row in db.scalars(select(ServiceRequest).where(ServiceRequest.user_id==user.id).order_by(ServiceRequest.id.desc())):
        service=db.get(Service,row.service_id); category=db.get(Category,service.category_id)
        output.append({**serialize(row),'service_title':service.title,'templates':[spec for spec in TEMPLATES.values() if category.slug in spec['categories']],'workflows':[run_summary(db,r) for r in db.scalars(select(WorkflowRun).where(WorkflowRun.request_id==row.id,WorkflowRun.user_id==user.id).order_by(WorkflowRun.created_at.desc()))]})
    return output

@router.get('/finds/actions')
def registry(user: User=Depends(current_user)):
    return list(REGISTRY.values())

@router.get('/finds/workflows')
def history(user: User=Depends(current_user),db: Session=Depends(get_db),page: int=Query(1,ge=1)):
    rows=db.scalars(select(WorkflowRun).where(WorkflowRun.user_id==user.id).order_by(WorkflowRun.created_at.desc()).offset((page-1)*30).limit(30))
    return [run_summary(db,r) for r in rows]

@router.post('/finds/documents',status_code=201)
def upload(data: DocumentInput,user: User=Depends(current_user),db: Session=Depends(get_db)):
    count=db.scalar(select(func.count()).select_from(WorkflowDocument).where(WorkflowDocument.user_id==user.id))
    if count>=50: raise HTTPException(409,'Document limit reached. Use a pasted profile instead.')
    doc=WorkflowDocument(id=engine.uid(),user_id=user.id,filename=data.filename,content=data.text,sha256=hashlib.sha256(data.text.encode()).hexdigest())
    db.add(doc);db.commit()
    return {key:getattr(doc,key) for key in ('id','filename','sha256','created_at')}

@router.get('/finds/documents/{id}')
def document(id: str,user: User=Depends(current_user),db: Session=Depends(get_db)):
    doc=db.scalar(select(WorkflowDocument).where(WorkflowDocument.id==id,WorkflowDocument.user_id==user.id))
    if not doc: raise HTTPException(404,'Document not found')
    return {'id':doc.id,'filename':doc.filename,'text':doc.content,'sha256':doc.sha256}

@router.post('/finds/workflows',status_code=201)
def create(data: WorkflowCreate,user: User=Depends(current_user),db: Session=Depends(get_db)):
    run=engine.create(db,user,data,resolve_inputs(db,user,data.inputs))
    return detail(db,run)

@router.get('/finds/workflows/{id}')
def get_run(id: str,user: User=Depends(current_user),db: Session=Depends(get_db)):
    return detail(db,engine.owned_run(db,id,user))

@router.put('/finds/workflows/{id}/inputs')
def update(id: str,data: JobInputs | DiscoveryInputs,user: User=Depends(current_user),db: Session=Depends(get_db)):
    run=engine.owned_run(db,id,user,True)
    if run.status not in ('DRAFT','READY'): raise HTTPException(409,'Inputs are frozen after the workflow starts. Create a new plan to change them.')
    try:
        data=(DiscoveryInputs if run.template_id=='job-discovery@2' else JobInputs).model_validate(data.model_dump())
    except ValidationError:
        raise HTTPException(422,'Inputs do not match this workflow template') from None
    run.inputs=resolve_inputs(db,user,data);run.input_hash=engine.digest(run.inputs)
    run.status='DRAFT' if missing_inputs(run.inputs,action_ids=TEMPLATES[run.template_id]['actions']) else 'READY'
    for action in engine.actions_for(db,run): action.snapshot={'input_hash':run.input_hash}
    engine.event(db,run,'INPUTS_UPDATED',user,details={'input_hash':run.input_hash});db.commit()
    return detail(db,run)

@router.post('/finds/workflows/{id}/start')
def start(id: str,user: User=Depends(current_user),db: Session=Depends(get_db)):
    run=engine.owned_run(db,id,user,True);engine.start(db,run,user);return detail(db,run)

@router.post('/finds/workflows/{id}/approvals/{approval_id}')
def decision(id: str,approval_id: str,data: ApprovalDecision,user: User=Depends(current_user),db: Session=Depends(get_db)):
    run=engine.owned_run(db,id,user,True);engine.decide(db,run,approval_id,user,data.decision);return detail(db,run)

@router.post('/finds/workflows/{id}/actions/{action_id}/retry')
def retry(id: str,action_id: str,user: User=Depends(current_user),db: Session=Depends(get_db)):
    run=engine.owned_run(db,id,user,True);engine.retry(db,run,action_id,user);return detail(db,run)

@router.post('/finds/workflows/{id}/cancel')
def cancel(id: str,user: User=Depends(current_user),db: Session=Depends(get_db)):
    run=engine.owned_run(db,id,user,True);engine.cancel(db,run,user);return detail(db,run)

@router.put('/finds/workflows/{id}/applications')
def application(id: str,data: ApplicationUpdate,user: User=Depends(current_user),db: Session=Depends(get_db)):
    run=engine.owned_run(db,id,user,True)
    normalize=db.scalar(select(ActionRun).where(ActionRun.workflow_id==id,ActionRun.definition_id=='jobs.normalize@1',ActionRun.status=='COMPLETED'))
    if not normalize or data.source_url not in {j['source_url'] for j in normalize.result['listings']}: raise HTTPException(409,'Use a normalized source URL from this workflow')
    row=db.scalar(select(ApplicationRecord).where(ApplicationRecord.workflow_id==id,ApplicationRecord.source_url==data.source_url))
    if not row: row=ApplicationRecord(workflow_id=id,source_url=data.source_url,status=data.status);db.add(row)
    else: row.status=data.status
    engine.event(db,run,'APPLICATION_STATUS_RECORDED',user,details={'status':data.status,'source_reference_hash':engine.digest(data.source_url),'user_reported':True});db.commit()
    return detail(db,run)

@router.get('/admin/workflows')
def admin_runs(user: User=Depends(admin_user),db: Session=Depends(get_db),page: int=Query(1,ge=1),status: str=Query('',max_length=30)):
    query=select(WorkflowRun)
    if status:
        if status not in RUN_STATES: raise HTTPException(422,'Invalid workflow status')
        query=query.where(WorkflowRun.status==status)
    total=db.scalar(select(func.count()).select_from(query.subquery()))
    counts=dict(db.execute(select(WorkflowRun.status,func.count()).group_by(WorkflowRun.status)).all())
    approvals=db.scalar(select(func.count()).select_from(WorkflowApproval).where(WorkflowApproval.status=='PENDING'))
    workers=[{'id':w.id,'heartbeat_at':w.heartbeat_at,'healthy':engine.aware(w.heartbeat_at)>now()-timedelta(seconds=15)} for w in db.scalars(select(WorkflowWorker))]
    from .discovery_service import ADAPTERS, source_summary
    integrations=[]
    for key in ADAPTERS:
        source=source_summary(db,key)
        integrations.append({'id':key,'status':'AVAILABLE' if source['enabled'] and source['status']=='configured' else 'DISABLED' if source['status']=='configured' else 'NOT_CONFIGURED','note':source['note']})
    return {'items':[run_summary(db,r)|{'customer_id':r.user_id} for r in db.scalars(query.order_by(WorkflowRun.created_at.desc()).offset((page-1)*30).limit(30))],'total':total,'counts':counts,'pending_customer_approvals':approvals,'pending_admin_approvals':0,'workers':workers,'integrations':[{'id':'customer_supplied_listings','status':'AVAILABLE','note':'No network calls; customers supply authorized vacancy descriptions.'}]+integrations+[{'id':d['integrations'][0],'status':d['availability'],'note':d['configuration_note']} for d in REGISTRY.values() if not d['executable'] and d['id']!='jobs.discover@1']}

@router.get('/admin/workflows/{id}')
def admin_detail(id: str,user: User=Depends(admin_user),db: Session=Depends(get_db)):
    run=db.get(WorkflowRun,id)
    if not run: raise HTTPException(404,'Workflow not found')
    return detail(db,run,True)

@router.post('/admin/workflows/{id}/actions/{action_id}/retry')
def admin_retry(id: str,action_id: str,user: User=Depends(admin_user),db: Session=Depends(get_db)):
    run=db.scalar(select(WorkflowRun).where(WorkflowRun.id==id).with_for_update())
    if not run: raise HTTPException(404,'Workflow not found')
    engine.retry(db,run,action_id,user);return detail(db,run,True)
