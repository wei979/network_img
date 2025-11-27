# Contract: `_build_connection_packets()`

**Method**: `NetworkAnalyzer._build_connection_packets(timelines: list) -> None`
**File**: `network_analyzer.py`
**Type**: Private helper method

## Purpose

Build detailed packet information for each connection timeline and store in `self.analysis_results['connection_packets']`. This method extracts packet details from the PCAP based on timeline metadata and calculates relative timestamps.

**Key Change**: Add fallback mechanism to extract packets for connections without `packetRefs` (e.g., timeout connections).

## Signature

```python
def _build_connection_packets(self, timelines: list) -> None:
    """Build detailed packet information for each connection.

    Extracts packet details for all connections in the timeline list. Uses
    stage['packetRefs'] as the primary source, with fallback to 5-tuple-based
    packet scanning for connections lacking packetRefs (e.g., timeouts).

    Args:
        timelines: List of timeline dictionaries from generate_protocol_timelines().
                   Each timeline must have 'id' and 'stages' fields.

    Returns:
        None. Modifies self.analysis_results['connection_packets'] in place.

    Side Effects:
        - Sets self.analysis_results['connection_packets'] to dict mapping
          connection IDs to packet detail lists
        - Calls self._extract_packet_details() for each packet
        - Calls self._find_packets_by_connection_id() for fallback path

    Examples:
        >>> analyzer.generate_protocol_timelines()
        >>> analyzer._build_connection_packets(analyzer.analysis_results['protocol_timelines']['timelines'])
        >>> analyzer.analysis_results['connection_packets']['tcp-10.1.1.14-5434-210.71.227.211-443']
        [
            {'index': 4217, 'timestamp': 1760710355.982, 'fiveTuple': {...}, ...},
            {'index': 4219, 'timestamp': 1760710355.989, 'fiveTuple': {...}, ...},
            {'index': 4220, 'timestamp': 1760710355.990, 'fiveTuple': {...}, ...}
        ]
    """
```

## Inputs

### `timelines` (list, required)

List of timeline dictionaries from `generate_protocol_timelines()`.

**Structure**:
```python
[
    {
        'id': 'tcp-10.1.1.14-5434-210.71.227.211-443',
        'protocol': 'tcp',
        'protocolType': 'tcp-handshake',
        'stages': [
            {
                'key': 'syn',
                'label': 'SYN Sent',
                'direction': 'forward',
                'durationMs': 7,
                'packetRefs': [4217]  # PRESENT in standard connections
            },
            # ... more stages
        ],
        'metrics': {
            'rttMs': 7,
            'packetCount': 3
        }
    },
    {
        'id': 'timeout-10.1.1.14-9492-172.64.153.46-443-4632',
        'protocol': 'tcp',
        'protocolType': 'timeout',
        'stages': [
            {
                'key': 'waiting',
                'label': '等待回應',
                'direction': 'forward',
                'durationMs': 2274
                # NO packetRefs field! ← This is why we need fallback
            }
        ],
        'metrics': {
            'timeoutMs': 4548,
            'packetCount': 5
        }
    }
]
```

**Required Fields**:
- `id` (string): Connection identifier
- `stages` (list): List of stage dictionaries
  - `packetRefs` (list, optional): Packet indices for this stage

**Optional Fields**:
- `metrics.packetCount` (int): Expected packet count (used for validation)

## Outputs

### Return Value: `None`

Method modifies `self.analysis_results['connection_packets']` in place.

### Side Effect: `self.analysis_results['connection_packets']`

Dictionary mapping connection IDs to packet detail lists.

**Structure**:
```python
{
    "tcp-10.1.1.14-5434-210.71.227.211-443": [
        {
            "index": 4217,
            "timestamp": 1760710355.982,
            "relativeTime": "0.000s",
            "length": 66,
            "fiveTuple": {
                "srcIp": "10.1.1.14",
                "srcPort": 5434,
                "dstIp": "210.71.227.211",
                "dstPort": 443,
                "protocol": "TCP"
            },
            "headers": {
                "ip": {"version": 4, "ttl": 64, "protocol": 6},
                "tcp": {"flags": "SYN", "seq": 1234567890, "ack": 0, ...}
            },
            "payload": {
                "length": 0,
                "preview": "",
                "ascii": ""
            }
        },
        # ... more packets
    ],
    "timeout-10.1.1.14-9492-172.64.153.46-443-4632": [
        # ... timeout connection packets (NEW - from fallback path)
    ]
}
```

**Characteristics**:
- **Keys**: Connection IDs (strings)
- **Values**: Lists of packet detail dictionaries
- **Ordering**: Packets sorted by timestamp within each connection
- **Completeness**: ALL connections from timelines included (even if empty packet list)

## Behavior

### Algorithm

```
1. Initialize connection_packets = {}

2. For each timeline in timelines:
    a. Extract connection_id from timeline['id']
    b. Initialize packet_indices = set()

    c. PRIMARY PATH: Extract from packetRefs
       For each stage in timeline['stages']:
           If stage has 'packetRefs':
               Add all packetRefs to packet_indices

    d. FALLBACK PATH: If packet_indices is empty
       packet_indices = _find_packets_by_connection_id(connection_id)

    e. Extract packet details
       packets = []
       For each index in sorted(packet_indices):
           packet_detail = _extract_packet_details(index)
           If packet_detail is not None:
               packets.append(packet_detail)

    f. Calculate relative timestamps
       If packets is not empty:
           first_time = packets[0]['timestamp']
           For each packet in packets:
               packet['relativeTime'] = f"{packet['timestamp'] - first_time:.3f}s"

    g. Store result
       connection_packets[connection_id] = packets

3. Store final result
   self.analysis_results['connection_packets'] = connection_packets
```

### Changes from Current Implementation

**BEFORE (Current - Broken for Timeout)**:
```python
def _build_connection_packets(self, timelines):
    connection_packets = {}

    for timeline in timelines:
        connection_id = timeline['id']
        packet_indices = set()

        # Extract all packet references from stages
        if 'stages' in timeline:
            for stage in timeline['stages']:
                if 'packetRefs' in stage:
                    packet_indices.update(stage['packetRefs'])

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

        connection_packets[connection_id] = packets  # Empty for timeout!

    self.analysis_results['connection_packets'] = connection_packets
```

**AFTER (Fixed with Fallback)**:
```python
def _build_connection_packets(self, timelines):
    connection_packets = {}

    for timeline in timelines:
        connection_id = timeline['id']
        packet_indices = set()

        # PRIMARY: Extract all packet references from stages
        if 'stages' in timeline:
            for stage in timeline['stages']:
                if 'packetRefs' in stage:
                    packet_indices.update(stage['packetRefs'])

        # FALLBACK: If no packetRefs found, scan packets by connection ID
        if not packet_indices:
            packet_indices = self._find_packets_by_connection_id(connection_id)

        # Extract details for each packet (unchanged)
        packets = []
        for idx in sorted(packet_indices):
            packet_detail = self._extract_packet_details(idx)
            if packet_detail:
                packets.append(packet_detail)

        # Calculate relative time from first packet (unchanged)
        if packets:
            first_time = packets[0]['timestamp']
            for packet in packets:
                packet['relativeTime'] = f"{packet['timestamp'] - first_time:.3f}s"

        connection_packets[connection_id] = packets  # Now includes timeout packets!

    self.analysis_results['connection_packets'] = connection_packets
```

**Key Difference**: Added 3 lines to invoke fallback when `packet_indices` is empty.

## Edge Cases

### EC-1: Empty Timeline List

**Input**: `timelines = []`

**Behavior**:
```python
for timeline in []:  # Loop doesn't execute
    pass

connection_packets = {}  # Empty dict
self.analysis_results['connection_packets'] = {}
```

**Output**: `self.analysis_results['connection_packets'] = {}`

---

### EC-2: Timeline Without Stages

**Input**:
```python
timelines = [
    {
        'id': 'tcp-10.1.1.14-5434-210.71.227.211-443',
        # No 'stages' field
    }
]
```

**Behavior**:
```python
if 'stages' in timeline:  # False
    pass  # Skip packetRefs extraction

if not packet_indices:  # True (empty set)
    packet_indices = self._find_packets_by_connection_id(connection_id)
```

**Output**: Fallback path used, packets extracted by 5-tuple matching

---

### EC-3: Mixed Timelines (Some with packetRefs, Some Without)

**Input**:
```python
timelines = [
    {
        'id': 'tcp-10.1.1.14-5434-210.71.227.211-443',
        'stages': [
            {'key': 'syn', 'packetRefs': [4217]}  # HAS packetRefs
        ]
    },
    {
        'id': 'timeout-10.1.1.14-9492-172.64.153.46-443-4632',
        'stages': [
            {'key': 'waiting'}  # NO packetRefs
        ]
    }
]
```

**Behavior**:
- First timeline: Primary path (packetRefs)
- Second timeline: Fallback path (_find_packets_by_connection_id)

**Output**:
```python
{
    'tcp-10.1.1.14-5434-210.71.227.211-443': [...],  # From packetRefs
    'timeout-10.1.1.14-9492-172.64.153.46-443-4632': [...]  # From fallback
}
```

---

### EC-4: Invalid Packet Index in packetRefs

**Input**:
```python
stages = [
    {'key': 'syn', 'packetRefs': [99999]}  # Index out of range
]
```

**Behavior**:
```python
packet_detail = self._extract_packet_details(99999)
# _extract_packet_details returns None for invalid index
if packet_detail:  # False
    packets.append(packet_detail)  # Not appended
```

**Output**: Empty packet list for this connection (graceful handling)

---

### EC-5: No Matching Packets in Fallback

**Input**:
```python
connection_id = "timeout-1.2.3.4-1234-5.6.7.8-5678"
# No packets in PCAP match this 5-tuple
```

**Behavior**:
```python
packet_indices = self._find_packets_by_connection_id(connection_id)
# Returns set()

for idx in sorted(set()):  # Loop doesn't execute
    pass

packets = []  # Empty list
connection_packets[connection_id] = []
```

**Output**: Empty packet list (acceptable - API returns 404)

---

### EC-6: Single Packet Connection

**Input**:
```python
stages = [
    {'key': 'send', 'packetRefs': [100]}
]
```

**Behavior**:
```python
packets = [packet_detail_100]
first_time = packets[0]['timestamp']  # e.g., 1760710355.982

# Only one packet
packets[0]['relativeTime'] = f"{1760710355.982 - 1760710355.982:.3f}s"
# = "0.000s"
```

**Output**: Single packet with relativeTime "0.000s"

## Error Handling

### Invalid Timeline Structure

**Error**: Timeline missing 'id' field
**Handling**: KeyError raised (expected - indicates bug in timeline generation)

```python
connection_id = timeline['id']  # Raises KeyError if missing
```

**Mitigation**: None - this indicates a serious bug that should be caught in tests.

### Packet Extraction Failure

**Error**: `_extract_packet_details(idx)` returns None
**Handling**: Skip packet (don't add to list)

```python
packet_detail = self._extract_packet_details(idx)
if packet_detail:  # Check for None
    packets.append(packet_detail)
```

**Result**: Packet count may be less than expected (acceptable)

### Empty Packet List

**Error**: No packets found for connection
**Handling**: Store empty list (no special case)

```python
connection_packets[connection_id] = []  # Empty list is valid
```

**Result**: API returns 404 for this connection (expected behavior)

## Dependencies

### Internal Methods

- `self._extract_packet_details(idx)`: Extract packet details (existing)
- `self._find_packets_by_connection_id(connection_id)`: Fallback packet finder (NEW)

### Instance Variables

- `self.packets`: Loaded packet list (from `load_packets()`)
- `self.analysis_results`: Analysis results dictionary

### Preconditions

1. `self.packets` must be populated (non-empty)
2. `timelines` must be a list (can be empty)
3. Each timeline must have 'id' field (required)

### Postconditions

1. `self.analysis_results['connection_packets']` is always set (dict)
2. Keys match timeline IDs
3. Values are lists (can be empty)
4. Packets in each list are sorted by timestamp

## Performance

### Time Complexity

**Best Case**: O(P) where P = total packets referenced in packetRefs
- All connections have packetRefs
- No fallback path used

**Worst Case**: O(T × N) where T = timeout connections, N = total packets
- All timeout connections use fallback
- Each fallback scans all packets

**Typical Case**: O(P + T × N) where T ≈ 50, N ≈ 10K
- Most connections use primary path
- Few timeouts use fallback
- Expected: < 500ms for typical PCAP files

### Space Complexity

**O(C × M)** where:
- C = number of connections
- M = average packets per connection

**Typical**: 500 connections × 10 packets = 5000 packet details ≈ 2MB

## Testing

### Unit Tests

**Test 1: Primary Path (with packetRefs)**
```python
def test_primary_path_with_packet_refs():
    timelines = [
        {
            'id': 'tcp-10.1.1.14-5434-210.71.227.211-443',
            'stages': [
                {'key': 'syn', 'packetRefs': [0]},
                {'key': 'syn-ack', 'packetRefs': [1]},
                {'key': 'ack', 'packetRefs': [2]}
            ]
        }
    ]

    analyzer._build_connection_packets(timelines)

    packets = analyzer.analysis_results['connection_packets']['tcp-10.1.1.14-5434-210.71.227.211-443']
    assert len(packets) == 3
    assert packets[0]['index'] == 0
    assert packets[0]['relativeTime'] == "0.000s"
```

**Test 2: Fallback Path (without packetRefs)**
```python
def test_fallback_path_without_packet_refs():
    timelines = [
        {
            'id': 'timeout-10.1.1.14-9492-172.64.153.46-443-4632',
            'stages': [
                {'key': 'waiting'}  # No packetRefs
            ]
        }
    ]

    # Mock _find_packets_by_connection_id to return test indices
    analyzer._find_packets_by_connection_id = lambda cid: {10, 11, 12}

    analyzer._build_connection_packets(timelines)

    packets = analyzer.analysis_results['connection_packets']['timeout-10.1.1.14-9492-172.64.153.46-443-4632']
    assert len(packets) == 3  # From fallback
```

**Test 3: Mixed Timelines**
```python
def test_mixed_timelines():
    timelines = [
        {
            'id': 'tcp-10.1.1.14-5434-210.71.227.211-443',
            'stages': [{'key': 'syn', 'packetRefs': [0]}]
        },
        {
            'id': 'timeout-10.1.1.14-9492-172.64.153.46-443-4632',
            'stages': [{'key': 'waiting'}]  # No packetRefs
        }
    ]

    analyzer._build_connection_packets(timelines)

    result = analyzer.analysis_results['connection_packets']
    assert 'tcp-10.1.1.14-5434-210.71.227.211-443' in result
    assert 'timeout-10.1.1.14-9492-172.64.153.46-443-4632' in result
```

**Test 4: Empty Timeline List**
```python
def test_empty_timeline_list():
    analyzer._build_connection_packets([])

    result = analyzer.analysis_results['connection_packets']
    assert result == {}  # Empty dict
```

**Test 5: Relative Time Calculation**
```python
def test_relative_time_calculation():
    # Mock packets with timestamps
    timelines = [
        {
            'id': 'tcp-10.1.1.14-5434-210.71.227.211-443',
            'stages': [
                {'key': 'syn', 'packetRefs': [0]},
                {'key': 'syn-ack', 'packetRefs': [1]}
            ]
        }
    ]

    analyzer._build_connection_packets(timelines)

    packets = analyzer.analysis_results['connection_packets']['tcp-10.1.1.14-5434-210.71.227.211-443']
    assert packets[0]['relativeTime'] == "0.000s"
    assert packets[1]['relativeTime'] > "0.000s"  # Later packet
```

### Integration Tests

**Test 6: Real PCAP with Timeout Connections**
```python
def test_real_pcap_with_timeouts():
    analyzer = NetworkAnalyzer("test.pcap")
    analyzer.load_packets()

    timelines_data = analyzer.generate_protocol_timelines()
    timelines = timelines_data['timelines']

    # Find timeout connection
    timeout = [t for t in timelines if 'timeout' in t['id']][0]

    # Verify packets extracted
    packets = analyzer.analysis_results['connection_packets'][timeout['id']]
    assert len(packets) > 0  # Should have packets now (not empty)
    assert packets[0]['relativeTime'] == "0.000s"
```

## Examples

### Example 1: Standard TCP Connection (Primary Path)

**Input**:
```python
timelines = [
    {
        'id': 'tcp-10.1.1.14-5434-210.71.227.211-443',
        'stages': [
            {'key': 'syn', 'packetRefs': [4217]},
            {'key': 'syn-ack', 'packetRefs': [4219]},
            {'key': 'ack', 'packetRefs': [4220]}
        ]
    }
]
```

**Execution**:
```python
packet_indices = {4217, 4219, 4220}  # From packetRefs
# No fallback needed

packets = [
    extract_packet_details(4217),
    extract_packet_details(4219),
    extract_packet_details(4220)
]

# Calculate relative times
packets[0]['relativeTime'] = "0.000s"  # First packet
packets[1]['relativeTime'] = "0.007s"  # 7ms after first
packets[2]['relativeTime'] = "0.008s"  # 8ms after first
```

**Output**:
```python
{
    'tcp-10.1.1.14-5434-210.71.227.211-443': [
        {'index': 4217, 'relativeTime': "0.000s", ...},
        {'index': 4219, 'relativeTime': "0.007s", ...},
        {'index': 4220, 'relativeTime': "0.008s", ...}
    ]
}
```

### Example 2: Timeout Connection (Fallback Path)

**Input**:
```python
timelines = [
    {
        'id': 'timeout-10.1.1.14-9492-172.64.153.46-443-4632',
        'stages': [
            {'key': 'waiting'},  # No packetRefs!
            {'key': 'timeout'}   # No packetRefs!
        ]
    }
]
```

**Execution**:
```python
packet_indices = set()  # Empty from packetRefs

# Fallback triggered
packet_indices = _find_packets_by_connection_id('timeout-10.1.1.14-9492-172.64.153.46-443-4632')
# Returns {4629, 4630, 4632, 4633}

packets = [
    extract_packet_details(4629),
    extract_packet_details(4630),
    extract_packet_details(4632),
    extract_packet_details(4633)
]

# Calculate relative times
packets[0]['relativeTime'] = "0.000s"
packets[1]['relativeTime'] = "0.100s"
packets[2]['relativeTime'] = "3.200s"  # After timeout gap
packets[3]['relativeTime'] = "3.201s"
```

**Output**:
```python
{
    'timeout-10.1.1.14-9492-172.64.153.46-443-4632': [
        {'index': 4629, 'relativeTime': "0.000s", ...},
        {'index': 4630, 'relativeTime': "0.100s", ...},
        {'index': 4632, 'relativeTime': "3.200s", ...},
        {'index': 4633, 'relativeTime': "3.201s", ...}
    ]
}
```

## Future Enhancements

### Enhancement 1: Add Logging

Log which path was used for each connection:

```python
if not packet_indices:
    logger.debug(f"Using fallback for connection: {connection_id}")
    packet_indices = self._find_packets_by_connection_id(connection_id)
else:
    logger.debug(f"Using packetRefs for connection: {connection_id}")
```

### Enhancement 2: Validate Packet Count

Compare extracted packet count with timeline metrics:

```python
expected_count = timeline.get('metrics', {}).get('packetCount')
if expected_count and len(packets) < expected_count * 0.8:
    logger.warning(f"Missing packets for {connection_id}: expected {expected_count}, got {len(packets)}")
```

### Enhancement 3: Parallel Processing

Process connections in parallel for large PCAP files:

```python
from concurrent.futures import ThreadPoolExecutor

with ThreadPoolExecutor(max_workers=4) as executor:
    results = executor.map(process_connection, timelines)
    connection_packets = dict(results)
```
