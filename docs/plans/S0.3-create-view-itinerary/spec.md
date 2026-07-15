# S0.3 — Create and view an Itinerary (first domain slice, guard included) · spec

**Status:** intent locked 2026-07-16 — grilling session, founder-confirmed. Immutable point-in-time intent (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.
**Context anchor:** Epic 0 · itinerary module · Artifact 02 (Itinerary aggregate, `draft` state) · Artifact 03 (the guard exists from the first domain endpoint — not retrofitted) · Artifact 05 (envelope, pagination, 404-masking) · ADR-001 (repository/cache), ADR-002 (module boundaries), ADR-003 (chokepoint guard), ADR-008 (additive-only /v1) · **ADR-011 (this story: phased guard in `common/authz`)**. Slice definition: `docs/design/07-epic-map.md` → S0.3.

## Goal

A signed-in traveler creates an itinerary (title, destinations, optional dates → `draft`/`private`), sees it in their newest-first list, and opens it — through the authorization guard on the backend and the repository/cache layer on mobile. The guard's first proof: **another authenticated user gets 404 on my private itinerary.** No items, no workspace, no publish, no fork, no edit, no delete.

## Locked decisions

### The guard (Full-rigor zone; ADR-011)

- **No workspace tables in S0.3.** The guard ships its **permanent signature** — `requireMember(travelerId, itineraryId) → Membership` — but its S0.3 implementation resolves `itinerary.owner_id == traveler.id` and synthesizes `Membership{role: OWNER}`; anything else rejects, surfacing as 404 (masking, Artifact 05). E1 swaps internals to real membership rows; **S1.1 must backfill workspaces for pre-E1 itineraries** (obligation recorded in the epic map).
- **Home: `common/authz`** — the guard + the `Membership` value type, beside `common/security`; same chokepoint-in-common pattern as ADR-009's entitlement service. The membership **lookup** hides behind a one-method `MembershipResolver` interface; the S0.3 owner-based implementation lives in the **itinerary module** (only it may touch its tables, ADR-002). E1 replaces that resolver with the workspace module's; the guard, controllers, and service signatures do not change.
- **The structural guarantee is the point:** itinerary service methods that read/mutate a private itinerary **require the `Membership` parameter** — uncallable without the guard having run. This is the pattern every later story imitates.
- Guard behavior is unit-tested against a stubbed resolver (reject → synthesize → role), plus integration proof through the full chain.

### API contract (`/v1`, additive-forever — ADR-008)

- **`POST /v1/itineraries`** → 201 + created resource. Request: `title` (required, non-blank, ≤ 120 chars), `destinations` (**`string[]`**, free text, required, min 1 non-blank — Artifact 02 says "destination(s)"; a single string is the wart additive-only can never remove), `startDate`/`endDate` (**both optional, independently settable**, ISO calendar dates → `LocalDate`, no times/timezones; `start ≤ end` enforced only when both present — undated trips are a product truth: the dreamer draft and the E4 fork flow both produce them).
- **Response DTO** (create and get): `{ id, title, destinations, startDate, endDate, state: "draft", visibility: "private", createdAt }` — `state`/`visibility` present from day one so the AC is directly testable and later stories are additive.
- **`GET /v1/itineraries/{id}`** → 200 for a caller holding a guard-produced Membership; **404 `ITINERARY_NOT_FOUND` for both nonexistent and not-mine** — indistinguishable by design (Artifact 05 masking; the guard's first proof).
- **`GET /v1/itineraries`** → the reference implementation of the one pagination shape: `{ items, nextCursor }` · **mine only, newest-first** via `ORDER BY id DESC` (UUIDv7 is creation-ordered — keyset pagination on the id alone, `WHERE id < :cursor`) · cursor is **opaque** (base64 of the last id; clients pass it back verbatim) · `limit` optional, default 20, **silently clamped to 100** · no filters, no sort options — additive params when a story needs them. Collections never 404; empty list is a result.
- Validation failures → 400 in the standard envelope. Unauthenticated → 401 `UNAUTHENTICATED` (S0.2 machinery, already in place).

### Persistence

- Additive Flyway migration: `itinerary(id uuidv7 app-side, owner_id not null, title not null, destinations, start_date, end_date, state not null default 'draft', visibility not null default 'private', created_at)` — destinations as a Postgres `text[]` (or jsonb; implementer's call, recorded in ticket comments). Index: none beyond the PK — the owner-filtered keyset scan wants `(owner_id, id desc)`; add that composite index now, it is the list's whole access path.
- **No cross-module FK** from `owner_id` to the identity module's table: the ADR-002 boundary extends to schema coupling, and deletion-as-anonymization means the traveler row never disappears — the FK would buy nothing.

### Mobile

- **Screens: create + list + view.** The **My Trips list becomes the signed-in home screen**; the S0.2 me-screen stays reachable, demoted. Create → success → back to list showing the new trip; list → tap → view.
- **Design tokens (epic-map gate, discharged here):** S0.3 creates `mobile/src/theme/` — semantic color roles, type scale, spacing scale. Screens (including retrofitting S0.1's health screen) consume **tokens only; zero hardcoded values**. Interim token values = the **worklog palette, adapted** — an explicit interim, not the brand decision: that stays open in the backlog, **due before E4**.
- **Cache (ADR-001 made real):** repositories sit on **TanStack Query** — in-memory stale-while-revalidate store; screens render from cache when warm, refresh in background. Write path stays plain (create posts through the repository, invalidates the list query). **No persistence** — offline-from-cold-start is E3's story, added then as a persister layer, not a rebuild. No raw fetch in UI code, as ever.
- Mobile mirrors the DTO in `mobile/src/types/` (the one types location, 06b §6).

### Analytics (register #2 default set — starts at this story)

- **Seam in `common`: `analytics.emit(name, attributes)`** — call sites accrete story by story; the sink is swappable plumbing. **v1 sink: one structured JSON log line per event on a dedicated `analytics` logger.** Durable sink deliberately deferred: build-phase events are disposable; the epic map now carries the trigger — **sink goes durable before alpha** (decided with registers #1/#2).
- Events: **`itinerary_created`** (`travelerId`, `itineraryId`, `hasDates`, `destinationCount`) emitted from the logic layer after commit, fire-and-forget — an analytics hiccup can never fail a create. Plus **`traveler_signed_up`** backfilled as one line in S0.2's existing provisioning path. **IDs and shape only — never titles or destination text** (P3 extends to analytics attributes).

### Sequencing & git

- Backend first (migration → guard → service/endpoints), mobile second (theme → repositories/query layer → screens), device AC last.
- Work on **`feature/S0.3-create-view-itinerary`** off `dev` · commits `feat(itinerary): S0.3 …` / `feat(mobile): S0.3 …` (story id mandatory; no agent signature). **Spec, tickets, epic-map/ADR/BUILD_STATUS edits ride this branch** (owner directive, 2026-07-16 — the S0.2 separate-docs-commit pattern is retired). Completion → **propose** squash-merge into `dev` and wait (promotion checkpoint).

## Deliberate deferrals (recorded, not silent)

| Deferred | To | Why |
|---|---|---|
| Workspace + Membership tables; real membership resolution | S1.1 | Epic-map scope; the guard's signature is the seam — S1.1 swaps the resolver **and backfills workspaces for pre-E1 itineraries** |
| Itinerary field edit (title/destinations/dates) | S1.3 (slice widened this session) | Nothing E0 proves needs it; found homeless in the epic map during grilling |
| Itinerary delete (owner-only) | new E1 story (added this session) | Interacts with INV-4 and workspace lifecycle; unspecable before workspaces exist |
| Cache persistence / offline cold-start | E3 | "Offline read-cache proves itself" is E3's deliverable; additive persister on the same query layer |
| Durable analytics sink | before alpha (epic-map trigger) | Build-phase events are disposable; the call sites are the asset being built now |
| Brand/visual direction decision | backlog, due before E4 | Token layer built now is what keeps the palette cheap to change; worklog values are explicitly interim |
| Items, publish, fork, visibility changes | E1/E4 | Epic-map scope boundaries |

## ACs → proof map

| AC (epic map) | Proven by |
|---|---|
| Creator can create/list/view | Integration tests through the full chain + mobile screens + device AC |
| **Another authenticated user → 404 on my private itinerary** | Integration test: two travelers, A creates, B gets 404 `ITINERARY_NOT_FOUND` byte-identical to a random-id 404; guard unit tests (stubbed resolver) |
| Visitor (no token) → 401 | Existing S0.2 machinery; one integration assertion on the new endpoints |
| Created itinerary is `draft` with `private` visibility | Create test asserts response fields + DB row defaults |
| List uses the one pagination shape | Integration tests: `{items, nextCursor}` shape · newest-first · cursor walks the full set without duplicates/skips · limit clamped at 100 · empty list → 200 with `[]` · only mine, ever |
| *(standing rules)* | Guard uncallable without Membership (compile-level; reviewed per Artifact 03's mechanical check) · `itinerary_created` log line carries IDs only (P3 assertion) · migration additive via Flyway |

## Out of scope

Items (S1.3) · workspace/membership/invites (S1.x) · edit (S1.3) · delete (new E1 story) · publish/visibility (S4.1) · fork (S4.7) · entitlements (S1.8) · cache persistence (E3) · durable analytics sink (pre-alpha) · brand decision (backlog, pre-E4).
