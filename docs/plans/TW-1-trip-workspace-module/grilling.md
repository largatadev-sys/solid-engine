# TW-1 — the grilling record (2026-09-07)

**Why this file exists.** The planning pass of 2026-09-07 put eight forks to the founder through the harness's question tool and the resulting `spec.md` and `design.md` status line called the answers "rulings". They were planning answers, not a grilling. The founder invoked `/grill-with-docs` on the spec; this is that record. The spec is rewritten from it before `/to-tickets`, and where the two disagree this file wins. Rounds are recorded as asked; the founder's answers are quoted verbatim; the reading under each answer is the agent's and is what the next round was built on.

## Round 1 — the root's children

**Q1 — the story's shape: two PRs, grammar first, then the move.** Founder: *"agreed"*.

**Q2 — what Trip and Itinerary mean after this story, and whether the Java names follow.** Founder: *"trip means the create trip flow. the trip objects. the itinerary package will be decomissioned once trip package is wired and working as intended. then on a different story. the publication package which holds the itineraries, will be come the itinerary package."*
Reading: Trip is the whole workspace world — the create-trip flow, the record, its plan, editing, cover, dump, lifecycle, membership. Itinerary is the published object, today's `publication` module, which takes the `itinerary` name in a later story once the god module is decommissioned. The Java types in `trip` take Trip names; the glossary's "code, routes, entities and the wire stay `Itinerary`" clause (02-domain-model.md line 18, ratified S4.15) is amended. Fact found after the question was asked: that clause exists and this answer amends it.

**Q3 — new-grammar suffixes verbatim.** Founder: *"agreed"*. Measured mismatches recorded for a housekeeping line: `edit-lock` (glossary: Editing Session), `audience` (glossary: visibility), `members` (glossary: Membership), `finish-planning` (a retired act).

**Q4 — does the old grammar ever sunset.** Founder: *"see q2 answer. and what do you mean by cm2 trigger. this is the story after cm2"*.
Reading: `/v1/itineraries/**` goes away when the itinerary package is decommissioned — once the trip package is wired and verified. The twins are a bridge, not permanent infrastructure. "CM-2 trigger" was a bad label for "the trigger CM-2's ticket 06 recorded for the old diary endpoints"; it is withdrawn.

**Q5 — settle the shared module conventions here.** Founder: *"yes"*.

**Q6 — publish: merged act, trip owns it, publication reacts.** Founder: *"trips wont be published anymore. a trip can publish an itinerary based on the trip, that's why we need to decouple them"*.
Reading: neither of the offered mechanisms. A trip has no published state; publishing is the act of minting an Itinerary from a trip. The publish act belongs to the itinerary (publication) module, which CM-1 already built at `POST /v1/trips/{id}/publish`; the trip module has no publish act on the new grammar; the old flag-flip at `POST /v1/itineraries/{id}/publish` is old-world behaviour that stays until decommissioning and gets no twin; the trip's `published` column and the `markPublished` write are a bridge for the old readers, dissolving when those readers move to the object. Round 2 asks whether the readers' move is this story's or the itinerary story's.

**Q7 — `GET /v1/trips/{id}` shape.** Founder: *"what does it say in the itinerary package"*.
Reading: the same record the old detail answers — 30 fields including the plan tree (`ItineraryResponse`, renamed with the trip half). CM-1's dark ten-field `TripResponse` retires.

**Q8 — destruction keeps its five foreign deletes; the waiver narrows, recorded with the FK-drop story as trigger.** Founder: *"agreed"*.

**Q9 — the schema move deferred.** Founder: *"this should be additive."*
Reading: no table moves and no column drops in this story; the only database changes this story may make are additive. `SET SCHEMA` is a move and is out. Confirmed in round 2.

**Q10 — fork's home.** Founder: *"forking an itinerary will create your own version of that trip. then once you complete that trip, you can publish your own itinerary based on that trip"*.
Reading: fork is an act on an Itinerary that creates a Trip. The trip-creation half is a trip capability and the provenance ("this trip was forked from itinerary X") is a fact about the trip — both move into `trip`. The act's *source* changes in the itinerary story (from a published trip's live plan to the itinerary object's snapshot), and there is no `/v1/trips/{id}/fork` twin, because forking is not an act on a trip. The old `POST /v1/itineraries/{id}/fork` stays until decommissioning. Confirmed in round 2.

**Q11 — `TripsTopic` becomes a listener in `ws` fed by trip's events.** Founder: *"a"*.

**Q12 — admission in one transaction with the invitation.** Founder: *"what do you mean by this"*. Re-asked in round 2 in plain language.

**Q13 — the 45 old-grammar e2e files.** Founder: *"should migrate also"*.
Reading: the Playwright specs move to `/v1/trips`; the backend ITs remain the old grammar's proof until decommissioning deletes it.

**Q14 — the gate's proof of the move is a script that diffs assertion lines.** Founder: *"agreed"*.

**Closing questions from the founder, answered in the round-2 message:** whether there is a shared understanding of the goal; whether the convention applied to postcard, diary and publication is adopted for trip; why the story reuses the TW-1 id.

## Round 2 — the shared conventions, and the model's consequences

Asked after the founder's three closing questions were answered in prose: the shared understanding (the trip is the workspace world; the itinerary is the published object; a trip is never published, it publishes an itinerary; forking an itinerary creates a trip; the old package is decommissioned once trip is wired and verified and the old grammar goes with it), the convention (the same rule as the content modules at a different size), and the id (TW-1 fits the move, not the whole).

**Q1 — story ids: one id per revertable unit.** Founder: *"agreed"*. Reading: the grammar story, the boundaries story, TW-1 kept for the move with its design record, a later id for the itinerary story. Names proposed in round 3.

**Q2 — layout: feature slices with the layer as filename suffix** (measured: `trip/` 25 · `plan/` 34 · `dump/` 5 · `editing/` 15 · `history/` 4 · `cover/` 2 · `workspace/` 11 · `ownership/` 8 · `fork/` 4 · `validation/` 6). Founder: *"agreed"*.

**Q3 — the guard form: the `api..`/`exception..` allowlist per module, plus one meta-test asserting every module has a guard.** Founder: *"agreed"*.

**Q4 — events: Spring `@TransactionalEventListener(AFTER_COMMIT, fallbackExecution = true)`; a failed reaction is logged at WARN with ids and not retried; an outbox only when a consumer's loss would corrupt data, the boundaries story deciding for its own case; `exception/` stays published surface.** Founder: *"agreed"*.

**Q5 — publish under the model.** The trip has no publish act on the new grammar; the itinerary module owns `POST /v1/trips/{id}/publish` (CM-1's, minting the object and flipping the trip's flag as a bridge); the old flag-only flip stays in the old package on the old prefix with no twin; the readers that read the flag move onto the object in the itinerary story, not this one; the `published` column stays ("additive"); the freeze on publish stays byte-identical until the itinerary story decides it. Founder: *"agreed"*.

**Q6 — fork.** The creation half and the provenance move into `trip`; the act's source changes in the itinerary story; no `/v1/trips/{id}/fork` twin; the old route stays until decommissioning. Founder: *"agreed"*.

**Q7 — accepting an invitation stays one transaction; design rule 3's `admit` clause is recorded, not applied.** Founder: *"agreed"*.

**Q8 — the twin set: 47 of 60**, excluding the 8 old diary-entry routes, `publish`, `unpublish`, `audience`, `finish-planning`, `fork`; `preview` is twinned from the old package's staying controller. Founder: *"agreed"*.

**Q9 — the refusal code: both grammars answer `ITINERARY_NOT_FOUND` until decommissioning; the client learns `TRIP_NOT_FOUND` beside it now.** Founder: *"agreed"*.

**Q10 — the glossary.** Founder: *"a trip is the trip itself. you can publish an itinerary based from the trip. you wont transform the trip, you create an itinerary based from the trip."*
Reading: that wording replaces the proposed Trip and Publish text. Trip — the trip itself, the traveler's journey-object, never transformed by publishing. Publish — the owner's act of creating an Itinerary based on the trip. Itinerary — gains "created from a trip by publishing; forking one creates a new trip". Preview — the owner's view of the Itinerary a publish would create.

## Round 3 — consequences of the model

**Q1 — the content half's reach-ins: the design's named legacy exemption, not a throwaway api.** The old package is named in trip's guard as a permitted legacy consumer; trip's internals stay public until decommissioning; the sabotage check counts the reach-ins; the dissolution is the decommissioning story. Reverses the planning-pass answer because the model changed underneath it. Founder: *"agreed"*.

**Q2 — the rename: backend trip-half types take Trip names in the move PR as a separate commit after the relocation; the client repository is renamed now; the client hooks and keys wait for the itinerary story's housekeeping; the table and the old wire keep Itinerary until decommissioning.** Founder: *"agreed"*.

**Q3 — the ids, in ship order: CM-3 the trip grammar and client cutover · CM-4 the content-module boundaries · TW-1 the trip module · CM-5 the itinerary module.** Founder: *"agreed"*.

**Q4 — one docs-only PR now carries the record, the glossary, the two ADRs, the epic-map lines and the CM-3 and TW-1 specs; each story then branches from `dev`.** Founder: *"agreed"*.

## Carried from the planning pass, not re-asked

Two answers taken through the harness's question tool on 2026-09-07 stand as given, with their trade-off stated at the time: the move is sliced behind branch-local migration windows in both guards, sabotage-checked and deleted before the PR (the alternative was one squashed move); and the spec is written before the boundaries story rather than after it.

## The frontier is empty

The shared understanding was restated in the session's closing message — the model, the four stories in ship order, the conventions, the record — and the founder confirmed it (*"okay agreed"*) after one last check: *"so no code change on this story?"* Correct: the docs PR changes no code; the first code change is CM-3, after its spec is reviewed and `/to-tickets` typed.

## What was written from this record

The glossary (Trip and Itinerary amended in the founder's words; Publish and Preview added) · ADR-037 (the model, the grammar, the sunset) · ADR-038 (the module conventions) · the epic map (the restructure line's reversal, TW-1 pulled, CM-4 named and its conventions settled, CM-3 and CM-5 minted, the old-diary-endpoints deletion aligned to CM-5) · `08-object-contracts.md`'s wire table · BUILD_STATUS rows for the four stories · `docs/plans/CM-3-trip-grammar/spec.md` · this directory's `spec.md`, rewritten. All in one docs-only PR, on the CM-2 gate's precedent.
