"""Shared homepage contract; public reads never return draft or editor identities."""
from typing import Literal, Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import Field, model_validator
from sqlalchemy import select, update, func, or_
from sqlalchemy.orm import Session
from .database import get_db
from .models import Service, Category, Subcategory, User, Audit, now
from .security import admin_user
from .workflow_schemas import Strict
from .homepage_models import HomepageState, HomepageRelease

router = APIRouter(tags=['Homepage configuration'])
TEMPLATES = {
    'banner': {'min_cards': 1, 'max_cards': 1, 'sizes': ['wide', 'square']},
    'service_grid': {'min_cards': 2, 'max_cards': 16, 'sizes': ['compact']},
    'service_carousel': {'min_cards': 2, 'max_cards': 12, 'sizes': ['compact']},
}


class Section(Strict):
    id: str = Field(pattern=r'^[a-zA-Z0-9_-]{1,64}$')
    template: Literal['banner', 'service_grid', 'service_carousel']
    title: str = Field(min_length=1, max_length=100)
    subtitle: str = Field(default='', max_length=240)
    size: Literal['wide', 'square', 'compact'] = 'compact'
    service_ids: list[Annotated[int, Field(gt=0, strict=True)]] = Field(min_length=1, max_length=16)

    @model_validator(mode='after')
    def template_limits(self):
        rule = TEMPLATES[self.template]
        if self.size not in rule['sizes']:
            raise ValueError('Choose a supported size for this template')
        if not rule['min_cards'] <= len(self.service_ids) <= rule['max_cards']:
            raise ValueError('Card count is outside this template limit')
        if any(type(value) is not int or value <= 0 for value in self.service_ids):
            raise ValueError('Use positive service IDs')
        if len(set(self.service_ids)) != len(self.service_ids):
            raise ValueError('Each service may appear only once within a section')
        return self


class Layout(Strict):
    schema_version: Literal[1] = 1
    sections: list[Section] = Field(default_factory=list, max_length=12)

    @model_validator(mode='after')
    def unique_sections(self):
        if len({section.id for section in self.sections}) != len(self.sections):
            raise ValueError('Section IDs must be unique')
        return self


class DraftInput(Strict):
    revision: int = Field(ge=0, strict=True)
    layout: Layout


class RevisionInput(Strict):
    revision: int = Field(gt=0, strict=True)


class RestoreInput(RevisionInput):
    version: int = Field(gt=0, strict=True)


def validate_services(db, layout):
    ids = {value for section in layout.sections for value in section.service_ids}
    if not ids:
        return
    available = set(db.scalars(select(Service.id).join(Category).outerjoin(Subcategory, Service.subcategory_id == Subcategory.id).where(
        Service.id.in_(ids), Service.active.is_(True), Category.active.is_(True),
        or_(Service.subcategory_id.is_(None), Subcategory.active.is_(True)))))
    if ids != available:
        raise HTTPException(422, 'Select active services from active categories')


def private(response):
    response.headers['Cache-Control'] = 'private, no-store'
    response.headers['Vary'] = 'Authorization'


def state_output(state):
    if state is None:
        return {'revision': 0, 'layout': Layout().model_dump(), 'published_version': None}
    return {'revision': state.revision, 'layout': state.draft, 'published_version': state.published_version}


def record(db, user, action, revision):
    db.add(Audit(actor_id=user.id, action=action, entity='homepage', entity_id='1', details={'revision': revision}))


def state_for_revision(db, revision):
    state = db.scalar(select(HomepageState).where(HomepageState.id == 1).with_for_update().execution_options(populate_existing=True))
    if state is None or state.revision != revision:
        raise HTTPException(409, 'Homepage changed. Reload the draft before saving or publishing.')
    return state


def reserve_revision(db, user, revision, **changes):
    # CAS also protects SQLite and stale clients; PostgreSQL holds the singleton lock.
    result = db.execute(update(HomepageState).where(HomepageState.id == 1, HomepageState.revision == revision).values(
        revision=revision + 1, updated_by=user.id, updated_at=now(), **changes))
    if result.rowcount != 1:
        raise HTTPException(409, 'Homepage changed. Reload the draft before saving or publishing.')


@router.get('/homepage')
def public_homepage(response: Response, db: Session = Depends(get_db)):
    response.headers['Cache-Control'] = 'no-store'
    state = db.get(HomepageState, 1)
    release = db.get(HomepageRelease, state.published_version) if state and state.published_version else None
    return {'version': release.version if release else None, 'layout': release.layout if release else Layout().model_dump()}


@router.get('/admin/homepage/templates')
def templates(response: Response, user: User = Depends(admin_user)):
    private(response)
    return {'schema_version': 1, 'max_sections': 12, 'templates': TEMPLATES}


@router.get('/admin/homepage/draft')
def read_draft(response: Response, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    private(response)
    return state_output(db.get(HomepageState, 1))


@router.put('/admin/homepage/draft')
def save_draft(body: DraftInput, response: Response, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    private(response)
    validate_services(db, body.layout)
    layout = body.layout.model_dump()
    if body.revision == 0:
        if db.get(HomepageState, 1) is not None:
            raise HTTPException(409, 'Homepage changed. Reload the draft before saving.')
        db.add(HomepageState(id=1, revision=1, draft=layout, updated_by=user.id))
    else:
        state_for_revision(db, body.revision)
        reserve_revision(db, user, body.revision, draft=layout)
    record(db, user, 'HOMEPAGE_DRAFT_SAVED', body.revision + 1)
    db.commit()
    db.expire_all()
    return state_output(db.get(HomepageState, 1))


@router.post('/admin/homepage/publish')
def publish(body: RevisionInput, response: Response, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    private(response)
    state = state_for_revision(db, body.revision)
    layout = Layout.model_validate(state.draft)
    validate_services(db, layout)  # Services might have been disabled after draft save.
    version = (state.published_version or 0) + 1
    reserve_revision(db, user, body.revision)
    db.add(HomepageRelease(version=version, layout=layout.model_dump(), published_by=user.id))
    db.flush()
    db.execute(update(HomepageState).where(HomepageState.id == 1).values(published_version=version))
    record(db, user, 'HOMEPAGE_PUBLISHED', body.revision + 1)
    db.commit()
    db.expire_all()
    return state_output(db.get(HomepageState, 1))


@router.get('/admin/homepage/versions')
def versions(response: Response, offset: int = Query(default=0, ge=0), limit: int = Query(default=20, ge=1, le=50), user: User = Depends(admin_user), db: Session = Depends(get_db)):
    private(response)
    rows = db.scalars(select(HomepageRelease).order_by(HomepageRelease.version.desc()).offset(offset).limit(limit))
    return {'total': db.scalar(select(func.count()).select_from(HomepageRelease)), 'items': [
        {'version': row.version, 'published_at': row.published_at, 'layout': row.layout} for row in rows]}


@router.post('/admin/homepage/restore')
def restore(body: RestoreInput, response: Response, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    private(response)
    state_for_revision(db, body.revision)
    release = db.get(HomepageRelease, body.version)
    if release is None:
        raise HTTPException(404, 'Published homepage version not found')
    layout = Layout.model_validate(release.layout)
    validate_services(db, layout)
    reserve_revision(db, user, body.revision, draft=layout.model_dump())
    record(db, user, 'HOMEPAGE_DRAFT_RESTORED', body.revision + 1)
    db.commit()
    db.expire_all()
    return state_output(db.get(HomepageState, 1))
