# 08 — Story gate: device AC, tracker, propose the merge

**What to close the story with:** The end-to-end proof on the device, the tracker row, and the promotion checkpoint. On the Android dev-build against the composed local stack: sign in → create an itinerary (with and without dates) → see it in My Trips → open it. Then the second-account proof observed for real: account B cannot see A's itinerary (404 path renders the typed error state, not a crash). BUILD_STATUS row → ✅ + spec link **in the last commit on the feature branch** (CLAUDE.md: never after the merge). Then **propose** the squash-merge into `dev` and wait — promotions are checkpoints, never autonomous.

**Blocked by:** 01–07.

**Status:** ready-for-human *(tickets 01–07 are done and committed; what remains is the device observation, which no agent can do)*

**Where things stand (2026-07-16):** backend + mobile implemented, code-reviewed (both axes), review findings fixed. Backend suite green; mobile 148 tests + typecheck green. **BUILD_STATUS still reads 🔄 deliberately** — the row flips to ✅ in the *last* commit on this branch, once the two device ACs below pass, per CLAUDE.md ("update the row before the merge, in the last commit on the feature branch"). Marking it ✅ before a human has seen the app run would be the tracker lying with authority, which is the failure that rule exists to prevent.

**The checklist for the human, on the dev-build against the composed local stack:**
1. `docker compose up` → `cd mobile && npm run android`
2. Sign in → land on **My Trips** (not the me-screen: S0.3 moved home)
3. Empty state renders ("No trips yet") → "Plan a trip"
4. Create *with* dates → back on the list, trip visible **without a manual refresh** (this is the query invalidation working)
5. Create *without* dates → shows "Dates to be decided"
6. Tap a trip → view shows title, destinations, dates, and the `draft`/`private` badges
7. Sign out → sign in as a **second account** → their list is empty; A's trip is invisible. *(If you have A's itinerary id, hitting its URL as B should render the typed "Trip not found" state, not a crash.)*
8. Watch the backend log for one `event=itinerary_created` line per create, carrying no title/destination text

- [ ] Device AC (human-observed): create/list/view round-trip on the dev-build, both date variants
- [ ] Device AC (human-observed): second account → my itinerary invisible; list shows only their own (empty) list
- [ ] Full CI green: backend integration suite + mobile Jest + typecheck
- [ ] BUILD_STATUS: S0.3 → ✅ with spec link, in the final feature-branch commit; nothing else in the row
- [ ] Anything raised mid-story is in the epic-map backlog, not in a TODO comment
- [ ] Squash-merge into `dev` **proposed** with the inter-change-dependency note for the future cherry-pick (CLAUDE.md footgun); merge waits for owner approval

## Comments
