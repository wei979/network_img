"""Tests for NetworkAnalyzer.compute_performance_score method (Phase 11).

Validates the three-dimensional network performance scoring:
- Latency score (40% weight)
- Packet loss score (35% weight)
- Throughput score (25% weight)
"""

import pytest
from unittest.mock import MagicMock
from network_analyzer import NetworkAnalyzer


@pytest.fixture
def analyzer_stub():
    """Create a NetworkAnalyzer with stubbed analysis_results (no real PCAP needed)."""
    a = NetworkAnalyzer.__new__(NetworkAnalyzer)
    a.packets = [MagicMock(time=0.0), MagicMock(time=14.0)]  # 14s duration
    a.analysis_results = {
        'basic_stats': {
            'total_packets': 500,
            'protocols': {'TCP': 400, 'UDP': 80, 'ICMP': 20},
            'packet_sizes': [100] * 500,  # 100 bytes each = 50000 total
        },
        'latency': {
            'tcp_handshakes': [
                {'handshake_time': 40.0, 'time': 1.0},
                {'handshake_time': 50.0, 'time': 2.0},
            ],
            'ping_responses': [
                {'rtt': 30.0, 'time': 3.0},
            ],
            'inter_packet_delays': [],
        },
        'packet_loss': [
            {'type': 'retransmission', 'stream': 'a', 'packet_index': 10, 'time': 1.0},
            {'type': 'retransmission', 'stream': 'b', 'packet_index': 20, 'time': 2.0},
            {'type': 'sequence_gap', 'stream': 'c', 'packet_index': 30, 'time': 3.0},
        ],
    }
    return a


class TestComputePerformanceScore:
    """Test compute_performance_score returns correct structure and values."""

    def test_returns_complete_structure(self, analyzer_stub):
        result = analyzer_stub.compute_performance_score()

        assert 'overall' in result
        assert 'grade' in result
        assert 'latency' in result
        assert 'packet_loss' in result
        assert 'throughput' in result

    def test_overall_score_in_valid_range(self, analyzer_stub):
        result = analyzer_stub.compute_performance_score()

        assert 0 <= result['overall'] <= 100

    def test_grade_is_valid(self, analyzer_stub):
        result = analyzer_stub.compute_performance_score()

        assert result['grade'] in ('A+', 'A', 'B', 'C', 'D', 'F')

    def test_latency_subscore_structure(self, analyzer_stub):
        result = analyzer_stub.compute_performance_score()
        lat = result['latency']

        assert 'score' in lat
        assert 'avg_rtt_ms' in lat
        assert 'grade' in lat
        assert 'sample_count' in lat
        assert 0 <= lat['score'] <= 100

    def test_packet_loss_subscore_structure(self, analyzer_stub):
        result = analyzer_stub.compute_performance_score()
        loss = result['packet_loss']

        assert 'score' in loss
        assert 'retransmission_rate' in loss
        assert 'retransmission_count' in loss
        assert 'grade' in loss
        assert 0 <= loss['score'] <= 100

    def test_throughput_subscore_structure(self, analyzer_stub):
        result = analyzer_stub.compute_performance_score()
        tp = result['throughput']

        assert 'score' in tp
        assert 'bytes_per_second' in tp
        assert 'total_bytes' in tp
        assert 'grade' in tp
        assert 0 <= tp['score'] <= 100

    def test_latency_avg_rtt_calculation(self, analyzer_stub):
        """avg_rtt should be mean of handshake times + ping RTTs."""
        result = analyzer_stub.compute_performance_score()
        # (40 + 50 + 30) / 3 = 40.0
        assert abs(result['latency']['avg_rtt_ms'] - 40.0) < 0.1

    def test_retransmission_count(self, analyzer_stub):
        """Only 'retransmission' type should count, not 'sequence_gap'."""
        result = analyzer_stub.compute_performance_score()
        assert result['packet_loss']['retransmission_count'] == 2

    def test_retransmission_rate(self, analyzer_stub):
        """rate = 2 retransmissions / 400 TCP packets = 0.005."""
        result = analyzer_stub.compute_performance_score()
        assert abs(result['packet_loss']['retransmission_rate'] - 0.005) < 0.001

    def test_throughput_calculation(self, analyzer_stub):
        """total=50000 bytes, duration=14s → ~3571 bytes/sec."""
        result = analyzer_stub.compute_performance_score()
        assert abs(result['throughput']['bytes_per_second'] - 3571.4) < 1.0

    def test_overall_is_weighted_average(self, analyzer_stub):
        """overall = lat*0.4 + loss*0.35 + tp*0.25."""
        result = analyzer_stub.compute_performance_score()
        expected = (
            result['latency']['score'] * 0.4
            + result['packet_loss']['score'] * 0.35
            + result['throughput']['score'] * 0.25
        )
        assert abs(result['overall'] - round(expected, 1)) < 0.2

    def test_stored_in_analysis_results(self, analyzer_stub):
        analyzer_stub.compute_performance_score()
        assert 'performance_score' in analyzer_stub.analysis_results


class TestPerformanceEdgeCases:
    """Edge cases for performance scoring."""

    def test_no_latency_data(self):
        a = NetworkAnalyzer.__new__(NetworkAnalyzer)
        a.packets = [MagicMock(time=0.0), MagicMock(time=1.0)]
        a.analysis_results = {
            'basic_stats': {
                'total_packets': 10,
                'protocols': {'TCP': 10},
                'packet_sizes': [100] * 10,
            },
            'latency': {
                'tcp_handshakes': [],
                'ping_responses': [],
                'inter_packet_delays': [],
            },
            'packet_loss': [],
        }
        result = a.compute_performance_score()

        # No RTT data → latency score should default to a neutral value
        assert result['latency']['sample_count'] == 0
        assert 0 <= result['overall'] <= 100

    def test_no_tcp_packets(self):
        a = NetworkAnalyzer.__new__(NetworkAnalyzer)
        a.packets = [MagicMock(time=0.0), MagicMock(time=5.0)]
        a.analysis_results = {
            'basic_stats': {
                'total_packets': 20,
                'protocols': {'UDP': 20},
                'packet_sizes': [200] * 20,
            },
            'latency': {
                'tcp_handshakes': [],
                'ping_responses': [],
                'inter_packet_delays': [],
            },
            'packet_loss': [],
        }
        result = a.compute_performance_score()

        # No TCP → retransmission_rate = 0 → perfect loss score
        assert result['packet_loss']['retransmission_rate'] == 0
        assert result['packet_loss']['score'] == 100

    def test_single_packet(self):
        a = NetworkAnalyzer.__new__(NetworkAnalyzer)
        a.packets = [MagicMock(time=5.0)]
        a.analysis_results = {
            'basic_stats': {
                'total_packets': 1,
                'protocols': {'TCP': 1},
                'packet_sizes': [64],
            },
            'latency': {
                'tcp_handshakes': [],
                'ping_responses': [],
                'inter_packet_delays': [],
            },
            'packet_loss': [],
        }
        result = a.compute_performance_score()

        # Single packet → duration ~0 → handle gracefully
        assert 0 <= result['overall'] <= 100

    def test_empty_analysis_results(self):
        a = NetworkAnalyzer.__new__(NetworkAnalyzer)
        a.packets = []
        a.analysis_results = {}
        result = a.compute_performance_score()

        assert result['overall'] == 0
        assert result['grade'] == 'F'
