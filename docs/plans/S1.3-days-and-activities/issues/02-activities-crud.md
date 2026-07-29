# 02 — Activities CRUD end-to-end

**What to build:** members fill days with activities — name, time, cost, place, description, private notes, one link — from the mock's card list and add/edit screen, with last-write-wins semantics and per-write attribution.

1. **Domain:** `Activity` under `Day` (same aggregate): title · optional local time-of-day (timezone-free) · optional estimated cost (amount + currency; null = unstated, 0 = "Free" — and **planning money never touches ledger paths**, spec §boundary) · free-text place · description · notes (private semantics) · one optional `externalUrl` · sort order (assigned at create: end of day; authoritative mechanics land in ticket 03) · `last_edited_by/at` stamped from the resolved `Membership` on every write.
2. **Endpoints (additive, member-gated):** activity POST (under a day) / PATCH / DELETE. **LWW whole-entity writes — no version/ETag/409 surface**, deliberately (2026-07-17 ruling; spec AC 7 pins the *absence*).
3. **Mobile:** Add/Edit Activity screen mock-faithful (all shipped fields; the URL field replaces the mock's Booking row — the panel is parked, spec §links) · activity cards on Daily Schedules (time • cost meta line, "Free" for zero, title, place subtitle, edit + delete) · delete confirm. Analytics: `activity_created/edited/deleted`.
4. **Tests:** contract ITs (CRUD, field round-trips, guard posture) · the two-account LWW IT (sequential whole-entity writes — second silently wins, attribution follows) · mobile Jest.

**Blocked by:** 01.

**Status:** done (2026-07-23) — full backend `verify` green (28 classes; new `ActivityStorageIT` 9 + `ActivityContractIT` 7; every existing suite unmodified), 322 mobile tests green, typecheck clean; `/code-review` both axes run (Standards: no hard violations; Spec: ship-ready) and both findings dispositioned. Committed on `feature/S1.3-days-and-activities`.

- [x] Full activity CRUD as a non-owner member; every write stamps that member's attribution (spec AC 4) — `ActivityContractIT.aMemberCreatesEditsAndDeletesAnActivityWithAttribution`; `ActivityService` mutators take a `Membership`, no `isOwner()` anywhere
- [x] Two members write the same activity sequentially: second wins, no conflict surface exists (spec AC 7) — `ActivityContractIT.twoMembersEditingTheSameActivitySequentiallyLastWriteWins` (owner edits, member edits, member wins, attribution follows; no version/ETag/409 exists in DTO, service, or controller)
- [x] Zero-cost renders "Free", unstated renders nothing — the null/0 distinction round-trips (spec §fields) — pinned at storage (`ActivityStorageIT.zeroCostAndUnstatedCostAreDifferentFacts`), contract (`costAmount` wire string), and mobile (`formatActivityCost.test.ts`)
- [x] Itinerary module gains no ledger/workspace-money reference (spec AC 8) — confirmed at review: the only `ledger`/INV-7/8 tokens are the boundary-documenting javadoc; no Transfer/balance/workspace-money path
- [x] New endpoints: 404-mask / 401 posture; existing suites unmodified (spec AC 6) — `aNonMemberIsMaskedOnEveryActivityEndpoint`, `aVisitorWithNoTokenIsRejectedAtTheSecurityChain`, `ACTIVITY_NOT_FOUND` cross-day masking

## Comments

**2026-07-23 — implemented; two review dispositions and one design note.**

1. **`ActivityFields` value object bundles the eight editable fields.** A `create(dayId, title, time, amount, currency, place, description, notes, url, editor, at)` is the Data-Clumps smell made flesh — the same run of fields through the factory, the mutator, and the DTO. `ActivityFields` names the clump, and — the load-bearing part — it is where validation lives (title required, cost amount⇔currency paired, non-negative), so create and edit can never disagree about what a valid activity is. Both route through it.

2. **Analytics fire server-side, not in the mobile layer the spec named (Spec-review A1, recorded per the living-baseline rule).** Spec §Mobile scope lists `activity_created/edited/deleted` under the Mobile bullet; the implementation emits them in `ActivityService` via `AfterCommit`, with no client-side analytics call. **Chosen deliberately, kept:** server emission cannot be skipped by an offline client and cannot double-fire on a retry, and it is consistent with ticket 01's day events (`day_added/removed`, also server-side) and the existing `itinerary_created`/invite events. The event names and id-only payloads match the spec's intent (register #2); only the layer moved. Not re-litigated to the client — this is the more reliable home.

3. **Two small review fixes applied:** the create cap check reads `countByDayId` rather than loading every row (`.size()`) — Standards-review efficiency nit; and the activity card's meta line renders conditionally, so an activity with neither a time nor a cost shows no empty `<Text>` above its title (Spec-review A2, cosmetic).

4. **Malformed time/amount is a 400 at the DTO door, not a 500 in the parser.** `ActivityRequest`'s `@Pattern` asserts the shape of a time and an amount, so a bad value is a good `VALIDATION_FAILED` (pinned by `ActivityContractIT.aMalformedTimeIsA400NotA500`). `toFields()`'s own parse guards and `ActivityFields`' cross-field rules become defence in depth for a non-DTO caller (a fork, an import), where a 500 is the accepted two-door backstop — documented in the DTO javadoc.
