"""Database-backed orchestration with a narrowly authorised discovery read."""
import hashlib
import json
import time
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from fastapi import HTTPException
from sqlalchemy import select
from .models import now, Audit, ServiceRequest, Service, Category
from .workflow_models import ActionDefinition, WorkflowTemplate, WorkflowRun, ActionRun, ActionDependency, WorkflowApproval, ExecutionAttempt, WorkflowEvent, WorkflowEvidence
from .action_registry import REGISTRY, TEMPLATES, HANDLERS, INPUT_MODELS, RESULT_MODELS, missing_inputs

def uid():
    return str(uuid4())
def digest(data):
    return hashlib.sha256(json.dumps(data,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def aware(value):
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value

def register(db):
    for key,spec in REGISTRY.items():
        row=db.get(ActionDefinition,key)
        if row is None:
            db.add(ActionDefinition(id=key,identifier=spec['identifier'],version=spec['version'],specification=spec))
        elif row.specification!=spec:
            raise RuntimeError('Action contract changed without a version increment: '+key)
    for key,spec in TEMPLATES.items():
        row=db.get(WorkflowTemplate,key)
        if row is None:
            db.add(WorkflowTemplate(id=key,specification=spec))
        elif row.specification!=spec:
            raise RuntimeError('Workflow contract changed without a version increment: '+key)
    db.flush()

def event(db,run,kind,actor=None,action=None,details=None):
    db.add(WorkflowEvent(workflow_id=run.id,actor_id=actor.id if actor else None,action_id=action.id if action else None,kind=kind,details=details or {}))
    db.add(Audit(actor_id=actor.id if actor else None,action='WORKFLOW_'+kind,entity='workflow',entity_id=run.id,details={'action_id':action.id if action else None,**(details or {})}))

def owned_run(db,id,user,lock=False):
    query=select(WorkflowRun).where(WorkflowRun.id==id,WorkflowRun.user_id==user.id)
    if lock: query=query.with_for_update()
    row=db.scalar(query.execution_options(populate_existing=True))
    if row is None: raise HTTPException(404,'Workflow not found')
    return row

def create(db,user,data,inputs):
    request=db.scalar(select(ServiceRequest).where(ServiceRequest.id==data.request_id,ServiceRequest.user_id==user.id).with_for_update())
    if request is None: raise HTTPException(404,'Request not found')
    existing=db.scalar(select(WorkflowRun).where(WorkflowRun.user_id==user.id,WorkflowRun.idempotency_key==data.idempotency_key))
    if existing:
        if existing.request_id!=data.request_id or existing.template_id!=data.template_id or existing.input_hash!=digest(inputs):
            raise HTTPException(409,'Idempotency key was already used for different workflow inputs')
        return existing
    if request.status in ('CANCELLED','COMPLETED'): raise HTTPException(409,'This request is closed')
    template=TEMPLATES.get(data.template_id)
    service=db.get(Service,request.service_id); category=db.get(Category,service.category_id)
    if not template or category.slug not in template['categories']: raise HTTPException(409,'No executable workflow is registered for this service category')
    register(db)
    run=WorkflowRun(id=uid(),user_id=user.id,request_id=request.id,template_id=data.template_id,idempotency_key=data.idempotency_key,inputs=inputs,input_hash=digest(inputs),status='DRAFT' if missing_inputs(inputs,action_ids=template['actions']) else 'READY')
    db.add(run);db.flush()
    actions={}
    for ordinal,key in enumerate(template['actions']):
        if any(dep not in actions for dep in REGISTRY[key]['prerequisites']):
            raise HTTPException(503,'Invalid workflow dependency ordering')
        row=ActionRun(id=uid(),workflow_id=run.id,definition_id=key,ordinal=ordinal,status='PENDING',snapshot={'input_hash':run.input_hash},attempts=0)
        db.add(row);db.flush();actions[key]=row
        for dep in REGISTRY[key]['prerequisites']:
            db.add(ActionDependency(action_id=row.id,prerequisite_id=actions[dep].id))
    event(db,run,'CREATED',user);db.commit();return run

def actions_for(db,run):
    return list(db.scalars(select(ActionRun).where(ActionRun.workflow_id==run.id).order_by(ActionRun.ordinal)))

def can_retry(action,run=None):
    spec=REGISTRY.get(action.definition_id)
    if action.definition_id=='jobs.discover@2':
        return bool(action.attempts<3 and (action.status=='FAILED' or (action.status=='COMPLETED' and action.result and action.result['status'] in ('PARTIAL','ALL_UNAVAILABLE') and any(s['error_code'] not in (None,'PAGE_LIMIT','INVALID_RECORDS') for s in action.result['sources']))) and (run is None or run.status in ('FAILED','PARTIALLY_COMPLETED','COMPLETED')))
    return bool(spec and spec['executable'] and spec['side_effect']=='INTERNAL_ARTIFACT' and action.status=='FAILED' and action.attempts<spec['max_attempts'] and (run is None or run.status in ('FAILED','PARTIALLY_COMPLETED')))

def executable(spec):
    return bool(spec and spec['executable'] and (spec['side_effect']=='INTERNAL_ARTIFACT' or (spec['id']=='jobs.discover@2' and spec['side_effect']=='EXTERNAL_READ' and spec['handler']=='discover_api')))

def refresh_state(db,run):
    rows=actions_for(db,run)
    if run.status in ('DRAFT','READY','CANCELLED'): return
    by_id={a.id:a for a in rows}
    for action in rows:
        if action.status!='PENDING': continue
        deps=[by_id[id] for id in db.scalars(select(ActionDependency.prerequisite_id).where(ActionDependency.action_id==action.id))]
        if any(dep.status in ('FAILED','BLOCKED','REJECTED','CANCELLED') for dep in deps):
            action.status='BLOCKED';action.error='A prerequisite did not complete.'
        elif all(dep.status=='COMPLETED' for dep in deps):
            spec=REGISTRY.get(action.definition_id)
            if not executable(spec) or spec['handler'] not in HANDLERS:
                action.status='FAILED';action.error='INTEGRATION_UNAVAILABLE';event(db,run,'FAILED',action=action,details={'error_code':'INTEGRATION_UNAVAILABLE'})
            elif spec['requires_approval']:
                approval=db.scalar(select(WorkflowApproval).where(WorkflowApproval.action_id==action.id))
                if approval is None:
                    approval=WorkflowApproval(id=uid(),action_id=action.id,scope={'definition_id':action.definition_id,'input_hash':run.input_hash,'source_urls':[job['source_url'] for job in run.inputs.get('listings',[])],'authorization':'Create internal resume and cover-letter drafts only; no submission or outreach.' if spec['handler']=='drafts' else spec['description']})
                    db.add(approval);event(db,run,'APPROVAL_REQUESTED',action=action)
                action.status='WAITING_APPROVAL'
            else:
                action.status='QUEUED';event(db,run,'ACTION_QUEUED',action=action)
    states=[a.status for a in rows]
    if all(s=='COMPLETED' for s in states): status='COMPLETED'
    elif 'RUNNING' in states: status='RUNNING'
    elif 'QUEUED' in states: status='QUEUED'
    elif 'WAITING_APPROVAL' in states: status='WAITING_APPROVAL'
    elif any(s in ('FAILED','REJECTED','BLOCKED') for s in states): status='PARTIALLY_COMPLETED' if 'COMPLETED' in states else 'FAILED'
    else: status='FAILED'
    if run.status!=status:
        run.status=status;run.updated_at=now();event(db,run,'STATE_CHANGED',details={'status':status})

def start(db,run,user):
    if run.status!='READY': raise HTTPException(409,'Only a ready workflow can start')
    request=db.get(ServiceRequest,run.request_id)
    if request.status in ('CANCELLED','COMPLETED'): raise HTTPException(409,'This request is closed')
    if missing_inputs(run.inputs,action_ids=TEMPLATES[run.template_id]['actions']): raise HTTPException(409,'Required inputs are missing')
    run.status='QUEUED';event(db,run,'STARTED',user);refresh_state(db,run);db.commit()

def decide(db,run,approval_id,user,decision):
    approval=db.scalar(select(WorkflowApproval).join(ActionRun).where(WorkflowApproval.id==approval_id,ActionRun.workflow_id==run.id).with_for_update())
    if not approval: raise HTTPException(404,'Approval not found')
    action=db.get(ActionRun,approval.action_id)
    if approval.status==decision and approval.actor_id==user.id: return
    if approval.status!='PENDING' or action.status!='WAITING_APPROVAL' or run.status=='CANCELLED': raise HTTPException(409,'Approval is no longer pending')
    if approval.scope['input_hash']!=run.input_hash: raise HTTPException(409,'Approval scope does not match the current plan')
    approval.status=decision;approval.actor_id=user.id;approval.decided_at=now()
    action.status='QUEUED' if decision=='APPROVED' else 'REJECTED'
    if decision=='REJECTED': action.finished_at=now()
    event(db,run,'APPROVAL_'+decision,user,action,{'approval_id':approval.id,'input_hash':run.input_hash})
    refresh_state(db,run);db.commit()

def retry(db,run,action_id,user):
    action=db.scalar(select(ActionRun).where(ActionRun.id==action_id,ActionRun.workflow_id==run.id))
    if not action: raise HTTPException(404,'Action not found')
    if not can_retry(action,run): raise HTTPException(409,'This action is not eligible for retry')
    action.status='QUEUED';action.error=None;action.finished_at=None
    # Reset only blocked descendants. Completed actions are never re-executed.
    for row in actions_for(db,run):
        if row.status=='BLOCKED': row.status='PENDING';row.error=None
    event(db,run,'RETRY_REQUESTED',user,action);refresh_state(db,run);db.commit()

def cancel(db,run,user):
    if run.status in ('COMPLETED','CANCELLED'): raise HTTPException(409,'This workflow cannot be cancelled')
    for action in actions_for(db,run):
        if action.status not in ('COMPLETED','FAILED','REJECTED'):
            action.status='CANCELLED';action.lease_token=None;action.lease_until=None;action.finished_at=now()
        for attempt in db.scalars(select(ExecutionAttempt).where(ExecutionAttempt.action_id==action.id,ExecutionAttempt.status=='RUNNING')):
            attempt.status='CANCELLED';attempt.finished_at=now()
        approval=db.scalar(select(WorkflowApproval).where(WorkflowApproval.action_id==action.id,WorkflowApproval.status=='PENDING'))
        if approval: approval.status='CANCELLED';approval.actor_id=user.id;approval.decided_at=now()
    run.status='CANCELLED';run.updated_at=now();event(db,run,'CANCELLED',user);db.commit()

def claim(db,workflow_id=None):
    query=select(WorkflowRun).where(WorkflowRun.status.in_(['QUEUED','RUNNING']))
    if workflow_id is not None:
        query=query.where(WorkflowRun.id==workflow_id)
    runs=db.scalars(query.order_by(WorkflowRun.created_at).with_for_update(skip_locked=True).limit(20)).all()
    for run in runs:
        for action in actions_for(db,run):
            if action.status=='RUNNING' and action.lease_until and aware(action.lease_until)<=now():
                attempt=db.scalar(select(ExecutionAttempt).where(ExecutionAttempt.action_id==action.id,ExecutionAttempt.number==action.attempts))
                attempt.status='INTERRUPTED';attempt.error_code='LEASE_EXPIRED';attempt.finished_at=now()
                spec=REGISTRY.get(action.definition_id,{})
                safe=executable(spec) and action.attempts<spec.get('max_attempts',0)
                action.status='QUEUED' if safe else 'FAILED';action.error=None if safe else 'INTERRUPTED_RETRY_LIMIT';action.lease_token=None;action.lease_until=None
                event(db,run,'INTERRUPTED',action=action,details={'safe_requeue':safe})
        refresh_state(db,run)
        for action in actions_for(db,run):
            if action.status!='QUEUED': continue
            spec=REGISTRY.get(action.definition_id)
            if not executable(spec):
                action.status='FAILED';action.error='INTEGRATION_UNAVAILABLE';refresh_state(db,run);continue
            if spec['requires_approval']:
                approval=db.scalar(select(WorkflowApproval).where(WorkflowApproval.action_id==action.id))
                if not approval or approval.status!='APPROVED' or approval.scope['input_hash']!=run.input_hash:
                    action.status='FAILED';action.error='APPROVAL_REQUIRED';refresh_state(db,run);continue
            if digest(run.inputs)!=run.input_hash or action.snapshot['input_hash']!=run.input_hash:
                action.status='FAILED';action.error='INPUT_SNAPSHOT_MISMATCH';refresh_state(db,run);continue
            deps={db.get(ActionRun,id).definition_id:db.get(ActionRun,id).result for id in db.scalars(select(ActionDependency.prerequisite_id).where(ActionDependency.action_id==action.id))}
            action.status='RUNNING';action.attempts+=1;action.started_at=now();action.lease_token=uid();action.lease_until=now()+timedelta(seconds=spec['timeout_seconds'])
            attempt=ExecutionAttempt(id=uid(),action_id=action.id,number=action.attempts,idempotency_key=action.id,status='RUNNING');db.add(attempt)
            event(db,run,'ATTEMPT_STARTED',action=action,details={'number':action.attempts});refresh_state(db,run)
            payload=(run.id,action.id,action.lease_token,attempt.id,spec,dict(run.inputs),deps)
            db.commit();return payload
    db.commit();return None

def finish(db,payload,result,error,elapsed):
    run_id,action_id,token,attempt_id,spec,inputs,deps=payload
    run=db.scalar(select(WorkflowRun).where(WorkflowRun.id==run_id).with_for_update().execution_options(populate_existing=True))
    action=db.get(ActionRun,action_id,populate_existing=True)
    if action.lease_token!=token or action.status!='RUNNING' or run.status=='CANCELLED':
        db.rollback();return # Stale work cannot overwrite cancellation or a recovered attempt.
    attempt=db.get(ExecutionAttempt,attempt_id)
    if elapsed>spec['timeout_seconds'] or aware(action.lease_until)<=now(): error='TIMEOUT';result=None
    attempt.finished_at=now();action.finished_at=now();action.lease_until=None;action.lease_token=None
    if error:
        attempt.status='TIMED_OUT' if error=='TIMEOUT' else 'FAILED';attempt.error_code=error;action.status='FAILED';action.error=error
        event(db,run,'FAILED',action=action,details={'error_code':error})
    else:
        action.result=result;action.status='COMPLETED';action.error=None;attempt.status='COMPLETED'
        urls={j['source_url'] for j in inputs.get('listings',[])}
        existing_urls=set(db.scalars(select(WorkflowEvidence.source_url).where(WorkflowEvidence.action_id==action.id)))
        if spec['id']=='jobs.discover@2':
            for match in result['matches']:
                for provenance in match['listing']['provenance']:
                    url=provenance['source_url']
                    if url not in existing_urls:
                        db.add(WorkflowEvidence(action_id=action.id,source_url=url,discovered_at=datetime.fromisoformat(provenance['retrieved_at']),description=f"Retrieved via {provenance['attribution']} API; source record {provenance['source_record_id'][:100]}. Open status unconfirmed."))
                        existing_urls.add(url)
        else:
            for url in sorted(urls-existing_urls):
                db.add(WorkflowEvidence(action_id=action.id,source_url=url,description='Customer-supplied vacancy reference; not independently fetched or verified.'))
        event(db,run,'ACTION_COMPLETED',action=action,details={'attempt':action.attempts})
    refresh_state(db,run);db.commit()

def execute(payload,db_factory=None,transport=None):
    spec=payload[4];started=time.monotonic()
    try:
        # Input and result contracts are validated at the execution boundary.
        inputs=INPUT_MODELS[spec['handler']].model_validate(payload[5]).model_dump()
        if spec['id']=='jobs.discover@2':
            from .database import SessionLocal
            from .discovery_service import acquire
            with (db_factory or SessionLocal)() as db:
                result=acquire(db,payload,inputs,transport)
        else:
            result=HANDLERS[spec['handler']](inputs,payload[6])
        result=RESULT_MODELS[spec['handler']].model_validate(result).model_dump()
        error=None
    except Exception:
        # Never persist exception text containing customer documents or credentials.
        result=None;error='HANDLER_FAILED'
    return result,error,time.monotonic()-started
