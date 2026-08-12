# 02 — The feed on the wire

**What to build:** A stranger reads the feed entirely over the API. One cursor-paged read, open to any authenticated traveler with no membership anywhere in it (the S4.1 guard-bypass projection pattern), ordered by shared-time descending with a stable tiebreak, in the standard `{items, nextCursor}` shape (spec decision 5). Each item is the scrubbed card projection: author identity (name, avatar), trip name, snapshot day label, snapshot activity title, caption, the entry's photos, time-since-shared — and, only when the trip is published, the reference the trip line navigates by; never the roster, absolute dates, lifecycle state, or plan content (spec decision 3, the INV-2 discipline).

**Blocked by:** 01 — The share on the wire.

**Status:** ready-for-agent

- [ ] A traveler who shares no trip with the author reads the feed and receives the shared entry; unshared entries never appear (spec AC 1's wire half).
- [ ] Retro-share ordering: sharing an old entry surfaces it at the top — the order is shared-time, not posted-time (spec AC 2).
- [ ] Absence assertions on the projection: no roster, no absolute dates, no lifecycle state on the wire (spec AC 6).
- [ ] The cursor walks to exhaustion ending in a null `nextCursor`, and a repeat-cursor guard keeps a server bug degrading instead of spinning (spec AC 7's wire half).
- [ ] Unsharing and deleting both remove the entry from the feed on the next fetch (spec ACs 4, 13).
- [ ] A card from an unpublished trip carries name + day label but no navigable trip reference; the same card gains it once the trip publishes (spec AC 5's wire half).
