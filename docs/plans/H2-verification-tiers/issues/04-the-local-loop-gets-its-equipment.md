# 04 — The local loop gets its equipment

**What to build:** The three small things that make Tier 1 cost seconds. Each is independently useful and none depends on CI.

**Blocked by:** nothing.

**Status:** ready-for-agent

- [ ] `"incremental": true` in `mobile/tsconfig.json` with an explicit `tsBuildInfoFile`, and `*.tsbuildinfo` added to `.gitignore` — a build artifact must be **unstageable**, not merely un-staged. Measure the second run against the 47-second cold baseline and record it; if the saving is not real on this tree, say so and revert rather than keeping a change that only looks like one
- [ ] The scope map as **one line by example** — `-Dit.test='com.largata.<module>.**.*IT'` — framed for a tight local loop while debugging a backend change, never as a per-story ritual. A twelve-row table would rot for a use case that now arises occasionally (decision 12)
- [ ] **Verify the wildcard form before writing it down.** Comma-separated fully-qualified names are proven (22 ITs, one run); the `**` form is not. Read the `Running com.…` lines, not the summary. **And prove the negative:** a pattern matching nothing must **fail**, not pass vacuously — a scope that silently selects zero classes is the worst possible version of this feature
- [ ] The documented local IT command carries `failsafe:verify`, arriving inside ticket 05's gotcha amendment rather than as a separate edit — the two would otherwise contradict each other
- [ ] **The Metro lane gets a verdict** (decision 13): one clean run of `LARGATA_LANE=metro` on an idle machine. Works → written into the loop. Needs a bundle warm-up or a longer `navigationTimeout` → that lands here. Does not work → `LARGATA_LANE` comes **out** of `playwright.config.ts` and the README. An unverified documented option is an active trap, and this repo has three precedents (`$TMPDIR`, the hardcoded Maven path, the hardcoded JDK path)
