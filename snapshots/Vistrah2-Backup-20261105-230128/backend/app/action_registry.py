"""Versioned preparation and authorised API discovery. No applications submitted."""
import re
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
from pydantic import BaseModel, ConfigDict, Field
from .workflow_schemas import JobInputs, JobListing
from .workflow_integrations import supplied_source

class ListingsResult(BaseModel):
    model_config = ConfigDict(extra='forbid')
    listings: list[JobListing]
    removed_duplicates: int = 0

class RankedJob(BaseModel):
    listing: JobListing
    score: int = Field(ge=0, le=100)
    explanation: list[str]
    matched_skills: list[str]

class RankingResult(BaseModel):
    matches: list[RankedJob]
    method: str

class Artifact(BaseModel):
    source_url: str
    title: str
    kind: str
    text: str

class DraftResult(BaseModel):
    artifacts: list[Artifact]
    disclaimer: str

class ChecklistResult(BaseModel):
    checklists: list[dict]

def supplied_listings(inputs, dependencies):
    return {'listings': [job.model_dump() for job in supplied_source.discover(JobInputs.model_validate(inputs))], 'removed_duplicates': 0}

def normalize(inputs, dependencies):
    seen=set(); listings=[]
    incoming=dependencies['jobs.import@1']['listings']
    for listing in incoming:
        url=urlsplit(listing['source_url'])
        query=urlencode(sorted((k,v) for k,v in parse_qsl(url.query) if not k.lower().startswith('utm_')))
        canonical=urlunsplit((url.scheme,url.netloc,url.path.rstrip('/') or '/',query,''))
        key=(canonical,listing['title'].casefold(),listing['company'].casefold())
        if key in seen:
            continue
        seen.add(key); listings.append({**listing,'source_url':canonical})
    return {'listings':listings,'removed_duplicates':len(incoming)-len(listings)}

def contains(text, phrase):
    return re.search(r'(?<!\w)'+re.escape(phrase.casefold())+r'(?!\w)',text.casefold()) is not None

def rank(inputs, dependencies):
    matches=[]
    for job in dependencies['jobs.normalize@1']['listings']:
        text=job['title']+' '+job['description']
        skills=[s for s in inputs['skills'] if contains(text,s)]
        skills_points=round(50*len(skills)/max(len(inputs['skills']),1))
        title_match=any(contains(job['title'], title) for title in inputs['target_titles'])
        location_match=any(contains(job['location'], place) for place in inputs['locations']) or (job['arrangement']=='REMOTE' and 'REMOTE' in inputs['arrangements'])
        arrangement_match=job['arrangement'] in inputs['arrangements']
        salary=inputs.get('salary_expectation')
        salary_known=salary is not None and job.get('salary_max') is not None and job['currency']==inputs['salary_currency']
        salary_match=salary_known and job['salary_max']>=salary
        score=skills_points+20*title_match+10*location_match+10*arrangement_match+10*salary_match
        reasons=[f'Skills: {len(skills)}/{len(inputs["skills"])} keyword matches (+{skills_points}/50).',f'Target title: {"matched" if title_match else "not matched"} (+{20*title_match}/20).',f'Location or remote preference: {"matched" if location_match else "not matched"} (+{10*location_match}/10).',f'Work arrangement: {"matched" if arrangement_match else "not matched"} (+{10*arrangement_match}/10).',f'Salary: {"meets expectation" if salary_match else "below expectation" if salary_known else "unknown or different currency"} (+{10*salary_match}/10).','Experience eligibility requires your review; years and search notes are preserved, but requirements are not inferred.']
        matches.append({'listing':job,'score':score,'explanation':reasons,'matched_skills':skills})
    return {'matches':sorted(matches,key=lambda row:(-row['score'],row['listing']['source_url'])),'method':'Deterministic keyword and preference scoring, not a prediction of hiring success.'}

def drafts(inputs, dependencies):
    artifacts=[]
    for match in dependencies['jobs.rank@1']['matches']:
        job=match['listing']; shared=', '.join(match['matched_skills']) or 'No keyword overlap identified; review suitability.'
        resume=f'{inputs["candidate_name"]}\nTarget: {job["title"]} at {job["company"]}\nUser-reported experience: {inputs["experience_years"]} years\nRelevant supplied skills: {shared}\n\nSUPPLIED PROFILE (unchanged facts)\n{inputs["resume_text"]}\n\nREVIEW BEFORE USE\nConfirm every statement, tailor work examples from your actual experience, and check the vacancy is current.'
        letter=f'Dear hiring team at {job["company"]},\n\nI would like to be considered for the {job["title"]} role. Based on the profile I supplied, relevant skills include: {shared}\n\n[Add a verified example of your work and why this role interests you.]\n[Confirm availability, location and any required qualifications.]\n\nRegards,\n{inputs["candidate_name"]}'
        for kind,text in [('Resume draft',resume),('Cover-letter draft',letter)]:
            artifacts.append({'source_url':job['source_url'],'title':f'{kind}: {job["title"]} — {job["company"]}','kind':kind,'text':text})
    return {'artifacts':artifacts,'disclaimer':'Rule-based preparation drafts using supplied facts. Review placeholders and accuracy. Nothing has been submitted.'}

def checklist(inputs, dependencies):
    return {'checklists':[{'title':f'{m["listing"]["title"]} — {m["listing"]["company"]}','source_url':m['listing']['source_url'],'items':['Open the source and confirm this vacancy is current.','Verify employer identity and eligibility requirements.','Review resume facts and cover-letter placeholders.','Check salary, location, work arrangement and consent to data sharing.','Submit yourself through the employer’s authorized channel. VISTRAH has no submission integration.','Record your application status in VISTRAH Finds after submission.']} for m in dependencies['jobs.rank@1']['matches']]}

HANDLERS={'supplied_listings':supplied_listings,'normalize':normalize,'rank':rank,'drafts':drafts,'checklist':checklist}
RESULT_MODELS={'supplied_listings':ListingsResult,'normalize':ListingsResult,'rank':RankingResult,'drafts':DraftResult,'checklist':ChecklistResult}
INPUT_MODELS={handler:JobInputs for handler in HANDLERS}

def definition(identifier,name,description,handler=None,prerequisites=(),required=(),approval=False,integration=None,categories=('jobs-careers',)):
    return {'id':identifier+'@1','identifier':identifier,'version':1,'name':name,'description':description,'categories':list(categories),'required_inputs':list(required),'input_schema':INPUT_MODELS[handler].model_json_schema() if handler else {},'prerequisites':list(prerequisites),'handler':handler,'integrations':[integration] if integration else [],'permissions':['customer_owned_request']+(['explicit_customer_approval'] if approval else []),'requires_approval':approval,'risk':'PERSONAL_DATA' if handler=='drafts' else 'LOW' if handler else 'EXTERNAL','side_effect':'INTERNAL_ARTIFACT' if handler else 'EXTERNAL_SUBMISSION' if identifier=='jobs.submit' else 'EXTERNAL_READ','timeout_seconds':30,'max_attempts':3 if handler else 0,'retry_policy':'MANUAL_OR_INTERRUPTED_INTERNAL_ONLY' if handler else 'NONE','result_schema':RESULT_MODELS[handler].model_json_schema() if handler else {},'evidence_requirements':['User-supplied public source URL','Recorded discovery timestamp'] if handler else ['Integration confirmation required'],'enabled':bool(handler),'executable':bool(handler),'availability':'AVAILABLE' if handler else 'AWAITING_CONFIGURATION','configuration_note':'' if handler else 'No authorized integration or execution handler is configured.'}

DEFINITIONS=[
    definition('jobs.import','Use supplied vacancies','Validate job descriptions and source links you have permission to provide. Links are not fetched.','supplied_listings',required=('listings','source_permission')),
    definition('jobs.normalize','Normalize and deduplicate','Remove duplicate supplied vacancies and tracking parameters.','normalize',('jobs.import@1',)),
    definition('jobs.rank','Rank and explain matches','Score supplied jobs against your skills, titles, location, arrangement and salary preferences.','rank',('jobs.normalize@1',),('target_titles','skills','locations','arrangements','experience_years')),
    definition('jobs.drafts','Prepare resume and cover-letter drafts','Create editable text drafts from your supplied facts. Your approval covers these jobs and this profile only.','drafts',('jobs.rank@1',),('candidate_name','resume_text'),True),
    definition('jobs.checklist','Create application checklists','Build role-specific review steps. Applications are not submitted.','checklist',('jobs.rank@1','jobs.drafts@1')),
    definition('jobs.discover','Discover vacancies from a job source','Requires an authorized job-source adapter.',integration='job_source'),
    definition('jobs.submit','Submit an external application','Requires an authorized application adapter and explicit approval.',approval=True,integration='application_submission'),
    definition('jobs.track','Synchronize application status','Requires an authorized application tracking adapter.',integration='application_tracking'),
]
for identifier,name,categories in [('property.discover','Real estate buyer and lead discovery',('real-estate',)),('procurement.research','Tender and procurement research',('civil-construction',)),('marketing.prospects','Marketing prospect research',('marketing',)),('compliance.prepare','Tax and compliance preparation',('tax-compliance',)),('consulting.prepare','Business and consulting preparation',('business-services',)),('technology.execute','IT and technology tasks',('it-technology',)),('local.discover','Local and professional service discovery',('local-professional-services',))]:
    planned=definition(identifier,name,'Planned integration boundary; no executable handler is installed.',integration=identifier,categories=categories)
    planned['availability']='DISABLED_UNSUPPORTED'
    planned['configuration_note']='Planned only: an authorized adapter, handler and validation tests must be implemented before enablement.'
    planned['id']=identifier+'@2'
    planned['version']=2
    DEFINITIONS.append(planned)
REGISTRY={item['id']:item for item in DEFINITIONS}
TEMPLATES={'job-preparation@1':{'id':'job-preparation@1','name':'Job discovery and application preparation','version':1,'categories':['jobs-careers'],'actions':[d['id'] for d in DEFINITIONS if d['handler']],'description':'Prepare applications from vacancies you supply. Automated discovery and submission require configuration.'}}

# Add a new immutable contract after constructing the original template. Old
# persisted definitions and approval scopes retain their exact specifications.
from .discovery_schemas import DiscoveryInputs, DiscoveryResult
INPUT_MODELS['discover_api'] = DiscoveryInputs
RESULT_MODELS['discover_api'] = DiscoveryResult
HANDLERS['discover_api'] = None  # Context-aware dispatch in the same engine.
discovery = definition('jobs.discover','Discover and match real vacancies','Acquire authorized API listings, preserve provenance and explain profile matches. No applications are submitted.','discover_api',required=('sources','target_titles','locations','arrangements'),integration='job_source')
discovery.update(id='jobs.discover@2',version=2,side_effect='EXTERNAL_READ',retry_policy='PERSISTED_SOURCE_PROGRESS',evidence_requirements=['Provider source ID and URL','Actual successful retrieval timestamp'],configuration_note='Remotive shared public feed; Adzuna requires environment credentials and permitted access.')
REGISTRY[discovery['id']] = discovery
TEMPLATES['job-discovery@2'] = {'id':'job-discovery@2','name':'Real vacancy discovery','version':2,'categories':['jobs-careers'],'actions':['jobs.discover@2'],'description':'Search configured APIs using a shared public Remotive feed or authorized Adzuna access. Your profile and match explanations remain private. Listings are publicly readable at /jobs.'}

def missing_inputs(inputs, action=None, action_ids=None):
    definitions=[REGISTRY[key] for key in action_ids] if action_ids is not None else [d for d in DEFINITIONS if d['handler']]
    required=action['required_inputs'] if action else list(dict.fromkeys(key for d in definitions for key in d['required_inputs']))
    return [key for key in required if inputs.get(key) is None or inputs.get(key)=='' or inputs.get(key)==[] or inputs.get(key) is False or (key=='resume_text' and len(inputs.get(key,'').strip())<30)]
