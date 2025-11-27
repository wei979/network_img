# Feature Specification: Fix Packet Viewer 404 Error for Timeout Connections

**Feature Branch**: `002-packet-viewer-404`
**Created**: 2025-11-17
**Status**: Draft
**Input**: User description: "Title: MindMap 連線點擊時封包檢視器 404

Steps:
1. 啟動後端（FastAPI）與前端（Vite），瀏覽 http://localhost:5173。
2. 在 MindMap 畫面點擊任何連線。
3. 前端會呼叫 `GET /api/packets/{connection_id}` 取得封包詳情。

Expected:
- 後端回傳該連線的封包清單（協定、時間戳、TCP/UDP headers、payload），右側面板顯示資料並可分頁瀏覽。

Actual:
- 前端收到 404，控制台顯示"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Timeout Connection Packets (Priority: P1)

Network engineers click on timeout-type connections in the MindMap visualization to inspect the packets that led to the timeout event. This helps diagnose network issues by examining packet headers, timing, and payload data.

**Why this priority**: This is the core bug fix - users cannot currently view packet details for timeout connections, which represent critical diagnostic information for network troubleshooting.

**Independent Test**: Can be fully tested by clicking any timeout connection in MindMap and verifying that the packet viewer panel opens with timeout connection's packet data.

**Acceptance Scenarios**:

1. **Given** user has uploaded a PCAP file with timeout events, **When** user clicks a timeout connection in MindMap, **Then** packet viewer panel opens showing all packets for that timeout connection
2. **Given** packet viewer is open for a timeout connection, **When** panel displays, **Then** each packet shows correct 5-tuple, timestamp, headers, and payload preview
3. **Given** timeout connection has multiple packets, **When** viewing in packet viewer, **Then** pagination controls allow browsing through all packets

---

### User Story 2 - View All Connection Types (Priority: P2)

Network engineers can click on any connection type (TCP handshake, UDP transfer, HTTP request, timeout, etc.) in MindMap and view packet details without encountering errors.

**Why this priority**: Ensures consistent behavior across all protocol types - builds user confidence in the tool's reliability.

**Independent Test**: Can be tested by clicking connections of each protocol type and verifying packet viewer opens successfully for all types.

**Acceptance Scenarios**:

1. **Given** PCAP file contains various connection types, **When** user clicks each connection type (TCP, UDP, DNS, timeout, HTTP), **Then** packet viewer opens successfully for all types
2. **Given** user is viewing packets for different connection types, **When** switching between connections, **Then** correct packet data displays for each connection without 404 errors

---

### Edge Cases

- What happens when a timeout connection has zero packets in the capture?
- How does system handle malformed connection IDs with unexpected formats?
- What if connection ID contains special characters that need URL encoding?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST extract packet details for ALL connection types including timeout, TCP handshake, UDP transfer, DNS query, and HTTP request
- **FR-002**: Packet extraction MUST handle timeout connection ID format: `timeout-{srcIp}-{srcPort}-{dstIp}-{dstPort}-{startPacket}-{endPacket}`
- **FR-003**: Packet extraction MUST handle standard connection ID formats: `tcp-{srcIp}-{srcPort}-{dstIp}-{dstPort}`, `udp-{srcIp}-{srcPort}-{dstIp}-{dstPort}`, etc.
- **FR-004**: Backend MUST generate connection_packets.json containing packet details for ALL timelines regardless of protocol type
- **FR-005**: API endpoint `/api/packets/{connection_id}` MUST return packet data for timeout connections without 404 errors
- **FR-006**: Packet details MUST include 5-tuple, timestamp, protocol headers, and payload preview for all connection types
- **FR-007**: System MUST handle cases where timeout connections reference packet indices that exist in the capture

### Key Entities

- **Connection**: Represents a network flow identified by protocol type, source/destination IP/port, and optional metadata (start/end packet index for timeouts)
- **Packet**: Individual network packet with index, timestamp, headers, and payload data
- **Timeline**: Sequence of stages representing protocol-specific communication pattern (handshake, transfer, timeout, etc.)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of timeout connections clicked in MindMap successfully open packet viewer without 404 errors
- **SC-002**: Packet viewer displays complete packet data (5-tuple, headers, payload) for all connection types within 1 second of click
- **SC-003**: Zero 404 errors occur when clicking any connection type in MindMap after fix is deployed
- **SC-004**: Users can successfully browse all packets for timeout connections using pagination controls
