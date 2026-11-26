"""Bounded declarative configurations. No administrator code or regex executes."""
import json
import re
from datetime import date
from typing import Literal, Any
from pydantic import BaseModel, ConfigDict, Field, model_validator

class SafeModel(BaseModel):
    model_config=ConfigDict(extra='forbid',str_strip_whitespace=True,allow_inf_nan=False)

class Condition(SafeModel):
    field: str=Field(pattern=r'^[a-z][a-z0-9_]{0,59}$')
    operator: Literal['equals','not_equals','includes']='equals'
    value: str|bool|int

class RequirementField(SafeModel):
    id: str=Field(pattern=r'^[a-z][a-z0-9_]{0,59}$')
    label: str=Field(min_length=1,max_length=150)
    type: Literal['text','textarea','number','date','select','single_choice','multi_select','boolean','address','service_area','file','repeatable']
    description: str=Field(default='',max_length=1000)
    help: str=Field(default='',max_length=1000)
    required: bool=False
    allow_na: bool=False
    basis: Literal['VISTRAH_REVIEW','CONDITIONAL','LEGAL']='VISTRAH_REVIEW'
    legal_basis: str=Field(default='',max_length=1000)
    options: list[str]=Field(default_factory=list,max_length=50)
    visible_if: Condition|None=None
    required_if: Condition|None=None
    min_length: int=Field(default=0,ge=0,le=5000)
    max_length: int=Field(default=2000,ge=1,le=5000)
    minimum: float|None=None
    maximum: float|None=None
    format: Literal['plain','email','phone','url']='plain'
    error_message: str=Field(default='',max_length=200)
    children: list['RequirementField']=Field(default_factory=list,max_length=15)
    @model_validator(mode='after')
    def valid(self):
        if self.min_length>self.max_length:raise ValueError('Minimum length exceeds maximum')
        if self.minimum is not None and self.maximum is not None and self.minimum>self.maximum:raise ValueError('Invalid number range')
        if self.basis=='LEGAL' and not self.legal_basis.strip():raise ValueError('Legal requirements need an established basis and reference')
        if self.type in ('select','single_choice','multi_select') and (not self.options or len(set(self.options))!=len(self.options) or any(not o.strip() or len(o)>150 for o in self.options)):raise ValueError('Choice fields require unique, non-empty permitted values')
        if self.type=='repeatable':
            if not self.children or any(c.type in ('repeatable','file') for c in self.children):raise ValueError('Groups need fields; nested groups and group uploads are unsupported')
            validate_order(self.children)
        elif self.children:raise ValueError('Only repeatable groups have children')
        return self

def validate_order(fields):
    previous={}
    for field in fields:
        if field.id in previous:raise ValueError('Field identifiers must be unique')
        for condition in (field.visible_if,field.required_if):
            if condition:
                parent=previous.get(condition.field)
                if not parent:raise ValueError('Conditions must reference a previous field')
                if parent.type in ('file','repeatable'):raise ValueError('Invalid condition source type')
                if condition.operator=='includes' and parent.type not in ('multi_select','service_area'):raise ValueError('Includes requires a multi-value source')
                if parent.type=='boolean' and type(condition.value) is not bool:raise ValueError('Boolean conditions require true or false')
                if parent.type in ('select','single_choice','multi_select') and condition.value not in parent.options:raise ValueError('Condition value is outside source choices')
        previous[field.id]=field

class Section(SafeModel):
    id: str=Field(pattern=r'^[a-z][a-z0-9_]{0,59}$')
    title: str=Field(min_length=1,max_length=150)
    description: str=Field(default='',max_length=1000)
    fields: list[RequirementField]=Field(min_length=1,max_length=30)

class Declaration(SafeModel):
    id: str=Field(pattern=r'^[a-z][a-z0-9_]{0,59}$')
    label: str=Field(min_length=1,max_length=1000)
    required: bool=True

class Requirements(SafeModel):
    sections: list[Section]=Field(min_length=1,max_length=12)
    declarations: list[Declaration]=Field(min_length=1,max_length=10)
    checklist: list[Declaration]=Field(min_length=1,max_length=20)
    notes: str=Field(default='',max_length=2000)
    @model_validator(mode='after')
    def valid(self):
        if len(set(s.id for s in self.sections))!=len(self.sections):raise ValueError('Duplicate section ID')
        fields=[f for section in self.sections for f in section.fields]
        if len(fields)>100:raise ValueError('Maximum 100 fields per service')
        validate_order(fields)
        ids=[f.id for f in fields]+[d.id for d in self.declarations]
        if len(set(ids))!=len(ids):raise ValueError('Duplicate field or declaration ID')
        if len(set(d.id for d in self.checklist))!=len(self.checklist):raise ValueError('Duplicate checklist ID')
        if not any(d.required for d in self.declarations) or not any(d.required for d in self.checklist):raise ValueError('A required declaration and review check are necessary')
        if len(json.dumps(self.model_dump()))>100000:raise ValueError('Configuration too large')
        return self

def condition_matches(condition,answers):
    if not condition:return True
    value=answers.get(condition.field)
    if isinstance(value,dict) or value is None:return False
    if condition.operator=='equals':return type(value)==type(condition.value) and value==condition.value
    if condition.operator=='not_equals':return not(type(value)==type(condition.value) and value==condition.value)
    return isinstance(value,list) and condition.value in value

def fields(config):return [f for section in config.sections for f in section.fields]

def validate_answers(config,answers,complete=False,document_check=None):
    errors=[]
    def problem(path,field,message):errors.append({'field':path,'message':field.error_message or message})
    def check(definitions,values,prefix=''):
        effective={}
        allowed={f.id for f in definitions}
        for key in values:
            if key not in allowed:errors.append({'field':prefix+key,'message':'Unknown answer field'})
        for f in definitions:
            value=values.get(f.id);path=prefix+f.id
            visible=condition_matches(f.visible_if,effective)
            needed=visible and (f.required or (f.required_if is not None and condition_matches(f.required_if,effective)))
            if visible:effective[f.id]=value
            # Hidden retained values are still type/ownership checked, but never required.
            if value is None or (isinstance(value,str) and not value.strip()) or value==[]:
                if complete and needed:problem(path,f,f'{f.label} is required')
                continue
            if isinstance(value,dict) and value.get('not_applicable') is True:
                if not f.allow_na or set(value)!={'not_applicable','reason'} or not isinstance(value.get('reason'),str) or not 5<=len(value['reason'].strip())<=500:problem(path,f,'Not applicable needs permission and a reason of 5–500 characters')
                continue
            if f.type=='repeatable':
                if not isinstance(value,list) or len(value)>10 or any(not isinstance(v,dict) for v in value):problem(path,f,'Use at most 10 group entries')
                else:
                    for i,row in enumerate(value):check(f.children,row,path+f'.{i}.')
            elif f.type=='number':
                if type(value) not in (int,float) or not -1e12<=value<=1e12 or (f.minimum is not None and value<f.minimum) or (f.maximum is not None and value>f.maximum):problem(path,f,'Enter a number within the permitted range')
            elif f.type=='boolean':
                if type(value) is not bool:problem(path,f,'Choose yes or no')
            elif f.type in ('multi_select','service_area'):
                if not isinstance(value,list) or len(value)>30 or any(not isinstance(v,str) or not v.strip() or len(v)>150 or (f.options and v not in f.options) for v in value) or len(set(value))!=len(value):problem(path,f,'Choose valid, unique service areas or permitted values')
            elif f.type=='file':
                if not isinstance(value,str) or not document_check or not document_check(f.id,value):problem(path,f,'Upload an authorized document for this application and field')
            elif not isinstance(value,str) or not f.min_length<=len(value.strip())<=f.max_length:problem(path,f,f'Enter {f.min_length}–{f.max_length} characters')
            elif f.type in ('select','single_choice') and value not in f.options:problem(path,f,'Choose a permitted value')
            elif f.type=='date':
                try:date.fromisoformat(value)
                except ValueError:problem(path,f,'Enter a valid ISO calendar date')
            elif f.format=='email' and not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',value):problem(path,f,'Enter a valid email address')
            elif f.format=='phone' and not re.fullmatch(r'\+?[0-9 ()-]{10,20}',value):problem(path,f,'Enter a valid contact number')
            elif f.format=='url' and not re.fullmatch(r'https?://[^\s/]+(?:/[^\s]*)?',value):problem(path,f,'Use an http or https website address')
    definitions=fields(config)+[RequirementField(id=d.id,label=d.label,type='boolean',required=d.required) for d in config.declarations]
    check(definitions,answers)
    if complete:
        for d in config.declarations:
            if d.required and answers.get(d.id) is not True:errors.append({'field':d.id,'message':'This declaration must be accepted'})
    return errors

COMMON=Requirements(sections=[Section(id='business',title='Applicant and business',fields=[
    RequirementField(id='legal_name',label='Legal business or individual name',type='text',required=True,min_length=2,max_length=150),
    RequirementField(id='structure',label='Business structure',type='select',options=['Individual','Sole proprietor','Partnership','Company','Other'],required=True),
    RequirementField(id='contact_name',label='Authorized contact name',type='text',required=True,min_length=2,max_length=150),
    RequirementField(id='email',label='Business email',type='text',format='email',required=True,max_length=254),
    RequirementField(id='phone',label='Business contact number',type='text',format='phone',required=True,max_length=20),
    RequirementField(id='address',label='Business address',type='address',required=True,min_length=5),
    RequirementField(id='location',label='Primary operating location',type='text',required=True,min_length=2,max_length=150),
    RequirementField(id='service_areas',label='Service areas',type='service_area',required=True,help='Enter towns, districts or regions; one per line.'),
    RequirementField(id='website',label='Business website',type='text',format='url'),
])],declarations=[Declaration(id='accuracy',label='I confirm these details are accurate and I am authorized to apply.'),Declaration(id='consent',label='I consent to VISTRAH using these details and documents for manual provider review.')],checklist=[Declaration(id='identity',label='Applicant identity and authority reviewed')])
