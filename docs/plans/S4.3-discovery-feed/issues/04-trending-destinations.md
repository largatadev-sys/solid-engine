# 04 — Trending destinations rail

**Status:** ready-for-agent
**Blocked by:** 03.

**What to build:** The landing's first rail (spec decision 6). A traveler sees where trips were recently published — destinations ranked by publish count over the trailing 30 days, each card wearing a real cover from that destination's itineraries — and a tap drops them into the results screen pre-filtered to that destination. This ticket also lands the `destination` filter on the list endpoint and makes the results route deep-linkable.

## Acceptance criteria

- [ ] The trending endpoint ranks normalized destination strings (trimmed, case-folded grouping) by count of itineraries **published** in the trailing 30 days — creations, private, unpublished, and archived trips provably excluded; window boundary covered by an IT.
- [ ] A legacy multi-destination itinerary counts toward each of its entries; display casing is the most recently published occurrence's original spelling.
- [ ] Each trending card carries the destination's newest published cover; absent covers fall back to the tinted gradient client-side.
- [ ] The rail renders with free horizontal scroll and peek per the mock; "N trips" per card.
- [ ] Tapping a destination opens the results screen filtered to it; the `destination` param lands on the list endpoint with ITs; the results route carries its state in params (a shared or reopened link restores the same filtered view).
- [ ] Landing sections fail and retry independently — one dead rail never blanks the other.
- [ ] Both sections empty → the honest full-screen empty state (final shape).
- [ ] Typecheck + affected suites green; the surface walked per work-stage rules.

## Comments
