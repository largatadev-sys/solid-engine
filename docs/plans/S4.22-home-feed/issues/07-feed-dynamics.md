# 07 — Feed dynamics

**What to build:** The feed's motion, per the mock's behavior cards 4–5. The header hides after ~24px of downward scroll and returns on any upward scroll, the status-bar area staying opaque; the hide/show decision lives in the shared pure module (ticket 05's seam) so it is Jest-covered. The new-posts pill: a cheap focused poll (~60s, first page only — not a notifications system) drops the pill below the header when fresh posts exist while the traveler is scrolled down; tapping it scrolls to top and prepends — the feed never yanks scroll uninvited. Home tab re-tap scrolls smoothly to top when scrolled, triggers refresh when already there. The scroll offset is restored when returning from the published itinerary or any detour.

**Blocked by:** 04 — Home lands on the feed.

**Status:** ready-for-agent

- [ ] Header hides going down past the threshold and returns on the first upward movement, on both walk rungs (spec AC 11).
- [ ] With the feed scrolled down and a fresh share landing (second pool traveler), the pill appears within a poll cycle; tapping it lands at the top with the new post first; the scroll position never moves without the tap (spec AC 12).
- [ ] Home re-tap: scrolled → smooth scroll to top; at top → refresh fires (spec AC 11).
- [ ] Open a card's published itinerary, come back: the feed is where it was left.
- [ ] The hide/show reducer's Jest cases cover the down-threshold, the any-up return, and jitter around the boundary.
