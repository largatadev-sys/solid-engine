# Module layout — ADR-038's layout rule reaches the ten remaining modules, and `api` stops meaning two things

**Status:** ready-for-agent

Off-epic, no story id: a chore series under one grilled spec, per the grilling record's Q1. Design: [design.md](design.md). Grilling: [grilling.md](grilling.md) — where this spec and the record disagree, the record wins. Synthesized by `/to-spec` on 2026-09-11 from that record; the seams below were checked with the founder before publishing.

## Problem Statement

The backend is a modular monolith whose modules are decoupled by guards, but only four of them read that way. `diary`, `postcard`, `itinerary` and `trip` carry ADR-038's layout — a reader who learns `api/`, `adapter/`, `controller/`, `dto/`, `entity/`, `exception/`, `repository/`, `service/` once can open any of them and know where everything is. The other ten (`report`, `verification`, `place`, `discovery`, `feed`, `profile`, `chat`, `poll`, `invitation`, `join`) still carry the pre-CM-2 flat shape: everything at the root, controllers and their records in `web/`, and for seven of them an `api/` that holds wire records and route constants rather than an in-process contract. So the word `api` means two things in one tree, the guards written at PR #60 faithfully record that as two breaches to fix, and a reader cannot navigate the ten by convention. The founder wants the whole backend to read as one system, wants each module's status tracked so the work can be picked up across sessions, and asked whether each module should own its schema.

## Solution

Apply ADR-038 rule 2 to the ten modules exactly as it was applied to the four, one module per ticket and per PR: layers for eight, slices for `report` and `join`. Move every wire record out of `api/` into `dto/`, and let `api/` hold the in-process contract or not exist — six modules lose the package, `invitation` keeps `InvitationApi`, `report` and `join` keep a route constant until `SecurityConfig` owns its routes. Pin the classification with one list-free ArchUnit rule so it stays true without review. Ride two small pieces of the same readability along: a migration folder per module (the cheap half of schema-per-module; the expensive half, the foreign keys, stays with the FK-drop story) and the composition root owning its anonymous route list, which closes three recorded cycles. Track the series per ticket in the tracker and per glyph on the BUILD_STATUS ledger entry, so any session can take the next ticket cold.

## User Stories

1. As the founder, I want every backend module to carry the same folder shape, so that I can open any module and know where its contract, its wire, its entities and its services are without reading it.
2. As the founder, I want `api/` to mean one thing everywhere, so that "this module talks through its api" is a statement I can trust in every module.
3. As the founder, I want a module that nothing calls in-process to have no `api/` package, so that the tree tells me the truth about who calls whom rather than showing me an empty contract.
4. As the founder, I want the two "recorded breaches" in the chat and verification guards to dissolve by classification rather than by reshaping a contract, so that the guards stop asking me to fix something that was never a contract problem.
5. As the founder, I want a property in the build that no `api` type appears in a controller signature, so that the classification cannot drift back one convenience at a time.
6. As the founder, I want each module's move to be its own PR, so that a module's move is its own rollback unit and I review ten small diffs rather than one wide one.
7. As the founder, I want the exception to "a PR is not per ticket" written into the spec with its reason, so that the next reader does not take this series as licence to split every story into per-ticket PRs.
8. As the founder, I want a per-ticket status visible in one place, so that I can see at a glance which modules are done, claimed or open.
9. As an agent starting a cold session, I want a ticket I can claim by setting one line and a checklist I can verify against, so that I can move a module without re-deriving the design.
10. As an agent starting a cold session, I want the tickets ordered, so that I take the next one rather than choosing.
11. As an agent moving a module, I want the target file map for that module already decided, so that the ticket is a move and not a design.
12. As an agent moving a module, I want the rule for which test edits are allowed stated, so that a test I feel the need to edit tells me I have moved something I should not have.
13. As a traveler, I want nothing on the wire to change, so that the app I have installed keeps working through every one of these PRs.
14. As a reviewer at code review, I want each PR to be nothing but moves plus the guard edits the record names, so that anything else in the diff is visible as a deviation.
15. As a future module author, I want ADR-038 to say what an `api` package may hold and when a module has none, so that I classify a new module correctly on its first build.
16. As a future module author, I want a `dto/` folder in every module, so that a wire record has one obvious home and never lands in `api/` again.
17. As the founder, I want the 56 migrations grouped by the module that owns their tables, so that the schema reads by module the way the code does.
18. As the founder, I want the migration move to be renames only, so that Flyway applies the same files with the same checksums and a fresh database looks identical.
19. As the founder, I want `SecurityConfig` to own its own anonymous route list, so that three modules stop publishing a route constant as their whole in-process interface and three recorded cycles close.
20. As the founder, I want the `SecurityConfig` change to wait for my explicit yes, so that the auth stop rule is honoured even for a relocation with no semantic change.
21. As the founder, I want `identity` left out of this sweep, so that its split into the traveler and follow is decided at its own grilling rather than pre-empted by a layout pass that would move 45 files twice.
22. As the founder, I want the `report` and `join` cuts to follow the code's real seams rather than their names, so that the slices do not contradict the dependency graph.
23. As the founder, I want the two dead things found on the way in `join` removed with its ticket, so that a never-read injection and a consumer-less named interface do not survive a tidy-up that touched every file around them.
24. As the founder, I want the 06b §11 convention line written only when the series makes it true, so that §11 keeps measuring the tree rather than promising it.
25. As the founder, I want the verification loop for a move written into the ticket, so that the incremental-compile trap TW-1 paid three times is not paid an eleventh time.

## Implementation Decisions

**Shape of the work.**

- A chore series under this one spec: no story id, the off-epic dated slug, `/to-tickets` producing one ticket per module plus the riders. Each ticket ships as its own PR on a `chore/module-layout-<module>` branch and is squash-merged to `dev` through the ordinary gate. This is a recorded exception to "one branch per story, one PR at the gate": that rule protects the rollback unit, and the rollback unit of a layout sweep is the module.
- Every commit subject carries `module-layout` so the series is located by `git log --grep`, since no story id exists. Form: `refactor(<module>): module-layout — <what moved>`.
- The tracker is the tickets: each carries a `Status:` line (`ready-for-agent` → `claimed` → `resolved`), and the BUILD_STATUS off-epic ledger entry for 2026-09-11 carries one glyph per ticket, updated in each PR's last commit before the merge. A session claims a ticket by committing its `Status:` change first, and takes another once that ticket's PR is open.
- Order: verification, place, discovery, feed, profile, chat, then the api-is-never-wire guard, then poll, invitation, report, join; the migration folder at any point; `SecurityConfig` last, on its own yes.

**The rule applied.** ADR-038 rule 2 read literally: layers by default, slices when a layer folder would pass about ten files, `postcard` the reference for layers and `trip` for slices. Flat is not a shape. Folders with nothing in them do not exist.

**The folder vocabulary,** as the four converted modules already use it:

- `api/` — the in-process contract only: interfaces other modules inject, view records they receive, events; its `package-info` declares the Modulith named interface. Public.
- `adapter/` — every concrete adapter at a seam, whichever side the port is on: an implementation of this module's `api` where an entity would otherwise cross (ADR-038 rule 3's tell), an implementation of another module's port (`PhotoAudience`, `Topic`), an event listener reacting to another module, and the adapters of a two-sided internal seam (a mailer with a logging and a Resend adapter). Package-private.
- `controller/` — REST controllers and the argument helpers only they use. Package-private.
- `dto/` — wire request and response records. Public, for Jackson.
- `entity/` — JPA entities, their enums and value types.
- `exception/` — published refusals, `{Entity}{Condition}`.
- `repository/` — Spring Data interfaces.
- `service/` — services, inserters, internal view records, and internal port interfaces. Public class, package-private constructor, per 06b §11.
- A slice is a `<slice>/` folder at the module root holding one concern; flat while it stays scannable, folded into the layer sub-folders when it passes ten. `api/` and `exception/` stay at the module root.

**The classification, amended into ADR-038 rule 1 on 2026-09-11.** A type is `api` only if another module calls it in-process. A type is `dto` if it appears in a controller signature. Never both. A route constant is neither. A module with no in-process caller has no `api` package at all. Where `api/` goes, its Modulith named interface goes with it and the root becomes the module's (empty) api.

**Per module.**

- `verification` → layers; its three wire records to `dto/`; `api/` deleted. The two port interfaces (`EmailVerificationFlag`, `VerificationMailer`) live in `service/`; their four adapters and two configurations plus the Firebase credentials in `adapter/`. `VerificationAttempts` is a `REQUIRES_NEW` helper and lives in `service/` as its own bean.
- `place` → layers; `api/` deleted. `PlaceSuggester` and its two records to `service/` as an internal seam; the fixture and Photon adapters and their configuration to `adapter/` (the configuration selects by a property expression on package-private constants of the Photon adapter, so both stay in one package); the two exceptions to `exception/`. A `PlaceApi` is minted if and when `trip` needs places in-process.
- `discovery`, `feed`, `profile` → layers; every `api/` record is wire and moves to `dto/`; `api/` deleted. All three remain composition modules with no table and no SQL. `feed` and `profile` keep their four `Follow*` imports from `identity` untouched.
- `chat` → layers; `ChatMessageResponse` to `dto/`, `ChatLimits` to `entity/` beside the one class that reads it, `ChatTopic` to `adapter/`; `api/` deleted.
- `poll` → layers; no `api/` existed and none is minted. `PollVoteInserter` stays its own bean.
- `invitation` → layers; `api/` unchanged, `InvitationApi` implemented as today. `ArchiveVoidsInvitations` and `InboxTopic` to `adapter/` with the two mailers and the mail configuration; the mailer port to `service/`. The archive reaction keeps `BEFORE_COMMIT` and `MANDATORY` propagation — ADR-038 rule 5's recorded exception is not loosened by a move.
- `report` → three flat slices, each under ten: `outbox` (the outbox entry, the screenshot, both repositories, and the value types the entry carries: status, type, reporter, device context), `intake` (the service, the inserter, the rate limiter, the submission, the accepted-report record, the id, the platform), `delivery` (the delivery service, the poller, the attempt, the relay port, both relays, the relay configuration, the envelope, the outcome). Direction: intake → outbox ← delivery, never intake ↔ delivery. Root: `api/` (`ReportPaths` until its ticket), `controller/` with its two argument helpers, `dto/`, `exception/`. The relay's explicitly stated HTTP transport survives the move.
- `join` → two slices, no class split. `join` folded into layer sub-folders — three controllers, five wire records, the link and request entities with the request status, two repositories, the service with its views, tokens and URLs, and the supersede listener and queue topic as adapters — every folder under ten. `card` folded into `controller/` and a twelve-type `service/`, the renderer being one algorithm. Root: `api/` (`JoinPaths` until its ticket), `exception/` with both exceptions. Two riders: the service's never-read event-publisher injection is deleted, and the consumer-less `card` named interface is deleted.
- The **api-is-never-wire guard**: one ArchUnit test in the support package beside the cycle rule. No class residing in any `api` package is the return type or a parameter type, generic arguments included, of a method declared on a `@RestController`. Measured before asserted; a converted-module controller found naming an `api` type is fixed in that PR, never exempted. It does not reach `dto/` factories that map from an `api` view, which is the converted modules' pattern.
- The **migration folder per module**: every migration under a `db/migration/<module>/` folder, version numbers still global, one Flyway bean, the configured locations unchanged since Flyway scans a classpath location recursively and records name and checksum rather than path. Assignment: with the module that owns the table a migration creates; an alter with the owner of the altered table; a cross-module write (the workspace backfill, the entries-become-postcards move) with the module ADR-038 records as owning that transaction, said in the commit. The traveler, vanity pool, follow and follow-request tables are `identity`'s; photo is `media`'s; the workspace, membership, edit lease, ownership, day, activity, history and fork tables and the trip table are `trip`'s; the itinerary object is `itinerary`'s; the legacy diary-entry table is `postcard`'s.
- **`SecurityConfig` owns its anonymous routes**: the three literals as its own named constants; `JoinPaths`, `ReportPaths` and `WebSocketPaths` deleted; the four test files that import `ReportPaths` take a test-support constant; `join/api` and `report/api` are then empty and go; `ws` keeps `ConnectionTicketResponse` and nothing else about `ws` moves; the recorded-cycle list shrinks by three. No semantic change: the same three matchers, the same `permitAll`. Auth-adjacent, so it starts on a founder yes.
- **06b §11** gains one line under *Types at the boundary*, in the last ticket of the series, once it is measurably true: `api/` holds the in-process contract, `dto/` holds the wire, a type is never both, a route constant is neither, and a module with no in-process caller has no `api/`.

**Verification loop for every move,** because the tooling lies after a move: `mvn -o clean test-compile` looped until quiet (an incremental compile after a move reports success on a tree that does not compile); the unit suite through surefire with the `Tests run:` line read (the guards and the meta-tests are surefire, and several read source by path); the module's ITs through failsafe with `failsafe:verify` appended and the counts read (a pattern matching nothing fails the build); CI green on the push, read from the log. Moves by `git mv`, staged by explicit path, never tree-wide — **and stage BEFORE the last compile, never after** *(amended 2026-09-11, after ticket 11 paid for the original order)*. A move's import fixes land wherever the moved class was named, which is routinely OUTSIDE the module being moved; so a loop that compiles the working tree and then stages one module's paths has verified a tree it is not committing, and the edit that made it compile stays behind as an unstaged file. `git diff --name-only` must come back **empty** before the commit — one command, and it is the only local check that sees this. Ticket 11 skipped it and CI caught a `ws` integration test naming a moved `join` class; the scoped IT run cannot catch it either, because `-Dit.test='com.largata.<module>.**.*IT'` never compiles a test in another module.

**Candidate-capability note:** none — no act, no capability. **Freshness note:** none — no surface changes; nothing to classify.

## Testing Decisions

**What a good test is here.** The work has two external behaviours: the wire is unchanged, and the boundaries hold. A test that asserts where a class lives is an implementation detail and is not written — except the boundary guards, whose whole job is the boundary. Nothing else about a test may change but its package line and its imports; a test that needs an edited assertion or fixture is evidence the ticket moved something it should not have.

**The seams, confirmed with the founder.**

1. **The backend IT suite and the Playwright `api` project, unedited** — prove the wire did not move. Package lines and imports follow the moved classes; no assertion, no fixture changes.
2. **The structural guards** — the meta-test, the cycle rule, the Modulith verification, the new-world boundary test and the ten per-module boundary tests — prove the boundaries hold through the moves. The only edits are the ones the record names: six guards drop the contract rule ArchUnit would fail on an empty selection, the chat and verification recorded-breach tests are deleted with their `api/`, and the recorded-cycle list shrinks by three in the last ticket. Every one of those edits is sabotage-checked: a guard that has lost a rule must still fail on a real breach, and the sabotage is a real usage (field, parameter or return type), never an unused import.
3. **The six migration-stepping ITs and CI's clean-checkout `docker compose up`** — prove the moved migrations are found by a test-configured Flyway and by Boot's, and that a fresh database still applies all 56.
4. **The anonymous-route ITs** for the join link, the report submission and the WebSocket handshake, unedited — prove `SecurityConfig`'s relocated literals still match.
5. **The api-is-never-wire rule** — the one new seam, in the cycle rule's mould: list-free, with vacuity checks that the import found controllers and found `api` packages, sabotage-checked by moving one wire record back into an `api` package and using it as a controller's return type.

**Prior art.** The cycle rule for a list-free structural rule with vacuity checks; the chat boundary test for a per-module guard and the shape of its `.as()` reasons; the diary stepping IT for a migration-stepping test; every module's ITs for wire behaviour; the meta-test for the no-by-name-exemption discipline the new guard must satisfy.

## Out of Scope

- `identity` in any form — the follow split, the `RequestPrincipal` record, a layout-only pass. The epic map's `RequestPrincipal` line owns it as a grilled story.
- `common`, `ws`, `media` and `health`: outside the rule by ADR-038's classification, or five files. The dissolution of `common.authz` is the deferred TW-2.
- The four converted modules.
- Any foreign-key drop or named Postgres schema: the FK-drop story, a stop-rule item.
- Splitting any class, `JoinService` included; a split is a behaviour-shaped change and this series is moves.
- Any change on the wire, any route, any field, any code (ADR-008).
- The three copies of the offer/accept lifecycle (invitation, ownership offer, join request): a deepening candidate on the epic map's architecture-review section, not a layout matter.
- Glossary rows for module, api, slice or layer: implementation vocabulary stays out of the domain glossary; ADR-039 defines *through api* and ADR-038 now defines what `api` may hold.

## Further Notes

- **The finding worth keeping.** `api` had come to mean the in-process contract in the four converted modules and the wire in the seven flat ones, and the guards written at PR #60 were recording that as two breaches to fix rather than as one classification to correct. The fix is a move, not a reshaped contract.
- **The rule of thumb for a new type.** Does another module call it in Java? Then `api/`. Does a controller take or return it? Then `dto/`. Neither? Then it is internal and lives by its layer.
- **How this spec came to be.** It was first hand-written with thirteen hand-rolled tickets beside it in one pass, which skipped the gate between design and spec; the founder caught it the same day, the design was re-cut on the TW-2 precedent, `/grill-with-docs` ran two rounds and fourteen questions, and this spec is `/to-spec`'s synthesis of that record. The tickets come from `/to-tickets`, typed by the founder.
- **Resuming cold.** Open with `git status --porcelain` and treat every printed path as somebody else's. Read the tickets, take the lowest-numbered one that is `ready-for-agent` with its blockers resolved, commit its `Status: claimed` first, branch from `dev`, verify per the loop above, and update the ticket and the ledger glyph in the last commit before opening the PR. Never merge unasked.
