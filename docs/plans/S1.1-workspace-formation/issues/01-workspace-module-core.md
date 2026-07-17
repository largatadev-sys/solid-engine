# 01 — Workspace module core: tables + atomic formation

**What to build:** the workspace module exists, and every itinerary created from now on gets its workspace + owner membership in the same transaction — while the guard keeps running on the old owner resolver, untouched, so the system stays green throughout this ticket.

1. **Additive migration:** `workspace(id, itinerary_id UNIQUE NOT NULL, created_at)` and `membership(workspace_id, traveler_id, role, joined_at)` with `UNIQUE (workspace_id, traveler_id)`. Role values `owner | member`. **No `state` column** — deliberate (spec §Schema; register #12 belongs to the invite story; do not "fix" this early).
2. **`WorkspaceService.formAround(itineraryId, ownerTravelerId)`** in the new workspace module: inserts workspace + owner membership, `created_at`/`joined_at` taken from the caller so they equal the itinerary's `created_at`. Joins the caller's transaction (default `REQUIRED`) — never opens its own. Different bean from the caller, so the S0.2 self-invocation trap doesn't apply.
3. **`ItineraryService.create` calls `formAround`** inside its existing `@Transactional` boundary. Dependency arrow: itinerary → workspace, the only arrow — the workspace module never imports from the itinerary module (ADR-002; the resolver in ticket 03 answers from the workspace module's own table).
4. **Tests (IT through the service layer):** create an itinerary → workspace + owner membership exist, timestamps match (AC 1) · a forced workspace-insert failure rolls back the itinerary — no itinerary row survives (AC 2; only the failure case proves atomicity) · a second `formAround` for the same itinerary fails at the `UNIQUE` constraint (AC 7).

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Migration: both tables, both `UNIQUE` constraints, no `state` column
- [ ] `formAround` — joined transaction, timestamps from the itinerary
- [ ] `ItineraryService.create` forms the workspace atomically
- [ ] IT: happy path (rows + timestamps) · rollback direction · constraint on double-formation
- [ ] Guard untouched: S0.3 tests still green on the owner resolver
