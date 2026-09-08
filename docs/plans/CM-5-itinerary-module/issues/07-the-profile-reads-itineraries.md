# 07: The profile reads Itineraries

**What to build:** a traveler's profile counts and shows their live Itineraries. A `profile` composition module owns the traveler profile route, its follower and following lists, and the caller's own profile stats and showcase, with no table and no SQL, classified under the rule at birth. The header and the two lists come from identity; the published count, the destination count and the showcase come from the itinerary module's owner-scoped reads; showcase cards carry the Itinerary's id. Per-object lists stay where they are, the diaries list in the diary module being the precedent. The per-trip diary list route, which is old-diary content, moves to the old diary controllers on its unchanged path until ticket 09 relocates them. The old profile classes and their tests are replaced in this ticket, with the assertion lines listed.

**Blocked by:** 03 (The client opens Itineraries by their own id).

**Status:** ready-for-agent

- [ ] A `profile` module exists with its allowlist guard, is listed under the rule, and owns no table and no query of its own
- [ ] The profile header, followers and following answer from identity as today; the published count, destination count and showcase answer from live Itineraries and agree with Discover
- [ ] Showcase cards carry the Itinerary's id and the app opens them by it
- [ ] The per-trip diary list route answers unchanged from the old diary controllers
- [ ] The old profile classes are deleted in this ticket; the contract tests live in the new module; every assertion line carried over is listed in this ticket's comments
- [ ] Playwright, both lanes: a profile's counts and showcase, own and someone else's, public and private
