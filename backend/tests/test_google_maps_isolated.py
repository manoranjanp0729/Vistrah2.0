"""Mocked geocoder HTTP tests; unittest avoids database/migration conftest."""
import os
import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from app import google_maps_routes as maps


class GoogleMapsTests(unittest.TestCase):
    def setUp(self):
        self.app = FastAPI()
        self.app.include_router(maps.router)
        maps._peers.clear()
        maps._global.clear()
        self.env = patch.dict(os.environ, {'GOOGLE_MAPS_GEOCODING_ENABLED': '1',
                                          'GOOGLE_MAPS_GEOCODING_API_KEY': 'fixture-server-key'})
        self.env.start()
        self.client = TestClient(self.app)
        self.addCleanup(self.env.stop)
        self.addCleanup(self.client.close)

    def test_disabled_never_calls_google_and_no_cache(self):
        with patch.dict(os.environ, {'GOOGLE_MAPS_GEOCODING_ENABLED': '0'}), patch.object(maps, 'fetch_google') as fetch:
            response = self.client.post('/locations/geocode', json={'query': 'Fixture town'})
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.headers['cache-control'], 'private, no-store')
        fetch.assert_not_called()

    def test_validation_never_echoes_private_input(self):
        for data in ({'latitude': True, 'longitude': 77}, {'latitude': 91, 'longitude': 77},
                     {'query': 'x'}, {'query': 'private fixture', 'key': 'private secret'},
                     {'latitude': '12', 'longitude': 77}):
            with patch.object(maps, 'fetch_google') as fetch:
                response = self.client.post('/locations/geocode', json=data)
                self.assertEqual(response.status_code, 422)
                self.assertNotIn('private', response.text)
                fetch.assert_not_called()
        self.assertEqual(self.client.post('/locations/geocode', content=b'x' * 2049, headers={'Content-Type': 'application/json'}).status_code, 413)
        self.assertEqual(self.client.post('/locations/geocode', content='{"query":"Fixture town"}', headers={'Content-Type': 'text/plain'}).status_code, 415)

    def test_search_and_reverse_are_transient(self):
        place = {'label': 'Fixture town', 'latitude': 12, 'longitude': 77, 'postal_code': '560001'}
        with patch.object(maps, 'fetch_google', return_value=[place]) as fetch:
            response = self.client.post('/locations/geocode', json={'query': 'Fixture / town'})
            fetch.assert_called_once_with('address/Fixture%20%2F%20town', 'fixture-server-key')
            self.assertEqual(response.json(), {'items': [place], 'source': 'google', 'temporary_only': True})
            self.assertNotIn('fixture-server-key', response.text)
            self.assertEqual(self.client.post('/locations/geocode', json={'latitude': 12, 'longitude': 77}).status_code, 200)

    def test_upstream_failures_do_not_expose_details(self):
        with patch.object(maps, 'fetch_google', side_effect=RuntimeError('private key/address')):
            response = self.client.post('/locations/geocode', json={'query': 'Fixture town'})
        self.assertEqual(response.status_code, 503)
        self.assertNotIn('private key', response.text)

    def test_peer_and_global_limits_fail_closed(self):
        with patch.object(maps, 'fetch_google', return_value=[]):
            for _ in range(10):
                self.assertEqual(self.client.post('/locations/geocode', json={'query': 'Fixture town'}).status_code, 200)
            self.assertEqual(self.client.post('/locations/geocode', json={'query': 'Fixture town'}).status_code, 429)
        maps._global[:] = [maps.time.monotonic()] * 100
        self.assertFalse(maps.allow('another-peer'))

    def test_result_minimization_and_invalid_upstream_point(self):
        result = maps.results({'results': [{'location': {'latitude': 12, 'longitude': 77},
            'formattedAddress': 'Private street address', 'addressComponents': [
                {'types': ['locality'], 'longText': 'Fixture town'},
                {'types': ['postal_code'], 'longText': '560001'}]},
            {'location': {'latitude': 999, 'longitude': 77}}]})
        self.assertEqual(len(result), 1)
        self.assertNotIn('Private street', str(result))

    def test_server_key_in_header_and_redirects_disabled(self):
        response = unittest.mock.MagicMock()
        response.__enter__.return_value.read.return_value = b'{"results": []}'
        opener = unittest.mock.Mock()
        opener.open.return_value = response
        with patch.object(maps, 'build_opener', return_value=opener) as factory:
            self.assertEqual(maps.fetch_google('location/12,77', 'fixture-key'), [])
        request = opener.open.call_args.args[0]
        self.assertNotIn('fixture-key', request.full_url)
        self.assertEqual(request.get_header('X-goog-api-key'), 'fixture-key')
        self.assertIsInstance(factory.call_args.args[0], maps.NoRedirect)


if __name__ == '__main__':
    unittest.main()
