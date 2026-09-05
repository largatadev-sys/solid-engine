# 06 — The creator-row pill on the published page

**What to build:** the published itinerary page's creator row stops saying "Follow, coming soon" and carries the real pill, compact, behaving exactly as the profile's — Follow, Requested or Following — and shows nothing at all when the creator is the viewer (spec decision 7; canvas frame 6, contract C1, motion M1).

**Blocked by:** 01.

**Status:** ready-for-agent

- [ ] **The coming-soon stub retires**: the greyed control in the creator row goes, `follow` leaves the coming-soon surfaces, and the coming-soon Jest list and the publish spec's "Follow greys with a message too" case invert — the S4.36-era assertion becomes "the creator row carries the real pill".
- [ ] **The compact pill**: height 32, 13/700, padding 0 14, check glyph 12px, the same three treatments and **M1**, driven by ticket 01's machine and its toasts.
- [ ] **Its state comes from the creator's profile read by handle** through the existing public-profile query — cached, `retry: false`, one read per page view. No field is added to the published response.
- [ ] **Hidden, not disabled**, when the creator is the viewer (the existing traveler-destination `own` rule, so the own showcase and the own published page render no pill), while the profile read is loading, when it answers 404, or when the creator has no handle. The byline tap is unchanged.
- [ ] Consumer audience only: the owner's preview of an unpublished trip shows no pill, as today.
- [ ] **Jest:** the pill-visibility rule as a pure module (own, loading, 404, no handle → hidden; otherwise shown with the relation); a structural guard that no coming-soon call for `follow` survives anywhere.
- [ ] **Playwright, web:** **t1 = private creator, t2 = approved follower, t3 = stranger**. t3 opens t1's published itinerary: the row reads Follow → tap → Requested → the server reads `requested`. t2 reads Following. t1's own published page shows no pill. A public creator's page: t3 taps → Following.
- [ ] Process gates: full Jest before any push that adds a file under `src`; the Playwright list check.
