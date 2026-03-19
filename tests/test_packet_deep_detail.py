"""Tests for NetworkAnalyzer._extract_packet_deep_detail method.

Validates the Wireshark-style layer dissection with per-field byte offsets
used by the PacketDetailPane and HexDumpViewer components.
"""

import pytest
from network_analyzer import NetworkAnalyzer

# Use a small test PCAP with known TCP SYN packets
TEST_PCAP = '測試檔案/SYN.pcap'


@pytest.fixture(scope='module')
def analyzer():
    """Load a PCAP file once for all tests in this module."""
    a = NetworkAnalyzer(TEST_PCAP)
    loaded = a.load_packets()
    assert loaded, f'Failed to load {TEST_PCAP}'
    assert len(a.packets) > 0, 'No packets loaded'
    return a


class TestExtractPacketDeepDetail:
    """Test _extract_packet_deep_detail returns correct structure and byte ranges."""

    def test_returns_none_for_negative_index(self, analyzer):
        assert analyzer._extract_packet_deep_detail(-1) is None

    def test_returns_none_for_out_of_range_index(self, analyzer):
        assert analyzer._extract_packet_deep_detail(len(analyzer.packets) + 100) is None

    def test_returns_dict_with_required_keys(self, analyzer):
        result = analyzer._extract_packet_deep_detail(0)
        assert result is not None
        assert 'index' in result
        assert 'timestamp' in result
        assert 'timestampHuman' in result
        assert 'captureLength' in result
        assert 'wireLength' in result
        assert 'layers' in result
        assert 'rawHex' in result
        assert 'totalBytes' in result

    def test_index_matches_request(self, analyzer):
        for idx in [0, 1, min(5, len(analyzer.packets) - 1)]:
            result = analyzer._extract_packet_deep_detail(idx)
            assert result['index'] == idx

    def test_timestamp_is_positive_float(self, analyzer):
        result = analyzer._extract_packet_deep_detail(0)
        assert isinstance(result['timestamp'], float)
        assert result['timestamp'] > 0

    def test_timestamp_human_is_formatted_string(self, analyzer):
        result = analyzer._extract_packet_deep_detail(0)
        ts = result['timestampHuman']
        assert isinstance(ts, str)
        # Should look like 'YYYY-MM-DD HH:MM:SS.ffffff'
        assert len(ts) >= 19

    def test_raw_hex_is_hex_string(self, analyzer):
        result = analyzer._extract_packet_deep_detail(0)
        hex_str = result['rawHex']
        assert isinstance(hex_str, str)
        assert len(hex_str) > 0
        # Should be valid hex (even length, only hex chars)
        assert len(hex_str) % 2 == 0
        int(hex_str, 16)  # raises ValueError if not valid hex

    def test_total_bytes_matches_hex_length(self, analyzer):
        result = analyzer._extract_packet_deep_detail(0)
        assert result['totalBytes'] == len(result['rawHex']) // 2

    def test_capture_length_equals_total_bytes(self, analyzer):
        result = analyzer._extract_packet_deep_detail(0)
        assert result['captureLength'] == result['totalBytes']

    def test_layers_is_nonempty_list(self, analyzer):
        result = analyzer._extract_packet_deep_detail(0)
        assert isinstance(result['layers'], list)
        assert len(result['layers']) >= 1  # At least Frame layer

    def test_frame_layer_always_present(self, analyzer):
        result = analyzer._extract_packet_deep_detail(0)
        frame = result['layers'][0]
        assert frame['name'] == 'Frame'
        assert 'bytes on wire' in frame['displayName']

    def test_frame_byte_range_covers_entire_packet(self, analyzer):
        result = analyzer._extract_packet_deep_detail(0)
        frame = result['layers'][0]
        assert frame['byteRange'][0] == 0
        assert frame['byteRange'][1] == result['totalBytes'] - 1

    def test_each_layer_has_required_keys(self, analyzer):
        result = analyzer._extract_packet_deep_detail(0)
        for layer in result['layers']:
            assert 'name' in layer, f'Layer missing name: {layer}'
            assert 'displayName' in layer, f'Layer missing displayName: {layer}'
            assert 'byteRange' in layer, f'Layer missing byteRange: {layer}'
            assert 'fields' in layer, f'Layer missing fields: {layer}'

    def test_each_field_has_required_keys(self, analyzer):
        result = analyzer._extract_packet_deep_detail(0)
        for layer in result['layers']:
            for field in layer['fields']:
                assert 'name' in field, f'Field missing name in layer {layer["name"]}: {field}'
                assert 'value' in field, f'Field missing value in layer {layer["name"]}: {field}'
                assert 'byteRange' in field, f'Field missing byteRange in layer {layer["name"]}: {field}'

    def test_byte_ranges_are_valid_or_none(self, analyzer):
        result = analyzer._extract_packet_deep_detail(0)
        total = result['totalBytes']
        for layer in result['layers']:
            for field in layer['fields']:
                br = field['byteRange']
                if br is not None:
                    assert isinstance(br, list) and len(br) == 2
                    assert 0 <= br[0] <= br[1] < total, (
                        f'Invalid byteRange {br} for field {field["name"]} '
                        f'in layer {layer["name"]} (totalBytes={total})'
                    )


class TestLayerPresence:
    """Test that specific protocol layers are detected for known packet types."""

    def test_ethernet_layer_present(self, analyzer):
        """SYN.pcap should have Ethernet frames."""
        result = analyzer._extract_packet_deep_detail(0)
        layer_names = [l['name'] for l in result['layers']]
        assert 'Ethernet' in layer_names

    def test_ipv4_layer_present(self, analyzer):
        """SYN.pcap should have IPv4 packets."""
        result = analyzer._extract_packet_deep_detail(0)
        layer_names = [l['name'] for l in result['layers']]
        assert 'IPv4' in layer_names

    def test_tcp_layer_present_in_syn_pcap(self, analyzer):
        """SYN.pcap should have TCP packets."""
        result = analyzer._extract_packet_deep_detail(0)
        layer_names = [l['name'] for l in result['layers']]
        assert 'TCP' in layer_names

    def test_ethernet_fields_correct(self, analyzer):
        result = analyzer._extract_packet_deep_detail(0)
        eth_layer = next(l for l in result['layers'] if l['name'] == 'Ethernet')
        field_names = [f['name'] for f in eth_layer['fields']]
        assert 'Destination' in field_names
        assert 'Source' in field_names
        assert 'Type' in field_names

    def test_ipv4_fields_correct(self, analyzer):
        result = analyzer._extract_packet_deep_detail(0)
        ip_layer = next(l for l in result['layers'] if l['name'] == 'IPv4')
        field_names = [f['name'] for f in ip_layer['fields']]
        assert 'Source Address' in field_names
        assert 'Destination Address' in field_names
        assert 'TTL' in field_names
        assert 'Protocol' in field_names

    def test_tcp_fields_correct(self, analyzer):
        result = analyzer._extract_packet_deep_detail(0)
        tcp_layer = next(l for l in result['layers'] if l['name'] == 'TCP')
        field_names = [f['name'] for f in tcp_layer['fields']]
        assert 'Source Port' in field_names
        assert 'Destination Port' in field_names
        assert 'Sequence Number' in field_names
        assert 'Flags' in field_names
        assert 'Window' in field_names


class TestByteRangeConsistency:
    """Ensure byte ranges across layers are contiguous and non-overlapping."""

    def test_ethernet_starts_at_zero(self, analyzer):
        result = analyzer._extract_packet_deep_detail(0)
        eth = next((l for l in result['layers'] if l['name'] == 'Ethernet'), None)
        if eth:
            assert eth['byteRange'][0] == 0

    def test_ip_follows_ethernet(self, analyzer):
        result = analyzer._extract_packet_deep_detail(0)
        eth = next((l for l in result['layers'] if l['name'] == 'Ethernet'), None)
        ip = next((l for l in result['layers'] if l['name'] == 'IPv4'), None)
        if eth and ip:
            assert ip['byteRange'][0] == eth['byteRange'][1] + 1

    def test_tcp_follows_ip(self, analyzer):
        result = analyzer._extract_packet_deep_detail(0)
        ip = next((l for l in result['layers'] if l['name'] == 'IPv4'), None)
        tcp = next((l for l in result['layers'] if l['name'] == 'TCP'), None)
        if ip and tcp:
            assert tcp['byteRange'][0] == ip['byteRange'][1] + 1


class TestFindPacketsByConnectionId:
    """Test _find_packets_by_connection_id helper."""

    def test_empty_set_for_invalid_id(self, analyzer):
        assert analyzer._find_packets_by_connection_id('invalid-id') == set()

    def test_empty_set_for_malformed_id(self, analyzer):
        assert analyzer._find_packets_by_connection_id('') == set()
        assert analyzer._find_packets_by_connection_id('tcp') == set()
        assert analyzer._find_packets_by_connection_id('tcp-only-two') == set()

    def test_returns_set_of_ints(self, analyzer):
        """Build a valid connection ID from the first TCP packet and verify match."""
        from scapy.all import IP, TCP
        for idx, pkt in enumerate(analyzer.packets):
            if pkt.haslayer(IP) and pkt.haslayer(TCP):
                ip = pkt[IP]
                tcp = pkt[TCP]
                conn_id = f'tcp-{ip.src}-{tcp.sport}-{ip.dst}-{tcp.dport}'
                matched = analyzer._find_packets_by_connection_id(conn_id)
                assert isinstance(matched, set)
                assert idx in matched
                break
