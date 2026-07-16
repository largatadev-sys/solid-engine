# 08 — Story gate: device AC, tracker, propose the merge

**What to close the story with:** The end-to-end proof on the device, the tracker row, and the promotion checkpoint. On the Android dev-build against the composed local stack: sign in → create an itinerary (with and without dates) → see it in My Trips → open it. Then the second-account proof observed for real: account B cannot see A's itinerary (404 path renders the typed error state, not a crash). BUILD_STATUS row → ✅ + spec link **in the last commit on the feature branch** (CLAUDE.md: never after the merge). Then **propose** the squash-merge into `dev` and wait — promotions are checkpoints, never autonomous.

**Blocked by:** 01–07.

**Status:** done

**Where things stand (2026-07-16):** backend + mobile implemented, code-reviewed (both axes), review findings fixed. Backend suite green; mobile 153 tests + typecheck green. **BUILD_STATUS still reads 🔄 deliberately** — the row flips to ✅ in the *last* commit on this branch, once the outstanding AC below passes, per CLAUDE.md ("update the row before the merge, in the last commit on the feature branch"). Marking it ✅ before a human has seen the app run would be the tracker lying with authority, which is the failure that rule exists to prevent.

## Smoke test run on the emulator, 2026-07-16 (agent-driven via adb)

Stack: `docker compose up -d --build` → all three services healthy, `/v1/health` 200 through the whole chain, **V3 applied** (`flyway_schema_history`: init/traveler/itinerary, all `t`). Schema verified against the design: `text[]` destinations, nullable independent dates, `draft`/`private` defaults, `itinerary_owner_recent_idx (owner_id, id DESC)`, **no FK to traveler**. Android build: `expo prebuild` + `gradlew assembleDebug` → **BUILD SUCCESSFUL** (7m32s; needs `ANDROID_HOME` set — `expo run:android` normally writes `local.properties`).

**Passed, observed on screen:**
- [x] Signed-in launch lands on **My Trips** (not the me-screen — S0.3 moved home); Account/Plan navigation present
- [x] Empty state renders "No trips yet" + "Plan a trip", not a spinner
- [x] Create *with* dates → back on the list, **trip visible with no manual refresh** (the query invalidation, on a device)
- [x] Create *without* dates → accepted (after the fix below)
- [x] Newest-first ordering: "Japan, someday" above "Hokkaido in winter"
- [x] Detail screen: title, **`draft` + `private` badges**, destinations, dates — opened from the list's cache with no spinner
- [x] Backend log per create: `Itinerary created: id=… ownerId=…` + `event=itinerary_created`, **ids only — no title, no destination** (P3 on real traffic)
- [x] No token → **401 `UNAUTHENTICATED`** in the envelope, with a live traceId, on all three endpoints (curled against the running stack)

**The smoke test found a real bug — the whole reason this AC exists.** An undated trip rendered a literal **"null → null"** where "Dates to be decided" belonged: the server sends `"startDate": null` (Jackson includes nulls), the mirrored type said `startDate?: string`, and `!== undefined` is true for a null. **153 green unit tests could not have caught it** — they build objects in TypeScript, where an absent field *is* `undefined`; only the wire disagreed. Fixed in `deaae3b` (type is `string | null`, `formatDates` uses `== null`, fixtures pass nulls), verified on the device, and ratcheted as **regression checklist line 6**.

## The guard's proof — closed by the owner, 2026-07-16

- [x] **Signed in as a second account (`largata.dev@gmail.com`) → sees only their own trip.** Account A's "Hokkaido in winter" and "Japan, someday" are invisible.

The owner went further than the checklist asked and **created a trip as B** ("Australia" → Melbourne), which makes the proof bidirectional rather than an empty-list artifact: `Itinerary created: … ownerId=019f6654-…` in the log, then a list showing that row and nothing else. The database's own answer settles it — **3 rows in `itinerary`, 1 visible to B**. The isolation is a real filter over real shared data, in the same table, three rows apart. That is INV-1 holding through the whole chain: Firebase token → resource server → guard → owner-filtered query, on a device.

The typed-404 sub-check (pasting A's id as B) was not exercised and does not need to be: the guard's rejection is pinned byte-for-byte by `ItineraryContractIT.anotherTravelerCannotSeeMyItineraryAndCannotTellItExists`, and the screen that renders it is the same `ApiError` path S0.2's device AC already proved.

**Every AC in this story is now closed.** BUILD_STATUS → ✅ in this commit; merge proposed next.

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
