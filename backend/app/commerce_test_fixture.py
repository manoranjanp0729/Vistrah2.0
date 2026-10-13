"""Opt-in commerce demo records for the guarded, disposable homepage QA project."""
import os
from uuid import uuid4
from .homepage_test_fixture import validate_target,MARKER as HOMEPAGE_MARKER,ADMIN_EMAIL,PASSWORD
MARKER='commerce-test-fixture-v1'
SELLER_EMAIL='commerce-seller@example.com'
REVIEWER_EMAIL='commerce-reviewer@example.com'


def main():
    validate_target(os.environ)  # Before importing app config or connecting.
    from sqlalchemy import inspect,select,text
    from .database import engine,SessionLocal
    from .models import BootstrapState,User,Provider,ProviderService,Service,Category,Audit,now
    from .commerce_models import CommerceListing
    from .security import passwords
    tables=inspect(engine).get_table_names()
    if 'bootstrap_state' not in tables:raise RuntimeError('Run the guarded homepage fixture first')
    with SessionLocal() as db:
        if not db.get(BootstrapState,HOMEPAGE_MARKER):raise RuntimeError('Refusing a database without the disposable homepage marker')
        if db.get(BootstrapState,MARKER):
            print('Commerce QA fixture already exists. Seller edits, stock, memberships and orders retained.')
            return
        if db.execute(text('SELECT version_num FROM alembic_version')).scalar()!='015':raise RuntimeError('Commerce fixture requires the reviewed 015 test schema')
        owner=db.scalar(select(User).where(User.email==ADMIN_EMAIL,User.role=='ADMIN'))
        if owner is None:raise RuntimeError('Guarded test administrator missing')
        if db.scalar(select(User.id).where(User.email.in_((SELLER_EMAIL,REVIEWER_EMAIL)))):raise RuntimeError('Refusing to replace existing commerce fixture account identities')
        service=db.scalar(select(Service).join(Category,Category.id==Service.category_id).where(Service.active.is_(True),Service.subcategory_id.is_(None),Category.active.is_(True)).order_by(Service.id))
        if service is None:raise RuntimeError('No active test catalogue service is available')
        seller=User(name='Commerce test seller',email=SELLER_EMAIL,seller_enabled=True,password_hash=passwords.hash(PASSWORD))
        reviewer=User(name='Independent commerce test reviewer',email=REVIEWER_EMAIL,role='ADMIN',password_hash=passwords.hash(PASSWORD))
        db.add_all([seller,reviewer]);db.flush()
        businesses=[]
        for user,slug,company in [(seller,'commerce-qa-seller','Synthetic QA seller business'),(owner,'commerce-qa-vistrah','VISTRAH synthetic QA services')]:
            business=Provider(owner_user_id=user.id,slug=slug,name=user.name,company=company,email=user.email,phone='',address='Synthetic fixture only',location='Test only',provenance='Guarded disposable commerce fixture',active=True,verification_status='VERIFIED')
            db.add(business);db.flush();db.add(ProviderService(provider_id=business.id,service_id=service.id,approval_status='APPROVED'));businesses.append(business)
        for title,kind,operator,business,user,approver,cutoff in [
            ('QA product — cancel before dispatch','PRODUCT','SELLER',businesses[0],seller,owner,'BEFORE_DISPATCH'),
            ('QA build product — cancel before build','PRODUCT','SELLER',businesses[0],seller,owner,'BEFORE_BUILD'),
            ('QA seller service package','SERVICE_PACKAGE','SELLER',businesses[0],seller,owner,'BEFORE_SERVICE_START'),
            ('QA VISTRAH service package','SERVICE_PACKAGE','VISTRAH',businesses[1],owner,reviewer,'BEFORE_SERVICE_START')]:
            row=CommerceListing(id=str(uuid4()),provider_id=business.id,seller_id=user.id,kind=kind,service_id=service.id if kind=='SERVICE_PACKAGE' else None,title=title,
                description='Synthetic listing for isolated functionality testing only. No real product or service is for sale.',unit_price_paise=25000,
                fulfilment_operator=operator,stock_quantity=5 if kind=='PRODUCT' else None,fulfilment_modes=['PICKUP','DELIVERY'] if kind=='PRODUCT' else ['SERVICE'],delivery_fee_paise=5000 if kind=='PRODUCT' else None,
                cancellation_rule=cutoff,submitted_by=user.id,status='APPROVED',reviewer_id=approver.id,review_note='Synthetic QA fixture approval only.',published_at=now())
            db.add(row)
        db.add(BootstrapState(key=MARKER));db.add(Audit(actor_id=owner.id,action='COMMERCE_QA_BOOTSTRAP',entity='test_fixture',entity_id=MARKER,details={'synthetic':True}))
        db.commit()
    print('Synthetic commerce QA records created only in the guarded disposable project. No live ordering, payment or worker activated.')


if __name__=='__main__':main()
