# 03 — Mobile browse surface: Discover tab → landing → results → published view

**Status:** ready-for-agent
**Blocked by:** 01 (deterministic stubs), 02 (backend spine).

**What to build:** The Discover tab goes live (spec decisions 11–13, 15, 17–19). A traveler taps Discover and lands on a real screen: the Recommended rail of recently published itineraries, a See-all card into the browse-all results list, infinite scroll, and every card opening the existing published itinerary view. This is the story's demoable tracer: publish a trip, find it by browsing, open it.

## Acceptance criteria

- [ ] The Discover tab opens the landing — the greyed refusal and its coming-soon analytics retire; the tab's accessibility label stops saying "coming soon".
- [ ] The Recommended rail renders real cards from the recommended endpoint with the mock's peek-and-snap carousel behavior, reusing the feed's existing carousel modules (no new copy of the shared paging math); beyond the cap a "See all" end card lands on the browse results.
- [ ] The rail hides itself when empty; with nothing published at all the landing shows the honest full-screen empty state.
- [ ] The results screen browses everything: cursor-paginated through a typed discovery repository (the null-cursor coercion handled), fetch-ahead near the end, two skeleton cards while loading, an inline Retry row on a failed page that keeps loaded results.
- [ ] Card anatomy per the mock and the deviations ledger: one-line ellipsized title · "destination · N days" meta · author handle + avatar · cover with a tinted-gradient fallback (a card never collapses on a failed image) · deterministic stub rating · deterministic stub price in the profile's pill shape with the "/ person" suffix · bookmark chip.
- [ ] Bookmark tap fires the existing saved-collection refusal with its analytics; author tap fires the existing profile refusal — no dead clicks anywhere, on either platform (web forks verified, the no-op-Alert family).
- [ ] Card tap opens the existing published itinerary view.
- [ ] Carousel and list scroll positions survive a tab switch away and back.
- [ ] New pure logic lives in Jest-tested modules; typecheck and affected suites green; the surface walked on Metro + device per the work-stage rules.

## Comments
