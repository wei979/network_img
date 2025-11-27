# Data Model: Packet Viewer Fix for Timeout Connections

**Branch**: `002-packet-viewer-404`
**Date**: 2025-11-17
**Phase**: 1 (Design)

## Overview

This document defines the data structures for network connections and packets in the packet viewer system. The fix enables timeout connections to expose packet details by extending the packet extraction logic.

## Entity Definitions

### 1. Connection

Represents a network flow identified by protocol type and 5-tuple (source IP/port, destination IP/port, protocol).

**Attributes:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | string | Unique connection identifier | `tcp-10.1.1.14-5434-210.71.227.211-443` |
| `protocol` | string | Transport protocol | `tcp`, `udp`, `icmp` |
| `protocolType` | string | High-level protocol classification | `tcp-handshake`, `udp-transfer`, `dns-query`, `http-request`, `https-request`, `timeout` |
| `startEpochMs` | integer | Connection start timestamp (milliseconds since epoch) | `1760710355982` |
| `endEpochMs` | integer | Connection end timestamp (milliseconds since epoch) | `1760710355989` |
| `stages` | Stage[] | Protocol-specific communication stages | See Stage entity |
| `metrics` | object | Connection-level metrics | `{ "rttMs": 7, "packetCount": 3 }` |

**ID Format Patterns:**

```
TCP Handshake:    tcp-{srcIp}-{srcPort}-{dstIp}-{dstPort}
UDP Transfer:     udp-{srcIp}-{srcPort}-{dstIp}-{dstPort}
DNS Query:        dns-{srcIp}-{srcPort}-{dstIp}-{dstPort}
HTTP Request:     http-{srcIp}-{srcPort}-{dstIp}-{dstPort}
HTTPS Request:    https-{srcIp}-{srcPort}-{dstIp}-{dstPort}
Timeout:          timeout-{srcIp}-{srcPort}-{dstIp}-{dstPort}-{packetIndex}
```

**Example:**

```json
{
  "id": "tcp-10.1.1.14-5434-210.71.227.211-443",
  "protocol": "tcp",
  "protocolType": "tcp-handshake",
  "startEpochMs": 1760710355982,
  "endEpochMs": 1760710355989,
  "stages": [
    {
      "key": "syn",
      "label": "SYN Sent",
      "direction": "forward",
      "durationMs": 7,
      "packetRefs": [4217]
    },
    {
      "key": "syn-ack",
      "label": "SYN-ACK Received",
      "direction": "backward",
      "durationMs": 1,
      "packetRefs": [4219]
    },
    {
      "key": "ack",
      "label": "ACK Confirmed",
      "direction": "forward",
      "durationMs": 1,
      "packetRefs": [4220]
    }
  ],
  "metrics": {
    "rttMs": 7,
    "packetCount": 3
  }
}
```

### 2. Stage

Represents a phase in the protocol communication sequence (e.g., SYN, SYN-ACK, ACK for TCP handshake).

**Attributes:**

| Field | Type | Description | Required for All? | Example |
|-------|------|-------------|-------------------|---------|
| `key` | string | Stage identifier | Yes | `syn`, `waiting`, `request` |
| `label` | string | Human-readable stage name | Yes | `SYN Sent`, `等待回應` |
| `direction` | string | Packet flow direction | Yes | `forward`, `backward`, `wait`, `none` |
| `durationMs` | integer | Stage duration in milliseconds | Yes | `7` |
| `packetRefs` | integer[] | Packet indices in this stage | **No** (missing for timeout) | `[4217]` |

**Important Note:**
- **Standard connections** (TCP, UDP, HTTP, HTTPS, DNS): ALL stages have `packetRefs`
- **Timeout connections**: Stages do NOT have `packetRefs` (this is the root cause of the bug)

**Example (TCP Stage with packetRefs):**

```json
{
  "key": "syn",
  "label": "SYN Sent",
  "direction": "forward",
  "durationMs": 7,
  "packetRefs": [4217]
}
```

**Example (Timeout Stage WITHOUT packetRefs):**

```json
{
  "key": "waiting",
  "label": "等待回應",
  "direction": "forward",
  "durationMs": 2274
}
```

### 3. Packet

Represents an individual network packet with detailed header and payload information.

**Attributes:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `index` | integer | Packet index in capture file | `4217` |
| `timestamp` | float | Packet capture timestamp (seconds since epoch) | `1760710355.982` |
| `relativeTime` | string | Time relative to first packet in connection | `0.000s` |
| `length` | integer | Total packet length in bytes | `66` |
| `fiveTuple` | FiveTuple | Connection 5-tuple | See FiveTuple |
| `headers` | Headers | Protocol headers | See Headers |
| `payload` | Payload | Packet payload data | See Payload |

**Example:**

```json
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
    "ip": {
      "version": 4,
      "ttl": 64,
      "protocol": 6
    },
    "tcp": {
      "flags": "SYN",
      "seq": 1234567890,
      "ack": 0,
      "window": 65535,
      "dataOffset": 10
    }
  },
  "payload": {
    "length": 0,
    "preview": "",
    "ascii": ""
  }
}
```

### 4. FiveTuple

Identifies a unique network connection (5-tuple).

**Attributes:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `srcIp` | string | Source IP address | `10.1.1.14` |
| `srcPort` | integer | Source port number | `5434` |
| `dstIp` | string | Destination IP address | `210.71.227.211` |
| `dstPort` | integer | Destination port number | `443` |
| `protocol` | string | Transport protocol | `TCP`, `UDP`, `ICMP` |

### 5. Headers

Contains protocol-specific header information.

**Structure:**

```typescript
interface Headers {
  ip?: {
    version: number;     // IP version (4 or 6)
    ttl: number;        // Time to live
    protocol: number;   // Protocol number (6=TCP, 17=UDP, 1=ICMP)
  };
  tcp?: {
    flags: string;      // TCP flags (e.g., "SYN|ACK")
    seq: number;        // Sequence number
    ack: number;        // Acknowledgment number
    window: number;     // Window size
    dataOffset: number; // TCP header length
  };
  udp?: {
    length: number;     // UDP length
    checksum: number;   // UDP checksum
  };
  icmp?: {
    type: number;       // ICMP type
    code: number;       // ICMP code
    checksum: number;   // ICMP checksum
  };
}
```

### 6. Payload

Contains packet payload data (application layer).

**Attributes:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `length` | integer | Payload length in bytes | `1460` |
| `preview` | string | Hex representation (first 100 bytes) | `474554202f20485454502f312e310d0a...` |
| `ascii` | string | ASCII representation (printable chars only) | `GET / HTTP/1.1..Host: example.com....` |

## Connection Packets Mapping

**File**: `public/data/{sessionId}/connection_packets.json`

Maps connection IDs to their packet lists.

**Structure:**

```json
{
  "tcp-10.1.1.14-5434-210.71.227.211-443": [
    { /* Packet 1 */ },
    { /* Packet 2 */ },
    { /* Packet 3 */ }
  ],
  "timeout-10.1.1.14-9492-172.64.153.46-443-4632": [
    { /* Packet 1 */ },
    { /* Packet 2 */ },
    /* ... */
    { /* Packet N */ }
  ]
}
```

**Key Characteristics:**
- **Key**: Connection ID (string)
- **Value**: Array of Packet objects
- **Ordering**: Packets sorted by timestamp
- **Bidirectional**: Includes packets in both directions (src→dst and dst→src)

## Data Flow

### 1. PCAP Analysis → Timeline Generation

```
PCAP File
    ↓
NetworkAnalyzer.load_packets()
    ↓
NetworkAnalyzer.generate_protocol_timelines()
    ├─ _extract_tcp_handshakes() → timelines with packetRefs
    ├─ _extract_udp_transfers() → timelines with packetRefs
    ├─ _detect_http_requests() → timelines with packetRefs
    └─ _detect_timeouts() → timelines WITHOUT packetRefs ← BUG
    ↓
protocol_timeline_sample.json
```

### 2. Timeline → Connection Packets (Current - Broken for Timeout)

```
timelines[]
    ↓
NetworkAnalyzer._build_connection_packets()
    ↓
for each timeline:
    ├─ Extract packetRefs from stages
    │  └─ IF no packetRefs → empty packet list ← BUG for timeout
    ↓
connection_packets.json
```

### 3. Timeline → Connection Packets (Fixed)

```
timelines[]
    ↓
NetworkAnalyzer._build_connection_packets()
    ↓
for each timeline:
    ├─ Extract packetRefs from stages (primary path)
    │  └─ IF no packetRefs:
    │      └─ _find_packets_by_connection_id() (fallback path)
    │          ├─ Parse connection ID
    │          ├─ Extract 5-tuple
    │          └─ Scan packets for matches
    ↓
connection_packets.json (complete with timeout packets)
```

### 4. API Request → Packet Response

```
Frontend: GET /api/packets/{connection_id}
    ↓
analysis_server.get_connection_packets()
    ├─ Load connection_packets.json
    ├─ Lookup connection_id
    ├─ Apply pagination (offset, limit)
    └─ Return packet list
    ↓
Frontend: Display packets in packet viewer panel
```

## Constraints & Invariants

### Data Integrity

1. **Connection ID Uniqueness**: Each timeline must have a unique ID
2. **Packet Index Validity**: All packet indices must be < len(packets)
3. **Bidirectional Matching**: Timeout packet extraction must match BOTH directions
4. **Timestamp Ordering**: Packets in connection_packets must be sorted by timestamp

### Performance

1. **Pagination Required**: API enforces limit (default: 100, max: 1000)
2. **Scan Limit**: Packet scanning for timeout connections should terminate early if possible
3. **Memory Bounds**: Don't load entire PCAP into memory during packet extraction

### Backward Compatibility

1. **Existing Data**: Old connection_packets.json files won't have timeout packets (acceptable - users re-analyze)
2. **API Contract**: GET /api/packets/{connection_id} returns 404 if connection not found (unchanged)
3. **Timeline Format**: No changes to timeline structure (backward compatible)

## Edge Cases

### 1. Empty Timeout Connection

**Scenario**: Timeout detected but no packets found during scan

**Handling**: Return empty packet list (no crash)

**Example**:
```json
{
  "timeout-10.1.1.14-9999-1.2.3.4-80-1234": []
}
```

### 2. Malformed Connection ID

**Scenario**: Invalid ID format (e.g., `timeout-invalid`)

**Handling**: Parse fails → return empty packet list

**Example**:
```python
# Input: "timeout-invalid"
parts = connection_id.split('-')  # ['timeout', 'invalid']
if len(parts) < 6:  # Expected: timeout-ip-port-ip-port-index
    return set()  # Return empty set (no crash)
```

### 3. Unidirectional Timeout

**Scenario**: All packets in one direction (rare but possible)

**Handling**: Bidirectional matching handles this correctly (matches either direction)

### 4. Very Large Timeout Connection

**Scenario**: Timeout connection with 10,000+ packets

**Handling**: API pagination limits response to 100 packets per request

## Testing Data Model

### Test Fixtures

**File**: `tests/fixtures/timeout_connection.json`

```json
{
  "timeline": {
    "id": "timeout-10.1.1.14-9492-172.64.153.46-443-4632",
    "protocol": "tcp",
    "protocolType": "timeout",
    "stages": [
      {
        "key": "waiting",
        "label": "等待回應",
        "direction": "forward",
        "durationMs": 2000
      }
    ],
    "metrics": {
      "packetCount": 5
    }
  },
  "expected_packets": [
    {
      "index": 4629,
      "fiveTuple": {
        "srcIp": "172.64.153.46",
        "srcPort": 443,
        "dstIp": "10.1.1.14",
        "dstPort": 9492,
        "protocol": "TCP"
      }
    },
    {
      "index": 4632,
      "fiveTuple": {
        "srcIp": "10.1.1.14",
        "srcPort": 9492,
        "dstIp": "172.64.153.46",
        "dstPort": 443,
        "protocol": "TCP"
      }
    }
  ]
}
```

### Validation Rules

1. **Packet count match**: len(packets) should approximately match metrics.packetCount
2. **5-tuple consistency**: All packets must match connection ID's 5-tuple
3. **Bidirectional**: Both src→dst and dst→src packets present (if applicable)
4. **Timestamp ordering**: packets[i].timestamp <= packets[i+1].timestamp

## Migration Notes

### Database Schema Changes

**None** - This is a JSON file-based system, no database migrations required.

### File Format Changes

**None** - connection_packets.json structure remains unchanged.

### API Contract Changes

**None** - GET /api/packets/{connection_id} behavior unchanged for existing connection types.

## Future Enhancements

### 1. Add packetRefs to Timeout Detection

Modify `_detect_timeouts()` to include packetRefs in stages:

```python
# Track packet indices for this connection
conn['packet_indices'] = conn.get('packet_indices', set())
conn['packet_indices'].add(index)

# When creating timeout timeline:
'stages': [
    {
        'key': 'waiting',
        'label': '等待回應',
        'direction': 'forward',
        'durationMs': int(time_gap * 1000 * 0.5),
        'packetRefs': list(conn['packet_indices'])  # ADD THIS
    }
]
```

**Benefit**: Eliminates need for packet scanning fallback.

### 2. Build 5-Tuple Index

Create index during packet loading for O(1) lookup:

```python
self.connection_index = defaultdict(set)  # {(srcIp, srcPort, dstIp, dstPort): {packet_indices}}

for idx, packet in enumerate(self.packets):
    if packet.haslayer(IP) and packet.haslayer(TCP):
        key = (ip.src, tcp.sport, ip.dst, tcp.dport)
        self.connection_index[key].add(idx)
```

**Benefit**: Faster packet lookup for timeout connections.

### 3. Packet Range in Timeline

Add packet index range to timeline metrics:

```python
'metrics': {
    'packetCount': 5,
    'packetRange': [4629, 4632]  # [first_index, last_index]
}
```

**Benefit**: Frontend can show packet range without loading all packets.
