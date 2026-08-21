# 05 — The story gate

**What to build:** nothing — the closing pass. The full stack runs once, here (the test-scope rule), and the record is put straight.

**Blocked by:** 04.

**Status:** ready-for-agent

- [ ] **Carried from ticket 04 (OPEN):** the device walk — dev build on the `largata` AVD against the local stack: send with the on-screen keyboard (dismiss the LogBox banner first — the S4.19 trap; collapse the keyboard by its chevron, never `KEYCODE_BACK`); background the app, send as t2 from the web, foreground → the missed message arrives via catch-up. This is also **WS-1's deferred AC 10** and its reconnect path, which no rung has yet exercised with a real subscriber.
- [ ] **Carried from ticket 04 (OPEN):** the RECONNECT spec — kill the connection mid-spec, assert backoff → reconnect → resubscribe → the thread refetches page 1. This is WS-1's other deferred box; `useChatDelivery`'s `catchUp` has no coverage on any rung. A review found it had been left behind when the device walk was carried across.
- [ ] **Carried from ticket 04 (OPEN):** phone-frame layout — the composer row and bubble max-width on the device (the S3.1 truncation class is invisible on the wider preview viewport).
- [ ] Full mobile suite · full backend ITs (`mvn -o test-compile failsafe:integration-test` — counts read from the `Tests run:` summary, never the exit code) · `npm run smoke` whole (both projects, one exit code).
- [ ] BUILD_STATUS: the S4.10 row flips (status + spec link, nothing else) in the last commit on this branch.
- [ ] Epic-map pass: the **private-planning-notes** line's trigger fires on this landing ("revisit after S4.10 lands — chat likely covers the need") — surface it to the founder; do not resolve it unilaterally. Confirm the chat-deletion and chat-v2-affordances parks read correctly.
- [ ] The candidate-capability note (`chat.message.send`) is discharged — confirm it sits in ADR-009's accumulating map.
- [ ] Propose the promotion (whole-epic-preference rule: WS-1 + S4.10 travel together — a chat build without its transport does not build); never execute it.
