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

### Windows / Codex workspace

With Node.js 22 or newer and Docker Desktop installed and running, use the workspace helper from PowerShell:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev.ps1 setup   # install the locked web dependencies
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev.ps1 build   # build Next.js and both Docker images
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev.ps1 up      # start PostgreSQL, API, and web
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev.ps1 status  # show container status
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev.ps1 fresh-test # test schema and admin auth on a fresh isolated database
```

The helper finds per-user Node.js and Docker Desktop installs even when they are not on the shell PATH. The application is available at http://localhost:3000, the API at http://localhost:8000, and the health endpoint at http://localhost:8000/health.

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

PostgreSQL automatically runs `database/init/01-schema.sql`, `02-seed.sql`, and `03-admin-schema.sql` on the first creation of the database volume. The admin migration also applies safely to an existing database; it adds missing admin tables and `users.role` without dropping existing data.

`fresh-test` creates a uniquely named Compose project and PostgreSQL volume, runs the admin database/auth integration test, and removes its containers while preserving that volume. It does not touch the regular development database.

Avoid `docker compose down -v` when you need to keep the current development database; that command deletes its PostgreSQL volume. To start with an empty development database, back up anything you need first.

If you intentionally need to reset the local development database:

```bash
docker compose down -v
docker compose up --build
```

The demo currently uses a fixed local user id (`local-demo-user`) so the complete service/application flow can be tested before Cognito authentication is wired in.
