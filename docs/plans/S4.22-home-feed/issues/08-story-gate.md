# 08 — Story gate

**What to build:** Nothing new — the whole stack proven once, at the layer that ships (the standing rule), and the story closed. Full mobile suite, full backend ITs (counts read from the summary, never the exit code), `smoke-all`. The web feed walk end-to-end through real affordances: pool traveler t1 shares (post-time and retro), t2 — no shared trip — sees the feed, cards, navigation to a published itinerary, every alert-stub wording printed, the ANON/bearer request list clean, `--fresh` profile before any compared run. The emulator walk closing the device-only ACs: real-touch carousel (the 8083 rung for the browser, the native walk for the app), double-tap, the pill. The kill-switch-off pass. The spec's fifteen acceptance criteria swept as a checklist. BUILD_STATUS's S4.22 row flips in the **last commit on the feature branch** (the standing rule — never after the merge), and the squash-merge to `dev` is proposed, not performed.

**Blocked by:** 03 — Share affordances in the diary · 05 — The carousel · 06 — Engagement chrome, stubbed honestly · 07 — Feed dynamics.

**Status:** ready-for-agent

- [ ] Full mobile suite green; backend `Tests run:` counts read from the failsafe summary; `smoke-all` green (the S4.19 lesson — never `mvn test`, never the exit code).
- [ ] The web walk passes end-to-end with the state which tag played which role recorded (t1 = author, t2 = stranger — the test-identity rule).
- [ ] The emulator walk closes the real-touch ACs; screenshots taken to `/data/local/tmp`, screenshot-before-tap discipline throughout.
- [ ] All fifteen spec ACs checked off against evidence, deviations already recorded in the spec.
- [ ] BUILD_STATUS row updated (status + spec link, nothing else) in the branch's final commit; promotion proposed to the owner.
