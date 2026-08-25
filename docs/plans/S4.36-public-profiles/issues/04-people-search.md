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

## Comments

*(none yet)*
