# 01: The trip's new face

**What to build:** the four new peer modules exist (trip, diary, postcard, publication) and the first of them breathes: a signed-in traveler reads a trip through the new grammar and gets the truth the old world holds — same records, new files. The frozen boundary becomes enforceable, not promised.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] The four new top-level modules exist with the house module anatomy, and no old-world file is modified anywhere on the branch
- [x] A signed-in member reads a trip through the new grammar and gets the facts the old listing serves (identity, title, lifecycle, published state, viewer role); the data comes from the existing trip records — no new trip table exists
- [x] A non-member's read answers the masked not-found; an unauthenticated read answers the standard unauthenticated refusal
- [x] The module-boundary guard test fails the build when any new-world file imports an old-world package — sabotage-checked with a deliberate bad import before trusting it
- [x] Every existing suite passes untouched

## Comments
