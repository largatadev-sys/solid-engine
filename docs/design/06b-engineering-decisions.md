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
| Integration | Spring Boot Test + **Testcontainers Postgres** | **The isolation-boundary matrix is non-negotiable despite the MVP dial** (it is INV-1): non-member → 403/404 on every workspace-scoped endpoint category · visitor write-rejection · visibility levels (public/unlisted/private) · owner-vs-member rights. Plus contract basics: status codes + error envelope. |
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

**Resolution: ☑ Agreed** *(proposed solo — pending founder ratification; 06a ratified unamended)*
