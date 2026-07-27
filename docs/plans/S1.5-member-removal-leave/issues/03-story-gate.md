# 03 — Story gate: three rungs + deployed-dev probe

**What to build:** nothing new — this ticket closes the story on the layers that ship (the standing rule: verify at the layer that ships, not the layer that is convenient), then flips the tracker.

1. **Emulator, two accounts (spec AC 11):** owner removes B → B's My Trips refetch drops the trip; then the S0.3 direct-address probe reused as the eviction check — deep-link `largata://itineraries/<id>` as B (`adb shell am start -a android.intent.action.VIEW -d "largata://…"`, scheme `largata`, not the applicationId) lands in the missing state, never the plan. State what failure looks like before trusting the pass: before removal the same deep-link must reach the plan, or the probe proves nothing.
2. **Web preview container (spec AC 12):** the leave flow end-to-end in the true build path (`Dockerfile.web-preview`, ports per the pinned map: preview 8081, Metro 8082) — `drive-preview.js` with the confirm dialog intercepted via CDP (headless Chrome swallows native dialogs; "renders on web" is not "works on web").
3. **Dev build suffices everywhere** — nothing in this story differs by signing key; spend no release build on it (the which-build-proves-what table).
4. **Deployed-dev probe, post-merge (spec AC 13):** the founder-visible loop once on deployed `dev` — remove on one account, eviction observed on the other. Name the environment in anything you act on (the S1.1 lesson: a null result from an unnamed database is not an answer).
5. **Tracker:** BUILD_STATUS row → ✅ in the last commit on the feature branch (before the merge, per the standing rule). Anything surfaced along the way that outlives the story goes to the epic map's backlog, not here.

**Blocked by:** 01, 02.

**Status:** in-progress — local rungs closed; the deployed-dev gate remains

- [x] Two-account emulator walk green, including the deep-link eviction probe with its before/after discrimination shown *(the My-Trips half of spec AC 11 was **not** closable — see comment 1)*
- [x] Web preview leave flow green with CDP-proven dialog
- [ ] Post-merge deployed-dev loop observed and recorded in this file's Comments — **blocked: needs the squash-merge to `dev`, which is a promotion and propose-first**
- [ ] BUILD_STATUS flipped to ✅ on the feature branch's last commit — follows the probe above

## Comments

**2026-07-27 — local rungs closed.**

1. **Spec AC 11's My-Trips half could not be closed, because the premise is false — and chasing it found a real pre-existing bug.** `GET /v1/itineraries` is owner-scoped, so a joined trip is **never** in a member's My Trips: there was nothing for removal to drop. Verified directly against the local stack, same account and instant — roster `200`, direct `GET /v1/itineraries/<id>` `200`, `GET /v1/itineraries` → `items: []`. Pre-existing since S1.2 (whose own client comment asserts the opposite intent), **not** an S1.5 regression, and deliberately not fixed here — it changes a shipped `/v1` list's semantics. Recorded as its own epic-map backlog line, trigger "next story touching My Trips, or S1.6 at the latest".

2. **The eviction check was closed properly, with a positive control.** As the same removed traveler, in one session seconds apart: `largata://itineraries/<a trip they are still in>` renders the plan; `largata://itineraries/<the trip they were removed from>` shows the missing state. Two distinguishable outcomes from one probe — without the control, the 404 could equally have meant "the probe never worked".

3. **Device walk (dev build, two Firebase accounts, local stack).** Owner's members screen: `Remove` on the member's row, **none on their own**, and no Leave control anywhere. The native dialog names the person ("Remove s15-member-emul01?") with a labelled `REMOVE` button. Confirming dropped the roster to one row and the DB to one membership row.

4. **Web preview (true build path, `Dockerfile.web-preview` on 8081, CDP).** The leave flow driven **twice**, because a confirm has two answers and only one is safe: cancel → dialog fired, stayed on `/members`, membership rows still 2; confirm → dialog fired, landed on My Trips, rows down to 1.

5. **Missing-state copy was changed, not just checked** (ticket 02 item 6) — *"Trip not found / No such itinerary."* asserted non-existence, which is false for a just-removed member. Now shared `missingItineraryMessage`, naming both possibilities so Artifact 03's mask holds while the wrong claim goes away. Re-verified on device after the change.
