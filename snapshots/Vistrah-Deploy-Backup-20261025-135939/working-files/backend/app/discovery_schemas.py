from pydantic import Field, field_validator
from .workflow_schemas import JobInputs, Strict, public_url

class DiscoveryInputs(JobInputs):
    sources: list[str] = Field(default_factory=lambda: ['remotive'], min_length=1, max_length=2)
    result_limit: int = Field(default=20, ge=1, le=50)
    max_pages: int = Field(default=2, ge=1, le=3)

    @field_validator('sources')
    @classmethod
    def sources_known(cls, values):
        if len(set(values)) != len(values) or any(v not in ('remotive', 'adzuna') for v in values):
            raise ValueError('Select distinct registered job sources')
        return values

    @field_validator('listings')
    @classmethod
    def no_supplied_listings(cls, values):
        if values:
            raise ValueError('Use the preparation template for supplied vacancies')
        return values

class DiscoveryCreate(Strict):
    request_id: int = Field(gt=0)
    template_id: str = Field(default='job-discovery@2', pattern='^job-discovery@2$')
    idempotency_key: str = Field(min_length=10, max_length=80, pattern=r'^[a-zA-Z0-9_-]+$')
    inputs: DiscoveryInputs = Field(default_factory=DiscoveryInputs)

class NormalizedVacancy(Strict):
    source: str
    source_record_id: str = Field(min_length=1, max_length=150)
    title: str = Field(min_length=2, max_length=300)
    employer: str | None = Field(default=None, max_length=300)
    description: str = Field(max_length=12000)
    required_skills: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    location: str | None = Field(default=None, max_length=300)
    arrangement: str | None = Field(default=None, pattern='^(REMOTE|HYBRID|ONSITE)$')
    employment_type: str | None = None
    salary_min: float | None = Field(default=None, ge=0)
    salary_max: float | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, pattern='^[A-Z]{3}$')
    salary_text: str | None = Field(default=None, max_length=500)
    published_at: str | None = None
    deadline: str | None = None
    source_url: str = Field(max_length=1500)
    attribution: str = Field(max_length=100)
    status: str = 'SOURCE_LISTED'

    @field_validator('source_url')
    @classmethod
    def url(cls, value):
        return public_url(value)

class DiscoveryResult(Strict):
    acquisition_id: str
    status: str
    search_time: str
    sources: list[dict]
    retrieved_count: int
    deduplicated_count: int
    removed_duplicates: int
    matches: list[dict]
    missing_profile: list[str]
    method: str
    next_action: str

class SourceToggle(Strict):
    enabled: bool

class AdminAcquisition(Strict):
    idempotency_key: str = Field(min_length=10, max_length=80, pattern=r'^[a-zA-Z0-9_-]+$')

class PrepareSelection(AdminAcquisition):
    vacancy_ids: list[str] = Field(min_length=1, max_length=10)
