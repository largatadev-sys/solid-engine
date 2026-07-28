# 04 — Mobile: the archived view and the frozen surface

**What to build:** archiving tidies the list without losing anything, and an archived trip *reads* archived rather than broken — on device and web alike. The owner gets the lever; members get the fact and their own exit.

1. **Repository layer:** archive + unarchive mutations and the archived-list read through the typed `apiClient` (ADR-001 — no raw fetch anywhere in UI code). Queries invalidate after each mutation (list + itinerary), matching S1.7's pattern.
2. **My Trips:** defaults to unarchived; the archived view is reachable for **everyone** — owner and members alike (spec decision 10: hiding archived trips from members recreates S1.5's "reads as data loss" failure one level up). Archived rows carry the archived badge alongside S1.7's state badge.
3. **The lever is the owner's alone:** archive on a live trip, unarchive on an archived one — both through the platform-forked `confirmWith` (the `Alert.alert` web-no-op gotcha; exact copy decided here, shared wording module so the forks cannot drift). Members see **no** control — the S1.5/S1.6/S1.7 don't-advertise-dead-ends pattern. Members' one live act, leave, stays visible and working on an archived trip.
4. **The frozen surface** (the S1.5 copy lesson — name the cause, assert neither wrongly): an archived trip's screen states it is archived; edit affordances are hidden or disabled rather than left to fail; any write that does reach the server and returns `TRIP_ARCHIVED` renders the archived explanation, never a generic error. Discovery is by pull — a member finds out on next fetch, no notification (standing founder ruling).
5. **Decision logic in pure functions, tested there** (the S1.5 `memberControls` precedent — jest-expo renders no screens, so the gating lives outside the render or it is untestable): who sees which control, what the archived state disables, badge selection. Jest + clean `tsc`.
6. **Web parity via the shared codebase** — no divergent web implementation; verified properly in ticket 05's preview-container run (never `expo export` + a static server).

**Blocked by:** 02 — archive/unarchive API (endpoints + list filter) · 03 — the fence (`TRIP_ARCHIVED` envelope exists to render).

**Status:** ready-for-agent

- [ ] Archive/unarchive mutations + archived list through the repository layer; queries invalidate on both acts
- [ ] My Trips: unarchived by default, archived view reachable for owner **and** member; archived badge on rows
- [ ] Owner-only lever through `confirmWith`, both acts; members see no control; leave still visible and working on an archived trip
- [ ] Frozen surface: archived screen states it; write affordances disabled; a `TRIP_ARCHIVED` response renders the archived explanation, not a generic error
- [ ] Gating and disable logic in pure functions with Jest coverage; full mobile suite + `tsc` green
