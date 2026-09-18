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
