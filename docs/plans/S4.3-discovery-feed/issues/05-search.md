# 05 — Search: mode, suggestions, recents, query results

**Status:** ready-for-agent
**Blocked by:** 03, 04 (the suggested-search chips render trending destinations' names).

**What to build:** The search half of Discovery (spec decisions 4–5, 14, and the count endpoint from 2). The landing's search bar is a button that opens a full-screen search mode: on-device recents, suggested-search chips, and grouped live suggestions as the traveler types. Submitting lands on the results screen with a count line. Search failures degrade honestly — stale results beat blank screens.

## Acceptance criteria

- [ ] The landing search bar opens full-screen search mode with the keyboard up; Cancel and back restore the landing exactly.
- [ ] Recents are client-local strings only: cap 8, deduplicated, saved on submit only (never per keystroke), individually removable, clearable, surviving app restarts; a stale recent still runs as a plain query.
- [ ] Suggested-search chips render the trending destinations' names; tapping one runs that search.
- [ ] The suggestions endpoint returns matching Destinations and Itineraries (max 3 each) for a partial query; the grouped UI renders both with a per-group "See all" landing on results. No People group.
- [ ] The `q` param lands on the list endpoint: case-insensitive substring over title and destination strings, trimmed, minimum 2 characters (server-validated), maximum 80, recency-ordered — covered by ITs.
- [ ] The count endpoint exists with filter semantics identical to the list — one IT proves list and count agree under the same filters; the results header renders the count line.
- [ ] Client search: 300ms debounce, latest-wins sequencing — rapid queries always settle on the last one typed.
- [ ] No results → the empty state naming the query with "Clear filters" that keeps the query; a failed search keeps the last good results visible under a thin retry banner.
- [ ] Keyboard edges per the mock: the suggestion list scrolls under the keyboard inset; tapping a result dismisses the keyboard first so ghost taps can't fire.
- [ ] Jest for the recents store and search gating; typecheck + affected suites green; walked per work-stage rules.

## Comments
