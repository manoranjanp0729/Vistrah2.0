"""Platform review templates, not assertions of statutory obligations."""
from sqlalchemy import select
from .models import Service, Category, BootstrapState, now
from .provider_models import ProviderRequirement
from .provider_requirements import Requirements

def template(service,category):
    def f(id,label,type='text',**kw):return dict(id=id,label=label,type=type,**kw)
    extra=[]
    if category.slug=='civil-construction':
        extra=[f('project_types','Project types','multi_select',options=['Residential','Commercial','Civil infrastructure','Maintenance','Specialist outdoor systems'],required=True),f('projects','Completed projects','repeatable',allow_na=True,children=[f('project','Project and scope',required=True,min_length=5),f('location','Project location',required=True),f('completed','Completion date','date')]),f('safety','Safety approach and relevant training','textarea',required=True,min_length=10)]
    elif category.slug=='real-estate':
        extra=[f('property_work','Property services and operating experience','textarea',required=True,min_length=20),f('represents_owners','Will you represent owners or publish their property listings?','boolean',required=True),f('authority_document','Evidence of authority to represent or list properties','file',basis='CONDITIONAL',required_if={'field':'represents_owners','value':True},visible_if={'field':'represents_owners','value':True},help='Use a redacted authorization example. VISTRAH reviews it manually.')]
    elif category.slug=='jobs-careers':
        extra=[f('recruitment_activity','Will you recruit for employers or publish job vacancies?','boolean',required=True),f('employer_authority','Evidence of employer or recruitment authority','file',basis='CONDITIONAL',required_if={'field':'recruitment_activity','value':True},visible_if={'field':'recruitment_activity','value':True}),f('candidate_privacy','How do you protect candidate information?','textarea',required=True,min_length=20)]
        if service.slug=='resume-building':extra.append(f('writing_sample','Redacted resume writing sample','file',help='Optional portfolio evidence. Remove candidate personal details.'))
        if service.slug=='interview-preparation':extra.append(f('interview_method','Interview coaching approach','textarea',required=True,min_length=20))
    elif category.slug=='marketing':
        extra=[f('portfolio','Portfolio and campaign experience','textarea',required=True,min_length=20),f('portfolio_evidence','Portfolio evidence','file'),f('team','Team capabilities','textarea')]
    elif category.slug=='tax-compliance':
        extra=[f('qualifications','Relevant qualifications and service scope','textarea',required=True,min_length=10),f('qualification_evidence','Qualification evidence','file',allow_na=True,help='Additional VISTRAH review evidence; explain non-applicability if appropriate.')]
    elif category.slug=='local-professional-services':
        extra=[f('trade_experience','Trade experience and safety practices','textarea',required=True,min_length=20),f('team','Staff, training and supervision','textarea'),f('trade_evidence','Applicable trade or safety evidence','file',allow_na=True)]
    else:
        extra=[f('delivery','Delivery approach and experience','textarea',required=True,min_length=20),f('work_samples','Portfolio or work evidence','file',allow_na=True)]
    registration=[f('registration_applicability','Applicable registrations or practising credentials','select',required=True,options=['Registered','Not applicable','Unsure'],help='Not a claim that registration is mandatory. Choose Unsure if applicability needs reviewer assessment.'),f('registration_details','Registration or credential details','textarea',visible_if={'field':'registration_applicability','value':'Registered'},required_if={'field':'registration_applicability','value':'Registered'},basis='CONDITIONAL',min_length=5),f('registration_evidence','Supporting registration evidence','file',visible_if={'field':'registration_applicability','value':'Registered'},required_if={'field':'registration_applicability','value':'Registered'},basis='CONDITIONAL'),f('applicability_reason','Explain applicability or uncertainty','textarea',visible_if={'field':'registration_applicability','operator':'not_equals','value':'Registered'},required_if={'field':'registration_applicability','operator':'not_equals','value':'Registered'},min_length=10)]
    config=dict(sections=[dict(id='capability',title=service.title+' capability',description='These are VISTRAH manual review requirements, not a list of statutory obligations.',fields=[f('capability','Describe your capability to deliver '+service.title,'textarea',required=True,min_length=20),f('experience','Years of relevant experience','number',required=True,minimum=0,maximum=100)]+extra),dict(id='registrations',title='Registration applicability',fields=registration)],declarations=[dict(id='service_accuracy',label='I confirm this service information and evidence are accurate.'),dict(id='service_authority',label='I am authorized to offer this service and accept manual review before public listing.')],checklist=[dict(id='capability_review',label='Service capability and supporting evidence reviewed'),dict(id='authority_review',label='Applicant authority and document consistency reviewed'),dict(id='registration_review',label='Registration applicability assessed; uncertainty resolved manually before approval'),dict(id='scope_review',label='Service scope, qualifications and safety requirements reviewed where applicable')],notes='Free verified entry; no payment bypasses approval. No government-registry integration is installed. GST and other registrations are not universally mandatory. Review applicability to the service, applicant and operating location before approval.')
    return Requirements.model_validate(config).model_dump()

def initialize(db):
    if db.get(BootstrapState,'provider-requirements-v1'):return
    db.flush()
    for service in db.scalars(select(Service)):
        if not db.scalar(select(ProviderRequirement.id).where(ProviderRequirement.service_id==service.id)):
            db.add(ProviderRequirement(service_id=service.id,version=1,state='PUBLISHED',configuration=template(service,db.get(Category,service.category_id)),effective_at=now(),published_at=now(),change_note='Initial VISTRAH review template; legal applicability remains manual.'))
    db.add(BootstrapState(key='provider-requirements-v1'))
