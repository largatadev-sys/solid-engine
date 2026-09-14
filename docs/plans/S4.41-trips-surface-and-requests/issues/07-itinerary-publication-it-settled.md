# 07: `ItineraryPublicationIT` settled — the fifteen against the eight

**What to build:** the quarantine ledger shrinks by the row it could no longer explain. `ItineraryPublicationIT` — fifteen tests, disabled since CM-5 ticket 01 — was to be *"deleted, not repaired"* when ticket 11 sunset `/v1/itineraries/**`. Ticket 11 shipped on 2026-09-10 and the class is still there, because the row's condition never described it: measured at this story's grilling, it already calls `/v1/trips` and `/v1/me` — it was migrated to the trip grammar — so "delete it with the route" names a route it does not use. Its named successor, `PublishedMeansALiveItineraryIT`, holds eight tests. "Redundant" is therefore a claim to check, not assume: diff the fifteen against the eight case by case, delete what the successor genuinely covers, and repair or re-pin on the trip grammar what it does not. The row leaves when the class is gone or green (spec, Further Notes). This touches no product code and no other ticket's files.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] A written diff, on this ticket, of the fifteen quarantined cases against the successor's eight: for each, *covered by* (which successor test) or *not covered* — no case marked covered by resemblance
- [x] Every case the successor covers is deleted from the quarantined class; every case it does not is either repaired to assert the trip grammar's real contract or moved into the successor, and passes
- [x] The `@Disabled` annotation is gone: the class is either deleted or green; no test in the tree carries a skip reason naming ticket 11
- [x] The quarantine ledger row leaves BUILD_STATUS, and the reason it was stale — the exit condition fired and did not describe the class — is one line in the off-epic ledger's S4.41 entry, so the next stale row is recognised faster
- [x] Unit suite and the scoped `itinerary` and `trip` ITs green locally; CI green on push

## The diff: the fifteen, case by case

**What actually made the class false, and it is not the route.** The grilling found it already calls `/v1/trips`, which is true — but the quarantine reason named the wrong cause on both counts. Two things break it, measured on the tree at this ticket:

1. **It reads the dead flag.** Its `publishedFlagOf` helper is `SELECT published FROM itinerary WHERE id = ?`. CM-5 made those columns dead, and the successor's `nothingWritesTheTripsPublishedColumnsAnyMore` exists precisely to pin that nothing writes them. **Eleven of the fifteen assert on that helper**, so they assert a column the product deliberately stopped maintaining — they would fail, and failing is correct.
2. **The publish wire moved.** `publish` now returns an `ItineraryObjectResponse` from `ItineraryController`, not a trip body, so `$.published` / `$.visibility` / `$.state` / `$.days` on the publish response name fields that are not there; and `unpublish` answers **204 with no body**, not 200 with one. **The `/v1/trips/{id}/audience` route does not exist at all** — no `@*Mapping` in the tree matches it.

| # | Quarantined case | Verdict |
|---|---|---|
| 1 | `publishingDefaultsToPublicAndUnpublishingLeavesTheTripCompleted` | **Covered.** The lifecycle half — unpublishing leaves the trip completed — is `PublishedMeansALiveItineraryIT.publishingFencesTheWorkspaceAndRetiringTheItineraryLiftsTheFence` plus `aLiveItineraryPinsTheTripsLifecycleSoReopenIsRefused`. The `$.published` / `$.visibility` half asserts the moved wire and the dead flag. |
| 2 | `onlyACompletedTripCanBePublished` | **Covered.** `ItineraryContractIT.anUncompletedTripRefusesToPublishByName` asserts the same `ITINERARY_NOT_COMPLETE` on the current route. The rung-by-rung walk up is `ItineraryLifecycleIT`. |
| 3 | `aPrivateAudienceIsRefusedByNameAndPublishesNothing` | **Covered, one layer down.** `TripTest.aPrivateAudienceIsRefusedByName_neverSilentlyAcceptedAsPublic` pins `VisibilityRetiredException` for `private` and `PRIVATE`. No route accepts an audience any more, so there is no HTTP surface left to assert it on. |
| 4 | `theAudienceRouteSurvivesAndRefusesTheRetiredValue` | **Not covered, and correctly so — the route is gone.** Nothing in `src/main` maps `/audience`. The case asserts a surface that no longer exists; it cannot be repaired, only deleted. |
| 5 | `aLifecycleStateIsNotAnAudienceYouCanPublishTo` | **Covered, one layer down.** `TripTest.publishingDefaultsToPublicAndRefusesAnAudienceThatIsNotOne` pins `UnknownAudienceException` for `draft`. Same reason as #3: no route takes an audience. |
| 6 | `aPublishedTripPinsItsLifecycleUntilItIsUnpublished` | **Covered.** `PublishedMeansALiveItineraryIT.aLiveItineraryPinsTheTripsLifecycleSoReopenIsRefused` is this case on the trip grammar, and it is the successor test named for it. |
| 7 | `reopenStepsBackOneStateAtATime` | **Covered.** `ItineraryLifecycleIT.reopenWalksBackDownTheLadderAndRefusesAtUpcoming_theFloor` — same ladder, same floor, same refusal. Also `TripTest.reopenStepsBackExactlyOneStateAndClearsTheStampItUndoes` at the unit level. This case was never about publication. |
| 8 | `aPublishedPlanIsFrozen_andUnpublishingThawsIt` | **Covered.** `PublishedMeansALiveItineraryIT.publishingFencesTheWorkspaceAndRetiringTheItineraryLiftsTheFence` is the fence and the thaw; `hardDeletingTheItineraryUnfreezesTheTrip` is the other way out. |
| 9 | `republishingAfterUnpublishingServesTheSameItineraryId` | **Covered.** `PublishedMeansALiveItineraryIT.republishingKeepsTheSameItineraryAndTheTripPointsAtIt` — and it asserts the *stronger* fact, since identity now lives on the Itinerary rather than on the trip id the old case compared. |
| 10 | `publishingIsTheOwnersActAndAMemberIsRefusedBothVerbs` | **Covered.** `ItineraryContractIT.aMemberIsForbiddenByNameAndAStrangerIsMasked`. |
| 11 | `aNonMemberIsMaskedOnBothVerbs` | **Covered.** Same test as #10 — the stranger half. |
| 12 | `aVisitorIsRejectedBeforeAnythingElse` | **Covered.** `ItineraryLifecycleIT.aVisitorIsRejectedBeforeAnythingElse` on the transition endpoints, and the security chain's own ITs on the rest. |
| 13 | `bothVerbsAreActsOnTheTripSoTheArchiveFenceRejectsThem` | **Covered.** `PublishedMeansALiveItineraryIT.anArchivedTripRefusesBothPublishAndUnpublish`. |
| 14 | `anEmptyItineraryPublishesBecauseThereIsNoContentGate` | **Covered.** `PublishedMeansALiveItineraryIT.unpublishingATripThatHasNoItineraryStillSucceeds` and `ItineraryContractIT.publishingMintsTheObjectFromTheFrozenPlanAndTheOldWorldSeesThePublish` between them establish that nothing gates on content. The `$.days.length()` assertion reads the old publish body. |
| 15 | `theTwoAxesAreIndependentFactsOnTheWire_andVisibilityIsAConstantBesideThem` | **Covered.** The independence claim is `PublishedMeansALiveItineraryIT.nothingWritesTheTripsPublishedColumnsAnyMore` plus `aLiveItineraryPinsTheTripsLifecycleSoReopenIsRefused` — publication and lifecycle move separately, and the flag is dead. The `$.visibility` constant is `TripTest`'s. |

**Outcome: fifteen covered or correctly obsolete, zero owed. The class is DELETED.** One case (#4) is obsolete rather than covered — it asserts a route the tree does not serve — and that is the honest verdict, not a gap. No case needed repairing onto the trip grammar, because in every instance the behaviour had already been re-proven there; what the class uniquely held was assertions about the dead flag and the old publish body, and both are things the product deliberately stopped doing.

**Why the row went stale, for the next reader:** the exit condition named an event (*"ticket 11 sunsets the route"*) rather than a property of the class (*"it asserts the dead flag and the old publish body"*). The event fired, nobody re-read the class against it, and the row survived its own trigger. A quarantine row's "what brings it back" should name something checkable in the file, not a milestone elsewhere.

## Comments

*None yet.*
