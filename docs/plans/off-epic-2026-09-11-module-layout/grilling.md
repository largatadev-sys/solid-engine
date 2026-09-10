# Module layout — grilling record

`/grill-with-docs`, 2026-09-11, following the design record in [design.md](design.md). Rounds as asked, the founder's answers verbatim, the agent's reading under each. Where this record and a later spec disagree, the record wins. The id stays the off-epic slug, settled at Q1.

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
