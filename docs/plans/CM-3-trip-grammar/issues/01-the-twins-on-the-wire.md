# 01: The twins on the wire

**What to build:** every workspace route answers at a second address under `/v1/trips`, served by the same handler as its `/v1/itineraries` original, so the two addresses cannot differ. Each twinned controller declares both roots at class level; the old trip controller splits into a twinned class and an old-only class holding the five routes that get no twin (publish, unpublish, audience, finish-planning, fork), so the class-level pair can apply cleanly; poll, chat, join and invitation add their second root to the trip-rooted routes they own. The trip's own read at `/v1/trips/{id}` answers the full record the old detail answers, and CM-1's dark ten-field read retires with its contract test rewritten for the new shape. Nothing moves, nothing on the old root changes.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Each of the 47 twinned routes answers at both roots with the same status, body and refusal, checkable by two requests and a diff; the 8 old diary-entry routes, publish, unpublish, audience, finish-planning and fork answer at the old root only
- [ ] `GET /v1/trips/{id}` answers the old detail's full record (thirty fields including the plan tree, `viewerRole` null as on the old detail); a non-member gets `ITINERARY_NOT_FOUND` on both roots
- [ ] `DELETE /v1/trips/{id}` still answers at the new root only; no `DELETE /v1/itineraries/{id}` exists
- [ ] The itinerary module's `POST /v1/trips/{id}/publish` and `/unpublish` are untouched and still answer the object and `204`
- [ ] Every pre-existing old-root integration test passes without an edited assertion; the one rewritten test is CM-1's dark read contract, now asserting the full record
- [ ] The path-variable name is the same on both patterns of every pair, so no handler resolves differently by root

## Comments

**Amended at the build (2026-09-07): AC4 did not hold, deliberately.**

It read *"The itinerary module's `POST /v1/trips/{id}/publish` and `/unpublish` are untouched"*. Both were changed, and both changes are the story's most valuable findings — each a difference between two **acts** wearing one verb, which the twin and equivalence proofs are blind to by construction because they compare two **addresses** of one handler.

- **Unpublish** required a live itinerary object and answered `404 PUBLICATION_NOT_FOUND` without one, so no trip published by the old flag-flip could be unpublished (locally: 295 published trips, 5 live objects). Founder ruling, taken as a publish/visibility stop rule: clear the flag either way. Recorded as ADR-037's first amendment.
- **Publish** was missing the editing-session guard the old route has always enforced, so it would have let an owner freeze a plan another member was editing. Found by code review, closed with the same `409 EDIT_LOCKED` and holder-naming message the old route answers.

**The route census also moved:** 62 old-root mappings and 49 twins, not the spec's 60 and 47. The excluded set is unchanged and is the one the grilling agreed.
