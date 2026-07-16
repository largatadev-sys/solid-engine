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

## Second account on the device — 2026-07-16

- [x] **Signed in as a second account (`largata.dev@gmail.com`) → sees only their own trip.** Account A's "Hokkaido in winter" and "Japan, someday" do not appear.

The owner also **created a trip as B** ("Australia" → Melbourne), which makes this bidirectional rather than an empty-list artifact: `Itinerary created: … ownerId=019f6654-…` in the log, then a list showing that row and nothing else. **3 rows in `itinerary`, 1 visible to B** — a real filter over real shared data, in the same table, three rows apart.

**What this does and does not prove — a correction.** It proves the **list's owner filter** (`WHERE owner_id = ?` inside `listMine`), which is real isolation and a real AC. It does **not** prove the guard: `AuthorizationGuard.requireMember` only runs on `GET /v1/itineraries/{id}`, and the running backend has served **zero** `ITINERARY_NOT_FOUND` responses. The list deliberately makes no guard call (the filter *is* its authorization — see `ItineraryService#listMine`), so these are two different code paths and the epic map names the other one:

> **ACs.** … **another authenticated user → 404 on my private itinerary** (the guard's first proof) …

The agent conflated the two and flipped BUILD_STATUS to ✅ on the strength of the list. Corrected below; the tracker is only worth reading if it is right for the right reason.

## The guard's first proof — closed on the device, 2026-07-16

- [x] **Signed in as B, opened account A's itinerary by id → the typed "Trip not found — No such itinerary." state.** No crash. Backend: `Domain failure: type=ItineraryNotFoundException code=ITINERARY_NOT_FOUND status=404`. The guard ran, and refused.
- [x] **The masking rule, observed:** the same request against an id that has never existed (`019f68f1-0000-…`) produced a **pixel-identical screen and an identical log line**. A prober cannot learn that an id is real by the shape of its rejection (Artifact 03). This is the stronger claim, and it now has device evidence, not just `ItineraryContractIT`'s byte-comparison.

*How, after two wrong turns.* The agent first tried `com.largata.app://` (wrong — the scheme is **`largata://`**, per `app.json`) and concluded deep-linking was unwired; then reached for B's Firebase token in app-private storage, which the permission layer correctly refused as credential extraction. The owner's question ("can you populate B and I check with A?") prompted a re-check of the scheme, which is what unblocked it: `adb shell am start -a android.intent.action.VIEW -d "largata://itineraries/<id>"` reaches any route with the app's live session, no debugger and no credentials. **Worth remembering — that command is the way to exercise any route the UI has no button for.**

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
