# 04 — Story gate

**What to build:** nothing new — the proof that S1.1 holds where it ships, and the bookkeeping that lets the merge land truthfully.

1. **Local full-stack verification (standing rule):** `docker compose up` (fresh DB) · sign in · create an itinerary · view it · a second traveler gets 404 on it — the whole S0.3 flow through the row-backed path. Fresh DB also re-proves the backfill migration as a clean no-op in sequence with all migrations.
2. **Full test suite green** — including the stepping IT and the unchanged S0.3 guard tests.
3. **Bookkeeping in the last feature-branch commit:** BUILD_STATUS S1.1 row → ✅ (status + spec link, nothing else).
4. **Propose the squash-merge** `feature/S1.1-workspace-formation → dev` — propose-first, owner approves (this is also the guard-touching checkpoint the stop rules require).
5. **Post-merge, closes the gate — the backfill proven where it ships (AC 6):** on deployed `dev`, itinerary count = workspace count = owner-membership count, and every pre-E1 itinerary is reachable by its owner (preview or API). This is the one database that actually holds pre-E1 rows; the deliberate absence of a runtime fallback (ticket 03) makes this check the story's safety net — do not skip it.

**Blocked by:** 01, 02, 03.

**Status:** in progress — pre-merge evidence complete; awaiting the owner's merge approval, then the post-merge dev check

- [x] **Local full-stack run** (`docker compose up`, fresh DB), driven with **real `largata-dev` Firebase tokens** for two throwaway travelers — not test-minted JWTs, so the whole auth chain ran as it ships. `POST /v1/itineraries` → **201** · owner `GET` → **200** · stranger `GET` → **404** · anonymous `GET` → **401** · owner list → **200**, one item. All five migrations applied clean and in order on the fresh DB (V5 a clean no-op against zero rows, as designed).
- [x] **Routing is not a round-trip (the standing rule), so the claim was checked at the database:** the workspace row exists, the owner membership is `OWNER`, and **both timestamps equal the itinerary's `created_at`** — the assertion no HTTP response could show. Counts: itineraries=1, workspaces=1, owner_memberships=1, **orphans=0**.
- [x] **AC 6 rehearsed locally against the dev rung's actual shape** — the highest-value check available before merging, because a fresh DB has no legacy rows and the stepping IT cannot serve HTTP. A pre-E1 itinerary was planted (no workspace, `created_at` = 2026-03-01) and **404'd for its own owner** — the failure mode made concrete, and exactly what a failed backfill will look like on `dev`. V5's real SQL (the file, not a paraphrase) was then applied through psql as the deploy will: owner `GET` → **200**, March's timestamp preserved, orphans=0.
- [x] **Full suite green** — `mvn verify` exit 0, 16 IT classes + unit tests, stepping IT included. S0.3's `ItineraryContractIT` (14) and `AuthorizationGuardTest` (5) pass **unmodified**.
- [x] `/code-review` run on both axes; every finding fixed (dead `existsByIdAndOwnerId` + its lying javadoc, unused `Workspace.memberships()`, unused test helper, the speculative traveler index) or recorded in the spec's `## Comments` (the `MANDATORY` deviation, the INV-4 index kept with justification).
- [x] BUILD_STATUS row ✅ in the last feature-branch commit
- [ ] **Squash-merge proposed — awaiting owner approval** (promotions are propose-first; this one also touches the authorization guard, a stop-rule checkpoint)
- [ ] Post-merge dev check: counts match, pre-E1 itineraries reachable by their owners
