"""Optional real-source smoke. Explicit --live flag; no fixture/fallback results."""
import argparse
import json
import time
from sqlalchemy import select
from .database import SessionLocal
from .models import User, Service, Category, ServiceRequest
from .workflow_models import WorkflowRun, ActionRun
from .discovery_schemas import DiscoveryCreate, DiscoveryInputs
from .discovery_service import ADAPTERS
from . import workflow_engine as engine

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--live',action='store_true',required=True)
    parser.add_argument('--source',choices=list(ADAPTERS),default='remotive')
    args=parser.parse_args()
    with SessionLocal() as db:
        admin=db.scalar(select(User).where(User.role=='ADMIN').order_by(User.id))
        service=db.scalar(select(Service).join(Category).where(Category.slug=='jobs-careers',Service.active.is_(True)).order_by(Service.id))
        if admin is None or service is None: raise SystemExit('An existing administrator and active career service are required.')
        request=ServiceRequest(user_id=admin.id,service_id=service.id,requirements='Optional live API smoke: acquire genuine public vacancies.',location='Worldwide',phone='')
        db.add(request);db.flush()
        inputs=DiscoveryInputs(target_titles=['*'],locations=['Worldwide'],arrangements=['REMOTE','HYBRID','ONSITE'],sources=[args.source],result_limit=5,max_pages=1)
        data=DiscoveryCreate(request_id=request.id,idempotency_key='smoke_'+engine.uid(),inputs=inputs)
        run=engine.create(db,admin,data,inputs.model_dump());engine.start(db,run,admin);run_id=run.id
    deadline=time.monotonic()+60
    while time.monotonic()<deadline:
        with SessionLocal() as db:
            run=db.get(WorkflowRun,run_id)
            action=db.scalar(select(ActionRun).where(ActionRun.workflow_id==run_id))
            if run.status in ('COMPLETED','FAILED','PARTIALLY_COMPLETED','CANCELLED'):
                result=action.result or {}
                print(json.dumps({'workflow_id':run_id,'workflow_status':run.status,'acquisition_status':result.get('status'),'retrieved_count':result.get('retrieved_count'),'displayed_matches':len(result.get('matches',[])),'sources':result.get('sources',[]),'error':action.error}))
                return 0 if result.get('status')=='COMPLETE' else 1
        time.sleep(1)
    raise SystemExit('Worker did not finish within the smoke-check window.')

if __name__=='__main__':
    raise SystemExit(main())
