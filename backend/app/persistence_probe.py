"""Read-only database fingerprint for local restart verification."""
import hashlib
import json
from sqlalchemy import select
from .database import SessionLocal
from .models import User, ServiceRequest, Payment, Membership, Provider, Offer, Category
from .catalogue import catalogue, serialize
from .discovery_models import JobSource, Vacancy, VacancyProvenance, Acquisition, AcquisitionSource
from .workflow_models import WorkflowRun, ActionRun, WorkflowApproval, ExecutionAttempt, WorkflowEvidence, WorkflowEvent, WorkflowDocument, ApplicationRecord

if __name__ == '__main__':
    with SessionLocal() as db:
        records={model.__tablename__: [serialize(row) for row in db.scalars(select(model).order_by(list(model.__table__.primary_key)[0]))] for model in [User,ServiceRequest,Payment,Membership,Provider,Offer,Category,WorkflowRun,ActionRun,WorkflowApproval,ExecutionAttempt,WorkflowEvidence,WorkflowEvent,WorkflowDocument,ApplicationRecord,JobSource,Vacancy,VacancyProvenance,Acquisition,AcquisitionSource]}
        fingerprint=hashlib.sha256(json.dumps(records,sort_keys=True,default=str).encode()).hexdigest()
        print(json.dumps({'counts':{table:len(rows) for table,rows in records.items()},'fingerprint':fingerprint}))
