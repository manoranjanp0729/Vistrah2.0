"""Internal registration of validated private V Ads media.

Not an HTTP endpoint. Only trusted server-side upload processing
may call this service with a private candidate path.
"""
from pathlib import Path
from uuid import uuid4

from sqlalchemy.orm import Session

from .models import Audit, User
from .v_ads_media_permissions import authorized_advertiser
from .v_ads_models import VAdsMediaUpload
from .v_ads_video_service import store_video_candidate
from .v_ads_video_storage import VideoStorage


def register_validated_upload(
    db: Session,
    user: User,
    advertiser_id: str,
    candidate_path: Path,
    storage: VideoStorage,
) -> VAdsMediaUpload:
    """Validate, store, and register an advertiser-owned video."""
    authorized_advertiser(db, user.id, advertiser_id)

    # The caller must ensure that candidate_path is privately staged
    # and cannot be changed by an untrusted user.
    result = store_video_candidate(candidate_path, storage)

    upload = VAdsMediaUpload(
        id=str(uuid4()),
        owner_id=user.id,
        advertiser_id=advertiser_id,
        storage_key=result["storage_key"],
        sha256=result["sha256"],
        size_bytes=result["size_bytes"],
        status="VALIDATED",
    )

    db.add(upload)
    db.add(Audit(
        actor_id=user.id,
        action="V_ADS_MEDIA_REGISTER",
        entity="v_ads_media_upload",
        entity_id=upload.id,
        details={
            "advertiser_id": advertiser_id,
            "sha256": result["sha256"],
            "size_bytes": result["size_bytes"],
        },
    ))

    db.commit()
    db.refresh(upload)
    return upload
