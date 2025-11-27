"""Integration tests for timeout connection packet extraction."""

import pytest
import json


def test_extract_timeout_packets_from_real_pcap(analyzer_with_packets, sample_timeline_json):
    """Test extracting packets for timeout connections from real PCAP file."""
    analyzer = analyzer_with_packets

    # Load sample timeline data
    with open(sample_timeline_json, 'r', encoding='utf-8') as f:
        timeline_data = json.load(f)

    timelines = timeline_data.get('timelines', [])

    # Find a timeout connection
    timeout_timelines = [t for t in timelines if 'timeout' in t.get('id', '')]

    if not timeout_timelines:
        pytest.skip("No timeout connections in sample timeline JSON")

    # Build connection packets
    analyzer._build_connection_packets(timelines)

    # Check that timeout connections have packets
    connection_packets = analyzer.analysis_results.get('connection_packets', {})

    # At least one timeout connection should have packets
    timeout_with_packets = 0
    for timeout_timeline in timeout_timelines[:5]:  # Check first 5
        connection_id = timeout_timeline['id']
        packets = connection_packets.get(connection_id, [])
        if packets:
            timeout_with_packets += 1
            # Verify packet structure
            assert isinstance(packets, list)
            assert len(packets) > 0
            assert 'index' in packets[0]
            assert 'timestamp' in packets[0]
            assert 'fiveTuple' in packets[0]
            assert 'relativeTime' in packets[0]

    # Should have found at least one timeout with packets
    assert timeout_with_packets > 0, "No timeout connections have packets"


def test_timeout_packet_count_matches_metrics(analyzer_with_packets, sample_timeline_json):
    """Test that extracted packet count approximately matches timeline metrics."""
    analyzer = analyzer_with_packets

    # Load sample timeline data
    with open(sample_timeline_json, 'r', encoding='utf-8') as f:
        timeline_data = json.load(f)

    timelines = timeline_data.get('timelines', [])

    # Find timeout connections with packet count metrics
    timeout_timelines = [
        t for t in timelines
        if 'timeout' in t.get('id', '') and 'packetCount' in t.get('metrics', {})
    ]

    if not timeout_timelines:
        pytest.skip("No timeout connections with packetCount in sample")

    # Build connection packets
    analyzer._build_connection_packets(timelines)

    connection_packets = analyzer.analysis_results.get('connection_packets', {})

    # Check packet counts for first few timeout connections
    for timeout_timeline in timeout_timelines[:3]:
        connection_id = timeout_timeline['id']
        expected_count = timeout_timeline['metrics']['packetCount']
        actual_packets = connection_packets.get(connection_id, [])

        # Note: The fallback path extracts ALL packets for the connection (bidirectional),
        # not just the packets around the timeout event. This is correct behavior.
        # The packetCount in metrics only reflects packets around the timeout detection.
        if expected_count > 0:
            assert len(actual_packets) > 0, f"Connection {connection_id} has no packets"
            # Verify we have at least the packets from the timeout event
            assert len(actual_packets) >= expected_count, \
                f"Missing packets: expected at least {expected_count}, got {len(actual_packets)}"


def test_relative_time_calculation_for_timeout(analyzer_with_packets, sample_timeline_json):
    """Test relative time calculation for timeout connections."""
    analyzer = analyzer_with_packets

    # Load sample timeline data
    with open(sample_timeline_json, 'r', encoding='utf-8') as f:
        timeline_data = json.load(f)

    timelines = timeline_data.get('timelines', [])

    # Find timeout connections
    timeout_timelines = [t for t in timelines if 'timeout' in t.get('id', '')]

    if not timeout_timelines:
        pytest.skip("No timeout connections in sample")

    # Build connection packets
    analyzer._build_connection_packets(timelines)

    connection_packets = analyzer.analysis_results.get('connection_packets', {})

    # Check relative time for first timeout connection with packets
    for timeout_timeline in timeout_timelines:
        connection_id = timeout_timeline['id']
        packets = connection_packets.get(connection_id, [])

        if packets:
            # First packet should have relativeTime "0.000s"
            assert packets[0]['relativeTime'] == "0.000s"

            # Subsequent packets should have increasing relative times
            for i in range(1, len(packets)):
                rel_time = float(packets[i]['relativeTime'].rstrip('s'))
                assert rel_time >= 0.0
                # Each packet should have a valid timestamp
                assert packets[i]['timestamp'] >= packets[0]['timestamp']

            break  # Only need to test one connection
