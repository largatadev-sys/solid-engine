# 01 — The plan document gets a version

**What to build:** The itinerary starts telling clients which revision of its plan they are looking at. Every write that mutates the plan document — append/rename/delete day, create/edit/delete activity, reorder, cross-day move, activity photo add/remove — bumps a `planVersion`, and the itinerary response carries it additively. This is the expand step everything else lands on: the bulk save's version check (ticket 02) and the old-client coexistence guarantee both read this number, so the bump must be universal before either exists. No client change; no behavior change visible to any installed app beyond one new response field (ADR-008 additive, spec wire-changes section).

**Blocked by:** None — can start immediately.

**Status:** done

- [x] The itinerary response carries `planVersion`; a fresh itinerary has a defined starting value (additive column with a default — no data migration, so no migration-stepping IT owed; spec testing decisions).
- [x] An IT sweeps every per-action plan endpoint and asserts each bumps `planVersion` exactly once per write (spec AC 7) — pinned where it would silently rot.
- [x] Reads never bump; lifecycle acts, publish/unpublish, trip-field edits and cover upload never bump — the version tracks the plan document, not the itinerary.
- [x] Existing ITs pass unchanged (additivity: nothing renamed, retyped, removed).
