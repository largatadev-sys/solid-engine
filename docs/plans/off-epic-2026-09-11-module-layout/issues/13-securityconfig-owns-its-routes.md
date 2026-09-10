# 13: `SecurityConfig` owns its anonymous route list

**What to build:** `SecurityConfig` names `JoinPaths.ANONYMOUS`, `ReportPaths.ANONYMOUS` and `WebSocketPaths.UPGRADE`, and those three imports are the `common ↔ join`, `common ↔ report` and `common ↔ ws` cycles `ModuleCycleTest` tolerates as recorded. The cycle-rule line already names the fix: the composition root owns its own route list. `SecurityConfig` carries the three literals, the three constants are deleted, the four test files importing `ReportPaths` take a test-support constant or the literal, and `KNOWN_CYCLES` loses three entries — the test enforces that the list only shrinks. No semantic change: the same three matchers, the same `permitAll`.

**Why it waits for a yes.** It edits `SecurityConfig`, which is inside CLAUDE.md's stop rule (*anything in auth/token handling*). It is a relocation of three strings with no behaviour change, in the mould of ADR-039 decision 5's *"a relocation with no semantic change"*, which still ran the gate.

**The discriminating check.** The ITs that assert anonymous access to the three routes pass unedited: the join walk that opens a link signed-out, the report submission signed-out, and the WebSocket handshake ITs. A moved literal that no longer matches would fail one of them with a 401.

**Blocked by:** a founder yes.

**Status:** needs-info

- [ ] `SecurityConfig` lists the three anonymous routes as its own constants, named for what they admit
- [ ] `join/api/JoinPaths`, `report/api/ReportPaths`, `ws/api/WebSocketPaths` deleted; `join/api/` and `report/api/` are then empty and go, their guards losing the contract rule as the spec describes; `ws/api/` keeps `ConnectionTicketResponse` and nothing else about `ws` moves
- [ ] `ModuleCycleTest.KNOWN_CYCLES` shrinks by three and the test passes; the two `identity` cycles stay recorded
- [ ] The anonymous-route ITs pass unedited
- [ ] The epic map's cycle-rule line gains a *SecurityConfig half built* note in the same PR

## Comments
