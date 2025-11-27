# Tasks: Fix Packet Viewer 404 Error for Timeout Connections

**Branch**: `002-packet-viewer-404`
**Input**: Design documents from `D:\work\network_img\specs\002-packet-viewer-404\`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- File paths are absolute: `D:\work\network_img\`

---

## Phase 1: Setup & Environment Verification (5-10 minutes)

**Purpose**: Verify development environment is ready for implementation

- [X] T001 [P] Verify Python 3.13 and virtual environment activation in `D:\work\network_img\venv\`
- [X] T002 [P] Verify required dependencies installed (scapy 2.6+, pytest 8.3+, FastAPI 0.115+) via `pip list`
- [X] T003 [P] Verify `D:\work\network_img\network_analyzer.py` can be imported without errors
- [X] T004 [P] Verify test PCAP file exists at `D:\work\network_img\lostpakage.pcapng`
- [X] T005 [P] Verify test fixture `D:\work\network_img\public\data\protocol_timeline_sample.json` contains timeout connections (50 found)

**Checkpoint**: Environment ready - implementation can begin

---

## Phase 2: Foundational - Test Infrastructure (TDD)

**Purpose**: Create test infrastructure BEFORE implementation (Test-Driven Development)

**Note**: These tests will FAIL initially - this is expected and correct

### Unit Test Setup

- [X] T006 [P] Create test directory structure: `D:\work\network_img\tests\unit\`
- [X] T007 [P] Create test directory structure: `D:\work\network_img\tests\integration\`
- [X] T008 [P] Create pytest fixtures file `D:\work\network_img\tests\conftest.py` with sample_pcap fixture

### Test Files (Write tests that will fail before implementation)

- [X] T009 [P] Create `D:\work\network_img\tests\unit\test_find_packets_by_connection_id.py` with test_parse_standard_connection_id
- [X] T010 [P] Add test_parse_timeout_connection_id to `D:\work\network_img\tests\unit\test_find_packets_by_connection_id.py`
- [X] T011 [P] Add test_malformed_connection_id to `D:\work\network_img\tests\unit\test_find_packets_by_connection_id.py`
- [X] T012 [P] Add test_bidirectional_matching to `D:\work\network_img\tests\unit\test_find_packets_by_connection_id.py`
- [X] T013 [P] Add test_no_matching_packets to `D:\work\network_img\tests\unit\test_find_packets_by_connection_id.py`
- [X] T014 [P] Create `D:\work\network_img\tests\unit\test_build_connection_packets.py` with test_primary_path_with_packet_refs
- [X] T015 [P] Add test_fallback_path_without_packet_refs to `D:\work\network_img\tests\unit\test_build_connection_packets.py`
- [X] T016 [P] Add test_mixed_timelines to `D:\work\network_img\tests\unit\test_build_connection_packets.py`
- [X] T017 [P] Add test_relative_time_calculation to `D:\work\network_img\tests\unit\test_build_connection_packets.py`

### Verify Tests Fail

- [X] T018 Run `pytest D:\work\network_img\tests\unit\test_find_packets_by_connection_id.py -v` and verify all tests FAIL (method doesn't exist yet)
- [X] T019 Run `pytest D:\work\network_img\tests\unit\test_build_connection_packets.py -v` and verify fallback tests FAIL

**Checkpoint**: Test infrastructure complete - all tests failing as expected

---

## Phase 3: User Story 1 - View Timeout Connection Packets (Priority: P1) 🎯 MVP

**Goal**: Enable users to click timeout connections in MindMap and view packet details without 404 errors

**Independent Test**: Click any timeout connection in MindMap and verify packet viewer opens with complete packet list

### Implementation for User Story 1

- [X] T020 [US1] Add `_find_packets_by_connection_id()` method to `D:\work\network_img\network_analyzer.py` after line 895 (after `_extract_packet_details`)
- [X] T021 [US1] Implement connection ID parsing logic in `_find_packets_by_connection_id()` to extract 5-tuple from both standard and timeout formats
- [X] T022 [US1] Implement bidirectional packet scanning logic in `_find_packets_by_connection_id()` matching both src→dst and dst→src
- [X] T023 [US1] Add error handling for malformed connection IDs (return empty set, no exceptions) in `_find_packets_by_connection_id()`
- [X] T024 [US1] Add port validation (ValueError handling for non-integer ports) in `_find_packets_by_connection_id()`
- [X] T025 [US1] Modify `_build_connection_packets()` in `D:\work\network_img\network_analyzer.py` around line 897 to add fallback logic
- [X] T026 [US1] Add fallback path after line 913 in `_build_connection_packets()`: if packet_indices is empty, call `_find_packets_by_connection_id()`
- [X] T027 [US1] Add docstring to `_find_packets_by_connection_id()` method with parameter descriptions and examples

### Testing for User Story 1

- [X] T028 [US1] Run `pytest D:\work\network_img\tests\unit\test_find_packets_by_connection_id.py -v` and verify all tests PASS (6/6 passed)
- [X] T029 [US1] Run `pytest D:\work\network_img\tests\unit\test_build_connection_packets.py -v` and verify all tests PASS (6/6 passed)
- [X] T030 [US1] Verify syntax with `python -m py_compile D:\work\network_img\network_analyzer.py` (no errors)

### Integration Testing for User Story 1

- [X] T031 [P] [US1] Create `D:\work\network_img\tests\integration\test_timeout_packets.py` with test_extract_timeout_packets_from_real_pcap
- [X] T032 [P] [US1] Add test_timeout_packet_count_matches_metrics to `D:\work\network_img\tests\integration\test_timeout_packets.py`
- [X] T033 [P] [US1] Add test_relative_time_calculation_for_timeout to `D:\work\network_img\tests\integration\test_timeout_packets.py`
- [X] T034 [US1] Run integration tests: `pytest D:\work\network_img\tests\integration\test_timeout_packets.py -v` (3/3 passed)

### Manual Testing for User Story 1

- [X] T035 [US1] Re-analyze test PCAP with lostpakage.pcapng (5356 packets loaded)
- [X] T036 [US1] Verify `D:\work\network_img\public\data\connection_packets.json` now contains 50 timeout connections
- [ ] T037 [US1] Start backend: `uvicorn analysis_server:app --reload` in `D:\work\network_img\` (already running on port 8000)
- [ ] T038 [US1] Start frontend: `npm run dev` in `D:\work\network_img\` (already running on port 5173)
- [ ] T039 [US1] Open http://localhost:5173 and click a timeout connection in MindMap (user can test)
- [ ] T040 [US1] Verify packet viewer panel opens with packet list (no 404 error) (user can test)
- [ ] T041 [US1] Verify packet details show 5-tuple, timestamp, headers, payload preview (verified in JSON)
- [ ] T042 [US1] Verify pagination controls work for timeout connections with multiple packets (user can test)

**Checkpoint**: User Story 1 complete - timeout connections display packets without 404

---

## Phase 4: User Story 2 - View All Connection Types (Priority: P2)

**Goal**: Ensure packet viewer works consistently for ALL connection types (TCP, UDP, HTTP, HTTPS, DNS, timeout)

**Independent Test**: Click connections of each protocol type and verify packet viewer opens successfully

### Integration Testing for User Story 2

- [ ] T043 [P] [US2] Create `D:\work\network_img\tests\integration\test_all_connection_types.py` with test_tcp_handshake_packets
- [ ] T044 [P] [US2] Add test_udp_transfer_packets to `D:\work\network_img\tests\integration\test_all_connection_types.py`
- [ ] T045 [P] [US2] Add test_http_request_packets to `D:\work\network_img\tests\integration\test_all_connection_types.py`
- [ ] T046 [P] [US2] Add test_https_request_packets to `D:\work\network_img\tests\integration\test_all_connection_types.py`
- [ ] T047 [P] [US2] Add test_dns_query_packets to `D:\work\network_img\tests\integration\test_all_connection_types.py`
- [ ] T048 [P] [US2] Add test_timeout_packets to `D:\work\network_img\tests\integration\test_all_connection_types.py`
- [ ] T049 [US2] Run all connection type tests: `pytest D:\work\network_img\tests\integration\test_all_connection_types.py -v`

### API Integration Testing for User Story 2

- [ ] T050 [P] [US2] Create `D:\work\network_img\tests\integration\test_packet_viewer_api.py` with test_api_returns_timeout_packets
- [ ] T051 [P] [US2] Add test_api_pagination_for_timeout to `D:\work\network_img\tests\integration\test_packet_viewer_api.py`
- [ ] T052 [P] [US2] Add test_api_404_for_invalid_connection_id to `D:\work\network_img\tests\integration\test_packet_viewer_api.py`
- [ ] T053 [P] [US2] Add test_api_returns_all_connection_types to `D:\work\network_img\tests\integration\test_packet_viewer_api.py`
- [ ] T054 [US2] Run API tests: `pytest D:\work\network_img\tests\integration\test_packet_viewer_api.py -v`

### Manual Testing for User Story 2

- [ ] T055 [US2] In browser, click TCP handshake connection and verify packet viewer opens
- [ ] T056 [US2] Click UDP transfer connection and verify packet viewer opens
- [ ] T057 [US2] Click HTTP request connection and verify packet viewer opens
- [ ] T058 [US2] Click HTTPS request connection and verify packet viewer opens
- [ ] T059 [US2] Click DNS query connection and verify packet viewer opens
- [ ] T060 [US2] Switch between different connection types and verify correct packets display each time
- [ ] T061 [US2] Verify browser console shows no 404 errors for any connection type

**Checkpoint**: User Story 2 complete - all connection types work without 404

---

## Phase 5: Polish & Integration

**Purpose**: Code quality, documentation, and final validation

### Code Quality

- [ ] T062 [P] Add debug logging to `_build_connection_packets()` to track primary vs fallback path usage
- [ ] T063 [P] Add code comments explaining bidirectional matching logic in `_find_packets_by_connection_id()`
- [ ] T064 [P] Verify no PEP8 violations: `flake8 D:\work\network_img\network_analyzer.py` (if flake8 installed)

### Performance Validation

- [ ] T065 Benchmark packet extraction with small PCAP (< 1K packets): verify < 1 second
- [ ] T066 Benchmark packet extraction with medium PCAP (5-10K packets): verify < 3 seconds
- [ ] T067 Measure fallback path usage ratio: verify < 10% of connections use fallback (mostly timeout)

### Documentation

- [ ] T068 [P] Verify quickstart guide works: follow steps in `D:\work\network_img\specs\002-packet-viewer-404\quickstart.md`
- [ ] T069 [P] Update code comments in `D:\work\network_img\network_analyzer.py` if method behavior changed

### Final Validation

- [ ] T070 Run full test suite: `pytest D:\work\network_img\tests\ -v --cov=network_analyzer`
- [ ] T071 Verify test coverage for new methods is > 90%: check coverage report
- [ ] T072 Run end-to-end test with production-like PCAP file (10K+ packets)
- [ ] T073 Verify success criteria SC-001: 100% of timeout connections open packet viewer without 404
- [ ] T074 Verify success criteria SC-002: Packet viewer displays data within 1 second
- [ ] T075 Verify success criteria SC-003: Zero 404 errors for any connection type
- [ ] T076 Verify success criteria SC-004: Pagination works for timeout connections

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on User Story 1 completion (tests integration)
- **Polish (Phase 5)**: Depends on User Stories 1 & 2 completion

### Task Dependencies Within Phases

**Phase 2 (Foundational)**:
- T006-T008 (directories) must complete before T009-T017 (test files)
- T018-T019 (verify tests fail) must complete after all test files created

**Phase 3 (User Story 1 - Implementation)**:
- T020-T024 (implement `_find_packets_by_connection_id()`) can run sequentially
- T025-T026 (modify `_build_connection_packets()`) depends on T020 completion
- T027 (docstring) can run in parallel with T025-T026 (marked [P] would conflict, so sequential)
- T028-T030 (unit tests) depend on T020-T027 completion

**Phase 3 (User Story 1 - Integration)**:
- T031-T033 (integration test files) can run in parallel (marked [P])
- T034 (run integration tests) depends on T031-T033 completion
- T035-T042 (manual testing) depends on T028-T034 passing

**Phase 4 (User Story 2)**:
- T043-T048 (connection type tests) can run in parallel (marked [P])
- T049 (run tests) depends on T043-T048 completion
- T050-T053 (API tests) can run in parallel (marked [P])
- T054 (run API tests) depends on T050-T053 completion
- T055-T061 (manual testing) can run in any order

**Phase 5 (Polish)**:
- T062-T064 (code quality) can run in parallel (marked [P])
- T065-T067 (performance) can run sequentially (same execution context)
- T068-T069 (documentation) can run in parallel (marked [P])
- T070-T076 (final validation) should run sequentially

### Parallel Opportunities

**Maximum Parallelism by Phase**:

- **Phase 1**: 5 tasks in parallel (T001-T005 all marked [P])
- **Phase 2**: 3 tasks in parallel (T006-T008), then 9 tasks in parallel (T009-T017)
- **Phase 3**: Integration tests T031-T033 (3 in parallel), API tests have no [P] markers
- **Phase 4**: Connection tests T043-T048 (6 in parallel), API tests T050-T053 (4 in parallel)
- **Phase 5**: Code quality T062-T064 (3 in parallel), docs T068-T069 (2 in parallel)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (5 min)
2. Complete Phase 2: Foundational - TDD (30 min)
3. Complete Phase 3: User Story 1 (60 min)
4. **STOP and VALIDATE**: Run T070-T076 validation
5. Deploy/demo timeout packet viewer fix

**Estimated Time**: 2-3 hours for MVP

### Full Implementation (Both User Stories)

1. Complete Phases 1-3 (MVP)
2. Complete Phase 4: User Story 2 (45 min)
3. Complete Phase 5: Polish (30 min)

**Estimated Time**: 3-4 hours for complete implementation

### Parallel Team Strategy

With 2 developers:
1. **Dev A**: Phase 1 → Phase 2 (test infrastructure)
2. **Dev B**: Phase 1 → Review Phase 2 tests
3. **Both**: Phase 3 (User Story 1) - Dev A implementation, Dev B integration tests
4. **Dev A**: Phase 4 (User Story 2) - connection type tests
5. **Dev B**: Phase 4 (User Story 2) - API tests
6. **Both**: Phase 5 (Polish) - split tasks

---

## Summary

**Total Tasks**: 76
- Phase 1 (Setup): 5 tasks
- Phase 2 (Foundational/TDD): 14 tasks
- Phase 3 (User Story 1): 23 tasks (11 implementation + 7 integration + 5 manual)
- Phase 4 (User Story 2): 19 tasks (7 integration + 5 API + 7 manual)
- Phase 5 (Polish): 15 tasks

**Tasks Per User Story**:
- US1 (View Timeout Packets): 23 tasks
- US2 (View All Connection Types): 19 tasks
- Shared (Setup + Foundational + Polish): 34 tasks

**Parallel Opportunities**:
- Phase 1: 5 parallel
- Phase 2: Up to 9 parallel
- Phase 3: Up to 3 parallel (integration tests)
- Phase 4: Up to 6 parallel (connection tests)
- Phase 5: Up to 3 parallel

**MVP Scope** (User Story 1 only):
- Phases 1-3: 42 tasks
- Critical path: ~2-3 hours
- Deliverable: Timeout connections display packets without 404

**Key Files Modified**:
- `D:\work\network_img\network_analyzer.py` (add method, modify method)
- `D:\work\network_img\tests\unit\test_find_packets_by_connection_id.py` (new)
- `D:\work\network_img\tests\unit\test_build_connection_packets.py` (new)
- `D:\work\network_img\tests\integration\test_timeout_packets.py` (new)
- `D:\work\network_img\tests\integration\test_all_connection_types.py` (new)
- `D:\work\network_img\tests\integration\test_packet_viewer_api.py` (new)
