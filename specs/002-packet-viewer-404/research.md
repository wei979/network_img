# Research: Fix Packet Viewer 404 Error for Timeout Connections

**Branch**: `002-packet-viewer-404`
**Date**: 2025-11-17
**Phase**: 0 (Research)

## Problem Analysis

### Current Behavior

The packet viewer returns 404 errors when users click on timeout connections in the MindMap visualization. This happens because timeout timelines have a different ID format and missing packet references compared to other connection types.

### Timeline ID Format Comparison

**Standard Connections:**
```
tcp-{srcIp}-{srcPort}-{dstIp}-{dstPort}
udp-{srcIp}-{srcPort}-{dstIp}-{dstPort}
http-{srcIp}-{srcPort}-{dstIp}-{dstPort}
```

**Timeout Connections:**
```
timeout-{srcIp}-{srcPort}-{dstIp}-{dstPort}-{packetIndex}
```

Example: `timeout-10.1.1.14-9492-172.64.153.46-443-4632`

### Root Cause

1. **Missing packetRefs**: The `_detect_timeouts()` method (lines 405-462 in network_analyzer.py) creates timeline stages WITHOUT `packetRefs` arrays
2. **ID format mismatch**: Timeout IDs include a trailing packet index that standard connections don't have
3. **Packet extraction failure**: The `_build_connection_packets()` method (lines 897-930) depends on `packetRefs` to extract packet details, so it creates empty packet lists for timeout connections

### Code Evidence

**From `_detect_timeouts()` (network_analyzer.py:438-451):**
```python
'stages': [
    {
        'key': 'waiting',
        'label': '等待回應',
        'direction': 'forward',
        'durationMs': int(time_gap * 1000 * 0.5)
        # NO packetRefs field!
    },
    {
        'key': 'timeout',
        'label': '連線超時',
        'direction': 'none',
        'durationMs': int(time_gap * 1000 * 0.5)
        # NO packetRefs field!
    }
]
```

**From `_build_connection_packets()` (network_analyzer.py:910-913):**
```python
# Collect all packet references from stages
if 'stages' in timeline:
    for stage in timeline['stages']:
        if 'packetRefs' in stage:  # This condition fails for timeout stages
            packet_indices.update(stage['packetRefs'])
```

### Data Model Analysis

**Timeout Timeline Structure (actual data):**
```json
{
  "id": "timeout-10.1.1.14-13912-172.65.217.212-5223-1004",
  "protocol": "tcp",
  "protocolType": "timeout",
  "startEpochMs": 1760710336231,
  "endEpochMs": 1760710340780,
  "stages": [
    {
      "key": "waiting",
      "label": "等待回應",
      "direction": "forward",
      "durationMs": 2274
    },
    {
      "key": "timeout",
      "label": "連線超時",
      "direction": "none",
      "durationMs": 2274
    }
  ],
  "metrics": {
    "timeoutMs": 4548,
    "packetCount": 5
  }
}
```

Note:
- The ID contains packet index `1004` at the end
- Stages have NO `packetRefs` arrays
- Metrics show `packetCount: 5` but we don't know which 5 packets

### Timeout Detection Logic

From network_analyzer.py lines 410-460:

1. Tracks all TCP connections by 5-tuple: `(srcIp, srcPort, dstIp, dstPort)`
2. For each connection, maintains:
   - `start_packet`: First packet index
   - `packet_count`: Total packets seen
   - `last_time`: Timestamp of most recent packet
3. When time gap > 3 seconds detected between packets:
   - Creates timeout timeline with ID including the CURRENT packet index
   - The ID suffix represents the packet that arrived AFTER the timeout
   - Does NOT store the packet index of the last packet BEFORE timeout

### Missing Information

To build packet details for timeout connections, we need:
1. **All packet indices** for this connection (not just the one after timeout)
2. **5-tuple matching**: Extract srcIp, srcPort, dstIp, dstPort from timeout ID
3. **Packet scanning**: Search through all packets to find matching 5-tuple

## Proposed Solution

### Approach 1: Add packetRefs to Timeout Stages (RECOMMENDED)

**Pros:**
- Consistent with other timeline types
- Minimal changes to `_build_connection_packets()`
- Better data model consistency

**Cons:**
- Requires modifying `_detect_timeouts()` to track packet indices
- May need to scan packets twice (detection + ref collection)

### Approach 2: Parse Timeout ID and Scan Packets

**Pros:**
- No changes to `_detect_timeouts()`
- Simpler immediate fix

**Cons:**
- Inconsistent data model
- Less efficient (requires packet scanning for EVERY timeout connection)
- Doesn't leverage existing packet tracking in timeout detection

### Approach 3: Hybrid - Add Fallback to `_build_connection_packets()`

**Pros:**
- Fixes the bug without changing timeout detection
- Maintains backward compatibility
- Handles edge cases gracefully

**Cons:**
- More complex logic in `_build_connection_packets()`
- Still requires packet scanning for timeouts

## Recommended Implementation: Approach 3 (Hybrid)

Modify `_build_connection_packets()` to:

1. **Primary path**: Extract packets using `packetRefs` (existing behavior)
2. **Fallback path**: For timelines with empty packet_indices (timeout connections):
   - Parse connection ID to extract 5-tuple
   - Scan `self.packets` to find all matching packets
   - Extract packet details for matched packets

### Algorithm Pseudocode

```python
def _build_connection_packets(self, timelines):
    connection_packets = {}

    for timeline in timelines:
        connection_id = timeline['id']
        packet_indices = set()

        # Primary: Extract from packetRefs
        if 'stages' in timeline:
            for stage in timeline['stages']:
                if 'packetRefs' in stage:
                    packet_indices.update(stage['packetRefs'])

        # Fallback: For timeout/other connections without packetRefs
        if not packet_indices:
            packet_indices = self._find_packets_by_connection_id(connection_id)

        # Extract details for each packet
        packets = []
        for idx in sorted(packet_indices):
            packet_detail = self._extract_packet_details(idx)
            if packet_detail:
                packets.append(packet_detail)

        # Calculate relative time
        if packets:
            first_time = packets[0]['timestamp']
            for packet in packets:
                packet['relativeTime'] = f"{packet['timestamp'] - first_time:.3f}s"

        connection_packets[connection_id] = packets

    self.analysis_results['connection_packets'] = connection_packets
```

### New Helper Method

```python
def _find_packets_by_connection_id(self, connection_id: str) -> set:
    """Extract packet indices for a connection by parsing its ID and scanning packets.

    Handles all connection types:
    - tcp/udp/http: tcp-{srcIp}-{srcPort}-{dstIp}-{dstPort}
    - timeout: timeout-{srcIp}-{srcPort}-{dstIp}-{dstPort}-{packetIndex}
    - dns: dns-{srcIp}-{srcPort}-{dstIp}-{dstPort}

    Returns:
        set: Set of packet indices matching this connection
    """
    # Parse connection ID
    parts = connection_id.split('-')

    # Extract 5-tuple based on connection type
    if parts[0] == 'timeout':
        # Format: timeout-srcIp-srcPort-dstIp-dstPort-packetIndex
        if len(parts) < 6:
            return set()
        src_ip = parts[1]
        src_port = int(parts[2])
        dst_ip = parts[3]
        dst_port = int(parts[4])
        # parts[5] is the packet index after timeout (we'll find all packets, not just this one)
    else:
        # Format: protocol-srcIp-srcPort-dstIp-dstPort
        if len(parts) < 5:
            return set()
        src_ip = parts[1]
        src_port = int(parts[2])
        dst_ip = parts[3]
        dst_port = int(parts[4])

    # Scan packets to find matches
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
        matches = (
            (ip.src == src_ip and transport_layer.sport == src_port and
             ip.dst == dst_ip and transport_layer.dport == dst_port)
            or
            (ip.src == dst_ip and transport_layer.sport == dst_port and
             ip.dst == src_ip and transport_layer.dport == src_port)
        )

        if matches:
            matched_indices.add(idx)

    return matched_indices
```

## Testing Strategy

### Test Cases

1. **TC-001: Timeout Connection Packet Extraction**
   - Input: Timeout connection ID `timeout-10.1.1.14-9492-172.64.153.46-443-4632`
   - Expected: All packets matching 5-tuple (bidirectional)
   - Verify: Packet count matches `metrics.packetCount` in timeline

2. **TC-002: Standard Connection Still Works**
   - Input: TCP handshake ID `tcp-10.1.1.14-5434-210.71.227.211-443`
   - Expected: Packets extracted via packetRefs
   - Verify: Primary path used, no fallback

3. **TC-003: Bidirectional Matching**
   - Input: Timeout connection
   - Expected: Packets in BOTH directions included
   - Verify: Both `srcIp->dstIp` and `dstIp->srcIp` packets present

4. **TC-004: Invalid Connection ID**
   - Input: Malformed ID `timeout-invalid`
   - Expected: Empty packet list (no crash)
   - Verify: Graceful error handling

### Test Data

Use existing fixture: `public/data/protocol_timeline_sample.json`
- Contains 52+ timeout connections
- Real-world PCAP data
- Covers various timeout scenarios

## Performance Considerations

### Complexity Analysis

- **Current (broken)**: O(1) - Empty result for timeout connections
- **With fix**: O(N * M) where:
  - N = number of timeout connections
  - M = total packets in PCAP
- **Optimization**: Early termination when matching packet count from metrics

### Worst Case

- PCAP with 10,000 packets
- 50 timeout connections
- 500,000 packet comparisons total
- Expected time: < 500ms on modern hardware

### Optimization Opportunities (Future)

1. Build 5-tuple index during packet loading
2. Cache connection-to-packet mappings
3. Use metrics.packetCount to stop scanning early

## Security Considerations

### Input Validation

1. **Connection ID parsing**: Handle malformed IDs gracefully
2. **Port validation**: Ensure ports are valid integers (0-65535)
3. **IP validation**: Basic format check (no exploitation via crafted IDs)

### DOS Prevention

1. **Packet limit**: Respect existing pagination (limit=100)
2. **Scan timeout**: Add max scan time if needed
3. **Memory bounds**: Don't load all packets into memory at once

## Dependencies

### External Libraries
- **scapy**: Already used for packet parsing
- **pytest**: For unit tests

### Internal Modules
- `network_analyzer.py`: Core implementation
- `analysis_server.py`: No changes needed (API already handles all connection types)

## Migration Path

### Phase 1: Implement Fix
1. Add `_find_packets_by_connection_id()` method
2. Update `_build_connection_packets()` with fallback
3. Add unit tests

### Phase 2: Testing
1. Test with existing fixtures
2. Verify all connection types
3. Performance benchmarking

### Phase 3: Future Improvements (Optional)
1. Add packetRefs to timeout detection
2. Build 5-tuple index for faster lookup
3. Add integration tests with real PCAP files

## Questions & Risks

### Open Questions
1. Should we add packetRefs to timeout stages in the future?
2. Should we limit the number of packets returned for very long timeout connections?

### Risks
1. **Performance**: Packet scanning may be slow for very large PCAP files (10K+ packets)
   - Mitigation: Add early termination, packet count limit
2. **Backward Compatibility**: Existing connection_packets.json files won't have timeout data
   - Mitigation: API handles missing connections gracefully (returns 404)

### Assumptions
1. Timeout connections are relatively rare (< 10% of total connections)
2. Users will re-analyze PCAP files to get updated packet data
3. Frontend handles empty packet lists gracefully
