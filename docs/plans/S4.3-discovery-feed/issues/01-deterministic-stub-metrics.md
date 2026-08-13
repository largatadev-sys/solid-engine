# 01 — Prefactor: deterministic stub metrics

**Status:** ready-for-agent
**Blocked by:** None — can start immediately.

**What to build:** The stub-metrics module stops rolling per-session random numbers and derives every stub (rating, price, like/comment counts) deterministically from the subject id — so one itinerary shows the same fake numbers on every device, session, and viewer, forever, until the kill-switch or real data retires them. This is the founder-ruled mitigation for putting stub numbers on a strangers-see-strangers surface (spec decision 12); the profile and feed inherit it for free. Shared-code change: it earns the closing broad sweep across its existing consumers.

## Acceptance criteria

- [ ] The same subject id yields identical stub values across module reloads, app restarts, and platforms — a pure function of the id and the switch, no `Math.random()` remaining in the module.
- [ ] The kill-switch off still nulls every stub, exactly as before.
- [ ] The stub reset helper still serves whatever purpose its existing callers have, or retires with those call sites updated.
- [ ] Profile showcase cards and feed engagement counts render unchanged in shape (pill, suffix, placement) — only the stability of the numbers changes.
- [ ] Jest determinism tests exist and would fail if per-session randomness returned.
- [ ] Closing sweep for shared code: the profile and feed test suites plus typecheck, green.

## Comments
