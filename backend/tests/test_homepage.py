from copy import deepcopy
import pytest
from sqlalchemy import select, update, delete
from sqlalchemy.exc import SQLAlchemyError
from app.models import Service, Category, Audit
from app.homepage_models import HomepageState, HomepageRelease


def layout(ids, title='Discover services'):
    return {'schema_version': 1, 'sections': [{'id': 'services', 'template': 'service_grid',
        'title': title, 'subtitle': '', 'size': 'compact', 'service_ids': ids}]}


@pytest.fixture
def service_ids(seeded):
    return list(seeded.scalars(select(Service.id).join(Category).where(Service.active.is_(True), Category.active.is_(True)).order_by(Service.id).limit(17)))


def save(client, admin, value, revision=0):
    response = client.put('/admin/homepage/draft', headers=admin, json={'revision': revision, 'layout': value})
    assert response.status_code == 200, response.text
    return response.json()


def publish(client, admin, revision):
    response = client.post('/admin/homepage/publish', headers=admin, json={'revision': revision})
    assert response.status_code == 200, response.text
    return response.json()


def test_default_and_draft_visibility(client, admin, customer, service_ids):
    assert client.get('/homepage').json() == {'version': None, 'layout': {'schema_version': 1, 'sections': []}}
    assert client.get('/admin/homepage/draft').status_code == 401
    assert client.get('/admin/homepage/draft', headers=customer).status_code == 403
    saved = save(client, admin, layout(service_ids[:2], 'Private draft title'))
    assert saved['revision'] == 1
    assert client.get('/homepage').json()['layout']['sections'] == []
    draft = client.get('/admin/homepage/draft', headers=admin)
    assert 'no-store' in draft.headers['cache-control']
    assert draft.json()['layout']['sections'][0]['title'] == 'Private draft title'
    templates = client.get('/admin/homepage/templates', headers=admin).json()
    assert templates['templates']['service_carousel']['max_cards'] == 12


def test_publish_edit_restore_and_stale_requests(client, admin, service_ids, db):
    first = layout(service_ids[:2], 'First published')
    saved = save(client, admin, first)
    assert client.post('/admin/homepage/publish', headers=admin, json={'revision': 99}).status_code == 409
    published = publish(client, admin, saved['revision'])
    assert published['revision'] == 2 and published['published_version'] == 1
    public = client.get('/homepage').json()
    assert public == {'version': 1, 'layout': first}
    assert 'published_by' not in public and 'revision' not in public
    assert client.post('/admin/homepage/publish', headers=admin, json={'revision': 1}).status_code == 409
    assert client.put('/admin/homepage/draft', headers=admin, json={'revision': 1, 'layout': first}).status_code == 409
    assert client.put('/admin/homepage/draft', headers=admin, json={'revision': 0, 'layout': first}).status_code == 409
    saved = save(client, admin, layout(service_ids[2:4], 'Second'), published['revision'])
    assert client.get('/homepage').json()['layout'] == first
    second = publish(client, admin, saved['revision'])
    restored = client.post('/admin/homepage/restore', headers=admin, json={'revision': second['revision'], 'version': 1})
    assert restored.status_code == 200
    assert restored.json()['layout'] == first
    assert client.get('/homepage').json()['version'] == 2  # Restore is a draft until Publish.
    third = publish(client, admin, restored.json()['revision'])
    assert third['published_version'] == 3
    assert client.get('/homepage').json() == {'version': 3, 'layout': first}
    history = client.get('/admin/homepage/versions?offset=1&limit=1', headers=admin).json()
    assert history['total'] == 3 and history['items'][0]['version'] == 2
    assert db.scalar(select(Audit.id).where(Audit.action == 'HOMEPAGE_DRAFT_RESTORED')) is not None


@pytest.mark.parametrize('mutation', ['few', 'many', 'duplicate_service', 'duplicate_section', 'bad_size', 'unknown_template', 'extra', 'schema', 'boolean_id', 'string_id', 'too_many_sections'])
def test_section_validation(client, admin, service_ids, mutation):
    value = layout(service_ids[:2])
    section = value['sections'][0]
    if mutation == 'few': section['service_ids'] = service_ids[:1]
    if mutation == 'many': section['service_ids'] = service_ids[:17]
    if mutation == 'duplicate_service': section['service_ids'] = [service_ids[0]] * 2
    if mutation == 'duplicate_section': value['sections'].append(deepcopy(section))
    if mutation == 'bad_size': section['size'] = 'wide'
    if mutation == 'unknown_template': section['template'] = 'raw_html'
    if mutation == 'extra': section['html'] = '<script>private test content</script>'
    if mutation == 'schema': value['schema_version'] = 2
    if mutation == 'boolean_id': section['service_ids'] = [True, service_ids[1]]
    if mutation == 'string_id': section['service_ids'] = [str(service_ids[0]), service_ids[1]]
    if mutation == 'too_many_sections': value['sections'] = [{**section, 'id': f's{i}'} for i in range(13)]
    response = client.put('/admin/homepage/draft', headers=admin, json={'revision': 0, 'layout': value})
    assert response.status_code == 422
    assert '<script>' not in response.text
    assert client.get('/admin/homepage/draft', headers=admin).json()['revision'] == 0


@pytest.mark.parametrize('template,size,ids_count', [('banner', 'wide', 1), ('banner', 'square', 1), ('service_carousel', 'compact', 12), ('service_grid', 'compact', 16)])
def test_valid_template_boundaries(client, admin, service_ids, template, size, ids_count):
    value = layout(service_ids[:ids_count])
    value['sections'][0].update(template=template, size=size)
    saved = save(client, admin, value)
    publish(client, admin, saved['revision'])
    assert client.get('/homepage').json()['layout'] == value


def test_inactive_services_rechecked_before_publish(client, admin, service_ids, db):
    saved = save(client, admin, layout(service_ids[:2]))
    service = db.get(Service, service_ids[0]); service.active = False; db.commit()
    assert client.post('/admin/homepage/publish', headers=admin, json={'revision': saved['revision']}).status_code == 422
    assert client.get('/homepage').json()['version'] is None
    assert client.get('/admin/homepage/draft', headers=admin).json()['revision'] == saved['revision']
    assert client.put('/admin/homepage/draft', headers=admin, json={'revision': saved['revision'], 'layout': layout([999999, service_ids[1]])}).status_code == 422


def test_authentication_and_private_error_headers(client, admin, customer):
    for path, method, body in [('/admin/homepage/templates', 'get', None), ('/admin/homepage/versions', 'get', None),
        ('/admin/homepage/draft', 'put', {'revision': 0, 'layout': {'sections': []}}),
        ('/admin/homepage/publish', 'post', {'revision': 1}), ('/admin/homepage/restore', 'post', {'revision': 1, 'version': 1})]:
        kwargs = {'json': body} if body is not None else {}
        assert getattr(client, method)(path, **kwargs).status_code == 401
        forbidden = getattr(client, method)(path, headers=customer, **kwargs)
        assert forbidden.status_code == 403 and 'no-store' in forbidden.headers['cache-control']
    assert client.post('/admin/homepage/publish', headers=admin, json={'revision': 1}).status_code == 409
    assert client.get('/admin/homepage/versions?limit=51', headers=admin).status_code == 422


def test_reorder_duplicate_and_remove_are_saved_as_layout(client, admin, service_ids):
    value = layout(service_ids[:2])
    value['sections'].append({**value['sections'][0], 'id': 'copy', 'title': 'Another section'})
    value['sections'].reverse()
    saved = save(client, admin, value)
    assert saved['layout']['sections'][0]['id'] == 'copy'
    value['sections'].pop()
    saved = save(client, admin, value, saved['revision'])
    assert len(saved['layout']['sections']) == 1
    saved = save(client, admin, {'schema_version': 1, 'sections': []}, saved['revision'])
    publish(client, admin, saved['revision'])
    assert client.get('/homepage').json()['layout']['sections'] == []


def test_published_snapshots_are_immutable(client, admin, service_ids, db):
    saved = save(client, admin, layout(service_ids[:2]))
    publish(client, admin, saved['revision'])
    for statement in [update(HomepageRelease).values(layout={}), delete(HomepageRelease)]:
        with pytest.raises(SQLAlchemyError):
            with db.begin_nested():
                db.execute(statement)
    assert db.get(HomepageRelease, 1).layout['sections']
