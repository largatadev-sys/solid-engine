# 05 — Mobile: design-token layer (`mobile/src/theme/`)

**What to build:** The token layer the epic map gates S0.3's screens on: semantic color roles (`background`, `surface`, `textPrimary`, `textSecondary`, `accent`, `danger`, …), a type scale, a spacing scale. Values: the **worklog palette, adapted** — lifted from S0.1's health screen hardcodes, which are then deleted; the health screen is retrofitted to consume tokens. The palette is an **explicit interim**: the brand/visual-direction decision remains open in the epic-map backlog, due before E4 — a values-only change when it lands, because roles are what screens couple to.

**Blocked by:** — (independent of the backend chain; can run first)

**Status:** ready-for-agent

- [ ] `mobile/src/theme/` exports color roles, type scale, spacing scale as the single styling source
- [ ] Zero hardcoded color/font-size/spacing literals in any screen, including the retrofitted S0.1 health screen (grep-clean)
- [ ] Token file carries the interim marker: a comment pointing at the epic-map backlog entry and the before-E4 deadline
- [ ] Existing Jest suite still green after the health-screen retrofit

## Comments
