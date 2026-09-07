# 03: The client speaks trips

**What to build:** the app talks to the trip at its own address. The trip repository is renamed and every one of its functions moves to the new root except the published-page read, which stays on the old projection until the itinerary story; the invitation, join, poll and chat repositories move their trip-rooted functions likewise; the diary repository is content and stays whole. Publishing from the app calls the itinerary module's publish route, which creates the itinerary and answers the object, so the mutation refetches the trip instead of writing the response into its cache; unpublishing calls the itinerary module's route and answers nothing. The four places the app reads the missing-trip refusal learn `TRIP_NOT_FOUND` beside `ITINERARY_NOT_FOUND`, so the itinerary story's flip costs nothing. Query keys and hook names do not change, because the websocket handlers write into those keys. Two structural guards in the layering test's style pin the cutover: no repository names the old root except the diary repository and the published-page read, and every cache write in the trip-events handler goes through an imported key factory rather than a literal key. No screen changes.

**Blocked by:** 01 (The twins on the wire).

**Status:** ready-for-agent

- [ ] Every workspace screen works end to end on the preview build, and the backend log for a full walk shows only `/v1/trips` requests apart from the published-page read and the old diary paths
- [ ] Publish from the app creates the itinerary object and the workspace refetches to show the trip published; unpublish retires it; the post-publish screen still opens on the old projection
- [ ] A missing trip shows the same message whether the server answered `ITINERARY_NOT_FOUND` or `TRIP_NOT_FOUND`, in all four places the app branches on the code
- [ ] Live editing-session and plan-saved frames still update the open workspace and the trips list, proving the cache keys the websocket handlers write into are unchanged
- [ ] The repository unit tests assert the new paths; the two structural guards each carry a case that shows they fire; the full Jest suite is run once before the push, because the structural guards are invisible to the changed-files run
- [ ] Type-check clean; no screen imports a repository it did not import before

## Comments
