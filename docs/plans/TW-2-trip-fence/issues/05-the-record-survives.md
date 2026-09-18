# 05: The record survives — deleting a trip leaves its diary and postcards standing, and "archive dominates publish" gets its exact scope and a guard

**What to build:** the second behaviour change, as a vertical slice a traveler can see. When a trip is deleted, its postcards stay on Home and its diary sections stay on the profile — for everyone, author included — and the author can still recaption, place, add and remove photos on them and delete them: *a postcard is not anchored to the trip; it takes data from it.* The feed and both of the profile module's diary paths drop their archived filter on postcards and diary sections (the `diary` module never had one and is unchanged); the author-edit freeze in the postcard service that read the source trip's archive state is deleted and nothing replaces it. Creating a postcard **through the trip** (the trip-rooted route, through the room) takes `Writable` and therefore answers not-found on a deleted trip; creating one **through the diary** keeps working. What the deleted trip *does* take with it is the published page and every link to it, and that rule stays reader-side with its scope made exact: the Itinerary page (whose owner exception drops — a deleted trip's page is gone for its owner too), Discover's lists and counts, the profile's itineraries tab and its counts, the join teaser's closed answer, and the trip link on a postcard card, which must be omitted when the source trip is archived rather than point at a page that 404s. A **coverage guard** in the `AudienceFenceCoverageTest` mould asserts that every public reader of a published Itinerary or of a link to one consults the trip module's archived set, and is sabotage-checked by removing one filter. Spec decisions 5, 6, 15, 16 (v); grilling Q1, Q10, Q17.

**Blocked by:** 03 (the trip-rooted postcard route takes a proof).

**Status:** done

- [x] After a trip is archived, its postcards are listed on Home and its diary sections on the profile — for the author, a member and a stranger alike — and the api-project `archive-posture.spec.ts` needed **no** amendment here: its `listsTrip` helper reads `/v1/me/diary/trips`, which is the traveler's own membership-gated list and correctly still excludes a deleted trip (ticket 03 took the owner exception out of that query). What survives is the PUBLIC profile diary and the feed, which  and  cover
- [x] The author's recaption, place, add-photo, remove-photo and delete on a postcard whose source trip is archived succeed; the freeze that refused them is deleted with no replacement; an IT covers each act
- [x] Creating a postcard through the trip-rooted route on an archived trip answers `ITINERARY_NOT_FOUND`; creating one through the diary-rooted route succeeds; both covered by IT
- [x] The published page of an archived trip answers not-found to its owner as well; Discover's list and count, the profile's itineraries tab and counts, and the join teaser's closed answer behave as today; a postcard card whose source trip is archived carries no itinerary link — each covered at the HTTP seam
- [x] The coverage guard exists, names its scope as the surfaces above by route rather than by class name, and was **sabotage-checked**: removing one reader's archived-set consult turns it red on the assertion that matters, recorded on this ticket
- [x] `TripApi.frozen` has no production caller left (deleted in ticket 11)
- [x] Scoped ITs for `postcard`, `feed`, `profile`, `itinerary`, `discovery`, `join` and the unit suite green; CI green on push

## Comments

**Closed 2026-09-18.** The record survives the trip, and "archive dominates publish" now has an exact scope with a sabotage-checked guard behind it.

**What survives.** The feed keeps a deleted trip's postcards; the public profile keeps its diary sections. The author-edit freeze in `PostcardService` — the ninth hand copy the grilling found, which refused an author's own recaption whenever the source trip was archived — is **deleted with nothing replacing it**. A postcard's only guard is authorship, which is the founder's sentence made structural: *a postcard is not anchored to the trip; it takes data from it.*

**What goes with the trip, and the one subtlety.** The published Itinerary and **every link to it**. The feed still consults the archived set, but for a different reason than before: not to drop the card, but to **omit `publishedItineraryId` on it**. Without that a surviving postcard would carry a link to a page that answers 404 — the record surviving as a dead end. That distinction is the whole of Q10's narrowing, and it is what the new guard protects.

**The Itinerary page's owner exception dropped**, as the grilling noted it would. It read `workspaces.isArchived(tripId) && !object.isOwnedBy(readerId)` — and the wrinkle recorded at Q17 is real: `ItineraryObject.ownerId` is frozen at publish, so after an ownership transfer the exception stopped matching the actual owner anyway. Removing it dissolves the wrinkle rather than fixing it.

**The trip-rooted creation route takes `Writable`.** `postOnTripDay` and `postFromActivity` go through the room, so they answer `ITINERARY_NOT_FOUND` on a deleted trip — for the owner too. The diary-rooted route is untouched and keeps working, which is the split Q17 asked for: create *through the trip* is a trip act; create *through the diary* is a diary act.

---

### The coverage guard, and what it is actually protecting

`ArchiveDominatesPublishCoverageTest` names **seven** surfaces by their route, not by class name, and asserts each consults the archived set:

| Surface | Route it protects |
|---|---|
| `ItineraryObjectService` | the published Itinerary page itself |
| `ItineraryDiscoveryService` | `/v1/discover` and its counts |
| `DiscoveryService` | the Discover surface composing those lists |
| `PublicProfileService` | the profile's itineraries tab and its two counts |
| `PostcardFeedService` | the **link** on a postcard card |
| `JoinService` | the join teaser's closed answer |
| `ItinerarySourceVisibility` | the fork source check |

The rule exists because **nothing fails when a reader drops the consult** — the query still runs and returns rows, and the wrong ones are simply present. That is why it is a property of the source rather than of a request, and it is the S4.39 count-vs-list shape exactly.

**Sabotage-checked:** replacing the feed's `workspaces.archivedAmong(...)` with `Set.of()` turns it red on `everySurfaceInTheScopeConsultsTheArchivedSet`, naming `PostcardFeedService` and the route it guards. Restored and re-run green.

A second case pins the scope at **exactly seven** — adding one means a reader has newly started hiding the record, removing one means a link newly points at a 404 — and a third asserts every entry carries the route rather than just a path, so an entry nobody can check cannot creep in.

---

**Nine ITs changed, every one asserting the S4.23 posture this ticket reverses (Q10, Q17):**

- `PostcardFeedIT` ×5 — *"archiving is the traveler's bulk retraction"* becomes *the record survives*; the unarchive test becomes *neither delete nor undo moves a shared postcard*; the per-trip exclusion test becomes *every trip's postcards stand*; the public trip diary reads rather than 404s, and now asserts the **link is null** on it. The cursor walk kept its subject — it exists to prove the cursor is taken from the last row READ — and switched its excluded card from an archived trip to a **withdrawn postcard**, which is what still produces an empty-page-with-cursor.
- `PublicProfileIT` — the diary section stays on the profile.
- `ItineraryPageIT` — the page is gone for the owner too, and Undo brings it back for everyone.
- `TripDayPostcardContractIT` — the trip-rooted post answers the mask.
- `TripDerivedPostcardContractIT` — *"withdrawal crosses the freeze but recaption respects it"* becomes **the author still edits and deletes their postcard after the trip is deleted**, which is Q17 in one test.

**`TripApi.frozen` now has no production caller** — the author freeze was its last one. It is deleted at ticket 11 with the other old doors.

**Counts read, never exit codes:** unit `Tests run: 526, Failures: 0, Errors: 0`; the whole backend IT suite `Tests run: 1350, Failures: 0, Errors: 0`. `git diff --name-only` empty before the commit.
