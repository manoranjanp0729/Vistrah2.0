import base64
import binascii
import copy
import hashlib
import json
import re
import struct
import uuid
import zlib
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import Field, ValidationError
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from .database import get_db
from .security import current_user, admin_user
from .models import User, Service, Category, Subcategory, Provider, ProviderService, ServiceRequest, Audit, now
from .catalogue import active_service, serialize
from .payments import aware
from .provider_models import ProviderRequirement, ProviderApplication, ProviderApplicationService, ProviderDocument, ProviderApplicationEvent, ProviderLead
from .provider_requirements import SafeModel, Requirements, COMMON, fields, validate_answers
from .provider_templates import template

router=APIRouter(tags=['Provider onboarding'])
EDITABLE={'DRAFT','CHANGES_REQUESTED'}

def event(db,app,user,kind,reason='',service_id=None,details=None):
    db.add(ProviderApplicationEvent(application_id=app.id,actor_id=user.id,kind=kind,reason=reason,service_id=service_id,details=details or {}))
    # Public administrative audit never contains answers, documents or review notes.
    db.add(Audit(actor_id=user.id,action='PROVIDER_'+kind,entity='provider_application',entity_id=app.id,details={'service_id':service_id,'revision':app.revision}))

def current_configuration(db,sid,lock=False):
    query=select(ProviderRequirement).where(ProviderRequirement.service_id==sid,ProviderRequirement.state=='PUBLISHED',ProviderRequirement.effective_at<=now()).order_by(ProviderRequirement.version.desc()).limit(1)
    return db.scalar(query.with_for_update() if lock else query)

def configuration_output(row,admin=False):
    data=serialize(row)
    if not admin:data['configuration']={k:v for k,v in row.configuration.items() if k!='checklist'}
    return data

def owned(db,id,user,lock=False):
    query=select(ProviderApplication).where(ProviderApplication.id==id)
    if user.role!='ADMIN':query=query.where(ProviderApplication.user_id==user.id)
    app=db.scalar(query.with_for_update() if lock else query)
    if not app:raise HTTPException(404,'Provider application not found')
    return app

def applicant(db,id,user,revision=None):
    app=owned(db,id,user,True)
    if app.user_id!=user.id:raise HTTPException(403,'Only the applicant may edit or submit this application')
    if app.status not in EDITABLE:raise HTTPException(409,'This application is frozen during review or after a final decision')
    if revision is not None and revision!=app.revision:raise HTTPException(409,'The application changed. Reload before saving to avoid overwriting newer answers.')
    return app

def selections(db,app):return list(db.scalars(select(ProviderApplicationService).where(ProviderApplicationService.application_id==app.id).order_by(ProviderApplicationService.service_id)))
def aggregate(db,app):
    states={r.status for r in selections(db,app)}
    app.status=next((s for s in ['CHANGES_REQUESTED','UNDER_REVIEW','SUBMITTED','DRAFT','APPROVED','SUSPENDED','REJECTED'] if s in states),'DRAFT')

def summary(app):return {k:getattr(app,k) for k in ('id','category_id','provider_id','status','revision','created_at','updated_at','submitted_at')}
def history_output(row,admin):
    data=copy.deepcopy(serialize(row))
    if not admin:
        data['details'].pop('checklist',None)
        data['details'].get('common_configuration',{}).pop('checklist',None)
    return data
def detail(db,app,user):
    admin=user.role=='ADMIN'
    entries=[]
    for row in selections(db,app):
        config=db.get(ProviderRequirement,row.requirement_id);latest=current_configuration(db,row.service_id)
        required=db.get(ProviderRequirement,row.required_requirement_id) if row.required_requirement_id else None
        entries.append({**serialize(row),'title':db.get(Service,row.service_id).title,'requirements':configuration_output(config,admin),'latest_requirements':configuration_output(latest,admin) if latest else None,'required_requirements':configuration_output(required,admin) if required else None})
    common=copy.deepcopy(app.common_configuration)
    if not admin:common.pop('checklist',None)
    return {**summary(app),'user_id':app.user_id,'common':app.common,'common_configuration':common,'services':entries,'documents':[{k:getattr(d,k) for k in ('id','service_id','field_id','filename','media_type','sha256','created_at')} for d in db.scalars(select(ProviderDocument).where(ProviderDocument.application_id==app.id))],'history':[history_output(e,admin) for e in db.scalars(select(ProviderApplicationEvent).where(ProviderApplicationEvent.application_id==app.id).order_by(ProviderApplicationEvent.id.desc()).limit(100))]}

class CreateApplication(SafeModel):
    category_id: int
    service_ids: list[int]=Field(min_length=1,max_length=15)
    subcategory_id: int | None = Field(default=None, gt=0)
    provider_id: int | None = Field(default=None, gt=0)

class ApplicationSelection(SafeModel):
    category_id: int
    subcategory_id: int|None=Field(default=None,gt=0)
    service_ids: list[int]=Field(min_length=1,max_length=15)

class CreateApplicationBatch(SafeModel):
    groups: list[ApplicationSelection]=Field(min_length=1,max_length=20)
    provider_id: int|None=Field(default=None,gt=0)

@router.get('/provider-requirements/{service_id}')
def requirements(service_id:int,user:User=Depends(current_user),db:Session=Depends(get_db)):
    active_service(db,service_id);row=current_configuration(db,service_id)
    if not row:raise HTTPException(409,'Requirements have not been published for this service. Please try after administrator review.')
    return configuration_output(row)

@router.post('/provider-applications',status_code=201)
def create(data:CreateApplication,user:User=Depends(current_user),db:Session=Depends(get_db)):
    category=db.get(Category,data.category_id)
    if not category or not category.active:raise HTTPException(404,'Category not found')
    if data.subcategory_id is not None:
        sub=db.get(Subcategory,data.subcategory_id)
        if not sub or not sub.active or sub.category_id!=data.category_id:raise HTTPException(422,'Select a subcategory within the selected category')
    provider=None
    if data.provider_id is not None:
        if not user.seller_enabled:raise HTTPException(403,'Seller capability required')
        provider=db.scalar(select(Provider).where(Provider.id==data.provider_id,Provider.owner_user_id==user.id).with_for_update())
        if not provider:raise HTTPException(404,'Owned business not found')
    if len(set(data.service_ids))!=len(data.service_ids):raise HTTPException(422,'Select each service once')
    rows=[]
    for sid in data.service_ids:
        service=active_service(db,sid)
        if service.category_id!=data.category_id:raise HTTPException(422,'Select services within the selected category')
        if 'subcategory_id' in data.model_fields_set and service.subcategory_id!=data.subcategory_id:raise HTTPException(422,'Select services within the selected subcategory, or choose direct category services')
        if provider and db.get(ProviderService,(provider.id,sid)):raise HTTPException(409,'This business already has a record for this service. Resume its existing application instead of creating a duplicate listing.')
        config=current_configuration(db,sid)
        if not config:raise HTTPException(409,f'Requirements are not published for {service.title}')
        rows.append((sid,config.id))
    count=db.scalar(select(func.count()).select_from(ProviderApplication).where(ProviderApplication.user_id==user.id,ProviderApplication.status=='DRAFT'))
    if count>=20:raise HTTPException(409,'Draft limit reached. Resume an existing application.')
    app=ProviderApplication(id=str(uuid.uuid4()),user_id=user.id,provider_id=provider.id if provider else None,category_id=data.category_id,common={},common_configuration=COMMON.model_dump())
    db.add(app);db.flush()
    for sid,cid in rows:db.add(ProviderApplicationService(application_id=app.id,service_id=sid,requirement_id=cid,answers={}))
    if provider:
        for sid,_ in rows:db.add(ProviderService(provider_id=provider.id,service_id=sid,application_id=app.id,approval_status='PENDING'))
    event(db,app,user,'CREATED');db.commit()
    return detail(db,app,user)

@router.post('/provider-applications/batch',status_code=201)
def create_batch(data:CreateApplicationBatch,user:User=Depends(current_user),db:Session=Depends(get_db)):
    provider=None
    if data.provider_id is not None:
        if not user.seller_enabled:raise HTTPException(403,'Seller capability required')
        provider=db.scalar(select(Provider).where(Provider.id==data.provider_id,Provider.owner_user_id==user.id).with_for_update())
        if not provider:raise HTTPException(404,'Owned business not found')
    seen=set()
    prepared=[]
    for group in data.groups:
        category=db.get(Category,group.category_id)
        if not category or not category.active:raise HTTPException(404,'Category not found')
        if group.subcategory_id is not None:
            sub=db.get(Subcategory,group.subcategory_id)
            if not sub or not sub.active or sub.category_id!=group.category_id:raise HTTPException(422,'Select a subcategory within the selected category')
        if len(set(group.service_ids))!=len(group.service_ids):raise HTTPException(422,'Select each service once')
        rows=[]
        for sid in group.service_ids:
            if sid in seen:raise HTTPException(422,'A service can only appear in one application section')
            seen.add(sid)
            service=active_service(db,sid)
            if service.category_id!=group.category_id:raise HTTPException(422,'Select services within the selected category')
            if 'subcategory_id' in group.model_fields_set and service.subcategory_id!=group.subcategory_id:raise HTTPException(422,'Select services within the selected subcategory, or choose direct category services')
            if provider and db.get(ProviderService,(provider.id,sid)):raise HTTPException(409,'This business already has a record for one of the selected services. Resume its existing application instead of creating a duplicate listing.')
            config=current_configuration(db,sid)
            if not config:raise HTTPException(409,f'Requirements are not published for {service.title}')
            rows.append((sid,config.id))
        prepared.append((group.category_id,rows))
    if not seen:raise HTTPException(422,'Select at least one service')
    count=db.scalar(select(func.count()).select_from(ProviderApplication).where(ProviderApplication.user_id==user.id,ProviderApplication.status=='DRAFT'))
    if count+len(prepared)>20:raise HTTPException(409,'Draft limit reached. Resume an existing application.')
    apps=[]
    for category_id,rows in prepared:
        app=ProviderApplication(id=str(uuid.uuid4()),user_id=user.id,provider_id=provider.id if provider else None,category_id=category_id,common={},common_configuration=COMMON.model_dump())
        db.add(app);db.flush()
        for sid,cid in rows:
            db.add(ProviderApplicationService(application_id=app.id,service_id=sid,requirement_id=cid,answers={}))
            if provider:db.add(ProviderService(provider_id=provider.id,service_id=sid,application_id=app.id,approval_status='PENDING'))
        event(db,app,user,'CREATED',details={'batch_sections':len(prepared)})
        apps.append(app)
    db.commit()
    return [detail(db,app,user) for app in apps]

@router.get('/provider-applications')
def applications(user:User=Depends(current_user),db:Session=Depends(get_db),page:int=Query(1,ge=1)):
    return [summary(a) for a in db.scalars(select(ProviderApplication).where(ProviderApplication.user_id==user.id).order_by(ProviderApplication.created_at.desc()).offset((page-1)*30).limit(30))]

@router.get('/provider-applications/{id}')
def application(id:str,user:User=Depends(current_user),db:Session=Depends(get_db)):return detail(db,owned(db,id,user),user)

class SaveAnswers(SafeModel):
    revision:int
    common:dict
    services:dict[str,dict]

def answer_errors(db,app,data,complete=False,service_filter=None):
    errors=validate_answers(Requirements.model_validate(app.common_configuration),data.common,complete)
    errors=[{**e,'field':'common.'+e['field']} for e in errors]
    rows={str(r.service_id):r for r in selections(db,app)}
    if set(data.services)-set(rows):errors.append({'field':'services','message':'Unknown selected service'})
    for sid,row in rows.items():
        if service_filter is not None and row.service_id not in service_filter:continue
        answers=data.services.get(sid,row.answers)
        cfg=Requirements.model_validate(db.get(ProviderRequirement,row.requirement_id).configuration)
        def authorized(field,id):return db.scalar(select(ProviderDocument.id).where(ProviderDocument.id==id,ProviderDocument.application_id==app.id,ProviderDocument.service_id==row.service_id,ProviderDocument.field_id==field)) is not None
        errors.extend({**e,'field':sid+'.'+e['field']} for e in validate_answers(cfg,answers,complete,authorized))
    return errors

@router.put('/provider-applications/{id}')
def save(id:str,data:SaveAnswers,user:User=Depends(current_user),db:Session=Depends(get_db)):
    app=applicant(db,id,user,data.revision);rows=selections(db,app)
    if any(r.status=='APPROVED' for r in rows) and app.common!=data.common:raise HTTPException(409,'Common business details are frozen after service approval. Ask the reviewer to reopen approved services first.')
    errors=answer_errors(db,app,data)
    if errors:raise HTTPException(422,{'message':'Correct the marked answers before saving','errors':errors})
    for row in rows:
        value=data.services.get(str(row.service_id),row.answers)
        if row.status not in EDITABLE and value!=row.answers:raise HTTPException(409,'Only draft or changes-requested service answers may be edited')
        if row.status in EDITABLE:row.answers=copy.deepcopy(value)
    app.common=copy.deepcopy(data.common);app.revision+=1;app.updated_at=now()
    event(db,app,user,'DRAFT_SAVED');db.commit();return detail(db,app,user)

class ChangeServices(SafeModel):
    revision:int
    service_ids:list[int]=Field(min_length=1,max_length=15)

@router.put('/provider-applications/{id}/services')
def change_services(id:str,data:ChangeServices,user:User=Depends(current_user),db:Session=Depends(get_db)):
    app=applicant(db,id,user,data.revision)
    if app.status!='DRAFT':raise HTTPException(409,'Services can only be changed before the first submission')
    previous=selections(db,app)
    if any(row.status!='DRAFT' for row in previous):raise HTTPException(409,'Services can only be changed before the first review')
    if len(set(data.service_ids))!=len(data.service_ids):raise HTTPException(422,'Select each service once')
    if any(db.get(Service,service_id) is None or db.get(Service,service_id).category_id!=app.category_id for service_id in data.service_ids):
        raise HTTPException(422,'Select services within the application category')
    existing={row.service_id:row for row in previous}
    requested=set(data.service_ids)
    removed=set(existing)-requested
    added=requested-set(existing)
    for sid in removed:
        if app.provider_id:
            grant=db.get(ProviderService,(app.provider_id,sid))
            if grant and (grant.application_id!=app.id or grant.approval_status!='PENDING'):
                raise HTTPException(409,'This service record is no longer an editable application draft')
    configurations={}
    for sid in added:
        service=active_service(db,sid)
        if app.provider_id and db.get(ProviderService,(app.provider_id,sid)):
            raise HTTPException(409,'This business already has a record for a selected service')
        config=current_configuration(db,sid)
        if not config:raise HTTPException(409,f'Requirements are not published for {service.title}')
        configurations[sid]=config.id
    for sid in removed:
        db.delete(existing[sid])
        if app.provider_id:
            grant=db.get(ProviderService,(app.provider_id,sid))
            if grant:db.delete(grant)
    for sid,requirement_id in configurations.items():
        db.add(ProviderApplicationService(application_id=app.id,service_id=sid,requirement_id=requirement_id,answers={}))
        if app.provider_id:db.add(ProviderService(provider_id=app.provider_id,service_id=sid,application_id=app.id,approval_status='PENDING'))
    app.revision+=1;app.updated_at=now()
    event(db,app,user,'SERVICES_CHANGED',details={'added':sorted(added),'removed':sorted(removed)})
    db.commit()
    return detail(db,app,user)

class Submit(SafeModel):
    revision:int
    acknowledge_versions:bool=False

@router.post('/provider-applications/{id}/submit')
def submit(id:str,data:Submit,user:User=Depends(current_user),db:Session=Depends(get_db)):
    app=applicant(db,id,user,data.revision);rows=selections(db,app)
    for row in rows:
        active_service(db,row.service_id)
        if row.required_requirement_id and row.requirement_id!=row.required_requirement_id:raise HTTPException(409,'The reviewer requires a configuration update. Review and adopt that version before resubmitting.')
        latest=current_configuration(db,row.service_id)
        if latest and latest.id!=row.requirement_id and not data.acknowledge_versions:raise HTTPException(409,'New requirements are available. Explicitly keep your pinned versions or adopt the new versions before submitting.')
    errors=answer_errors(db,app,SaveAnswers(revision=app.revision,common=app.common,services={str(r.service_id):r.answers for r in rows}),True)
    if errors:raise HTTPException(422,{'message':'Complete the required information and declarations','errors':errors})
    snapshot={'common':app.common,'common_configuration':app.common_configuration,'services':[serialize(r) for r in rows]}
    for row in rows:
        if row.status in EDITABLE:row.status='SUBMITTED'
    app.submitted_at=now();app.updated_at=now();app.revision+=1;aggregate(db,app)
    event(db,app,user,'SUBMITTED',details=copy.deepcopy(snapshot));db.commit();return detail(db,app,user)

class Adopt(SafeModel):
    revision:int
    requirement_id:int
    acknowledge:bool

@router.post('/provider-applications/{id}/services/{service_id}/version')
def adopt(id:str,service_id:int,data:Adopt,user:User=Depends(current_user),db:Session=Depends(get_db)):
    app=applicant(db,id,user,data.revision);row=db.get(ProviderApplicationService,(id,service_id));new=db.get(ProviderRequirement,data.requirement_id)
    if not row or row.status not in EDITABLE or not data.acknowledge:raise HTTPException(409,'Only editable service answers can explicitly adopt another version')
    if not new or new.service_id!=service_id or new.state!='PUBLISHED' or aware(new.effective_at)>now():raise HTTPException(422,'Choose an effective published version for this service')
    if row.required_requirement_id and row.required_requirement_id!=new.id:raise HTTPException(409,'Adopt the version requested by the reviewer')
    old=db.get(ProviderRequirement,row.requirement_id)
    before=copy.deepcopy(row.answers)
    old_fields={f.id:f.model_dump() for f in fields(Requirements.model_validate(old.configuration))}
    new_fields={f.id:f.model_dump() for f in fields(Requirements.model_validate(new.configuration))}
    # Retain only unchanged questions; previous answers remain in private history.
    row.answers={k:v for k,v in before.items() if k in new_fields and new_fields[k]==old_fields.get(k)}
    row.requirement_id=new.id;row.required_requirement_id=None;app.revision+=1;app.updated_at=now()
    event(db,app,user,'VERSION_ADOPTED',service_id=service_id,details={'previous_requirement_id':old.id,'requirement_id':new.id,'previous_answers':before,'retained_fields':list(row.answers)})
    db.commit();return detail(db,app,user)

class DocumentUpload(SafeModel):
    service_id:int
    field_id:str=Field(pattern=r'^[a-z][a-z0-9_]{0,59}$')
    filename:str=Field(min_length=1,max_length=180)
    media_type:str
    content_base64:str=Field(max_length=2800000)

def inspect_file(data):
    try:content=base64.b64decode(data.content_base64,validate=True)
    except (binascii.Error,ValueError):raise HTTPException(422,'File encoding is invalid') from None
    if not 1<=len(content)<=2*1024*1024:raise HTTPException(422,'Upload a file of at most 2 MB')
    extension=data.filename.lower().rsplit('.',1)[-1]
    kind=None
    if content.startswith(b'%PDF-') and content.rstrip().endswith(b'%%EOF') and not re.search(rb'/(JavaScript|JS|Launch|EmbeddedFile|OpenAction|Encrypt)\b',content):kind=('pdf','application/pdf')
    elif content.startswith(b'\x89PNG\r\n\x1a\n'):
        try:
            offset=8;seen=[];dimensions=None
            while offset<len(content):
                length=struct.unpack('>I',content[offset:offset+4])[0];name=content[offset+4:offset+8];chunk=content[offset+8:offset+8+length];crc=struct.unpack('>I',content[offset+8+length:offset+12+length])[0]
                if len(chunk)!=length or zlib.crc32(name+chunk)&0xffffffff!=crc:raise ValueError()
                if name==b'IHDR':dimensions=struct.unpack('>II',chunk[:8])
                seen.append(name);offset+=length+12
                if name==b'IEND':break
            if seen[0]==b'IHDR' and b'IDAT' in seen and seen[-1]==b'IEND' and offset==len(content) and dimensions and all(0<n<=8000 for n in dimensions) and dimensions[0]*dimensions[1]<=40000000:kind=('png','image/png')
        except (ValueError,struct.error,IndexError):pass
    elif content.startswith(b'\xff\xd8\xff') and content.endswith(b'\xff\xd9'):
        # JPEG SOF dimensions and bounded segments; no SVG/HTML or executable formats.
        try:
            offset=2
            while offset<len(content)-2:
                if content[offset]!=255:break
                marker=content[offset+1];offset+=2
                length=struct.unpack('>H',content[offset:offset+2])[0]
                if length<2 or offset+length>len(content):break
                if marker in (0xc0,0xc1,0xc2):
                    h,w=struct.unpack('>HH',content[offset+3:offset+7])
                    if 0<w<=8000 and 0<h<=8000 and w*h<=40000000:kind=('jpg','image/jpeg')
                    break
                offset+=length
        except (ValueError,struct.error,IndexError):pass
    if not kind or data.media_type!=kind[1] or extension not in ({'jpg','jpeg'} if kind[0]=='jpg' else {kind[0]}):raise HTTPException(422,'Use a valid PDF, JPEG or PNG whose extension and content match. Active or encrypted PDFs are not accepted.')
    return content,kind

@router.post('/provider-applications/{id}/documents',status_code=201)
def upload(id:str,data:DocumentUpload,user:User=Depends(current_user),db:Session=Depends(get_db)):
    app=applicant(db,id,user);row=db.get(ProviderApplicationService,(id,data.service_id))
    if not row or row.status not in EDITABLE:raise HTTPException(409,'This service is not editable')
    config=Requirements.model_validate(db.get(ProviderRequirement,row.requirement_id).configuration)
    if not any(f.id==data.field_id and f.type=='file' for f in fields(config)):raise HTTPException(422,'This configuration does not request that document')
    db.scalar(select(User).where(User.id==user.id).with_for_update())
    count=db.scalar(select(func.count()).select_from(ProviderDocument).join(ProviderApplication).where(ProviderApplication.user_id==user.id))
    if count>=100:raise HTTPException(409,'Private document quota reached. Contact VISTRAH for review.')
    content,kind=inspect_file(data);uid=str(uuid.uuid4())
    doc=ProviderDocument(id=uid,application_id=id,service_id=data.service_id,field_id=data.field_id,filename=uid+'.'+kind[0],media_type=kind[1],sha256=hashlib.sha256(content).hexdigest(),content=content)
    db.add(doc);event(db,app,user,'DOCUMENT_UPLOADED',service_id=data.service_id,details={'document_id':uid});db.commit()
    return {k:getattr(doc,k) for k in ('id','filename','media_type','sha256','created_at')}

@router.get('/provider-applications/{id}/documents/{document_id}')
def download(id:str,document_id:str,user:User=Depends(current_user),db:Session=Depends(get_db)):
    owned(db,id,user);doc=db.get(ProviderDocument,document_id)
    if not doc or doc.application_id!=id:raise HTTPException(404,'Document not found')
    return Response(content=doc.content,media_type=doc.media_type,headers={'Content-Disposition':f'attachment; filename="{doc.filename}"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"})

class RequirementDraft(SafeModel):
    configuration:dict
    change_note:str=Field(min_length=5,max_length=1000)
    effective_at:datetime

def config_errors(value):
    try:Requirements.model_validate(value);return []
    except ValidationError as exc:return [{'field':'.'.join(str(v) for v in e['loc']),'message':e['msg']} for e in exc.errors()]

@router.get('/admin/provider-requirements/{service_id}')
def versions(service_id:int,user:User=Depends(admin_user),db:Session=Depends(get_db)):
    service=db.get(Service,service_id)
    if not service:raise HTTPException(404,'Service not found')
    return [configuration_output(r,True)|{'validation_errors':config_errors(r.configuration),'applications_count':db.scalar(select(func.count()).select_from(ProviderApplicationService).where(ProviderApplicationService.requirement_id==r.id))} for r in db.scalars(select(ProviderRequirement).where(ProviderRequirement.service_id==service_id).order_by(ProviderRequirement.version.desc()))]

@router.post('/admin/provider-requirements/{service_id}/drafts',status_code=201)
def new_draft(service_id:int,user:User=Depends(admin_user),db:Session=Depends(get_db)):
    service=db.scalar(select(Service).where(Service.id==service_id).with_for_update())
    if not service:raise HTTPException(404,'Service not found')
    prior=db.scalar(select(ProviderRequirement).where(ProviderRequirement.service_id==service_id).order_by(ProviderRequirement.version.desc()))
    row=ProviderRequirement(service_id=service_id,version=prior.version+1 if prior else 1,configuration=copy.deepcopy(prior.configuration) if prior else template(service,db.get(Category,service.category_id)),actor_id=user.id,change_note='New draft')
    db.add(row);db.flush()
    db.add(Audit(actor_id=user.id,action='PROVIDER_REQUIREMENTS_CREATE',entity='provider_requirements',entity_id=str(row.id),details={'version':row.version,'service_id':service_id}))
    db.commit();return configuration_output(row,True)

@router.put('/admin/provider-requirements/versions/{id}')
def edit_draft(id:int,data:RequirementDraft,user:User=Depends(admin_user),db:Session=Depends(get_db)):
    row=db.scalar(select(ProviderRequirement).where(ProviderRequirement.id==id).with_for_update())
    if not row:raise HTTPException(404,'Configuration not found')
    if row.state!='DRAFT':raise HTTPException(409,'Published and retired versions are immutable. Create a new draft.')
    if len(json.dumps(data.configuration))>100000:raise HTTPException(422,'Configuration is too large')
    row.configuration=data.configuration;row.change_note=data.change_note;row.effective_at=aware(data.effective_at)
    db.add(Audit(actor_id=user.id,action='PROVIDER_REQUIREMENTS_DRAFT',entity='provider_requirements',entity_id=str(id),details={'version':row.version}))
    db.commit();return configuration_output(row,True)|{'validation_errors':config_errors(row.configuration)}

@router.post('/admin/provider-requirements/validate')
def validate_config(data:dict,user:User=Depends(admin_user)):
    errors=config_errors(data)
    return {'errors':errors,'configuration':Requirements.model_validate(data).model_dump() if not errors else None}

@router.get('/admin/provider-requirements/versions/{id}/history')
def requirement_history(id:int,user:User=Depends(admin_user),db:Session=Depends(get_db)):
    if not db.get(ProviderRequirement,id):raise HTTPException(404,'Configuration not found')
    return [serialize(e) for e in db.scalars(select(Audit).where(Audit.entity=='provider_requirements',Audit.entity_id==str(id)).order_by(Audit.id.desc()).limit(100))]

@router.post('/admin/provider-requirements/versions/{id}/publish')
def publish(id:int,user:User=Depends(admin_user),db:Session=Depends(get_db)):
    row=db.scalar(select(ProviderRequirement).where(ProviderRequirement.id==id).with_for_update())
    if not row:raise HTTPException(404,'Configuration not found')
    if row.state!='DRAFT':raise HTTPException(409,'Only a draft can be published')
    errors=config_errors(row.configuration)
    if errors:raise HTTPException(422,{'message':'Configuration is invalid','errors':errors})
    row.configuration=Requirements.model_validate(row.configuration).model_dump();row.state='PUBLISHED';row.published_at=now();row.actor_id=user.id
    db.add(Audit(actor_id=user.id,action='PROVIDER_REQUIREMENTS_PUBLISH',entity='provider_requirements',entity_id=str(id),details={'version':row.version,'service_id':row.service_id}))
    db.commit();return configuration_output(row,True)

@router.post('/admin/provider-requirements/versions/{id}/retire')
def retire(id:int,user:User=Depends(admin_user),db:Session=Depends(get_db)):
    row=db.scalar(select(ProviderRequirement).where(ProviderRequirement.id==id).with_for_update())
    if not row or row.state!='PUBLISHED':raise HTTPException(409,'Only published versions can be retired')
    db.scalar(select(Service).where(Service.id==row.service_id).with_for_update())
    if db.scalar(select(ProviderApplicationService.application_id).where(ProviderApplicationService.required_requirement_id==id,ProviderApplicationService.requirement_id!=id).limit(1)):
        raise HTTPException(409,'This version is required by an open correction. Complete its explicit adoption before retirement.')
    alternative=db.scalar(select(ProviderRequirement.id).where(ProviderRequirement.service_id==row.service_id,ProviderRequirement.id!=id,ProviderRequirement.state=='PUBLISHED',ProviderRequirement.effective_at<=now()))
    if not alternative:raise HTTPException(409,'Publish an effective replacement first')
    row.state='RETIRED';db.add(Audit(actor_id=user.id,action='PROVIDER_REQUIREMENTS_RETIRE',entity='provider_requirements',entity_id=str(id),details={'version':row.version}));db.commit();return configuration_output(row,True)

@router.get('/admin/provider-applications')
def review_queue(user:User=Depends(admin_user),db:Session=Depends(get_db),page:int=Query(1,ge=1),requirement_id:int|None=None):
    query=select(ProviderApplication)
    if requirement_id is not None:query=query.join(ProviderApplicationService).where(ProviderApplicationService.requirement_id==requirement_id)
    return [{**summary(a),'business':a.common.get('legal_name','Incomplete draft')} for a in db.scalars(query.order_by(ProviderApplication.created_at.desc()).offset((page-1)*30).limit(30))]

@router.get('/admin/provider-applications/{id}')
def review_application(id:str,user:User=Depends(admin_user),db:Session=Depends(get_db)):return detail(db,owned(db,id,user),user)

class Decision(SafeModel):
    revision:int
    status:str=Field(pattern=r'^(UNDER_REVIEW|CHANGES_REQUESTED|APPROVED|REJECTED|SUSPENDED)$')
    reason:str=Field(min_length=10,max_length=2000)
    checklist:dict[str,bool]=Field(default_factory=dict)
    require_current_version:bool=False

def eligible_query(sid):
    return select(Provider).join(ProviderService).where(ProviderService.service_id==sid,ProviderService.approval_status=='APPROVED',Provider.active.is_(True),Provider.verification_status=='VERIFIED')

@router.post('/admin/provider-applications/{id}/services/{service_id}/review')
def review(id:str,service_id:int,data:Decision,user:User=Depends(admin_user),db:Session=Depends(get_db)):
    app=owned(db,id,user,True);row=db.get(ProviderApplicationService,(id,service_id))
    if app.user_id==user.id:raise HTTPException(403,'Another authorized administrator must review your application')
    if not row:raise HTTPException(404,'Application service not found')
    if data.revision!=app.revision:raise HTTPException(409,'Another reviewer changed this application. Reload it.')
    transitions={'SUBMITTED':{'UNDER_REVIEW','CHANGES_REQUESTED','APPROVED','REJECTED'},'UNDER_REVIEW':{'CHANGES_REQUESTED','APPROVED','REJECTED'},'APPROVED':{'SUSPENDED','CHANGES_REQUESTED'},'REJECTED':{'CHANGES_REQUESTED'},'SUSPENDED':{'CHANGES_REQUESTED'}}
    if data.status not in transitions.get(row.status,set()):raise HTTPException(409,'This review transition is not allowed')
    config=Requirements.model_validate(db.get(ProviderRequirement,row.requirement_id).configuration)
    if set(data.checklist)-{c.id for c in config.checklist}:raise HTTPException(422,'Unknown review checklist item')
    provider=None
    if data.status=='APPROVED':
        active_service(db,service_id)
        if any(c.required and data.checklist.get(c.id) is not True for c in config.checklist):raise HTTPException(422,'Complete every required manual verification check before approval')
        # Revalidate submitted evidence rather than trusting the client or membership state.
        errors=answer_errors(db,app,SaveAnswers(revision=app.revision,common=app.common,services={str(r.service_id):r.answers for r in selections(db,app)}),True,{service_id})
        if errors:raise HTTPException(422,{'message':'Application evidence is incomplete','errors':errors})
        db.scalar(select(User).where(User.id==app.user_id).with_for_update())
        pid=app.provider_id or db.scalar(select(Provider.id).where(Provider.owner_user_id==app.user_id).order_by(Provider.id).limit(1))
        provider=db.scalar(select(Provider).where(Provider.id==pid).with_for_update()) if pid else None
        if provider and provider.owner_user_id!=app.user_id:raise HTTPException(409,'Explicit business ownership is required. Legacy businesses need an administrator-reviewed ownership claim; existing applications are preserved.')
        if provider and provider.verification_status in ('INACTIVE','REJECTED'):raise HTTPException(409,'Provider-level suspension or rejection must be resolved before approving another service')
        if not provider:
            provider=Provider(owner_user_id=app.user_id,slug='provider-'+str(uuid.uuid4()),name=app.common['contact_name'],company=app.common['legal_name'],email=app.common['email'],phone=app.common['phone'],address=app.common['address'],location=app.common['location'],provenance='Authenticated provider application '+app.id,verification_status='VERIFIED',verification_evidence='Manual review recorded in provider application history',active=True)
            db.add(provider);db.flush()
            db.get(User,app.user_id).seller_enabled=True
        elif provider.verification_status!='VERIFIED':raise HTTPException(409,'Provider-level verification must be completed first')
        app.provider_id=provider.id
        grant=db.get(ProviderService,(provider.id,service_id))
        if grant and grant.approval_status=='APPROVED' and grant.application_id!=app.id:raise HTTPException(409,'This provider already has an approved grant for this service; reopen that application to change it')
        if not grant:grant=ProviderService(provider_id=provider.id,service_id=service_id);db.add(grant)
        grant.approval_status='APPROVED';grant.application_id=app.id
    elif app.provider_id:
        grant=db.get(ProviderService,(app.provider_id,service_id))
        if grant and grant.application_id==app.id:grant.approval_status='SUSPENDED' if data.status=='SUSPENDED' else 'REJECTED' if data.status=='REJECTED' else 'PENDING'
    if data.status=='CHANGES_REQUESTED' and data.require_current_version:
        current=current_configuration(db,service_id,lock=True)
        if not current:raise HTTPException(409,'Publish an effective configuration before requesting its adoption')
        row.required_requirement_id=current.id
    previous=row.status;row.status=data.status;app.revision+=1;app.updated_at=now();aggregate(db,app)
    event(db,app,user,'REVIEW_DECISION',data.reason,service_id,{'from':previous,'to':row.status,'checklist':data.checklist,'requirement_id':row.requirement_id,'required_requirement_id':row.required_requirement_id})
    db.commit();return detail(db,app,user)

@router.get('/admin/services/{service_id}/eligible-providers')
def eligible(service_id:int,user:User=Depends(admin_user),db:Session=Depends(get_db)):
    active_service(db,service_id)
    return [{'id':p.id,'company':p.company} for p in db.scalars(eligible_query(service_id))]

class LeadAssignment(SafeModel):provider_id:int

class GrantDecision(SafeModel):
    status:str=Field(pattern=r'^(APPROVED|REJECTED|SUSPENDED)$')
    reason:str=Field(min_length=10,max_length=2000)

@router.post('/admin/providers/{provider_id}/services/{service_id}/review')
def legacy_grant(provider_id:int,service_id:int,data:GrantDecision,user:User=Depends(admin_user),db:Session=Depends(get_db)):
    provider=db.scalar(select(Provider).where(Provider.id==provider_id).with_for_update())
    grant=db.get(ProviderService,(provider_id,service_id))
    if not provider or not grant:raise HTTPException(404,'Provider service not found')
    if provider.owner_user_id==user.id:raise HTTPException(403,'Another administrator must review your business service')
    if grant.application_id:raise HTTPException(409,'Review this service through its versioned provider application')
    if data.status=='APPROVED':
        active_service(db,service_id)
        if provider.verification_status!='VERIFIED':raise HTTPException(409,'Complete provider identity verification first')
    grant.approval_status=data.status
    db.add(Audit(actor_id=user.id,action='PROVIDER_SERVICE_REVIEW',entity='provider',entity_id=str(provider_id),details={'service_id':service_id,'status':data.status,'reason':data.reason}));db.commit();return {'status':data.status}

@router.post('/admin/requests/{request_id}/provider',status_code=201)
def assign(request_id:int,data:LeadAssignment,user:User=Depends(admin_user),db:Session=Depends(get_db)):
    request=db.scalar(select(ServiceRequest).where(ServiceRequest.id==request_id).with_for_update())
    if not request:raise HTTPException(404,'Request not found')
    if request.status in ('COMPLETED','CANCELLED'):raise HTTPException(409,'Closed requests cannot receive new assignments')
    active_service(db,request.service_id)
    provider=db.scalar(eligible_query(request.service_id).where(Provider.id==data.provider_id).with_for_update())
    if not provider:raise HTTPException(409,'Only active, manually approved provider services may receive this lead')
    db.add(ProviderLead(request_id=request_id,provider_id=provider.id,service_id=request.service_id,actor_id=user.id));request.status='ASSIGNED'
    db.add(Audit(actor_id=user.id,action='PROVIDER_LEAD_ASSIGNED',entity='service_request',entity_id=str(request_id),details={'provider_id':provider.id,'service_id':request.service_id}));db.commit();return {'assigned':True}

@router.get('/provider-leads')
def leads(user:User=Depends(current_user),db:Session=Depends(get_db)):
    owned_ids=select(Provider.id).where(Provider.owner_user_id==user.id)
    rows=db.scalars(select(ProviderLead).join(ProviderService,(ProviderService.provider_id==ProviderLead.provider_id)&(ProviderService.service_id==ProviderLead.service_id)).join(Provider,Provider.id==ProviderLead.provider_id).where(ProviderLead.provider_id.in_(owned_ids),ProviderService.approval_status=='APPROVED',Provider.active.is_(True),Provider.verification_status=='VERIFIED').order_by(ProviderLead.id.desc()).limit(100))
    result=[]
    for lead in rows:
        try:active_service(db,lead.service_id)
        except HTTPException:continue
        request=db.get(ServiceRequest,lead.request_id)
        if request.status not in ('COMPLETED','CANCELLED'):result.append({'id':lead.id,'request_id':request.id,'service_title':db.get(Service,lead.service_id).title,'requirements':request.requirements,'location':request.location,'postal_code':request.postal_code,'service_address':request.service_address,'phone':request.phone})
    return result
