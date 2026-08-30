# CM-1 — The content module: four first-class objects, built dark

**Grilled 2026-08-27 → 2026-08-30, grill-with-docs, five rounds across two arcs** (the deletion arc that became S4.38's pivot, then the restructure arc this spec records). Companion visuals, both founder-reviewed: *The Trip Tree* (the domain hierarchy) and *The Content Module* (this story's architecture). Design direction is the founder's throughout; every ruling below is on the record in the grilling.

## Problem Statement

The backend's structure no longer matches the product's object model. Everything trip-related sits in one module — the trip, the plan, publishing, the diary, postcards, the feed, discovery, profiles, forks — so the objects travelers actually think in (Trip, Itinerary, Diary, Postcard) have no identity of their own. The consequences are product-visible: a published itinerary cannot outlive its trip, a member who leaves a trip can never withdraw their public postcards, "delete" can only ever be archive-deep (S4.38), and the confirmed future — diaries and postcards created without any trip — is structurally impossible. The founder's demand: build the correct object model now, as pure backend, without touching the running app.

## Solution

Build the new world **dark** beside the old, strangler-style. Four peer modules — `trip`, `diary`, `postcard`, `publication` — matching the house convention of small top-level modules. The three content objects get **new tables**; the trip gets **no new table** — TripService is new files over the existing trip records. Publish **mints** the itinerary object from the frozen plan; diaries auto-mint on first add-to-diary or are created standalone; postcards are the atom, trip-derived or standalone, living in at most one diary or loose. Real trip destruction ships at last — and the content objects survive it **by structure**, not by mechanism. The old world's files never change; the shipped app cannot tell CM-1 happened. A separate rewire story later cuts the app over, runs every backfill, and deletes the old files.

## User Stories

CM-1 is dark, so every story below is exercised at the API seam in this story; the screens arrive with the rewire and its successors.

1. As a trip owner, I want publishing to mint a real itinerary object from my frozen plan, so that the published page has an identity of its own.
2. As a trip owner, I want unpublishing to retire the itinerary object without destroying its identity, so that every link I ever shared works again the moment I republish.
3. As a trip owner, I want to delete a trip permanently, so that a trip that should not exist stops existing.
4. As a trip owner, I want deleting my trip to destroy the workspace world — plan, chat, photo dump, polls, memberships, invitations, join links, and their stored media — so that nothing collaborative outlives the collaboration.
5. As a collaborator on a deleted trip, I want my diary and postcards to survive the owner's deletion, so that my telling of the trip remains mine.
6. As a trip owner, I want my published itinerary to survive the trip's deletion, so that taking down my workspace never silently takes down my public page.
7. As a trip owner whose trip is gone, I want to delete the surviving published page on its own, so that an orphaned page is never unwithdrawable.
8. As a collaborator, I want a diary minted for me automatically the first time I add an activity to diary, so that I never fill in a form to start telling a trip.
9. As a traveler, I want to create a diary with just a title and no trip at all, so that I can collect postcards around a theme instead of a journey.
10. As a traveler, I want to create a postcard with photos, a caption, and an optional place — no trip, no activity — so that a moment doesn't need an itinerary to be worth posting.
11. As a traveler, I want to post a postcard without choosing a diary, so that a loose moment isn't blocked by an organizing decision.
12. As a traveler, I want a postcard to live in at most one diary, so that my collections stay simple and a postcard always has one home or none.
13. As a diary author, I want deleting a diary to delete the postcards inside it, so that removing a collection removes its contents in one act.
14. As a postcard author, I want to recaption my postcard by addressing the postcard itself, so that editing my content never depends on the trip around it.
15. As a postcard author, I want to delete my postcard at any time — even when its trip is archived — so that withdrawing my own public content is a right, not a permission.
16. As a member who left a trip, I want to delete the postcards I posted there, so that leaving never strands my content in public.
17. As a collaborator on a trip, I want at most one postcard per activity in my diary, so that my diary stays one telling of each moment (standalone postcards are unlimited).
18. As any traveler who is not the author, I want someone else's postcard to refuse my writes as if it didn't exist, so that authorship is the only authority over content.
19. As a trip member who is not the owner, I want trip deletion to refuse me by name, so that destructive authority stays with the owner and my recourse stays Leave.
20. As a stranger to a trip, I want its deletion endpoint to answer not-found, so that probing reveals nothing.
21. As a traveler who forked a published itinerary, I want my copy and its provenance row to survive the source's destruction, so that someone else's deletion never edits my history.
22. As a traveler using today's app, I want nothing about it to change while CM-1 lands, so that the rework carries zero risk to the product I'm using.
23. As the founder, I want the new object APIs fully specified in one contract document, so that every later UI story wires against a single reference.
24. As the next agent in this codebase, I want the new modules structurally unable to import the old world, so that the frozen boundary is enforced by a failing test rather than a promise.

## Implementation Decisions

**Structure — four peer modules, house convention** *(founder-ruled after weighing an umbrella `content` module; peers match the existing membership/invitation/join/chat/poll pattern)*:
- `trip` — TripService: the new grammar over the **existing** trip records. No new trip table, ever: a second trip table would dual-home every write of the running app. The trip's destruction endpoint lives here.
- `diary` — Diary entity + DiaryService. New table. Title-only in v1; many per traveler; auto-minted by the trip-derived postcard flow, or created standalone.
- `postcard` — Postcard entity + PostcardService. New table. The atom: photos + caption + optional place; trip-derived (activity snapshot, one per activity per traveler) or standalone (unlimited); references at most one diary, or none.
- `publication` — the itinerary object + ItineraryService. New table. **Working name**: `com.largata.itinerary` is the frozen old world, so the package cannot take that name yet; the founder's "build it first, then refactor" applies — renaming to `itinerary` after the old world is deleted is a free internal refactor. The entity, the vocabulary, and everything traveler-facing say **Itinerary**.

**The strangler waiver (ADR to mint at implementation).** ADR-002 forbids a module touching another module's tables — and the new `trip` module maps tables the frozen old modules own, and its destruction path deletes rows across all of them (membership, invitation, chat, poll, join, media subjects). This is a deliberate, time-boxed exception: the new module is those tables' *next owner*; the old world is grandfathered until its files are deleted at the rewire's end, when the waiver dissolves. The alternative — delegating to old services — was rejected because it wires the new world to code scheduled for deletion.

**Old files never change.** The whole story is additive files + additive schema + two constraint drops. The proof is structural: the existing suites pass byte-identical, and the boundary-guard test (below) fails on any new-world import of an old-world package.

**The model's acts:**
- **Publish mints the itinerary object** from the frozen plan (ADR-019's freeze is what makes the mint equal to the live projection), carrying its creator-trip reference. **Unpublish retires but keeps identity** — same object id across publish cycles, so shared links resurrect on republish. Hard delete of the object (owner-addressed via the recorded owner) destroys it permanently, orphaned or not. No standalone itinerary creation in CM-1.
- **Diary**: auto-mint on first trip-derived postcard; standalone create takes a title. **Deleting a diary deletes the postcards inside it** (founder-ruled). Deleting the auto-minted trip diary is allowed; the next add-to-diary re-mints it.
- **Postcard**: object-addressed read/recaption/delete authorized by **authorship**. **Delete ignores even the archive freeze** — withdrawal of one's own public content is always allowed; recaption respects the freeze (editing is not withdrawal). Trip-derived creation reads the activity through the trip module's interface at post time and snapshots it — never event-replicated.
- **Destruction**: the trip's delete endpoint — owner-only, any lifecycle state, published or archived alike — destroys the workspace world in one transaction (plan, chat, dump, polls, memberships, invitations, ownership records, join link and requests, and every workspace-world photo's rows and stored objects). Diaries, postcards, itinerary objects, forked copies, and fork provenance stand. Refusals: non-member masked not-found; member-not-owner a named forbidden; repeat delete not-found.

**The B-fork and its four safety rules** *(founder chose new tables for content objects knowing the costs; pre-alpha is the cheapest moment for a fork-and-cutover)*:
1. **The new world ships dark** — no product reader or writer touches it until cutover; anything real written there would be invisible to the old feed and profiles.
2. **Every backfill runs at cutover, none at CM-1** *(corrected at the seam check, 2026-08-30, superseding the grilling's Q16 timing)* — the old world keeps publishing and posting through the whole dark window, so a CM-1 backfill is stale on arrival. CM-1's migrations are the three new tables and the two FK drops, nothing more. The signed backfills (postcards from the old entries; itinerary objects for currently-published trips; diaries for every traveler-trip with entries) transfer whole to the rewire story's freeze → backfill → switch.
3. **Destruction ships unexercised** — the endpoint lands, no UI calls it until the rewire; before cutover the old feed would mis-hide a deleted trip's surviving old-world postcards (it still checks the trip row), so the survival rule only becomes visible once the readers move.
4. **Trip data never forks** — new tables are for content objects only.

**Schema** — three new tables (`diary`, `postcard`, `publication`'s object table) and **two FK drops on the old entries table**, both signed under the stop rules at the grilling: the entry→itinerary cascade (so a destroyed trip can never cascade away old-world postcards that the cutover backfill still needs) and the entry→activity SET NULL (deleting a plan activity now leaves the entry's provenance pointer dangling; reads must tolerate a dangling activity id — postcards render from their snapshot).

**Wire grammar** — new paths only; nothing old moves (ADR-008). The new world's roots: `trips` (the trip's new grammar and its DELETE — superseding the deletion arc's earlier `/v1/itineraries/{id}` phrasing, which predated the new-grammar ruling), `diaries`, `postcards`, and the itinerary object under the publication module's root. Exact spellings — including the itinerary object's public root, where every itinerary-flavored path is squatted on by the frozen old world — are finalized in the contract document (ticket-gated), which is the single source the rewire and UI stories wire against.

**Events: none.** Archive exclusion and activity reads are synchronous interface reads (current state); `TripDeleted` and any destruction-time WS eviction belong to the rewire story, when the endpoint gains live callers.

**Zero UI, zero client change.** Not even a dormant flag. The mobile repository layer is untouched.

## Testing Decisions

Good tests here assert **external behavior at the API seam** — what an endpoint answers, what rows and stored objects exist afterward — never module internals. Three seams, two of them existing:

1. **The HTTP integration-test seam** (the house's highest; prior art: the entire existing IT suite): every act, refusal, masking, and survival above proven via the booted context against real Postgres — including "the media objects are gone" via the storage seam, and "the content rows stand" after destruction.
2. **The migration-stepping seam** (prior art: the workspace backfill IT): own container, target N−1, seed the legacy shape via raw SQL, migrate, assert — used for both FK drops; each assertion sabotage-checked per the standing rule, with the resource-recompile trap in mind.
3. **The module-boundary guard** (the story's one new seam, deliberately tiny): a plain unit test failing on any new-world import of an old-world package. Prior art in spirit: the mobile layering guard.

The strongest claim — *the old world is untouched* — is proven by the existing suites passing without a single edited test. One suite at a time per stack, as always.

## Out of Scope

The rewire/cutover story (client switch, every backfill, readers moving, destruction's screens and events, the old endpoints' fate, the ADR-008 waiver-or-forced-update decision) · all UI · standalone itinerary creation · profile visibility (parked, epic map) · the 30-day purge sweep (parked, alpha trigger) · message brokers and service extraction (non-goals with named triggers) · chat-message deletion (stays closed) · the wire↔vocabulary housekeeping pass (its own line; the contract doc discharges only its mapping-table core).

## Further Notes

- **ADR to mint at implementation**, covering as one decision: publish-mints-the-itinerary (amends the projection language of ADR-017/019), the diary entity and optional containment (supersedes ADR-024's projection-and-containment), postcard authorship authority (delete crossing the archive freeze), destruction-with-structural-survival, the B-fork with its four rules, and the strangler waiver with its dissolution condition.
- **Glossary updates** (02-domain-model): the four objects' new definitions; Delete vs Archive vs Unpublish vocabulary already seeded by S4.38's glossary line.
- **Candidate-capability note** *(standing rule)*: **standalone creation** — trip-less diaries and postcards are a capability, footprint-growing, not governance; joins register #14's accumulating list.
- **Freshness note** *(standing rule)*: no traveler-visible surface ships or changes — every lane stays exactly as recorded by prior stories; nothing is deliberately static because nothing is visible. The rewire story owes the real note for the surfaces it moves.
- The epic-map lines authored 2026-08-30 (the restructure, standalone content, profile visibility, the survival amendment) ride this story's branch, as does the discharge annotation this story owes the restructure line.
- The stranded-postcards line (S4.23) is **discharged by design here** and closed for real at the rewire, when the object-addressed delete becomes reachable by travelers.

## Comments

- *2026-08-30, at the seam check before publication:* the backfill timing correction (rule 2 above) was surfaced by the seam sketch and confirmed by the founder before this spec was published; the grilling's Q16 sign-off transfers to the rewire story unchanged.
