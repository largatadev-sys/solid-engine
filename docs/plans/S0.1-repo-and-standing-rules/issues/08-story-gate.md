# 08 — Story gate: full verification + proposed promotion

**What to build:** The story's mandatory verification gate, run end-to-end, and the promotion proposed. From a clean state: `docker compose down && docker compose up --build`, then walk every AC in the spec's proof map (health through the composed stack, error contract, CI green, hook blocking, fresh-DB semantics). Flip S0.1's BUILD_STATUS row to ✅. Then **propose** the squash-merge of `feature/S0.1-repo-and-standing-rules` into `dev` and stop — promotions are propose-first per CLAUDE.md; the merge is the owner's checkpoint, never executed autonomously.

**Blocked by:** 06 — CI · 07 — Secret hook + hygiene.

**Status:** done — awaiting owner decision on the promotion

- [x] Full gate run from clean state passes; every spec proof-map AC checked off with evidence in Comments
- [ ] **BUILD_STATUS: S0.1 → ✅** — deliberately left 🔄. The story is not done until the owner approves the promotion, and two of ticket 05's ACs are genuinely open. Flipping it now would make the tracker lie, which CLAUDE.md calls worse than no tracker.
- [x] Squash-merge into `dev` proposed with a summary of what rides it — and not executed
- [x] Anything surfaced during the story that outlives it has been captured in the epic map backlog, not left in ticket comments

## Comments

**2026-07-15 — gate run. It found a bug, which is the point.**

**The gate's catch: unknown routes returned `500 INTERNAL_ERROR` instead of `404`.** Curling `/v1/nonexistent` against the composed stack exposed it. **34 tests had missed it** — every test hits a route that *exists*. Spring's `NoResourceFoundException` fell through to the catch-all handler. Wrong three ways: Artifact 05's table says 404; it logged at ERROR for every scanner and typo; and it leaked — a 500 for "no such route" versus a 404 for "hidden resource" tells a caller which is which, exactly what Artifact 03 wants 404 to mask. Fixed in `474221d`, regression test added, and **REGRESSION_CHECKLIST line 1** opened (already automated, per the ratchet).

This is the whole argument for a mandatory gate that exercises the real artifact: a green suite proves the paths you thought of.

**Gate results (clean `docker compose down && up --build`):**

| Proof-map AC | Result |
|---|---|
| `compose up` from clean checkout | ✅ all three services healthy; health 200 in 3s |
| Health 200, conventions, minimal body | ✅ `{"status":"ok"}` — no version/commit/uptime/component |
| Flyway ran on the fresh DB | ✅ `migrations: 1` |
| Fresh-DB semantics (plain `down`, no `-v`) | ✅ planted marker table gone; Flyway re-applied from zero |
| Error envelope through the composed stack | ✅ 404 + `{code,message,traceId,timestamp}` (after the fix above) |
| `DomainException` → envelope, traceId once | ✅ 20/20 backend tests |
| CI red on test failure | ✅ proven by a real defect — ticket 06 |
| Planted secret blocked | ✅ ticket 07 — and the hook blocked one of this story's own commits |
| Mobile: apiClient + repository + layering | ✅ 15/15 Jest, typecheck clean |

**Open, and not hidden:** ticket 05's two emulator ACs. No Android emulator was launched this session, so the screen has never been *observed* rendering. `expo export` bundles (2.6MB) and the layers are unit-tested, but that is strictly weaker than the AC asks. Left unticked for the owner to decide: run the emulator before promoting, or accept and carry it into S0.2 (which needs a dev-build anyway and cannot avoid an emulator).

**Nothing was left in ticket comments that outlives the story.** The durable items went to their homes: the `applicationId`/domain gate → epic map standing work + BUILD_STATUS; the Testcontainers 2.x renames, Boot 4 Flyway starter move, and React pin conflict → CLAUDE.md gotchas; the 404 bug → REGRESSION_CHECKLIST; the `UnavailableException` category → 06b §3 and 05.
