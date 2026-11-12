"""Pure identity guard tests; no Docker, database or application imports."""
import unittest

from verify_v_ads_targeting_postgres import exact_host_address


class HostIdentityTests(unittest.TestCase):
    def test_ipv4_bare_and_host_prefix(self):
        for actual in ('172.24.0.2', '172.24.0.2/32'):
            self.assertTrue(exact_host_address(actual, '172.24.0.2'))

    def test_ipv6_equivalent_host_notation(self):
        self.assertTrue(exact_host_address('2001:db8::2/128', '2001:0db8:0:0:0:0:0:2'))
        self.assertTrue(exact_host_address('::1', '::1'))

    def test_different_hosts_or_address_families(self):
        for actual, expected in (('172.24.0.3/32', '172.24.0.2'),
                                 ('2001:db8::3/128', '2001:db8::2'),
                                 ('::ffff:172.24.0.2/128', '172.24.0.2')):
            self.assertFalse(exact_host_address(actual, expected))

    def test_network_membership_is_never_identity(self):
        for actual, expected in (('172.24.0.2/24', '172.24.0.2'),
                                 ('172.24.0.0/24', '172.24.0.2'),
                                 ('0.0.0.0/0', '172.24.0.2'),
                                 ('2001:db8::2/64', '2001:db8::2')):
            self.assertFalse(exact_host_address(actual, expected))

    def test_missing_invalid_scoped_or_unexpected_prefix(self):
        for actual in (None, '', False, 123, 'invalid', '172.24.0.2/33',
                       '172.24.0.2/255.255.255.0', '::1/129', 'fe80::2%eth0/128'):
            self.assertFalse(exact_host_address(actual, '172.24.0.2'))
        for expected in (None, '', False, 'invalid', '172.24.0.2/32', 'fe80::2%eth0'):
            self.assertFalse(exact_host_address('172.24.0.2/32', expected))


if __name__ == '__main__':
    unittest.main()
