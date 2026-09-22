# 14: The threshold replaces the proofs

**What to build:** the mechanism change rounds 5 and 6 of the grilling decided (2026-09-19 → 22), on this branch, before PR #82 merges — because merging a mechanism already decided against is shipping debt on purpose. The **decisions do not move**: ADR-040, V58, the relocation into `trip`, the record surviving the trip, Undo. What moves is *where the two closing rules are applied*. Today the fence mints **proofs** — five nested types with private constructors — and 66 signatures carry them, every one unwrapping the proof on its first line and proceeding as before TW-2; seven are minted and discarded, `Unfrozen` has no consumer, and on those paths the fence is again a line you can delete with nothing going red. After this ticket the fence is **two `void` rules applied once at the Threshold** — one `HandlerInterceptor` on `/v1/trips/{itineraryId}` and everything beneath it — which resolves the `Membership` through the guard, applies the not-found mask for a missing membership or a closed room, reads the handler's **door**, and hands the `Membership` to the handler through `@CurrentMember` (the `@CurrentTraveler` mechanism). Services take `Membership` again; owner-only services keep `Owner`. The room's types publish as the **`trip.room`** named interface so a collaboration module depends on the room and never on the plan. **Publishing no longer closes chat** (Q30 — a product ruling, the one deliberate wire loosening). **Only Undo reaches a closed room** (Q29). Grilling rounds 5–6, Q18–Q31; glossary rows *Room*, *Fence*, *Door*, *Threshold*.

**Blocked by:** 03, 04, 05, 06, 07, 08, 09, 10, 11, 12 — every code ticket; this rewrites their mechanism.

**Status:** open

## Commit plan — docs first, then one commit per module, deletions last

1. `docs(trip): TW-2 ticket 14 — rounds 5–6 on the record, the glossary's four rows, the amendments` *(this ticket, the grilling record, the glossary, the spec and design marks, ADR-011/018/039/040, epic map line 187)*
2. `feat(trip): TW-2 ticket 14 — the Threshold, @CurrentMember and @Door, unit-tested, wired to nothing yet` *(additive; every existing route still mints proofs; the interceptor is registered but no handler under it has a door, so it must be registered with default-deny OFF until step 4 — or registered on a branch-local path; the ticket's Comments record which)*
3. `refactor(trip): TW-2 ticket 14 — trip.room: the room's types move out of trip.api, allowlists follow` *(a pure move; zero assertions change; every consumer's allowlist names `trip.room..`)*
4. `refactor(trip): TW-2 ticket 14 — trip takes the threshold` *(plan, cover, dump, editing, ownership, trip; `unarchive` gains `@ReachesClosedRoom`; default-deny ON for the scope)*
5. `refactor(chat): TW-2 ticket 14 — chat takes the threshold, and publishing no longer closes it` *(the named fifth shape: 2 ITs + 2 specs flip)*
6. `refactor(poll): …` · 7. `refactor(postcard): …` · 8. `refactor(invitation): …` · 9. `refactor(join): …` · 10. `refactor(itinerary): …`
11. `refactor(trip): TW-2 ticket 14 — the proofs are deleted, and four guards replace two` *(the five proof classes, `Standing`, `TripFence.owner`, `IllegalWorkspaceTransitionException.alreadyArchived`, `ChatClosedException`; the two retired guards; the four new ones, each sabotage-checked)*
12. `docs(trip): TW-2 ticket 14 — the gate re-read: assertion-line diff, counts, the C4 and membership artifacts updated`

## Acceptance criteria

**The threshold (commit 2)**
- [ ] `WorkspaceThreshold` (a `HandlerInterceptor` in `trip/room/`) matches exactly `/v1/trips/{itineraryId}` and `/v1/trips/{itineraryId}/**` and nothing else — pinned by a unit test that feeds it the routes of `/v1/trips` (list, create), `/v1/itineraries/{objectId}`, `/v1/itineraries/{id}/diary/entries`, `/v1/join/{token}` and asserts none are matched
- [ ] For every matched request, GET included: `guard.requireMember(traveler, itineraryId)` (mask on none) → `fence.requireOpenRoom(itineraryId)` (mask on a closed room, skipped only under `@ReachesClosedRoom`) → the handler's `@Door` read → `fence.requireUnfrozen(itineraryId, door.refusal())` for `EDITABLE` / `MEMBERSHIP_MUTABLE` → the `Membership` stored as a request attribute. Order pinned by test: a non-member on a deleted trip hears the mask, an owner on a deleted trip hears the mask, a member on a published trip through an `EDITABLE` door hears `ITINERARY_PUBLISHED`
- [ ] `@CurrentMember Membership` resolves from the attribute (`HandlerMethodArgumentResolver`, registered beside `CurrentTravelerArgumentResolver`); a handler under the scope that declares it and is reached without the threshold having run fails loudly, never silently null
- [ ] `@Door` is one annotation with one enum: `OPEN` (room only) · `EDITABLE` (→ `ItineraryPublishedException`) · `MEMBERSHIP_MUTABLE` (→ `MembershipFrozenException`). **No `refusal` attribute** — Q30 removed its only user
- [ ] A non-GET handler under the scope with no `@Door` → `IllegalStateException` naming the handler method, surfacing as 500 — pinned by test against a branch-local undeclared handler that is deleted before the PR (the ticket-11 window pattern)
- [ ] `@ReachesClosedRoom` skips only the closed-room refusal; membership and role are still demanded. **Exactly one act carries it: `unarchive`**

**The room's interface (commit 3)**
- [ ] `trip/room/` holds `Membership`, `Role`, `Owner`, `AuthorizationGuard`, `MembershipResolver`, `TripFence`, `ArchiveState`, `PublicationState`, `MembershipApi`, `MembershipView`, `MembershipArrived`, `MembershipEnded`, `TripArchived`, `WorkspaceThreshold`, `CurrentMember`, `Door`, `ReachesClosedRoom` — `package-info.java` declares `@NamedInterface("room")`
- [ ] Every consumer module's boundary guard names `trip.room..` where it named `trip.api..` for these types; `chat` and `poll` name **only** `trip.room..` and `trip.exception..` — measured before and after and written to the Comments
- [ ] The move changes **zero assertions** (the assertion-line diff over this commit alone is empty, as ticket 02's was)

**The consumers (commits 4–10), each commit's Comments recording its counts**
- [ ] Every handler under the scope: `guard.requireMember` and every `fence.*` mint removed; `@CurrentMember Membership member` in the signature; write handlers carry a `@Door`; owner-only handlers keep `Owner.of(member, refusal)` and their services keep `Owner`
- [ ] Every service that took a `TripFence.*<…>` proof takes `Membership` (or `Owner`) — ~45 signatures; `EditLeaseService.requireHeldBy` and its siblings take `Membership`
- [ ] The outliers call the fence explicitly and are exactly Q24's list: `JoinService.request` (`requireUnfrozen(tripId, LinkClosedException::new)` — and the hand-written archive check at `JoinService:208` becomes `requireOpenRoom`'s sibling call with the same refusal, so the hand copy dies), `InvitationService.accept` (`requireUnfrozen`), `InvitationService.revoke` (`requireOpenRoom` + `requireUnfrozen(…, MembershipFrozenException::new)` after resolving the trip), `DiaryController` / `DiaryService` (legacy, `requireOpenRoom`). `isClosed` in join stays a read (ticket 09's argument holds)
- [ ] `archive` on a deleted trip and `destroy` on a deleted trip answer the mask (Q29) — one new IT each, asserting `ITINERARY_NOT_FOUND`
- [ ] **Chat opens (Q30):** `ChatController.send` takes `@Door(OPEN)`; `ChatDeliveryIT`, `ChatContractIT`, `e2e/api/chat.spec.ts`, `e2e/web/chat.spec.ts` flip from asserting `CHAT_CLOSED` on a published trip to asserting delivery — **these four are the named fifth shape** in the gate's assertion-line diff and are listed by line on this ticket
- [ ] The controller ITs of every module **other than chat** pass unedited beyond import lines — the neutrality proof, as at ticket 03

**The deletions and the guards (commit 11)**
- [ ] Deleted: `TripFence.InAudience/Writable/Editable/MembershipMutable/Unfrozen`, `Standing`, `TripFence.owner(...)`, the generic parameter on every door, `IllegalWorkspaceTransitionException.alreadyArchived()` (nothing asserts it — measured), `ChatExceptions.ChatClosedException`, `Proofs` (test support), `OnlyTheFenceMintsItsProofsTest`, `StandingIsMintedAndDemandedTest`
- [ ] `TripFence` is two ports and two `void` methods — `requireOpenRoom(UUID)`, `requireUnfrozen(UUID, Supplier)` — and `TripFenceTest` covers both with lambdas: open/closed × published/unpublished, each refusal by type
- [ ] Kept: `OnlyTheFenceRefusesTest`, `ArchiveDominatesPublishCoverageTest`, `AudienceFenceCoverageTest`, `WorkspaceStateOpenOrArchivedIT`
- [ ] Added, each **sabotage-checked with the failing line in the Comments**, and the first sabotage distrusted (ticket 11's lesson): `EveryWriteUnderTheThresholdDeclaresADoorTest` (reflection over `@RestController` handlers whose route resolves under the scope; every non-GET carries `@Door`) · `OnlyTheThresholdResolvesMembershipUnderItsScopeTest` (no controller under the scope names `guard.` or `fence.`) · `OnlyUndoReachesAClosedRoomTest` (`@ReachesClosedRoom` count is exactly 1, and it is `unarchive`) · `TheFenceOutliersAreNamedTest` (every `fence.require*` call outside `trip/room/` is in Q24's list, by file — a ratchet that prints the list and fails on growth)

**The gate re-read (commit 12)**
- [ ] The assertion-line diff over `origin/dev...HEAD` reports its changed assertions in **five** categories: ticket 03's four, plus *chat opens at publish* (Q30) — every line of the fifth named here; nothing unexplained
- [ ] CI green with the `Tests run:` counts read from the log; Playwright `--list` `Total:` read; the PR's Playwright run green
- [ ] Tickets 03, 04, 06, 07, 08, 09, 10, 11 each carry one dated line: *"Mechanism replaced at ticket 14 (rounds 5–6); the decisions on this ticket stand."*
- [ ] The two artifacts (the C4 model, the membership model) redrawn from the tree as built; the PR body gains a section naming the mechanism change and the one wire loosening
- [ ] BUILD_STATUS row unchanged (✅ + spec link); no off-epic entry (this is TW-2's own work)
- [ ] `git diff --name-only` empty before each commit; staged paths compared both ways against this ticket's edits

## Comments

*(none yet — the docs commit lands this file)*
