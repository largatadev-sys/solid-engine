# 04 — Mobile: the archived view and the frozen surface

**What to build:** archiving tidies the list without losing anything, and an archived trip *reads* archived rather than broken — on device and web alike. The owner gets the lever; members get the fact and their own exit.

1. **Repository layer:** archive + unarchive mutations and the archived-list read through the typed `apiClient` (ADR-001 — no raw fetch anywhere in UI code). Queries invalidate after each mutation (list + itinerary), matching S1.7's pattern.
2. **My Trips:** defaults to unarchived; the archived view is reachable for **everyone** — owner and members alike (spec decision 10: hiding archived trips from members recreates S1.5's "reads as data loss" failure one level up). Archived rows carry the archived badge alongside S1.7's state badge.
3. **The lever is the owner's alone:** archive on a live trip, unarchive on an archived one — both through the platform-forked `confirmWith` (the `Alert.alert` web-no-op gotcha; exact copy decided here, shared wording module so the forks cannot drift). Members see **no** control — the S1.5/S1.6/S1.7 don't-advertise-dead-ends pattern. Members' one live act, leave, stays visible and working on an archived trip.
4. **The frozen surface** (the S1.5 copy lesson — name the cause, assert neither wrongly): an archived trip's screen states it is archived; edit affordances are hidden or disabled rather than left to fail; any write that does reach the server and returns `TRIP_ARCHIVED` renders the archived explanation, never a generic error. Discovery is by pull — a member finds out on next fetch, no notification (standing founder ruling).
5. **Decision logic in pure functions, tested there** (the S1.5 `memberControls` precedent — jest-expo renders no screens, so the gating lives outside the render or it is untestable): who sees which control, what the archived state disables, badge selection. Jest + clean `tsc`.
6. **Web parity via the shared codebase** — no divergent web implementation; verified properly in ticket 05's preview-container run (never `expo export` + a static server).

**Blocked by:** 02 — archive/unarchive API (endpoints + list filter) · 03 — the fence (`TRIP_ARCHIVED` envelope exists to render).

**Status:** done

- [x] Archive/unarchive mutations + archived list through the repository layer; queries invalidate on both acts
- [x] My Trips: unarchived by default, archived view reachable for owner **and** member; archived badge on rows
- [x] Owner-only lever through `confirmWith`, both acts; members see no control; leave still visible and working on an archived trip
- [x] Frozen surface: archived screen states it; write affordances hidden; a `TRIP_ARCHIVED` response renders the archived explanation, not a generic error
- [x] Gating and disable logic in pure functions with Jest coverage; full mobile suite + `tsc` green (**584 tests, clean tsc**)

## Comments

**2026-07-28 — done. 584 mobile tests (up from 492 at S1.5), clean `tsc`.**

1. **The `archived` flag had to go into the query key, and that was the one genuinely dangerous part.** Two views sharing `['itineraries','list']` would let the archived list's pages overwrite the default list's in the same cache entry — trips appearing to vanish and reappear depending on which screen was opened last, which reads as a server bug. `list(archived)` keys them apart; `lists()` is the prefix that invalidates both, which every archive/unarchive must do because the trip *moves between them*. Two tests pin exactly this.
2. **`itineraryKeys.list()` kept compiling everywhere after the change, and that was the trap.** With a defaulted parameter the six existing call sites silently narrowed from "the list" to "the default view only" — no type error, no failing test, just a stale archived view. All invalidations were moved to `lists()`; `findInListCache` correctly stays on the default view (it seeds the detail screen from the list the traveler came from).
3. **`URLSearchParams` was written, then reverted.** It encodes to `application/x-www-form-urlencoded`, which leaves `/` unescaped and turns a space into `+` — a *different* encoding of the opaque cursor than `encodeURIComponent`, which is what shipped. The existing "escapes a cursor rather than trusting its characters" test caught it. The query string is now built by hand, and `archived` is omitted entirely when false so **the default list's URL is byte-identical to the pre-S1.9 one** — an unchanged request being the cheapest possible proof that the parameter is additive.
4. **Frozen means hidden, not disabled-and-failing.** Edit, the lifecycle banner and the Daily-schedule link all disappear on an archived trip, with the archive banner above explaining why. Leaving them tappable would offer a guaranteed `TRIP_ARCHIVED` — the dead end this repo keeps refusing to advertise. The Daily-schedule link matters most: that screen acquires the edit lease on mount, so it *would* have bounced back on its own — but with a lock message rather than an archive one, diagnosing as the wrong problem.
5. **`canLeaveTrip` returns a constant `true`, deliberately, and has a test.** The founder's rule (acts on the trip freeze, acts on your own membership do not) is exactly the kind of thing a later "hide controls on archived trips" sweep would quietly break. A named function with a test is the executable version of the note.
6. **`TripRow` was extracted rather than copied** — two lists rendering "the same" row is how a badge gets added to one and forgotten on the other. The archived badge sits *beside* the lifecycle badge, never inside it: the machines are orthogonal, so a trip can read Completed **and** Archived.
7. **The archived list is its own route, not a toggle** — the two views have independent cursors (a toggle would reset paging on every flip), and a filter chip pinned to the top of My Trips quietly undoes the shortening that archiving is *for*.
