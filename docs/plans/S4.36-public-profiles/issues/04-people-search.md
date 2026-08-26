# 04 — People search, fenced

**What to build:** typing two or more characters in Discover surfaces a People group — at most three, with "See all" opening a dedicated results list — and tapping a person opens their profile. The enumeration fences are the feature: no query, no people; never by email.

**Blocked by:** 01.

**Status:** closed

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

**2026-08-26 — the ranking AC, answered differently than it was written.** The AC asks for *"a pure module, Jest-covered: exact handle → handle prefix → display name"*. What shipped is the **gate** as a pure module (`PeopleQuery`, `PeopleQueryTest` 7/7 — min length, empty query, email refusal, the leading `@`, truncation) and the **ranking in SQL** (`TravelerRepository.PEOPLE_RANK`), proven at the wire by `PeopleSearchIT.theExactHandleOutranksAPrefixMatchWhichOutranksADisplayNameMatch`.

**Why, on the record rather than as a silent substitution:** ranking here *is* the `ORDER BY`, because the page is a keyset over that same tuple. A JS module holding a second copy of the order would be a definition that never executes — free to drift from the one that does, with nothing red when it does. That is the shape this repo has been burned by (a check whose two outcomes are indistinguishable). The seam that genuinely can drift — the gate, which the client also enforces — *is* the pure module. **If ranking ever moves off the database** (a score computed in the service, a search index), it becomes a pure module then and this AC is discharged as written.

**2026-08-26 — two deviations from the canvas, declared at the review rather than passed silently.**

- **The results route is `/discovery-people?q=`, not C6's `/discover/people?q=`.** C6's *property* is what mattered and it holds — the route is addressable and a deep link restores the query. The path differs because the shipped Discover tree has no nested `/discover/…` segment: its siblings are `/discovery-search` and `/discovery-results`, so `/discover/people` would have been the only nested path in the group. Consistency with the shipped tree won over the letter of the canvas. **Revisit if** the Discover routes are ever restructured to nest.
- **"See all people" renders only when a fourth match exists.** C5 draws the footer unconditionally. Shipping it that way meant a single match offered to open a list of one, which the build review caught. The server now returns a `morePeople` signal and the footer follows it — both directions IT-covered (`suggestionsSaySoWhenMorePeopleMatchThanTheCapShows`, `suggestionsStaySilentWhenTheCapAlreadyShowsEverybody`). Nothing platform-level forced this; it is a correctness call against the frame, and it is recorded as one.
