# TW-2 — The Trip Fence: the kernel dissolves into `trip`, and the guards become proofs

**Amended 2026-09-22, after the build (grilling rounds 5–6, ticket 14): the proof mechanism this record designs was built, read by the founder — *"this trip fence is all over the place"* — measured (66 signatures carrying a type each unwraps on its first line; seven proofs minted and discarded; `Unfrozen` with no consumer), and replaced on the branch by the **Threshold**: the same two rules, applied once at the route. Every decision below stands; the section *"The structure — what lands where"* and the fence's interface describe the retired mechanism and are superseded by the grilling's *"settled model, amended by rounds 5 and 6"* and by ticket 14. The room's types publish as `trip.room`. Where this file and rounds 5–6 disagree, the rounds win.**

**Status: DESIGN, 2026-09-15 — written before the grilling, on the TW-1 and module-layout precedent.** This is the design record, not a grilling record and not a spec. The founder pulled TW-2 on 2026-09-15 and **folded the *guards, lifecycle and states* backlog line into it** (epic map line 187), with one instruction: *"we should be clear about this fence on where it is heading, i don't want to rework this again and it should be implemented properly."* The 2026-09-10 grilling the epic map refers to left no record on disk (S4.41's grilling noted it; `docs/plans/S4.41-trips-surface-and-requests/grilling.md` line 17), so this file starts from the code at `01a0afc2` rather than from memory. The founder types `/grill-with-docs` next; `/to-spec` and `/to-tickets` follow. **Grilled 2026-09-17→18 (four rounds, seventeen questions; `grilling.md` beside this file — ADR-040).** The grilling amended this record in place, each mark dated *[amended 2026-09-18]*: archive is delete's implementation and the client's archive surfaces leave, so the story is **not** invisible to travelers; the mask's owner exception dies — archived is not-found for everyone; `Owner` is a self-validating value rather than a fence door and the state proofs are typed by standing; the record (diaries, postcards) survives a deleted trip readable and author-writable; the hand copies number nine and the archive ports four. Where this file and the grilling disagree, the grilling wins.

---

## What this is

Two things, one branch, because each is half of the other.

1. **The relocation — ADR-039 decision 5.** `common.authz` is 14 files: `Membership`, `Role`, `AuthorizationGuard`, `AudienceFence`, `InAudience`, `WriteFence`, `MembershipResolver`, `TripWritability`, `TripEditingSession`, `PublicationState`, and four refusals. It is the trip's authorization model wearing the kernel's name — the standard's *coupling magnet* exactly. Nine modules import `common` to reach something that is `trip`'s. It moves into `trip`. Stop-rule: the authorization guard moves.
2. **The reshape — the founder's model made structural.** The write fence today is four `void` methods that each act must *remember* to call. CM-5 moved three acts across module lines and each left its fence call behind in the old caller; an archived trip could be published and 1,341 integration tests said nothing (epic map line 185). After TW-2 the fence **mints proofs** — types an act's signature demands and only the fence can construct — so a fence-skipping caller does not compile.

Why together rather than relocate-then-reshape as two stories: both passes touch the same ~55 call sites, and the reshape *is* the founder's model (*"the guard should be in the status"*) written into the type system. Encoding the rules once means settling the model first — which is why the guards/lifecycle line rides along instead of waiting behind this.

## The two facts, and who owns each

The founder's model, verified against the code: **a trip is a lifecycle, a plan and a room.** Two facts close doors on it, and they have different owners.

| Fact | The founder's words | Owner | Stored | Read today through |
|---|---|---|---|---|
| **The room is closed** (archived) | *"Archive closes the room — owner-only, from any lifecycle state, an audience fact on the workspace"* (INV-1's ladder: the room narrows to the owner) | `trip`, workspace slice | `workspace.state = ARCHIVED` | `TripWritability.isFrozen` (a `common.authz` port adapted by `trip/workspace/adapter/RowBackedTripWritability`) · `MembershipApi.isArchived` / `archivedAmong` / `allArchivedTripIds` (`trip.api`) · `TripFacts.archived()` (a `trip.api` DTO) — **three ports for one fact** *[amended 2026-09-18: four — `TripApi.frozen` (`TripFactsService:176`) is another]* |
| **The plan is frozen** (a live Itinerary exists) | *"Publish is not a trip state — the trip's freeze is a reaction to that object's existence; that guard belongs on the Itinerary and the trip consults it"* (ADR-037; CM-5 round 1 Q1 and round 2 Q1) | `itinerary` | an `itinerary_object` row that is not retired | `PublicationState.isPublished` (a `common.authz` port adapted by `itinerary/service/ItineraryBackedPublicationState`) · the **dead** `itinerary.published` column, still read by six callers and still gating `Trip.reopen` inside the entity |

The mechanism already matches the model — archive reads the workspace, publish reads the Itinerary through a port. What does not match is *where the decision is made*: not in the status, but in whichever service remembers to ask.

**The evidence that "a line per act" is the shape today.** Beyond `WriteFence`'s four doors (~40 call sites across 12 services), the same two facts are re-implemented by hand at eight sites:

| Site | What it re-implements | Refusal it names |
|---|---|---|
| `postcard/service/PostcardService.java:280` `requireWritableTrip` | the archive mask, role-split, from `TripFacts.archived()` | `TripArchivedException` / `TripNotFoundException` |
| `itinerary/service/ItineraryObjectService.java:178` | archive dominates publish, on the page read | not-found mask |
| `itinerary/service/ItinerarySourceVisibility.java:28` | archive dominates publish, on lists | filtered out |
| `chat/service/ChatService.java:65` | the freeze, on send | `ChatClosedException` |
| `join/join/service/JoinService.java:186` | the freeze **and** the archive, on the link | link dead |
| `invitation/service/InvitationService.java:215` | the freeze, on the pending list | refusal |
| `trip/trip/entity/Trip.java:263` `requireUnpublished` | the freeze, from a column nothing writes | `IllegalStateTransitionException` — **always passes** |
| `trip/trip/service/TripService.java:309` | the freeze, on reopen, correctly this time | `IllegalStateTransitionException` |

Eight copies, three of them in modules other than the two owners, one of them dead. That table is what TW-2 deletes. *[amended 2026-09-18: a ninth — `postcard/service/PostcardService.java:342` `requireWritable(postcard)`, which freezes the author's own postcard edits through `TripApi.frozen`; it goes with the rest, and under Q17 nothing replaces it — a postcard's only guard is authorship.]*

## The principle: the fence proves *state*; the act decides *role*

Two questions get asked before any workspace act, and they are different kinds of question:

- **Is this surface open?** — the room's state and the Itinerary's existence. A property of the *trip*, the same for every member, and the one CM-5 kept forgetting. **This is the fence's job, and it answers with a proof.**
- **May *you* do this?** — owner-only, uploader-or-owner, the editing-session holder. A property of the *act*, different for each, and never silently wrong: an act that forgets its role check admits the wrong traveler, which the act's own test sees on its first run. **This stays in the act**, as `member.isOwner()` and the act's named refusal (`NotTheTripOwnerException.toChangeArchiveState()`), exactly as today.

The one exception worth naming: the **editing session** is a lease with an expiry. A proof of it would go stale in the caller's hand, so it stays a runtime check inside `trip/editing`, and the plan-write acts keep asking for it after they have their `Editable`.

*[amended 2026-09-18, Q3 → b, Q16]: the founder ruled the owner **is** a proof — but the argument above survives in a different place. Role needs none of the fence's ports, so it is not a fence door: `Owner.of(membership, refusal)` is a **self-validating value** that throws or exists. The fence keeps six doors; the owner is checked by construction, before any door runs.*

## The structure — what lands where

```
trip/
  api/
    AuthorizationGuard          from common.authz, UNEDITED — mints Membership from the resolver
    Membership · Role           from common.authz, unedited
    MembershipResolver          from common.authz, unedited (the row-backed adapter stays in trip/workspace/adapter)
    TripFence                   NEW — one final class; the doors; the proofs nested inside it
    PublicationState            from common.authz — the port trip DECLARES and itinerary IMPLEMENTS,
                                shrunk to what trip needs (isPublished, liveAmong)
    ArchiveState                TripWritability renamed for what it answers: isArchived(tripId)
    PlanApi                     gains the editing-session question itinerary asks today through TripEditingSession
  exception/
    TripArchivedException · ItineraryPublishedException · MembershipFrozenException · ItineraryNotFoundException
                                from common.authz — ADR-038 puts a module's refusals here, and every
                                importer's allowlist already names trip..
  workspace/
    entity/WorkspaceState       ACTIVE | ARCHIVED — COMPLETED leaves
    config/                     wires TripFence(archiveState, publicationState)

common/
    error · id · tx · config · storage · security   — the shared kernel, as ADR-039 defines one

itinerary/
    api/ItineraryApi            gains the READ half of today's PublicationState (liveFor, publishedAmong)
                                for chat, invitation, join, mytrips, feed, diary — modules that may call
                                itinerary.api directly because none of them sits on the trip → itinerary edge

DELETED
    common.authz.WriteFence · AudienceFence · InAudience (re-minted as TripFence proofs)
    common.authz.TripWritability · TripEditingSession (one becomes ArchiveState, one becomes a PlanApi method)
    Trip.published · publishedAt · publishTo · unpublish · isPublished · requireUnpublished
    NothingWritesTheDeadPublicationFlagTest — the thing it guarded is gone
    WorkspaceState.COMPLETED
```

One correction to ADR-039 decision 5 on the way: it routes `AudienceFence` and `InAudience` to `identity.api` as *"identity's visibility rule"*. Read the class: `AudienceFence` reads `TripWritability.isFrozen` and nothing of identity's — it is the **archive mask on reads**, the trip fence's read door. It goes with the fence. The grilling amends the decision's sentence.

## The fence, as a deep module

**Interface** — everything a caller must know:

```java
public final class TripFence {

    public TripFence(ArchiveState room, PublicationState publication)

    public InAudience        inAudience(Membership m)          // reads: room open; else 404 mask [amended 2026-09-18: every standing]
    public Writable          writable(Membership m)            // writes that survive publish: room open;
                                                               //   [amended 2026-09-18: 404 mask for every standing; no 409]
    public Editable          editable(Membership m)            // plan edits, lifecycle, lease: writable
                                                               //   and no live Itinerary; 409 ITINERARY_PUBLISHED
    public MembershipMutable membershipMutable(Membership m)   // roster changes: writable and no live
                                                               //   Itinerary; 409 MEMBERSHIP_FROZEN
    public Unfrozen          unfrozen(UUID tripId)             // acts by non-members (accept an invitation,
                                                               //   request to join): 409 MEMBERSHIP_FROZEN
    public <X extends RuntimeException>
           Unfrozen          unfrozen(UUID tripId, Supplier<X> refusal)
                                                               // the same fact, a surface's own refusal —
                                                               //   chat's CHAT_CLOSED, join's dead link

    public static final class InAudience        { private InAudience(Membership m) …  public Membership member() }
    public static final class Writable          { private Writable(Membership m) …    public Membership member() }
    public static final class Editable          { private Editable(Membership m) …    public Membership member() }
    public static final class MembershipMutable { private MembershipMutable(Membership m) … }
    public static final class Unfrozen          { private Unfrozen(UUID tripId) …     public UUID tripId() }
}
```

**Why this exact shape, mechanism by mechanism:**

- *[amended 2026-09-18, Q16 · Q13 · Q14 · Q11]* **`Owner` is not a door, and the mask has no role split.** `Owner.of(membership, refusal)` is a self-validating value; `Membership` and `Owner` both implement `Standing`, and every state door takes a standing and returns a proof typed by it — `fence.editable(Owner.of(m, …))` yields `Editable<Owner>`, `fence.writable(m)` yields `Writable<Membership>`. Role is checked first because the argument is evaluated before the door. And since archive is delete's implementation, **archived answers not-found for every standing at every door** — the `inAudience`/`writable` comments below that split owner from member are superseded; `TripArchivedException` has no emitter and is deleted.
- **The proofs are nested in the fence with private constructors.** That is the whole guarantee, and it is the only way to get it in Java without a module system: a private constructor is callable from the enclosing class's body (nestmates), and from nowhere else. `InAudience` already does this today through package-private access to `AudienceFence` in the same package; nesting is the same idea made robust to the move — there is no package to be in. Nothing outside `TripFence` can write `new Writable(...)`. The compiler is the guard.
- **One final class, two ports in its constructor, no Spring inside.** The fence's whole implementation is the mask rule and the freeze rule — twenty lines. Its dependencies are two predicates on a trip id, handed in as `ArchiveState` and `PublicationState`; the `@Bean` in `trip/workspace/config` supplies the row-backed pair. Its test supplies two lambdas and walks every door through every state in one class. *Accept dependencies, don't create them* — and the whole policy sits in one place that has no database.
- **Doors are named for what the act may then do, not for the fact checked.** `Editable` and `MembershipMutable` test the same two facts and differ only in the refusal — `ITINERARY_PUBLISHED` says *unpublish to edit*, `MEMBERSHIP_FROZEN` says *your travelers are settled*. Both codes are shipped (ADR-008), so both doors stay. The `Supplier` overload is the generalisation: **the fence proves the fact, the surface names its refusal** — which is how chat's `ChatClosedException` and join's dead-link answer get their freeze from the fence instead of re-deriving it.
- **The mask lives in the fence once.** S4.23's rule — a non-owner's write to an archived trip answers the same not-found as their read, *before* any finer permission — is the body of `writable` and `inAudience`, and nowhere else. `PostcardService.requireWritableTrip` is the one hand copy that gets it right today; it becomes `fence.writable(member)`. *[amended 2026-09-18, Q11: the rule loses its role split — archived is not-found for the owner too, because a deleted trip does not "legitimately exist" for anyone; S4.23's owner exception is superseded by ADR-040.]*
- **Proofs carry the `Membership`.** An act takes `Editable e` and reads `e.member()` for its role check and its ids. It needs nothing else, so it asks for nothing else — and a service method whose signature says `Editable` is a service method that *cannot be reached* without passing the plan-edit door.
- **Bare `Membership` is itself a proof — the weakest one — and an act that takes it is making a claim.** `archive` and `unarchive` (the owner opens and closes the room, so they cannot require the room to be open), `destroy`, and self-leave (*stays open* on an archived trip — S1.9's rule, upheld at S4.23) legitimately take `Membership` because they must work in every state. After TW-2 those are the only ones, and a ratchet test (below) keeps the count from growing quietly.

**Depth check.** The interface is six doors and five proof types. Behind it: the archive mask with its role split, the freeze, the not-found masking rule, the four shipped refusal codes, and the two ports' wiring — consumed by ~55 call sites in nine modules. Delete the module and every one of those sites grows the eight-row table above back. Deletion test passed.

## "The guard should be in the status" — what that means in the entities

The founder's phrase, taken literally, changes two entities and one wire field.

**`WorkspaceState` becomes `ACTIVE | ARCHIVED`.** `COMPLETED` is a stored copy of `TripLifecycle.COMPLETED` (present since S1.9): `Workspace.unarchive(boolean itineraryIsCompleted)` has to be *told* the lifecycle to restore it, `reopen` writes both, and `markCompleted`/`markActive` are silent no-ops while archived (`Workspace.java:60-91`). A room is open or closed; that is the whole state. `Workspace.isOpen()` is the method the fence's `ArchiveState` adapter reads — the status answering the question.

**But the wire field stays byte-identical.** `TripResponse.workspaceState` ships `active | completed | archived` and `mobile/src/itineraries/WorkspaceChip.tsx:10` reads `'completed'` to hide the chip. ADR-008: nothing shipped changes meaning. So the wire value becomes a **projection** — `archived ? "archived" : lifecycle == COMPLETED ? "completed" : "active"` — computed where `TripResponse` and `TripFactsService` already have both facts in hand. The column loses a value; the wire loses nothing. A test pins the projection against all six (lifecycle × archived) combinations.

**`Trip` stops carrying `published`.** The field, `publishedAt`, `publishTo`, `unpublish`, `isPublished` and the private `requireUnpublished` leave the entity. The six readers that *"outlive CM-5 and always answer false"* (epic map line 187 finding 5) — `TripPlan`, `TripFacts`, `TripTeaser`'s `published`, and two `TripService` log lines — are re-pointed at `PublicationState` or deleted. `reopen`'s real freeze check is already in `TripService.reopen` through the port; the entity's copy was the one that always passed. **This is the epic map's "TW-2 Q4".**

**The columns.** `itinerary.published` and `itinerary.published_at` have been dead since CM-5 and `NothingWritesTheDeadPublicationFlagTest` exists only to keep them dead. Recommendation: **drop them in TW-2's migration**, in the same file that rewrites `workspace.state`. Dropping is destructive and therefore a stop-rule item — but a column nothing writes is a lie waiting for a reader, and the founder accepted the identical shape at S4.25 (`destinations` dropped after its scalar replacement landed). The alternative — leave them and keep the guard — is a permanent tax for a rollback path nobody would take (a revert of TW-2 would restore readers of a column that answers `false` on every row). *The grilling decides; see Open 3.*

**Migration V58**, one file, two statements, both stop-rule: `UPDATE workspace SET state = 'ACTIVE' WHERE state = 'COMPLETED'` with a `CHECK (state IN ('ACTIVE','ARCHIVED'))`, and the two column drops. A migration-stepping IT in the `WorkspaceBackfillIT` mould proves the rewrite against planted rows, since every other rung runs it against zero.

## The public-read side: "archive dominates publish" stays reader-side, on purpose

This is the one place the fence *does not* reach, and it is worth stating why rather than leaving it for the next reader to call an omission.

ADR-017's ladder says archived = owner only, **archive dominates publish**, unarchive restores the prior audience. Five public surfaces uphold it today, each by asking `trip.api` for the archived set — eleven call sites in five modules: the Itinerary page (`ItineraryObjectService:178`), Discover (`ItinerarySourceVisibility:28`, `DiscoveryService:169`), Home's postcards (`PostcardFeedService:144`), the public Profile (`PublicProfileService`, six sites — the counts, the diary tab, the itineraries tab), and the join teaser (`JoinService:186`). Their readers are not members — a stranger reading Discover has no `Membership` — so no proof can be demanded of them, and the fence's doors do not apply.

Two ways to make this un-forgettable were weighed:

- **Suspend the Itinerary on `TripArchived`** — an event the itinerary module already could subscribe to (it depends on `trip.api`; `invitation` listens to the same event). One act, no reader discipline. **Rejected**: it gives the Itinerary's `retired` a second meaning or a second flag, and it does not cover postcards, diaries, the profile counts or the join teaser — four of the five surfaces are not the Itinerary, so each module would need its own suspended state, which is the reader discipline it set out to remove, moved to a worse place. The founder's model says archive is an *audience fact on the workspace*; everything derived from the trip stays as it is and the *audience* narrows. Reader-side is that model.
- **Reader-side through `trip.api`, guarded by coverage** — what exists, made explicit. `MembershipApi.archivedAmong` / `isArchived` are the one door; a coverage guard in the `AudienceFenceCoverageTest` mould asserts every public read surface over trip-derived content consults it. **Recommended.** It is the weaker guarantee (a test, not the compiler) and this record says so; it is also the one that matches the model and reaches all five surfaces through the two batch calls that already exist.

*Open 1 puts this to the founder.*

## The guards born with the story

Each is a property of the build, none is a by-name exemption list, and each has a failure mode that was checked by sabotage before it shipped:

1. **`OnlyTheFenceRefusesTest`** (ArchUnit) — `TripArchivedException`, `ItineraryPublishedException`, `MembershipFrozenException` are constructed only inside `TripFence`. This is what kills the hand copies structurally: `PostcardService` cannot throw `TRIP_ARCHIVED` itself, so it must take a `Writable`.
2. **`BareMembershipRatchetTest`** — the number of `@Transactional` service methods whose signature takes a bare `Membership` is at most the number at TW-2's close (archive, unarchive, destroy, self-leave — the list at birth is printed in the assertion, never held as an exemption set). A new one is a failure that names itself; the count only goes down.
3. **`OnlyTheResolverMintsMembershipTest`** (ArchUnit) — `new Membership(...)` appears in production code only in `trip/workspace/adapter`. Today the record's constructor is public, so a service could forge one; that is a different failure class from forgetting (it needs intent), but it is the same hole, and closing it is one rule.
4. **`WorkspaceStateWireProjectionTest`** — the six combinations, so the chip never moves.
5. **The migration-stepping IT** for V58.
6. **`AudienceFenceCoverageTest` shrinks** — its `OWNER_ONLY_OR_DELIBERATELY_UNFENCED` name-set (epic map line 252's criticism) loses every entry a proof now covers.

`ModulithVerificationTest` and the seventeen boundary guards must report the same refusal count before and after the relocation; `AuthorizationGuardTest` moves **unedited**, which is ADR-039's stated proof that the guard's semantics did not change.

## Sequencing inside the branch — three passes

1. **The `Workspace` pass** — `COMPLETED` leaves, the wire projection lands, the dead flag leaves `Trip`, V58. Smallest, most stop-rule-dense, and independent of everything below. *(The epic map's "TW-2 PR 1".)*
2. **The relocation** — `common.authz` → `trip.api` / `trip.exception`, mechanically, guard allowlists and Modulith agreeing, every test moving unedited. Nothing changes shape here so that the diff is readable as a move.
3. **The reshape** — `TripFence` replaces `WriteFence` + `AudienceFence`; the ~55 signatures take proofs; the eight hand copies fold into doors; the six guards above go green. This is the pass the founder reviews for the model.

Relocate before reshaping, not after: moving code that is about to change shape means reading the same diff twice.

## What it costs

- **Stop-rule, three times:** the authorization guard relocates (ADR-039: a relocation, tests unedited); a column's value set shrinks (`workspace.state`); two dead columns drop.
- **~55 signatures across nine modules** change from `Membership` to a proof — mechanical, one commit per module, each module's own ITs the proof.
- **Eight allowlists** trade `common.authz` for `trip.api` + `trip.exception` (`poll`, `chat`, `invitation`, `join`, `postcard`, `itinerary`, `mytrips`, `ws` — most already name `trip..`), and `TripModuleBoundaryTest` learns that the fence and its proofs are part of the front door.
- **ADR amendments:** ADR-039 decision 5 (the `AudienceFence` routing; `PublicationState` split between the port trip keeps and the reads `itinerary.api` takes over); ADR-017's ladder gains the sentence that says *reader-side, by design*; the glossary's *Active (workspace)* row records that `completed` on the wire is a projection.
- ~~**Nothing a traveler can see.**~~ *[amended 2026-09-18: false after the grilling — the client's archive surfaces (the Archived Trips link and screen, the archive banner and its Unarchive, the archived chip and its copy) are removed, Delete gains an Undo toast, and one wire path changes 409 → 404; ADR-040.]* Zero **new** screens, zero **new** routes. The device rung owed is the S4.23 posture walk (owner vs member on an archived trip; a published trip's plan and roster refusing), on the LAN phone or the emulator.

## Still open when this is pulled — the grilling's frontier

*[amended 2026-09-18: every item below was settled at the grilling — see `grilling.md`. 1 → reader-side, narrowed to the published Itinerary and links to it (Q1, Q10). 2 → the owner IS a proof, as a self-validating value (Q3 b, Q16). 3 → drop (Q5). 4 → the fence (Q7). 5 → the product rule (Q6). 6 → archive is delete's implementation and the archive surfaces leave — **this record's claim that no screen lists archived trips was wrong**: the client had an Archived Trips screen, a link on Trips and a banner with Unarchive (Q2). 7 → both ride (Q8).]*

1. **Archive vs the live Itinerary.** Reader-side through one `trip.api` door plus a coverage guard (recommended), or suspension by event. The founder's *"archive closes the room"* argues for the first; *"I don't want to rework this"* is the reason to decide it now.
2. **Role stays in the act.** Confirm the principle above, or ask for `Owner` as a proof too. Recommendation: confirm — a role check that is forgotten fails its own test on the first run, which the fence's did not.
3. **Drop the dead columns, or leave them dead with their guard.** Recommendation: drop.
4. **Chat, join and invitation take their freeze from the fence** (the `Supplier` door, their own refusal codes preserved), or keep reading `PublicationState` themselves. Recommendation: the fence — it is three of the eight copies.
5. **The freeze's reason, in one sentence.** Its recorded justification (the live projection) died at CM-5; what it protects now is photo custody (`PlanSnapshot.photoIds` resolve live into workspace media) and three product rulings anchored to publish — chat closes, join links die, the published badge. Line 187 owes the sentence; TW-2 is where it gets written into ADR-037.
6. **Is archive a traveler act, or delete's plumbing?** No screen lists archived trips; `TripArchivedException`'s copy — *"This trip is archived and is read-only"* — is only honest if a traveler can see one. The fence is identical either way; the ruling decides the copy and whether the Archived list (the S4.38 "de-facto bin") ever ships.
7. **Sequence against the three surfaces and the `trip` outbound allowlist.** Neither blocks this; the surfaces story reads `PublicationState` through the escape hatch this story closes, so *after* is cheaper for it. The outbound allowlist (epic map line 212) is one file and rides here if the founder wants it.

## How this was reached

Measured from the tree at `01a0afc2` (S4.41 merged), 2026-09-15, in a `codebase-design` pass: `common/authz/*` read in full; every importer of `com.largata.common.authz` listed (53 files, nine modules); every `requireWritable`/`requireEditable`/`requireMembershipMutable`/`requireInAudience` call site counted; the eight hand copies found by grepping `isArchived`/`isPublished` outside the fence; `ItineraryBackedPublicationState`, `RowBackedTripWritability`, `Workspace`, `WorkspaceState`, `Trip.reopen`, `TripService.reopen`, `MembershipService.archive/unarchive` read; the wire checked at `TripResponse` and `WorkspaceChip.tsx`; the guards at `NothingWritesTheDeadPublicationFlagTest`, `AudienceFenceCoverageTest`, `PollModuleBoundaryTest`, `ApiIsNeverWireTest`, `ModulithVerificationTest` read for the mechanisms this design reuses. The nested-private-constructor mechanism is `InAudience`'s existing one, generalised. Where this record and the grilling disagree, the grilling wins and this file gets a dated amendment, per the TW-1 precedent.
