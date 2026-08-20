# 05 — The story gate

**What to build:** nothing — the closing pass. The full stack runs once, here (the test-scope rule), and the record is put straight.

**Blocked by:** 04.

**Status:** ready-for-agent

- [ ] Full mobile suite · full backend ITs (`mvn -o test-compile failsafe:integration-test` — counts read from the `Tests run:` summary, never the exit code) · `npm run smoke` whole (both projects, one exit code).
- [ ] BUILD_STATUS: the S4.10 row flips (status + spec link, nothing else) in the last commit on this branch.
- [ ] Epic-map pass: the **private-planning-notes** line's trigger fires on this landing ("revisit after S4.10 lands — chat likely covers the need") — surface it to the founder; do not resolve it unilaterally. Confirm the chat-deletion and chat-v2-affordances parks read correctly.
- [ ] The candidate-capability note (`chat.message.send`) is discharged — confirm it sits in ADR-009's accumulating map.
- [ ] Propose the promotion (whole-epic-preference rule: WS-1 + S4.10 travel together — a chat build without its transport does not build); never execute it.
