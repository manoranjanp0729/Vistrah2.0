import ipaddress
import re
from urllib.parse import urlsplit, urlunsplit
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    @model_validator(mode='before')
    @classmethod
    def valid_text(cls, data):
        def check(value):
            if isinstance(value,str):
                try:
                    value.encode('utf-8')
                except UnicodeEncodeError:
                    raise ValueError('Text must contain valid UTF-8 characters') from None
                if any(ord(c)<32 and c not in '\n\r\t' for c in value):
                    raise ValueError('Binary control characters are not supported')
            elif isinstance(value,dict):
                for key,item in value.items(): check(key);check(item)
            elif isinstance(value,(list,tuple)):
                for item in value: check(item)
        check(data)
        return data

def public_url(value):
    parsed = urlsplit(value)
    host = parsed.hostname or ''
    if parsed.scheme not in ('http','https') or not host or parsed.username or parsed.password or parsed.port not in (None,80,443):
        raise ValueError('Use a public HTTP or HTTPS job URL without credentials')
    if host.lower() == 'localhost' or '.' not in host or host.lower().endswith(('.local','.internal')):
        raise ValueError('Use a public source URL')
    try:
        if not ipaddress.ip_address(host).is_global:
            raise ValueError('Private source addresses are not allowed')
    except ValueError as exc:
        if 'Private' in str(exc):
            raise
    return urlunsplit((parsed.scheme.lower(), parsed.netloc.lower(), parsed.path or '/', parsed.query, ''))

class JobListing(Strict):
    title: str = Field(min_length=2, max_length=150)
    company: str = Field(min_length=2, max_length=150)
    location: str = Field(min_length=2, max_length=150)
    arrangement: str = Field(pattern='^(REMOTE|HYBRID|ONSITE)$')
    source_url: str = Field(max_length=1500)
    description: str = Field(min_length=30, max_length=6000)
    salary_min: int | None = Field(default=None, ge=0, le=100000000)
    salary_max: int | None = Field(default=None, ge=0, le=100000000)
    currency: str = Field(default='INR', pattern='^[A-Z]{3}$')
    @field_validator('source_url')
    @classmethod
    def validate_url(cls, value):
        return public_url(value)
    @model_validator(mode='after')
    def salary_range(self):
        if self.salary_min is not None and self.salary_max is not None and self.salary_max < self.salary_min:
            raise ValueError('Salary maximum must be at least the minimum')
        return self

class JobInputs(Strict):
    candidate_name: str = Field(default='', max_length=100)
    resume_text: str = Field(default='', max_length=12000)
    document_id: str | None = Field(default=None, max_length=36)
    target_titles: list[str] = Field(default_factory=list, max_length=10)
    skills: list[str] = Field(default_factory=list, max_length=30)
    experience_years: float | None = Field(default=None, ge=0, le=70)
    locations: list[str] = Field(default_factory=list, max_length=10)
    arrangements: list[str] = Field(default_factory=list, max_length=3)
    salary_expectation: int | None = Field(default=None, ge=0, le=100000000)
    salary_currency: str = Field(default='INR', pattern='^[A-Z]{3}$')
    search_preferences: str = Field(default='', max_length=2000)
    listings: list[JobListing] = Field(default_factory=list, max_length=10)
    source_permission: bool = False
    @field_validator('target_titles','skills','locations','arrangements')
    @classmethod
    def list_values(cls, values, info):
        values = list(dict.fromkeys(v.strip() for v in values))
        if any(not v or len(v)>150 for v in values):
            raise ValueError('Each entry must contain 1 to 150 characters')
        if info.field_name == 'arrangements' and any(v not in ('REMOTE','HYBRID','ONSITE') for v in values):
            raise ValueError('Work arrangement must be REMOTE, HYBRID or ONSITE')
        return values
    @model_validator(mode='after')
    def size(self):
        if len(self.model_dump_json().encode()) > 100000:
            raise ValueError('Workflow input exceeds 100 KB')
        return self

class WorkflowCreate(Strict):
    request_id: int = Field(gt=0)
    template_id: str = 'job-preparation@1'
    idempotency_key: str = Field(min_length=10, max_length=80, pattern=r'^[a-zA-Z0-9_-]+$')
    inputs: JobInputs = Field(default_factory=JobInputs)

class ApprovalDecision(Strict):
    decision: str = Field(pattern='^(APPROVED|REJECTED)$')

class DocumentInput(Strict):
    filename: str = Field(min_length=5, max_length=150)
    text: str = Field(min_length=30, max_length=12000)
    @field_validator('filename')
    @classmethod
    def name(cls, value):
        if not re.fullmatch(r'[\w .()-]+\.txt', value, re.IGNORECASE):
            raise ValueError('Upload a plain UTF-8 .txt resume; paths are not allowed')
        return value
    @field_validator('text')
    @classmethod
    def content(cls, value):
        if any(ord(c)<32 and c not in '\n\r\t' for c in value):
            raise ValueError('Binary documents are not supported')
        return value

class ApplicationUpdate(Strict):
    source_url: str = Field(max_length=1500)
    status: str = Field(pattern='^(SAVED|APPLIED|INTERVIEW|OFFER|REJECTED|WITHDRAWN)$')
    @field_validator('source_url')
    @classmethod
    def url(cls, value):
        return public_url(value)
