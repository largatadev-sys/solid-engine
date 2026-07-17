# 04 — Story gate

**What to build:** nothing new — the proof that S1.1 holds where it ships, and the bookkeeping that lets the merge land truthfully.

1. **Local full-stack verification (standing rule):** `docker compose up` (fresh DB) · sign in · create an itinerary · view it · a second traveler gets 404 on it — the whole S0.3 flow through the row-backed path. Fresh DB also re-proves the backfill migration as a clean no-op in sequence with all migrations.
2. **Full test suite green** — including the stepping IT and the unchanged S0.3 guard tests.
3. **Bookkeeping in the last feature-branch commit:** BUILD_STATUS S1.1 row → ✅ (status + spec link, nothing else).
4. **Propose the squash-merge** `feature/S1.1-workspace-formation → dev` — propose-first, owner approves (this is also the guard-touching checkpoint the stop rules require).
5. **Post-merge, closes the gate — the backfill proven where it ships (AC 6):** on deployed `dev`, itinerary count = workspace count = owner-membership count, and every pre-E1 itinerary is reachable by its owner (preview or API). This is the one database that actually holds pre-E1 rows; the deliberate absence of a runtime fallback (ticket 03) makes this check the story's safety net — do not skip it.

**Blocked by:** 01, 02, 03.

**Status:** ready-for-agent

- [ ] Local full-stack run: create → view → stranger-404 via rows, fresh-DB migrations clean
- [ ] Full suite green (stepping IT included)
- [ ] BUILD_STATUS row ✅ in the last feature-branch commit
- [ ] Squash-merge proposed and owner-approved
- [ ] Post-merge dev check: counts match, pre-E1 itineraries reachable by owners
