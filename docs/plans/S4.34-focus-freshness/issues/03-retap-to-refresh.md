# 03 — Retap-to-refresh on all four tabs

**What to build:** tapping the tab you are already on refreshes it — on Discover, Trips and Profile, exactly as it already does on Home. At the top it refreshes with the "You're caught up" toast; scrolled down it scrolls to top first.

**Blocked by:** 02 — **a file-ownership edge, not a logical one.** Retap does not need focus revalidation to work; it touches the same four tab screens, and this repo bans concurrent agents on shared paths. If 02 is not in flight, this can start immediately.

**Status:** closed

- [x] `onHomeTabRetap` generalizes to a per-tab registry keyed by route; each tab screen registers its own handler. Home's existing behaviour is the contract, not a starting point to redesign.
- [x] **The web fork reads `Date.now()` itself.** `nativeEvent.timestamp` is not populated on react-native-web — the feed's double-tap silently never fired for exactly this reason (S4.22), and the pure module's Jest tests passed the whole time because they pass real numbers. A test that feeds real numbers cannot catch this; the browser rung is the one that can.
- [x] The double-tap window decision is a pure module with an **injected clock** — no `Date.now()` inside what a test must steer (the S4.10 precedent) — and is sabotage-verified.
- [x] Proven on **web and on device**: the timing is the platform-forked part, so one rung is not evidence for the other.
- [x] At-top vs scrolled-down behaviour is identical across all four tabs.

## Comments

**2026-08-25, code review — the double-tap window was designed, built, and then correctly deleted. This ticket's checklist did not keep up, so two of its boxes were false when ticked.**

Boxes 10 and 11 above describe a **timing window** — a pure module with an injected clock, deciding "was this second tap inside 300ms of the first" — and box 10 promises the web fork reads `Date.now()` itself to dodge the S4.22 `nativeEvent.timestamp` trap. That module was written first (`isRetap`, `RETAP_WINDOW_MS`, `RetapClock`, `retapRouteFor`) and then **wired to nothing**, because the shipped retap is not a double tap at all: Home's pre-existing contract is *one* tap while already standing on the tab, and generalizing that to four tabs kept it. The dead module survived its own tests — they imported it directly — until the review that removed it (commit `8fd032d`).

**The deletion is the right outcome and the design is better for it:** with no window there is no clock to inject, no platform timestamp to distrust, and the S4.22 trap cannot be re-trippped because nothing reads event timing at all. `tabRetap.test.ts` now asserts exactly that, in as many words — *"the retap needs no event timing"*, plus a guard that neither the registry nor the tab bar mentions `nativeEvent` or `.timestamp`.

**What this costs, stated rather than hidden:** **spec AC 8's first clause is now unmeetable** — *"a broken window comparison … must turn a test red"* names a comparison that no longer exists. Its second clause (*"a helper that refetches while pending"*) is met and sabotage-verified in `revalidateOnFocus.test.ts`. AC 8 should be read as satisfied-by-deletion for the retap half; an owner may prefer to amend the line.

Boxes 10 and 11 are struck below rather than silently unticked, so the history stays legible.

- [~] ~~The web fork reads `Date.now()` itself~~ — no fork, and no clock read anywhere: the retap reads the current route.
- [~] ~~The double-tap window decision is a pure module with an injected clock~~ — deleted at review; the route decision it was replaced by is guarded instead.
