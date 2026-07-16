# 07 — Mobile: My Trips list + create + view screens

**What to build:** The three screens, tokens-only styling, reads through the query layer. **My Trips (the list) becomes the signed-in home screen**; the S0.2 me-screen stays reachable, demoted (nav affordance, not home). List: newest-first, infinite scroll on `nextCursor`, empty state ("plan your first trip" → create), pull-to-refresh. Create: title field, one destination text field (submits `destinations: [value]`), optional start/end date pickers (each clearable, independent), inline validation mirroring the server rules, submit → back to list with the new trip visible. View: title, destinations, dates, and the `draft`/`private` badges — read from cache, refreshed in background.

**Blocked by:** 05, 06.

**Status:** done *(the two on-device ACs close in ticket 08 — the human's observation, not this ticket's)*

- [x] Signed-in launch lands on My Trips; sign-in flow unchanged; me-screen reachable (header "Account"; "My Trips" back from it)
- [x] Create round-trip: submit → 201 → list invalidated so the trip appears without manual refresh → tap → view renders all fields *(wiring done + query-layer tested; observed on device at ticket 08)*
- [x] Dateless create succeeds; date-only-start create succeeds; `start > end` blocked inline before the request
- [x] Empty list renders the empty state, not a spinner-forever or a crash
- [x] Server 400 surfaces as the envelope's `message`, not a toast of JSON
- [x] Zero hardcoded colour literals; zero raw API calls (both grep-clean, enforced by `layering.test.ts`)
- [x] Jest: the screens' logic tested at the module boundary — *see below*

## Comments

**2026-07-16 — implemented.**

**The screens have no component tests, and the last AC is met differently than it reads.** `@testing-library/react-native` cannot render under this preset (ticket 06's comment), so instead of testing screens *as components*, the logic they carry was moved out of them: `validateItineraryForm` and `formatDates` are now plain modules in `src/itineraries/`, unit-tested directly (13 cases). What remains in the screen files is JSX and wiring. The on-device AC (ticket 08) is what proves the wiring — as it always was.

That extraction fixed a layering wart in passing: `[id].tsx` had been importing `formatDates` from `index.tsx`, which makes a route file a de-facto utility module and is how `app/` stops being routes and starts being a library.

**Dates are text inputs, not pickers — the weakest part of this story.** A picker is a native-dependency decision (community picker vs platform modal) that the walking skeleton has no business making, and the field is optional anyway. But the first traveler who types "next June" gets told it is not a date, which is a poor answer. Recorded as real, not hidden: **candidate for the epic-map backlog if the device AC makes it feel worse than it reads.**

**`formatDates` exists because every date combination is legitimate** (both, start-only, end-only, neither — S0.3 spec) and none of them may render as "undefined". `'Dates to be decided'` is the dreamer draft's honest label.

**The list's empty state is a real screen, not a spinner** — `ItineraryListIT.anEmptyListIsAResultNotAnAbsence` is the backend half of the same promise (Artifact 05: collections never 404).
