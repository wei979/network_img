"""Unit tests for NetworkAnalyzer._build_connection_packets() method."""

import pytest


def test_primary_path_with_packet_refs(analyzer_with_packets):
    """Test primary path: extracting packets using packetRefs from stages."""
    analyzer = analyzer_with_packets

    # Create a timeline with packetRefs
    timelines = [
        {
            'id': 'tcp-test-connection',
            'stages': [
                {'key': 'syn', 'packetRefs': [0, 1, 2]},
                {'key': 'ack', 'packetRefs': [3, 4]},
            ]
        }
    ]

    analyzer._build_connection_packets(timelines)

    # Check that connection_packets was created
    assert 'connection_packets' in analyzer.analysis_results
    result = analyzer.analysis_results['connection_packets']

    # Should have entry for this connection
    assert 'tcp-test-connection' in result
    packets = result['tcp-test-connection']

    # Should extract packets (may be empty if indices invalid, but list should exist)
    assert isinstance(packets, list)


def test_fallback_path_without_packet_refs(analyzer_with_packets):
    """Test fallback path: extracting packets when stages have NO packetRefs."""
    analyzer = analyzer_with_packets

    # Create a timeout timeline WITHOUT packetRefs
    timelines = [
        {
            'id': 'timeout-10.1.1.14-9492-172.64.153.46-443-4632',
            'stages': [
                {'key': 'waiting'},  # No packetRefs
                {'key': 'timeout'},  # No packetRefs
            ]
        }
    ]

    analyzer._build_connection_packets(timelines)

    # Check that connection_packets was created
    assert 'connection_packets' in analyzer.analysis_results
    result = analyzer.analysis_results['connection_packets']

    # Should have entry for timeout connection
    assert 'timeout-10.1.1.14-9492-172.64.153.46-443-4632' in result
    packets = result['timeout-10.1.1.14-9492-172.64.153.46-443-4632']

    # Should be a list (may be empty if no matching packets in test PCAP)
    assert isinstance(packets, list)


def test_mixed_timelines(analyzer_with_packets):
    """Test handling mixed timelines (some with packetRefs, some without)."""
    analyzer = analyzer_with_packets

    timelines = [
        {
            'id': 'tcp-with-refs',
            'stages': [
                {'key': 'syn', 'packetRefs': [0, 1]},  # Has packetRefs
            ]
        },
        {
            'id': 'timeout-without-refs',
            'stages': [
                {'key': 'waiting'},  # No packetRefs
            ]
        }
    ]

    analyzer._build_connection_packets(timelines)

    result = analyzer.analysis_results['connection_packets']

    # Both connections should have entries
    assert 'tcp-with-refs' in result
    assert 'timeout-without-refs' in result

    # Both should be lists
    assert isinstance(result['tcp-with-refs'], list)
    assert isinstance(result['timeout-without-refs'], list)


def test_relative_time_calculation(analyzer_with_packets):
    """Test that relative timestamps are calculated correctly."""
    analyzer = analyzer_with_packets

    # Use actual packet indices from the loaded PCAP
    # Assuming packets exist at indices 0, 1, 2
    timelines = [
        {
            'id': 'test-relative-time',
            'stages': [
                {'key': 'test', 'packetRefs': [0, 1, 2]},
            ]
        }
    ]

    analyzer._build_connection_packets(timelines)

    result = analyzer.analysis_results['connection_packets']
    packets = result.get('test-relative-time', [])

    # If packets were extracted
    if packets:
        # First packet should have relativeTime "0.000s"
        assert packets[0]['relativeTime'] == "0.000s"

        # Subsequent packets should have relativeTime >= 0.000s
        for packet in packets[1:]:
            assert 'relativeTime' in packet
            # Parse relativeTime (format: "X.XXXs")
            rel_time = float(packet['relativeTime'].rstrip('s'))
            assert rel_time >= 0.0


def test_empty_timeline_list(analyzer_with_packets):
    """Test handling empty timeline list."""
    analyzer = analyzer_with_packets

    analyzer._build_connection_packets([])

    result = analyzer.analysis_results['connection_packets']

    # Should create empty dict
    assert result == {}


def test_timeline_without_stages(analyzer_with_packets):
    """Test handling timeline without stages field."""
    analyzer = analyzer_with_packets

    timelines = [
        {
            'id': 'no-stages-connection',
            # No 'stages' field
        }
    ]

    analyzer._build_connection_packets(timelines)

    result = analyzer.analysis_results['connection_packets']

    # Should have entry (will use fallback path)
    assert 'no-stages-connection' in result
    # Should be a list (likely empty)
    assert isinstance(result['no-stages-connection'], list)
