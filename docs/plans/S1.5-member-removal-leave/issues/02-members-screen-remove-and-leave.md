# 02 — Members screen: Remove and Leave trip

**What to build:** the two doors on the members screen. The owner sees Remove on every row but their own, confirms, and the roster updates. A non-owner member sees Leave trip, confirms, lands back on My Trips, and the trip is gone from their app. The owner sees no Leave control at all — their exit is S1.6's transfer, and the screen doesn't advertise dead ends (its existing pattern).

1. **Both doors through `confirmDestructive`** (the platform-forked helper — native dialog / web `window.confirm`, shared wording module; the S1.3 `Alert.alert`-is-a-no-op-on-web discipline). Leave's wording says what it costs: losing access to the trip's plan.
2. **One repository call** for both doors — `DELETE …/members/{travelerId}` through the typed `apiClient` (ADR-001, no raw fetch); the door is decided by which traveler id goes in the path.
3. **After remove:** invalidate the members query — the roster refreshes without the removed row.
4. **After leave:** navigate to My Trips and drop the departed trip's queries from the cache — no lingering screens pointed at a trip that will 404.
5. **Error handling branches on the envelope `code`** (the screen's existing pattern): `OWNER_CANNOT_LEAVE` should be unreachable from this UI (no control exists) but maps to honest copy if it ever arrives; anything else falls back to the generic retry message.
6. **Eviction wording check (spec §5):** the existing `ITINERARY_NOT_FOUND` missing state is the removed member's landing — verify its copy reads sensibly for eviction (covers deletion and removal without distinguishing them). Adjust copy only; build no new eviction UX.
7. **Tests:** Jest for the role-gating (owner sees Remove-not-self and no Leave; member sees Leave only), the confirm-then-mutate flow on both doors, and the leave navigation + cache drop.

**Blocked by:** 01 — the endpoint this screen calls.

**Status:** done

- [x] Owner: Remove on every non-self row, behind the confirm; roster updates on success
- [x] Member: Leave trip behind the confirm; success lands on My Trips with the trip gone from the list and cache
- [x] Owner sees no Leave control; member sees no Remove on others (Jest pins the gating)
- [x] Both dialogs fire on native *and* web (the web fork is real, not the silent no-op)
- [x] Missing-state copy reads sensibly for an evicted member (spec §5 wording check)

## Comments

**2026-07-27 — implemented.**

1. **`confirmDestructive` was generalised, not duplicated.** Its wording was hardcoded to *"Delete X? / This cannot be undone."* with a `Delete` button — wrong for both new doors. Both platform forks now export `confirmWith(wording, onConfirm)`, with `confirmDestructive` delegating; the S1.3 call sites (days, activities) are untouched. `confirmLabel` lives in the shared wording module **even though `window.confirm` cannot render it**, so the word stays identical across platforms where the browser will not show it and the two dialogs cannot diverge in what they claim. Both forks annotate against a shared `ConfirmWith` type — `moduleSuffixes` resolves imports to `.native` only, so nothing else would catch drift between them.

2. **The cache asymmetry is the load-bearing decision** (`onMembershipEnded`): removing somebody else *invalidates* the roster and touches nothing else; leaving *removes* every cached answer about the trip. Invalidation would leave the plan renderable from cache on a still-mounted screen while every refetch 404s behind it — data on screen the server has already refused to serve again. `departureQueries.test.ts` pins both, plus that a departure touches no other trip's cache.

3. **Item 6 turned into a copy change, not just a check.** *"Trip not found / No such itinerary."* asserted non-existence — false for a just-removed member, and it reads as data loss rather than a membership change. Now a shared `missingItineraryMessage` (*"Trip unavailable / This trip either no longer exists or you don't have access to it."*), extracted because two screens showed it and duplicated copy drifts. Naming **both** possibilities is what keeps Artifact 03's mask intact — one sentence for both causes — while dropping the wrong claim. A test pins that it asserts neither cause.

4. **Verified beyond Jest, per the S1.3 lesson.** Jest resolves the `.native` fork, so it cannot see a web regression at all; the web dialog was proven by driving the preview container with `window.confirm` intercepted (ticket 03), and the native one by a screenshot of the real Android dialog naming the member. Device also confirmed the gating that Jest asserts: the owner sees `Remove` on the member's row, none on their own, and no Leave control anywhere.
