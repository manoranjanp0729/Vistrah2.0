"""Deactivate exact development QA records; preserve history and unrelated data."""
import os
from sqlalchemy import select
from .database import SessionLocal
from .models import Provider, Offer, User, Audit

if __name__ == '__main__':
    if os.getenv('QA_MODE') != 'true':
        raise SystemExit('QA_MODE=true is required; this utility is for local QA only.')
    with SessionLocal() as db:
        user=db.scalar(select(User).where(User.email=='qa-admin@example.com',User.name=='Development QA Administrator',User.role=='ADMIN'))
        if not user:
            raise SystemExit('QA administrator not found. No records changed.')
        provider_count=0
        offer_count=0
        for provider in db.scalars(select(Provider).where(Provider.slug.like('qa-outdoors-%'), Provider.provenance=='Development QA fixture, not a real provider.',Provider.active.is_(True))):
            provider.active=False
            db.add(Audit(actor_id=user.id, action='PROVIDER_ACTIVE',entity='provider',entity_id=str(provider.id),details={'active':False,'development_qa_cleanup':True}))
            provider_count+=1
        for offer in db.scalars(select(Offer).where(Offer.title.like('QA Offer %'),Offer.terms=='Development QA offer, test catalogue and membership only.',Offer.active.is_(True))):
            offer.active=False
            db.add(Audit(actor_id=user.id,action='OFFER_EDIT',entity='offer',entity_id=str(offer.id),details={'active':False,'development_qa_cleanup':True}))
            offer_count+=1
        db.commit()
        print(f'Deactivated {provider_count} exact QA providers and {offer_count} exact QA offers. Historical records were preserved.')
