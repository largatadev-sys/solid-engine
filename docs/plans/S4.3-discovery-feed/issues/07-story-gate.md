# 07 — Story gate

**Status:** ready-for-agent
**Blocked by:** 03, 04, 05, 06 (01–02 transitively).

**What to build:** The whole-stack close and the promotion proposal. Nothing new is built here; everything already built is proven at the layer that ships, the record is put in order, and the squash to the shared preview is proposed — never executed — per the promotion rules.

## Acceptance criteria

- [x] Full backend IT suite green via the resource-copying failsafe invocation, counts read from the summary; full mobile Jest suite; typecheck. **724 backend ITs, 99 mobile suites / 3538 tests, tsc clean — all on the rebased tree, after dev's V31 landed mid-flight.**
- [x] The preview container rebuilt; a new discovery web walk written and green against it — **34/34**, twice: once before the code-review fixes and once after, on a rebuilt image. Wired into `smoke-all` and recorded in the web-walk flow inventory with its four harness lessons.
- [~] **`smoke-all` NOT completed — stopped by founder call after 4 of 6 walks** *(2026-08-14: "we can skip the walks now as i've already verified the screens earlier")*. What ran was green: all seven API smokes (~30s, 0 failures) plus `drive-buffered-plan`, `drive-photo-dump`, `drive-diary`. `drive-home` and `drive-discovery` did not run in that pass — the discovery walk's own 34/34 is recorded above, from a separate run. **`drive-profile` showed 5 failures and was never baselined against `dev`**: a worktree was prepared for exactly that and removed when the walks were skipped, so whether they are pre-existing or caused by this story's stub-metrics threading through `ProfileStatsRow`/`ProfileDiaryTab` is **unknown, not cleared**. Recorded as an open question rather than a pass.
- [x] The surface walked on the device — **by the founder, not the agent** *(2026-08-14: "frontend looks good on me now", and the AVD skipped in favour of sideloading: "ill sideload the apk to my device for proper testing")*. The agent never claimed this rung and holds no screenshot evidence of its own beyond the web preview.
- [x] Mock-fidelity pass against the archived baseline (`mocks/`, read as markup rather than eyeballed). Card anatomy taken from the mock's own SVG and layout — bookmark chip inset 10px top-right, one-line ellipsized title, meta, then avatar → handle → star → rating → price in one row; the sliders icon copied path-verbatim. Two corrections found in the pass: the cover fallback was one flat grey where the mock tints per subject, and the trending scrim dimmed the whole photo where the mock draws a bottom-weighted gradient leaving the top 45% clear. Deviations remain exactly the spec's ledger.
- [x] The three glossary entries put to the owner at the gate and **parked, not applied** *(founder, 2026-08-14: "put it in the backlog, we'll decide later")* — the drafts and the argument for each moved to the epic map; `02-domain-model.md` is deliberately untouched by this story.
- [x] The feed screen's stray code comment: **already gone** — removed at S4.22, so there was nothing to clean and no ledger line is owed. Checked rather than assumed.
- [x] BUILD_STATUS row updated — status + spec link — in the last commit on the feature branch.
- [ ] The squash-merge of the feature branch into the shared preview branch is **proposed and awaits approval** (propose-first; no promotion executed by the agent).

## Comments

**Code review at close (2026-08-14), both axes, and it earned its keep.** Three findings were load-bearing and none of them were visible on a screen — the founder had already looked at the surface and approved it:

- **The count line reported cards LOADED, not matches.** A 67-match search read "20 itineraries" until scrolled, contradicting the sheet's own "Show 67 itineraries" one tap earlier. The count endpoint existed and was IT-proven to agree with the list; the screen never called it.
- **The 300ms debounce was never wired.** `SEARCH_DEBOUNCE_MS` was passed as react-query's `staleTime`, which dedupes an identical key and does not delay a new one — so every keystroke hit `/suggestions` and every draft edit hit `/count`. `acceptsResponse` (latest-wins) was tested and imported by nothing. **32 green tests on a module wired to nothing** is the lesson worth keeping from this story.
- **The visibility predicate had five hand-written copies.** `published AND public AND not archived` decides whether a private trip leaks; a drifted copy fails nothing, because the query still runs and the wrong rows are simply present. Now one constant with a test that fails if a second copy appears.

**A latent bug the review did not catch, found while fixing its neighbour:** `filtersFromParams` returned a fresh object every render, so `FilterSheet`'s `[visible, applied]` effect reset the traveler's draft mid-edit.

**The walk passed 34/34 over the first two of those.** It asserted the count line *matched a pattern* (`/\d+ itiner/`), never that the number was right — a check with no failure mode, which is the shape this repo keeps paying for.

**Migration collision with `dev`, caught by the founder rather than by any check.** Dev landed `V31__founder_vanity_zero.sql` mid-flight against this branch's `V31__itinerary_published_at.sql`. `git merge-tree` reports **zero conflicts** — both files coexist — and Flyway then refuses to start on the duplicate version. Renumbered to V32, stepping IT moved to V31→V32, ordering checked (neither migration reads what the other writes).
