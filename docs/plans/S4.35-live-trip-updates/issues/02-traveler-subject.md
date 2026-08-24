# 02 — The `traveler:{id}` subject

**What to build:** a traveler's app opens one subscription and the server knows, from that moment, every trip whose events should reach it. No traveler-visible surface changes here — this is the subject, its authorization and its bookkeeping, proven by ITs (the WS-1 shape).

**Blocked by:** 01.

**Status:** needs-triage

- [ ] `Topic.parse` accepts a two-segment `traveler:{uuid}` form beside `debug:echo` and the three-segment `itinerary:{uuid}:{channel}`. **No channel segment** — the client subscribes to all of it, so a subset has no consumer.
- [ ] Authorization is **identity**, not membership: you may subscribe to your own and to nothing else.
- [ ] **The masking is exact.** A garbage id, a well-formed id belonging to nobody, and a well-formed id belonging to somebody else must be **indistinguishable** in the response. The parser is where masking begins; an IT asserts all three answer identically, and it must be able to fail (assert the discriminating code, never a bare status).
- [ ] On subscribe: the guard runs, the traveler's memberships resolve in **one query**, and the session is registered under each of their trip topics in `SessionRegistry`. **Zero queries per event afterwards** — asking "who are this trip's members?" per broadcast would put a read back on the write path this design exists to keep clean.
- [ ] **Admission mirrors eviction.** `MembershipEvictionListener` already removes registrations after a membership delete commits; its mirror adds them after a membership **grant** commits. Order matters and is an AC: the registration lands **before** the granting event is broadcast, or the one traveler the event is about is the one traveler who does not receive it.
- [ ] ITs on the eviction family extended to the new subject: a removed member's session stops receiving that trip's events; a non-member never receives them.
- [ ] Prod/dev profile invariants still hold — no new bean escapes its profile, `debug:echo` still absent in prod.
