# 01 — Workspace module core: tables + atomic formation

**What to build:** the workspace module exists, and every itinerary created from now on gets its workspace + owner membership in the same transaction — while the guard keeps running on the old owner resolver, untouched, so the system stays green throughout this ticket.

1. **Additive migration:** `workspace(id, itinerary_id UNIQUE NOT NULL, created_at)` and `membership(workspace_id, traveler_id, role, joined_at)` with `UNIQUE (workspace_id, traveler_id)`. Role values `owner | member`. **No `state` column** — deliberate (spec §Schema; register #12 belongs to the invite story; do not "fix" this early).
2. **`WorkspaceService.formAround(itineraryId, ownerTravelerId)`** in the new workspace module: inserts workspace + owner membership, `created_at`/`joined_at` taken from the caller so they equal the itinerary's `created_at`. Joins the caller's transaction (default `REQUIRED`) — never opens its own. Different bean from the caller, so the S0.2 self-invocation trap doesn't apply.
3. **`ItineraryService.create` calls `formAround`** inside its existing `@Transactional` boundary. Dependency arrow: itinerary → workspace, the only arrow — the workspace module never imports from the itinerary module (ADR-002; the resolver in ticket 03 answers from the workspace module's own table).
4. **Tests (IT through the service layer):** create an itinerary → workspace + owner membership exist, timestamps match (AC 1) · a forced workspace-insert failure rolls back the itinerary — no itinerary row survives (AC 2; only the failure case proves atomicity) · a second `formAround` for the same itinerary fails at the `UNIQUE` constraint (AC 7).

**Blocked by:** None — can start immediately.

**Status:** done (2026-07-17) — full suite green; rollback proven by injected failure

- [x] V4: both tables, both `UNIQUE` constraints, no `state` column · **plus** `membership_one_owner_idx` enforcing INV-4 (an addition to the spec's schema — reasoning in spec `## Comments`)
- [x] `formAround` — **`Propagation.MANDATORY`**, not the spec's `REQUIRED`: same intent, enforceable rather than aspirational (spec `## Comments`); timestamps inherited from the itinerary
- [x] `ItineraryService.create` forms the workspace atomically (itinerary → workspace, one arrow)
- [x] `ItineraryFormationIT` (5) — rows + timestamps · double-formation hits the UNIQUE · MANDATORY refuses a transaction-less call · Flyway history pins V4
- [x] `WorkspaceFormationRollbackIT` (1) — the AC-2 proof: an injected repository failure rolls back the itinerary. Lives in the workspace package because `WorkspaceRepository` is package-private (ADR-002 stopped the test too — see its javadoc)
- [x] `MembershipStorageIT` (3) — pins the `role` column's spelling, which INV-4's partial index silently depends on; two owners refused, many members allowed
- [x] Guard untouched: S0.3 tests green throughout, on the owner resolver (ticket 03 swaps it)
