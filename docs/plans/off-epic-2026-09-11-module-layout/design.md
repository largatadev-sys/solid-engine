# Module layout *(provisional: an off-epic slug today, a story id if the grilling makes it one)* — ADR-038's layout rule reaches the ten remaining modules, and `api` stops meaning two things

Design record, 2026-09-11, from a `codebase-design` conversation with the founder that began as *"should the remaining packages be decoupled or folded, and does each module need its own schema?"*. **This is the design record, not a grilling record and not a spec.** It was first written as a `spec.md` with thirteen hand-rolled tickets beside it, which skipped the gate the story workflow puts between a design and a spec — the agent never hand-writes a spec and never chains two steps — and the founder caught it the same day. It was re-cut to this shape on the TW-1 and TW-2 precedent. The founder types `/grill-with-docs` next; `/to-spec` and `/to-tickets` follow, and the tickets that skill produces are the per-module tracker. The directory name is provisional with the id.

## What the code says (measured 2026-09-11, main sources, `dev` at `ab5542dc`)

| Module | Files | Lines | In-process callers | Shape today |
|---|---:|---:|---|---|
| report | 32 | 1356 | `SecurityConfig` names `ReportPaths` | flat + `api/` + `web/` |
| verification | 22 | 694 | none | flat + `api/` + `web/` |
| place | 17 | 744 | none | flat + `api/` + `web/` |
| discovery | 9 | 477 | none | flat + `api/` + `web/` |
| feed | 7 | 337 | none | flat + `api/` + `web/` |
| profile | 7 | 411 | none | flat + `api/` + `web/` |
| chat | 11 | 409 | none | flat + `api/` + `web/` |
| poll | 20 | 1050 | none | flat + `web/` |
| invitation | 23 | 1208 | `join`, one method of `InvitationApi` | flat + `api/` + `web/` |
| join | 43 | 2214 | `SecurityConfig` names `JoinPaths` | flat + `api/` + `card/` + `web/` |

For contrast, the four converted modules: `trip` 146 files as slices; `postcard` 45, `diary` 41 and `itinerary` 19 as layers. Outside the rule by ADR-038's classification: `common` 58, `identity` 45, `ws` 26, `media` 14, all flat.

- **Eight of the ten have no in-process caller.** Two are named only by a route constant. Their only seam is HTTP, so under the deep-module vocabulary an `api/` package for them is a hypothetical seam.
- **The word `api` means two things in the tree.** In the four converted modules `api/` holds the in-process contract (`TripApi`, `DiaryApi`, view records, events) and the wire lives in `dto/`. In the seven guarded at PR #60, `api/` holds **wire records and route constants** — `ChatMessageResponse`, `VerificationCodeResponse` and its two siblings, discovery's five response records, feed's three, profile's three, `JoinPaths`, `ReportPaths` — and no main-tree class outside their module imports any of them. The only test-side consumer is four files importing `ReportPaths`.
- **The two "recorded breaches"** the chat and verification guards assert still fail (`ChatMessageResponse.of(ChatMessageView)`, `VerificationCodeResponse.of(IssuedCode)`) are this category error and not contract problems: a wire record sat in `api/` because the flat shape had no `dto/` to put it in.
- **`identity` holds two capabilities.** The traveler (28 files, 1,677 lines) and follow (17 files, 1,037 lines: `Follow`, `FollowRequest`, both services, standing, counts, topic, `ViewerRelation`, `PeopleQuery`, two controllers). Follow's outside callers are `feed` and `profile`, four files. Canon's module map in `04-architecture.md` names it `social`. 35 files outside `identity` import the `Traveler` JPA entity, which the epic map's `RequestPrincipal` line already measured.
- **`join/card/package-info.java` declares `@NamedInterface("card")`** and nothing outside `join`, main or test, imports `join.card`.
- **Schema.** Every table has exactly one module writing it. Cross-schema foreign keys are legal in Postgres, so a named schema per module would enforce nothing while the keys stand; what decouples is the FK drop, which is the FK-drop story and needs the event publication registry first. The cheap half that line names as pullable at any story is a migration folder per module: 56 files in one directory today, and the six migration-stepping ITs configure `.locations("classpath:db/migration")`, which Flyway scans recursively.

## The rule the design applies

ADR-038 rule 2: organize by layer while every layer folder stays scannable (around ten files); fold into feature slices when one outgrows that — `postcard` is layers, `trip` is slices, one criterion at two sizes. Flat is not one of the two named shapes. ADR-038 rule 3: the guard's front door is `api..` and `exception..`; how an `api` is implemented is chosen by whether an entity would otherwise cross. ADR-039's governing clarification: *through api* means the module's published **Java** contract called in-process, never the wire. 06b §11: constructor injection, package-private services and controllers, records at the boundary.

## The target shape proposed

The reference is `postcard` for layers and `trip` for slices.

| Folder | Holds | Visibility |
|---|---|---|
| `api/` | the in-process contract only: interfaces other modules inject, view records they receive, events; `package-info.java` carrying `@NamedInterface("api")` | public |
| `adapter/` | every concrete adapter at a seam, whichever side the port is on: package-private implementations of this module's `api` where an entity would otherwise cross, implementations of other modules' ports (`PhotoAudience`, `Topic`), event listeners reacting to other modules, and the two-sided internal seams (a mailer with a logging and a Resend adapter) | package-private |
| `controller/` | REST controllers and the argument helpers only they use | package-private |
| `dto/` | wire request and response records | public, for Jackson |
| `entity/` | JPA entities, their enums and value types | public where a repository names them |
| `exception/` | published refusals, `{Entity}{Condition}` | public |
| `repository/` | Spring Data interfaces | package-private where the layout allows |
| `service/` | services, inserters, internal view records, internal port interfaces | public class, package-private constructor |

Slices, for a module whose `service/` would pass ten files: `<slice>/` folders, each flat while it stays scannable and taking the layer sub-folders when it passes ten — `trip/dump/` is the flat form, `trip/plan/` the folded one. One `api/` and one `exception/` stay at the module root.

**The classification rule the design proposes to enforce.** A type is `api` only if another module calls it in-process. A type is `dto` if it appears in a controller signature. Nothing is both. Pinned by a list-free ArchUnit rule: no class in `com.largata..api..` is the return type or a parameter type of a method declared on a `@RestController`, born green in the PR that moves the last wire record out. ArchUnit fails a rule whose `that()` selects no class, so a guard for a module with no `api/` drops its "the contract depends on nothing behind it" rule and, for chat and verification, the test asserting the recorded breach still fails; the meta-test's exemption regex is untouched, since deleting a rule with no subject is not a by-name exemption. Modulith treats an unannotated root package as the api; the root would be empty, and `ModulithVerificationTest` must still refuse postcard alone.

**Per module, what `api/` would hold afterwards.**

| Module | `api/` afterwards | Why |
|---|---|---|
| invitation | `InvitationApi` | `join` calls it |
| report, join | `ReportPaths`, `JoinPaths` until `SecurityConfig` owns its routes; then nothing | a route constant is not a contract, and `SecurityConfig` naming it is a recorded cycle |
| chat, verification, discovery, feed, profile, poll | nothing | no caller; every record there is wire |
| place | nothing | `PlaceSuggester` is an internal seam with two adapters and no caller outside the module. A seam earns `api/` when its second side exists |

## Decisions for the grilling

1. **Chore or story, and the id.** The precedents that went straight to a branch (the cycle rule, PR #59; the seven owed guards, PR #60) were one PR each applying a rule with no judgment left in it. This is ten modules, about thirteen PRs, and the judgment calls below. If a story: which family the id belongs to.
2. **A module nobody calls in-process.** No `api/` at all (proposed), an empty `api/` kept for uniformity, or the wire records left where they are with the recorded-breach tests standing.
3. **Route constants.** `JoinPaths`, `ReportPaths`, `WebSocketPaths` are named by `SecurityConfig` and are three of the five recorded cycles. The composition root owning its own route list retires them — auth-adjacent, so a stop-rule item — or they stay as the module publishing its routes.
4. **`place`'s seam.** Inward to `service/` and `adapter/` (proposed), or published as it is.
5. **Layers for the small modules.** ADR-038's literal default is layers at any size; the agent argued flat below about a dozen files on readability and withdrew it against the ADR. `health` at five files is the one the design still leaves alone.
6. **Slices for `report` and `join`,** and the proposed cuts in the appendix: `intake` and `delivery` for report; `link`, `request` and `card` for join. `JoinService` likely spans link and request.
7. **The api-is-never-wire guard.** Wanted, and in that shape (controller signatures, generic type arguments included)?
8. **A migration folder per module now,** ahead of the FK-drop story, with the assignment rule in the appendix — or with that story.
9. **`identity` out of the sweep** (proposed): its split is the `RequestPrincipal` line's story. `common`, `ws`, `media` out by classification.
10. **Sequencing.** One PR per module, leaves first, `join` last; the guard after the five wire-record moves; what a single session may take.
11. **The candidate-capability note and the freshness note** the spec must carry: none of this is a capability, and no surface changes.

## What "done" would mean for one module — the verification the design assumes

- Every main-tree file of the module in a target folder; the module root holds no class. `git mv`, staged by explicit path.
- Tests mirror: `web/` becomes `controller/`, a unit test follows its subject, the boundary test stays at the module root; no assertion edited.
- `mvn -o clean test-compile` looped until quiet — an incremental compile after a move reports success on a tree that does not compile (TW-1, three times).
- `mvn -o surefire:test` with the `Tests run:` line read — the guards, `ModuleGuardMetaTest`, `ModuleCycleTest`, `ModulithVerificationTest` and `NewWorldBoundaryTest` are surefire, and several read source by path.
- `mvn -o test-compile failsafe:integration-test failsafe:verify -Dit.test='com.largata.<module>.**.*IT'` with the counts read.
- `ModuleCycleTest`'s recorded set unchanged; `ModulithVerificationTest` still refuses postcard alone; the module's guard still selects something.
- Nothing on the wire changes (ADR-008).

## Appendix — proposed file maps, to be confirmed by reading each type's dependencies rather than its name

**report → slices.** Root: `api/` (`ReportPaths` until retired), `controller/` (`ReportController`, `CallerAddress`, `OptionalReporter`), `dto/` (`SubmitReportRequest`, `SubmitReportResponse`), `exception/` (`ReportExceptions`). `intake/`: `ReportService`, `ReportInserter`, `ReportRateLimiter`, `ReportSubmission`, `Reporter`, `DeviceContext`, `AcceptedReport`, `ReportId`, `ReportPlatform`, `ReportType`, `ReportScreenshot`, `ReportScreenshotRepository`. `delivery/`: `ReportOutboxEntry`, `ReportOutboxRepository`, `ReportStatus`, `ReportDeliveryAttempt`, `ReportDeliveryService`, `ReportDeliveryPoller`, `ReportRelay`, `LoggingReportRelay`, `WorklogReportRelay`, `ReportRelayConfig`, `RelayEnvelope`, `RelayOutcome`. Two slices of twelve is the boundary case; sub-folders over a third slice invented to stay under the number. The relay's stated `RestClient` transport must survive the move.

**verification → layers, `api/` deleted.** `controller/` `VerificationController` · `dto/` `ConfirmCodeRequest`, `VerificationCodeResponse`, `VerificationResultResponse` · `entity/` `VerificationCode`, `VerificationAttempts` if it is the row's value type · `repository/` `VerificationCodeRepository` · `exception/` `VerificationExceptions` · `service/` `VerificationService`, `VerificationCodes`, `IssuedCode`, `VerificationMail`, the ports `EmailVerificationFlag`, `VerificationMailer` · `adapter/` `FirebaseEmailVerificationFlag`, `UnconfiguredEmailVerificationFlag`, `EmailVerificationFlagConfig`, `FirebaseCredentials`, `LoggingVerificationMailer`, `ResendVerificationMailer`, `VerificationMailConfig`. The profile pairs must still resolve one bean each, run in both profiles; the Admin SDK transport stays `NetHttpTransport`.

**place → layers, `api/` deleted.** `controller/` `PlaceSearchController`, `MapConfigController` · `dto/` `PlaceSearchResponse`, `PlaceCandidateResponse`, `MapConfigResponse` · `exception/` `PlaceSearchUnavailableException`, `TooManySearchesException` · `service/` `PlaceSearchService`, `SearchRateLimiter`, `SuggestionCache`, `PlaceSuggester`, `PlaceCandidate`, `ResolvedPlace` · `adapter/` `FixturePlaceSuggester`, `PhotonPlaceSuggester`, `PlaceSuggesterConfig`. `ModuleCycleTest` names `place` as the module in no cycle; that stays.

**discovery → layers, `api/` deleted.** `controller/` `DiscoveryController` · `dto/` the five response records · `service/` `DiscoveryService`, `DiscoveryFilters`. Composition module: still no table, no SQL.

**feed → layers, `api/` deleted.** `controller/` `PostcardFeedController` · `dto/` `FeedPostcardResponse`, `FeedPhotoResponse`, `PublicTripDiaryResponse` · `exception/` `FeedExceptions` · `service/` `PostcardFeedService`. Composition module; `postcard.api`'s `feedPageOf` stays the query.

**profile → layers, `api/` deleted.** `controller/` `MyProfileController`, `PublicProfileController` · `dto/` `DiaryTripResponse`, `ProfileStatsResponse`, `ShowcaseItineraryResponse` · `service/` `PublicProfileService`. The four `Follow*` imports from `identity` are untouched; the split is a story.

**chat → layers, `api/` deleted.** `controller/` `ChatController` · `dto/` `SendMessageRequest`, `ChatMessageResponse` · `entity/` `ChatMessage`, `ChatLimits` · `repository/` `ChatMessageRepository` · `exception/` `ChatExceptions` · `service/` `ChatService`, `ChatMessageView` · `adapter/` `ChatTopic` (chat satisfying `ws`'s port).

**poll → layers, no `api/`.** `controller/` `PollController` · `dto/` `CreatePollRequest`, `CastVoteRequest`, `PollResponse`, `PollBoardResponse`, `PollOptionResponse`, `PollVoterResponse` · `entity/` `Poll`, `PollOption`, `PollVote` · `repository/` `PollRepository`, `PollVoteRepository` · `exception/` `PollExceptions` · `service/` `PollService`, `PollVoteInserter` (its own bean, `REQUIRES_NEW`, must not fold into the service), `PollBoard`, `PollView`, `PollOptionView`, `PollTally`, `PollVoterSummary`.

**invitation → layers, `api/` stays.** `api/` `InvitationApi` unchanged · `controller/` `InvitationController`, `TripInvitationController` · `dto/` `CreateInvitationRequest`, `InviteByHandleRequest`, `InvitationResponse`, `InboxInvitationResponse`, `AcceptResponse` · `entity/` `Invitation`, `InvitationStatus` · `repository/` `InvitationRepository` · `exception/` `InvitationExceptions` · `service/` `InvitationService`, `InvitationMailer`, `InvitationMail`, `InboxInvitation`, `PendingInvitation` · `adapter/` `ArchiveVoidsInvitations` (keeps `BEFORE_COMMIT` and `MANDATORY`; ADR-038 rule 5's recorded exception), `InboxTopic`, `LoggingInvitationMailer`, `ResendInvitationMailer`, `InvitationMailConfig`.

**join → slices.** Root: `api/` (`JoinPaths` until retired), `exception/` (`JoinExceptions`, `SignInRequiredException`). `link/`: `JoinLink`, `JoinLinkRepository`, `JoinLinkView`, `JoinTokens`, `JoinUrls`, `JoinTeaser`, `ViewerJoinState`, `JoinService` if it writes the link, `JoinController`, `JoinLinkResponse`, `JoinTeaserResponse`, `OptionalViewer`. `request/`: `JoinRequest`, `JoinRequestRepository`, `JoinRequestStatus`, `MyJoinRequest`, `PendingJoinRequest`, `SupersedeOnMembershipArrival`, `JoinQueueTopic`, `TripJoinController`, `MyJoinRequestController`, `JoinRequestResponse`, `JoinRequestSummaryResponse`, `MyJoinRequestResponse`. `card/`: `JoinCard`, `JoinCardService`, `CardRenderer`, `CardArt`, `CardFonts`, `CardSubject`, `DestinationInitials`, `GenericCard`, `PreviewPage`, `PreviewSubject`, `TitleBlock`, `TripMetaLine`, `JoinCardController`, `CardUrls`. Each slice passes ten, so each takes the layer sub-folders. The `@NamedInterface("card")` vestige is deleted on the way; a resource path relative to the old package is the trap for the card's fonts and art.

**The api-is-never-wire guard.** One list-free ArchUnit test beside `ModuleCycleTest`: no class in `com.largata..api..` is a return or parameter type, generic arguments included, of a method on a `@RestController`. Measured before asserted; a new-world controller naming an `api` type would be a finding to fix, never an exemption. Sabotage by a real signature use, since an unused import is not a bytecode dependency (PR #60's trap).

**A migration folder per module.** `db/migration/<module>/`, version numbers global, `spring.flyway.locations` unchanged. Assignment: with the module that owns the table a migration creates; an alter with the owner of the altered table; a cross-module write (`V5__backfill_workspaces`, `V54__entries_become_postcards`) with the module ADR-038 records as owning that transaction, said in the commit. `traveler`, `vanity_pool`, `follow`, `follow_request` → identity; `photo` → media; `edit_lease`, `workspace`, `membership`, `ownership_offer`, `ownership_transfer`, `day`, `activity`, `activity_history`, `fork_relationship`, the trip table → trip; `itinerary_object` → itinerary; `diary_entry` → postcard. `mvn -o test-compile` before any run (S4.13: a moved resource is an edited one); the six stepping ITs are the proof; `flyway_schema_history` at 56 rows on a fresh stack.

**`SecurityConfig` owns its anonymous routes.** The three literals as its own constants; `JoinPaths`, `ReportPaths`, `WebSocketPaths` deleted; the four test files importing `ReportPaths` take a test-support constant; `ModuleCycleTest.KNOWN_CYCLES` shrinks by three. No semantic change: the same three matchers, the same `permitAll`. Discriminating check: the ITs asserting anonymous access to the three routes pass unedited. Auth-adjacent, so the stop-rule gate.
