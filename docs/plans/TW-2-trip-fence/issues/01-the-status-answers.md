# 01: The status answers — `WorkspaceState` is open or archived, the wire keeps `completed` as a projection, `Trip` stops carrying `published`, and V58 makes the schema say so

**What to build:** the two entities tell the truth about the two facts they own, and nothing a client reads changes. `WorkspaceState` becomes `ACTIVE | ARCHIVED` — the `COMPLETED` value is a stored copy of the lifecycle's (unarchive has to be *told* what to restore; the lifecycle transitions write it as a side effect) and it leaves: lifecycle transitions stop touching the workspace, unarchive takes no argument, the workspace exposes whether the room is open. The wire's `workspaceState` — which the client's chip reads for `completed` — keeps its three values as a **projection** computed where the response already holds both facts: `archived` when the room is closed, else `completed` when the lifecycle is completed, else `active`. `Trip` loses its publication flag, its stamp, their writers and reader, and the entity-level `requireUnpublished` that read a column nothing has written since CM-5 and always passed; the six readers that always answered `false` are re-pointed at the publication port or deleted, and the two log lines stop printing `published=`. Migration **V58** rewrites `COMPLETED → ACTIVE` on the workspace, adds a `CHECK` on the two remaining values, and drops the itinerary's two dead publication columns — destructive by design, the shape the founder accepted at S4.25, with the yes on the record (grilling Q4, Q5). Spec decisions 12–14.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `WorkspaceState` has exactly two values; no production code writes or compares `COMPLETED`; the lifecycle transitions (start, complete, reopen) write nothing to the workspace; `unarchive` takes no lifecycle argument
- [ ] Every response that carries `workspaceState` answers `archived` for a closed room, else `completed` iff the lifecycle is completed, else `active` — pinned by a unit test over all six (lifecycle × archived) combinations, and every IT that reads `workspaceState` passes **unedited** except `TripArchiveContractIT`'s *unarchive restores completed…*, whose amendment is explained on this ticket by Q4
- [ ] `Trip` exposes no publication field or method; its only reopen guard is `TripService`'s check through the publication port; the six readers are re-pointed or gone; no log line prints a publication flag read from the entity
- [ ] V58 exists in the trip module's migration folder: the workspace rewrite, the `CHECK`, the two column drops; a migration-stepping IT with its own container plants `COMPLETED` workspaces and `published = true` itineraries at V57, migrates to V58, and asserts the rewrite, that a third value is refused, and that the columns are gone — **sabotage-checked** with `test-compile` in the goal list so the sabotaged SQL is the one loaded
- [ ] `NothingWritesTheDeadPublicationFlagTest` is deleted — the thing it guarded is gone; any IT that planted the dropped columns by raw SQL against the head schema is repaired
- [ ] The glossary's *Active (workspace)* row already records the projection (written with the grilling); nothing else in canon needs a line
- [ ] Unit suite and the scoped `trip` ITs green locally, `mvn -o clean test-compile` quiet; CI green on push

## Comments

*None yet.*
