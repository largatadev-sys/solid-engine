# 03 — Retap-to-refresh on all four tabs

**What to build:** tapping the tab you are already on refreshes it — on Discover, Trips and Profile, exactly as it already does on Home. At the top it refreshes with the "You're caught up" toast; scrolled down it scrolls to top first.

**Blocked by:** 02 — **a file-ownership edge, not a logical one.** Retap does not need focus revalidation to work; it touches the same four tab screens, and this repo bans concurrent agents on shared paths. If 02 is not in flight, this can start immediately.

**Status:** ready-for-agent

- [ ] `onHomeTabRetap` generalizes to a per-tab registry keyed by route; each tab screen registers its own handler. Home's existing behaviour is the contract, not a starting point to redesign.
- [ ] **The web fork reads `Date.now()` itself.** `nativeEvent.timestamp` is not populated on react-native-web — the feed's double-tap silently never fired for exactly this reason (S4.22), and the pure module's Jest tests passed the whole time because they pass real numbers. A test that feeds real numbers cannot catch this; the browser rung is the one that can.
- [ ] The double-tap window decision is a pure module with an **injected clock** — no `Date.now()` inside what a test must steer (the S4.10 precedent) — and is sabotage-verified.
- [ ] Proven on **web and on device**: the timing is the platform-forked part, so one rung is not evidence for the other.
- [ ] At-top vs scrolled-down behaviour is identical across all four tabs.
