# VISTRA

Vistra is a multi-service platform where users select a service, submit requirements/documents, review the request, pay when applicable, and track work.

## Included MVP
- Responsive web app (Next.js)
- Mobile app starter (Flutter)
- FastAPI backend
- PostgreSQL schema + seed data
- Referral program: both users receive 20% off after the referred user's first work is completed
- Docker Compose local development
- Terraform starter for AWS cost-conscious deployment
- GitHub Actions CI
- Service categories and dynamic requirement templates
- Application/status/payment/referral data model

## Core user journey
Home -> Service -> Requirements -> Confirm & Pay -> Work Started -> My Applications

## Local development

### Backend
```bash
cd backend/api
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Web
```bash
cd apps/web
npm install
npm run dev
```

### PostgreSQL + API
```bash
docker compose up --build
```

Copy `.env.example` to `.env` and replace secrets before using external services.

## Production note
This repository is a production-oriented MVP foundation, not a claim that every payment, tax, legal, security, AWS IAM, backup and compliance setting is production-certified. Review and test those areas before accepting real customer payments or sensitive documents.


## One-command local demo

Prerequisite: Docker Desktop.

From the repository root:

```bash
docker compose up --build
```

Open:
- Web: http://localhost:3000
- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

PostgreSQL automatically runs `database/init/01-schema.sql` and `02-seed.sql` on the first creation of the database volume.

If you change the schema/seed scripts and need a clean database:

```bash
docker compose down -v
docker compose up --build
```

The demo currently uses a fixed local user id (`local-demo-user`) so the complete service/application flow can be tested before Cognito authentication is wired in.
