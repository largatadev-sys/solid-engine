# TW-2 — grilling record

**Grilled 2026-09-17 → 2026-09-18, `/grill-with-docs`, four rounds, seventeen questions plus one the founder asked back.** The design record is `design.md` beside this file, written 2026-09-15 before the grilling on the TW-1 / module-layout precedent; where the two disagree, this record wins and `design.md` carries a dated amendment in place. The founder types `/to-spec` next.

**How the story was pulled.** Asked what was next, the agent read the backlog and recommended the three remaining tab surfaces, with one flag: the epic map said TW-2 had been grilled on 2026-09-10 and no record existed on disk (S4.41's grilling had noted the same). The founder asked what TW-2 was, what it achieved, and what was known about the archive and publish fence — then ruled: *"yes we will fold it into tw 2. but we should be clear about this fence on where it is heading, i dont want to rework this again and it should be implemented properly."* The *guards, lifecycle and states* backlog line (epic map line 187) is folded in on that sentence. The design record was written first so the grilling had a target to test; the founder checked the goal (*"are we clear about what we are trying to achieve here?"*) before typing the command.

**The goal, as stated and confirmed before Round 1:** after TW-2, the two rules that close a trip — *an archived trip cannot be written to* and *a published trip's plan and roster cannot be changed* — are decided in one place, and an act that forgets to ask does not compile. The measure is binary: could CM-5's three regressions happen again on this tree.

---

## Round 1 — the root decisions (2026-09-17)

Stated as assumptions, not questions, and not objected to: one branch, one PR, three passes in the order *Workspace pass → relocation → reshape*; the three stop-rule items each get the founder's explicit yes in this record.

**Q1 — Archive and the live Itinerary — where does "archive dominates publish" live?** (a) reader-side through `trip.api`'s archived set plus a coverage guard · (b) suspend the Itinerary on `TripArchived` · (c) archive retires the Itinerary. Recommended (a).

**Founder:** *"q1 - trip archive is not a feature. it was a workaround that was implemented for a placeholder to delete. When a trip is deleted, it should archive the trip rather than deleting it completely. that's how it should work. now as for the archived trip buttons in the trip, we should completly remove that. let's put that out before we go into more grilling as it might reconsider some questions"*

**Reading.** This is larger than Q1. Archive is **delete's implementation** — a soft delete — and not a thing a traveler sees or reasons about. Everything that presents archive as a state goes. The agent stopped the round and measured the client before continuing (below). Q1 itself lands on (a), and it is now the only possible answer: a deleted trip's published page, teaser and cards must disappear and come back on restore, which is what reader-side over the archived set does.

**Q2 — Is archive a traveler act or delete's plumbing?** Settled by the same ruling: **plumbing**, and the archive surfaces are not parked but removed. The design record's claim that *"no screen lists archived trips"* was **wrong** — see the measurement.

**Q3–Q8** were carried to Round 2 unchanged; the founder later asked *"we jumped to q9, do i need to answer prior questions?"* and the agent re-listed all ten open questions in full. Answers are recorded under Round 2.

### What the ruling made the agent measure (2026-09-18)

The client had a complete archive feature, contradicting the design record and epic-map line 187:

- Trips tab → **"Archived trips"** link (`mobile/app/(tabs)/(trips)/trips.tsx:281`, `showsArchivedLink`) → **Archived Trips screen** (`itineraries/archived.tsx`) over `GET /v1/trips?archived=true`.
- Trip detail → **`TripArchiveBanner`** — *"Archived · This trip is read-only. Unarchive it to make changes."* with an owner-only **Unarchive** button.
- `archiveControls.ts`, `archiveTripWording`/`unarchiveTripWording`, `editLockedMessage` keyed on `TRIP_ARCHIVED`, `pollMessages` keyed on `TRIP_ARCHIVED`, `WorkspaceChip`'s archived chip, the `'archived'` posture in `travelerSections`/`WorkspaceTravelersTab`, chat furniture.
- **Delete → archive, toast *"Trip deleted"*, `undoable: false`** (`useTripsRemoval.ts:61`). S4.38's spec said the toast's Undo calls unarchive and the Archived list is "the slow undo"; the code shipped no undo. The list *was* the undo.

Server side: `feed` and `profile` hide postcards and diary sections from archived trips **for everyone, author included** (`PostcardFeedService:144`, `PublicProfileService:212`); the `diary` module's `/v1/travelers/{handle}/diaries` **does not check archive at all** — two answers to one question in the product today. The client keys on `TRIP_ARCHIVED` in exactly two places, both in surfaces being removed.

What the ruling changes in the fence: S4.23 gave the owner an honest `409 TRIP_ARCHIVED` because *"the trip legitimately exists for them"*. Under the ruling it does not — it is deleted. So **archived = not found for everyone, owner included**; the mask loses its role split; `TripArchivedException` has no emitter left. Simpler than the design drew, and a wire change on one path.

---

## Round 2 — the reshaped frontier, plus Round 1's carried questions (2026-09-18)

**Q3 — The fence proves state; the act decides role.** (a) confirm · (b) also mint `Owner` as a proof. Recommended (a).
**Founder:** *"q3 - b"*
**Reading.** The owner is a proof too. The agent measured what owner-only means (Round 3) before asking how it composes. The design record's argument for (a) — *a forgotten role check fails its own test on the first run* — stands as the reason role never needed the fence's *ports*; it does not stand as a reason to leave the role outside the type system, and the founder's later question (below) found the better mechanism.

**Q4 — `WorkspaceState` becomes `ACTIVE | ARCHIVED`; the wire's `completed` becomes a projection.** Stop-rule. Recommended (a).
**Founder:** *"q4 - a"*
**Reading.** Yes. V58 rewrites `COMPLETED → ACTIVE` with a `CHECK`; `TripResponse.workspaceState` and `TripFactsService` compute `archived ? "archived" : lifecycle == COMPLETED ? "completed" : "active"`, byte-identical; a test pins all six combinations. The founder's "room" is read as the glossary's *Trip Workspace* and stays informal.

**Q5 — Drop `itinerary.published` and `published_at`.** Stop-rule, destructive. Recommended (a).
**Founder:** *"q5 - a"*
**Reading.** Dropped in V58, same file. `NothingWritesTheDeadPublicationFlagTest` retires with them. The founder's yes on a destructive migration is recorded here.

**Q6 — The freeze's reason, one sentence for canon.** (a) product rule — *a published plan does not change under its readers; republish is the deliberate act that changes it* · (b) technical — photo custody. Recommended (a).
**Founder:** *"q6 - a"*
**Reading.** The product rule is the reason; photo custody (`PlanSnapshot.photoIds` resolve live, `ItineraryPageService:158`) and the three anchors (chat closes, join links die, the published badge) are recorded as what it also protects. Written as an amendment to ADR-018, which owns the freeze.

**Q7 — Chat, join and invitation take their freeze from the fence** via `unfrozen(tripId, refusal)`, keeping their own codes. Recommended (a).
**Founder:** *"q7 - a"*
**Reading.** Three of the hand copies go (`ChatService:65`, `JoinService:186`, `InvitationService:215`). None of the three needs `PublicationState` afterwards.

**Q9 — Does delete have an undo?** (a) toast Undo calling unarchive · (b) final for the traveler. Recommended (a).
**Founder:** *"q9 - a"*
**Reading.** `removal.request({undoable: true})` — the mechanism Leave uses; `POST /unarchive` stays live for this one caller, S4.38 Q19's *call the server immediately, undo calls unarchive*. After the toast, the trip is gone from the traveler's view.

**Q10 — What does deleting a trip take with it?** (a) the record survives — diary and postcards stay, cards lose the trip link; reverses S4.23's *"the diary list joins the fence"* · (b) the record goes with it. Recommended (a).
**Founder:** *"q10 -a"*
**Reading.** The record survives. `feed`, `profile` (both diary paths) drop their archived filter on postcards and diary sections; the `diary` module was already right. The reader-side archive rule **narrows to the published Itinerary and links to it**: the Itinerary page, Discover, the profile's *itineraries* tab, the join teaser, and the trip link on a postcard card. That is the coverage guard's exact scope.

**Q11 — The wire: three ADR-008 items.** (i) the owner's write to an archived trip goes 409 `TRIP_ARCHIVED` → 404, `TripArchivedException` deleted with its two client branches; (ii) `POST /unarchive` and `GET /v1/trips?archived=true` stay on the wire and keep working; (iii) an old client deep-linking into a deleted trip gets the not-found screen. Recommended (a), on the founders-own-clients ground S4.23 renewed.
**Founder:** *"q11 - a"*
**Reading.** All three. ADR-017's S4.23 amendment — the owner's exception — is superseded.

**Q12 — The client half rides in TW-2.** Recommended (a).
**Founder:** *"q12 - a"*
**Reading.** One branch; the client subtraction is its own ticket; the LAN-phone walk covers Delete → gone → Undo → back, and an owner's deep link into a deleted trip.

**Q8** — skipped in this round; asked again in Round 3.

---

## Round 3 — the owner, measured (2026-09-18)

**Measurement, before asking.** Seventeen owner-only sites in the tree: lifecycle (`TripService:340`), details (`:263`), days (`DayService:197`), remove member, archive/unarchive, offer/revoke ownership (`MembershipService:89/163/210/241`), destroy (`TripDestructionService:59`), publish/preview/unpublish (`ItineraryObjectService:72/106/117`), read/answer the join queue (`JoinService:240/386`). **Every one renders `NOT_PERMITTED`** with a per-act message — `trip.exception.NotTheTripOwnerException` (five factories plus free-text constructors) and a second `NotTripOwnerException` nested in `join`'s `JoinExceptions` (epic map line 354's duplicate).

**Q8 — Three riders:** (i) `trip`'s outbound allowlist · (ii) `Membership`'s constructor sealed by ArchUnit · (iii) `AudienceFenceCoverageTest`'s name-set shrinks. Recommended (a) all three.
**Founder:** *"q8 a"*
**Reading.** All three ride.

**The founder's question:** *"general question - shouldnt this fence for the trip if we talk about the owner be in the constructor rather be cited in the method / function?"*

**Answer given.** Yes for the owner, no for the room, and the reason separates them. The owner is a fact about the `Membership` already in hand — no port, no database — so `Owner` can be a **self-validating value**: `Owner.of(membership, refusal)` is its constructor, it throws or it exists, and holding one is the check. Archived and published are facts about the database; a value that queried Postgres in its constructor would break *accept dependencies, don't create them* and be untestable without a container — so those proofs are born from the fence, whose **constructor** takes the two ports, once, at wiring. Service methods still *take* the proof as a parameter — that is not the check being cited, it is the signature declaring the requirement, and it cannot move into a service's constructor because services are singletons built at boot and the proof is per request. The *capability object* reading (construct once, call acts on it) was argued against: publish is `itinerary`'s act, archive `trip`'s, answering a join request `join`'s — one object holding them all crosses three module lines.

**Q16 — Did I read you right?** (a) `Owner` a self-validating value; state proofs from the fence whose constructor takes the ports; services take proofs as parameters · (b) the capability object · (c) something else.
**Founder:** *"q16 - yes"*
**Reading.** (a). The fence drops from seven doors to six; the role door is `Owner.of`.

**Q13 — How `Owner` composes with the state proofs.** (a) `Membership` and `Owner` both a `Standing`; state proofs typed by it — `Editable<Owner>`, `Writable<Membership>` · (b) eight flat types.
**Founder:** *"q13 - a"*
**Reading.** Generic over the standing; one door per fact; a third role extends `Standing` without touching the doors. Reads `fence.editable(Owner.of(m, refusal))`.

**Q14 — Role before state, or state before role?** With archived = 404 for everyone, mask-before-permission holds in either order; what is left is which refusal a *member* gets on a published trip's owner-only act.
**Founder:** *"q14 - a"*
**Reading.** Role first — and with Q16 it is not a choice: `Owner.of(...)` is evaluated as the argument before the door runs. A non-owner hears *only the owner can…* regardless of state, which names the thing they could act on.

**Q15 — One owner-refusal type.** Unify `join`'s nested class into `trip.exception.NotTheTripOwnerException` (two more factory methods; `join`'s allowlist already names `trip..`).
**Founder:** *"q15 - a"*
**Reading.** Unified; epic map line 354 closes as a side effect.

**Consequences stated in this round, accepted by silence:** the reader-side rule's scope (under Q10); `unarchive`, `archive` and `destroy` take `Owner` and no state proof — they are the whole bare-role list the ratchet test counts; `AuthorizationGuard.requireMember` still resolves a membership on a deleted trip, or undo could not mint its `Owner`.

---

## Round 4 — the record's write side (2026-09-18)

**Measurement, before asking.** `TripApi.frozen(tripId)` (`TripFactsService:176` → `workspaces.isArchived`) is a **fourth port for the archive fact**, and `PostcardService.requireWritable(postcard)` at line 342 is a **ninth hand copy** — it freezes the author's own postcard edits (recaption, place, add/remove photo) whenever the source trip is archived. Two routes create postcards: trip-rooted (`/v1/trips/{tripId}/days/{dayId}/postcards`, through the room) and diary-rooted (`/v1/diaries/{diaryId}/days/{dayId}/postcards`, through the record).

**Q17 — Can the author still edit their own postcards after deleting the trip?** (a) yes — a postcard's only guard is authorship; `requireWritable(postcard)` is deleted; the diary-rooted route keeps working · (b) read-only until undo.
**Founder:** *"q17 - postcards, yes. because these are not anchored anymore from the trip. it just gets it data from the trip."*
**Reading.** (a), and the founder's sentence is the domain statement: **a postcard is not anchored to the trip; it takes data from it.** The trip is a postcard's data source (the teaser, the day, the activity snapshot), never its container — the Diary is. Written into the glossary's Postcard row. The trip-rooted creation route correctly 404s on a deleted trip (it goes through the room); the diary-rooted one does not.

**Consequences stated in this round, accepted by silence:** the owner loses their exception on the published page too (`ItineraryObjectService:178` — which used the Itinerary's *frozen* `ownerId` and stopped matching after an ownership transfer; the wrinkle dissolves with the exception); `archived` on the wire stays and is always `false` for anything a client can reach; undo does not restore invitations voided at delete (`ArchiveVoidsInvitations`, S1.9 — a seconds-wide window, recorded not fixed); `profile`'s old `/diary/trips` drops its archived filter with the others rather than waiting to die inconsistent.

**The frontier was empty after Q17.**

---

## The settled model

1. **Archive is delete's implementation.** Not a feature, not a state a traveler sees. Delete archives; the toast's Undo unarchives; after the toast the trip is not found for everyone, its owner included. The client's archive surfaces are removed. `POST /archive` is what Delete calls; `POST /unarchive` and `GET /v1/trips?archived=true` stay on the wire (additive), the second dormant.
2. **A deleted trip takes the room, the plan and the published page.** The record — diary and postcards — survives, readable and author-writable; a postcard is not anchored to the trip, it takes data from it. The reader-side archive rule covers the published Itinerary and every link to it, nothing else.
3. **Two facts close a trip, with two owners.** The room is closed — `trip`, `workspace.state`. The plan is frozen — `itinerary`, a live Itinerary exists; the trip asks through a port it declares. The freeze's reason is a product rule: a published plan does not change under its readers.
4. **The Trip Fence mints proofs.** One final class in `trip.api`, constructed with the two ports; six doors — `inAudience`, `writable`, `editable`, `membershipMutable`, `unfrozen(tripId)`, `unfrozen(tripId, refusal)`; proofs nested with private constructors; archived is not-found at every door for every standing. `Owner.of(membership, refusal)` is a self-validating value; `Membership` and `Owner` are both a `Standing`; state proofs are typed by it. Role first, by construction.
5. **The status answers.** `WorkspaceState` is `ACTIVE | ARCHIVED`, the wire's `completed` a projection; `Trip` carries no `published`; the two dead columns drop.
6. **`common.authz` dissolves into `trip`.** `AudienceFence` goes with the fence, not to `identity` (ADR-039 decision 5 corrected). `PublicationState` splits: the port trip keeps (`isPublished`, `liveAmong`), the reads `itinerary.api` takes over. Riders: `trip`'s outbound allowlist, `Membership` minted only by the resolver, the coverage test's name-set shrinks, the two owner-refusal classes become one.

## Written from this record

- **`design.md`** — dated amendments in place: the status header; the ninth copy and fourth port; the principle section (Q3 → b); the fence's interface (`Owner` as a value, `Standing`, no role split in the mask); *"nothing a traveler can see"* struck; the open list marked settled.
- **`docs/design/02-domain-model.md`** — *Delete (UI verb)* (archive is delete's implementation; the Archived list and banner leave; Undo calls unarchive) · *Active (workspace)* (`completed` on the wire is a projection) · *Postcard* (not anchored to the trip; author-writable across a deleted trip) · *Publish* (the freeze's reason).
- **`docs/design/adr-log.md`** — **ADR-040** (this story's decision, as one piece) · ADR-017's S4.23 amendment superseded (the owner's exception) · ADR-018 amended with the freeze's reason · ADR-039 decision 5 corrected (`AudienceFence`).
- **`docs/design/07-epic-map.md`** — line 187 folded into TW-2; line 198 pulled as TW-2; lines 212 and 354 ride in TW-2.
- **Not written yet, by the workflow:** the spec (`/to-spec`), the tickets (`/to-tickets`), the BUILD_STATUS row (at the spec).

---

## Round 5 — the threshold replaces the proofs (2026-09-19 → 2026-09-22)

**Why a fifth round after the build.** Thirteen tickets built, PR #82 green, and the founder read the result: *"this trip fence is all over the place."* The measurement agreed with the reading and disagreed with the diagnosis — the fence itself is one class, but its **proofs** reach 66 signatures, every one of which unwraps the proof on its first line (`Membership member = editable.member()`) and proceeds as before TW-2. The mechanism centralised the decision and distributed the vocabulary. Three further measurements shaped the round: **seven proofs are minted and discarded** (`TripController:93`, `TripMembershipController:48`, `TripInvitationController:64`, `InvitationService:196/354`, `JoinService:211`, `MembershipService:89`) — on those paths the fence is again a line you can delete with nothing going red, the exact failure TW-2 exists to close, and no guard catches it; **`Unfrozen` has zero consumers**; and of 42 wildcard proofs (`Editable<?>`) exactly one site does its own role check (`PollService.delete`, author-or-owner — a disjunction no standing can express), so the wildcards were honest, and `Editable<Membership>` would have been *worse* (it excludes `Editable<Owner>`). The founder's own words for what he wanted, from the 2026-09-10 conversation: *"the guard should be in the status"* — an API gateway, not a ticket system. He also asked whether the room should be its own module (twice, in both directions); the aggregate test settled it (Q28).

**Q18 — The record.** Continue TW-2 (a round on this file, dated amendments to `design.md`/`spec.md`, ticket 14) or a new story id?
**Founder:** *"agreeing with your reco"* (all of Q18–Q28).
**Reading.** Continue TW-2. ADR-040, V58, the relocation and the surviving record are all TW-2's and none moves; only the mechanism does. `git log --grep TW-2` finds the whole branch.

**Q19 — The words** *(domain-modeling: the glossary defined none of the story's vocabulary; "gate" had 22 hits, every one the promotion gate)*. **Fence** — the two closing rules as one object with two ports · **Room** — the workspace as an audience, open or closed · **Door** — a handler's declaration of which rule its act passes through *(meaning changes: was a proof-minting method)* · **Threshold** — the route-scoped application of the fence, once per request · **Proof**, **Standing** — retired.
**Reading.** Adopted; *threshold* over *gate* (collision) and over the founder's *gateway* (an infrastructure word suggesting a process boundary this is not). Four rows written to `02-domain-model.md` beside *Membership*.

**Q20 — The threshold's scope.** Exactly `/v1/trips/{itineraryId}` and `/v1/trips/{itineraryId}/**` — the 13 measured controllers plus `ItineraryController`'s four `/v1/trips/{tripId}/…` handlers (publish, unpublish, preview, itinerary). Excludes `/v1/trips` (list, create), `/v1/itineraries/**` (object ids — the public page, fork, object destroy), `/v1/itineraries/{id}/diary/**` (trip-addressed under a prefix that carries object ids elsewhere; sunsets at CM-5), `/v1/join/**`, `/v1/invitations/**`, WebSocket.
**Reading.** One pattern, one meaning: *a trip named by its id*. Anything trip-addressed elsewhere is an outlier by definition (Q24).

**Q21 — Universal checks and the doors.** For **every** request under the scope, GET included: resolve `Membership` (mask on none), refuse a closed room (mask), hand the `Membership` in. `inAudience` and `writable` stop being declarations — a request that reached a handler has passed both. A door names only the publication rule: **OPEN** · **EDITABLE** → `ITINERARY_PUBLISHED` · **MEMBERSHIP_MUTABLE** → `MEMBERSHIP_FROZEN`.
**Reading.** The room being closed is a fact about the *address*, not the act — one 404 for a read, a vote and a rename — so it belongs on the route, not on ~50 handlers. The three-door enum keeps *which writes survive publication* a greppable product fact. Measured: 26 of today's mints check room only, 29 check both, 2 publication only.

**Q22 — An undeclared write under the scope.** (a) refuse — `IllegalStateException` naming the handler, a 500 in that act's own IT on first call · (b) treat as `EDITABLE` · (c) allow, rely on the guard test.
**Reading.** (a). A missing door is a build error surfacing at runtime and should look like one, never like a refusal a client could receive. The guard test (Q31) is the second net; default-deny is the first.

**Q23 — `Owner`.** Stays `Owner.of(member, refusal)` in the handler; owner-only services keep taking `Owner` (~15 signatures); every other service takes `Membership`.
**Reading.** Q16 stands — the owner is a proof — and it is the one type-level guarantee with no ceremony cost. With the threshold applying the mask before the handler runs, Q11/Q14's ordering holds with a single minting path; `fence.owner(...)` (the seventh door minted at ticket 04) retires.

**Q24 — The outliers.** Trip-scoped acts the threshold cannot reach — join request/teaser by token, invitation accept/revoke by invitation id, the legacy diary routes — resolve their trip themselves and call the fence explicitly (`requireOpenRoom` / `requireUnfrozen(tripId, refusal)`); a ratchet test counts them.
**Reading.** Explicit and counted. These are the seven discarded proofs, and this is what they were trying to be: the same checks without pretending to carry a type nobody reads. **WebSocket is not an outlier** — measured after the founder answered: `TopicSubscriptions` reads `tripIdsInSightOf`, which already excludes archived trips, and `guard.membershipOf`; it consults no fence today and needs none.

**Q25 — What `TripFence` becomes.** Keeps its name and both ports; its doors become two `void` checks — `requireOpenRoom(tripId)`, `requireUnfrozen(tripId, refusal)`; the five proof classes, `Standing`, the generic parameter and `TripFence.owner(...)` are deleted; `TripFenceConfig` unchanged. The threshold is the Spring side; the fence stays a plain object.
**Reading.** Two lambdas test it, the threshold and the outliers share one entry, and the two ports stay the only way a foreign fact enters.

**Q26 — The ADRs.** Amend **ADR-040** (title drops *"proofs the Trip Fence mints"*; a dated paragraph: mechanism replaced, decisions untouched) and **ADR-011** (the call-site discipline that was its seam — *every controller calls `requireMember`* — becomes *the route calls it, once*); **ADR-039 decision 5** gains a line for the `trip.room` named interface (Q28). No new ADR.
**Reading.** Revises three recorded decisions; makes none.

**Q27 — The ticket.** Ticket 14 written from this round: the threshold, resolver and annotation as its first commit, one commit per consumer module after (the tickets 06–10 shape), the deletions last; tickets 03, 04 and 06–11 each take one dated line pointing at 14.
**Reading.** The spec's decisions hold; decision 8 is amended in place. Re-running `/to-spec` and `/to-tickets` would re-derive a spec 90% unchanged.

**Q28 — Where the room lives** *(the founder asked for a separate module, then "within the trip", then a separate module again; this question governed Q26/Q27 only)*. (a) a separate `room` module `trip` depends on · (b) inside `trip`, its types moved from `trip.api` to a **`trip.room` named interface** · (c) inside `trip.api` as today.
**Reading.** (b). **The aggregate test decides it**, and it is ADR-002's own rule — *modules = the domain aggregates*: the trip and its room are created in one transaction (`formAround` inside `TripService.create`; `WorkspaceFormationRollbackIT` pins the rollback) because INV-4 spans them, and destroyed in one; two things born and destroyed together under one invariant are one aggregate, so one module — TW-1's ruling twelve days earlier, reached again from the other side. (a) would buy the same dependency graph at the price of the formation transaction (ADR-038 rule 3 exception 7) and a cross-module FK. (b) gives what the founder actually asked for — *decouple the room; the trip needs it* — as a second named interface: `chat`'s and `poll`'s allowlists name `trip.room..` and never `trip.api..`, the build enforces it, and the aggregate stays whole. V58 had already dissolved TW-1's *other* reason (lifecycle no longer writes the workspace); one reason is enough. The founder asked *"what do you mean by aggregate?"* and the answer is on the record above this line in prose: *a cluster of rows a rule spans that must hold after every transaction — born together, die together.*

**Consequences stated in this round, accepted:** the wire is byte-identical and no client file changes · the ~50 controller ITs pass **unedited** and the assertion-line diff stays in its four categories — the neutrality proof, as at ticket 03 · every consumer module's `trip` imports shrink to `Membership` (and `Owner` where owner-only), all from `trip.room` · `AuthorizationGuard` keeps its signature, gains one caller (the threshold) and loses 57 · `Unfrozen` dies with the proofs, unmourned.

**Round 6 waits on nothing further from the founder except three answers** (below), and two facts are already in hand: `archive` on an already-archived trip answers `IllegalWorkspaceTransitionException.alreadyArchived()` today, so `archive` needs the closed-room opt-in as much as `unarchive` — or that 409 would silently become a 404; and `ChatClosedException` has a no-arg constructor, so an annotation attribute can name it.

---

## Round 6 — the last three (2026-09-22)

**Q29 — Which acts reach a closed room.** Recommended: `archive`, `unarchive`, `destroy`, each with an explicit opt-in, counted by a test — on the ground that `archive` on an archived trip answers *already archived* today and the mask would turn that into *not found*.
**Founder:** *"deleting an already deleted trip doesnt make sense. where are we getting to with this"*
**Reading.** The founder is right and the recommendation was wrong in a useful direction: it protected an answer nobody should be able to hear. Under ADR-040 a deleted trip is not found for everyone; *"already deleted"* is a second answer for the same state, and it leaks that the trip exists. **So `archive` on a deleted trip answers the mask, and `IllegalWorkspaceTransitionException.alreadyArchived()` retires** — measured: nothing in `backend/src/test` or `mobile/e2e` asserts it, so it costs no assertion. **`destroy` follows the same rule**: it has no archive check today (it takes only `Owner`), so a `DELETE` on a deleted trip currently succeeds; after the threshold it is not found. Consistent with the founder's sentence — deletion of a deleted thing is not an act — and recorded here for the parked 30-day-bin story, which will want a *scheduled* destruction of archived trips that does not go through this route. **Only `unarchive` — Undo — reaches a closed room.** One act, one opt-in annotation (`@ReachesClosedRoom`), and the counting test pins the count at one. *[Corrected 2026-09-22 at ticket 14's build, by seventeen red ITs on the threshold commit: **three** acts reach a closed room — Undo, **self-leave** (spec user story 8, decision 9's bare-standing list, asserted by three ITs this reading had forgotten) and the **edit-lock release** (`ArchiveWriteFenceIT`, "releasing is not fenced though acquiring is"). The rule they share is that **withdrawing your own footprint is always possible**; removing someone else's is not withdrawal and keeps both checks. Two more measurements this reading got wrong: `alreadyArchived` **was** asserted, by two ITs (`TripArchiveContractIT`, `ArchivedTripListIT`), and destroy-on-archived by one — all three flip to the mask under this ruling. And a fact Q20 did not have: `GET /v1/trips/{tripId}/itinerary` is the published page by trip id, readable by any traveler — the scope's one exception, declared on its handler as `@PublicFace`. The threshold also unifies the mask's code: the new-world routes answered strangers `TRIP_NOT_FOUND`, the trip's own answered `ITINERARY_NOT_FOUND`; there is one code now, and the client already treated the two as one. Every flipped assertion is on ticket 14's table.]*

**Q30 — Chat's own refusal at publish.** Recommended: an optional `refusal` attribute on the door so chat can keep answering `CHAT_CLOSED` on a published trip.
**Founder:** *"chat should not close"*
**Reading.** A **product ruling, reversing a recorded one**: the epic map (line 187, *found on the way* (3)) lists *"chat closes at publish"* among the three rulings anchored to publish, and ADR-018's freeze reasoning names it. From this round **publishing a trip does not close its chat**; the only thing that ends a chat is deleting the trip, which makes it not found. Chat's send handler takes the **OPEN** door; `ChatClosedException` retires; the custom-refusal attribute is **not built** — nothing under the threshold would use it, and Q24's outliers (join's `LinkClosedException`) pass their refusal as an argument to the fence, which needs no annotation. **This is a wire-visible loosening** — `POST …/chat/messages` on a published trip answers 201 where it answered 409 `CHAT_CLOSED` — additive under ADR-008 (a refusal removed, nothing renamed or retyped), and it is the **one deliberate fifth shape** in the assertion-line diff, named in advance: two backend ITs (`ChatDeliveryIT`, `ChatContractIT`) and two Playwright specs (`e2e/api/chat.spec.ts`, `e2e/web/chat.spec.ts`) flip from asserting the refusal to asserting delivery. Zero mobile source files encode the closing — the app never told a traveler chat was closed, so there is no copy to remove. Written to the glossary's *In-trip Chat* row, the epic map's line 187, and ADR-018.

**Q31 — The guards.** Delete `OnlyTheFenceMintsItsProofsTest` and `StandingIsMintedAndDemandedTest` (they guard the retired proofs); keep `OnlyTheFenceRefusesTest` and `ArchiveDominatesPublishCoverageTest`; add four — every write under the threshold declares a door · nothing under the threshold resolves membership on its own · exactly one act reaches a closed room · the fence's outliers are exactly Q24's list.
**Founder:** *"yes"*
**Reading.** Adopted. Each new guard is sabotage-checked before its ticket closes, in the story's established pattern — and the first sabotage is the one to distrust, after `OnlyTheFenceRefusesTest`'s needle let a fully-qualified `new` through at ticket 11.

**The frontier is empty after Q31.**

## The settled model, amended by rounds 5 and 6

Items 1, 2, 3 and 5 stand. **Item 4 is replaced:** *The Trip Fence is two rules, applied once at the Threshold.* One plain object in `trip.room`, constructed with the two ports, two `void` checks. The Threshold — one interceptor on `/v1/trips/{id}` and beneath — resolves the Membership, applies the mask for a missing membership or a closed room, reads the handler's door (`OPEN` · `EDITABLE` · `MEMBERSHIP_MUTABLE`; an undeclared write is a server error), and hands the Membership to the handler as a value. Three acts reach a closed room — Undo, self-leave and the edit-lock release — the ones that withdraw the caller's own footprint (Q29 as corrected at the build). One route is the trip's public face and is not the room's (`@PublicFace`). Owner-only acts mint `Owner.of(member, refusal)` in the handler and their services take `Owner`; every other service takes `Membership`. The acts no trip id addresses — join by token, invitation by id, the legacy diary routes — call the fence themselves and are counted. **Item 6 gains a clause:** the room's types (`Membership`, `Role`, `Owner`, `AuthorizationGuard`, `MembershipResolver`, `TripFence`, `ArchiveState`, `PublicationState`, `MembershipApi`, `MembershipView`, the roster events) publish as the **`trip.room`** named interface; a module that needs only the room names only `trip.room..` in its allowlist. **New item 7:** *Publishing does not close chat.*

## Written from rounds 5 and 6

- **`02-domain-model.md`** — *Membership* amended · **Room**, **Fence**, **Door**, **Threshold** added · *In-trip Chat* amended (Q30).
- **`design.md`**, **`spec.md`** — dated amendments to the mechanism (decision 8), the structure, and the guard list; nothing else moves.
- **`adr-log.md`** — ADR-040 retitled and amended · ADR-011 amended (the seam is the route, not the controller) · ADR-039 decision 5 gains `trip.room` · ADR-018 amended (chat no longer closes).
- **`07-epic-map.md`** — line 187's *(3)* loses *chat closes at publish*.
- **Ticket 14** — the build, one commit per module; tickets 03, 04, 06–11 each take a dated pointer.
