# 04 — The fixed-cost trim: migration tags and an incremental typecheck

**What to build:** The two changes that make a *scoped* run cheap enough to run on a whim. Scoping alone takes the backend from ~14 minutes to ~5, not to ~1: two chat IT classes took **3 m 20 s** while accounting for **38 s** inside the full run — the rest is startup. Eleven ITs stand up their own container and replay Flyway from V1, and `tsc` has no incremental cache.

**Blocked by:** 03 — the excluded-group flag belongs in the scope map's commands, and the map should not land twice.

**Status:** needs-triage

- [ ] `@Tag("migration")` on the eleven own-container ITs, named rather than pattern-matched, because "starts its own container" is not derivable from a class name: `HealthUnavailableIT` · `FounderVanityGrantIT` · `VanityBackfillIT` · `DestinationAndCurrencyBackfillIT` · `DiaryPublicBackfillIT` · `ItineraryAxesBackfillIT` · `ItineraryLifecycleRenameIT` · `ItineraryPublishedAtBackfillIT` · `ItineraryThreeStateRemapIT` · `WorkspaceBackfillIT` · `WorkspaceStateBackfillIT`
- [ ] Tier 1 excludes them via `-DexcludedGroups=migration`; **Tier 2, Tier 3 and the promotion gate run them unconditionally.** A migration test excluded from the gate would be strictly worse than a slow gate — these are the tests whose whole purpose is catching what no other rung can see (the S1.1 rule: a data migration is invisible to every test surface this repo owns)
- [ ] **The exclusion is proven both ways:** the scoped run's `Running com.…` count drops by exactly eleven, and an unexcluded run still contains all eleven. A tag that silently matches nothing deletes coverage from the gate with no error anywhere
- [ ] Record what the tag is worth: `HealthUnavailableIT` alone was **103 s for four tests**, `ConnectionTicketIT` **75 s for eight**. State the measured saving rather than asserting one
- [ ] `"incremental": true` in `mobile/tsconfig.json`, with an explicit `tsBuildInfoFile`, and `*.tsbuildinfo` added to `.gitignore` — a build artifact must be unstageable rather than un-staged, the same structural posture as the secret files
- [ ] Measure the second-run typecheck against the 47-second cold baseline and record it. If the saving is not real on this tree, say so and revert rather than keeping a change that only looks like an improvement
- [ ] **Do not** touch the 30-second Surefire shutdown tail. It is a consequence of `TESTCONTAINERS_RYUK_DISABLED=true`, which is itself the documented fix for the Windows hijacked-connection hang; trading one for the other is a separate decision with its own container-reaping cost. Name it in the CLAUDE.md gotcha so the next reader does not diagnose it as a leak
- [ ] **Do not** attempt Failsafe parallelism. H1 measured this box's ceiling on the web rung — 5 workers on 4 cores was *slower* than 2 and produced starvation failures — and the backend would hit the same wall against the same Docker daemon

## Comments

*(none yet)*
