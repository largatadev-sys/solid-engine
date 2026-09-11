# Module layout — grilling record

`/grill-with-docs`, 2026-09-11, following the design record in [design.md](design.md). Rounds as asked, the founder's answers verbatim, the agent's reading under each. Where this record and a later spec disagree, the record wins; where it and the design disagree, the record wins too — round 2 replaced two of the design's proposed cuts. The id stays the off-epic slug, settled at Q1.

## Facts found before round 1 (the agent's job, not the founder's)

- The measurements the design carries: ten modules on the pre-CM-2 flat shape, eight with no in-process caller, seven `api/` packages holding only wire records and route constants that nothing outside their module imports. See [design.md](design.md), *What the code says*.
- `join/JoinService` writes both tables — `join_link` only through the private mint reached from `linkFor`, `join_request` in `request`, `withdraw`, `approve`, `decline` and `supersedeOpenRequest`. It is referenced by `JoinCardService`, `SupersedeOnMembershipArrival` and the three controllers, never by `join/card/`. Its `ApplicationEventPublisher` field is assigned in the constructor and never read.
- `report` has four types both the intake side and the delivery side use directly: `ReportOutboxEntry`, `ReportOutboxRepository`, `ReportScreenshot`, `DeviceContext`; `ReportScreenshotRepository` is used by `ReportInserter` and `ReportDeliveryAttempt`; `Reporter` and `ReportType` are shared transitively through the entity. `ReportDeliveryPoller` references only `ReportDeliveryService`.
- `verification/VerificationAttempts` is a package-private `@Component` with one `REQUIRES_NEW` method, referenced only by `VerificationService`. `IssuedCode` is referenced by the service and by the wire record `VerificationCodeResponse`.
- `place/PlaceSuggesterConfig` selects its adapter by `@ConditionalOnExpression` on `largata.place.photon-url`, reading two package-private constants on `PhotonPlaceSuggester`; the fixture bean also demands `largata.place.fixture-allowed`.
- `chat/api/ChatLimits` is referenced by `ChatMessage` alone; `ChatTopic` by `ChatService` alone.
- No `archunit.properties` in the tree, so ArchUnit's default holds: a rule whose `that()` selects no class fails.
- `docs/design/02-domain-model.md` has no rows for module, api, adapter, slice or layer; ADR-039 defines *through api* in prose.
- CLAUDE.md's git workflow: one branch per story, many commits, one PR at the gate — a PR is not per ticket; the squash is the rollback unit.

## Round 1

**Q1 — Chore series or story, and the id.** (a) one story, one branch, tickets are modules, one squash PR at the gate; (b) a chore series under one grilled spec, `/to-spec` and `/to-tickets` still run, each ticket its own PR on `chore/module-layout-<module>` as a recorded exception to "a PR is not per ticket", no story id, `module-layout` in every commit subject; (c) one story per module. *Recommended (b).*

> q1 - agreed b

Reading: (b). The rollback unit of a layout sweep is the module, which is the property the one-PR-per-story rule exists to protect, so the rule bends for that reason and the spec records the exception. The directory keeps its off-epic slug; `git log --grep module-layout` ties the commits to it since no story id exists.

**Q2 — A module nobody calls in-process.** (a) no `api/` at all — wire records to `dto/`, the package and its `@NamedInterface` go, the guard drops the contract rule ArchUnit would otherwise fail on an empty selection, the chat and verification recorded-breach tests go with it; (b) an empty `api/` kept for uniformity; (c) the wire records stay in `api/`. *Recommended (a).*

> q2 - agreed

Reading: (a). The absence of `api/` is the true statement about a module nothing calls in Java; a module earns the folder when its second side exists, as `invitation` did at PR #60.

**Q3 — Route constants.** (a) `SecurityConfig` owns its route list: three literals as its own constants, `JoinPaths`, `ReportPaths`, `WebSocketPaths` deleted, four test files take a test-support constant, `KNOWN_CYCLES` shrinks by three; a stop-rule item, its ticket waits for its own yes; (b) a module publishes its own routes and the cycles stay recorded. *Recommended (a), sequenced last.*

> q3 - agreed

Reading: (a). A route constant is not a contract. The ticket is last in the series and starts on a plain yes, since it edits `SecurityConfig`.

**Q4 — `place`'s seam.** (a) inward: the interface and its records to `service/`, the adapters and config to `adapter/`, the exceptions to `exception/`, `api/` goes; (b) published as it is. *Recommended (a).*

> q4 - agreed

Reading: (a). Two adapters on the inside is a real internal seam; a `PlaceApi` is minted the day `trip` needs one.

**Q5 — Layers at any size.** (a) layers for all ten, ADR-038 rule 2 read literally; (b) a floor below which a module stays flat with `web/`. *Recommended (a).*

> q5 - agreed

Reading: (a). One shape to learn, and a `dto/` in every module so a wire record has nowhere else to go. Folders with nothing in them do not exist.

**Q6 — Slices for `report` and `join`.** (a) slices for both, `api/` and `exception/` at the module root, each slice flat while scannable and folded past ten; (b) layers with an oversized `service/`. *Recommended (a).*

> q6 - agreed

Reading: (a). The cuts are round 2's questions, now that the dependency map is in.

**Q7 — A migration folder per module, now or later.** (a) now, as a rider ticket with its own PR of nothing but renames; (b) with the FK-drop story. *Recommended (a).*

> q7 - agreed

Reading: (a). Pure readability over one directory of 56 files, no SQL change, the six stepping ITs the proof.

**Q8 — `identity` stays out.** (a) out, with `feed` and `profile` keeping their four `Follow*` imports untouched; (b) in, as a layout-only pass moved twice. *Recommended (a).*

> q8 - agreed

Reading: (a). The split is the `RequestPrincipal` line's story.

*(The founder's round 1 answers arrived twice, identical.)*

## Round 2

**Q9 — The `join` cut.** The dependency map contradicted the design's three slices: a request is made *through* a link, one service writes both tables, and nothing in `card/` touches those tables. (a) two slices, no class split — `join/join/` folded into layer sub-folders, every folder under ten, `join/card/` folded into `controller/` and a twelve-type `service/`, `api/` and `exception/` at the root, on the `trip/trip/` namesake precedent; (b) three slices with `JoinService` in `request/`; (c) split `JoinService`. Two riders either way: the never-read `ApplicationEventPublisher` injection is deleted, and the consumer-less `@NamedInterface("card")` goes. *Recommended (a).*

> q9 - agreed

Reading: (a). The module has one real seam, join-versus-card, and the slices say so. The design's `link/` and `request/` are superseded. The two riders ride the join ticket.

**Q10 — The `report` cut.** The measured shared set is a slice. (a) three flat slices — `outbox/` (`ReportOutboxEntry`, its repository, `ReportScreenshot`, its repository, `ReportStatus`, `ReportType`, `Reporter`, `DeviceContext`), `intake/` (`ReportService`, `ReportInserter`, `ReportRateLimiter`, `ReportSubmission`, `AcceptedReport`, `ReportId`, `ReportPlatform`), `delivery/` (`ReportDeliveryService`, `ReportDeliveryPoller`, `ReportDeliveryAttempt`, `ReportRelay`, both relays, `ReportRelayConfig`, `RelayEnvelope`, `RelayOutcome`); root `api/` (`ReportPaths` until its ticket), `controller/`, `dto/`, `exception/`; direction intake → outbox ← delivery, never intake ↔ delivery; `trip/workspace/` the precedent; (b) two slices with the outbox in `intake/`; (c) two with it in `delivery/`. *Recommended (a).*

> q10 - agreed

Reading: (a). Naming the shared set keeps the two sides from naming each other. The design's two-slice cut is superseded. Every slice stays under ten, so none folds.

**Q11 — The api-is-never-wire guard.** (a) one list-free ArchUnit test beside `ModuleCycleTest`: no class in `com.largata..api..` is the return type or a parameter type, generic arguments included, of a method declared on a `@RestController`; measured before asserted; sabotage by a real signature use; lands in the ticket that moves the fifth wire record out, born green; it does not reach `dto/` factories such as `TripResponse.of(TripTeaser)`, which is the new-world pattern; (b) no guard. *Recommended (a).*

> q11 - agreed

Reading: (a). The classification becomes a property of the tree.

**Q12 — Where the vocabulary lands, and whether ADR-038 takes an amendment.** (a) a measured 06b §11 line under *Types at the boundary* — `api/` holds the in-process contract, `dto/` holds the wire, a type is never both, a route constant is neither, a module with no in-process caller has no `api/` — and a dated amendment on ADR-038 rule 1 carrying the two-meanings history; no glossary rows; (b) glossary rows; (c) the 06b line only. *Recommended (a).*

> q12 - agreed

Reading: (a). The ADR-038 amendment is written into `adr-log.md` with this record, since it records a decision taken today. The 06b line lands with the last ticket of the series, because §11 measures the tree and the line is not true until then — ADR-039's own note on §11 is the precedent. No glossary row: implementation vocabulary does not enter a domain glossary.

**Q13 — Sequencing and the session rule.** (a) small to large — verification, place, discovery, feed, profile, chat, then the guard, then poll, invitation, report, join; the migration folder at any point; `SecurityConfig` last on its own yes; a session claims one ticket by `Status:` and takes another once that PR is open; per-ticket status in each ticket's `Status:` line and as a glyph on the BUILD_STATUS ledger entry, updated in each PR's last commit; (b) largest first. *Recommended (a).*

> q13 - agreed

Reading: (a). `/to-tickets` numbers in this order.

**Q14 — The two notes the spec must carry.** *Recommended both none.*

> q14 - agreed

Reading: candidate-capability note: none — no act, no capability. Freshness note: none — no surface changes.

*(The founder's round 2 answers arrived with `q10 - agreed` repeated.)*

## Shared understanding — the frontier is empty

- **Shape.** A chore series under one grilled spec, off-epic slug, each ticket its own PR on `chore/module-layout-<module>`, `module-layout` in every commit subject, the exception to "a PR is not per ticket" recorded in the spec with its reason.
- **The rule.** ADR-038 rule 2 applied literally to the ten modules: layers for verification, place, discovery, feed, profile, chat, poll and invitation; slices for report (`outbox`, `intake`, `delivery`) and join (`join`, `card`).
- **The classification.** `api/` is the in-process contract and nothing else; `dto/` is the wire; a route constant is neither; a module with no in-process caller has no `api/`. Six modules lose `api/`, `invitation` keeps `InvitationApi`, `report` and `join` keep a route constant until `SecurityConfig` owns its routes. An ArchUnit rule pins it. ADR-038 rule 1 is amended today; the 06b §11 line lands with the last ticket.
- **The riders.** A migration folder per module, now. `SecurityConfig` owning its anonymous routes, last and on its own yes. In the join ticket, the dead event-publisher injection and the vestigial named interface go.
- **Out.** `identity`, `common`, `ws`, `media`, `health`, and the four converted modules.
- **Next.** The founder types `/to-spec`.
