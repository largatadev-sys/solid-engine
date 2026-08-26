# 04 — Executed search: People above Trips

**What to build:** the S4.36 escape's fix (regression-checklist line 31), founder-ruled shape: submitting a query lands on a combined results screen with a People group above the Trips results — canvas frames 4/4b, semantics per C8.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] **Submit lands on the combined results screen:** the existing Discover results screen gains a **People group at the top** whenever ≥1 traveler matches — label "PEOPLE" 12/800 uppercase #A8A29E, up to 3 rows (36px avatar, name 14/700, handle 12 muted, tap → profile, `people_result_tapped` retires with the client analytics — see ticket 01's deletion), footer **"See all people"** → the full People results screen; hairline divider; "TRIPS" label; itinerary results unchanged below.
- [ ] **The count line reads "{p} people · {t} trips"** — singular "1 person" per frame 4b; the trips half keeps the S4.3 matches-not-cards rule.
- [ ] **The ≥1 gate replaces >3 everywhere:** the results screen's People group *and* the suggestions overlay's "See all people" render from the first match — the more-than-3 flag stops gating any door; the cap-3 display rule stays.
- [ ] **Frame 4b:** only people match → people group + the trips empty state, copy byte-for-byte: 'No trips match "{q}"' / "Try a destination or itinerary name."
- [ ] **The fences hold, asserted:** 2+ chars, no empty-query browse, handle + display name only, never email — the existing fence ITs extend to the combined path.
- [ ] The people fetch reuses `/v1/discovery/people`; if the count line needs a total the endpoint lacks, it is added **additively** and the ticket records it.
