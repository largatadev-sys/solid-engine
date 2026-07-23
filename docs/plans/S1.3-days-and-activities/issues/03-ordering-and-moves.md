# 03 — Ordering: drag reorder + cross-day move

**What to build:** members arrange the plan by hand — drag an activity within its day and the order sticks (a typed time never overrides it), move an activity to another day from the edit screen — and the arrangement survives round-trips and renumbering.

1. **Order semantics (ADR-013):** manual sort order is *authoritative*; time-of-day is display metadata. Reorder mechanics on the PATCH surface (exact wire shape is this ticket's call, inside the spec's locked constraints: additive, member-gated, LWW).
2. **Cross-day move:** the activity's day is editable via PATCH; the activity lands at the target day's end. Interacts with delete-renumber (ticket 01) — order integrity pinned across both.
3. **Mobile:** drag handle on cards (within-day reorder) · day selector on the edit screen (the mock enters from a day context and mobile drag-across-tabs is bad UX — spec §mechanics) · optimistic-order UI through the repository layer.
4. **Tests:** storage/service ITs — order round-trips, reorder persists, move lands at target end, contiguity + order survive day deletion · a typed time out of order does not resort (pins "manual is authoritative") · mobile Jest for the drag/reducer logic.

**Blocked by:** 02.

**Status:** done (2026-07-23) — full backend `verify` green (`ActivityOrderingIT` 6 new; `ActivityContractIT` +4 → 11; every existing suite unmodified), 336 mobile tests green, typecheck clean; `/code-review` both axes run (Standards: no blocking; Spec: all ACs met) and every finding fixed. Committed on `feature/S1.3-days-and-activities`.

- [x] Reorder within a day: order persists, survives refresh, time untouched (spec AC 3) — `ActivityOrderingIT.aTypedTimeNeverResortsTheDay` + `reorderPersistsToTheClientGivenOrder`; wire in `ActivityContractIT.aMemberReordersADayOverHttp` (PUT returns the reordered day; a fresh GET confirms persistence). The service never reads `timeOfDay` — manual order is the only truth.
- [x] Cross-day move lands at the target day's end; source stays ordered (spec AC 3) — `crossDayMoveLandsTheActivityAtTheTargetsEnd`; `move` uses `findMaxSortOrder + 1` on the target, both source- and target-day masked.
- [x] Deleting a day leaves other days' order intact — `deletingADayLeavesTheOtherDaysActivityOrderIntact` (the day renumbers, its activities' order does not).
- [x] Reorder/move keep 404-mask / 401 posture; suites unmodified (spec AC 6) — `aNonMemberCannotReorderOrMove`; stale-list reorder is a clean 400 (`aStaleReorderListIsA400`).

## Comments

**2026-07-23 — implemented; the wire shape, one UX call, and three review fixes.**

1. **Reorder wire shape = whole ordered id-list via `PUT .../activities/order`** (the spec left this to the ticket's discretion). The client sends the day's complete order; the server rewrites `sort_order` to 0,1,2,… A whole-list PUT is idempotent, needs no fractional indices, and resolves two members' concurrent reorders to last-write-wins like every other write here. The service rejects a list that is not *exactly* the day's activities (`InvalidReorderException`, a 400) — a stale client one item behind a concurrent add would otherwise silently drop it.

2. **Cross-day move is `POST .../activities/{id}/move`, kept distinct from the content PATCH.** Move is *position*, edit is *content* (LWW); folding one into the other would muddy what "the whole activity changed" means. A move does **not** restamp `last_edited_by` — who wrote the content is still true (Spec review confirmed this reading of Q7).

3. **UX call: reorder ships as move-up/move-down controls, not a native drag gesture.** A true drag needs a native gesture library — a config-plugin-scale dependency decision the ticket has no mandate to make — and up/down delivers the AC (order persists, survives refresh, time never resorts) with logic that is a pure, tested array swap (`reorderActivityIds`). **Both review axes accepted this**: the binding spec line is behavioural ("manual order persists and round-trips"), gesture-agnostic. **Consequence for the founder: the drag-handle affordance the mock implies is now a backlog polish, not shipped.** Recorded here per the living-baseline rule; a drag gesture is an additive later change to one screen.

4. **Three code-review fixes applied.** (a) `PUT /order` returns **200 + the reordered day** (was 204) — honouring 05-api-conventions' PUT→200+resource, and the client gets the confirmed order without a follow-up read (Standards finding). (b) The reorder analytics event carries its id under a **`dayId`** key via a dedicated `emitForDay` — the reorder is about a day, not one activity, and the key now names the right entity (Standards finding, P3-safe either way). (c) The `createActivity` test fixture reads the new activity's id from the **create response**, not a by-day query that is no longer unique once a day holds several activities (root-cause fix found when the first reorder test failed).

5. **The drag deferral, confirmed by the founder after seeing it run (2026-07-24).** At the three-rung smoke test the founder exercised the shipped reorder on both the emulator and the web preview, observed that the arrows work and the mock's *drag* does not, and — once the cost was laid out (a native gesture library, plus a **separate web implementation** because those libraries barely support the browser) — **confirmed the deferral rather than pulling it into S1.3.** Recorded as a full backlog entry in the epic map, including the cheaper "native drag + keep arrows on web" option the standing web≈mobile principle permits, since a drag is a native gesture. The arrows also stay regardless: they are the only reorder a screen reader can drive.

6. **Accepted, documented: a cross-day move can leave a gap in the source day's `sort_order` integers** (e.g. 0,2 after the middle one moves). Relative order is preserved (ordering is `sort_order, id`), and both `reorder` and `create` tolerate gaps, so nothing breaks. Normalising every move to keep the integers dense is machinery for a purely cosmetic invariant no AC requires — deliberately not added (Spec review raised this; the call is to leave it).
