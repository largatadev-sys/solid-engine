# 02: The events, and three cycles broken in place

**What to build:** the trip module's published events, landing in its api while every publisher still lives in the old package — old-world code may name the new world, so this needs no migration window. Five events ship: membership arrived (now carrying the trip's id beside the workspace's), membership ended, trip archived, editing session changed, and plan saved. The sixth the spec named, trip unarchived, is **recorded and not built**: unarchive calls nothing in any other module today, and the conventions build an event where a consumer exists. Its trigger is the first consumer.

Three cycles break. Archiving a trip stops calling the invitation service directly and publishes instead; a listener in invitation voids the pending invitations after commit, in the committing thread, so the archive contract test still reads voided statuses on the response it already reads them on. The editing session's three broadcasts and the plan save's one stop calling the topic class and publish instead; a listener in the transport module broadcasts on the same topic with the same type strings and the same field order, and the old topic class is deleted. Its three type-string constants move to the transport module's existing home for event types, so the two websocket frame tests take a renamed-symbol edit and nothing else — the frames themselves must be byte-identical, and those tests are what prove it.

**Blocked by:** None (can start immediately — parallel with 01).

**Status:** done

- [x] Five event records exist in the trip module's api, each a past-tense fact carrying ids only; trip unarchived is recorded in the spec's comments with its trigger and does not exist in code
- [x] The membership service no longer names the invitation service; the archive contract test passes with no edited assertion
- [x] The listener in invitation runs after commit with fallback execution, and a failed reaction is logged at WARN with ids and not retried
- [x] The old topic class is gone; the transport module's listener broadcasts the editing-session and plan-saved frames on the same topic with the same type strings and field order
- [x] The two websocket frame tests pass with a renamed-symbol edit only, and no other integration test is edited at all
- [x] The trip module's regex guard still passes: no file under it names the transport module

## Comments

**2026-09-08 — built.** Five events in `trip/api`, five publishers cut over, three cycles broken, `TripsTopic` deleted. `TripUnarchived` is not in code, per the ruling.

*The frames are byte-identical, and the two ws tests prove it.* `ws/TripsTopicListener` broadcasts on the same `Topic.ofItinerary(id, TRIPS_CHANNEL)` with the same type strings and the same field order — the frame records are re-declared inside the listener (`itineraryId` first, then `editingSession`) rather than reusing `itinerary.api.LeaseHolderResponse`, which the trip api may not name. The old `AfterCommit.run` wrapper inside the topic is now the listener's `AFTER_COMMIT` phase, so the timing is unchanged too. `EditingSessionEventsIT` and `TripListEventsIT` pass **4/4 and 4/4** with the renamed-symbol edit seam 1 permits: the `TripsTopic` import deleted (both are already `package com.largata.ws`) and `TripsTopic.` → `TripEventTypes.`, where the three constants now live beside `MEMBERSHIP_GRANTED`. Not one assertion string moved.

*The one thing the ticket could not have foreseen, and it failed loudly rather than silently.* `InvitationService.voidPendingInvitations` was `@Transactional(propagation = MANDATORY)` — written to be *part of* the archive transaction. Moving the call to AFTER_COMMIT leaves no transaction to join, so the first run failed the archive contract test with `["PENDING"]` where `["VOIDED"]` was expected, and the listener's WARN carried the cause verbatim: `TransactionRequiredException: No active transaction` from `saveAllAndFlush`. Archive is its **only** caller, so the propagation became `REQUIRES_NEW` — the listener's own transaction, which is what a cross-module reaction needs. **This is a real semantic change and is stated rather than buried:** voiding is no longer atomic with the archive. The archive commits; if voiding then fails, the WARN fires and the invitations stay pending. That is the trade ADR-030 decision 3 asks for — the alternative is invitation back inside membership's transaction, which is the cycle this ticket exists to break. The contract test still reads `VOIDED` on the response because `fallbackExecution` runs the listener in the committing thread before the response returns.

*`MembershipArrived` gains `tripId`* and all three publishers pass it; folding them into one is ticket 03's job, so all three still publish here. `MembershipEnded` moved unchanged. `MembershipService` no longer names `InvitationService` — the field, the constructor parameter and the import are gone.

*Verified:* the two ws frame tests **8/8**, `TripArchiveContractIT` **10/10**, membership + invitation + join **250/250**, guards (`TripModuleBoundaryTest`, `NewWorldBoundaryTest`, `ModuleGuardMetaTest`) **14/14** — no trip file names the transport module. Every one with no edited assertion.

*A build trap worth the line:* two ITs failed with `Unresolved compilation problems: PostgresTestBase cannot be resolved` **after** a green `test-compile`. Incremental compilation had left a 1388-byte error-stub `.class` that `test-compile` then considered up to date, so the failure survived recompiles and read as a broken test base. Deleting the two stubs and recompiling produced 5375 bytes and green. Same family as the two-Maven-runs collision already in CLAUDE.md — check the artifact, not the goal's exit.
