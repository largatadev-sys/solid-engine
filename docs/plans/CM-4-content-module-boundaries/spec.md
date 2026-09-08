# CM-4 — Content-module boundaries: api-only between diary, postcard and publication

**Status:** ready-for-agent — grilled 2026-09-08 (`/grill-with-docs`, four rounds, twelve questions; **no separate grilling record — the rulings are in Implementation Decisions below**, because nothing in this session needed a home the spec, ADR-038 and the epic map could not give it); not started; **ships second in the content-remodel arc, after CM-3 (merged) and before TW-1** · **Epic:** none (the content-remodel arc) · **Depends on:** CM-1 (merged — the four modules), CM-2 (merged — the day grain and the per-module guards), CM-3 (merged — the trip grammar) · **Branch:** `feature/CM-4-content-module-boundaries`.
**ADR:** **ADR-038, amended** — no new ADR. Every ruling here *applies* one of its seven conventions rather than changing one; the single exception is the broker deferral, which belongs to ADR-035's non-goal and is already recorded there as a fourth trigger.
**Candidate-capability note:** none — no traveler act is added, changed or gated. The story adds no endpoint and no screen.
**Freshness note:** no surface changes lane. There is no wire change at all: not a path, not a shape, not a status code. Every surface keeps the lane CM-2 and CM-3 left it in.

## Problem Statement

The four new-world modules were built as peers, but three of them still reach into each other the way a single package does. `PostcardService` holds `DiaryService`, `TripService` and — worse — diary's `Diary` and `DiaryDay` **JPA entities**, with `PostcardView`, the record postcard's own service hands its controller, carrying a `DiaryDay` outright. `ItineraryObjectService` holds `TripService`. `ProfileDiariesController` holds `ItineraryObjectService`. Each of those is a concrete class from another module, so a module cannot be changed without reading its neighbours, and diary's persistence model travels through postcard into postcard's response mapping.

The guards that should catch this cannot. Postcard, publication and trip each carry an ArchUnit allowlist, but two of them hold a **by-name exemption** for exactly the concrete class being reached, which is how the breach stays green. Diary has no allowlist at all — only a `SEALED` map naming eight mutator methods as strings, a denylist that **fails open**: add a ninth mutator to `Diary` tomorrow and postcard may call it with nothing going red. Its own message says it exists *"because postcard already holds Diary and DiaryDay"*, which is the smell rather than the seal.

## Solution

Give diary, postcard and publication the same front door trip already has, and let the exemptions die. Three interfaces are minted — `TripApi`, `DiaryApi`, `PublicationApi` — carrying only the methods their callers actually invoke, and the three concrete-class fields become interface fields. Diary publishes a `DiaryDayView` carrying the two values postcard reads, so no entity crosses. Diary's method-name seal is replaced by an ADR-038 allowlist guard, which forbids the import outright and cannot fail open. One meta-test then asserts the property that makes the rest self-enforcing: **every module has a guard, and no guard carries a by-name exemption.**

Nothing else moves. No behaviour changes, no endpoint changes, no table changes, and the story ships **no events** — the one it was planned around was reversed at the grilling, for the reason below.

## User Stories

1. As the next agent, I want each content module reachable only through its `api` and `exception` packages, so that I can change a module's internals without reading its neighbours.
2. As the next agent, I want no boundary guard to carry a by-name exemption, so that "the boundary holds" is a fact the build asserts rather than a claim I have to audit.
3. As the next agent, I want a meta-test that fails when a module has no guard, so that a new module cannot ship unguarded by omission.
4. As the next agent, I want diary's entities unreachable from postcard, so that adding a mutator to `Diary` cannot silently become a postcard call site.
5. As the next agent, I want diary's fail-open method denylist gone, so that no rule in the tree gets weaker as the code grows.
6. As the next agent, I want `DiaryDayView` to carry only what postcard reads, so that diary keeps the freedom to change every field it did not publish.
7. As the next agent, I want the trip facade reachable only through `TripApi`, so that TW-1 can relocate trip's internals without touching postcard or publication.
8. As the next agent reading the epic map, I want its claim about the postcard foreign key to be true, so that I do not design an asynchronous delete on a premise the schema contradicts.
9. As the next agent, I want the reason the diary delete stays in one transaction recorded beside the rule it excepts, so that I do not "fix" it into an event and reintroduce the ghost.
10. As a traveler, I want a postcard never to outlive the diary it was filed in, so that my feed never shows a card that fails when I tap it.
11. As a traveler, I want nothing about this story to change what I see, so that a boundary refactor costs me nothing.
12. As the founder, I want the existing suite to pass with no assertion edited, so that "behaviour-preserving" is demonstrated rather than asserted.
13. As the founder, I want the raw-SQL waiver to name the tables it covers, so that the one place raw SQL is legal cannot widen unnoticed.
14. As the founder, I want the broker question to have a named trigger rather than a silent deferral, so that it comes back on its own terms.

## Implementation Decisions

**The rulings, from the grilling (2026-09-08).** Each is an application of ADR-038 unless it says otherwise.

**Cross-module handles become interfaces (rule 1).** Three interfaces are minted, each carrying only the methods its callers actually invoke — measured, not guessed.

- **`TripApi`** in `trip.api` — the six methods postcard and publication call between them: `factsOf`, `dayFactsOf`, `activityFactsOf`, `frozen`, `planOf`, and the publish flag pair. `TripService` implements it; both callers switch their field type; **`TripModuleBoundaryTest`'s by-name exemption for `TripService` dies here.** TW-1 later splits this three ways (`TripApi`/`PlanApi`/`MembershipApi`) against its relocated code — a two-line change in the two callers, knowingly accepted rather than leaving a breach standing for two stories.
- **`DiaryApi`** in `diary.api` — the two mints plus the day read. Postcard stops holding `DiaryService`.
- **`PublicationApi`** in `publication.api` — the one method `ProfileDiariesController` calls. Publication has no `api` package today, which is why its guard's front door is `exception..` alone; **its by-name exemption dies here.**

**The entity leak closes with a view, and the view is deliberately tiny.** `DiaryDayView` replaces the `DiaryDay` inside `PostcardView`. Measured, postcard reads exactly **two** values off a `DiaryDay` — its ordinal and its place — and exactly **one** off a `Diary`: its id. So the view carries the day's id, ordinal and place and nothing else, and the mints may return a bare identifier rather than a diary record. Every field published is a field diary can no longer change freely, so the smallest honest surface is the correct one. **Snapshotting those values into the postcard instead was considered and rejected:** a diary day's ordinal is *derived from its date* relative to the diary's range and shifts when that range is edited — the exact defect CM-2 fixed — so a snapshot would go stale.

**The diary delete stays in one transaction, as ADR-038 rule 5's fourth recorded exception.** This reverses the ruling taken earlier in the same session, and the reversal is the most important thing in this spec.

The plan was `DiaryDeleted` as an AFTER_COMMIT event, with a failed reaction leaving orphaned postcards to a periodic sweep — reasoning from the epic map's statement that *"V52 already dropped the FK"*. **That statement is false.** V52 dropped two foreign keys on the legacy `diary_entry` table and nothing on `postcard`. The postcard references are live and pinned by a test: `postcard.diary_id REFERENCES diary(id)` (declared NO ACTION deliberately, so a diary cannot be deleted out from under its postcards by any code path), `postcard.diary_day_id REFERENCES diary_day(id)`, and `diary_day.diary_id NOT NULL REFERENCES diary(id)`.

Two consequences follow. First, the asynchronous delete **cannot even commit today** — Postgres refuses the diary delete while postcards reference it — so making it an event would require dropping that foreign key first. Second, measured against the readers, the resulting failure is not invisible garbage but a **traveler-visible ghost**: the Home feed renders the orphan in full, because every feed query selects from postcard alone with no diary join and the withholding check tests only author and trip; tapping it answers `404 DIARY_DAY_NOT_FOUND`, because the view's day lookup throws; and the profile denies it exists, because it enumerates diary → day → postcard and its loose bucket is a strict null check. A card that advertises, fails on tap, and is disowned by the profile.

So the decision is to keep the foreign key and keep the single transaction. The principle: **rule 5 exists so modules are not coupled by transaction in a way that blocks extraction, but the foreign key already couples them at the schema level** — the shared transaction adds no coupling the schema does not already impose. The genuine decoupling step is dropping the key, which is rule 6's schema-per-module work, recorded and not applied. Decoupling the transaction before the schema would mean building a transactional outbox purely to restore a guarantee just destroyed. **Trigger for revisiting: the FK-drop story.**

**The mints need no work.** The grilling planned to make them "idempotent on a named key"; measurement found that already built. `mintTripDiary` reads before it writes, inserts through a `REQUIRES_NEW` bean, and catches the integrity violation to re-read the winner — the insert-on-conflict recovery this codebase already documents — backed by the partial unique on the diary's author-and-trip pair, with the day's one-per-date unique doing the same job. **No migration, no code change.** The act stays in postcard, which is the module that knows a trip-derived postcard is being born.

**`DiaryContents` is unchanged, writes included.** It is a diary-owned port that postcard implements — the consumer defining the interface, which is the right way round, since diary states what it needs and postcard cannot drift the contract unilaterally. Its reads must stay synchronous (a diary page renders postcard counts; an event cannot answer a query), and its two writes stay because the delete stays synchronous.

**Diary's seal is replaced, not supplemented (rule 3).** The `SEALED` map naming eight methods is deleted and an ADR-038 allowlist guard takes its place. Keeping both was rejected: a name-list that goes stale silently is worse than nothing once a structural rule makes it redundant, and its stated reason — that postcard holds the entities — stops being true in this story.

**The meta-test is the story's keystone.** One test asserts that every module under `com.largata` with an `api` package has a boundary guard, and that **no guard carries a by-name exemption**. The second half is only assertable because this story removes the last two exemptions; it is what stops the pattern eroding one convenience at a time.

**The raw-SQL waiver gains a table list.** ADR-035 waives raw SQL for the trip facade but names no tables, so its surface can grow unnoticed — CM-3 widened it from five tables to six and back with no signal either way. The waiver is amended to name the five tables it covers. **The general source-text SQL guard is NOT built here**: the three modules this story touches contain no raw SQL, so it would guard nothing this story changes while carrying false-positive cost immediately. It goes to TW-1, whose schema-per-module decision supplies the table→module map it needs.

**No events, and no broker.** The story ships zero events; the first waits for the FK-drop story. RabbitMQ was raised and **deferred rather than declined**, with a fourth trigger added to ADR-035's non-goal — *the content arc completing (CM-5 merged)* — reopening it without waiting for the original three. The argument recorded there: a broker moves these events onto a second system, introducing the dual-write and therefore *forcing* the transactional outbox ADR-038 reserves for data-corrupting loss. The option is kept free at zero cost by shaping any future event record as a past-tense fact carrying ids only, so the swap is a transport change rather than a redesign.

## Testing Decisions

A good test here asserts **what may reach what**, never how a module is built inside. The story changes no behaviour, so its proof is that the existing tests do not move while the structural rules tighten. Three seams, and only one is new.

1. **The four per-module boundary guards** *(existing; prior art is the postcard guard, the CM-2 pilot)* — each takes the ADR-038 allowlist form with its front door at `api..` and `exception..`, keeps its sabotage checks that the module is seen and the predicates select something, and **loses its by-name exemption**. Diary's is written fresh, replacing the method seal.
2. **One meta-test** *(new — the only new seam, and the highest point available: one test for the whole tree)* — every module has a guard; no guard names an exemption. Sabotage-checked twice: a module hidden from the scan must fail it, and a re-introduced exemption must fail it.
3. **The existing suite, unedited** *(existing)* — 414 unit and 1,369 integration tests pass with **zero assertion edits**. For a behaviour-preserving refactor this is the strongest available proof, and it is the property CM-1 and CM-3 both closed their gates on. Import lines in tests may move; an edited assertion means the story changed behaviour and is wrong.

**No new functional tests.** If this story needs one, something behavioural has changed and the change does not belong here.

**Not guarded, deliberately:** that `DiaryDayView` might grow a field and re-couple the modules. The allowlist stops the entity crossing; a view gaining a field is a review question, and a field-count assertion would be a test with no failure mode worth having.

What no seam reaches, and the gate closes by reading: that each minted interface carries only methods its callers invoke, rather than a mirror of the service behind it.

## Out of Scope

Trip's three-way `api` split into `TripApi`/`PlanApi`/`MembershipApi` and any relocation of trip's files (TW-1) · the general source-text SQL guard and the table→module map it needs (TW-1, with the schema decision) · dropping the postcard foreign keys, and therefore the first content event (the FK-drop story) · a message broker (ADR-035, reopening when CM-5 merges) · the publication module's rename, the readers' move onto the itinerary object, and the old package's decommissioning (CM-5) · the old world's `com.largata.itinerary` diary classes, which are a different concept reached only through postcard's published port · any schema change, any wire change, any screen.

## Further Notes

- **Measured before this was written**, and each measurement made the story smaller: postcard reads two values off a `DiaryDay` and one off a `Diary`, not the six-field view first proposed; the mints' idempotency is already built and needs no migration; the planned event is reversed outright.
- **Two things in canon were wrong and are corrected by this story's docs commit:** the epic map's claim that V52 dropped the postcard foreign key, and the CM-4 line's title promising "the first two events".
- **The vocabulary hazard worth knowing before reading the code:** "diary" names two different things until CM-5. `com.largata.diary` holds the Diary and Diary Day this story is about; `com.largata.itinerary` holds `DiaryEntry`, `DiaryService` and three siblings, which are the old world's Diary Entry — a different concept, kept as adapters over postcard, and reached only through `postcard.api`.
- **Why this lands before TW-1:** it touches nothing TW-1 touches, and it should land before diary's entities gain a second consumer. TW-1 then relocates trip against boundaries that are already the convention.

## Comments
