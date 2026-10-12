from alembic import context
from app.database import engine, Base
from app import models
from app import workflow_models
from app import discovery_models
from app import provider_models
from app import employer_job_models

with engine.connect() as connection:
    context.configure(connection=connection, target_metadata=Base.metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()

