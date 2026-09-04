# 06 — The contract's first client: the Playwright API cases

**What to build:** the walks from the spec's Testing Decisions, written against the preview container as the only consumer this contract has until S4.40 — the thing that catches a contract shaped without a client (the null-cursor and count-versus-list precedents).

**Blocked by:** 01, 02, 03, 04, 05.

**Status:** done

- [x] **Roles, per the test-identity rule, stated at the top of each spec:** **t1 = private owner, t2 = approved follower, t3 = stranger, t4 = requester, t5 = co-traveler who does not follow.**
- [x] **The follow spec gains the private walk:** flip t1 private → t3 reads t1's profile `200` with `visibility` and `viewerRelation`, gets `PROFILE_PRIVATE` on both lists and the diary tab, and t1's postcards are gone from t3's Home in the `all` scope while t2's Home still shows them → t4 follows and gets `requested` → t1's inbox lists t4 → approve → t4 reads the lists, the diary tab and a postcard → t1 removes t4 → t4 is `none` and refused again → t3 requests, t1 flips public → t3 is `following` and the inbox is empty. t5 never gains anything through the shared trip.
- [x] **The diary and media specs:** a private author's postcard bytes `404` for t3, `200` for t2 and t1; the H1-era note that a co-traveler reads a public postcard `200` gains its twin — a co-traveler of a **private** author who does not follow gets `404`.
- [x] **The publish spec:** `audience: private` → `400 VISIBILITY_RETIRED`; a public publish unchanged; `visibility` on the response is the constant.
- [x] **The discovery spec:** a private-profile owner's published trip is in Discover for t3.
- [x] **Every spec restores t1 to public and clears its requests in `afterAll`** — the pool is shared, and a private t1 left behind fails every other spec's assumptions in ways that read as regressions (the shared-fixture trap).
- [x] **Every new spec destructures `signIn`** (the PL-1/PL-2 fixture trap) and asks the paths the contract names, not paths guessed from the resource names.
- [x] **`npx playwright test --list`** run and its `Total: N tests in M files` line read before the run; the run green against the preview container with a **rebuilt backend** (the fences live there, and the preview image does not rebuild the backend).
