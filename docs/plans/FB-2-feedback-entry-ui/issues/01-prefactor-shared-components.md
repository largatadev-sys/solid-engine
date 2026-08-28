# 01 — Prefactor: the three shipped-component touches

**What to build:** the additive changes that make the story's easy change easy, each provably
inert for every existing caller. The members BottomSheet gains an attempt-to-dismiss seam so a
consumer can intercept scrim tap, swipe-down, and the Modal's request-close path (hardware
back) with one rule; the Button gains an optional `busyLabel` rendered beside its existing
spinner; the Icon set gains `'feedback'` — the comment bubble path plus stem and dot, reading
as "something is wrong here", not "reply".

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Every existing sheet's dismiss behavior is unchanged — no existing test edited, full suite green
- [ ] A sheet passing the new seam sees scrim tap, swipe-down, and hardware back arrive through it; a sheet not passing it behaves exactly as today
- [ ] Button without `busyLabel` renders busy exactly as today; with it, spinner and word render side by side
- [ ] The `'feedback'` glyph renders at the dock's 18px size and matches the handoff's markup
- [ ] Full Jest sweep green before push (the shared-code rule)
