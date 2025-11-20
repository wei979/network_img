# UI Wireframe Review Checklist

## Review Objectives
- Validate that the Phase 1 scope (TCP/HTTP/Timeout) has clear entry points in the Traffic Canvas and Timeline Dock.
- Confirm that metrics shown in the detail drawer align with `ProtocolTimeline.metrics` fields (RTT, packetCount, statusCode).
- Ensure alert card behaviours match anomaly hooks from the controller (`onStageEnter`).

## Stakeholder Questions
1. Is the left layer panel granular enough (per protocol vs. per scenario)?
2. Should timeout alerts dock persist after dismissal for auditing?
3. Are additional accessibility affordances required beyond keyboard focus and ARIA labels?

## Action Items
- [ ] UX: Provide Figma screens for collapsed/expanded layer panel states.
- [ ] Frontend: Prototype `useProtocolAnimation` hook contract based on controller API.
- [ ] Data/Backend: Map anomaly tags to specific alert card copy and severity.
- [ ] QA: Define acceptance criteria for timeline seek/play controls (keyboard + pointer).
