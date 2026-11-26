from datetime import timedelta
from .database import SessionLocal
from .models import now
from .workflow_models import WorkflowWorker
from .workflow_engine import aware

if __name__=='__main__':
    with SessionLocal() as db:
        row=db.get(WorkflowWorker,'compose-worker')
        raise SystemExit(0 if row and aware(row.heartbeat_at)>now()-timedelta(seconds=15) else 1)
