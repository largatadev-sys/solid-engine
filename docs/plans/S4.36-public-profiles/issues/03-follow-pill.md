# 03 — The Follow pill, honest and measured

**What to build:** every profile that isn't mine carries a Follow pill in the slot the mock gives Edit Profile — and tapping it answers honestly that following is coming soon, while the tap itself is counted so story B is grilled against demand rather than instinct.

**Blocked by:** 01.

**Status:** closed

- [ ] The pill renders on every non-self profile in the Edit slot with the mock's pill geometry (the third delta of the spec's design-baseline ruling); it does not render on self-view.
- [ ] Tapping fires the app-drawn, platform-forked coming-soon prompt — the web fork proves the dialog (the harness auto-accepts and prints its wording; a native `Alert` would be a silent no-op on web, the recorded trap family).
- [ ] The tap performs **no mutation**: the walk asserts no write request leaves the app.
- [ ] The follow-tap demand event joins register #2.

## Comments

**2026-08-25 — the design baseline is now the S4.36 canvas**: the pill's resting treatment is settled — **filled #EA580C, white label, height 40, radius 999, 13.5/700, press scale 0.96 @120ms** (C2's Follow half; M1's press scale). **Explicitly not built here:** the Following state, C1's optimistic state machine, and M1's crossfade — they are story B's design input, pre-drawn in the canvas and fenced off in the digest. This ticket's pill has exactly one state.
