# 04 — Home lands on the feed

**What to build:** The vertical MVP a founder can hold. The dead Home stub becomes the feed screen and **Home becomes the landing route** — the Trips index leaves "/" (route groups keep every other URL stable, the S4.13 property; every driver that reaches Trips by the root path re-points — spec decision 7). Cards render per the mock in app tokens (spec decision 9): author row, trip line, one photo (the carousel is ticket 05), activity tag, caption clamped at two lines with an inline "more" that expands in place. The trip line and activity tag navigate to the published itinerary and its day when the trip is published, and render un-tinted and inert otherwise (spec decision 3). The feed pages through react-query with `nextCursor` handed straight in (`null` = exhausted, the S3.1 lesson), two skeleton cards while loading, the terminal "caught up" card with the follow-free copy (recorded deviation), an inline retry row on page failure, and pull-to-refresh that prepends and toasts when nothing is new. Media arrives through the authenticated media path.

**Blocked by:** 02 — The feed on the wire.

**Status:** ready-for-agent

- [ ] Cold start lands on Home showing real shared postcards; a second pool traveler's share appears after pull-to-refresh (spec AC 1's mobile half, both rungs).
- [ ] Trip line: a published trip's card navigates to the published itinerary; an unpublished trip's card renders the line un-tinted and taps do nothing (spec AC 5).
- [ ] Caption clamps at two lines and expands in place — the card grows, no navigation.
- [ ] Pages walk to the terminal card with skeletons in between; a failed page shows the inline retry row, not a full-screen error; pull-to-refresh prepends and toasts "caught up" when nothing is new (spec ACs 7, 12's refresh half).
- [ ] The driver watches every feed photo arrive bearer-authenticated — no ANON GETs (the S3.3 tell).
- [ ] Trips remains fully reachable from its tab; nothing else's URL moved (`tsc` + the re-pointed walks green).
