# 06 — The Travelers tab, and the audience rule proved

**What to build:** the roster reflects joins and departures while the tab is open, and a new join request arrives in the owner's queue as it is made — **while a non-owner member on the same tab receives the frame and issues no request at all.** This is the contentless-signal design's proving case.

**Blocked by:** 03.

**Status:** needs-triage

- [ ] `roster.changed` is a **signal**; the client refetches members. Membership grant and removal both raise it.
- [ ] `join-requests.changed` is a **signal that carries no payload whatsoever**. The queue is owner-only (`useJoinRequests` is enabled for the owner alone), so a payload on a trip-wide frame would tell ordinary members what REST withholds. **An IT asserts the frame's payload is empty** — this is the rule ADR-030's amendment adds, and a test that only checks delivery would pass while the rule is broken.
- [ ] **The non-owner assertion, and it must state its own failure:** with an owner and a non-owner member both on the tab, a new join request produces **one** refetch — the owner's. Establish the owner's request first, then assert the absence of the member's; an absence with no established presence proves nothing.
- [ ] No owner-scoped channel and no per-subscriber filtering at fan-out. Ownership transfer must not require moving any registration — if the implementation drifts toward one, the audience rule has been abandoned and the ADR amendment is wrong.
- [ ] Playwright, three contexts (owner, member, requester) for the queue walk; two for the roster walk.
