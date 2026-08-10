# 03 — The stub, the owner-only tag, and the soft-retirement

**What to build:** The Travelers tab tags the owner and nobody else — "Owner" on that row only, member rows carry no role text (spec decision 1). Tapping any traveler row, your own included, opens the read-only **profile stub**: a new member-scoped screen rendering the shared card from the fattened roster data — no email, no role badge, no edit affordance (spec decision 2). The tab's rows stop linking to the members screen; the ownership-offer banner's deep link stays as that screen's only remaining door, so pending offers stay actionable while remove/leave/transfer go dormant (spec decision 4 — the founder-consented gap, epic-map line already written).

**Blocked by:** 01 — The roster fattens (the stub's fields ride it) · 02 — The shared profile card (the stub renders it).

**Status:** done

- [x] The Travelers tab shows "Owner" on the owner's row only; anatomy otherwise unchanged (spec AC 1).
- [x] Row tap opens the stub for that traveler; self-tap opens the same stub for yourself; every field absent when null; no email, no role badge, no edit affordance (spec AC 2).
- [x] The tab no longer navigates to the members screen; `largata://members/<id>` still resolves; the offer banner still links there (spec AC 4, static half).
- [x] The owner-only tag rule is pinned in the `memberControls` pure-logic family's table-driven test.
- [x] Accessibility labels change from the "manage" phrasing to a view-profile phrasing; the driver's visible-match rule still finds the rows.
- [x] The stub walks on emulator and web preview with two pool travelers (t1 = owner, t2 = member).
