"""Pytest fixtures for network analyzer tests."""

import pytest
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


@pytest.fixture
def sample_pcap():
    """Provide path to test PCAP file."""
    pcap_path = project_root / "lostpakage.pcapng"
    if not pcap_path.exists():
        pytest.skip(f"Test PCAP file not found: {pcap_path}")
    return str(pcap_path)


@pytest.fixture
def analyzer_with_packets(sample_pcap):
    """Provide NetworkAnalyzer instance with loaded packets."""
    from network_analyzer import NetworkAnalyzer

    analyzer = NetworkAnalyzer(sample_pcap)
    analyzer.load_packets()
    return analyzer


@pytest.fixture
def sample_timeline_json():
    """Provide path to sample timeline JSON."""
    json_path = project_root / "public" / "data" / "protocol_timeline_sample.json"
    if not json_path.exists():
        pytest.skip(f"Sample timeline JSON not found: {json_path}")
    return str(json_path)


@pytest.fixture
def timeout_connection_id():
    """Provide a sample timeout connection ID."""
    return "timeout-10.1.1.14-9492-172.64.153.46-443-4632"


@pytest.fixture
def standard_connection_id():
    """Provide a sample standard TCP connection ID."""
    return "tcp-10.1.1.14-5434-210.71.227.211-443"
