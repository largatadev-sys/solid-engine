# 06 — Filter sheet

**Status:** ready-for-agent
**Blocked by:** 04 (destination param), 05 (count endpoint, typeahead source).

**What to build:** The results screen's filter sheet (spec decision 8). Edits are a draft until Apply — and Apply always tells the traveler what it will do before they commit ("Show 23 itineraries"), so nobody ever filters into an empty screen. This completes the results screen's contract: query + destination + duration, all deep-linkable.

## Acceptance criteria

- [ ] The sheet opens from the filter button seeded with the applied filters; edits mutate a draft only; Apply commits and closes; scrim tap, drag-down, and back all discard the draft — no partial application ever.
- [ ] Duration presets (1–3 / 4–7 / 8–14 / 15+ days) map over the itinerary's day count; the `duration` param lands on list and count with ITs (boundary values covered).
- [ ] Destination is a single-select typeahead over the published destination set (the suggestions endpoint's Destinations group), clearable.
- [ ] The Apply label shows the live count, debounced per draft change; if the count can't load it falls back to "Show results" with no in-sheet error; a zero count disables Apply reading "No exact matches".
- [ ] Reset renders only when the draft differs from defaults, resets the draft, and needs Apply to commit.
- [ ] The filter button wears a badge counting non-default filter groups.
- [ ] The results route carries query + destination + duration in params — a shared search restores exact state, filters included.
- [ ] Jest for the draft model (edit/apply/discard/reset), preset mapping, and badge counting; typecheck + affected suites green; walked per work-stage rules.

## Comments
