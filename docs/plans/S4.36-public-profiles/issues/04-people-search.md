# 04 — People search, fenced

**What to build:** typing two or more characters in Discover surfaces a People group — at most three, with "See all" opening a dedicated results list — and tapping a person opens their profile. The enumeration fences are the feature: no query, no people; never by email.

**Blocked by:** 01.

**Status:** ready-for-agent

- [ ] The suggestions response gains a People group (additive field): at most 3 people, plus a "See all" signal when more exist.
- [ ] A dedicated people-search read serves the results screen, cursor-paginated.
- [ ] **The fences are enforced server-side, and the ITs prove the server, not the client gate:** an absent or 1-character query returns no People from either read; matching is on handle and display name only, case-insensitive; **an email-shaped query returns nothing even when it equals a traveler's stored email** (the IT stores one and proves absence).
- [ ] An un-onboarded traveler never appears, even on a display-name match.
- [ ] Ranking is a pure module, Jest-covered: exact handle → handle prefix → display name.
- [ ] The client-side gating (minimum length, debounce) follows the existing discovery search-gating pattern; the People group renders in the suggestions UI and "See all" opens the dedicated results screen — people take no destination/duration filters.
- [ ] A result tap routes to the profile and logs the People-tap demand event (register #2).
- [ ] The searching traveler never appears in their own suggestions or results — excluded server-side, and the IT proves it with the caller's own handle as the query (a match that would otherwise be exact). (Ruled 2026-08-25 — see the spec's Comments.)

## Comments

**2026-08-25 — the design baseline is now the S4.36 canvas**, frames **1c/1d** and contracts **C5/C6**: group order is **People first** (People → Destinations → Itineraries); people row and See-all anatomy per the digest; the results screen is the addressable **`/discover/people?q=`** route (deep-link restores), cursor pagination at **page 20, prefetch at 5 rows from end**, count line `"{n} people"`, and the no-results variant's final copy — never a blank list. Motion per **M3/M4**, Reduce Motion per M5. C5's match rule refines the spec's default: **prefix** match on display name or handle, case-insensitive. The pending confirmation settled the same day: **self-exclusion adopted and widened to the whole search surface** — suggestions and results both, server-enforced (now an AC above).
