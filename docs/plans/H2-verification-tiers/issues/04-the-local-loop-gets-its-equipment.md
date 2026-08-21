# 04 — The local loop gets its equipment

**What to build:** The three small things that make Tier 1 cost seconds. Each is independently useful and none depends on CI.

**Blocked by:** nothing.

**Status:** ready-for-agent

- [x] `"incremental": true` in `mobile/tsconfig.json` with an explicit `tsBuildInfoFile`, and `*.tsbuildinfo` gitignored — a build artifact must be **unstageable**, not merely un-staged. **Measured on a quiet machine: 19.0s cold → 9.2s warm**, cache 320KB, and `git status` stays clean after a run.

  **The 47-second baseline in the spec was wrong, and the correction matters more than the win.** 47s was measured while the full backend IT suite held the CPU; the honest cold number on a quiet machine is **19s**. So the real saving is **~10 seconds, not ~40** — worth having on the loop's most-run command, but a third of what the spec claimed. Same error the spec's own `## Comments` catalogues four times: a number taken under contention and quoted as if it were the machine's.
- [x] **The wildcard form is verified, both directions, 2026-08-22.** Positive: `-Dit.test='com.largata.chat.**.*IT,com.largata.ws.**.*IT'` selected **exactly the expected 8 classes** — `ChatDeliveryIT`, `ChatContractIT`, and WS-1's six — read from the `Running com.…` lines, not the summary. Negative: `-Dit.test='com.largata.nosuchmodule.**.*IT'` **failed the build**, exit 1, with `No tests matching pattern … were executed!`. A typo'd scope cannot pass on zero tests, which is the property that makes the shortcut safe to document
- [ ] The scope map as **one line by example** — `-Dit.test='com.largata.<module>.**.*IT'` — framed for a tight local loop while debugging a backend change, never as a per-story ritual. Lands with ticket 05's CLAUDE.md pass, so the command and the amended gotchas arrive together rather than contradicting each other for a commit
- [ ] The documented local IT command carries `failsafe:verify`, arriving inside ticket 05's gotcha amendment rather than as a separate edit — the two would otherwise contradict each other
- [ ] **The Metro lane gets a verdict** (decision 13) — **BLOCKED on a founder action, and the earlier failure is now explained.**

  On a quiet machine with the stack healthy, the Metro web bundle returns **HTTP 500 after 42s**: `UnableToResolveError: Unable to resolve module ../src/ws/useSocketLifecycle from app/_layout.tsx`. **The file exists and is tracked on `dev`** — the Metro process has been running since **20 Aug 11:44**, so it predates the WS-1 work that added it and is serving a stale resolution cache. Nearly two days old.

  **That retroactively explains the 7/7 failure this ticket was written to investigate**, which was attributed to CPU contention. Contention was real but was not the cause: the bundle could not build at all. **The lane itself is still unjudged** — a stale bundler proves nothing about it either way.

  Unblocking needs the Metro process restarted, which is the founder's dev server and may be serving an emulator session, so it is not an agent action. After a restart: one clean run of `LARGATA_LANE=metro`.

  **The lesson generalises past this ticket:** a long-lived Metro is a silent liar — it answers 200 on `/status` while failing every bundle, so *"is Metro up?"* and *"can Metro build this tree?"* are different questions and only the second one matters. Same shape as the stale-emulator-session and shared-Chrome-profile traps: check the state the tool actually has, never the render. Works → written into the loop. Needs a bundle warm-up or a longer `navigationTimeout` → that lands here. Does not work → `LARGATA_LANE` comes **out** of `playwright.config.ts` and the README. An unverified documented option is an active trap, and this repo has three precedents (`$TMPDIR`, the hardcoded Maven path, the hardcoded JDK path)
