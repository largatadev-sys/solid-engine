# 03 — Story gate

**What to build:** nothing new — the story closed on evidence, at the layers that ship, with the tracker updated before the merge.

1. **Device AC (dev build, pool accounts, tags stated — t1 = owner, t2 = member):** t1 starts the trip — confirm-cancel first (state stays `draft`), then confirm-accept (the badge flips); t2's next look shows the badge and **no banner or lever**; t1 completes the same double way. A second trip with a past start date left in `draft` shows the nudge copy and offers **Start, not Complete**. Backend log + screenshots as evidence — routing is not a round-trip (spec AC 7).
2. **Web preview container (true build path):** `drive-preview.js` — as t1, drive both transitions with `window.confirm` intercepted via CDP, cancel first (state unchanged on refetch), then confirm (the badge appears); My Trips renders the badge. A confirm that ignores "no" is worse than none (spec AC 8).
3. **Deployed-dev probe, post-merge:** one start → complete loop via a pool account on deployed dev. **The write path is the probe where it can be** (the S1.6 AC-14 lesson): the entity maps `started_at`/`completed_at`, so a 200 from `/start` is an UPDATE that could not succeed against a database missing the migration's columns — state that reasoning in the write-up before trusting it. The SQL check then confirms contents: **name the `railway` database** (S1.1's rule — a null result from an unnamed database is not an answer) and read `state = 'COMPLETED'` with both stamps present (spec AC 9).
4. **Tracker discipline:** BUILD_STATUS row → ✅ with the spec link, **in the last commit on the feature branch, before the merge** · regression checklist reviewed — any bug that escaped to a human during this story adds its line · epic-map sweep: anything raised mid-story that outlives it gets its backlog line.
5. **Full suites green** on the local stack before proposing the squash-merge: backend ITs, mobile Jest, clean `tsc`. The merge itself is propose-first, as every promotion is.

**Blocked by:** 01, 02 — the whole story.

**Status:** ready-for-agent

- [ ] Device walk complete as scripted, tags stated, cancel + confirm both driven, member sees no lever, overdue draft offers Start (spec AC 7)
- [ ] Preview container driven via CDP, cancel + confirm both, badge on My Trips (spec AC 8)
- [ ] Deployed-dev probe post-merge: write-path reasoning stated, SQL names `railway`, state + both stamps read back (spec AC 9)
- [ ] BUILD_STATUS ✅ + regression checklist + epic-map sweep in the last feature-branch commit
- [ ] Full suites green; squash-merge proposed, not executed
