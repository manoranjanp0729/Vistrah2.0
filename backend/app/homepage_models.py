"""One editable homepage and immutable published snapshots."""
from datetime import datetime
from sqlalchemy import JSON, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base
from .models import now


class HomepageRelease(Base):
    __tablename__ = 'homepage_releases'
    version: Mapped[int] = mapped_column(primary_key=True)
    layout: Mapped[dict] = mapped_column(JSON)
    published_by: Mapped[int] = mapped_column(ForeignKey('users.id'))
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (CheckConstraint('version > 0', name='ck_homepage_release_version'),)


class HomepageState(Base):
    __tablename__ = 'homepage_state'
    id: Mapped[int] = mapped_column(primary_key=True)
    revision: Mapped[int] = mapped_column(default=1)
    draft: Mapped[dict] = mapped_column(JSON)
    published_version: Mapped[int | None] = mapped_column(ForeignKey('homepage_releases.version'), nullable=True)
    updated_by: Mapped[int] = mapped_column(ForeignKey('users.id'))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (
        CheckConstraint('id = 1', name='ck_homepage_singleton'),
        CheckConstraint('revision > 0', name='ck_homepage_draft_revision'),
    )
