from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session
from .database import get_db
from .models import User, Service, Category, ServiceRequest, Audit
from .security import current_user, admin_user
from .workflow_models import WorkflowRun, ActionRun
from .workflow_routes import detail, resolve_inputs
from .discovery_models import JobSource, Vacancy, VacancyProvenance, Acquisition, AcquisitionSource
from .discovery_schemas import DiscoveryCreate, DiscoveryInputs, SourceToggle, AdminAcquisition, PrepareSelection
from .workflow_schemas import JobInputs, JobListing, WorkflowCreate
from pydantic import ValidationError
from .discovery_service import ADAPTERS, source_summary, public_record, display_permitted
from . import workflow_engine as engine

router=APIRouter(tags=['Vacancy discovery'])

@router.get('/finds/sources')
def customer_sources(user: User=Depends(current_user),db: Session=Depends(get_db)):
    return [source_summary(db,key) for key in ADAPTERS]

@router.post('/finds/discovery',status_code=201)
def discovery(data: DiscoveryCreate,user: User=Depends(current_user),db: Session=Depends(get_db)):
    run=engine.create(db,user,data,resolve_inputs(db,user,data.inputs))
    return detail(db,run)

@router.post('/finds/workflows/{id}/prepare',status_code=201)
def prepare(id: str,data: PrepareSelection,user: User=Depends(current_user),db: Session=Depends(get_db)):
    run=engine.owned_run(db,id,user,True)
    action=db.scalar(select(ActionRun).where(ActionRun.workflow_id==id,ActionRun.definition_id=='jobs.discover@2',ActionRun.status=='COMPLETED'))
    if not action: raise HTTPException(409,'Complete discovery before preparing drafts')
    available={m['listing']['id']:m['listing'] for m in action.result['matches'] if display_permitted(m['listing'])}
    if any(key not in available for key in data.vacancy_ids): raise HTTPException(404,'Selected vacancy not found in your results')
    listings=[]
    try:
        for key in dict.fromkeys(data.vacancy_ids):
            record=available[key]
            listings.append(JobListing(title=record['title'],company=record['employer'],location=record['location'],arrangement=record['arrangement'],source_url=record['source_url'],description=record['description'][:6000],currency=record['currency'] or 'XXX').model_dump())
        profile={key:value for key,value in run.inputs.items() if key in JobInputs.model_fields}
        inputs=JobInputs.model_validate({**profile,'listings':listings,'source_permission':True})
    except ValidationError:
        raise HTTPException(409,'Source details are incomplete for automatic draft preparation. Create a preparation plan and supply the missing employer, location, arrangement or description yourself.') from None
    creation=WorkflowCreate(request_id=run.request_id,idempotency_key=data.idempotency_key,inputs=inputs)
    return detail(db,engine.create(db,user,creation,inputs.model_dump()))

@router.get('/jobs')
def public_jobs(db: Session=Depends(get_db),page: int=Query(1,ge=1,le=10000),q: str=Query('',max_length=150)):
    query=select(Vacancy)
    if not ADAPTERS['adzuna'].configuration()['access_ready']:
        query=query.where(~Vacancy.id.in_(select(VacancyProvenance.vacancy_id).where(VacancyProvenance.source_id=='adzuna')))
    if q:
        pattern='%'+q.replace('%','\\%').replace('_','\\_')+'%'
        query=query.where(or_(Vacancy.record['title'].as_string().ilike(pattern,escape='\\'),Vacancy.record['employer'].as_string().ilike(pattern,escape='\\'),Vacancy.record['description'].as_string().ilike(pattern,escape='\\')))
    total=db.scalar(select(func.count()).select_from(query.subquery()))
    rows=db.scalars(query.order_by(Vacancy.retrieved_at.desc(),Vacancy.id).offset((page-1)*20).limit(20))
    return {'items':[public_record(db,r) for r in rows],'page':page,'total':total,'page_size':20,'note':'Source-listed vacancies; open status unconfirmed. Remotive API data is delayed by 24 hours. No signup is required to view these listings.'}

@router.get('/jobs/{id}')
def public_job(id: str,db: Session=Depends(get_db)):
    row=db.get(Vacancy,id)
    if row is None: raise HTTPException(404,'Vacancy not found')
    record=public_record(db,row)
    if not display_permitted(record): raise HTTPException(404,'Vacancy not available under current source access')
    return record

@router.get('/admin/job-sources')
def admin_sources(user: User=Depends(admin_user),db: Session=Depends(get_db)):
    recent=[]
    for acquisition in db.scalars(select(Acquisition).order_by(Acquisition.created_at.desc()).limit(20)):
        summaries=[{'id':p.source_id,'status':p.status,'pages':p.pages,'retrieved_count':p.retrieved_count,'invalid_count':p.invalid_count,'cache_used':p.cache_used,'error_code':p.error_code} for p in db.scalars(select(AcquisitionSource).where(AcquisitionSource.acquisition_id==acquisition.id))]
        recent.append({'id':acquisition.id,'workflow_id':acquisition.workflow_id,'status':acquisition.status,'created_at':acquisition.created_at,'finished_at':acquisition.finished_at,'sources':summaries})
    # Queued checks are visible before the worker creates acquisition progress.
    queued=[{'id':r.id,'status':r.status} for r in db.scalars(select(WorkflowRun).where(WorkflowRun.template_id=='job-discovery@2',WorkflowRun.status.in_(['QUEUED','RUNNING'])).order_by(WorkflowRun.created_at.desc()).limit(20))]
    return {'sources':[source_summary(db,key) for key in ADAPTERS],'recent':recent,'queued':queued,'schedules_enabled':False}

@router.patch('/admin/job-sources/{id}')
def toggle(id: str,data: SourceToggle,user: User=Depends(admin_user),db: Session=Depends(get_db)):
    if id not in ADAPTERS: raise HTTPException(404,'Source not found')
    if data.enabled and ADAPTERS[id].configuration()['status']!='configured': raise HTTPException(409,'Source is not configured. Supply server credentials and confirm permitted API access first.')
    row=db.scalar(select(JobSource).where(JobSource.id==id).with_for_update());row.enabled=data.enabled
    db.add(Audit(actor_id=user.id,action='JOB_SOURCE_ENABLED' if data.enabled else 'JOB_SOURCE_DISABLED',entity='job_source',entity_id=id,details={}))
    db.commit();return source_summary(db,id)

@router.post('/admin/job-sources/{id}/{operation}',status_code=202)
def acquire(id: str,operation: str,data: AdminAcquisition,user: User=Depends(admin_user),db: Session=Depends(get_db)):
    if id not in ADAPTERS or operation not in ('test','acquire'): raise HTTPException(404,'Source action not found')
    if not db.get(JobSource,id).enabled: raise HTTPException(409,'Enable the source before running a connection check or acquisition.')
    if ADAPTERS[id].configuration()['status']!='configured': raise HTTPException(409,'Source is not configured')
    # Both controls perform genuine bounded API retrieval through the same
    # worker. A connection check uses one page; a manual acquisition up to three.
    key=f'{operation}_{id}_{data.idempotency_key}'
    if len(key)>80: raise HTTPException(422,'Use an idempotency key of at most 60 characters')
    existing=db.scalar(select(WorkflowRun).where(WorkflowRun.user_id==user.id,WorkflowRun.idempotency_key==key))
    if existing: return {'workflow_id':existing.id,'status':existing.status,'note':'Existing idempotent source operation.'}
    service=db.scalar(select(Service).join(Category).where(Category.slug=='jobs-careers',Service.active.is_(True)).order_by(Service.id))
    if service is None: raise HTTPException(409,'An active Jobs & Careers service is required for this workflow.')
    request=ServiceRequest(user_id=user.id,service_id=service.id,requirements=f'Administrative {id} API {operation}; public feed acquisition.',location='Worldwide',phone='')
    db.add(request);db.flush()
    inputs=DiscoveryInputs(target_titles=['*'],locations=['Worldwide'],arrangements=['REMOTE','HYBRID','ONSITE'],sources=[id],max_pages=1 if operation=='test' else 3,result_limit=50)
    data=DiscoveryCreate(request_id=request.id,idempotency_key=key,inputs=inputs)
    run=engine.create(db,user,data,inputs.model_dump())
    engine.start(db,run,user)
    return {'workflow_id':run.id,'status':run.status,'note':'Queued in the existing worker. A fresh shared feed may be reused to respect provider quotas.'}
