# TW-2 — The Trip Fence: archive becomes delete's implementation, the two rules that close a trip become proofs the fence mints, and `common.authz` dissolves into `trip`

**Status:** ready-for-agent — grilled 2026-09-17→18 (`/grill-with-docs`, four rounds, seventeen questions plus one the founder asked back; the record is `grilling.md` beside this file and every decision below cites it); designed 2026-09-15 in `design.md`, amended in place by the grilling where they differ; written at `/to-spec` on 2026-09-18 with the five test seams confirmed by the founder (*"yes all good"*). **Sliced into thirteen tickets at `/to-tickets` on 2026-09-18** — the breakdown approved with one change (*"i think we can split 06"*: the consumer-module migration became five per-module tickets) — under `issues/`, numbered in dependency order: 01 the status answers · 02 the relocation · 03 the fence is born · 04 `trip` takes the proofs · 05 the record survives · 06 chat · 07 poll · 08 invitation · 09 join · 10 itinerary · 11 contract and the guards · 12 the client · 13 the gate.
**Grilled:** against the tree at `01a0afc2` (S4.41 merged). Where the record and this spec differ, the record wins.
**ADR:** **ADR-040 minted** — archive is delete's implementation, and the trip's two closing rules become proofs the Trip Fence mints. Amended with the record: **ADR-017** (the S4.23 owner's-exception amendment is superseded — archived answers not-found for every standing), **ADR-018** (the freeze's reason is written down: a published plan does not change under its readers), **ADR-039** decision 5 (`AudienceFence` dissolves into the trip fence, not `identity.api`). **ADR-008:** one path changes meaning — an owner's write to an archived trip answers 404 where it answered 409 `TRIP_ARCHIVED` — waived on the standing founders-own-clients ground the S4.23 amendment itself renewed; every other wire change is additive or dormant.
**Candidate-capability note:** none. A fence, a soft delete's undo and a kernel relocation — none is a capability, footprint-growing, or governance. Deleting one's own trip was never a gated act and is not one here.
**Freshness note:** no surface changes lane. The Trips root stays **live over the traveler topic** (S4.35, S4.41) and the delete and undo mutations refetch it as the archive mutation does today; the published Itinerary, Discover, Home and the public Profile stay **focus-fresh pull** as ruled at S4.35, and a deleted trip's page disappearing from them is a pull-fresh fact; nothing is deliberately static.

## Problem Statement

A traveler who deletes a trip is shown a feature they never asked for. The trip does not go away: it moves to an *"Archived trips"* list on the Trips tab, opens into a banner that says *"Archived — this trip is read-only. Unarchive it to make changes"*, and offers an Unarchive button — vocabulary and controls the founder ruled were only ever a placeholder for delete: *"trip archive is not a feature. it was a workaround that was implemented for a placeholder to delete."* Meanwhile the delete itself has no undo, although the story that shipped it specified one. And because a *deleted* trip was modelled as an *archived* one, the traveler's own diary and postcards from that trip vanish from Home and from their profile — for them and for everyone — even though the trip having happened is not something a deleted plan can undo.

Underneath, the two rules that close a trip — an archived trip cannot be written to, a published trip's plan and roster cannot change — are enforced by whichever service remembers to ask. CM-5 moved three acts between modules and each left its check behind in the old caller; an archived trip could be published, and 1,341 integration tests said nothing. Measured at this story's pull, the same two facts are re-derived by hand at nine sites in five modules beside the fence's four `void` doors, and the archive fact is reachable through four different ports. The trip's authorization model lives in the shared kernel under the kernel's name, so nine modules depend on `common` to reach something that is `trip`'s.

## Solution

Delete a trip and it is gone — for everyone, the owner included — with one way back: the toast's **Undo**, for the toast's lifetime. Archive is how delete is implemented and nothing a traveler sees; the Archived Trips list, the banner and Unarchive leave the client. A deleted trip takes its room, its plan and its published page. The record survives: the traveler's diary and postcards stay where they were, readable and theirs to edit, because *a postcard is not anchored to the trip; it takes data from it*.

Underneath, one **Trip Fence** answers whether a trip's surface is open, and answers with a **proof** — a type only the fence can construct, which every act on a fenced surface demands in its signature. An act that forgets to ask has nothing to pass and does not compile. The owner is a proof too, a self-validating one. The fence and the trip's authorization model move out of the kernel into `trip`, where they belong; the workspace's state becomes the one fact it is (open or archived), and the trip stops carrying a `published` flag that nothing writes.

## User Stories

**Deleting a trip**

1. As a trip owner, I want Delete to remove the trip from my Trips and from everyone else's, so that a trip I no longer want is simply gone.
2. As a trip owner, I want an Undo on the "Trip deleted" toast, so that a slip of the finger costs nothing.
3. As a trip owner who pressed Undo, I want the trip back exactly as it was — lifecycle, members, plan, chat, polls, published page — so that undo means undo.
4. As a trip owner who let the toast expire, I want the trip to stay gone, so that Delete means what it says.
5. As a trip owner, I want no "Archived trips" list, no archive banner and no Unarchive button anywhere, so that the app does not present a filing cabinet I never asked for.
6. As a trip owner who follows a stale link or an old notification into a deleted trip, I want the ordinary not-found screen, so that a deleted trip is not a special half-visible state.
7. As a trip member whose owner deleted the trip, I want it gone from my Trips and its pages to answer not-found, so that I am not shown a room that has closed.
8. As a trip member, I want to be able to leave a trip whether or not the owner has deleted it, so that a closed room never traps my membership.
9. As a traveler holding a join link to a deleted trip, I want the link to read as closed, so that I am not offered a room that no longer exists.

**The record survives**

10. As a traveler who deleted a trip, I want the diary and postcards from that trip to stay on my profile and in Home, so that deleting a plan does not erase a trip that happened.
11. As a traveler who deleted a trip, I want to keep recaptioning, placing, adding and removing photos on those postcards, and deleting them, so that my record stays mine to edit.
12. As a traveler reading a postcard from a deleted trip, I want the card to stop linking to the trip's page rather than link to a page that is gone, so that no card points at a dead end.
13. As a stranger reading Discover or a shared link, I want a deleted trip's published page to be gone, so that a page nobody stands behind is not on offer.
14. As a traveler who pressed Undo, I want the published page back at its old address, so that links I shared before still work.

**Publish and the plan**

15. As a trip owner who published, I want the plan and the roster frozen while the page is live, so that the itinerary strangers read does not change under them.
16. As a trip owner who wants to change a published plan, I want unpublish to be the deliberate act that thaws it, so that a live plan changes only on purpose.
17. As a trip member on a published trip, I want a plan or roster attempt refused with the same words as today, so that the rule reads the same after the story as before.
18. As a trip member on a published trip, I want chat to answer that it is closed, in chat's own words, so that the freeze speaks the surface's language.
19. As a traveler accepting an invitation to a published trip, I want the same refusal as today, so that nothing shipped changes its meaning.

**Who may, and what is open**

20. As a trip member who is not the owner, I want an owner-only act to tell me *only the trip owner can…* before it tells me anything about the trip's state, so that the refusal names the thing I could act on.
21. As a trip owner, I want the owner-only refusals to keep their exact codes and messages, so that nothing shipped moves.
22. As a client reading a trip, I want `workspaceState` to keep saying `active`, `completed` or `archived` exactly as before, so that the chip that reads `completed` never moves.
23. As a client, I want every error code I handle today to keep existing, so that an old build keeps working; a code that stops being emitted on one path is the one change, recorded.

**Building on it**

24. As an engineer adding an act to a fenced surface, I want the compiler to refuse an act that did not pass the fence, so that the CM-5 class of regression cannot ship.
25. As an engineer moving an act between modules, I want the fence to travel with the act's signature, so that no caller is left holding the guard.
26. As an engineer adding a surface with its own refusal, I want to take the freeze fact from the fence and name my own refusal, so that one place knows what publish closes.
27. As an engineer adding a role, I want to add a standing without touching a door, so that the fence's interface does not grow per role.
28. As an engineer, I want to construct a `Membership` only through the resolver, so that a forged membership is a compile-time or build-time refusal rather than a possibility.
29. As an engineer reading `common`, I want it to hold only what every module needs, so that the kernel's name is not a lie.
30. As an engineer reading `Workspace`, I want its state to be open or archived and nothing else, so that a lifecycle fact is stored once.
31. As an engineer reading `Trip`, I want no `published` field, so that there is one truth about publication and it lives on the Itinerary.
32. As an engineer running the suite, I want the migration proven against planted rows, so that a rewrite that runs against zero rows everywhere else is not green by accident.
33. As an engineer reviewing the branch, I want every changed assertion at the wire to trace to a grilled decision, so that a regression cannot hide inside a relocation.

## Implementation Decisions

Numbered decisions cite the grilling record's questions as **[Qn]**.

1. **Archive is delete's implementation, not a feature [Q1, Q2].** Delete archives the trip; the toast offers Undo for its lifetime and Undo unarchives — the mechanism the removal flow already uses for Leave, and the behaviour S4.38 specified with the archive-backed verbs calling the server immediately (*"call the server immediately; toast Undo calls unarchive"*) [Q9]. After the toast a deleted trip is gone from the traveler's view with no way back in the client. The 30-day bin stays parked on the epic map.

2. **The client's archive surfaces are removed, in this story [Q2, Q12].** The *Archived trips* link on Trips and the Archived Trips screen; the archive banner and its Unarchive control on the trip; the archive/unarchive confirm wording; the archive-control helper and its plan-editability twin; the archived chip; the `'archived'` posture wherever a tab or section computes one; the two client branches keyed on `TRIP_ARCHIVED`; the screen label for the archived route. What remains is Delete → archive → toast with Undo → unarchive. A deep link into a deleted trip renders the existing not-found handling.

3. **A deleted trip answers not-found for every standing, at every door, its owner included [Q11].** The S4.23 owner's exception (*"the trip legitimately exists for them"*) is superseded: it does not. The mask keeps no role split. `TRIP_ARCHIVED` is no longer emitted and its exception type is deleted; `ITINERARY_NOT_FOUND` is the answer. The authorization guard still resolves a membership on a deleted trip — it must, or Undo could not mint the owner's proof — and the doors, not the guard, answer 404.

4. **The wire, three items [Q11].** (i) One path changes meaning: an owner's write to an archived trip goes 409 → 404. (ii) `POST …/unarchive` and `GET …?archived=true` stay on the wire and keep working — the first as Undo's one caller, the second dormant. (iii) `archived` stays on every response that carries it and is `false` for anything a client can now reach. `workspaceState` keeps its three values (decision 12).

5. **A deleted trip takes the room, the plan and the published page; the record survives [Q10, Q17].** Diaries and postcards from a deleted trip stay readable everywhere they appear — Home, the profile's diary surfaces, the diary and postcard pages — and stay **writable by their author**: recaption, place, add and remove photos, delete. A postcard's only guard is authorship; the freeze that today refuses an author's own edits when the source trip is archived is deleted and nothing replaces it. The founder's sentence is the rule: *a postcard is not anchored to the trip; it takes data from it* — the Diary is its container, the trip a data source for its teaser and provenance. Creating a postcard **through the trip** (the trip-rooted route, through the room) correctly answers not-found on a deleted trip; creating one **through the diary** keeps working. S4.23's *"the diary list joins the fence"* is reversed: the feed and both profile diary paths drop their archived filter on postcards and diary sections, and the `diary` module — which never had one — stands as it is.

6. **"Archive dominates publish" stays reader-side, and its scope is now exact [Q1, Q10].** No proof can be demanded of a stranger reading Discover, so the published Itinerary's readers keep consulting the trip module's archived set through the one door `trip.api` already offers (the batch call and its single form). The scope is **the published Itinerary and every link to it**: the Itinerary page, Discover's lists and counts, the profile's *itineraries* tab and its counts, the join teaser, and the trip link on a postcard card — which otherwise points at a page that 404s. Nothing else. A coverage guard asserts the scope (decision 16). Suspending the Itinerary by event was rejected: four of the five surfaces are not the Itinerary. Undo restores the page at its address because nothing was retired.

7. **Two facts close a trip, with two owners.** *The room is closed* — a workspace fact, owned by `trip`, stored as the workspace's state. *The plan is frozen* — a live Itinerary exists, owned by `itinerary`, which the trip asks through a port it declares (decision 10). The freeze's reason is a product rule, now written into ADR-018: *a published plan does not change under its readers; republish is the deliberate act that changes it* [Q6]. Photo custody (the page resolves its photos live) and the three acts anchored to publish (chat closes, join links die, the published badge) are what it also protects, not why it exists.

8. **The Trip Fence: one final class in `trip.api`, constructed with two ports, minting proofs.** *[amended 2026-09-22, grilling rounds 5–6 (Q18–Q31), ticket 14 — **the proofs are replaced by the Threshold.** The fence keeps its two ports and becomes two `void` rules, `requireOpenRoom(tripId)` and `requireUnfrozen(tripId, refusal)`; one `HandlerInterceptor` on `/v1/trips/{id}` and beneath applies them once per request — membership resolved through the guard (mask on none), a closed room masked, the handler's **door** read (`OPEN` · `EDITABLE` · `MEMBERSHIP_MUTABLE`; an undeclared write is a server error), the `Membership` handed in through `@CurrentMember`. Services take `Membership`; owner-only services keep `Owner`. Only `unarchive` reaches a closed room. The room's types publish as the **`trip.room`** named interface. **Publishing no longer closes chat** (Q30). The shape below is the mechanism as built at tickets 03–11 and retired at 14; the decisions it encodes — mask outermost, two facts with two owners, the owner a self-validating value — all stand.]* The shape, from the design record as amended at the grilling — inlined because it encodes the decisions more precisely than prose:

   ```
   TripFence(ArchiveState room, PublicationState publication)

   inAudience(S standing)         → InAudience<S>          reads: room open, else not-found
   writable(S standing)           → Writable<S>            writes that survive publish: room open, else not-found
   editable(S standing)           → Editable<S>            plan, lifecycle, lease: writable ∧ no live Itinerary; ITINERARY_PUBLISHED
   membershipMutable(S standing)  → MembershipMutable<S>   roster: writable ∧ no live Itinerary; MEMBERSHIP_FROZEN
   unfrozen(UUID tripId)          → Unfrozen               acts by non-members: no live Itinerary; MEMBERSHIP_FROZEN

   every door has an overload taking the surface's own refusal (a Supplier of the exception),
   for surfaces whose shipped code differs: chat's CHAT_CLOSED on editable, join's link-closed
   and invitation's pending-list refusal on unfrozen.

   Standing         = Membership | Owner            Owner.of(Membership, refusal) — self-validating; NOT_PERMITTED
   proofs           = nested in TripFence, private constructors, carrying the standing (or the trip id)
   ```

   **Why each mechanism [Q3 b, Q13, Q14, Q16]:** the proofs are nested in the fence with **private constructors**, so nothing outside the fence can write `new Writable(...)` — that is the whole guarantee, and it is the only way to get it in Java without a module system; it is `InAudience`'s existing package-private trick, made robust to the move. The fence has **no Spring and no database**: two predicates on a trip id, wired once by a bean in the workspace slice; its test is two lambdas. **`Owner` is not a door but a self-validating value** — the owner is a fact about the `Membership` already in hand and needs no port; `Owner.of(membership, refusal)` throws `NotTheTripOwnerException` or exists. `Membership` and `Owner` both implement **`Standing`**, and every state door takes a standing and returns a proof typed by it — `Editable<Owner>`, `Writable<Membership>` — so one door serves every role and a third role extends `Standing` without touching the doors. **Role is checked before state by construction**: `fence.editable(Owner.of(m, …))` evaluates its argument first, so a non-owner hears *only the trip owner can…* regardless of state. **The fence proves state; the surface names its refusal** through the `Supplier` overload, so chat, join and invitation stop re-deriving the freeze [Q7].

9. **Service signatures take proofs, not memberships.** Reads on a workspace take `InAudience`; writes that survive publish (chat thread, polls, the photo dump, trip-rooted postcards) take `Writable`; plan edits, the editing session and lifecycle transitions take `Editable` — lifecycle as `Editable<Owner>`; publish, preview and unpublish take `Writable<Owner>`; roster changes take `MembershipMutable`, the owner-only ones as `MembershipMutable<Owner>`; accepting an invitation and requesting to join take `Unfrozen`. The acts that must reach a closed room — **archive, unarchive, destroy** — take `Owner` alone and are the whole bare-standing list; self-leave takes a bare `Membership` (S1.9's rule, upheld). A ratchet test counts both lists (decision 16). The controllers mint the proof and pass it; the nine hand copies of the two facts fold into doors or are deleted.

10. **The relocation — ADR-039 decision 5, corrected.** `common.authz` dissolves. Into `trip.api`: the authorization guard (**unedited**, its tests moving unedited as the proof of no semantic change), `Membership`, `Role`, the membership resolver port, the new `TripFence` and its proofs, `Standing` and `Owner`, `ArchiveState` (the writability port renamed for what it answers), and `PublicationState` — the port **trip declares and itinerary implements**, shrunk to what trip needs (is-published, live-among), because trip cannot call `itinerary.api` without a cycle. The reads everyone else takes from today's `PublicationState` (live-for, published-among) move to `itinerary.api`'s contract; chat, join and invitation need neither after decision 8. The editing-session question itinerary asks (is the plan under someone else's session) becomes a method on trip's plan contract. Into `trip.exception`: the freeze refusals and the not-found mask, where ADR-038 puts a module's refusals. **`AudienceFence` and `InAudience` dissolve into the fence**, not into `identity.api` — the class reads only the archive fact. `common` keeps error, id, tx, config, storage, security. Eight allowlists trade `common.authz` for `trip.api` + `trip.exception`; the trip module's boundary guard learns the fence is part of its front door; Modulith reports the same refusal count before and after.

11. **The two owner-refusal types become one [Q15].** `join`'s nested owner refusal folds into `trip.exception`'s as two more factory methods; every owner refusal renders `NOT_PERMITTED` with its per-act message as today. Epic-map line 354 closes as a side effect.

12. **The status answers: `WorkspaceState` is `ACTIVE | ARCHIVED` [Q4].** The `COMPLETED` value — a stored copy of the lifecycle's — leaves; unarchive no longer needs to be told what to restore; the workspace exposes *open*. **The wire's `workspaceState` becomes a projection**, byte-identical: `archived` when the room is closed, else `completed` when the lifecycle is completed, else `active`, computed where the response already holds both facts. A test pins all six combinations.

13. **`Trip` carries no `published` [Q5; the epic map's "TW-2 Q4"].** The field, its stamp, its writers, its reader and the entity's `requireUnpublished` — which read a column nothing writes and always passed — leave. The six readers that always answered `false` are re-pointed at the publication port or deleted. The guard that kept the column dead retires with it.

14. **Migration V58, one file, two statements, both stop-rule, both with the founder's yes on the record [Q4, Q5].** Rewrite `COMPLETED → ACTIVE` on the workspace and add a `CHECK` on the two remaining values; drop the itinerary's two dead publication columns. Destructive by design — the shape the founder accepted at S4.25 for `destinations`.

15. **The record's readers and the trip module's archived set.** `feed` drops its archived filter on postcards; the `profile` module drops it on diary sections in both of its diary paths (the old one too, rather than leaving it inconsistent while it waits to die); the `diary` module is unchanged. The published-Itinerary readers keep theirs (decision 6). The join teaser consults the archived set for its *closed* answer and takes its freeze from the fence.

16. **The guards born with the story — none a by-name exemption list, each sabotage-checked before it ships.** (i) *Only the fence refuses*: the freeze refusals and the mask exception are constructed only inside `TripFence` and `Owner.of` — this is what deletes the hand copies structurally. (ii) *Only the resolver mints `Membership`* [Q8 ii]. (iii) *The bare-standing ratchet*: the count of service methods taking `Owner` or `Membership` without a state proof is at most the count at close, the list printed in the assertion, never held as a set. (iv) *The wire projection*, six combinations. (v) *The reader-side coverage guard*: every public read of a published Itinerary or a link to one consults the archived set. (vi) The audience-fence coverage test's name-set shrinks to what proofs do not cover [Q8 iii]. (vii) The migration-stepping IT for V58. (viii) `trip`'s **outbound allowlist**, born naming `common`, `itinerary.api` and `identity` [Q8 i].

17. **Three passes inside one branch, one PR.** The **Workspace pass** (decisions 12–14) first — smallest, most stop-rule-dense, independent; the **relocation** (decision 10) second, mechanically, nothing changing shape so the diff reads as a move; the **reshape** (decisions 8, 9, 11, 15, 16) third; the **client subtraction and Undo** (decisions 1–2) its own ticket. Relocate before reshaping: moving code that is about to change shape means reading the same diff twice.

18. **Canon amended with the record, riding this branch:** ADR-040 minted; ADR-017, ADR-018, ADR-039 amended; glossary rows *Delete (UI verb)*, *Active (workspace)*, *Postcard*, *Publish*; epic-map lines 187 (folded), 198 (pulled), 212 and 354 (ride).

## Testing Decisions

**What makes a good test here:** it asserts what a caller sees — a status, a code, a body, a row, a rendered screen — never how the fence got there. The one exception is deliberate: the structural guards assert the *shape* of the source, because the property they protect (a forgotten check cannot compile) is a property of the source and of nothing a request can observe.

**Five seams, confirmed by the founder; four exist today.**

1. **The HTTP seam — the existing integration suite (primary).** `RestTestClient` against the real context and Postgres, the singleton container. Every traveler-reachable behaviour asserts here: 404 for the owner on a deleted trip; `ITINERARY_PUBLISHED`, `MEMBERSHIP_FROZEN`, `NOT_PERMITTED`, `CHAT_CLOSED` unchanged in code and message; `workspaceState` projected; Undo restoring writes for the whole roster and the page at its address; postcards editable and creatable through the diary after the trip is deleted, refused through the trip; Discover, Home and the profile behaving per decisions 5–6. The existing archive tests **change**, and each change is a grilled decision: `ArchiveWriteFenceIT` (the owner's honest refusal becomes the mask; role-then-state ordering), `TripArchiveContractIT` (*unarchive restores completed…* becomes the projection; the owner's edges), `ArchivedTripListIT` (the owner's archived view stays dormant-but-working), and the S4.23 posture spec (*the owner diary list still holds it* becomes *everyone's* diaries and postcards survive). **The proof for the branch is the assertion-line diff against `dev`** — the TW-1 and CM-5 gate precedent: every changed assertion traces to a numbered decision above, or it is a regression. Prior art: the classes just named; `LifecycleRespectsEditingSessionIT`; `DiscoveryFiltersIT`.

2. **The fence's own interface (the one new seam).** `TripFence` constructed with two lambdas; one test class walks every door × {room open, archived} × {no live Itinerary, live} × {`Membership`, `Owner`}, the refusal overloads, and `Owner.of` on both roles. No database, no Spring. Prior art: `AuthorizationGuardTest`, which moves beside it unedited. Nothing tests past this interface; if something needs to, the fence is the wrong shape.

3. **The structural guards (existing pattern).** ArchUnit and source scans per decision 16; the boundary guards and `ModulithVerificationTest` at the same refusal count before and after the relocation; `ApiIsNeverWireTest` unchanged (proofs appear in service signatures, never controller ones). Prior art: `PollModuleBoundaryTest`, `AudienceFenceCoverageTest`, `NothingWritesTheDeadPublicationFlagTest` (retires), `ModuleGuardMetaTest`.

4. **The migration (existing pattern).** A stepping IT with its own container: migrate to V57, plant `COMPLETED` workspaces and `published = true` itineraries by raw SQL, migrate to V58, assert the rewrite, the `CHECK`, and the columns' absence. Sabotaged once to prove it can fail, with `test-compile` in the goal list so the sabotage is the SQL actually loaded. Prior art: `TripAxesBackfillIT`, `DestinationAndCurrencyBackfillIT`.

5. **The client — the Playwright `web` project against the preview container, and Jest for pure modules.** The archive walk becomes the delete walk: Delete → toast with Undo → the trip back; Delete → gone from Trips, no *Archived trips* link, a deep link answering the not-found screen; a member's plan write on a published trip still refused. The archive-control unit test dies with its subject; the tab-routing test's *archived stays out of every tab* case stands; the removal-projection tests gain the undoable case. Then the **LAN phone walk** as `t1`: Delete and Undo with a real finger, a deep link into a deleted trip, a member (`t2`) seeing it gone. Prior art: the `web` specs and `removalProjection.test.ts`.

**Tiering** follows CLAUDE.md: scoped runs while iterating (`-Dit.test='com.largata.trip.**.*IT'` and the module being re-signatured), CI on every push, the full `npx jest` once before any push that adds a file under `src/`, the LAN walk at the gate.

## Out of Scope

- **The three remaining tab surfaces** (Home, Discover, Profile as read-surface modules) — their own story; cheaper after this one, since they read the publication port through the escape hatch this story closes.
- **A bin, a 30-day undo, or any traveler-visible archive** — parked; ADR-040's invalidating condition names the trigger. The dormant `?archived=true` query and the `/unarchive` endpoint stay on the wire for it.
- **The `postcard/legacy` deletion and the retirement of `profile`'s old diary path** — only their archived filters change here.
- **The Itinerary hardening story** the founder is still thinking about (epic map line 187's remainder: what archive should mean as a traveler act, if ever; whether the freeze moves when the Itinerary takes custody of its photos).
- **A third role** (contributor, editor) — `Standing` is the seam it would use; none is added.
- **Live editing, presence, or any change to the editing session** — the lease stays a runtime check inside the editing slice.
- **The Trips swipe-to-reveal defect on web** (epic map, S4.38, OPEN) — this story touches the Trips list, so its trigger fires again; the recorded next move is a devtools event-log session, not code, and it is **not** taken here. Recorded so it is a decision, not an omission.
- **The ownership-transfer wrinkle** on the Itinerary's frozen `ownerId` — the one place it showed (the owner's exception on the page read) dissolves with the exception; the frozen field itself is not revisited.
- **Trip search**, the S4.41 stub already removed.

## Further Notes

- **Two corrections to the design record, carried here so nobody rebuilds on them:** the record said *no screen lists archived trips* — the client had an Archived Trips screen, a link on Trips and a banner with Unarchive; and it said *nothing a traveler can see changes* — the archive surfaces leave, Delete gains Undo, and one wire path changes 409 → 404. Both are marked in `design.md` with dated amendments rather than rewritten.
- **The three stop-rule yeses are on the record** (grilling Q4, Q5, Q11): the authorization guard relocates, `workspace.state` loses a value, two dead columns drop. No ticket re-asks them.
- **Undo does not restore invitations voided at delete** (S1.9's archive-time voiding, a seconds-wide window) — recorded at the grilling, not fixed.
- **The branch lives in a worktree** (`../largata-TW-2`), because the shared checkout carried another agent's in-flight files at this story's start; the docs commit (`2b3784b5`) is its first.
- **The device rung this story owes** is the LAN phone walk in Testing Decisions 5; the native build stays blocked by the recorded workstation Gradle fault, and this story is JS-only on the client, so nothing here depends on it.

## Comments
