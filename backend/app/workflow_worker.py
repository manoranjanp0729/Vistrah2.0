"""Compose worker. Leases and outcomes are committed separately from execution."""
import logging
import signal
import time
from sqlalchemy import select
from .database import SessionLocal
from .models import now
from .workflow_models import WorkflowWorker
from .workflow_engine import claim, execute, finish

running=True
def stop(signum, frame):
    global running
    running=False

def tick():
    with SessionLocal() as db:
        worker=db.get(WorkflowWorker,'compose-worker')
        if worker is None: db.add(WorkflowWorker(id='compose-worker',heartbeat_at=now()))
        else: worker.heartbeat_at=now()
        db.commit()
        payload=claim(db)
    if payload:
        result,error,elapsed=execute(payload)
        with SessionLocal() as db: finish(db,payload,result,error,elapsed)
        return True
    return False

if __name__=='__main__':
    signal.signal(signal.SIGTERM,stop);signal.signal(signal.SIGINT,stop)
    while running:
        try:
            if not tick(): time.sleep(1)
        except Exception as exc:
            logging.error('Workflow worker iteration failed (%s)',type(exc).__name__)
            time.sleep(2)
