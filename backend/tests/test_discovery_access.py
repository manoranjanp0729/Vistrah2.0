from sqlalchemy import select
from app.discovery_service import persist
from app.discovery_models import JobSource
from app.job_sources import RemotiveAdapter
from app.models import now

def test_source_access_revocation_hides_cached_listing_without_erasing_history(client,db,seeded,monkeypatch):
    monkeypatch.setenv('ADZUNA_ACCESS_CONFIRMED','true')
    record=RemotiveAdapter().normalize({'id':1,'url':'https://remotive.com/remote-jobs/test','title':'Test Engineer','description':'Verified description from a deterministic source fixture.','company_name':'Test Employer','candidate_required_location':'Worldwide'})
    record.update(source='adzuna',source_url='https://www.adzuna.co.uk/jobs/land/ad/1',attribution='Adzuna')
    vacancy=persist(db,record,now());db.commit()
    assert client.get('/jobs/'+vacancy['id']).status_code==200
    monkeypatch.setenv('ADZUNA_ACCESS_CONFIRMED','false')
    assert client.get('/jobs/'+vacancy['id']).status_code==404
    assert client.get('/jobs').json()['total']==0

def test_provider_links_remove_credential_values(monkeypatch):
    from app.job_sources import source_link
    monkeypatch.setenv('ADZUNA_APP_ID','private-identifier');monkeypatch.setenv('ADZUNA_APP_KEY','private-key')
    url=source_link('https://www.adzuna.co.uk/jobs/land/ad/1?app_key=private-key&utm_source=private-identifier&v=provider-redirect',('www.adzuna.co.uk',))
    assert 'private' not in url and 'provider-redirect' in url
