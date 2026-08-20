# 03 — The Trips tabs

**What to build:** Trips lands on three fixed, equal-width, in-page tabs — **Upcoming | Ongoing | Completed**, ladder order, `role=tab` (the S4.20 harness lesson) — replacing the four stacked sections. Landing is adaptive (canvas C2): Ongoing iff it holds at least one trip, else Upcoming, never Completed; within a session the traveler's last-selected tab wins. The card re-cuts to C3's five slots exactly: cover thumb, one-line title, **destination · dayCount sub-line** (the field ticket 01 adds), optional Published pill, optional **amber** editing advisory (#D97706 dot, #B45309 text) — no lifecycle badge, no date overline, no draft subtitle. Per-tab empty states carry frame 4's exact copy; the **Plan a Trip bar rides the Upcoming tab always** — populated and empty alike — and the other tabs never sell creation (C4). The quiet **Archived trips** link sits on Completed only — list footer and its empty state (C6) — restoring the archived list's only door. `InvitationInbox` stays as the list header on every tab. Tab-bucket and landing logic live as pure modules, Jest-first (the `landingSlot` precedent). Motion per M1 (underline slide, fade-rise, per-tab scroll offsets) and M4 (press feedback).

**Blocked by:** 01 — the server speaks three states. *(Not 02 — the card carries no lifecycle chrome; 02 and 03 can run in parallel behind 01.)*

**Status:** needs-triage

- [ ] Three tabs render fixed and always visible, ladder order, equal width, active styling per C1 — no counts, no icons, no swipe-between-tabs
- [ ] Adaptive landing proven both ways (Jest on the pure module + both seedings on a rung); a manual tab switch is session-sticky over the adaptive rule
- [ ] The card shows exactly the five C3 slots; the sub-line reads "‹destination› · ‹n› days" from `dayCount`; the advisory is amber; no lifecycle badge, date overline or draft subtitle anywhere on a card
- [ ] Empty copy matches frame 4 verbatim; the Plan a Trip bar renders on Upcoming populated and empty, and never on Ongoing/Completed
- [ ] The Archived trips link renders on Completed's footer and its empty state, routes to the archived list, and archived rows never appear inside the tabs
- [ ] `InvitationInbox` renders as the list header on every tab
- [ ] M1: underline slides 200ms transform-only, incoming list fade-rises 150ms, each tab keeps its own scroll offset; M4 press feedback on cards, tabs, CTAs and the archived link; Reduce Motion jump-cuts the rise
- [ ] The tabs and landing pure modules are Jest-covered; the mobile suite is green and `tsc --noEmit` is clean
