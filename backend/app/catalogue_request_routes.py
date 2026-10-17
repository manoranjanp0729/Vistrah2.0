"""Seller catalogue expansion requests; approval does not auto-publish catalogue records."""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import String, Text, DateTime, ForeignKey, CheckConstraint, select
from sqlalchemy.orm import Mapped, mapped_column, Session
from .database import Base, get_db
from .models import User, now
from .security import seller_user, admin_user

router = APIRouter(tags=['Catalogue requests'])

class CatalogueRequest(Base):
    __tablename__ = 'catalogue_requests'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    seller_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    level: Mapped[str] = mapped_column(String(20))
    parent: Mapped[str] = mapped_column(String(300), default='')
    title: Mapped[str] = mapped_column(String(150))
    description: Mapped[str] = mapped_column(Text)
    business_name: Mapped[str] = mapped_column(String(150))
    status: Mapped[str] = mapped_column(String(20), default='PENDING')
    reviewer_id: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    review_note: Mapped[str] = mapped_column(Text, default='')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    __table_args__ = (
        CheckConstraint("level IN ('category','subcategory','service')"),
        CheckConstraint("status IN ('PENDING','APPROVED','REJECTED')"),
    )

class CreateRequest(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    level: str = Field(pattern=r'^(category|subcategory|service)$')
    parent: str = Field(default='', max_length=300)
    title: str = Field(min_length=3, max_length=150)
    description: str = Field(min_length=10, max_length=2000)
    business_name: str = Field(min_length=2, max_length=150)

class ReviewRequest(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    decision: str = Field(pattern=r'^(APPROVED|REJECTED)$')
    note: str = Field(min_length=5, max_length=2000)

def output(row):
    return {field: getattr(row, field) for field in (
        'id','seller_id','level','parent','title','description','business_name',
        'status','reviewer_id','review_note','created_at','reviewed_at')}

@router.post('/seller/catalogue-requests', status_code=201)
def create_request(data: CreateRequest, user: User = Depends(seller_user), db: Session = Depends(get_db)):
    if data.level != 'category' and not data.parent:
        raise HTTPException(422, 'Select the parent catalogue location')
    row = CatalogueRequest(id=str(uuid.uuid4()), seller_id=user.id, **data.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return output(row)

@router.get('/seller/catalogue-requests')
def mine(user: User = Depends(seller_user), db: Session = Depends(get_db)):
    return [output(r) for r in db.scalars(select(CatalogueRequest).where(
        CatalogueRequest.seller_id == user.id).order_by(CatalogueRequest.created_at.desc()).limit(100))]

@router.get('/admin/catalogue-requests')
def admin_queue(user: User = Depends(admin_user), db: Session = Depends(get_db)):
    return [output(r) for r in db.scalars(select(CatalogueRequest).order_by(
        CatalogueRequest.created_at.desc()).limit(200))]

@router.post('/admin/catalogue-requests/{request_id}/review')
def review(request_id: str, data: ReviewRequest, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    row = db.get(CatalogueRequest, request_id)
    if not row:
        raise HTTPException(404, 'Catalogue request not found')
    if row.status != 'PENDING':
        raise HTTPException(409, 'Request already reviewed')
    row.status = data.decision
    row.review_note = data.note
    row.reviewer_id = user.id
    row.reviewed_at = now()
    db.commit()
    db.refresh(row)
    return output(row)
