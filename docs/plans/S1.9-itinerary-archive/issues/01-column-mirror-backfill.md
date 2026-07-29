# 01 — The column, the mirror, and the backfill

**What to build:** `workspace.state` exists and is **truthful everywhere** — for new rows, for the completion path, and for every row that predates the column. Nothing reads it yet; this is the make-the-change-easy prefactor the whole story stands on, and it is the ticket that touches a shipped transaction, so it lands first and alone.

1. **Migration (additive):** `state` on `workspace` — `ACTIVE | COMPLETED | ARCHIVED`, `NOT NULL`, **no `DEFAULT`** (the V3 gotcha: a dead default is the trap for the next migration that copies its spelling; Hibernate always supplies the value). Storage spelling is the enum **name** (the V4 lesson). In the same migration, the backfill: every existing workspace resolves its state from its itinerary — `COMPLETED` where the itinerary is `completed`, else `ACTIVE`. No row can be `ARCHIVED` yet, and that is correct: archive has never existed.
2. **Domain:** the workspace entity gains the state field + the enum; formation writes `ACTIVE` explicitly (never relies on a DB default — there is none).
3. **The mirror:** the completion transaction (S1.7's `complete`) also sets `workspace.state = COMPLETED` — additive, a write inside an existing transaction, no semantic change to the endpoint (spec decision 9). Without it, `COMPLETED` is a value nothing writes — documentation, not data, the zero-rows trap this repo has hit three times.
4. **The stepping IT** (spec AC 9, the `WorkspaceBackfillIT` pattern, per the CLAUDE.md rule that a data migration is invisible to every local surface): its **own container** — never the shared singleton, which is already migrated to head — Flyway `.target(V(n−1))`, plant a completed itinerary + its workspace **in raw SQL** (going through the service would create the state the fixture must lack), `.target(V(n))`, assert both resolutions (`COMPLETED` and `ACTIVE`). **Prove the test can fail:** sabotage the migration's mapping, watch the right diagnosis, revert (S1.1's rule).
5. **Tests:** storage IT — the DB holds `'ACTIVE'` / `'COMPLETED'` enum-name spellings and `information_schema` shows no default (spec AC 10) · the mirror IT — `POST /complete` flips the workspace row (spec AC 8) · formation still writes `ACTIVE` · existing suites pass unmodified.

**Not in this ticket:** anything that *reads* the column (the fence, the filter — tickets 02/03) · any `ARCHIVED` writer · a backward mirror (`completed → active` re-opens nothing; the itinerary machine is forward-only — spec decision 9, recorded).

**Blocked by:** None — can start immediately.

**Status:** done

- [x] The mirror: `POST /complete` sets `workspace.state = COMPLETED` in the same transaction (spec AC 8)
- [x] Stepping IT on its own container: V(n−1) → raw-SQL legacy rows → V(n) → both states asserted — and the sabotage step run and reverted (spec AC 9)
- [x] Storage: `'ACTIVE'` / `'COMPLETED'` enum-name spelling; no column `DEFAULT` per `information_schema` (spec AC 10)
- [x] Formation writes `ACTIVE` explicitly; full backend suite green, existing tests unmodified

## Comments

**2026-07-28 — done. 8 ITs green (5 stepping + 3 storage).**

1. **The migration is V13.** `state TEXT` → backfill → `SET NOT NULL`, in that order: the `NOT NULL` last is the migration's own safety net, since a workspace that escaped the UPDATE's join fails loudly there rather than leaving a null the fence would read as "not archived" — silently permitting writes on a frozen trip.
2. **The fixture stops at V12, not earlier, and that was a considered choice.** A legacy completed trip must look like a real one, and after S1.7 that means carrying `completed_at`. Seeding at V11 would have produced a completed itinerary with no completion stamp — a shape no rung has ever held, so the mapping would have been exercised against fiction.
3. **Sabotage run and reverted** (S1.1's rule). Inverting V13's `CASE` arms failed exactly two tests — `completedTripsWorkspaceBecomesCOMPLETED` (expected `COMPLETED`, was `ACTIVE`) and `liveTripsWorkspacesBecomeACTIVE` (the mirror image) — with no other test in the suite noticing. Worth recording *why* the check works here: because this IT owns its own container and steps Flyway explicitly, the sabotaged file genuinely re-ran. On `PostgresTestBase`'s shared singleton the schema is already at head before the class loads, so the sabotage would have been invisible and the test would have "passed" while proving nothing.
4. **`markCompleted` is idempotent and holds the archive freeze.** Transition legality lives on the *itinerary* aggregate (which 409s a second completion before the mirror is reached), so re-asserting it on the workspace would be one rule in two places. What the workspace method does own is the narrower question of what a mirror does to an `ARCHIVED` row: nothing. Ticket 03's fence refuses the itinerary transition upstream anyway, but the guard means archive cannot be silently overwritten if that ever changes.
5. **`start` deliberately has no mirror.** The workspace machine has no state below `ACTIVE` — a draft trip's workspace is already active, which is register #12's 2026-07-20 resolution (`forming` collapsed). Only the completion edge exists in canon.
6. **`stateOf` landed here rather than in ticket 02** — the storage IT needed to read state through the service (not just SQL) to prove the round-trip, and ticket 03's fence needs the identical read. One method, two callers, no duplication.
