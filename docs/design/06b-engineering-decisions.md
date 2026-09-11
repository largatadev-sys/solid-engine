# 06b · Engineering Decisions — Largata

**The per-system half of artifact 6.** `06a-engineering-principles.md` is **ratified as-is, zero amendments** (reviewed 12/07/2026 against Artifacts 00–05; P1–P10 fit this system; the guard in Artifact 03 is P6 applied to authorization).

**Dial (from Artifact 01's mode — Product, MVP feature scope):** collapsed/MVP grade overall, **with two subsystems at Full rigor regardless:**
1. **The ledger** (money + INV-7/8) — the highest-consequence correctness zone.
2. **The authorization guard** (INV-1) — the highest-consequence safety zone.

_Status: **proposed — pending founder ratification.**_

---

## 1. Stack

- **Backend:** Java + Spring Boot · Spring Web · Spring Security (OAuth2 resource server + the guard) · Spring Data/JPA + Flyway migrations · PostgreSQL. (ADR-005)
- **Frontend:** React Native + Expo (EAS, dev-build workflow) · TypeScript throughout. (ADR-004)
- **Infra/deploy:** full-stack local Docker (Spring + Postgres + storage emulator) → PaaS (app + managed Postgres + S3-class storage) · CI runs build + tests + the review-gate checks. (Artifact 04)

## 2. Layer names — *instantiates P1*

- Boundary: **controller** (REST controllers; parse/validate shape, call the service — zero business branching).
- Logic: **service** (owns the rules, the transactions, the state machines).
- Persistence: **repository** (Spring Data; queries only, zero business decisions).
- Cross-cutting: one **`common`** package — exception types, the global handler, logging filter, the authorization guard, shared config.
- Module layout mirrors Artifact 04: `identity / itinerary / workspace (…ledger) / diary / social / unfurler`, each with its own controller–service–repository stack; cross-module access **by ID through service interfaces only**.

## 3. Exception taxonomy — *instantiates P2*

- Root: `DomainException` (unchecked, abstract).
- Category parents → status: `NotFoundException → 404` · `ValidationException → 400` · `ConflictException → 409` (includes illegal state transitions) · `ForbiddenException → 403` · `UnavailableException → 503`.
  - *`UnavailableException` added at S0.1 (ticket 03).* A required dependency did not answer — neither the caller's fault nor a domain-rule rejection, so none of the other four fits. Without it the only options were an untyped 500 (a Spring error page, violating P2) or misusing a category. Its message never names the failed dependency — that would tell an anonymous caller about our topology; the operator gets the detail from the correlated log line.
- Naming: `{Entity}{Condition}` — `WorkspaceNotFound`, `SplitsDoNotSum`, `IllegalItineraryTransition`, `NotAMember`.
- Single handler: one `@RestControllerAdvice` in `common` — logs once, maps to the Artifact 05 envelope. Infrastructure exceptions (DataAccess, IO) are translated to domain errors **in the service layer**; nothing raw ever reaches a controller or the client.

## 4. Logging format — *instantiates P3*

- Structured JSON via the Spring logging stack.
- Context fields injected once by a filter (never by leaf code): `traceId`, `userId` (Firebase UID), `endpoint`.
- Per-call: services log one info line on success (entity id + operation) and one warn on business rejection; the global handler owns all error-severity logging (type + code + traceId).
- **Never logged, no exceptions, no dial:** passwords, tokens, keys, raw request bodies, media, PII, ledger amounts tied to identifiable users in aggregate exports.

## 5. API contract — *instantiates P5*

→ **`05-api-conventions.md`** in full: method→status table, the `{code,message,traceId,timestamp}` envelope, cursor pagination `{items,nextCursor}`, camelCase, `/v1` additive-only (ADR-008). Decided there; not duplicated here.

## 6. Boundary gateway & shared types — *instantiates P6/P7*

- **Mobile outbound:** one typed `apiClient` inside the **repository/local-cache layer** (ADR-001) — components never call `fetch`; the client returns typed data or throws one typed `ApiError { code, message, status, traceId }`. Auth-token attach/refresh handled in the client, once.
- **Shared types:** one `types/` location in the mobile app mirroring the API DTOs; no `any` at any boundary (P7 floor). Backend DTOs live per-module in one `api` package each.
- **Backend outbound:** one client wrapper per external system (Firebase Admin, object storage, email provider, the unfurler's HTTP fetcher) — each the only place that knows the SDK exists.

## 7. Test stack & depth — *instantiates P8 — decided on purpose, not inherited*

| Layer | Tool | Depth (the deliberate choice) |
|---|---|---|
| Logic-layer unit | JUnit (Jupiter API; version per Spring Boot BOM) + Mockito | Every domain rule appearing in an AC. **Exhaustive in the two Full zones:** ledger math (INV-7 sums, INV-8 append-only, expense-vs-transfer) and every state machine's legal **and illegal** transitions. |
| Integration | Spring Boot Test + **Testcontainers Postgres** | **The isolation-boundary matrix is non-negotiable despite the MVP dial** (it is INV-1): non-member → 403/404 on every workspace-scoped endpoint category · visitor write-rejection · visibility (`private / published` — binary since S4.1/ADR-017, plus the archived owner-only narrowing) · owner-vs-member rights. Plus contract basics: status codes + error envelope. |
| Boundary-call unit | Jest (mobile) | The repository/cache layer (ADR-001's abstraction) and the `apiClient`'s shape/error translation. No component-snapshot theater. |
| E2E — per story | Scripted **API-level happy path** against the running Docker stack | One per story; the story's ACs are the spec. |
| E2E — per release | **Maestro-class automated mobile smoke suite** | Small and pinned: **5–8 critical flows only** (sign in → create itinerary → invite → add item → log expense → publish). Runs per release candidate, not per story. |
| Regression | **Maintained checklist** (lives next to BUILD_STATUS) | Every bug that escapes to a human adds a line; **a line that recurs graduates into the automated smoke suite.** The ratchet is the rule. |

Deferred to post-validation: full mobile-UI E2E coverage, load tests, chaos anything.

## 8. Authorization placement & roles

- **The single place:** the authorization guard in `common` (Artifact 03) + Spring Security config for authentication. **No inline authority checks in controllers or services** — services *receive* the resolved `Membership` and may branch on its role, but never resolve or re-check membership themselves.
- **Roles:** platform: authenticated Traveler vs. unauthenticated Visitor · workspace-scoped: `owner | member` (owner: delete trip, remove members, publish, archive, transfer ownership) · diary-scoped: author-owner vs. granted contributor.

## 9. Pointers — owned elsewhere

- **Tenancy/isolation:** → `03-tenancy-model.md`
- **Architecture topology & module rules:** → `04-architecture.md`
- **Domain model & invariants:** → `02-domain-model.md`

## 10. Code commentary — *instantiates P9/P10*

**Invariant.** Source files carry no prose. Meaning in code is carried by names, types and tests; the *why* — which story shipped it, which alternative lost, which decision governs it — lives in the spec, the ADR log and the commit message. P9 already says this (*"recording why in the commit message, not a code comment"*); this section makes it the whole rule rather than an aside about factories.

**Check.** Grep the diff for `//`, `/*`, `/**`. Any hit that is not a tool directive is a violation. Binary, and it runs at the review gate with everything else.

**Carve-out — exhaustive, and not a judgement call.** `// eslint-disable*`, `// @ts-expect-error`, `// @ts-ignore`, `// prettier-ignore`, `/* istanbul ignore */`. These are consumed by a tool, not a human: they are code that happens to use comment syntax, and deleting one changes what the build does (`@ts-expect-error` fails outright when there is no error to suppress). **A directive with an explanation attached keeps the directive and loses the explanation.** Nothing else qualifies; if a reader is the consumer, it is prose.

**Where the knowledge goes instead.** A trap a future change could silently trip becomes a **named test that fails when the trap is re-tripped**. If no test can catch it — a filesystem or toolchain property, not a program property — it becomes a line in CLAUDE.md's Gotchas. A comment is not one of the options: it is the form this section exists to remove.

**Why, in one line.** A comment has no failure mode. Change the code it describes and it stays green while it starts lying — which is the *"check whose two outcomes are indistinguishable"* shape this repo has been burned by repeatedly, and the reason BUILD_STATUS is forbidden from duplicating facts git already owns. A test that goes red is the same knowledge with a failure mode attached, and is therefore strictly better than the comment it replaces.

**Dial. Floor.** Volume is not a rigor setting. The two Full-rigor subsystems (the ledger, the authorization guard) earn their rigor through *more tests*, never more prose.

*Adopted 2026-07-29 (off-epic). At adoption the tree carried 8,272 comment lines across 285 of 286 source and test files — 43% of backend production source, 29% of mobile — accreted with no rule ever requiring them. Flyway migrations are out of scope permanently: their content is checksummed, so editing an applied migration fails validation on every environment that has run it.*

**Resolution: ☑ Agreed** *(proposed solo — pending founder ratification; 06a ratified unamended)*

## 11. Spring and Java conventions — *instantiates P1/P6*

**Why this section exists.** Every rule below was already true of the tree when it was written — measured, not proposed. They were being enforced in review, one flag at a time, which is the expensive way: the founder catches what the agent could not have known, and the same conversation happens again on the next story. This section is that knowledge moved from a reviewer's head into a file an agent reads first. **A convention that only exists in review comments is not a convention; it is a tax.**

**Where the house differs from a Spring default, it says so and why.** The rest is ordinary Spring Boot practice and needs no defence.

### Injection and visibility

- **Constructor injection only. `@Autowired` appears nowhere** (measured: 0 occurrences, 163 classes on constructor injection). Fields are `private final`, set once. A missing collaborator is then a compile error rather than a `NullPointerException` on the first request, and the class is constructible in a test without a container.
- **Constructors on `@Service` classes are package-private** (measured: 42 of 42). The bean is Spring's to build and the module's to construct; nothing outside the package should be calling `new` on a service.
- **Classes are package-private unless something outside the package must name them.** Controllers are the clearest case — 40 of 42 are package-private, because nothing calls a controller in-process (§2: the boundary is REST; the in-process boundary is `api`). `@Service` classes are public today only because the layer split at CM-2 cost them their seal; the boundary guards are what replaced it (ADR-038), and a service that gains an `api` adapter should lose `public` with it.
- **`@Repository` is a Spring Data interface, never a hand-written class** — queries only, zero business decisions (§2).

### Naming

- **No `Impl` suffix, anywhere** (measured: 0). An implementation is named for **what distinguishes it from the others that could exist** — `RowBackedMembershipResolver`, `PostcardDiaryContents`, `LoggingInvitationMailer`, `DiaryCoverAudience`. `Impl` asserts there is only one, so the day a second arrives the first must be renamed; this tree has already lived that swap once (`OwnerMembershipResolver` → `RowBackedMembershipResolver` at S1.1), and both names stayed meaningful side by side because neither claimed to be *the* one. **This is a deliberate deviation from the most common Java convention**, taken because the alternative degrades exactly when it matters.
- **Exceptions are `{Entity}{Condition}`** (§3), and they are published surface — a module's `exception..` package is part of its front door (ADR-038).
- **A component and its helper must not differ only by case.** `LifecycleBanner.tsx` beside `lifecycleBanner.ts` resolves arbitrarily on a case-insensitive filesystem; distinguish by more than a capital. This is the one rule in the tree no test can enforce — it is a property of the filesystem, not of any program — so it lives here and in CLAUDE.md's Gotchas.

### Transactions

- **`@Transactional` goes on methods, never on classes** (measured: 283 method-level, 0 class-level). A class-level annotation silently enrolls every method added later, including reads that should be `readOnly` and helpers that should not have a transaction at all.
- **Reads carry `readOnly = true`.** It is a real hint to the provider, not decoration.
- **Self-invocation does not go through the proxy**, so a `@Transactional` method called from inside the same bean is not transactional. Insert-on-conflict recovery therefore needs the insert in a **separate bean** with `REQUIRES_NEW` plus `saveAndFlush` — `TripDiaryInserter` and `DiaryDayInserter` are the worked examples.
- **No single transaction writes across a module line**, with the exceptions recorded in ADR-038 rule 5 and nowhere else.

### Types at the boundary

- **Wire records are `record`s** (measured: 20 of 20 DTOs). They are immutable, they carry no behaviour, and Jackson needs no help with them.
- **`api` holds the in-process contract, `dto` holds the wire, a type is never both, and a route constant is neither** *(added 2026-09-11, module-layout ticket 13 — written only once the tree made every clause of it true)*. A type belongs in `api` if another module calls it in Java; it belongs in `dto` if a controller takes or returns it. **A module with no in-process caller has no `api` package at all** — measured, ten of nineteen have none, and an ArchUnit rule refuses an `api` type in a `@RestController` signature so the classification cannot drift back one convenience at a time. The route constant clause is the last to become true: `SecurityConfig` named `JoinPaths`, `ReportPaths` and `WebSocketPaths` until this ticket gave the composition root its own constants, which is also what closed three of the five recorded cycles.
- **A JPA entity never crosses a module line** (ADR-038 rule 1). It may not appear in an `api` package, in a record an `api` hands out, or as a parameter of one.
- **`Optional` is a return type and never a field** (measured: 0 fields). A method that may find nothing returns `Optional`.
  - **As a parameter it is allowed where absence is a domain fact rather than a missing argument**, and the tree uses it that way deliberately: `Optional<Membership> caller` on the published-itinerary surfaces means *the viewer may be an anonymous stranger*, which is a case the reader must handle, not an omission they might forget. A nullable parameter says "you may leave this out"; `Optional<Membership>` says "anonymous is a real caller". Reach for it only when that distinction is the point.

### Configuration

- **`@ConditionalOnMissingBean` is autoconfiguration-only and is not a tiebreaker in ordinary `@Configuration`.** Two beans both register and the context fails at startup — *in the profile where both exist*, which is the last place anyone looks. **Use a complete, mutually-exclusive profile pair** (`@Profile("dev")` / `@Profile("!dev")`) so exactly one bean always wins, and run at least one integration test in **each** profile before believing a profile-conditional bean works.
- **A dependency can change the HTTP transport under the whole application**, because Spring picks its `ClientHttpRequestFactory` by classpath detection. State the transport explicitly where you own the client rather than inheriting whatever a transitive dependency installed.

### Time

- **An instant is UTC, always** *(founder, 2026-08-11, at S3.1)*: `TIMESTAMPTZ` in Postgres, `Instant.now(clock)` in Java, never a naive local timestamp. Timezone drift is a silent corruption — a value written in local time reads correctly on the machine that wrote it and wrongly everywhere else, so nothing fails until a traveler in another zone sees it; one default removes the class of bug rather than each instance.
- **A wall-clock value is not an instant and stays zoneless, deliberately.** An activity's `time_of_day` is "9:00 AM where the traveler is standing" — `TIME` in Postgres, `LocalTime` in Java — and shifting it by zone would be the bug. When adding a time column, decide first which of the two it is, and say so in the migration's name or the spec.

**Dial. Floor.** None of this is a rigor setting — it is the shape all code takes at any dial. The two Full-rigor subsystems earn their rigor through more tests, not different conventions.

*Adopted 2026-09-08 (off-epic, at CM-4's close). Every quantified claim above was measured against the tree on that date; the counts are evidence the conventions were already real, and are worth re-measuring rather than trusting if one ever seems wrong.*

**Resolution: ☐ Pending founder ratification**
