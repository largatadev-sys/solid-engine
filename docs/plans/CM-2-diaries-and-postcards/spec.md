# CM-2 — Diaries and postcards, posted on their own

**Status:** ready-for-agent — grilled 2026-09-05; testing seams confirmed by the founder at /to-tickets (2026-09-06), the four owner rulings taken as proposed; not started · **Epic:** none (the content-remodel arc, after CM-1) · **Depends on:** CM-1 (merged 2026-09-06 — the four dark modules, the contract doc, V49–V52), S4.39 (shipped — the profile fence every read here goes through), PL-2 (shipped — the pin the derived snapshot carries) · **Branch:** `feature/CM-2-diaries-and-postcards`.
**Grilled:** 2026-09-05 (grill-with-docs, two rounds plus a pass over the founder's Figma export and an alignment check) — the record is `grilling.md` beside this file; every ruling below cites it. **The mock set is the archived baseline:** `mocks/` holds the founder's Claude Design handoff (canvas, README, runtime); its README's *Decisions made in this pass* moved past the grilling in four places, each named under *Owner rulings owed at review* below rather than adopted silently.
**ADR:** **ADR-036** (new, minted with this story) — amends CM-1's ADR-035: the Diary is a collection with the four memory fields and a Day level, mirroring Trip → Day → Activity; a memory creates no trip row (memory-as-Trip rejected on the record); the old entry endpoints become adapters over the new tables rather than being deleted; the Home feed gains loose postcards. The glossary re-cut (Diary, Diary Day, Postcard; Diary Entry retired) lands with it.
**Candidate-capability note:** standalone creation — trip-less diaries and postcards are a capability, footprint-growing, not governance (register #14). Adding a day and re-homing a postcard ride the same line.
**Freshness note:** Home stays pull-based (S4.35's ruling for public surfaces); the profile Diary tab and the diary detail are focus-fresh pull (S4.34's helper); the compose screens are deliberately static — they hold client state until their own act lands. No live topic is added or changed.

## Problem Statement

A traveler can only tell a trip from inside a trip. Every postcard today is born from a plan activity on a trip that exists in the app, and a diary is nothing but the projection of one traveler's postcards for one trip. The trips people most want to tell are the ones they took before Largata existed, and the moments they most want to share are the ones that belong to no plan. Both are structurally impossible: there is no way to say "here is a journey I took" without first building a workspace for it, and no way to post a photo without first planning an activity around it. CM-1 built the objects that make this possible, dark, behind the old screens; nobody can reach them, and the diary it built is a title-only album that does not match the founder's model of a told journey with days.

## Solution

Two new ways to post from the profile's plus button, and a diary that reads as a journey. **A Diary** is a traveler's telling of a trip they took: a title, a destination, a cover and dates, made of Days, each holding Postcards. It is created from a memory setup that never touches the trip tables, or minted automatically the first time a traveler posts from a real trip. **A Postcard** is one to five photos, a caption and an optional place, posted loose or onto a day, and a loose one can be filed into a diary day later. Everything a traveler already has is carried across: the old entries become postcards with the same ids inside diaries minted per trip, the old screens keep working through adapters, and the readers — Home, the profile's Diary tab, the media seam — move to the new tables so a postcard is a postcard wherever it was born.

## User Stories

1. As a traveler, I want to start a diary of a trip I took before Largata by giving it a title and dates, so that my past journeys live on my profile.
2. As a traveler, I want the setup to offer me one card per day of the date range, so that I never have to invent day numbers or dates.
3. As a traveler, I want to skip the days I don't remember, so that a diary is as complete as my memory and no emptier.
4. As a traveler, I want each day I fill to hold a place, up to five photos and a note on what happened, so that a day reads as a day.
5. As a traveler, I want to post the whole diary once, so that filling it in feels like one act.
6. As a traveler, I want backing out of the days screen to ask before it throws away what I filled, so that a stray tap never loses a memory.
7. As a traveler, I want a diary to be visible the moment it exists and to grow as I add to it, so that I never have to remember to publish.
8. As a traveler, I want to add a day to a diary later, so that a memory that surfaces a week later has a home.
9. As a traveler, I want to add a postcard to an existing day, so that a day can hold more than one moment.
10. As a traveler, I want to edit a diary's title, destination, cover and dates without losing its days, so that fixing a typo never destroys content.
11. As a traveler, I want a diary with no cover to show its first photo, so that every section on my profile has a face.
12. As a traveler, I want to post a postcard with photos, a caption and a place and nothing else, so that a moment doesn't need a trip.
13. As a traveler, I want a loose postcard to appear at the top of my profile's Diary tab, so that what I just posted is the first thing I see.
14. As a traveler, I want to file a loose postcard into a diary and a day, so that a moment can join the journey it belongs to.
15. As a traveler, I want to pick the diary and then the day in two steps, so that filing is never a guess.
16. As a traveler, I want to recaption or delete my postcard by addressing the postcard itself, so that editing never depends on the trip around it.
17. As a traveler, I want deleting a diary to warn me with the number of postcards inside, so that I never delete forty photos by accident.
18. As a traveler, I want deleting a day to warn me the same way and to leave the other days' numbers alone, so that a diary stays legible.
19. As a traveler, I want my profile's Diary tab to group my postcards by diary and to show loose ones above the sections, so that the tab reads as my journeys plus my moments.
20. As a traveler, I want a diary section to collapse and expand, so that a long profile stays navigable.
21. As a traveler, I want a diary section whose trip has a published itinerary to link to it, so that the plan and the telling stay one tap apart.
22. As a traveler, I want my profile's counts to read diaries, itineraries, followers and following, so that the numbers describe what the profile shows.
23. As a visitor, I want to open another traveler's diary and read it day by day, so that a journey reads as a journey.
24. As a visitor, I want to open a postcard and see its photos, caption, place, day and author, so that a moment has a page.
25. As a visitor to a postcard on a day, I want a row that takes me to its diary at that day, so that a moment leads to the journey.
26. As a stranger to a private profile, I want that author's diaries and postcards to refuse me by name, so that Profile Visibility means the same thing everywhere.
27. As an approved follower of a private profile, I want that author's diaries and postcards to open for me, so that following means something.
28. As a traveler with postcards posted before this story, I want every one of them to appear unchanged, with the same photos and the same links, so that the migration is invisible to me.
29. As a traveler on a trip, I want the postcards I post from the workspace to keep working exactly as before, so that the old door still opens while the new ones are built.
30. As a traveler on an older app version, I want the old endpoints to keep answering, so that I am never forced to update mid-trip.
31. As a member of a real trip, I want to post a postcard onto a trip day with no activity behind it, so that a moment between activities still has a day.
32. As a traveler, I want loose postcards to appear on Home like any other postcard, so that a moment posted from nowhere still reaches my followers.
33. As a traveler with nothing posted, I want the Diary tab to tell me what a diary and a postcard are, so that the empty state is an invitation.
34. As a traveler whose post fails, I want my draft kept on screen with a plain message, so that a bad connection costs nothing.
35. As a traveler whose delete fails, I want the row to come back and the count to restore, so that the screen never lies about what exists.
36. As the next agent, I want the day math to live on the server, so that no screen ever computes a date, an ordinal or a count.

## Implementation Decisions

**The model, re-cut from CM-1** *(rulings 1–10, 17, 19)*:
- **Diary** gains destination, cover, start and end dates, and a **Diary Day** level. Two births stand: *derived*, one per author per trip, minted at the author's first postcard on that trip with the four fields snapshotted from the trip and the author's to edit afterward; *standalone*, from the memory setup, with no trip reference and no limit per author. A memory **never creates a trip row** — memory-as-Trip was weighed and rejected on the record. A diary is a living collection with no draft state: it is public to whoever the author's Profile Visibility admits from the moment it exists, and every later day or postcard is an edit.
- **Diary Day** is an ordinal, a date and a place. Its ordinal is **derived from its date relative to the diary's start**, so a skipped day leaves a gap in the numbering rather than renumbering its neighbours ("Day 1, 2, 3, 5"). One day per date per diary; a second is refused by name. Standalone days are **candidates** until they hold something: the create response lists them, and a row exists only once the day has a place or a postcard. Adding a day outside the diary's range extends the range to include it; editing the diary's dates never creates or deletes days. Derived days mint per trip day at the author's first postcard there, snapshotting the trip day's ordinal, title and derived date. Days never reorder.
- **Postcard** keeps CM-1's shape and authority and gains a **day reference**: loose, or on exactly one day. Many per day. Derived postcards keep one-per-activity-per-author; the activity is provenance, not a requirement, so a postcard may sit on a **trip day with no activity**. A postcard with no place of its own renders its day's place. A loose postcard can be **filed onto a diary day** once; moving a homed postcard between diaries or days is refused by name in CM-2.
- **Delete** cascades downward and never upward: a diary takes its days, postcards, photo rows and stored objects; a day takes its postcards; a postcard leaves its day standing. Every confirm shows a count the server put in the payload already on screen.
- **Cover** is a photo under a new media subject owned by the diary module, served under the author's Profile Visibility. A diary with no cover renders its first postcard photo; a derived diary takes no copy of the trip's cover for the same reason it takes no reference to it.

**The memory setup is two acts, not one** *(the contract shape the grilling recommended and the founder left unobjected; the mock's C1 draws it)*: **Next: Add Your Days** creates the diary and returns its id and candidate days — no optimistic days, the client never derives a date. Each filled day is its own act as the traveler leaves its card; **Post** submits whatever is unsaved and lands on the profile; **Back** from the days screen offers to discard, which deletes the diary and any saved days in one act. A composite create was set aside on the record: it would carry twenty photos in one request, and an empty diary is a legitimate object.

**Wire grammar, additive to CM-1's** *(the contract doc is extended, and it is the reference every screen wires against)*: create a diary with title and dates, destination and cover optional; read a diary with its days and their postcards, counts included; edit and delete a diary; add, edit and delete a day; upload a cover; post a postcard onto a diary day; post a postcard onto a **trip day** with no activity, which mints the derived diary and day; post a loose postcard (CM-1's); file a loose postcard onto a day by patching it with a diary and a day; recaption and delete a postcard (CM-1's); the author's diaries, most recently updated first, for the filing picker; a traveler's profile sections — diaries with their days and postcards, loose postcards separated, the diaries count — in one read. Every count, ordinal, date, section heading and the itinerary link come from the server; the client groups and sorts nothing.

**Photos travel with the act that owns them** *(owner ruling owed — see below)*: a postcard's photos are multipart parts of its create request, as CM-1 built it, and there is no staged-upload endpoint. The mock's per-tile upload ring is therefore not a server contract; a tile shows its selected state and the Post CTA carries the whole act.

**Readers cut over, all of them** *(rulings 11, 15)*: the Home feed, the profile's Diary tab, the author's own lists and the media seam's audiences read the new tables. This is not optional even with the feed screens deferred, because the old entry write path becomes an **adapter** over the same tables, and a reader left on the old table would go blind the moment the adapter lands. The feed returns loose postcards beside derived ones; the existing card renders one with no trip line. A diary card on the feed, and the "View diary / View postcard" badge, wait for the deferred feed story.

**The old entry endpoints become adapters, and their deletion is parked** *(ruling 15)*: the trip-rooted entry paths, the per-trip diary lists on the profile and on `me`, and the postcard feed keep their shapes and answer from the new tables. Deleting them is an epic-map line whose trigger is the client's last old-path call going away. No ADR-008 waiver is needed.

**The backfill, one migration with a stepping test** *(ruling 16)*: every old entry becomes a postcard **with its id preserved**, so photo keys and shared links keep resolving; one derived diary per author per trip is minted with the trip's title, destination and dates; a diary day is minted per trip day where the entry's activity still exists and from the entry's own "Day N" label where it does not; photo rows re-point their subject from the entry to the postcard. It runs at cutover, as CM-1's B-fork rule 2 signed.

**The profile's stats row** *(owner ruling owed — see below)*: the design pass draws **Diaries · Itineraries · Followers · Following**, Diaries counting diaries alone. The grilling's ruling 14 read **Entries**, counting everything the tab shows. This spec follows the later decision and names the earlier one so the founder rules once at review. The tab label stays **Diary** either way.

**The trip-day act ships; its screen waits** *(owner ruling owed — see below)*: the mock set defers the workspace day card's "Post to diary" (frame J) and the feed frames (I) to a separate story. The backend act for a postcard on a trip day is in CM-2 regardless, proven at the API seam, so ruling 12 holds at the contract and the screen follows.

**Mobile**: every act goes through the repository layer's typed client (ADR-001, P6); no screen calls the wire. The screens are the mock set's, frame for frame: the Post sheet; New Diary with its date-range picker (one calendar, first tap start, second tap end, future dates disabled, single-date mode for Add a day); Diary days; New Postcard over the native picker; the profile Diary tab with sections, loose cards, kebab sheets, the empty state and the two toasts; diary detail for owner and visitor; add a postcard to a day; add a day; edit diary; postcard detail for owner and visitor with the diary row; the two-step filing picker; the four confirms. Deletes are confirmed then optimistic with a revert on failure; toasts hold two seconds; motion timings are the mock's; no likes, comments or engagement rows anywhere; the word "entry" leaves every surface this story touches. Back replaces Cancel in compose headers, and Back with unsaved changes asks before discarding.

**Vocabulary and docs**: Diary, Day, Postcard in copy and in the glossary; Diary Entry retires to a pointer; ADR-036 as above; the epic map gains the parked deletion line, the deferred feed-and-workspace-screens line, and the likes-and-comments deviation on the existing E4 lines; BUILD_STATUS gets this story's row.

**Events: none new.** The AFTER_COMMIT analytics events CM-1 emits keep firing; nothing consumes them yet.

## Owner rulings owed at review

The design pass is the founder's, and so was the grilling; where they differ the spec names both and asks once.

1. **Feed (I) and workspace-day (J) screens deferred** — the README moves both to a separate story; rulings 11 and 12 had them in CM-2. Proposed: accept the deferral for the *screens*, keep the *acts* (loose postcards on the feed reader, the trip-day postcard endpoint) in CM-2, and mint the follow-up line in the epic map.
2. **"Diaries" versus "Entries"** on the stats row — proposed: the design pass wins, Diaries counts diaries.
3. **Upload on pick** (the mock's C2) versus multipart at Post — proposed: the contract wins; no staging endpoint.
4. **Back replaces Cancel, and each filled day saves on leave** (C1) — proposed: accept; both fit the two-act shape already recommended.

## Amended in flight, by founder ruling

*(2026-09-06/07 — recorded here because the code shipped these and this document did not say so. Found by the spec axis of CM-2’s code review.)*

- **Geotagging reaches every memory surface.** PL-2’s pin is captured on all five memory capture points — new diary, edit diary, add day, new postcard, postcard on a day — and rendered as a tap target on four read surfaces, through `MemoryPlaceField` and `MemoryPlaceLink`. The `Pin` types moved from `com.largata.itinerary` to `com.largata.common.geo` so diary and postcard may name them without crossing a module line, and V55 puts the columns on `diary` and `diary_day`. A pinned place opens the in-app viewer; a text-only place keeps PL-1’s Google Maps fallback. The founder’s constraint was that the UI not change to accommodate it: the field is tapped and picked exactly as the activity form’s is.
- **A postcard’s place is editable**, through `PATCH /v1/postcards/{id}/place` — its own additive route, for the reason the contract doc records. Edit Postcard therefore edits caption, photos **and** place, where ticket 12 asked only for the caption.
- **Five analytics events are new**, against this document’s “Events: none new”: `postcard_filed`, `postcard_placed`, `postcard_photos_added`, `postcard_photo_removed`, `diary_described`. They follow the existing `emit` shape and carry ids only (P3).
- **The profile’s rows are ordered on the client**, against “the client groups and sorts nothing” — `profileRows.ts` interleaves diary sections and loose postcards by latest activity, newest first, because the server returns the two as separate collections and the founder ruled the profile must read strictly by recency whatever the kind. The rest of the rule stands: every count, ordinal, date and heading still comes from the server.
- **A day can only be added inside the diary’s dates, and the dates can never strand a day** *(founder ruling 2026-09-07, at the CM-2.1 follow-ups)*. This document said *“Adding a day outside the diary’s range extends the range to include it”*; it no longer does. Add Day greys out every date outside the diary and the server refuses one anyway with `DIARY_DAY_OUTSIDE_RANGE`; editing the dates so an existing day falls outside them is refused with `DIARY_RANGE_STRANDS_A_DAY`. A traveler who wants an earlier day widens the diary first, then adds it. **Why it matters beyond tidiness:** the ordinal derives from the date relative to the start, so anything that moves the start restages every number. With extension-on-add gone, editing the dates is the *only* act that moves a start, and it renumbers the dated days by the same delta — which closes the duplicate-ordinal bug at its source rather than patching one of its two doors. Derived trip days keep their snapshotted ordinal and are never shifted.
- **The postcard page’s carousel snaps, and its counter tracks** *(founder, 2026-09-07)*. It was the only carousel in the tree spreading `PAGING` without `SNAP_STYLE`/`SNAP_CHILD_STYLE`, which on web is where the whole snap lives — native gets `pagingEnabled`, web gets CSS scroll-snap. The page was also read from `onMomentumScrollEnd` alone, and a web snap-scroll often ends with no momentum event, so the 1/3 pill and the dots stood still. Both now match the Home feed’s carousel, which is the reference the founder named.
- **The Profile header matches Home and Discover** *(founder, 2026-09-07)*: 22px extraBold title and 12px above it, where it read 15px bold and 8px. Ruled knowing the traveler’s own name below is also 22px. Trips is not aligned and is an epic-map line.
- **Deleting a postcard asks instead of offering an undo.** The old Diary tab deleted optimistically and floated an Undo toast, holding the wire call back until the toast expired; CM-2 replaces that with frame L2’s confirm, per ticket 12’s *“Delete shows L2 and, on confirm, exits the card optimistically wherever it is shown”*. Nothing is lost from the traveler’s side — the question is asked before the act rather than after — but the removal queue no longer stands behind a postcard delete, so `POSTCARD_RESTORED_TOAST` and `UNDO_LABEL` have no postcard path any more. Found at the code review, when the four pre-existing walks that pinned the undo mechanism failed against the new flow; they are rewritten to the confirm, and the two that pinned an inline kebab on a postcard inside a diary section are gone with it — ticket 09’s AC 10 gives the kebab to the **section**, and a postcard inside one carries only its “Day N” meta.
- **The four content modules are organized by layer** (`api · adapter · controller · dto · entity · exception · repository · service`), each with its own ArchUnit boundary guard replacing the package-private seal the split removed. No ticket asked for it; the epic map records it, and the content-module boundary story booked there replaces the per-module guards with one rule.

## Testing Decisions

A good test here asserts **what an endpoint answers and what rows and stored objects exist afterward**, or what a screen shows a traveler, never a module's internals. No new seam is needed; the five below all exist.

1. **The HTTP integration-test seam** *(the house's highest; prior art: CM-1's seven contract classes, `PrivateAuthorFeedFilterIT` for the fence fixtures)* — every act, refusal and count above: the two-act create and its candidate days, day ordinals derived from dates, the gap a skipped day leaves, range extension on add-a-day, the filing of a loose postcard and the refusal of a homed one, the place fallback, the cascades proven at the storage seam, the trip-day postcard minting a derived diary and day, the profile sections read, the loose postcards on the feed, and **every adapter answering its old shape from the new tables**. Fence tests follow CM-1's rot-fix pattern: stranger 403, follower 200, on the diary, the day-bound postcard and the cover.
2. **The migration-stepping seam** *(prior art: `WorkspaceBackfillIT`, `ItineraryVisibilityRetirementIT`)* — own container, target the migration before the backfill, seed the legacy entries, photos and trips through raw SQL, migrate, assert ids preserved, diaries and days minted, photo subjects re-pointed, and the dangling-activity case resolved from the day label. Sabotage-checked, with the resource recompile the S4.13 lesson demands.
3. **Playwright, API lane** *(prior art: `e2e/api/diary.spec.ts`)* — the walks a traveler takes across several acts: set up a memory, fill two days, skip one, post, read it back as a visitor, file a loose postcard, delete a day.
4. **Playwright, web lane** *(prior art: `e2e/web/profile.spec.ts`)* — the screens on the preview container: the Post sheet, the setup and days screens, the Diary tab's sections and loose cards, the kebab flows and confirms, the empty state, the private-profile refusals. Strings the specs assert live in a plain module both sides import, per the S4.28 rule.
5. **Jest for the pure client modules** *(prior art: `landingSlot.ts`, `gestureTracker.ts`)* — the calendar's range reducer (start, end, restart-on-or-before-start, future dates refused), the meta-line helper for a postcard with no activity, the optimistic-delete revert, and the structural guards that already exist (layering, boundary, fence coverage) run untouched.

What no seam reaches and the device walk closes at the gate: the native photo picker, real-touch feel on the sheets and the calendar, Reduce Motion, safe-area insets.

## Out of Scope

The feed's diary card and the "View diary / View postcard" badge, and the workspace day card's "Post to diary" screen — deferred by the design pass to a follow-up story, pending ruling 1 above · a standalone itinerary · moving a postcard between diaries or days · likes, comments, reactions · deleting the old entry endpoints (parked, epic map) · TW-1 · the 30-day bin · Discover · any change to trips, workspaces or itineraries · a staged photo upload.

## Further Notes

- **Migrations** start where CM-1's end: the first is V53.
- **The stepping test's fixture must own real travelers** — the S4.39 lesson: an itinerary created for an unprovisioned owner leaves an orphan that surfaces only when a filter is removed, and this story removes readers' filters wholesale.
- **The mock files were reconstructed** from the founder's pasted bundle with the UTF-8 punctuation repaired; the README says so. The original export folder, if it turns up, overwrites them byte-for-byte and changes no decision.
- **What this story does not shrink**: the god module keeps its trip half; the content half's readers are rewritten to the new tables here, which is what makes TW-1's move-in-place clean afterward.

## Comments

- *2026-09-06, at /to-spec:* the four owner rulings above are the only open items; everything else traces to a numbered ruling in `grilling.md` or to the mock set. The seams are the five existing ones; the founder confirms them at review.
- *2026-09-06, after /to-tickets:* the founder ruled all four as proposed — screens deferred but the acts stay, the stats row reads Diaries, photos travel with the postcard's own act, Back replaces Cancel with per-day saves — and confirmed the five seams. Ticket 01 starts.
