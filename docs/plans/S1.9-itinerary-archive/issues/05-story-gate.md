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

**Status:** in progress — device and preview closed; deployed-dev probe pending the promotion

- [x] Device run per §1, both accounts, tags stated, cancel and confirm both driven (spec AC 13)
- [x] Preview container run per §2, CDP-intercepted confirms, frozen treatment shown (spec AC 14)
- [ ] Deployed-dev probe per §3, database named, both states read back (spec AC 15) — **post-merge, needs the `dev` deploy**
- [ ] BUILD_STATUS row flipped in the last feature-branch commit; spec comments appended

## Comments

**2026-07-28 — device and preview rungs closed. API 46/46, web 18/18.**

**Tags: t1 = owner, t2 = member.**

1. **API rung (local full stack, verified pool): 46 passed, 0 failed** — the whole product's flows, with ten new S1.9 checks appended to the committed `smoke-api.js`. The archive half proves the fence *from both sides of the roster*: a member's plan write and **the owner's own lifecycle act** both answer `TRIP_ARCHIVED`, because archive freezes the trip rather than one person's access. Also: the list splits, and a member still leaves (204).
2. **The backfill ran against real rows for the first time.** This stack had been up 12 hours with S1.7's data, so V13 was not the no-op it is on every fresh surface: `2 COMPLETED / 10 ACTIVE / 0 ARCHIVED`, each workspace matching its itinerary. That is the rehearsal deployed `dev` needs — and `VOIDED` invitation rows now exist in a real database, so the status is not merely an enum value.
3. **Web rung: 18 passed, 0 failed**, driven by the new committed `scripts/drive-archive.js` (real headless Chrome against the **preview container**, never `expo export` + a static server). Cancel *and* confirm driven for both acts via CDP-intercepted `window.confirm` — the `Alert.alert`-is-a-no-op gotcha means an unforked confirm would silently do nothing on web. Committed rather than left in the transcript, per the S0.6 rule about drivers being rebuilt every story.
4. **The screenshot caught what no assertion did.** Every web check was green while the badges read *Draft · private · archived* — the lifecycle badge goes through `formatItineraryState` (capitalised) and mine passed a raw lowercase string. Fixed to `Archived`. This is exactly why the repo pairs a screenshot with green tests.
5. **A missing banner on the device turned out to be correct behaviour, and the pool's naming ruling is what made that fast to establish.** The emulator held a t2 session; a *member* on a *live* trip correctly sees no archive banner. The discriminating check was "which fixture is this?", answered on sight because the account renders as `largata.dev+t2`. A realistic name would have needed a mapping held in my head — and a wrong one would have sent me debugging a component that was working. Better still, t2's view **is** an AC, so it was closed on the spot: archived state visible, no lever, Edit/Daily-schedule gone, **Leave still live**.
6. **Cancel was proven to genuinely cancel, by the database rather than the render.** After tapping CANCEL the workspace still read `ARCHIVED` and the screenshot was byte-identical (111248 bytes both times); after CONFIRM it read `ACTIVE` — recomputed from the draft itinerary, per decision 8. Two outcomes from one probe.
7. **Two documented traps hit and avoided.** `pm clear` deletes the whole `shared_prefs` **directory**, so the Metro-host pref must be re-pushed *after* the app has been launched once (S1.7's white-screen trap) — done in that order, verified by listing the directory. And `adb shell input text` mangles the pool password's special characters, which presents as *"Email or password is incorrect"* and reads like a wrong credential rather than a broken input method; escaping the shell-significant characters fixed it.
8. **AC 15 remains open by design** — the deployed-dev probe runs *after* the promotion to `dev`, which is the owner's call. Everything it needs is written down in §3.
