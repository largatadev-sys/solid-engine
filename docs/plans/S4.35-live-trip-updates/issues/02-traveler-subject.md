# 02 — The `traveler:{id}` subject

**What to build:** a traveler's app opens one subscription and the server knows, from that moment, every trip whose events should reach it. No traveler-visible surface changes here — this is the subject, its authorization and its bookkeeping, proven by ITs (the WS-1 shape).

**Blocked by:** 01.

**Status:** ready-for-agent

- [x] `Topic.parse` accepts a two-segment `traveler:{uuid}` form beside `debug:echo` and the three-segment `itinerary:{uuid}:{channel}`. **No channel segment** — the client subscribes to all of it, so a subset has no consumer.
- [x] Authorization is **identity**, not membership: you may subscribe to your own and to nothing else.
- [x] **The masking is exact.** A garbage id, a well-formed id belonging to nobody, and a well-formed id belonging to somebody else must be **indistinguishable** in the response. The parser is where masking begins; an IT asserts all three answer identically, and it must be able to fail (assert the discriminating code, never a bare status).
- [x] On subscribe: the guard runs, the traveler's memberships resolve in **one query**, and the session is registered under each of their trip topics in `SessionRegistry`. **Zero queries per event afterwards** — asking "who are this trip's members?" per broadcast would put a read back on the write path this design exists to keep clean.
- [x] **Admission mirrors eviction.** `MembershipEvictionListener` already removes registrations after a membership delete commits; its mirror adds them after a membership **grant** commits. Order matters and is an AC: the registration lands **before** the granting event is broadcast, or the one traveler the event is about is the one traveler who does not receive it.
- [x] ITs on the eviction family extended to the new subject: a removed member's session stops receiving that trip's events; a non-member never receives them.
- [x] Prod/dev profile invariants still hold — no new bean escapes its profile, `debug:echo` still absent in prod.

## Comments

**2026-08-25, implementation — closed.** `TopicTest` (15 pure tests, 5 new) and `TravelerTopicIT` (7 tests) green; the WS + chat sweep is **66 ITs green**, `ProdWebSocketPostureIT` and `DevOriginPostureIT` included.

**Sabotage-verified twice, each landing proven by grep before the run was believed** (S4.30's lesson): replacing the identity check with `return true` turns the masking test red, and deleting the admission registration turns the newly-admitted test red with *"No frame arrived within 5s"*. Each sabotage was caught by exactly one test, which is the shape worth having.

**Three things found while building that the ticket did not predict.**

1. **`Topic` was a two-component record `(itinerary, channel)`, and a traveler subject cannot be expressed by reusing either field.** Putting a traveler id in `itinerary` would make `Topic.ofTraveler(x)` **equal** to `Topic.ofItinerary(x, …)` for a colliding uuid — one registry key for two meanings. The record now carries `(itinerary, traveler, channel)` with a test pinning that the two are never equal even when they share a uuid. No call site constructed `Topic` directly, so the widening touched nothing else.
2. **The masking assertion had to be loosened, and the loosening is the correct reading rather than a concession.** The refusal frames for a foreign id and a nobody id differ **only in the echoed `topic` field** — which is the string the client itself sent, so it discloses nothing. The test now normalises that one field and compares the rest byte for byte, which is strictly stronger than a `contains` check and still fails on the sabotage above.
3. **`MembershipArrived` carries a `workspaceId`, NOT an `itineraryId`** — they are different uuids, and the registration keys on the itinerary. `WorkspaceService.itineraryIdsByWorkspace` maps between them; the listener returns quietly if the mapping is absent rather than registering under a null topic. Caught by reading the publisher before writing the listener, not by a failing test — a wrong assumption here would have registered every admission under a topic nothing broadcasts to, and every test asserting *delivery* would still have passed.

**ADR-002 respected:** the `ws` module reaches `workspace` only through `WorkspaceService`'s public methods (`itineraryIdsInSightOf`, `itineraryIdsByWorkspace`) — never the repository, which is package-private anyway. `itineraryIdsInSightOf` is the single query the fan-in needs and V11's `membership_traveler_idx` serves it.

**One thing tickets 03–06 inherit:** the fan-in registers under `itinerary:{id}:trips` — `TopicSubscriptions.TRIPS_CHANNEL`. Every event in the spec's table must be broadcast on **that** channel to reach a traveler-topic subscriber; broadcasting on `:chat` reaches only the explicit chat subscribers, which is the existing S4.10 behaviour and deliberately unchanged.
