# 04 — Drag-reorder under real pointers and touch

**What to build:** The drag-grip specs, on the surface ticket 03 stood up — the sharpest case for the engine change, since the CDP harness could never send real PointerEvents or touch. A traveler drags an activity by its grip and the plan reorders correctly in both directions, staging rather than persisting; the keyboard path reorders without writing.

**Blocked by:** 03 — Draft Workspace, Editing Session, activity form, buffered saves.

**Status:** ready-for-agent

- [ ] The grip is draggable with Playwright's real pointer gestures on the web project — no synthetic in-page event dispatch anywhere in the spec
- [ ] A downward drag and an **upward** drag both land on the correct slot; the upward drop settles by easing, without the round-toward-zero asymmetry regressing
- [ ] The drop **stages** — nothing persists until Save Changes; the staged order survives into the save
- [ ] ArrowUp on a focused grip reorders the screen and **writes nothing**
- [ ] The arrow buttons are gone from the rows
- [ ] A touch-context drag (the founder's erratic-carousel class of input) exercises the same reorder path
