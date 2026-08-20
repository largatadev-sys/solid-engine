# 02 — Lifecycle chrome: own-name badges + the transition drawers

**What to build:** The trip screen presents the lifecycle under the states' own names and confirms both forward moves in a drawer. The mobile `ItineraryState` type drops `'draft'`; the viewer badge reads **Upcoming / Ongoing / Completed** (the editor chip stays "Trip Workspace"); the ladder CTA table loses its `finish-planning` rung; **Step back is deleted whole** — `showsStepBack`, `stepBackWording`, `STEP_BACK_WORDING` and the link go, not restyled — and `FinalizeSheet` dies with the act it confirmed. In their place: **one shared confirmation drawer** (canvas C5 anatomy — handle, 22/700 title, one-line body, 51px accent primary, quiet text cancel; tap-scrim and swipe-down cancel; no destructive styling) with the canvas's exact wordings — Start: *"Start this trip?" / "Postcards open for every member once the trip starts."* / cancel **"Not yet"**; Complete: *"Complete this trip?" / "Marks the trip as travelled — a completed trip can be published."* / cancel **"Still travelling"**. Motion per M2 (the app-wide sheet numbers) and M3 (in-flight CTA dim, badge crossfade, no re-bucket animation).

**Blocked by:** 01 — the server speaks three states.

**Status:** needs-triage

- [ ] Start Trip and Complete Trip open the drawer; every cancel path (text, tap-scrim, swipe-down) leaves the state untouched; confirm transitions and the badge crossfades 150ms to the new label (M3)
- [ ] The primary CTA dims to 0.85 opacity while the request is in flight — no spinner inside the button
- [ ] No Step back affordance renders in any state on either surface; the step-back symbols are deleted, not hidden
- [ ] The viewer badge reads Upcoming / Ongoing / Completed; **"Draft", "Ready" and "Active" render nowhere** — Jest string bans, the `completionSummary` precedent, covering the old step-back wordings and the old draft empty copy too
- [ ] `FinalizeSheet` and every Finalize affordance are gone
- [ ] Drawer motion matches M2 — enter scrim 200ms / travel 300ms ease-out, exit 200ms/150ms overlapped, transform/opacity only, `Animated.timing` on native, CSS transitions on web, Reduce Motion jump-cuts the travel
- [ ] The affected Jest files re-anchor; the mobile suite is green and `tsc --noEmit` is clean
