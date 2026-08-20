# 04 — The Playwright suite re-anchors + the new specs

**What to build:** The web rung proves the re-cut end to end. The 12 specs referencing draft/Finalize/Step back/Active re-anchor to born-`upcoming` and the new chrome; a **ladder spec** walks create → Upcoming → Start Trip (through its drawer, cancel path included) → Ongoing → Complete Trip (drawer) → Completed → publish; a **tabs spec** proves both adaptive-landing seedings, the per-tab empty states, the Upcoming-only create bar, and the archived link. A dead-label sweep asserts "Draft", "Ready" and "Active" appear nowhere on the walked surfaces.

**Blocked by:** 02 — own-name badges + drawers · 03 — the Trips tabs.

**Status:** ready-for-agent

- [ ] The 12 affected specs carry no draft/Finalize/Step-back/Active references and pass
- [ ] The ladder spec walks the full forward ladder through both drawers, asserting the cancel path leaves state untouched and the confirm path transitions
- [ ] The tabs spec proves: landing on Ongoing with an ongoing trip seeded, landing on Upcoming without one, each tab's empty state and copy, the create bar's placement, and the archived link's route
- [ ] The dead-label sweep passes on every walked surface
- [ ] `npm run smoke` — the whole suite, both projects, one exit code — is green
