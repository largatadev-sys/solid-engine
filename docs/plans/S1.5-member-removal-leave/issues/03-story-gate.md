# 03 — Story gate: three rungs + deployed-dev probe

**What to build:** nothing new — this ticket closes the story on the layers that ship (the standing rule: verify at the layer that ships, not the layer that is convenient), then flips the tracker.

1. **Emulator, two accounts (spec AC 11):** owner removes B → B's My Trips refetch drops the trip; then the S0.3 direct-address probe reused as the eviction check — deep-link `largata://itineraries/<id>` as B (`adb shell am start -a android.intent.action.VIEW -d "largata://…"`, scheme `largata`, not the applicationId) lands in the missing state, never the plan. State what failure looks like before trusting the pass: before removal the same deep-link must reach the plan, or the probe proves nothing.
2. **Web preview container (spec AC 12):** the leave flow end-to-end in the true build path (`Dockerfile.web-preview`, ports per the pinned map: preview 8081, Metro 8082) — `drive-preview.js` with the confirm dialog intercepted via CDP (headless Chrome swallows native dialogs; "renders on web" is not "works on web").
3. **Dev build suffices everywhere** — nothing in this story differs by signing key; spend no release build on it (the which-build-proves-what table).
4. **Deployed-dev probe, post-merge (spec AC 13):** the founder-visible loop once on deployed `dev` — remove on one account, eviction observed on the other. Name the environment in anything you act on (the S1.1 lesson: a null result from an unnamed database is not an answer).
5. **Tracker:** BUILD_STATUS row → ✅ in the last commit on the feature branch (before the merge, per the standing rule). Anything surfaced along the way that outlives the story goes to the epic map's backlog, not here.

**Blocked by:** 01, 02.

**Status:** done

- [x] Two-account emulator walk green, including the deep-link eviction probe with its before/after discrimination shown *(the My-Trips half of spec AC 11 was **not** closable — see comment 1)*
- [x] Web preview leave flow green with CDP-proven dialog
- [x] Post-merge deployed-dev loop observed and recorded in this file's Comments
- [x] BUILD_STATUS flipped to ✅ on the feature branch's last commit

## Comments

**2026-07-27 — local rungs closed.**

1. **Spec AC 11's My-Trips half could not be closed, because the premise is false — and chasing it found a real pre-existing bug.** `GET /v1/itineraries` is owner-scoped, so a joined trip is **never** in a member's My Trips: there was nothing for removal to drop. Verified directly against the local stack, same account and instant — roster `200`, direct `GET /v1/itineraries/<id>` `200`, `GET /v1/itineraries` → `items: []`. Pre-existing since S1.2 (whose own client comment asserts the opposite intent), **not** an S1.5 regression, and deliberately not fixed here — it changes a shipped `/v1` list's semantics. Recorded as its own epic-map backlog line, trigger "next story touching My Trips, or S1.6 at the latest".

2. **The eviction check was closed properly, with a positive control.** As the same removed traveler, in one session seconds apart: `largata://itineraries/<a trip they are still in>` renders the plan; `largata://itineraries/<the trip they were removed from>` shows the missing state. Two distinguishable outcomes from one probe — without the control, the 404 could equally have meant "the probe never worked".

3. **Device walk (dev build, two Firebase accounts, local stack).** Owner's members screen: `Remove` on the member's row, **none on their own**, and no Leave control anywhere. The native dialog names the person ("Remove s15-member-emul01?") with a labelled `REMOVE` button. Confirming dropped the roster to one row and the DB to one membership row.

4. **Web preview (true build path, `Dockerfile.web-preview` on 8081, CDP).** The leave flow driven **twice**, because a confirm has two answers and only one is safe: cancel → dialog fired, stayed on `/members`, membership rows still 2; confirm → dialog fired, landed on My Trips, rows down to 1.

5. **Missing-state copy was changed, not just checked** (ticket 02 item 6) — *"Trip not found / No such itinerary."* asserted non-existence, which is false for a just-removed member. Now shared `missingItineraryMessage`, naming both possibilities so Artifact 03's mask holds while the wrong claim goes away. Re-verified on device after the change.

**2026-07-27 (later) — smoke test across all three rungs, run on the committed code.**

Prompted by the owner asking whether one had been done. It had not: the runs above verified *S1.5's own behaviour*, which is feature verification, not a smoke test. Two gaps that made the distinction matter — **the plan screens this change edited (`itineraries/[id]/index.tsx`, `days.tsx`) had never been opened on any rung afterwards** (the S1.3 dead-click shape exactly), and **the preview container that was driven predated both the `missingItineraryMessage` extraction and the `memberControls` refactor**, so the artifact verified was not the artifact committed. Both closed.

- **API rung — 30/30.** The pinned flow (sign in → create → edit → day → activity → invite → members) plus S1.4's lock and S1.5's matrix, on the local stack. Also re-ran four REGRESSION_CHECKLIST lines over HTTP: #1 (unknown route 404 authenticated / 401 anonymous), #2 (401 carries a non-null `traceId`), #3 (a malformed token gets the same envelope), #6 (an optional field serialises as `null`, not absent). **A first run showed 6 failures that were not regressions**: real Firebase email/password sign-up yields `email_verified:false`, so accept answers `403 EMAIL_NOT_VERIFIED` and the inbox is empty — both *correct* S1.2 decisions. The smoke now asserts them as shipped behaviour rather than working around them silently, and reaches the member state by planting the row (labelled a harness step; the join path is proven by `InvitationContractIT` with verified tokens).
- **Web preview rung — 16/16**, on a container **rebuilt from the committed code**. My Trips, trip detail, and the daily-schedule screen all render; the new missing-state copy is present and *"No such itinerary"* is gone; the owner sees Remove and no Leave, the member sees Leave and no Remove and no invite field; `window.confirm` fires with the right wording and **cancelling is obeyed**; zero uncaught page errors across both walks.
- **Emulator rung.** Sign in → My Trips → trip detail → daily schedule → **add a day (persisted: DB 1 day)**, proving plan writes still work through S1.4's lock after these edits. **The highest-risk regression of this change was checked directly:** `confirmDestructive` was generalised to delegate through `confirmWith`, and S1.3's call sites depend on it — "Delete Day 1 and everything in it? / This cannot be undone." renders unchanged with CANCEL/DELETE, and **cancelling is a true no-op** (day count still 1). Then the S1.5 remove: roster and DB drop to one membership, and the plan survives intact.
- **Zero `ERROR` lines in the backend log** across the whole exercise.

**2026-07-27 (later still) — the smoke's own blocker fixed, and spec AC 9 finally proven on a rung.**

The six first-run API "failures" above were a harness limit, and the founder asked whether it could be removed rather than worked around. It could, with no code: `@largata.test` is a **reserved TLD**, so those accounts were never verifiable and the `email_verified` gate was unreachable from any harness — hence the row-planting in every fixture, which quietly skipped the step that gate exists to protect. Replaced by a **plus-addressed pool on a real inbox** (`test-pool.js`), verified once by the founder; recorded as an off-epic ledger line and in CLAUDE.md's rig recipe.

What that immediately bought, beyond tidiness:

- **`smoke-api.js` now runs 36/36**, up from 30, and three of the new assertions were previously impossible: the real invite → inbox → accept (not a planted row); both halves of S1.2's verification gate (against a permanent deliberately-unverified `u1`, so testing the negative case no longer mints accounts); and — the one that matters for this story — **spec AC 9 (remove → re-invite → rejoin) proven end-to-end on a rung with real Firebase identities**, where it had been IT-only.
- `seed-trip.js` replaces the psql row-planting for every future fixture.
- All three scripts are committed, per the S0.6 lesson that a harness living only in a transcript gets rebuilt every story.

**2026-07-27 — deployed-dev gate closed (spec AC 13). S1.5 done.**

Run against **deployed dev — `api-dev.largata.com`, Firebase project `largata-dev`** (named, per the S1.1 lesson that a result from an unnamed environment is not an answer), with pool accounts `t1` (owner) and `t2` (the removed member). **10/10.**

**The deploy was detected by a check that can fail**, which is the part worth recording — "has the new build landed?" is the question this repo has got wrong three times with probes whose two outcomes were indistinguishable. An authenticated `DELETE /v1/itineraries/{id}/members/{id}` against a random id answers:

- **old build** → `404 NOT_FOUND` — no handler is mapped for that route at all (`GlobalExceptionHandler.handleNoHandler`)
- **new build** → `404 ITINERARY_NOT_FOUND` — the route exists and the guard masks the unknown id

Same status, different envelope code. So the pass means the S1.5 build is serving, and a failure would have said *which* build was.

The loop itself, in order: both travelers provision on the rung · owner creates a trip · invites `t2` · `t2` accepts and joins · **`t2` reads the trip (200) — the positive control, taken before the removal so the 404 afterwards means eviction rather than a broken probe** · the owner's own departure is refused `409 OWNER_CANNOT_LEAVE`, so INV-4 holds on the deployed rung and not just locally · owner removes `t2` (204) · **the same read is now 404** · roster back to the owner alone.

Gate trip left on the rung for inspection: `019fa308-c029-7a65-9ba2-5d5d3346764d`. It is deliberately not cleaned up — itinerary delete is S1.9, and the trip is named "S1.5 gate probe" so it is identifiable rather than mysterious junk in the environment founders look at.
