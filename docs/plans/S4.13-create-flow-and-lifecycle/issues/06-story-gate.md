# 06 — Story gate

**What to build:** nothing new — the proof that S4.13 is done, on the rungs that ship.

**Blocked by:** 02 · 05 (and transitively all).

**Status:** in-progress — one AC belongs to the promotion, not the branch

- [x] **API smoke** against the full local stack (fresh DB): the whole ladder walked and refused per spec AC 1–6; the booking card round-trip; the migration applied clean. *(`down -v` then V1→V22 clean; `smoke-lifecycle.js` 31/31, `smoke-publish.js` 44/44, `smoke-create-flow.js` 9/9.)*
- [x] **Emulator walk** *(Pixel_7, `t1` = trip owner; JS served from Metro on 8082 against the local backend via `10.0.2.2` — no Gradle run needed, this story is JS-only on the mobile side, so the S4.12 JDK gotcha does not bite.)* Walked and screenshotted: sign-in → **Trips** rendering Upcoming/Draft sections with the Draft subtitle, the orange Create Itinerary, the greyed Add a Past Trip and the four-tab bar with Discover → **create-entry** frame-faithful (greyed cover, Destination beside Duration, Best Time of Year, **Standouts** with the minus glyph and Add Standout) → day schedules with Day 1/Day 2 minted from Duration and the **+** tab → **Preview Itinerary** → the preview's honest banner, **0 / 0 / Est. Cost**, and **Finish Planning** with no publish controls on a draft → workspace at **Planning Finished**, no celebration screen → **the gate dialog** naming the precondition on a publish attempt. Server confirmed `state: upcoming, published: false, visibility: public` — three axes independent. *(Not walked on the device: Start trip → Mark completed → publish → the re-homed success chrome, all covered by `drive-publish.js` 36/36 in the rebuilt preview container and `smoke-publish.js` 44/44.)*
- [x] **Web preview** via the rebuilt container (true build path, true server): the same walk driven headless, `window.alert` intercepted, section counts checked through the API rather than eyeballed (the S4.11 discipline). *(`drive-publish.js` 36/36, `drive-create-flow.js` 27/27, screenshots opened per regression line 12.)*
- [x] Backend unit + IT suites green; mobile suite green; `tsc` clean. *(122 + 473 + 1633.)*
- [ ] Post-merge check on deployed dev with a discriminating probe designed **before** the deploy, database named (the S1.1 rule) — including the `active → ongoing` remap proven on the one database that has rows to lose. *(Belongs to the promotion — dev is the only database holding a non-DRAFT row.)*
- [x] `REGRESSION_CHECKLIST.md` reviewed; any human-caught escape adds its line. *(Line 16 — the sabotage-invocation trap.)*
- [x] `BUILD_STATUS.md` row updated — status + spec link, nothing else — in the last commit on the feature branch.
- [x] Glossary/ADR cross-check: ADR-020 and the 02-domain-model updates match what shipped; drift appends to the spec's Comments, never rewrites the body. *(Nine comments appended.)*
