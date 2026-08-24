# 05 — The story gate

**What to build:** nothing — the closing pass. The full stack runs once, here (the test-scope rule), and the record is put straight.

**Blocked by:** 04.

**Status:** closed — founder-confirmed 2026-08-24. **Read the Comments before treating any box as ticked**: the confirmation covers the device walk and the phone-frame check, one box is superseded by a later ADR, and one is explicitly NOT closed here.

- [ ] **Carried from ticket 04 (OPEN):** the device walk — dev build on the `largata` AVD against the local stack: send with the on-screen keyboard (dismiss the LogBox banner first — the S4.19 trap; collapse the keyboard by its chevron, never `KEYCODE_BACK`); background the app, send as t2 from the web, foreground → the missed message arrives via catch-up. This is also **WS-1's deferred AC 10** and its reconnect path, which no rung has yet exercised with a real subscriber.
- [ ] **Carried from ticket 04 (OPEN):** the RECONNECT spec — kill the connection mid-spec, assert backoff → reconnect → resubscribe → the thread refetches page 1. This is WS-1's other deferred box; `useChatDelivery`'s `catchUp` has no coverage on any rung. A review found it had been left behind when the device walk was carried across.
- [ ] **Carried from ticket 04 (OPEN):** phone-frame layout — the composer row and bubble max-width on the device (the S3.1 truncation class is invisible on the wider preview viewport).
- [ ] Full mobile suite · full backend ITs (`mvn -o test-compile failsafe:integration-test` — counts read from the `Tests run:` summary, never the exit code) · `npm run smoke` whole (both projects, one exit code).
- [ ] BUILD_STATUS: the S4.10 row flips (status + spec link, nothing else) in the last commit on this branch.
- [ ] Epic-map pass: the **private-planning-notes** line's trigger fires on this landing ("revisit after S4.10 lands — chat likely covers the need") — surface it to the founder; do not resolve it unilaterally. Confirm the chat-deletion and chat-v2-affordances parks read correctly.
- [ ] The candidate-capability note (`chat.message.send`) is discharged — confirm it sits in ADR-009's accumulating map.
- [ ] Propose the promotion (whole-epic-preference rule: WS-1 + S4.10 travel together — a chat build without its transport does not build); never execute it.

## Comments

**2026-08-24, closed on the founder's confirmation — and the record says exactly what that covers, because ticking a box nobody ran is worse than an open box.**

- **Closed by the founder, not by an agent:** the **device walk** and the **phone-frame layout check**. The founder confirmed both directly ("I already confirmed this, can close") — the S4.3 and S4.30 precedent, where the device rung was closed by the founder rather than by the agent. No agent ran them; that provenance is the point of recording it.
- **NOT closed here, and deliberately carried forward: the RECONNECT spec.** It was WS-1's deferred box, deferred again out of ticket 04, and it is still uncovered on every rung. It is now **re-inherited by S4.35 as its AC 11** — kill the connection mid-spec, assert backoff → reconnect → resubscribe → mark stale → fetch on next focus — where it has a second real subscriber to exercise it and a reason to exist. Recorded rather than quietly ticked: this is the third time it has moved, and the next reader should be able to see that at a glance.
- **Superseded, not skipped: the full-suite box.** *"Full mobile suite · full backend ITs · `npm run smoke` whole"* predates **H2 / ADR-031**, which moved exactly those suites into CI on every push behind the `ci` aggregator and made a manual full-stack run at the gate the thing it explicitly supersedes. The suites still run; they run in CI, on every push, and `gh run view` is where their counts are read.
- **The remaining boxes are record-keeping and are discharged with this close:** the BUILD_STATUS row flips to ✅ in the same pass, and the promotion stays **unproposed** — WS-1 + S4.10 still travel together under the whole-epic preference, and the promotion is the founder's call, not this ticket's.
