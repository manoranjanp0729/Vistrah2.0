"""Review-safe geography revisions; deliberately not connected to public feeds.

One configuration per video. Geography is immutable after insert (migration
triggers); edits insert a new PENDING revision. A reviewed replacement requires
superseding the old APPROVED row and approving the pending row atomically.
Authorization and optimistic revision checks belong to future seller/review APIs.
"""
from sqlalchemy import (
    String, Integer, Float, DateTime, ForeignKey, ForeignKeyConstraint,
    CheckConstraint, Index, text,
)
from sqlalchemy.orm import Mapped, mapped_column, validates

from .database import Base
from .models import now
from .v_ads_geography import MAX_RADIUS_KM, validate_point, validate_radius


class VAdsTargeting(Base):
    __tablename__ = 'v_ads_targeting'
    video_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    advertiser_id: Mapped[str] = mapped_column(ForeignKey('v_ads_advertisers.id'), index=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (
        ForeignKeyConstraint(['video_id', 'advertiser_id'],
                             ['v_ads_videos.id', 'v_ads_videos.advertiser_id'],
                             name='fk_v_ads_targeting_video_advertiser'),
    )


class VAdsTargetingRevision(Base):
    __tablename__ = 'v_ads_targeting_revisions'
    video_id: Mapped[str] = mapped_column(ForeignKey('v_ads_targeting.video_id'), primary_key=True)
    revision: Mapped[int] = mapped_column(Integer, primary_key=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    targeting_radius_km: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(12), default='PENDING')
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), default=now)
    reviewed_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_by: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    __table_args__ = (
        CheckConstraint('revision > 0', name='ck_v_ads_targeting_revision'),
        CheckConstraint('latitude >= -90 AND latitude <= 90', name='ck_v_ads_targeting_latitude'),
        CheckConstraint('longitude >= -180 AND longitude <= 180', name='ck_v_ads_targeting_longitude'),
        CheckConstraint(f'targeting_radius_km > 0 AND targeting_radius_km <= {MAX_RADIUS_KM!r}',
                        name='ck_v_ads_targeting_radius'),
        CheckConstraint("status IN ('PENDING','APPROVED','REJECTED','SUPERSEDED')",
                        name='ck_v_ads_targeting_status'),
        CheckConstraint("(status = 'PENDING' AND reviewed_at IS NULL AND reviewed_by IS NULL) OR "
                        "(status <> 'PENDING' AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)",
                        name='ck_v_ads_targeting_review'),
        Index('uq_v_ads_targeting_pending', 'video_id', unique=True,
              sqlite_where=text("status = 'PENDING'"), postgresql_where=text("status = 'PENDING'")),
        Index('uq_v_ads_targeting_approved', 'video_id', unique=True,
              sqlite_where=text("status = 'APPROVED'"), postgresql_where=text("status = 'APPROVED'")),
    )

    @validates('latitude', 'longitude', 'targeting_radius_km')
    def validate_geography(self, key, value):
        if key == 'targeting_radius_km':
            return validate_radius(value)
        point = validate_point(value, 0) if key == 'latitude' else validate_point(0, value)
        return point[0 if key == 'latitude' else 1]
