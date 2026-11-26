"""Integration boundaries for supplied listings and authorised API sources.

An installed adapter must verify authorization, constrain endpoints, enforce network
timeouts, and confirm externally observable receipts before returning success.
"""
from dataclasses import dataclass
from typing import Protocol
from .workflow_schemas import JobInputs, JobListing
from .job_sources import VacancySourceAdapter

@dataclass(frozen=True)
class SourceCapabilities:
    identifier: str
    configured: bool
    authorized: bool
    network_access: bool

class JobSourceAdapter(Protocol):
    capabilities: SourceCapabilities
    def discover(self, inputs: JobInputs) -> list[JobListing]: ...

class ApplicationAdapter(Protocol):
    # Implementations must support the same idempotency key across all attempts,
    # plus receipt lookup after an ambiguous timeout. Blind retries are forbidden.
    def submit(self, *, source_url: str, authorized_input_hash: str, artifacts: list[dict], idempotency_key: str) -> dict: ...
    def receipt(self, *, idempotency_key: str) -> dict | None: ...
    def status(self, *, receipt_id: str) -> dict: ...

class SuppliedJobSource:
    capabilities=SourceCapabilities('customer_supplied_listings',True,True,False)
    def discover(self, inputs: JobInputs) -> list[JobListing]:
        if not inputs.source_permission or not inputs.listings:
            raise ValueError('Authorized user-supplied listings are required')
        return inputs.listings

supplied_source=SuppliedJobSource()
job_source_adapter: JobSourceAdapter | None = None
application_adapter: ApplicationAdapter | None = None
