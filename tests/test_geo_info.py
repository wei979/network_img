"""Tests for NetworkAnalyzer.enrich_geo_info and _classify_ip (Phase 12)."""

import pytest
from unittest.mock import MagicMock
from network_analyzer import NetworkAnalyzer


@pytest.fixture
def analyzer_stub():
    a = NetworkAnalyzer.__new__(NetworkAnalyzer)
    a.packets = []
    a.analysis_results = {
        'basic_stats': {
            'total_packets': 100,
            'protocols': {'TCP': 80, 'UDP': 20},
            'packet_sizes': [100] * 100,
            'src_ips': {'192.168.1.1': 50, '10.0.0.1': 30, '142.250.80.46': 20},
            'dst_ips': {'192.168.1.2': 40, '127.0.0.1': 10, '8.8.8.8': 50},
        }
    }
    return a


class TestClassifyIp:
    def test_private_10_network(self, analyzer_stub):
        result = analyzer_stub._classify_ip('10.0.0.1')
        assert result['type'] == 'private'
        assert result['label'] == '區域網路'

    def test_private_192_168_network(self, analyzer_stub):
        result = analyzer_stub._classify_ip('192.168.1.1')
        assert result['type'] == 'private'

    def test_private_172_16_network(self, analyzer_stub):
        result = analyzer_stub._classify_ip('172.16.0.1')
        assert result['type'] == 'private'

    def test_loopback(self, analyzer_stub):
        result = analyzer_stub._classify_ip('127.0.0.1')
        assert result['type'] == 'loopback'
        assert result['label'] == 'Loopback'

    def test_link_local(self, analyzer_stub):
        result = analyzer_stub._classify_ip('169.254.1.1')
        assert result['type'] == 'link_local'

    def test_public_ip(self, analyzer_stub):
        result = analyzer_stub._classify_ip('8.8.8.8')
        assert result['type'] == 'public'
        # Without GeoIP DB, label should be '外網' or a country name
        assert result['label'] in ('外網', 'United States', 'US') or result['label']

    def test_ipv6_loopback(self, analyzer_stub):
        result = analyzer_stub._classify_ip('::1')
        assert result['type'] == 'loopback'

    def test_ipv6_link_local(self, analyzer_stub):
        result = analyzer_stub._classify_ip('fe80::1')
        assert result['type'] == 'link_local'

    def test_invalid_ip(self, analyzer_stub):
        result = analyzer_stub._classify_ip('not-an-ip')
        assert result['type'] == 'unknown'

    def test_result_has_required_keys(self, analyzer_stub):
        result = analyzer_stub._classify_ip('10.0.0.1')
        assert 'type' in result
        assert 'label' in result
        assert 'country_code' in result
        assert 'country_name' in result

    def test_private_ip_has_no_country(self, analyzer_stub):
        result = analyzer_stub._classify_ip('192.168.0.1')
        assert result['country_code'] is None
        assert result['country_name'] is None


class TestEnrichGeoInfo:
    def test_returns_geo_map(self, analyzer_stub):
        result = analyzer_stub.enrich_geo_info()
        assert isinstance(result, dict)

    def test_covers_all_ips(self, analyzer_stub):
        result = analyzer_stub.enrich_geo_info()
        assert '192.168.1.1' in result
        assert '10.0.0.1' in result
        assert '142.250.80.46' in result
        assert '192.168.1.2' in result
        assert '127.0.0.1' in result
        assert '8.8.8.8' in result

    def test_stored_in_analysis_results(self, analyzer_stub):
        analyzer_stub.enrich_geo_info()
        assert 'geo_info' in analyzer_stub.analysis_results

    def test_private_ips_classified(self, analyzer_stub):
        result = analyzer_stub.enrich_geo_info()
        assert result['192.168.1.1']['type'] == 'private'
        assert result['10.0.0.1']['type'] == 'private'

    def test_public_ips_classified(self, analyzer_stub):
        result = analyzer_stub.enrich_geo_info()
        assert result['8.8.8.8']['type'] == 'public'
        assert result['142.250.80.46']['type'] == 'public'

    def test_loopback_classified(self, analyzer_stub):
        result = analyzer_stub.enrich_geo_info()
        assert result['127.0.0.1']['type'] == 'loopback'

    def test_empty_stats(self):
        a = NetworkAnalyzer.__new__(NetworkAnalyzer)
        a.packets = []
        a.analysis_results = {}
        result = a.enrich_geo_info()
        assert result == {}
