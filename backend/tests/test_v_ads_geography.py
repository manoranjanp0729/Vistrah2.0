"""Standard-library unit tests: bypass database/migration pytest conftest."""
import math
import unittest

from app.v_ads_geography import (
    EARTH_KM, EDGE_KM, MAX_RADIUS_KM, classify_targeting,
    distance_km, validate_point, validate_radius,
)


class GeographyTests(unittest.TestCase):
    def test_identical_and_known_distances(self):
        self.assertEqual(distance_km(12, 77, 12, 77), 0)
        self.assertAlmostEqual(distance_km(0, 0, 0, 1), 111.1950802335329)
        self.assertAlmostEqual(distance_km(0, 0, 0, 180), MAX_RADIUS_KM)
        self.assertEqual(classify_targeting(12, 77, 12, 77, 1), 'local')

    def test_local_farther_and_default_two_km(self):
        self.assertEqual(classify_targeting(0, 0, 0, .01, 5), 'local')
        self.assertEqual(classify_targeting(0, 0, 0, .03, 5), 'farther')
        self.assertIsNone(classify_targeting(0, 0, 0, .1, 5))

    def test_inclusive_edges_and_explicit_tolerance(self):
        distance = distance_km(0, 0, 0, .03)
        self.assertEqual(classify_targeting(0, 0, 0, .03, distance, distance), 'local')
        self.assertEqual(classify_targeting(0, 0, 0, .03, distance - EDGE_KM / 2), 'farther')
        self.assertIsNone(classify_targeting(0, 0, 0, .03, distance - EDGE_KM * 2))
        self.assertEqual(classify_targeting(0, 0, 0, .03, 5, distance - EDGE_KM / 2), 'local')
        self.assertEqual(classify_targeting(0, 0, 0, .03, 5, distance - EDGE_KM * 2), 'farther')

    def test_customer_radius_cannot_expand_campaign(self):
        self.assertIsNone(classify_targeting(0, 0, 0, .03, 1, 25))

    def test_antimeridian_and_poles(self):
        self.assertAlmostEqual(distance_km(0, 179.9, 0, -179.9), math.radians(.2) * EARTH_KM)
        self.assertEqual(distance_km(0, -180, 0, 180), 0)
        self.assertEqual(distance_km(90, -170, 90, 70), 0)
        self.assertEqual(distance_km(-90, -170, -90, 70), 0)
        self.assertAlmostEqual(distance_km(-90, 0, 90, 0), MAX_RADIUS_KM)
        self.assertAlmostEqual(distance_km(89.9, 0, 89.9, 180), math.radians(.2) * EARTH_KM)
        self.assertAlmostEqual(distance_km(12, 77, -35, -179), distance_km(-35, -179, 12, 77))

    def test_invalid_coordinates(self):
        for value in (True, False, float('nan'), float('inf'), -float('inf'), '1', None, 10 ** 1000):
            for point in ((value, 0), (0, value)):
                with self.subTest(point=point), self.assertRaises(ValueError):
                    distance_km(*point, 0, 0)
                with self.assertRaises(ValueError):
                    distance_km(0, 0, *point)
        for point in ((91, 0), (-91, 0), (0, 181), (0, -181)):
            with self.assertRaises(ValueError):
                validate_point(*point)
        self.assertEqual(validate_point(-90, 180), (-90, 180))

    def test_invalid_radii(self):
        for radius in (0, -1, True, False, float('nan'), float('inf'), -float('inf'), '2', None, MAX_RADIUS_KM + 1):
            with self.subTest(radius=radius), self.assertRaises(ValueError):
                validate_radius(radius)
            with self.assertRaises(ValueError):
                classify_targeting(0, 0, 0, 0, radius)
            with self.assertRaises(ValueError):
                classify_targeting(0, 0, 0, 0, 5, radius)
        self.assertEqual(validate_radius(MAX_RADIUS_KM), MAX_RADIUS_KM)


if __name__ == '__main__':
    unittest.main()
