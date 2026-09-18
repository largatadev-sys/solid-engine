# 05: The record survives — deleting a trip leaves its diary and postcards standing, and "archive dominates publish" gets its exact scope and a guard

**What to build:** the second behaviour change, as a vertical slice a traveler can see. When a trip is deleted, its postcards stay on Home and its diary sections stay on the profile — for everyone, author included — and the author can still recaption, place, add and remove photos on them and delete them: *a postcard is not anchored to the trip; it takes data from it.* The feed and both of the profile module's diary paths drop their archived filter on postcards and diary sections (the `diary` module never had one and is unchanged); the author-edit freeze in the postcard service that read the source trip's archive state is deleted and nothing replaces it. Creating a postcard **through the trip** (the trip-rooted route, through the room) takes `Writable` and therefore answers not-found on a deleted trip; creating one **through the diary** keeps working. What the deleted trip *does* take with it is the published page and every link to it, and that rule stays reader-side with its scope made exact: the Itinerary page (whose owner exception drops — a deleted trip's page is gone for its owner too), Discover's lists and counts, the profile's itineraries tab and its counts, the join teaser's closed answer, and the trip link on a postcard card, which must be omitted when the source trip is archived rather than point at a page that 404s. A **coverage guard** in the `AudienceFenceCoverageTest` mould asserts that every public reader of a published Itinerary or of a link to one consults the trip module's archived set, and is sabotage-checked by removing one filter. Spec decisions 5, 6, 15, 16 (v); grilling Q1, Q10, Q17.

**Blocked by:** 03 (the trip-rooted postcard route takes a proof).

**Status:** ready-for-agent

- [ ] After a trip is archived, its postcards are listed on Home and its diary sections on the profile — for the author, a member and a stranger alike — and the api-project `archive-posture.spec.ts`'s *diary list* assertions are amended accordingly and explained on this ticket by Q10
- [ ] The author's recaption, place, add-photo, remove-photo and delete on a postcard whose source trip is archived succeed; the freeze that refused them is deleted with no replacement; an IT covers each act
- [ ] Creating a postcard through the trip-rooted route on an archived trip answers `ITINERARY_NOT_FOUND`; creating one through the diary-rooted route succeeds; both covered by IT
- [ ] The published page of an archived trip answers not-found to its owner as well; Discover's list and count, the profile's itineraries tab and counts, and the join teaser's closed answer behave as today; a postcard card whose source trip is archived carries no itinerary link — each covered at the HTTP seam
- [ ] The coverage guard exists, names its scope as the surfaces above by route rather than by class name, and was **sabotage-checked**: removing one reader's archived-set consult turns it red on the assertion that matters, recorded on this ticket
- [ ] `TripApi.frozen` has no production caller left (deleted in ticket 11)
- [ ] Scoped ITs for `postcard`, `feed`, `profile`, `itinerary`, `discovery`, `join` and the unit suite green; CI green on push

## Comments

*None yet.*
