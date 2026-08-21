# 03 — The scope map: a backend module names its own ITs

**What to build:** One table in CLAUDE.md mapping each backend module to the `-Dit.test` pattern that runs its ITs, with counts, plus the honest statement of what scoping does **not** cover. The package tree already draws the boundary — S4.10 can break 8 of 108 IT classes — and no ticket, README or gotcha in this repo has ever named a pattern, so every recorded invocation across `docs/plans/` is the unscoped one.

**Blocked by:** 02 — the map's commands include `failsafe:verify`, and writing them twice is how a stale command gets copied forward.

**Status:** needs-triage

- [ ] **The pattern syntax is proven on this project before it is written down.** Run `-Dit.test='com.largata.chat.**.*IT,com.largata.ws.**.*IT'` and confirm it selects **exactly 8 classes** by reading the `Running com.…` lines, not by trusting the summary. This repo does not gain a recommended command nobody has run — the `$TMPDIR` wipe, the hardcoded Maven path and the hardcoded JDK path are three standing examples of a remedy that resolved on the machine that wrote it and nowhere else
- [ ] **The negative direction is proven:** a pattern matching nothing **fails** rather than passing vacuously. If Failsafe's `failIfNoSpecifiedTests` default does not already do this, say so and set it — a scope that silently selects zero classes is the worst possible version of this feature
- [ ] The table lands in CLAUDE.md with counts as measured 2026-08-21: `itinerary` 49 · `identity` 15 · `membership` 10 · `workspace` 7 · `ws` 6 · `invitation` 6 · `common` 5 · `poll` 3 · `chat` 2 · `verification` 2 · `health` 2 · `media` 1
- [ ] The table carries its own limits, stated on the map rather than three sections away:
  - `common` is **cross-cutting** — the error envelope, the unauthenticated contract, CORS posture — so it rides along with anything touching the web layer
  - a change to **shared code** earns the broad sweep regardless of package: a `src/media` helper, a hook, a design token, a repository method, a deleted export. CLAUDE.md already says this; the map restates it where the shortcut is offered
  - `itinerary` at 49 classes is the one module where scoping barely helps, and that is worth seeing rather than discovering
- [ ] The mobile half is stated beside it: `npx jest --changedSince=dev` is the iterate default, **not** `--findRelatedTests` — the latter returns 8 suites for `src/chat/*` and misses `chatTab.test.ts`, because 22 of 119 suites read their subject with `readFileSync` and are invisible to Jest's dependency graph. Name the reason, or the next reader will "improve" it back
- [ ] The Playwright half is stated: specs are selected by path (`npx playwright test e2e/api/chat.spec.ts`), and a surface's specs are named in its story rather than guessed

## Comments

*(none yet)*
