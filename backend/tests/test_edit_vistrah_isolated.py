"""Run with unittest (not the database-migrating suite conftest).
All persistence is under TemporaryDirectory; the normal app/DB are never started.
"""
import copy
import importlib
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_ROOT / 'backend'))
_BOOT = tempfile.TemporaryDirectory(prefix='vistrah-cms-bootstrap-')
_BOOT_FILE = Path(_BOOT.name) / 'content.json'
_BOOT_FILE.write_text(json.dumps({'schema_version': 1, 'pages': [], 'published': {}}), encoding='utf-8')
with patch.dict(os.environ, {'EDIT_VISTRAH_DATA_FILE': str(_BOOT_FILE), 'DATABASE_URL': 'sqlite:///' + str(Path(_BOOT.name) / 'unused.db'), 'JWT_SECRET': 'isolated-cms-test-secret-not-a-real-secret-123456789', 'APP_ENV': 'development'}):
    store_module = importlib.import_module('app.edit_vistrah_store')
    routes = importlib.import_module('app.edit_vistrah_routes')
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import event
from app.database import engine

@event.listens_for(engine, 'connect')
def forbid_database_connection(*args):
    raise AssertionError('CMS isolated tests must never open a database')

class CmsTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='vistrah-cms-case-')
        self.addCleanup(self.tmp.cleanup)
        self.file = Path(self.tmp.name) / 'pages.json'
        self.store = store_module.EditVistrahStore(str(self.file))

    def test_existing_pages_have_content_without_creating_runtime_files(self):
        pages = self.store.list_pages()
        self.assertEqual(len(pages), 9)
        self.assertEqual({p['slug'] for p in pages}, {'home','services','v-ads','v-essentials','marketing-solutions','digital-marketing','branding-creative-production','outdoor-advertising-signage','mobility-billboard-advertising'})
        for page in pages:
            self.assertTrue(page['sections'], page['slug'])
            self.assertEqual(page['content_source'], 'APP')
            self.assertIsNone(self.store.get_live_page(page['slug']))
        self.assertFalse(self.file.exists())

    def test_publishing_then_editing_retains_live_snapshot_and_survives_reload(self):
        original = self.store.get_page('home')
        draft = self.store.update_page('home', {'revision': original['revision'], 'sections': original['sections']})
        self.assertIsNone(self.store.get_live_page('home'))
        live = self.store.publish_page('home', draft['revision'])
        self.assertEqual(live['content_source'], 'CMS')
        sections = copy.deepcopy(live['sections'])
        sections[0]['content']['en']['title'] = 'Disposable draft title'
        self.store.update_page('home', {'revision': live['revision'], 'sections': sections})
        reloaded = store_module.EditVistrahStore(str(self.file))
        self.assertEqual(reloaded.get_page('home')['sections'][0]['content']['en']['title'], 'Disposable draft title')
        self.assertNotEqual(reloaded.get_live_page('home')['sections'][0]['content']['en']['title'], 'Disposable draft title')

    def test_saving_one_page_does_not_convert_other_app_pages_to_drafts(self):
        page = self.store.get_page('digital-marketing')
        self.store.update_page('digital-marketing', {'revision':1,'sections':page['sections']})
        self.assertEqual(self.store.get_page('home')['content_source'], 'APP')
        stored = json.loads(self.file.read_text(encoding='utf-8'))
        self.assertEqual([p['slug'] for p in stored['pages']], ['digital-marketing'])

    def test_stale_save_and_publish_are_rejected(self):
        self.store.update_page('home', {'revision': 1, 'name': 'Disposable title'})
        with self.assertRaisesRegex(ValueError, 'another editor'):
            self.store.update_page('home', {'revision': 1, 'name': 'Stale title'})
        with self.assertRaisesRegex(ValueError, 'another editor'):
            self.store.publish_page('home', 1)

    def test_unpublish_requires_revision_retains_draft_and_persists(self):
        page = self.store.get_page('home')
        page['sections'][0]['enabled'] = False
        saved = self.store.update_page('home', {'revision': page['revision'], 'sections': page['sections']})
        live = self.store.publish_page('home', saved['revision'])
        self.assertFalse(self.store.get_published_page('home')['sections'][0]['enabled'])
        self.assertTrue(all(s['enabled'] for s in self.store.get_live_page('home')['sections']))
        for revision in (None, True, str(live['revision']), live['revision'] - 1):
            with self.assertRaisesRegex(ValueError, 'another editor'):
                self.store.unpublish_page('home', revision)
        draft = self.store.unpublish_page('home', live['revision'])
        self.assertEqual(draft['sections'], live['sections'])
        self.assertEqual(draft['revision'], live['revision'] + 1)
        reloaded = store_module.EditVistrahStore(str(self.file))
        self.assertIsNone(reloaded.get_live_page('home'))
        self.assertEqual(reloaded.get_page('home')['content_source'], 'DRAFT')
        republished = reloaded.publish_page('home', draft['revision'])
        self.assertGreater(republished['published_version'], live['published_version'])

    def test_http_recovery_and_unpublish_are_admin_only(self):
        with self.api_client() as client:
            page = self.store.get_page('home')
            self.store.publish_page('home', page['revision'])
            self.assertEqual(client.get('/admin/edit-vistrah/pages/home/published').status_code, 200)
            self.assertEqual(client.post('/admin/edit-vistrah/pages/home/unpublish', json={}).status_code, 400)
            self.assertEqual(client.post('/admin/edit-vistrah/pages/home/unpublish', json={'revision': page['revision']}).status_code, 200)
            self.assertEqual(client.get('/edit-vistrah/pages/home').status_code, 404)
            self.assertEqual(client.get('/admin/edit-vistrah/pages/home/published').status_code, 404)
        application = FastAPI()
        application.include_router(routes.router)
        with TestClient(application) as client:
            self.assertEqual(client.get('/admin/edit-vistrah/pages/home/published').status_code, 401)
            self.assertEqual(client.post('/admin/edit-vistrah/pages/home/unpublish', json={'revision': 1}).status_code, 401)

    def test_write_failure_does_not_mutate_memory(self):
        before = self.store.get_page('home')
        with patch.object(store_module.os, 'replace', side_effect=OSError('disposable denied')):
            with self.assertRaises(OSError):
                self.store.update_page('home', {'revision': 1, 'name': 'Must not persist'})
        self.assertEqual(self.store.get_page('home'), before)
        self.assertFalse(self.file.exists())
        self.assertEqual(list(Path(self.tmp.name).iterdir()), [])

    def test_custom_page_create_publish_delete_and_reserved_path_protection(self):
        page = self.store.create_page('fixture-campaign', 'Synthetic campaign')
        self.assertEqual(page['path'], '/pages/fixture-campaign')
        page = self.store.update_page(page['slug'], {'revision': 1, 'sections': self.store.get_page('services')['sections']})
        self.store.publish_page(page['slug'], page['revision'])
        self.assertTrue(self.store.delete_page(page['slug']))
        self.assertIsNone(self.store.get_live_page(page['slug']))
        with self.assertRaises(ValueError):
            self.store.create_page('hijack', 'Bad path', '/admin')
        with self.assertRaises(ValueError):
            self.store.delete_page('home')

    def test_validation_rejects_duplicate_ids_unsafe_media_and_unsafe_links(self):
        original = self.store.get_page('home')['sections']
        invalid = [original + [copy.deepcopy(original[0])]]
        for field, value in [('action_href','javascript:alert(1)'),('video_urls',['http://untrusted.invalid/v.mp4']),('images',[{'url':'data:image/svg+xml;base64,abc'}])]:
            sections = copy.deepcopy(original)
            sections[0][field] = value
            invalid.append(sections)
        for sections in invalid:
            with self.subTest(sections=sections[0]['id']):
                with self.assertRaises(ValueError):
                    self.store.update_page('home', {'sections': sections})
        self.assertFalse(self.file.exists())

    def test_marketing_baselines_publish_with_translations_and_contact_action(self):
        for slug in ['digital-marketing','branding-creative-production','outdoor-advertising-signage','mobility-billboard-advertising']:
            page = self.store.get_page(slug)
            for locale in ['en','kn','hi']:
                self.assertTrue(page['sections'][0]['content'][locale]['title'])
            live = self.store.publish_page(slug, page['revision'])
            self.assertEqual(live['sections'][0]['action_href'], 'mailto:info@vistrah.in')

    def test_legacy_content_is_preserved_and_missing_app_pages_still_list(self):
        legacy = self.store.get_page('home')
        legacy.update(status='LIVE', published_version=7, name='Existing stored home')
        self.file.write_text(json.dumps([legacy]), encoding='utf-8')
        reloaded = store_module.EditVistrahStore(str(self.file))
        self.assertEqual(len(reloaded.list_pages()), 9)
        self.assertEqual(reloaded.get_page('home')['name'], 'Existing stored home')
        self.assertEqual(reloaded.get_live_page('home')['published_version'], 7)

    def test_bundled_templates_are_not_silently_published(self):
        bundled = Path(self.tmp.name) / 'bundled.json'
        bundled.write_text(json.dumps(store_module.DEFAULT_PAGES), encoding='utf-8')
        runtime = str(Path(self.tmp.name) / 'runtime.json')
        with patch.object(store_module,'DATA_FILE',runtime), patch.object(store_module,'LEGACY_DATA_FILE',str(bundled)):
            fresh = store_module.EditVistrahStore()
        self.assertEqual(fresh.get_page('home')['content_source'], 'APP')
        self.assertIsNone(fresh.get_live_page('home'))
        self.assertFalse(Path(runtime).exists())

    def test_enabled_order_is_applied_only_to_public_snapshot(self):
        page = self.store.get_page('home')
        page['sections'][0]['enabled'] = False
        page['sections'][1]['order'] = -1
        saved = self.store.update_page('home', {'sections': page['sections']})
        self.store.publish_page('home', saved['revision'])
        public = self.store.get_live_page('home')
        self.assertEqual(public['sections'][0]['id'], page['sections'][1]['id'])
        self.assertNotIn(page['sections'][0]['id'], [s['id'] for s in public['sections']])
        self.assertEqual(len(self.store.get_page('home')['sections']), len(page['sections']))

    def api_client(self):
        application = FastAPI()
        application.include_router(routes.router)
        application.dependency_overrides[routes.admin_user] = lambda: {'id': 999, 'role':'ADMIN'}
        replacement = patch.object(routes, 'edit_vistrah_store', self.store)
        replacement.start()
        self.addCleanup(replacement.stop)
        return TestClient(application)

    def test_http_existing_page_list_details_save_publish_and_public_visibility(self):
        with self.api_client() as client:
            result = client.get('/admin/edit-vistrah/pages')
            self.assertEqual(result.status_code, 200)
            self.assertEqual(len(result.json()), 9)
            page = client.get('/admin/edit-vistrah/pages/home').json()
            self.assertTrue(page['sections'])
            self.assertEqual(client.get('/edit-vistrah/pages/home').status_code, 404)
            saved = client.put('/admin/edit-vistrah/pages/home', json={'revision': page['revision'], 'sections': page['sections']})
            self.assertEqual(saved.status_code, 200, saved.text)
            live = client.post('/admin/edit-vistrah/pages/home/publish', json={'revision': saved.json()['revision']})
            self.assertEqual(live.status_code, 200, live.text)
            public_before = client.get('/edit-vistrah/pages/home').json()
            changed = client.put('/admin/edit-vistrah/pages/home', json={'revision': saved.json()['revision'], 'name':'Synthetic unpublished name'})
            self.assertEqual(changed.status_code, 200)
            self.assertEqual(client.get('/edit-vistrah/pages/home').json(), public_before)
            self.assertEqual(client.get('/admin/edit-vistrah/library').status_code, 200)

    def test_photo_inspection_accepts_raw_and_multipart_without_extra_dependencies(self):
        import struct
        png = b'\x89PNG\r\n\x1a\n' + b'\x00\x00\x00\rIHDR' + struct.pack('>LL', 1280, 720)
        with self.api_client() as client:
            raw = client.post('/admin/edit-vistrah/inspect-photo', content=png, headers={'content-type':'image/png','x-file-name':'synthetic.png'})
            self.assertEqual(raw.status_code, 200, raw.text)
            self.assertEqual((raw.json()['width'], raw.json()['height']), (1280,720))
            multipart = client.post('/admin/edit-vistrah/inspect-photo', files={'file':('synthetic.png',png,'image/png')})
            self.assertEqual(multipart.status_code, 200, multipart.text)
            self.assertTrue(multipart.json()['detected'])
            truncated = client.post('/admin/edit-vistrah/inspect-photo', content=b'\xff\xd8\xff\xc0' + bytes(15))
            self.assertEqual(truncated.status_code, 200)
            oversized = client.post('/admin/edit-vistrah/inspect-photo', content=bytes(3_000_001))
            self.assertEqual(oversized.status_code, 413)

    def test_admin_endpoints_require_authentication_without_opening_database(self):
        application = FastAPI()
        application.include_router(routes.router)
        with TestClient(application) as client:
            self.assertEqual(client.get('/admin/edit-vistrah/pages').status_code, 401)

if __name__ == '__main__':
    if '--serve' in sys.argv:
        import uvicorn
        with tempfile.TemporaryDirectory(prefix='vistrah-cms-browser-') as folder:
            routes.edit_vistrah_store = store_module.EditVistrahStore(str(Path(folder) / 'browser.json'))
            application = FastAPI()
            application.include_router(routes.router)
            application.dependency_overrides[routes.admin_user] = lambda: {'id':999,'role':'ADMIN'}
            @application.get('/me')
            def synthetic_admin():
                return {'id':999,'name':'Synthetic CMS Reviewer','email':'fixture@example.invalid','role':'ADMIN','seller_enabled':False}
            uvicorn.run(application,host='127.0.0.1',port=8197,log_level='warning')
    else:
        unittest.main()
