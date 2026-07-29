# S1.1 — Workspace formation · spec

**Status:** intent locked 2026-07-17 — grilling session, owner-confirmed. Immutable point-in-time intent (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.
**Context anchor:** Epic 1, first story · ADR-011 (the phased guard — this story is the swap that ADR pre-authorized) · ADR-002 (module boundaries) · ADR-003 (guard pattern) · Artifact 02 (Workspace/Membership aggregate) · Artifact 03 (tenancy walls) · S0.3 (the guard + owner resolver this replaces). Slice definition: `docs/design/07-epic-map.md` → E1, first slice.

## The pull (what this is and why now)

E1 is the hypothesis's core — collaborative planning — and every one of its stories (invites, items, comments, member removal, ownership transfer) presupposes a workspace with membership rows. None exists: S0.3 shipped the guard's permanent signature over a deliberately temporary resolver that synthesizes `Membership{OWNER}` from `itinerary.owner_id`. ADR-011 named this story as the one that replaces it: *"S1.1 replaces it with the workspace module's row-backed resolver and backfills workspaces for pre-E1 itineraries."*

**This story is nearly invisible to a founder — by design.** No new screen, no new endpoint, no behavior change. It rewires the Full-rigor authorization chokepoint's data source and establishes the invariant every later E1 story stands on: **no itinerary exists without a workspace, and no workspace without an owner (INV-4), from the first instant.**

## Goal

The workspace module exists. Creating an itinerary forms its workspace + owner membership atomically. The guard resolves membership from rows, not `owner_id`. Every pre-E1 itinerary on `dev` has been backfilled and remains reachable by its owner. S0.3's guard ACs pass unchanged.

## Locked decisions

### Scope — four things, nothing else (grilling Q1)

1. **Workspace module** (`backend/src/main/java/com/largata/workspace/`) with `workspace` + `membership` tables (additive migration).
2. **Atomic formation:** itinerary creation creates workspace + owner membership in the same transaction.
3. **Row-backed `MembershipResolver`** in the workspace module, replacing S0.3's `OwnerMembershipResolver`.
4. **Backfill migration** for every pre-E1 itinerary.

**The entitlement seam (`can(traveler, capability)`, ADR-009) is explicitly NOT here** — nothing in S1.1 gates a capability, so the seam would ship with zero callers. It has its own story (S1.8 in BUILD_STATUS's derivation of E1).

### Schema — minimal, no `state` column (grilling Q2)

- `workspace(id, itinerary_id UNIQUE NOT NULL, created_at)` — the `UNIQUE` makes the 1:1 (Artifact 02) structural, not disciplinary.
- `membership(workspace_id, traveler_id, role, joined_at)` with `UNIQUE (workspace_id, traveler_id)`. Role values: `owner | member`.
- **No `state` column.** The workspace state machine (`forming → active → completed → archived`) exists in the domain model, but register #12 (does `forming` exist?) is assigned to the invite story, and nothing in S1.1 reads state — INV-1 gates on *membership*, not workspace state. S1.2 adds the column additively, with #12 decided. The absence is a sequencing fact, not a model disagreement — do not "fix" it early.

### Formation — itinerary calls workspace, one direction, joined transaction (grilling Q4)

- `ItineraryService.create(...)` calls `WorkspaceService.formAround(itineraryId, ownerTravelerId)` **inside its existing `@Transactional` boundary**. `formAround` joins the transaction (default `REQUIRED`) — it never opens its own. (`formAround` lives in a different bean, so the S0.2 self-invocation trap does not apply — noted so nobody re-derives it.)
- Dependency arrow: **itinerary → workspace**, and that is the only arrow. The workspace module's resolver answers from its *own* table (`workspace.itinerary_id`) and never touches the itinerary module — the graph is `itinerary → workspace → common/authz`, acyclic, guard stays in `common` per ADR-011.
- **Not a domain event** (`@TransactionalEventListener` etc.) — indirection whose only payoff is decoupling two modules the domain says are coupled ("workspace forms around an itinerary, atomically"). MVP dial: the boring direct call. P9 naming: modules-by-service-interface (ADR-002), atomicity by shared transaction.

### The resolver swap — delete, don't fallback; uniform 404-mask (grilling Q5)

- **`OwnerMembershipResolver` is deleted outright.** A fallback ("no row? check `owner_id`") would silently paper over a failed backfill — the class of bug that survives for months. After the backfill, the membership row *is* the truth; if it's missing, the owner is locked out loudly (a 404 the next session investigates), not quietly readmitted by legacy code. Full-rigor zone: one code path.
- **One query, one answer:** membership JOIN workspace on `itinerary_id` + `traveler_id`; empty → reject, guard 404-masks — exactly S0.3's semantics. The resolver deliberately cannot distinguish "itinerary doesn't exist" / "not a member" / "workspace missing (invariant breach)" — distinguishing the last would require querying the itinerary module (ADR-002 forbids it from `common`-serving code) and leaks existence anyway. Fail closed, uniformly.
- **The guard's signature and the `Membership` value type do not change** — ADR-011's point. Every existing call site compiles untouched; S0.3's guard tests pass without modification.
- The accepted trade: a backfill bug presents as "owner 404s on their own itinerary" with no distinct signal. The mitigation is **AC 6** (post-merge dev verification), not runtime diagnostic branching carried forever.

### The backfill — Flyway data migration, timestamps inherited (grilling Q3)

- A versioned `V__` migration in the same release as the resolver swap: `INSERT INTO workspace … SELECT gen_random_uuid(), id, created_at FROM itinerary`, then owner memberships from `itinerary.owner_id`. Flyway's ordering guarantee means the backfill completes **before the new resolver serves a single request** — no window where pre-E1 itineraries 404 for their owners.
- **Timestamps inherited:** backfilled `workspace.created_at` and owner `joined_at` = the itinerary's `created_at`. Atomic formation says the workspace exists from the itinerary's first instant; the backfill makes history read as if that had always been true. Migration-time stamps would create a phantom "everyone joined on migration day" artifact.
- Stop-rule reading, owner-confirmed at grilling: this is a **data-writing migration** but squarely within the story's additive scope — new tables + populating them from existing data, no mutation of existing rows.

### The backfill's testing trap (grilling Q6 follow-up — the story's headline risk)

Every test surface this repo has is structurally incapable of exercising the backfill: the local stack is fresh-DB-every-redeploy and Testcontainers ITs boot on empty schemas, so the migration runs against **zero rows and trivially "passes" as a no-op**. The only database holding pre-E1 itineraries is deployed `dev` — the founders' real trips. Untested, the backfill's first real execution would be its production run. Both mitigations are mandatory:

1. **A migration-stepping IT:** boot a container with Flyway targeted to the version *before* the backfill, insert legacy-shaped itineraries via SQL (itineraries without workspaces), apply the backfill, assert every itinerary gained a workspace + owner membership with inherited timestamps.
2. **A post-merge verification step on `dev`:** itinerary count = workspace count; every pre-E1 itinerary reachable by its owner. The backfill *ships to dev's data*, so dev is where it's proven (standing rule: verify at the layer that ships).

*(Same lesson as S0.2's `getTokens()`, wearing database clothes: every green surface is structurally blind to the one thing that matters. Fresh-DB ephemerality is usually a testing strength; for data migrations it is a blind spot.)*

### No API, no mobile (grilling Q6)

- **Zero new endpoints.** Membership is itself workspace-walled data (Artifact 03), and no feature that reads it exists until S1.2. ADR-008 means anything shipped to `/v1` is carried forever — ship nothing until a screen needs it. Explicitly: no `GET /v1/workspaces/...` anything, even "while we're in there"; S1.2 designs that surface together with invitations.
- **Zero mobile changes.** The app doesn't know workspaces exist, and after S1.1 it still won't — correctly.
- **No new analytics events** — nothing user-facing happened.

### Bookkeeping & git (grilling Q8)

- **No new ADR:** ADR-011 already records this swap, its rationale, and its trade-offs; nothing decided here is hard-to-reverse + surprising + a fresh trade-off. The state-column deferral is additive-reversible and register #12 already owns it. This spec cites ADR-011 rather than duplicating it.
- **No glossary/domain-doc changes:** Workspace, Membership, formation, owner/member all already sit in Artifact 02 with the meanings relied on here.
- BUILD_STATUS: S1.1 row `🔄` + spec link at pull; `✅` in the last feature-branch commit.
- Work on **`feature/S1.1-workspace-formation`** off `dev` · commits `feat(backend): S1.1 …` / `docs(plans): S1.1 …` (story id mandatory; no agent signature) · promotions propose-first.
- **Sequencing:** spec → `/to-tickets` → owner review → implement → local full-stack verification → **propose** squash-merge → post-merge dev backfill check closes the gate.

## Deliberate deferrals (recorded, not silent)

| Deferred | To | Why |
|---|---|---|
| Entitlement seam (`can(traveler, capability)`) | S1.8 (its own story per BUILD_STATUS) | S1.1 gates nothing — a seam with zero callers proves nothing. |
| Workspace `state` column + machine | S1.2 (with register #12) | Nothing in S1.1 reads state; column now = resolving #12 early or backfilling a provisionally-wrong value. Additive later. |
| Invitations, member list, any workspace API surface | S1.2 | The surface's shape (what a member list returns, what an invitee may see) is decided with invites. |
| Member removal / leave, ownership transfer, itinerary delete | their own E1 stories | Epic-map slice list. |

## ACs → proof map (grilling Q7)

| # | AC | Proven by |
|---|---|---|
| 1 | Formation: `POST /v1/itineraries` yields itinerary + workspace + `owner` membership in one transaction; workspace `created_at` and owner `joined_at` equal the itinerary's `created_at` | IT through the service layer, asserting rows + timestamps |
| 2 | Atomicity, failure direction: a forced workspace-creation failure rolls back the itinerary — no itinerary ever exists without a workspace | IT: test double / constraint violation on the workspace insert → itinerary row absent. (Only the failure case proves atomicity; the happy path can't distinguish one transaction from two lucky ones.) |
| 3 | Guard regression, unchanged: S0.3's ACs pass as-is — creator create/list/view · other authenticated traveler → 404 · no token → 401 — now via membership rows; `OwnerMembershipResolver` gone | Existing S0.3 tests, unmodified, green · grep confirms the class is deleted |
| 4 | Member-role contract: a seeded `member` row resolves to `Membership{MEMBER}` through the guard | IT seeding the row directly (no service creates members until S1.2 — this is the contract S1.2 stands on) |
| 5 | Backfill vs. the legacy shape: legacy itineraries at V(n−1) gain workspace + owner membership with inherited timestamps at V(n) | The migration-stepping IT |
| 6 | Backfill where it ships: on `dev` post-merge, itinerary count = workspace count and every pre-E1 itinerary reachable by its owner | Post-merge check on deployed `dev` (closes the gate) |
| 7 | 1:1 structural: `UNIQUE (workspace.itinerary_id)` and `UNIQUE (workspace_id, traveler_id)` exist; a second `formAround` for the same itinerary fails at the constraint | Schema assertion / constraint-violation test |

**Deliberate omission, on the record:** no concurrent-formation race AC — the itinerary + workspace inserts share one transaction keyed by a fresh UUID, so no concurrent-duplicate window exists (unlike S0.2's traveler provisioning, which raced on an external natural key). Testing it would be testing the database.

## Out of scope

Invitations · entitlement seam · workspace state machine · any `/v1` addition · any mobile change · member removal / leave / ownership transfer / itinerary delete · comments · items CRUD · anything that makes this story founder-visible.

## Comments

**2026-07-17 — the mechanism changed once: `formAround` is `Propagation.MANDATORY`, not the spec's `REQUIRED`.** This spec locked *"joins the caller's transaction (default `REQUIRED`) — it never opens its own."* The intent is right and unchanged; the named mechanism was too weak to hold it. `REQUIRED` *does* open its own transaction when there isn't one — it merely happens not to if every caller behaves. `MANDATORY` makes "never opens its own" enforceable: a caller without a transaction (S1.2's invite acceptance, a future import script, a test calling the service directly) gets a loud `IllegalTransactionStateException` instead of a workspace that commits while its itinerary rolls back. That failure mode — a silent success where the invariant quietly doesn't hold — is the exact shape this repo keeps paying for (S0.2's `getTokens()`, S0.4's env inlining). Recorded here rather than edited into the body, per the issue-tracker rule. Pinned by `ItineraryFormationIT.formingAWorkspaceOutsideATransactionIsRefused`.

**2026-07-17 — two schema additions the spec's §Schema did not name, kept and cut respectively.** (1) **`membership_one_owner_idx` — kept.** A partial unique index (`WHERE role = 'OWNER'`) enforcing INV-4's "at most one owner per workspace". The spec named only the two `UNIQUE` constraints, so this is an addition; the justification is the dial — the authorization guard runs at **Full rigor**, and S1.1 is the story that makes INV-4 *representable* for the first time. A schema that permits two owners from the instant it exists is a defect S1.6 (ownership transfer) would inherit silently, under concurrency, in the one area the rules say not to be casual about. (2) **A `(traveler_id, workspace_id)` index — cut at review.** It was written to serve "which workspaces does this traveler belong to?", which no query asks yet; its own comment said "S1.2 onward". Speculative against an MVP dial, so it goes to the story that writes the query and can shape it against a real access path. The distinction between the two is P9's point: one is an invariant, the other was a guess about performance.

**2026-07-17 — the backfill test earns its keep, proven by sabotage.** The spec calls the fresh-DB blindness the story's headline risk, so the test was checked rather than trusted: changing V5's inherited timestamps to `now()` fails `backfilledTimestampsAreInheritedFromTheItineraryNotTheMigration` with the right diagnosis (*expected 2026-03-01, but was 2026-07-17*), and restoring them turns it green. A migration test that passes against a no-op is worse than none — this one does not.

**2026-07-17 — one trap caught before it shipped, worth recording.** V4's first draft wrote the INV-4 index as `WHERE role = 'owner'`, copying V3's lower-case `state` default. Hibernate's `@Enumerated(STRING)` writes the enum's **name** (`OWNER`), so the predicate would have matched **zero rows**: the index creates successfully, costs nothing, and enforces nothing — INV-4 unguarded, no error, ever, and no other test would have noticed. (V3's own `DEFAULT 'draft'` is dead weight for the same reason — Hibernate overrides it on every write.) `MembershipStorageIT` now pins the column's spelling. The generalisable bit: an enum's **storage** spelling is a contract between Hibernate and SQL, and the API's spelling (`wireName()`) is a *different* contract that happens to look similar.

**2026-07-17 — where the rollback test lives, and why it is not test-placement trivia.** AC 2 belongs conceptually to the itinerary module (`create` is what must roll back), and it could not go there: the failure is injected at `WorkspaceRepository`, which is package-private, so the boundary that stops production code reaching across modules (ADR-002) stopped the test too. The rule held and the test moved to `com.largata.workspace`. Two rejected approaches are recorded in its javadoc — spying on `WorkspaceService` itself does not work at all (a Spring spy wraps the `@Transactional` proxy, so `when(spy).formAround(…)` runs the transaction interceptor during *stub setup*, where MANDATORY throws before the test body starts; it surfaces as a Mockito matcher error naming nothing about the real cause).
