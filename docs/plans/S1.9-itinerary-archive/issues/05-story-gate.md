# 05 — Story gate: three rungs + the tracker row

**What to build:** the founder-visible proof that archive works where it ships — device, true web build, deployed dev — plus the tracker row flip that must land on the feature branch. Nothing new is built here; this ticket closes the ACs only a running system can close.

1. **Device (dev build, pool accounts — tags stated in the write-up: t1 = owner, t2 = member; the rig recipe in CLAUDE.md, ports as pinned):**
   - t1 archives — confirm-**cancel** leaves the trip live, confirm-**accept** archives (a confirm that ignores "no" is worse than none — S1.5's rule).
   - The trip leaves **both** accounts' default My Trips and appears in both archived views on next fetch (pull, no notification).
   - t2 sees the archived state and **no** archive/unarchive control; a plan-edit attempt reads as archived, never broken.
   - t2 **leaves while the trip is archived** — the one open door, proven on device.
   - t1 unarchives — the trip returns to the default list with the right state (spec AC 13).
2. **Web preview container** (`Dockerfile.web-preview` build, never `expo export` + a static server): as t1, archive and unarchive driven by `drive-preview.js` with CDP-intercepted confirm — cancel and confirm both, for both acts; an attempted edit on an archived trip shows the frozen treatment (spec AC 14). Evidence, not vibes: page text + screenshots, console errors read.
3. **Deployed-dev probe** (post-merge): one archive → unarchive loop via a pool account; the SQL check **names the `railway` database** (the S1.1 lesson — a null result from an unnamed database is indistinguishable from "no") and reads `workspace.state` at each step: `ARCHIVED` after the first act, the recomputed value after the second (spec AC 15). State what each probe's failure looks like before trusting it.
4. **The tracker:** BUILD_STATUS's S1.9 row → ✅ **in the last commit on the feature branch** (the non-negotiable — updating after the merge means committing to `dev` directly). Spec `## Comments` gains the implementation notes; anything surfaced mid-story that outlives it goes to the epic map, not here.
5. **Regression checklist:** add a line only if a bug escaped to a human during this story (the standing rule); otherwise touch nothing.

**Blocked by:** 03 — the fence · 04 — mobile archived surface.

**Status:** ready-for-agent

- [ ] Device run per §1, both accounts, tags stated, cancel and confirm both driven (spec AC 13)
- [ ] Preview container run per §2, CDP-intercepted confirms, frozen treatment shown (spec AC 14)
- [ ] Deployed-dev probe per §3, database named, both states read back (spec AC 15)
- [ ] BUILD_STATUS row flipped in the last feature-branch commit; spec comments appended
