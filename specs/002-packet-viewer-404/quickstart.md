# Quickstart Guide: Fix Packet Viewer 404 for Timeout Connections

**Feature**: 002-packet-viewer-404
**Date**: 2025-11-17
**Audience**: Developers implementing or testing the fix

## Overview

This guide helps you set up your environment, implement the fix, run tests, and verify the packet viewer works for timeout connections.

**Estimated Time**: 2-3 hours (including testing)

## Prerequisites

### Required

- Python 3.13
- Git (repository cloned)
- Windows or Linux development environment
- Basic understanding of Python, FastAPI, and network protocols

### Recommended

- VS Code or PyCharm
- Scapy experience (helpful but not required)
- Wireshark (for inspecting PCAP files)

## Quick Start

### 1. Environment Setup (10 minutes)

**Step 1: Activate Virtual Environment**

```bash
# Windows
cd D:\work\network_img
.\venv\Scripts\activate

# Linux/Mac
cd /path/to/network_img
source venv/bin/activate
```

**Step 2: Verify Dependencies**

```bash
# Check Python version
python --version  # Should be 3.13.x

# Verify required packages
python -c "import scapy; import fastapi; import pytest; print('All dependencies installed!')"
```

**Step 3: Run Existing Tests**

```bash
# Verify current state (some tests may fail - that's expected)
pytest tests/ -v

# Check if network_analyzer can load
python -c "from network_analyzer import NetworkAnalyzer; print('NetworkAnalyzer loaded successfully')"
```

### 2. Understand the Bug (5 minutes)

**Step 1: Inspect Timeout Timeline**

```bash
# View a timeout connection in the sample data
python -c "
import json
data = json.load(open('public/data/protocol_timeline_sample.json', 'r', encoding='utf-8'))
timeout = [t for t in data['timelines'] if 'timeout' in t['id']][0]
print(json.dumps(timeout, indent=2))
"
```

**Expected Output**:
```json
{
  "id": "timeout-10.1.1.14-13912-172.65.217.212-5223-1004",
  "protocol": "tcp",
  "protocolType": "timeout",
  "stages": [
    {
      "key": "waiting",
      "label": "等待回應",
      "direction": "forward",
      "durationMs": 2274
      // NOTE: No "packetRefs" field! This is the bug.
    }
  ]
}
```

**Step 2: Check Current connection_packets.json**

```bash
# Check if timeout connections have packets
python -c "
import json
try:
    data = json.load(open('public/data/connection_packets.json', 'r', encoding='utf-8'))
    timeout_id = 'timeout-10.1.1.14-13912-172.65.217.212-5223-1004'
    if timeout_id in data:
        print(f'Timeout connection has {len(data[timeout_id])} packets')
    else:
        print('ERROR: Timeout connection not in connection_packets.json (404 bug!)')
except FileNotFoundError:
    print('connection_packets.json not found - run analysis first')
"
```

**Expected**: ERROR message (connection missing → 404 bug)

### 3. Implementation (30-45 minutes)

**Step 1: Open network_analyzer.py**

```bash
# Open in your editor
code network_analyzer.py  # VS Code
# OR
pycharm network_analyzer.py  # PyCharm
```

**Step 2: Add the New Helper Method**

Find the line after `_extract_packet_details()` (around line 895) and add:

```python
def _find_packets_by_connection_id(self, connection_id: str) -> set:
    """Find packet indices for a connection by parsing its ID and scanning packets.

    This method handles all connection types by extracting the 5-tuple from the
    connection ID and matching it against packets in both directions.

    Args:
        connection_id: Connection identifier in one of these formats:
            - Standard: "{protocol}-{srcIp}-{srcPort}-{dstIp}-{dstPort}"
            - Timeout: "timeout-{srcIp}-{srcPort}-{dstIp}-{dstPort}-{packetIndex}"

    Returns:
        set: Set of packet indices matching this connection (empty if none found)
    """
    # Parse connection ID
    parts = connection_id.split('-')

    # Extract 5-tuple based on connection type
    if parts[0] == 'timeout':
        # Format: timeout-srcIp-srcPort-dstIp-dstPort-packetIndex
        if len(parts) < 6:
            return set()  # Invalid format
        src_ip = parts[1]
        try:
            src_port = int(parts[2])
            dst_port = int(parts[4])
        except ValueError:
            return set()  # Port is not an integer
        dst_ip = parts[3]
        # parts[5] is the packet index suffix (we ignore it for matching)
    else:
        # Format: protocol-srcIp-srcPort-dstIp-dstPort
        if len(parts) < 5:
            return set()  # Invalid format
        src_ip = parts[1]
        try:
            src_port = int(parts[2])
            dst_port = int(parts[4])
        except ValueError:
            return set()  # Port is not an integer
        dst_ip = parts[3]

    # Scan packets to find matches (bidirectional)
    matched_indices = set()
    for idx, packet in enumerate(self.packets):
        if not packet.haslayer(IP):
            continue

        ip = packet[IP]

        # Check TCP/UDP layer
        transport_layer = None
        if packet.haslayer(TCP):
            transport_layer = packet[TCP]
        elif packet.haslayer(UDP):
            transport_layer = packet[UDP]
        else:
            continue

        # Match 5-tuple (bidirectional)
        forward_match = (
            ip.src == src_ip and
            transport_layer.sport == src_port and
            ip.dst == dst_ip and
            transport_layer.dport == dst_port
        )

        reverse_match = (
            ip.src == dst_ip and
            transport_layer.sport == dst_port and
            ip.dst == src_ip and
            transport_layer.dport == src_port
        )

        if forward_match or reverse_match:
            matched_indices.add(idx)

    return matched_indices
```

**Step 3: Modify _build_connection_packets()**

Find the `_build_connection_packets()` method (around line 897) and add the fallback:

```python
def _build_connection_packets(self, timelines):
    """Build detailed packet information for each connection.

    Args:
        timelines: List of timeline objects
    """
    connection_packets = {}

    for timeline in timelines:
        connection_id = timeline['id']
        packet_indices = set()

        # PRIMARY PATH: Collect all packet references from stages
        if 'stages' in timeline:
            for stage in timeline['stages']:
                if 'packetRefs' in stage:
                    packet_indices.update(stage['packetRefs'])

        # FALLBACK PATH: If no packetRefs, scan packets by connection ID
        if not packet_indices:
            packet_indices = self._find_packets_by_connection_id(connection_id)

        # Extract details for each packet
        packets = []
        for idx in sorted(packet_indices):
            packet_detail = self._extract_packet_details(idx)
            if packet_detail:
                packets.append(packet_detail)

        # Calculate relative time from first packet
        if packets:
            first_time = packets[0]['timestamp']
            for packet in packets:
                packet['relativeTime'] = f"{packet['timestamp'] - first_time:.3f}s"

        connection_packets[connection_id] = packets

    self.analysis_results['connection_packets'] = connection_packets
```

**Key Changes**:
1. Added comment for PRIMARY PATH
2. Added FALLBACK PATH section (3 lines)
3. No other changes to existing logic

**Step 4: Save and Verify Syntax**

```bash
# Check for syntax errors
python -m py_compile network_analyzer.py
echo $?  # Should print 0 (success)
```

### 4. Testing (45-60 minutes)

**Step 1: Create Unit Test**

Create `tests/unit/test_find_packets_by_connection_id.py`:

```python
"""Unit tests for _find_packets_by_connection_id method."""
import pytest
from network_analyzer import NetworkAnalyzer


class TestFindPacketsByConnectionId:
    """Test packet extraction by connection ID."""

    @pytest.fixture
    def analyzer(self, sample_pcap):
        """Create analyzer with loaded packets."""
        analyzer = NetworkAnalyzer(sample_pcap)
        analyzer.load_packets()
        return analyzer

    def test_parse_standard_connection_id(self, analyzer):
        """Test parsing standard connection ID format."""
        connection_id = "tcp-10.1.1.14-5434-210.71.227.211-443"
        result = analyzer._find_packets_by_connection_id(connection_id)

        assert isinstance(result, set)
        assert all(isinstance(idx, int) for idx in result)

    def test_parse_timeout_connection_id(self, analyzer):
        """Test parsing timeout connection ID format."""
        connection_id = "timeout-10.1.1.14-9492-172.64.153.46-443-4632"
        result = analyzer._find_packets_by_connection_id(connection_id)

        assert isinstance(result, set)
        # Should find packets (exact count depends on PCAP)

    def test_malformed_connection_id(self, analyzer):
        """Test handling of malformed connection ID."""
        result = analyzer._find_packets_by_connection_id("invalid-id")
        assert result == set()

    def test_no_matching_packets(self, analyzer):
        """Test connection ID with no matching packets."""
        connection_id = "tcp-1.2.3.4-1234-5.6.7.8-5678"
        result = analyzer._find_packets_by_connection_id(connection_id)
        assert result == set()

    def test_bidirectional_matching(self, analyzer):
        """Test that packets in both directions are matched."""
        # Find a real connection in the PCAP
        analyzer.generate_protocol_timelines()
        timelines = analyzer.analysis_results['protocol_timelines']['timelines']

        # Get first non-timeout connection
        connection = [t for t in timelines if 'timeout' not in t['id']][0]
        connection_id = connection['id']

        result = analyzer._find_packets_by_connection_id(connection_id)
        assert len(result) > 0  # Should find packets
```

**Step 2: Run Unit Tests**

```bash
# Run only the new test
pytest tests/unit/test_find_packets_by_connection_id.py -v

# Expected: All tests pass
```

**Step 3: Integration Test with Real PCAP**

```bash
# Test with existing PCAP file
python -c "
from network_analyzer import NetworkAnalyzer

# Analyze existing PCAP
analyzer = NetworkAnalyzer('public/data/tmpio6v6bfz.pcapng')
analyzer.load_packets()
analyzer.generate_protocol_timelines()

# Get timeout connection
timelines = analyzer.analysis_results['protocol_timelines']['timelines']
timeout = [t for t in timelines if 'timeout' in t['id']][0]

print(f'Timeout connection: {timeout[\"id\"]}')

# Check if packets extracted
packets = analyzer.analysis_results['connection_packets'].get(timeout['id'], [])
print(f'Packets found: {len(packets)}')
print(f'Expected: ~{timeout[\"metrics\"][\"packetCount\"]}')

if len(packets) > 0:
    print('SUCCESS: Timeout packets extracted!')
    print(f'First packet: index={packets[0][\"index\"]}, relativeTime={packets[0][\"relativeTime\"]}')
else:
    print('FAILURE: No packets extracted')
"
```

**Expected Output**:
```
Timeout connection: timeout-10.1.1.14-13912-172.65.217.212-5223-1004
Packets found: 5
Expected: ~5
SUCCESS: Timeout packets extracted!
First packet: index=1000, relativeTime=0.000s
```

### 5. Manual Testing with Frontend (15 minutes)

**Step 1: Start Backend**

```bash
# Terminal 1: Start FastAPI server
uvicorn analysis_server:app --reload
```

**Step 2: Start Frontend**

```bash
# Terminal 2: Start Vite dev server
npm run dev
```

**Step 3: Test in Browser**

1. Open http://localhost:5173
2. Click on a **timeout connection** in the MindMap (look for yellow/orange connections)
3. **Expected**: Packet viewer panel opens on the right with packet details
4. **Verify**:
   - Packet list is NOT empty
   - 5-tuple shows correct IPs and ports
   - Headers show TCP/UDP flags
   - Relative timestamps start at "0.000s"

**Step 4: Check Browser Console**

```javascript
// Should see successful API request (not 404)
// Example:
GET /api/packets/timeout-10.1.1.14-9492-172.64.153.46-443-4632 200 OK
```

**Previously** (bug):
```javascript
GET /api/packets/timeout-10.1.1.14-9492-172.64.153.46-443-4632 404 Not Found
```

### 6. Performance Verification (10 minutes)

**Test 1: Small PCAP (< 1K packets)**

```bash
time python -c "
from network_analyzer import NetworkAnalyzer
analyzer = NetworkAnalyzer('test_small.pcap')
analyzer.load_packets()
analyzer.generate_protocol_timelines()
"
```

**Expected**: < 1 second

**Test 2: Medium PCAP (5-10K packets)**

```bash
time python -c "
from network_analyzer import NetworkAnalyzer
analyzer = NetworkAnalyzer('public/data/tmpio6v6bfz.pcapng')
analyzer.load_packets()
analyzer.generate_protocol_timelines()
"
```

**Expected**: < 3 seconds

**Test 3: Check Fallback Usage**

Add debug logging to see which path is used:

```python
# In _build_connection_packets(), after fallback check:
if not packet_indices:
    print(f"DEBUG: Using fallback for {connection_id}")
    packet_indices = self._find_packets_by_connection_id(connection_id)
else:
    print(f"DEBUG: Using packetRefs for {connection_id}")
```

Run analysis and count fallback vs. primary path usage:

```bash
python -c "
from network_analyzer import NetworkAnalyzer
analyzer = NetworkAnalyzer('public/data/tmpio6v6bfz.pcapng')
analyzer.load_packets()
analyzer.generate_protocol_timelines()
" | grep "DEBUG:" | sort | uniq -c
```

**Expected**:
```
  450 DEBUG: Using packetRefs for tcp-...
   50 DEBUG: Using fallback for timeout-...
```

## Troubleshooting

### Issue 1: Import Error (Scapy)

**Error**: `ImportError: No module named 'scapy'`

**Solution**:
```bash
pip install scapy
# OR
pip install -r requirements.txt
```

### Issue 2: Syntax Error in network_analyzer.py

**Error**: `SyntaxError: invalid syntax`

**Solution**:
- Check indentation (should be 4 spaces, not tabs)
- Verify all parentheses/brackets are closed
- Run: `python -m py_compile network_analyzer.py` to find the line

### Issue 3: Test Fails - No Packets Found

**Error**: `AssertionError: len(packets) == 0`

**Possible Causes**:
1. **PCAP file doesn't have timeout connections**: Check with `grep -c "timeout" public/data/protocol_timeline_sample.json`
2. **Connection ID mismatch**: Print `connection_id` and verify format
3. **IP address format**: Ensure IPs are strings, not bytes

**Debug**:
```python
# Add print statements in _find_packets_by_connection_id
print(f"Parsing: {connection_id}")
print(f"5-tuple: src={src_ip}:{src_port}, dst={dst_ip}:{dst_port}")
print(f"Matched {len(matched_indices)} packets")
```

### Issue 4: Frontend Still Shows 404

**Possible Causes**:
1. **Backend not restarted**: Restart `uvicorn analysis_server:app --reload`
2. **Old connection_packets.json**: Re-analyze PCAP to regenerate file
3. **Browser cache**: Hard refresh (Ctrl+Shift+R)

**Solution**:
```bash
# Re-analyze PCAP
python -c "
from network_analyzer import NetworkAnalyzer
analyzer = NetworkAnalyzer('public/data/tmpio6v6bfz.pcapng')
analyzer.load_packets()
analyzer.generate_protocol_timelines()
analyzer.save_results(public_output_dir='public/data')
"

# Restart backend
# Ctrl+C in terminal, then:
uvicorn analysis_server:app --reload
```

### Issue 5: Performance Too Slow

**Symptom**: Analysis takes > 10 seconds for medium PCAP

**Debug**:
```python
import time

# In _build_connection_packets(), add timing:
start = time.time()
packet_indices = self._find_packets_by_connection_id(connection_id)
elapsed = time.time() - start
if elapsed > 0.5:
    print(f"SLOW: {connection_id} took {elapsed:.2f}s")
```

**Solutions**:
1. **Reduce PCAP size**: Test with smaller file first
2. **Optimize loop**: Add early termination (future enhancement)
3. **Build index**: Implement 5-tuple index (future enhancement)

## Next Steps

### After Implementation

1. **Run Full Test Suite**:
   ```bash
   pytest tests/ -v --cov=network_analyzer
   ```

2. **Check Code Coverage**:
   ```bash
   pytest --cov=network_analyzer --cov-report=html
   open htmlcov/index.html
   ```

3. **Create Pull Request** (if using /speckit.tasks):
   ```bash
   git add network_analyzer.py tests/
   git commit -m "Fix packet viewer 404 for timeout connections"
   git push origin 002-packet-viewer-404
   # Create PR via GitHub/GitLab UI
   ```

### Further Reading

- **Spec**: [spec.md](./spec.md) - User scenarios and requirements
- **Research**: [research.md](./research.md) - Root cause analysis
- **Data Model**: [data-model.md](./data-model.md) - Entity definitions
- **Contracts**: [contracts/](./contracts/) - Method specifications

## Quick Reference

### File Locations

```
D:\work\network_img\
├── network_analyzer.py           # MODIFY: Add _find_packets_by_connection_id()
├── analysis_server.py            # NO CHANGES
├── tests/
│   ├── unit/
│   │   └── test_find_packets_by_connection_id.py  # NEW
│   └── integration/
│       └── test_packet_viewer_api.py              # NEW
└── public/data/
    ├── protocol_timeline_sample.json              # Test fixture
    └── connection_packets.json                    # Generated output
```

### Key Commands

```bash
# Activate environment
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Run tests
pytest tests/ -v

# Run specific test
pytest tests/unit/test_find_packets_by_connection_id.py -v

# Start backend
uvicorn analysis_server:app --reload

# Start frontend
npm run dev

# Check syntax
python -m py_compile network_analyzer.py

# Analyze PCAP
python -c "from network_analyzer import NetworkAnalyzer; analyzer = NetworkAnalyzer('file.pcap'); analyzer.load_packets(); analyzer.generate_protocol_timelines(); analyzer.save_results()"
```

### Expected Test Results

| Test | Expected Result | Time |
|------|----------------|------|
| `test_parse_standard_connection_id` | ✅ PASS | < 1s |
| `test_parse_timeout_connection_id` | ✅ PASS | < 1s |
| `test_malformed_connection_id` | ✅ PASS | < 0.1s |
| `test_no_matching_packets` | ✅ PASS | < 1s |
| `test_bidirectional_matching` | ✅ PASS | < 1s |
| Integration test with real PCAP | ✅ PASS | < 3s |
| Frontend manual test | ✅ Packet viewer opens | N/A |

## Summary Checklist

- [ ] Virtual environment activated
- [ ] Dependencies verified (scapy, fastapi, pytest)
- [ ] Understood the bug (timeout stages lack packetRefs)
- [ ] Implemented `_find_packets_by_connection_id()` method
- [ ] Modified `_build_connection_packets()` with fallback
- [ ] Created unit tests
- [ ] All unit tests pass
- [ ] Integration test with real PCAP passes
- [ ] Frontend manual test successful (no 404)
- [ ] Performance acceptable (< 3s for medium PCAP)
- [ ] Code committed and pushed (if applicable)

**Congratulations!** You've successfully fixed the packet viewer 404 error for timeout connections. 🎉
