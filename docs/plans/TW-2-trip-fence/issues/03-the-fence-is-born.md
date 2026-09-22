# 03: The fence is born, and the old doors delegate to it — a deleted trip is not found for everyone, once, for every module

**What to build:** `TripFence`, as designed and amended at the grilling, and the one behaviour change of the story landing in one place. The fence is a final class in `trip.api`, constructed with the two ports (`ArchiveState`, `PublicationState`) and nothing else — no Spring, no database — wired once by a bean in the workspace slice. Six doors, each returning a proof nested inside the fence with a **private constructor**: `inAudience`, `writable`, `editable`, `membershipMutable`, `unfrozen(tripId)`, and the refusal overload that lets a surface name its own exception for the same fact. `Standing` is the type `Membership` and the new `Owner` both implement; the state doors take any standing and return a proof typed by it; **`Owner.of(membership, refusal)` is a self-validating value** — it throws or exists, needs no port, and is not a door. The two owner-refusal classes become one (`join`'s nested class folds into `trip.exception`'s as two factory methods; every code and message unchanged). Then the old doors — `WriteFence`'s four and `AudienceFence`'s one — become **thin delegates** over the fence, which is how the behaviour change reaches every module at once with no signature moving yet: **a deleted (archived) trip answers not-found for every standing, the owner included**, at every door; the mask keeps no role split; `TRIP_ARCHIVED` is no longer emitted. The existing archive ITs are amended here, each changed assertion explained on this ticket by its grilling question. Spec decisions 3, 8, 11; grilling Q3 b, Q11, Q13, Q14, Q15, Q16.

**Blocked by:** 02 (the fence and its ports live in `trip.api`).

**Status:** done

- [x] `TripFence` exists as specified; its proofs cannot be constructed outside it (a test that tries fails to compile is not writable — so the AC is a source scan: no `new <Proof>(` outside the fence, and the constructors are `private`)
- [x] `Standing`, `Owner`, `Owner.of` exist; `Owner.of` on a non-owner throws the supplied refusal and on an owner yields a value carrying the membership; `join`'s nested owner refusal is gone and its two messages render unchanged through the unified class
- [x] The fence's own unit test walks every door × {room open, archived} × {no live Itinerary, live} × {`Membership`, `Owner`}, every refusal overload, and both `Owner.of` outcomes, with two lambdas and no container
- [x] `WriteFence.requireWritable`, `requireEditable`, `requireMembershipMutable`, `requireMembershipUnfrozen` and `AudienceFence.requireInAudience` delegate to the fence and hold no rule of their own
- [x] Behaviour: an owner's read of an archived trip answers `ITINERARY_NOT_FOUND`; an owner's write answers `ITINERARY_NOT_FOUND` where it answered `TRIP_ARCHIVED`; a member's answers are unchanged; `unarchive` still reaches the archived trip for the owner (the guard resolves the membership; the act takes no state proof); self-leave still works on an archived trip
- [x] `ArchiveWriteFenceIT` and the api-project `archive-posture.spec.ts` are amended (`TripArchiveContractIT` and `ArchivedTripListIT` needed **no** change here — they assert archive/unarchive mechanics and the dormant archived list, which this ticket does not move; `TripArchiveContractIT` was amended at ticket 01 for the projection instead), and **every changed assertion is listed on this ticket with the grilling question that changed it** (Q11 for the owner's edges; nothing else may move); the web-project `archive.spec.ts` is recorded here as stale until ticket 12 replaces it, and Playwright does not run on branch pushes so no quarantine row is needed
- [x] ~~No module's ITs other than the four named files change~~ — **thirteen** did, plus four api-project specs; the assertion-line diff proves every change is Q11 in one of two shapes, and the comment lists each file (this AC's scope estimate was wrong, not its rule)
- [x] Unit suite, the scoped `trip` ITs and the ITs of every module that reaches the old doors green; CI green on push

## Comments

**Mechanism replaced at ticket 14 (grilling rounds 5–6, 2026-09-22).** The proofs this ticket built were retired before the merge in favour of the Threshold — the same two rules applied once at the route, the handler declaring its door. Every decision on this ticket stands; the shape of the code it describes is history, and ticket 14 carries the current one.

**Closed 2026-09-18.** The fence exists, the old doors are thin delegates over it, and the story's one behaviour change landed in one place and reached every module at once.

**The fence.** `TripFence` in `trip.api`: a final class taking `ArchiveState` and `PublicationState` and nothing else — no Spring, no database, wired by one `@Bean` in the workspace slice. Six doors, five proofs, each nested with a **private constructor**, so a forged proof is a compile error rather than a convention. `Standing` is implemented by `Membership` and by `Owner`; the state doors are generic in the standing and return a proof typed by it, so `Editable<Owner>` and `Editable<Membership>` are different types and a service that needs an owner cannot be handed a member's proof. `Owner.of(membership, refusal)` is a value, not a door — it throws or exists — and because Java evaluates an argument before the call, `fence.editable(Owner.of(m, …))` checks role before state **by construction** rather than by a rule anyone has to remember. `TripFenceTest` walks it with two lambdas and no container: 13 cases over every door × room state × publication state × standing, both refusal-overload paths, and both `Owner.of` outcomes.

**`Owner` is a final class, not a record.** A record's canonical constructor cannot be made private, so a record would have left `new Owner(anyMembership)` writable by anything in the package — the self-validating value would have validated nothing.

**The behaviour change, once.** `WriteFence`'s four methods and `AudienceFence`'s one now hold no rule of their own; they call the fence and return. That is what made **a deleted trip answer not-found for every standing, the owner included**, true everywhere in a single commit: `TripArchivedException` is thrown by nothing, and `AudienceFence`'s `!member.isOwner() && archived` — S4.23's owner exception in code — is gone.

**The owner exception was also in SQL, and this is the finding worth keeping.** `findItineraryIdsInSightOf` read `state <> ARCHIVED **OR** role = OWNER`: the same superseded rule, in a query where no fence could see it, feeding the diary trip list and the WebSocket topic subscriptions. It is now identical to `findItineraryIdsNotIn` and collapsed into it. Without that, the list would have kept offering the owner a trip that answers 404 at every door it links to — the guard and the query quietly disagreeing, which is exactly the shape ADR-040 exists to remove.

**`join`'s owner refusal folded in.** `JoinExceptions.NotTripOwnerException` is gone; its two messages are now `NotTheTripOwnerException.toReadTheJoinQueue()` and `.toAnswerAJoinRequest()`, byte-identical strings under the same `NOT_PERMITTED` code. Epic-map line 354 closes as a side effect.

---

### The ticket's scope estimate was wrong, and this is the correction

**The ticket predicted four IT files would change. Thirteen did, plus four api-project Playwright specs.** Nothing about the *decision* moved — every single changed assertion is grilling **Q11**, in one of exactly two shapes:

- **`409 TRIP_ARCHIVED` → `404 ITINERARY_NOT_FOUND`** — the owner's write to a deleted trip.
- **`200 OK` → `404 NOT_FOUND`** — the owner's read of one.

There is no third shape anywhere in the diff; `git diff -- backend/src/test | grep` over every changed status and code line shows only those two. The estimate was wrong because the owner's archived-trip posture had been written into far more contract suites than the archive-named ones: chat, polls, the photo dump, activity photos, the editing session, the lifecycle ladder, plan save, publish, the diary and the shared postcard each pinned it locally. That is itself the argument for the fence — one rule had thirteen witnesses.

**The thirteen, each with what moved:**

| File | What changed |
|---|---|
| `ArchiveWriteFenceIT` | `refused` and `masked` were two helpers asserting two different answers; they are now one, because there is no longer a role split. 20 call sites, two tests renamed. |
| `TripReadContractIT` | the owner's read of both roots: `200 + archived:true` → `404 ITINERARY_NOT_FOUND`. |
| `AudienceLadderIT` | three tests: the owner's direct read, members and invitations; the owner's trip-rooted diary reads; and the published-then-deleted walk, which now asserts the owner's 404 **and** that Undo brings the page back for all three roles. |
| `DiaryContractIT` | four tests. Trip-rooted posts and entry writes answer 404; the diary trip list drops the owner's deleted trip; and the cursor test gained a third *live* trip, because with the owner's deleted one excluded its `limit=2` page was no longer full and the envelope assertion lost its premise. |
| `SharedPostcardIT` | the trip-rooted recaption and read. |
| `ChatContractIT` | the owner's send, and the fence-before-validation ordering test, which still proves ordering — with the new code. |
| `PollContractIT` | the board read and four writes. |
| `PhotoDumpContractIT` | upload, delete and the pool read. |
| `ActivityPhotoContractIT` | the upload on a deleted trip. **Care needed here**: the same `.isEqualTo(409)` literal appears in the *published* and *no-lease* tests in that file, and a first pass changed all three. Restored; only the deleted-trip one moved. |
| `EditingSessionIT` | acquiring the session. |
| `EditingAcrossLifecycleIT` | its `refusalCode` helper hardcoded 409, so it could not express two different statuses for publish and delete. Status is now a parameter, and the publish case still asserts 409. |
| `PlanSaveIT` | the bulk save path. |
| `PublishedMeansALiveItineraryIT` | publish and unpublish on a deleted trip. |

**Four api-project Playwright specs**, beyond the one the ticket named: `archive-posture.spec.ts` (its `archivedRefusal` helper deleted and its three AC-3 tests inverted, plus *"the owner diary list still holds it"* → drops it), `api-surface.spec.ts`, `polls.spec.ts` and `publish.spec.ts`. No `TRIP_ARCHIVED` string survives anywhere in `mobile/e2e`.

**`mobile/e2e/web/archive.spec.ts` is stale from this commit until ticket 12 rewrites it as the delete walk.** No quarantine row: Playwright's web project runs only on pull requests, and ticket 12 lands before the PR opens.

---

**Guards born here.** `OnlyTheFenceMintsItsProofsTest` scans for `new TripFence.<Proof>(` outside the fence and asserts each nested constructor is `private`, with an emptiness check so a scan that found no files cannot pass vacuously. It is a guard for the *reader* rather than the compiler — Java already refuses the forgery; the rule is so the refusal is read as a rule.

**Counts read, never exit codes:** unit `Tests run: 520, Failures: 0, Errors: 0`; the whole backend IT suite `Tests run: 1350, Failures: 0, Errors: 0`; mobile `206 suites, 6910 tests` passed; `tsc --noEmit` clean; `npx playwright test --list` reports `Total: 871 tests in 56 files`. `git diff --name-only` empty before the commit.
