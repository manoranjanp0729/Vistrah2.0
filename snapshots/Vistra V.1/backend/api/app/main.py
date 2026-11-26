from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.routes import router
from app.api.v1.admin_routes import router as admin_router
from app.api.v1.admin_modules import router as admin_modules_router
from app.api.v1.membership_routes import router as membership_router
from app.api.v1.payment_routes import router as payment_router
from app.api.v1.commerce_admin_routes import router as commerce_admin_router

app = FastAPI(title="Vistra API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[x.strip() for x in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok", "service": "vistra-api"}

app.include_router(router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(admin_modules_router, prefix="/api/v1")
app.include_router(membership_router, prefix="/api/v1")
app.include_router(payment_router, prefix="/api/v1")
app.include_router(commerce_admin_router, prefix="/api/v1")
