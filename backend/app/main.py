from fastapi import FastAPI, Depends, HTTPException, Request, Header
from fastapi.responses import JSONResponse
from sqlalchemy import select, func, text, delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from .database import get_db
from .models import *
from .schemas import *
from .security import current_user, admin_user, member_user, eligible_memberships, passwords, DUMMY_HASH, issue_token, token_session, bearer
from .catalogue import catalogue, serialize, active_service, lookup
from .marketplace_taxonomy import master_taxonomy, resolve_selection
from .payments import payments, aware
from datetime import timedelta
import os
import hashlib
import json
import secrets

app = FastAPI(title='VISTRAH API', version='1.0.0', description='Service marketplace API. All payments are sandbox simulations.')
from .workflow_routes import router as workflow_router
app.include_router(workflow_router)
from .discovery_routes import router as discovery_router
app.include_router(discovery_router)
from .provider_routes import router as provider_router, eligible_query
app.include_router(provider_router)
from .recovery import router as recovery_router
app.include_router(recovery_router)
from .seller_routes import router as seller_router
app.include_router(seller_router)
from .publication_routes import router as publication_router
app.include_router(publication_router)
from .location_routes import router as location_router
app.include_router(location_router)
from .employer_job_routes import router as employer_job_router
app.include_router(employer_job_router)
from .homepage_routes import router as homepage_router
app.include_router(homepage_router)
from .commerce_routes import router as commerce_router
app.include_router(commerce_router)
from .commerce_order_routes import router as commerce_order_router
app.include_router(commerce_order_router)
from .business_membership_routes import router as business_membership_router
app.include_router(business_membership_router)
from .catalogue_request_routes import router as catalogue_request_router
app.include_router(catalogue_request_router)
from .v_ads_routes import router as v_ads_router
app.include_router(v_ads_router)
from .v_ads_engagement_routes import router as v_ads_engagement_router
app.include_router(v_ads_engagement_router)
from .v_ads_account_routes import router as v_ads_account_router, ensure_seller_v_ads_account
app.include_router(v_ads_account_router)
from .v_ads_review_routes import router as v_ads_review_router
app.include_router(v_ads_review_router)
from .v_ads_media_routes import router as v_ads_media_router
from .v_ads_video_submission_routes import router as v_ads_submission_router
app.include_router(v_ads_media_router)
app.include_router(v_ads_submission_router)
from .v_ads_management_routes import router as v_ads_management_router
app.include_router(v_ads_management_router)
from .v_ads_creator_routes import router as v_ads_creator_router
app.include_router(v_ads_creator_router)
from .edit_vistrah_routes import router as edit_vistrah_router
app.include_router(edit_vistrah_router)
from .marketing_pricing_routes import router as marketing_pricing_router
app.include_router(marketing_pricing_router)
from .composite_routes import router as composite_router
app.include_router(composite_router)

@app.middleware('http')
async def service_access_cache_control(request, call_next):
    response = await call_next(request)
    if request.url.path.startswith(('/seller/', '/admin/catalogue-requests', '/admin/ownership-claims', '/admin/publication-drafts', '/admin/employer-jobs', '/admin/homepage', '/admin/commerce-listings', '/admin/commerce-orders', '/admin/vistrah/', '/commerce/cart', '/commerce/orders', '/commerce/service-packages', '/commerce/listings', '/me/location', '/membership/', '/me/business-membership', '/admin/business-memberships', '/admin/marketing-requests', '/marketing-pricing/', '/admin/marketing-pricing/')) or request.url.path in ('/me', '/me/membership', '/membership/offers', '/requests') or (
        request.url.path.startswith('/services/') and ('/providers' in request.url.path or request.url.path.endswith(('/member-information','/nearby')))
    ):
        response.headers['Cache-Control'] = 'private, no-store'
        response.headers['Vary'] = 'Authorization'
    return response

from fastapi.exceptions import RequestValidationError
from fastapi.exception_handlers import request_validation_exception_handler

@app.exception_handler(RequestValidationError)
async def validated_input_error(request, exc):
    if request.url.path.startswith(('/auth/','/finds/','/admin/job-sources','/provider-','/admin/provider-','/seller/','/admin/catalogue-requests','/admin/ownership-','/admin/publication-','/admin/employer-jobs','/admin/homepage','/admin/commerce-listings','/admin/commerce-orders','/admin/vistrah/','/commerce/','/services/','/me/location','/requests')):
        # Do not echo document/profile values; invalid Unicode is unsafe to echo.
        return JSONResponse(status_code=422,content={'detail':[{'loc':error['loc'],'msg':error['msg'],'type':error['type']} for error in exc.errors()]})
    return await request_validation_exception_handler(request, exc)

@app.middleware('http')
async def workflow_body_limit(request, call_next):
    provider_path=request.url.path.startswith(('/provider-','/admin/provider-','/seller/','/admin/catalogue-requests','/admin/publication-','/admin/ownership-','/admin/employer-jobs','/admin/homepage','/admin/commerce-listings','/admin/commerce-orders','/admin/vistrah/','/commerce/cart','/commerce/orders'))
    if (request.url.path.startswith('/finds/') or provider_path) and request.method in ('POST','PUT','PATCH'):
        limit=3000000 if provider_path and request.url.path.endswith(('/documents','/evidence')) else 128000
        chunks=[]
        size=0
        async for chunk in request.stream():
            size+=len(chunk)
            if size > limit:
                return JSONResponse(status_code=413,content={'detail':'Request exceeds the permitted upload or form size'})
            chunks.append(chunk)
        request._body=b''.join(chunks)
        if provider_path and request._body:
            try:
                def invalid_constant(_):raise ValueError('Non-finite JSON value')
                value=json.loads(request._body,parse_constant=invalid_constant)
                stack=[(value,0)]
                while stack:
                    item,depth=stack.pop()
                    if depth>20:raise ValueError('deep JSON')
                    if isinstance(item,dict):stack.extend((v,depth+1) for v in item.values())
                    elif isinstance(item,list):stack.extend((v,depth+1) for v in item)
            except (ValueError,RecursionError,UnicodeError):
                return JSONResponse(status_code=422,content={'detail':'Use valid JSON with at most 20 nesting levels'})
    return await call_next(request)

@app.exception_handler(IntegrityError)
async def integrity_error(request, exc):
    return JSONResponse(status_code=409, content={'detail': 'This record conflicts with an existing record or has dependencies. No change was saved.'})

def audit(db, actor, action, entity, entity_id, details=None):
    db.add(Audit(actor_id=actor.id, action=action, entity=entity, entity_id=str(entity_id), details=details or {}))

def get_or_404(db, model, id):
    row = db.get(model, id)
    if not row:
        raise HTTPException(404, 'Record not found')
    return row

def user_output(user):
    return {key: getattr(user, key) for key in ['id','name','email','phone','role','seller_enabled']}

@app.get('/health')
def health(db: Session = Depends(get_db)):
    db.execute(text('SELECT 1'))
    return {'status': 'ok', 'payment_mode': 'SANDBOX'}

@app.get('/catalogue')
def read_catalogue(db: Session = Depends(get_db)):
    return catalogue(db)

@app.get('/marketplace/taxonomy')
def read_marketplace_taxonomy():
    return master_taxonomy()

@app.get('/marketplace/taxonomy/resolve')
def resolve_marketplace_taxonomy(category: str, subcategory: str, listing_type: str):
    """Validate a seller's classification choice without creating a listing."""
    selection = resolve_selection(category, subcategory, listing_type)
    if selection is None:
        raise HTTPException(422, 'Choose a valid category, subcategory and listing type')
    return selection

@app.get('/catalogue/lookup')
def catalogue_lookup(category: str, service: str, subcategory: str | None = None, db: Session = Depends(get_db)):
    return serialize(lookup(db, category, service, subcategory))

@app.get('/services/{service_id}/providers')
def service_providers(service_id: int, user: User = Depends(member_user), db: Session = Depends(get_db)):
    active_service(db, service_id)
    rows = db.scalars(eligible_query(service_id).order_by(Provider.name)).all()
    return [{**{key: getattr(p, key) for key in ['id','slug','name','company','location','verification_status','address']},'description':db.get(ProviderService,(p.id,service_id)).description} for p in rows]

@app.get('/services/{service_id}/providers/{slug}')
def provider_detail(service_id: int, slug: str, user: User = Depends(member_user), db: Session = Depends(get_db)):
    active_service(db, service_id)
    provider = db.scalar(eligible_query(service_id).where(Provider.slug==slug))
    if not provider:
        raise HTTPException(404, 'Provider not found')
    return {**{key: getattr(provider, key) for key in ['id','slug','name','company','email','phone','address','location','verification_status']},'description':db.get(ProviderService,(provider.id,service_id)).description}

def rate_limit(db, email, request):
    key = hashlib.sha256((email.lower() + ':' + (request.client.host if request.client else 'unknown')).encode()).hexdigest()
    count = db.scalar(select(func.count()).select_from(LoginAttempt).where(LoginAttempt.key == key, LoginAttempt.created_at > now() - timedelta(minutes=15)))
    if count >= 10:
        raise HTTPException(429, 'Too many attempts. Please try again in 15 minutes.')
    db.add(LoginAttempt(key=key))
    db.commit()
    return key

@app.post('/auth/register', status_code=201)
def register(data: Register, request: Request, db: Session = Depends(get_db)):
    return register_identity(data, request, db)

def register_identity(data, request, db, seller=False):
    email = str(data.email).lower()
    rate_limit(db, email, request)
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, 'An account with this email already exists')
    user = User(email=email, name=data.name, password_hash=passwords.hash(data.password), seller_enabled=seller); db.add(user); db.flush(); seller and ensure_seller_v_ads_account(db, user)
    db.add(user)
    db.commit()
    return {'access_token': issue_token(db, user), 'user': user_output(user)}

@app.post('/auth/login')
def login(data: Login, request: Request, db: Session = Depends(get_db)):
    return login_identity(data, request, db)

def login_identity(data, request, db, seller=False):
    attempt_key = rate_limit(db, str(data.email), request)
    user = db.scalar(select(User).where(User.email == str(data.email).lower()).with_for_update())
    valid = passwords.verify(data.password, user.password_hash if user else DUMMY_HASH)
    if not user or not valid:
        raise HTTPException(401, 'Email or password is incorrect')
    if seller and not user.seller_enabled:
        user.seller_enabled = True
        audit(db, user, 'SELLER_ENABLED', 'user', user.id)
    if seller or user.role == 'ADMIN':
        if not user.seller_enabled:
            user.seller_enabled = True
            audit(db, user, 'SELLER_ENABLED', 'user', user.id)
        ensure_seller_v_ads_account(db, user)
    db.execute(delete(LoginAttempt).where(LoginAttempt.key == attempt_key))
    return {'access_token': issue_token(db, user), 'user': user_output(user)}

@app.post('/auth/seller/register', status_code=201)
def seller_register(data: Register, request: Request, db: Session = Depends(get_db)):
    return register_identity(data, request, db, seller=True)

@app.post('/auth/seller/login')
def seller_login(data: Login, request: Request, db: Session = Depends(get_db)):
    return login_identity(data, request, db, seller=True)

async def google_identity(data: GoogleAuth, request: Request, db: Session = Depends(get_db), seller=False):
    from .google_auth import verify_google_token
    rate_limit(db, 'google-sign-in', request)
    info = await verify_google_token((data.credential or data.id_token or '').strip())
    email = str(info['email']).lower().strip()
    name = str(info.get('name') or email.split('@')[0]).strip()[:100]
    identity = db.get(GoogleIdentity, info['sub'])
    user = db.get(User, identity.user_id) if identity else db.scalar(select(User).where(User.email == email).with_for_update())
    if identity and not user:
        raise HTTPException(401, 'Google identity is unavailable')
    if not identity and user:
        # Google is authoritative only for Gmail or a verified Workspace domain.
        if not (email.endswith('@gmail.com') or info.get('hd')):
            raise HTTPException(409, 'Sign in with your existing email and password to access this account.')
        linked = db.scalar(select(GoogleIdentity).where(GoogleIdentity.user_id == user.id))
        if linked:
            raise HTTPException(409, 'This account is linked to a different Google identity')
    is_seller = seller
    if user:
        if is_seller and not user.seller_enabled:
            user.seller_enabled = True
            audit(db, user, 'SELLER_ENABLED', 'user', user.id)
        if is_seller or user.role == 'ADMIN':
            if not user.seller_enabled:
                user.seller_enabled = True
                audit(db, user, 'SELLER_ENABLED', 'user', user.id)
            ensure_seller_v_ads_account(db, user)
    else:
        user = User(
            email=email,
            name=name or email.split('@')[0],
            password_hash=passwords.hash(secrets.token_urlsafe(32)),
            seller_enabled=is_seller,
        )
        db.add(user)
        db.flush()
        if is_seller:
            ensure_seller_v_ads_account(db, user)

    if not identity:
        db.add(GoogleIdentity(subject=info['sub'], user_id=user.id))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'Account changed during sign-in. Please try again.')
    return {'access_token': issue_token(db, user), 'user': user_output(user)}

@app.post('/auth/google')
async def google_login(data: GoogleAuth, request: Request, db: Session = Depends(get_db)):
    return await google_identity(data, request, db, seller=False)

@app.post('/auth/seller/google')
async def seller_google_login(data: GoogleAuth, request: Request, db: Session = Depends(get_db)):
    return await google_identity(data, request, db, seller=True)

@app.post('/auth/seller/enable')
def enable_seller(user: User = Depends(current_user), db: Session = Depends(get_db)):
    ensure_seller_v_ads_account(db, user); db.commit()
    if not user.seller_enabled:
        user.seller_enabled = True
        audit(db, user, 'SELLER_ENABLED', 'user', user.id)
        db.commit()
    return user_output(user)

@app.post('/auth/logout')
def logout(credentials=Depends(bearer), user: User = Depends(current_user), db: Session = Depends(get_db)):
    _, session = token_session(db, credentials.credentials)
    session.revoked = True
    db.commit()
    return {'message': 'Signed out'}

@app.get('/me')
def me(user: User = Depends(current_user)):
    return user_output(user)

@app.patch('/me')
def update_me(data: Profile, user: User = Depends(current_user), db: Session = Depends(get_db)):
    user.name = data.name
    user.phone = data.phone
    db.commit()
    return user_output(user)

@app.post('/requests', status_code=201)
def create_request(data: RequestCreate, user: User = Depends(member_user), db: Session = Depends(get_db)):
    active_service(db, data.service_id)
    row = ServiceRequest(user_id=user.id, **data.model_dump())
    db.add(row)
    db.commit()
    return serialize(row)

def requests_output(db, rows):
    return [{**serialize(r), 'service_title': db.get(Service, r.service_id).title} for r in rows]

@app.get('/me/requests')
def my_requests(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return requests_output(db, db.scalars(select(ServiceRequest).where(ServiceRequest.user_id == user.id).order_by(ServiceRequest.id.desc())).all())

@app.get('/me/membership')
def membership(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(Membership).where(Membership.user_id == user.id, Membership.revoked.is_(False)).order_by(Membership.expires_at.desc())).all()
    eligible = eligible_memberships(db, user)
    return {'active': bool(eligible), 'expires_at': eligible[0].expires_at if eligible else None, 'records': [serialize(r) for r in rows]}

@app.get('/membership/plan')
def membership_plan(db: Session = Depends(get_db)):
    plan = db.scalar(select(Plan).where(Plan.name == 'VISTRAH Membership'))
    if not plan:
        raise HTTPException(503, 'Membership plan is not configured')
    return serialize(plan)

@app.get('/services/{service_id}/member-information')
def member_information(service_id: int, user: User = Depends(member_user), db: Session = Depends(get_db)):
    active_service(db, service_id)
    info = db.get(ServiceInformation, service_id)
    return {'notes': info.notes if info else []}

@app.get('/membership/offers')
def member_offers(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not membership(user, db)['active']:
        return []
    output = []
    for offer in db.scalars(select(Offer).where(Offer.active.is_(True), Offer.starts_at <= now(), Offer.ends_at > now())):
        model = {'CATEGORY': Category, 'SERVICE': Service, 'PROVIDER': Provider}.get(offer.scope)
        target = db.get(model, offer.target_id) if model else None
        output.append({**serialize(offer), 'target_title': (target.company if isinstance(target, Provider) else target.title) if target else 'All services'})
    return output

@app.get('/me/payments')
def my_payments(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [serialize(p) for p in db.scalars(select(Payment).where(Payment.user_id == user.id).order_by(Payment.created_at.desc())).all()]

@app.get('/me/orders')
def my_orders(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [{**serialize(p), 'title': db.get(Plan, p.plan_id).name} for p in db.scalars(select(Payment).where(Payment.user_id == user.id, Payment.status.in_(['SUCCEEDED','REFUNDED'])).order_by(Payment.created_at.desc())).all()]

@app.post('/payments/checkout', status_code=201)
def checkout(data: CheckoutInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return serialize(payments.checkout(db, user, data.idempotency_key))

@app.post('/payments/{payment_id}/simulate')
def simulate(payment_id: str, data: SandboxOutcome, user: User = Depends(current_user), db: Session = Depends(get_db)):
    payment = db.scalar(select(Payment).where(Payment.id == payment_id, Payment.user_id == user.id))
    if not payment:
        raise HTTPException(404, 'Payment not found')
    body, signature = payments.adapter.event(payment, data.outcome)
    return serialize(payments.process_webhook(db, body, signature))

@app.post('/payments/webhook')
async def webhook(request: Request, x_signature: str = Header(default=''), db: Session = Depends(get_db)):
    body = await request.body()
    if len(body) > 10000:
        raise HTTPException(413, 'Webhook is too large')
    return serialize(payments.process_webhook(db, body, x_signature))

@app.get('/admin/overview')
def overview(user: User = Depends(admin_user), db: Session = Depends(get_db)):
    counts = {name: db.scalar(select(func.count()).select_from(model)) for name, model in [('customers',User),('requests',ServiceRequest),('providers',Provider),('services',Service),('payments',Payment)]}
    counts['customers'] = db.scalar(select(func.count()).select_from(User).where(User.role == 'CUSTOMER'))
    counts['new_requests'] = db.scalar(select(func.count()).select_from(ServiceRequest).where(ServiceRequest.status == 'NEW'))
    counts['payment_mode'] = 'SANDBOX'
    return counts

@app.get('/admin/requests')
def admin_requests(user: User = Depends(admin_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(ServiceRequest).order_by(ServiceRequest.id.desc())).all()
    return [{**r, 'customer': db.get(User, r['user_id']).name} for r in requests_output(db, rows)]

REQUEST_TRANSITIONS = {'NEW': {'UNDER_REVIEW','CANCELLED'}, 'UNDER_REVIEW': {'ASSIGNED','CANCELLED'}, 'ASSIGNED': {'IN_PROGRESS','UNDER_REVIEW','CANCELLED'}, 'IN_PROGRESS': {'COMPLETED','CANCELLED'}, 'COMPLETED': set(), 'CANCELLED': set()}

@app.patch('/admin/requests/{id}')
def request_status(id: int, data: StatusUpdate, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    row = db.scalar(select(ServiceRequest).where(ServiceRequest.id == id).with_for_update())
    if not row:
        raise HTTPException(404, 'Request not found')
    if data.status not in REQUEST_TRANSITIONS[row.status]:
        raise HTTPException(409, 'Invalid request status transition')
    previous = row.status
    row.status = data.status
    audit(db, user, 'REQUEST_STATUS', 'request', id, {'from': previous, 'to': data.status})
    db.commit()
    return serialize(row)

@app.get('/admin/providers')
def admin_providers(user: User = Depends(admin_user), db: Session = Depends(get_db)):
    return [{**serialize(p), 'service_ids': list(db.scalars(select(ProviderService.service_id).where(ProviderService.provider_id == p.id,ProviderService.approval_status!='SUSPENDED'))), 'service_approvals':[serialize(g) for g in db.scalars(select(ProviderService).where(ProviderService.provider_id==p.id))]} for p in db.scalars(select(Provider).order_by(Provider.id)).all()]

@app.post('/admin/providers', status_code=201)
def create_provider(data: ProviderInput, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    provider = Provider(**data.model_dump())
    db.add(provider)
    db.flush()
    audit(db, user, 'PROVIDER_CREATE', 'provider', provider.id)
    db.commit()
    return serialize(provider)

@app.put('/admin/providers/{id}')
def edit_provider(id: int, data: ProviderInput, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    provider = db.scalar(select(Provider).where(Provider.id == id).with_for_update())
    if not provider:
        raise HTTPException(404, 'Provider not found')
    from .publication_routes import new_draft, DraftInput, BusinessProfile
    values=data.model_dump(mode='json')
    draft=new_draft(db,provider,user,DraftInput(profile=BusinessProfile.model_validate({key:values[key] for key in BusinessProfile.model_fields})),admin_metadata={key:values[key] for key in ('slug','source_url','provenance')})
    draft.status='SUBMITTED';draft.revision+=1
    audit(db, user, 'PROVIDER_EDIT_DRAFT', 'provider', id)
    db.commit()
    return serialize(provider) | {'publication_draft':serialize(draft)}

PROVIDER_TRANSITIONS = {'PENDING': {'VERIFIED','REJECTED','INACTIVE'}, 'VERIFIED': {'PENDING','INACTIVE','REJECTED'}, 'REJECTED': {'PENDING','INACTIVE'}, 'INACTIVE': {'PENDING'}}

@app.post('/admin/providers/{id}/verification')
def verify_provider(id: int, data: ProviderTransition, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    provider = db.scalar(select(Provider).where(Provider.id == id).with_for_update())
    if not provider:
        raise HTTPException(404, 'Provider not found')
    if data.status not in PROVIDER_TRANSITIONS[provider.verification_status]:
        raise HTTPException(409, 'Invalid provider verification transition')
    prior = provider.verification_status
    provider.verification_status = data.status
    provider.verification_evidence = data.evidence
    if data.status != 'VERIFIED':
        provider.active = False
    audit(db, user, 'PROVIDER_VERIFY', 'provider', id, {'from': prior, 'to': data.status, 'evidence': data.evidence})
    db.commit()
    return serialize(provider)

@app.patch('/admin/providers/{id}/active')
def activate_provider(id: int, data: ActiveUpdate, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    provider = db.scalar(select(Provider).where(Provider.id == id).with_for_update())
    if not provider:
        raise HTTPException(404, 'Provider not found')
    if data.active and provider.verification_status != 'VERIFIED':
        raise HTTPException(409, 'Verify this provider before activating it')
    provider.active = data.active
    audit(db, user, 'PROVIDER_ACTIVE', 'provider', id, data.model_dump())
    db.commit()
    return serialize(provider)

@app.put('/admin/providers/{id}/services')
def provider_services(id: int, data: Association, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    provider=db.scalar(select(Provider).where(Provider.id==id).with_for_update())
    if not provider:raise HTTPException(404,'Provider not found')
    for sid in set(data.service_ids):
        get_or_404(db, Service, sid)
    for association in db.scalars(select(ProviderService).where(ProviderService.provider_id == id)).all():
        if association.service_id not in data.service_ids:association.approval_status='SUSPENDED'
        elif association.approval_status=='SUSPENDED':association.approval_status='PENDING'
    db.flush()
    for sid in set(data.service_ids):
        if not db.get(ProviderService,(id,sid)):db.add(ProviderService(provider_id=id, service_id=sid,approval_status='PENDING'))
    audit(db, user, 'PROVIDER_SERVICES', 'provider', id, data.model_dump())
    db.commit()
    return {'service_ids': data.service_ids}

CATALOGUE_MODELS = {'categories': Category, 'subcategories': Subcategory, 'services': Service}

def catalogue_model(kind):
    if kind not in CATALOGUE_MODELS:
        raise HTTPException(404, 'Catalogue type not found')
    return CATALOGUE_MODELS[kind]

def catalogue_values(db, kind, data):
    fields = {'categories': ['slug','title','description','active','image'], 'subcategories': ['slug','title','description','active','category_id'], 'services': ['slug','title','description','active','category_id','subcategory_id','image','includes','popular']}[kind]
    if kind != 'categories':
        if not data.category_id:
            raise HTTPException(422, 'Category is required')
        get_or_404(db, Category, data.category_id)
    if kind == 'services' and data.subcategory_id:
        sub = get_or_404(db, Subcategory, data.subcategory_id)
        if sub.category_id != data.category_id:
            raise HTTPException(422, 'Subcategory does not belong to this category')
    return {key: getattr(data, key) for key in fields}

@app.get('/admin/catalogue')
def admin_catalogue(user: User = Depends(admin_user), db: Session = Depends(get_db)):
    return catalogue(db, True)

@app.post('/admin/catalogue/{kind}', status_code=201)
def create_catalogue(kind: str, data: CatalogueInput, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    model = catalogue_model(kind)
    row = model(**catalogue_values(db, kind, data))
    db.add(row)
    db.flush()
    audit(db, user, 'CATALOGUE_CREATE', kind, row.id)
    if kind == 'services':
        db.add(ServiceInformation(service_id=row.id, notes=data.member_information or []))
    db.commit()
    return serialize(row)

@app.put('/admin/catalogue/{kind}/{id}')
def edit_catalogue(kind: str, id: int, data: CatalogueInput, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    row = get_or_404(db, catalogue_model(kind), id)
    values = catalogue_values(db, kind, data)
    if kind == 'subcategories' and row.category_id != values['category_id'] and db.scalar(select(Service.id).where(Service.subcategory_id == id).limit(1)):
        raise HTTPException(409, 'Move associated services before changing the subcategory parent')
    for key, value in values.items():
        setattr(row, key, value)
    audit(db, user, 'CATALOGUE_EDIT', kind, id)
    if kind == 'services' and data.member_information is not None:
        info = db.get(ServiceInformation, id)
        if info:
            info.notes = data.member_information
        else:
            db.add(ServiceInformation(service_id=id, notes=data.member_information))
    db.commit()
    return serialize(row)

@app.delete('/admin/catalogue/{kind}/{id}')
def delete_catalogue(kind: str, id: int, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    row = get_or_404(db, catalogue_model(kind), id)
    dependencies = {'categories': [(Subcategory,Subcategory.category_id),(Service,Service.category_id)], 'subcategories': [(Service,Service.subcategory_id)], 'services': [(ServiceRequest,ServiceRequest.service_id),(ProviderService,ProviderService.service_id)]}[kind]
    scope = {'categories': 'CATEGORY', 'services': 'SERVICE'}.get(kind)
    for model, field in dependencies:
        if db.scalar(select(func.count()).select_from(model).where(field == id)):
            raise HTTPException(409, 'This record has dependencies; deactivate it instead')
    if scope and db.scalar(select(Offer.id).where(Offer.scope == scope, Offer.target_id == id).limit(1)):
        raise HTTPException(409, 'An offer depends on this record')
    db.delete(row)
    audit(db, user, 'CATALOGUE_DELETE', kind, id)
    db.commit()
    return {'message': 'Deleted'}

@app.get('/admin/offers')
def admin_offers(user: User = Depends(admin_user), db: Session = Depends(get_db)):
    return [serialize(o) for o in db.scalars(select(Offer).order_by(Offer.id.desc())).all()]

def offer_values(db, data):
    model = {'CATEGORY': Category, 'SERVICE': Service, 'PROVIDER': Provider}.get(data.scope)
    if model:
        get_or_404(db, model, data.target_id)
    return data.model_dump()

@app.post('/admin/offers', status_code=201)
def create_offer(data: OfferInput, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    row = Offer(**offer_values(db, data))
    db.add(row)
    db.flush()
    audit(db, user, 'OFFER_CREATE', 'offer', row.id)
    db.commit()
    return serialize(row)

@app.put('/admin/offers/{id}')
def edit_offer(id: int, data: OfferInput, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    row = get_or_404(db, Offer, id)
    for key, value in offer_values(db, data).items():
        setattr(row, key, value)
    audit(db, user, 'OFFER_EDIT', 'offer', id)
    db.commit()
    return serialize(row)

@app.get('/admin/payments')
def admin_payments(user: User = Depends(admin_user), db: Session = Depends(get_db)):
    return [serialize(p) for p in db.scalars(select(Payment).order_by(Payment.created_at.desc())).all()]

@app.get('/admin/payments/{id}/ledger')
def payment_ledger(id: str, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    payment = get_or_404(db, Payment, id)
    allocations = db.scalars(select(Allocation).where(Allocation.payment_id == id)).all()
    net = sum(a.amount for a in allocations)
    return {'payment': serialize(payment), 'allocations': [serialize(a) for a in allocations], 'refunds': [serialize(r) for r in db.scalars(select(Refund).where(Refund.payment_id == id))], 'events': [serialize(e) for e in db.scalars(select(WebhookEvent).where(WebhookEvent.payment_id == id))], 'reconciliations': [serialize(r) for r in db.scalars(select(Reconciliation).where(Reconciliation.payment_id == id))], 'settlement_eligible': payment.status == 'SUCCEEDED' and net == payment.amount, 'settlement_mode': 'SANDBOX_ONLY_NO_DISBURSEMENT'}

@app.post('/admin/payments/{id}/refund')
def refund_payment(id: str, data: RefundInput, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    refund = payments.refund(db, id, data.reason)
    audit(db, user, 'SANDBOX_REFUND', 'payment', id, {'reason': data.reason})
    db.commit()
    return serialize(refund)

@app.post('/admin/reconciliation')
def reconcile(user: User = Depends(admin_user), db: Session = Depends(get_db)):
    rows = payments.reconcile(db)
    audit(db, user, 'RECONCILE', 'payment', 'all', {'count': len(rows)})
    db.commit()
    return [serialize(r) for r in rows]

@app.get('/admin/audit')
def audit_logs(q: str = '', action: str = '', page: int = 1, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    if page < 1 or len(q) > 200:
        raise HTTPException(422, 'Invalid search or page')
    query = select(Audit)
    if q:
        query = query.where(Audit.entity.ilike(f'%{q}%') | Audit.entity_id.ilike(f'%{q}%') | Audit.action.ilike(f'%{q}%'))
    if action:
        query = query.where(Audit.action == action)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = db.scalars(query.order_by(Audit.id.desc()).offset((page-1)*30).limit(30)).all()
    return {'items': [serialize(r) for r in rows], 'total': total, 'page': page}

@app.get('/admin/audit/export')
def export_audit(q: str = '', action: str = '', user: User = Depends(admin_user), db: Session = Depends(get_db)):
    import csv
    import io
    from fastapi.responses import Response
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['id','actor_id','action','entity','entity_id','created_at','details'])
    query = select(Audit).order_by(Audit.id)
    if q:
        query = query.where(Audit.entity.ilike(f'%{q}%') | Audit.entity_id.ilike(f'%{q}%') | Audit.action.ilike(f'%{q}%'))
    if action:
        query = query.where(Audit.action == action)
    for row in db.scalars(query):
        values = [row.id,row.actor_id,row.action,row.entity,row.entity_id,row.created_at.isoformat(),str(row.details)]
        writer.writerow(["'"+v if isinstance(v,str) and v.startswith(('=','+','-','@')) else v for v in values])
    return Response(output.getvalue(), media_type='text/csv', headers={'Content-Disposition': 'attachment; filename=vistrah-audit.csv'})



