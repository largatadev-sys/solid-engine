# 04 — The local loop gets its equipment

**What to build:** The three small things that make Tier 1 cost seconds. Each is independently useful and none depends on CI.

**Blocked by:** nothing.

**Status:** ready-for-agent

- [x] `"incremental": true` in `mobile/tsconfig.json` with an explicit `tsBuildInfoFile`, and `*.tsbuildinfo` gitignored — a build artifact must be **unstageable**, not merely un-staged. **Measured on a quiet machine: 19.0s cold → 9.2s warm**, cache 320KB, and `git status` stays clean after a run.

  **The 47-second baseline in the spec was wrong, and the correction matters more than the win.** 47s was measured while the full backend IT suite held the CPU; the honest cold number on a quiet machine is **19s**. So the real saving is **~10 seconds, not ~40** — worth having on the loop's most-run command, but a third of what the spec claimed. Same error the spec's own `## Comments` catalogues four times: a number taken under contention and quoted as if it were the machine's.
- [ ] The scope map as **one line by example** — `-Dit.test='com.largata.<module>.**.*IT'` — framed for a tight local loop while debugging a backend change, never as a per-story ritual. A twelve-row table would rot for a use case that now arises occasionally (decision 12)
- [ ] **Verify the wildcard form before writing it down.** Comma-separated fully-qualified names are proven (22 ITs, one run); the `**` form is not. Read the `Running com.…` lines, not the summary. **And prove the negative:** a pattern matching nothing must **fail**, not pass vacuously — a scope that silently selects zero classes is the worst possible version of this feature
- [ ] The documented local IT command carries `failsafe:verify`, arriving inside ticket 05's gotcha amendment rather than as a separate edit — the two would otherwise contradict each other
- [ ] **The Metro lane gets a verdict** (decision 13): one clean run of `LARGATA_LANE=metro` on an idle machine. Works → written into the loop. Needs a bundle warm-up or a longer `navigationTimeout` → that lands here. Does not work → `LARGATA_LANE` comes **out** of `playwright.config.ts` and the README. An unverified documented option is an active trap, and this repo has three precedents (`$TMPDIR`, the hardcoded Maven path, the hardcoded JDK path)
