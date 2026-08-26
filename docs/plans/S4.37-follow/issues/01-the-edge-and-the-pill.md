# 01 — The edge, end to end: table, endpoints, counts, and the pill goes real

**What to build:** the tracer bullet. One `follow` table, the idempotent follow/unfollow pair, the profile reads growing counts and viewer-relative flags, and the S4.36 pill trading its coming-soon prompt for C1's optimistic state machine — so by the end of this ticket one traveler genuinely follows another and both profiles say so.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] **V41 (additive):** `follow(follower_id, followee_id, created_at)` — PK on the pair, FKs to `traveler`, `CHECK (follower_id <> followee_id)`, and the index the follower-list read needs. No other table touched.
- [x] **`POST /v1/travelers/{travelerId}/follow`** and **`DELETE /v1/travelers/{travelerId}/follow`**, both 204 and both idempotent (insert `ON CONFLICT DO NOTHING`; delete deletes nothing quietly). Unknown or un-onboarded target answers the profile-read 404; self-follow refused 4xx at the endpoint *and* impossible at the constraint — the IT proves both layers independently.
- [x] **`PublicProfileResponse` gains `followersCount`, `followingCount`, `followedByViewer`, `followsViewer`** (additive); the own-profile stats read gains the two counts. Counts computed, not denormalized (MVP dial — spec Mechanics).
- [x] **The pill per C1/C2/M1:** optimistic flip to Following (neutral outline + leading check), background request, failure reverts + dark toast **"Couldn't follow @handle"** (2.5s, bottom-anchored); tapping Following unfollows confirm-free, same pattern; taps during flight ignored. No width jump; press scale 0.96; Reduce Motion per M4.
- [x] **The Follows-you chip per C5:** renders from `followsViewer` beside the meta line — read-only, never on the own profile, never a tap target.
- [x] **The em dashes retire:** both stats rows render the real counts — the S4.36 tests that pinned the unnumbered cells flip to assert the fed values, and the awaiting-count dash constant loses its production callers and goes with them.
- [x] **`follow_created` / `follow_removed` emit server-side, after commit, ids only** (P3) — asserted in an IT. The client-side `follow_tapped` `track()` call and the coming-soon prompt wiring are deleted.
- [x] Mobile calls go through a typed repository on `apiClient` (ADR-001); no raw fetch anywhere.
