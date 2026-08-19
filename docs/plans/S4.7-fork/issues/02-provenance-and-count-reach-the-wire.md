# 02 — Provenance and the count reach the wire

**What to build:** a client can render fork provenance and fork popularity without a discovery tap: the itinerary read model and the published projection each carry a nullable `forkedFrom` block (source itinerary id, source owner's handle, and a read-time `sourceVisible` boolean computed by the fence), and the published projection carries `forkCount`. All additive within /v1.

**Blocked by:** 01 — Fork lands at the API.

**Status:** done

- [x] A forked trip's itinerary read model carries `forkedFrom`; a scratch trip's carries null — existing clients are unaffected (additive only)
- [x] The published projection of a forked itinerary carries the same `forkedFrom` block, so attribution survives onto the fork's public face
- [x] `ownerHandle` resolves **live** from the source's current owner — nullable when the author has no handle; never stored as copied text; survives author rename and anonymization by construction
- [x] `sourceVisible` is computed by the audience fence at read time: true while the source is visible to the public surface, false once the source is unpublished or archived — ITs flip the source's state and watch the boolean follow
- [x] `forkCount` counts Fork Relationship rows naming the itinerary as source: increments at fork creation, unchanged by what the copy later becomes, unchanged by source unpublish/republish, never decrements
- [x] Full backend IT suite green, counts read from the summary

## Comments
