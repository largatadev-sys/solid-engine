# 08 — Story gate: device AC, tracker, propose the merge

**What to close the story with:** The end-to-end proof on the device, the tracker row, and the promotion checkpoint. On the Android dev-build against the composed local stack: sign in → create an itinerary (with and without dates) → see it in My Trips → open it. Then the second-account proof observed for real: account B cannot see A's itinerary (404 path renders the typed error state, not a crash). BUILD_STATUS row → ✅ + spec link **in the last commit on the feature branch** (CLAUDE.md: never after the merge). Then **propose** the squash-merge into `dev` and wait — promotions are checkpoints, never autonomous.

**Blocked by:** 01–07.

**Status:** ready-for-agent *(device observations are the human's — hand over a checklist, wait for confirmation)*

- [ ] Device AC (human-observed): create/list/view round-trip on the dev-build, both date variants
- [ ] Device AC (human-observed): second account → my itinerary invisible; list shows only their own (empty) list
- [ ] Full CI green: backend integration suite + mobile Jest + typecheck
- [ ] BUILD_STATUS: S0.3 → ✅ with spec link, in the final feature-branch commit; nothing else in the row
- [ ] Anything raised mid-story is in the epic-map backlog, not in a TODO comment
- [ ] Squash-merge into `dev` **proposed** with the inter-change-dependency note for the future cherry-pick (CLAUDE.md footgun); merge waits for owner approval

## Comments
