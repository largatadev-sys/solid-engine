# 03 — Story gate: three rungs + deployed-dev probe

**What to build:** nothing new — this ticket closes the story on the layers that ship (the standing rule: verify at the layer that ships, not the layer that is convenient), then flips the tracker.

1. **Emulator, two accounts (spec AC 11):** owner removes B → B's My Trips refetch drops the trip; then the S0.3 direct-address probe reused as the eviction check — deep-link `largata://itineraries/<id>` as B (`adb shell am start -a android.intent.action.VIEW -d "largata://…"`, scheme `largata`, not the applicationId) lands in the missing state, never the plan. State what failure looks like before trusting the pass: before removal the same deep-link must reach the plan, or the probe proves nothing.
2. **Web preview container (spec AC 12):** the leave flow end-to-end in the true build path (`Dockerfile.web-preview`, ports per the pinned map: preview 8081, Metro 8082) — `drive-preview.js` with the confirm dialog intercepted via CDP (headless Chrome swallows native dialogs; "renders on web" is not "works on web").
3. **Dev build suffices everywhere** — nothing in this story differs by signing key; spend no release build on it (the which-build-proves-what table).
4. **Deployed-dev probe, post-merge (spec AC 13):** the founder-visible loop once on deployed `dev` — remove on one account, eviction observed on the other. Name the environment in anything you act on (the S1.1 lesson: a null result from an unnamed database is not an answer).
5. **Tracker:** BUILD_STATUS row → ✅ in the last commit on the feature branch (before the merge, per the standing rule). Anything surfaced along the way that outlives the story goes to the epic map's backlog, not here.

**Blocked by:** 01, 02.

**Status:** open

- [ ] Two-account emulator walk green, including the deep-link eviction probe with its before/after discrimination shown
- [ ] Web preview leave flow green with CDP-proven dialog
- [ ] Post-merge deployed-dev loop observed and recorded in this file's Comments
- [ ] BUILD_STATUS flipped to ✅ on the feature branch's last commit

## Comments

*(empty — accretes during implementation)*
