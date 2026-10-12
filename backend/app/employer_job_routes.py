from uuid import uuid4
from datetime import date, timedelta, timezone
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import Field, field_validator
from sqlalchemy import select, func, or_, update
from sqlalchemy.orm import Session
from .database import get_db
from .models import User, Provider, Audit, now
from .security import seller_user, admin_user
from .workflow_schemas import Strict, public_url
from .employer_job_models import EmployerJob

router = APIRouter(tags=['Employer job postings'])

def today():
    return now().astimezone(timezone(timedelta(hours=5, minutes=30))).date()

class JobInput(Strict):
    title: str = Field(min_length=2, max_length=150)
    description: str = Field(min_length=30, max_length=6000)
    location: str = Field(min_length=2, max_length=150)
    arrangement: Literal['REMOTE','HYBRID','ONSITE']
    employment_type: Literal['FULL_TIME','PART_TIME','CONTRACT','INTERNSHIP','TEMPORARY']
    salary_text: str = Field(default='', max_length=300)
    application_url: str = Field(max_length=1500)
    deadline: date | None = None

    @field_validator('application_url')
    @classmethod
    def application_link(cls, value):
        value = public_url(value)
        if not value.startswith('https://'):
            raise ValueError('Use a public HTTPS application link')
        return value

class Revision(Strict):
    revision: int = Field(gt=0)

class JobEdit(JobInput):
    revision: int = Field(gt=0)

class JobReview(Revision):
    status: Literal['APPROVED','REJECTED']
    reason: str = Field(min_length=10, max_length=2000)

def business(db, provider_id, user):
    row = db.scalar(select(Provider).where(Provider.id==provider_id, Provider.owner_user_id==user.id).with_for_update().execution_options(populate_existing=True))
    if row is None:
        raise HTTPException(404, 'Owned employer business not found')
    return row

def eligible(provider):
    if not provider.active or provider.verification_status!='VERIFIED':
        raise HTTPException(409, 'An active verified employer business is required')

def current_job(db, job_id, provider_id=None):
    query=select(EmployerJob).where(EmployerJob.id==job_id)
    if provider_id is not None:
        query=query.where(EmployerJob.provider_id==provider_id)
    row=db.scalar(query.with_for_update().execution_options(populate_existing=True))
    if row is None:
        raise HTTPException(404, 'Job posting not found')
    return row

def check_revision(row, revision):
    if row.revision!=revision:
        raise HTTPException(409, 'Reload this job; its revision changed')

def change(db, row, user, action, values):
    revision=row.revision
    result=db.execute(update(EmployerJob).where(EmployerJob.id==row.id, EmployerJob.revision==revision).values(**values, revision=revision+1, updated_at=now()).execution_options(synchronize_session=False))
    if result.rowcount!=1:
        raise HTTPException(409, 'Reload this job; its revision changed')
    db.add(Audit(actor_id=user.id,action=action,entity='employer_job',entity_id=row.id,details={'revision':revision+1}))
    db.commit(); db.refresh(row)

def output(row, provider, private=False):
    result={key:getattr(row,key) for key in JobInput.model_fields}
    result.update(id=row.id, employer=provider.company or provider.name, status=row.status, published_at=row.published_at)
    if private:
        result.update(provider_id=row.provider_id, actor_id=row.actor_id, revision=row.revision, review_note=row.review_note, reviewer_id=row.reviewer_id, created_at=row.created_at, updated_at=row.updated_at)
    return result

def public_query():
    return select(EmployerJob,Provider).join(Provider,Provider.id==EmployerJob.provider_id).where(
        EmployerJob.status=='APPROVED', Provider.active.is_(True), Provider.verification_status=='VERIFIED',
        Provider.owner_user_id==EmployerJob.actor_id,
        or_(EmployerJob.deadline.is_(None),EmployerJob.deadline>=today()))

@router.get('/employer-jobs')
def public_jobs(response:Response, db:Session=Depends(get_db), page:int=Query(1,ge=1,le=10000), q:str=Query('',max_length=150)):
    response.headers['Cache-Control']='no-store'
    query=public_query()
    if q:
        pattern='%'+q.replace('%','\\%').replace('_','\\_')+'%'
        query=query.where(or_(EmployerJob.title.ilike(pattern,escape='\\'),EmployerJob.description.ilike(pattern,escape='\\'),EmployerJob.location.ilike(pattern,escape='\\'),Provider.company.ilike(pattern,escape='\\')))
    total=db.scalar(select(func.count()).select_from(query.subquery()))
    rows=db.execute(query.order_by(EmployerJob.published_at.desc(),EmployerJob.id).offset((page-1)*20).limit(20))
    return {'items':[output(job,provider) for job,provider in rows], 'total':total, 'page':page, 'page_size':20}

@router.get('/employer-jobs/{job_id}')
def public_job(job_id:str,response:Response,db:Session=Depends(get_db)):
    response.headers['Cache-Control']='no-store'
    item=db.execute(public_query().where(EmployerJob.id==job_id)).first()
    if item is None:
        raise HTTPException(404,'Published job not found')
    return output(*item)

@router.get('/seller/businesses/{provider_id}/jobs')
def my_jobs(provider_id:int,user:User=Depends(seller_user),db:Session=Depends(get_db),page:int=Query(1,ge=1)):
    provider=business(db,provider_id,user)
    rows=db.scalars(select(EmployerJob).where(EmployerJob.provider_id==provider_id).order_by(EmployerJob.created_at.desc(),EmployerJob.id).offset((page-1)*20).limit(20))
    total=db.scalar(select(func.count()).select_from(EmployerJob).where(EmployerJob.provider_id==provider_id))
    return {'items':[output(row,provider,True) for row in rows],'total':total,'page':page,'page_size':20}

@router.post('/seller/businesses/{provider_id}/jobs',status_code=201)
def create_job(provider_id:int,data:JobInput,user:User=Depends(seller_user),db:Session=Depends(get_db)):
    provider=business(db,provider_id,user)
    count=db.scalar(select(func.count()).select_from(EmployerJob).where(EmployerJob.provider_id==provider_id,EmployerJob.status!='CLOSED'))
    if count>=100:
        raise HTTPException(409,'Close unused jobs before creating another posting')
    row=EmployerJob(id=str(uuid4()),provider_id=provider.id,actor_id=user.id,**data.model_dump())
    db.add(row); db.flush()
    db.add(Audit(actor_id=user.id,action='EMPLOYER_JOB_CREATED',entity='employer_job',entity_id=row.id))
    db.commit(); db.refresh(row)
    return output(row,provider,True)

@router.patch('/seller/businesses/{provider_id}/jobs/{job_id}')
def edit_job(provider_id:int,job_id:str,data:JobEdit,user:User=Depends(seller_user),db:Session=Depends(get_db)):
    provider=business(db,provider_id,user); row=current_job(db,job_id,provider_id); check_revision(row,data.revision)
    if row.status not in ('DRAFT','REJECTED') or row.actor_id!=user.id:
        raise HTTPException(409,'Only your draft or rejected posting can be edited; approved jobs require a new draft')
    change(db,row,user,'EMPLOYER_JOB_EDITED',{**data.model_dump(exclude={'revision'}),'status':'DRAFT','reviewer_id':None,'review_note':'','reviewed_at':None})
    return output(row,provider,True)

@router.post('/seller/businesses/{provider_id}/jobs/{job_id}/submit')
def submit_job(provider_id:int,job_id:str,data:Revision,user:User=Depends(seller_user),db:Session=Depends(get_db)):
    provider=business(db,provider_id,user); eligible(provider)
    row=current_job(db,job_id,provider_id); check_revision(row,data.revision)
    if row.status!='DRAFT' or row.actor_id!=user.id:
        raise HTTPException(409,'Only your current draft can be submitted')
    if row.deadline and row.deadline<today():
        raise HTTPException(409,'Update the expired deadline before submitting')
    change(db,row,user,'EMPLOYER_JOB_SUBMITTED',{'status':'SUBMITTED','submitted_at':now()})
    return output(row,provider,True)

@router.post('/seller/businesses/{provider_id}/jobs/{job_id}/close')
def close_job(provider_id:int,job_id:str,data:Revision,user:User=Depends(seller_user),db:Session=Depends(get_db)):
    provider=business(db,provider_id,user); row=current_job(db,job_id,provider_id); check_revision(row,data.revision)
    if row.status=='CLOSED':
        raise HTTPException(409,'This posting is already closed')
    change(db,row,user,'EMPLOYER_JOB_CLOSED',{'status':'CLOSED'})
    return output(row,provider,True)

@router.get('/admin/employer-jobs')
def job_queue(user:User=Depends(admin_user),db:Session=Depends(get_db),page:int=Query(1,ge=1),status:Literal['DRAFT','SUBMITTED','APPROVED','REJECTED','CLOSED']|None=None):
    query=select(EmployerJob,Provider).join(Provider,Provider.id==EmployerJob.provider_id)
    if status:
        query=query.where(EmployerJob.status==status)
    total=db.scalar(select(func.count()).select_from(query.subquery()))
    rows=db.execute(query.order_by(EmployerJob.updated_at.desc(),EmployerJob.id).offset((page-1)*20).limit(20))
    return {'items':[output(row,provider,True) for row,provider in rows],'total':total,'page':page,'page_size':20}

@router.post('/admin/employer-jobs/{job_id}/review')
def review_job(job_id:str,data:JobReview,user:User=Depends(admin_user),db:Session=Depends(get_db)):
    provider_id=db.scalar(select(EmployerJob.provider_id).where(EmployerJob.id==job_id))
    if provider_id is None:
        raise HTTPException(404,'Job posting not found')
    provider=db.scalar(select(Provider).where(Provider.id==provider_id).with_for_update().execution_options(populate_existing=True))
    row=current_job(db,job_id); check_revision(row,data.revision)
    if user.id in (row.actor_id,provider.owner_user_id):
        raise HTTPException(403,'An independent administrator must review this job')
    if row.status!='SUBMITTED':
        raise HTTPException(409,'Only a submitted job can be reviewed')
    if data.status=='APPROVED':
        eligible(provider)
        if provider.owner_user_id!=row.actor_id or (row.deadline and row.deadline<today()):
            raise HTTPException(409,'Employer ownership or deadline changed; reject this posting')
    change(db,row,user,'EMPLOYER_JOB_'+data.status,{'status':data.status,'reviewer_id':user.id,'review_note':data.reason,'reviewed_at':now(),'published_at':now() if data.status=='APPROVED' else None})
    return output(row,provider,True)
