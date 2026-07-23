# 04 — Itinerary field edit + the date-picker debt

**What to build:** any member edits the trip's own fields — title, destinations, dates, description — from an edit surface on the mock's form layout, and nobody ever hand-types `2027-01-10` again (the S0.3 backlog debt, discharged here by the spec).

1. **Endpoint:** `PATCH /v1/itineraries/{id}` — the four fields, member-authorized, last-edited stamped, LWW. Date rules unchanged from S0.3 (optional; start ≤ end; factory and DTO agree). **No span↔day-count invariant** — deliberate (ADR-013; the UI may nudge, never enforce).
2. **Mobile edit surface:** the create-form layout reused for edit (mock parity); destinations edited as the list it is (canon — the mock's single "Change…" field is a UX simplification, spec §Q4).
3. **The date picker:** component decision made *here* (community picker vs platform modal); if it adds a native dependency it goes through a config plugin — never a hand-edit of the generated `android/` tree (CNG). **Web fork = browser-native date input** (standing principle: web ≈ mobile except native-only). Duration control from ticket 01 reused/extended as needed.
4. **Tests:** contract IT (member edits fields, attribution, guard posture, date-rule regression) · mobile Jest · the picker proven on the dev build *and* the preview container (a native picker and a browser input are different code paths — both run).

**Blocked by:** 01.

**Status:** done (2026-07-23) — full backend `verify` green (`ItineraryFieldEditIT` 8 new + `ItineraryTest` +3 edit tests; every existing suite unmodified), 387 mobile tests green, typecheck clean; `/code-review` both axes run (Standards: no hard violations; Spec: all ACs met) and both findings fixed. Committed on `feature/S1.3-days-and-activities`.

- [x] A non-owner member edits all four fields; attribution = that member (spec AC 4) — `ItineraryFieldEditIT.aMemberWhoIsNotTheOwnerEditsEveryFieldAndIsRecordedAsTheEditor`; `editFields` takes a `Membership`, stamps `member.travelerId()`, no `isOwner()` anywhere.
- [x] Dates from a real picker on device; browser-native input on web (spec AC 9) — platform-forked `DatePicker`: native `@react-native-community/datetimepicker` (via `expo install`, config-plugin-registered in `app.json` — CNG-safe, no `android/` hand-edit) and web `<input type="date">`. Both create and edit screens use it. **The device/preview *proof* is ticket 06's** (a story-gate run); the code is structured for both paths.
- [x] Destinations list add/remove/edit round-trips (min 1 non-blank preserved) — the row ops extracted to `destinationsEditor.ts` (add/remove/set/clean) and tested (`destinationsEditor.test.ts`), so the round-trip AC has client-side coverage, not just the wire (Spec-review A1 fix); backend rejects an empty list (`ItineraryFieldEditIT.anEmptyDestinationsListOnEditIsRejected`).
- [x] Owner-only set unchanged — no widening (spec AC 5) — `editFields` touches only title/destinations/description/dates/lastEdited; `ItineraryTest.editingLeavesOwnershipAndStateUntouched` pins `ownerId`/`state`/`visibility`. No path to them exists.
- [x] 404-mask / 401 posture; existing suites unmodified (spec AC 6) — `aNonMemberEditingIsMasked` (404 `ITINERARY_NOT_FOUND`), `aVisitorWithNoTokenIsRejected` (401).

## Comments

**2026-07-23 — implemented; the date rule, the picker decision, and two review fixes.**

1. **`validateFields` extracted, shared by create and edit.** The factory's field validation (title present/bounded, ≥1 non-blank destination, start ≤ end) moved into one private static that both `Itinerary.draft` and the new `editFields` call — so a create and an edit can never disagree about what a valid itinerary is (the two-door discipline applied to the mutator).

2. **The date rule reaches the edit path as a 400, via a shared `HasDateRange` interface.** `@ChronologicalDates` was typed to `CreateItineraryRequest` specifically; both request records now implement `HasDateRange` (two accessors — records can't extend), and the validator targets that. So a backwards range on *edit* is a clean `VALIDATION_FAILED` 400, not the 500 a raw `IllegalArgumentException` from the domain would become (`aBackwardsDateRangeIsRejected` pins it). The create path's contract is unchanged (it still implements the interface).

3. **The date-picker debt (S0.3 backlog) is discharged — component decision made here.** `@react-native-community/datetimepicker` (Expo-compatible `9.1.0`), the standard supported choice, added via `expo install` so it autolinks and registers its config plugin in `app.json` — **no hand-edit of the generated `android/` tree** (the CNG rule; such an edit would vanish at the next prebuild). Web forks to the browser-native `<input type="date">` (the standing web≈mobile principle). The forks share `datePickerContract.ts` and the ISO↔Date conversion lives in `isoDate.ts` (UTC round-trip, so a calendar day never shifts across a timezone). Both create and edit screens use the picker.

4. **Two review fixes.** (a) **Spec A1** — the destinations row add/remove/edit was UI-only and untested; extracted to `destinationsEditor.ts` and unit-tested, so AC 3's "round-trips" has client-side coverage (the `reorderActivityIds` pattern). (b) **Spec A2** — the create screen's date shape-check is now unreachable from the UI (the picker guarantees ISO), inconsistent with the edit form which dropped it; kept as documented defence-in-depth (its contract is "validate a date-shaped string" for any caller) with a comment stating so, rather than deleting tested behaviour.

5. **Standards findings, dispositioned not fixed:** the test `fieldIn` JSON string-slice helper is fragile, but it is the *existing* pattern across every contract IT in this module — changing one class would make it the odd one out; a repo-wide switch to a JSON parser is its own cleanup, not this ticket's. The `edit.tsx`/`new.tsx` `Field` duplication is MVP-acceptable for two screens (extract if a third appears). Both recorded here.
