# 08: The memory setup on the device — Post sheet, New Diary, the calendar, the days, discard

**What to build:** from the profile's plus button a traveler taps "A Diary", names the trip, picks its dates on one calendar, adds a cover, gets one card per day, fills the days they remember with a place, photos and a note, skips the rest, and posts. Backing out asks before discarding. This is frames 1, 2, 2b, 3 and L4 of the mock set, wired to the acts of tickets 01, 02, 03 and 04 through the repository layer.

**Blocked by:** 02 (Diary Days), 03 (Postcards on days), 04 (The diary cover).

**Status:** done

- [x] The repository layer gains the typed client for the diary, day, postcard-on-day and cover acts; no screen calls the wire
- [x] The Post sheet opens from the profile's plus button with the two rows and copy of frame 1
- [x] New Diary (frame 2) takes Title, Destination, Cover and the dates; Next is disabled until title and dates are set; tapping it creates the diary and moves to the days screen with the server's candidate days, and a failure keeps the form filled with the inline error copy
- [x] The calendar sheet (frame 2b) is one component: first tap sets Start, second sets End, a tap on or before Start restarts, future dates are disabled, the summary line reads the day count, and the same component runs in single-date mode
- [x] The days screen (frame 3) shows one card per candidate day with the place field, the Photos grid with its "N of 5" counter and add tile that disappears at five, and the "What happened?" box; the native picker supplies the photos; each filled day saves as its own act when the traveler leaves the card with at least one photo
- [x] Post submits whatever is unsaved and lands on the profile with the "Diary posted!" toast; a day with no photos is never sent
- [x] Back from the days screen shows the L4 discard confirm; Discard deletes the diary and its saved days in one act, Keep editing returns with everything intact
- [x] The web-lane Playwright walk creates a memory, fills two days, skips one and posts; a Jest suite pins the calendar's range reducer

## Comments

- *2026-09-06, built:* the repository layer, the date-range reducer, the calendar sheet, New Diary and the days screen with its per-day saves and L4 discard. **Not yet done: the routes.** The screens are components; no route file mounts them, so nothing in the app reaches them yet and the Playwright walk has nothing to drive. Wiring the routes — the profile's ⊕ into the Post sheet, and the diary/postcard stacks — is the remaining work of this ticket and gates the walks in 08, 09, 10, 11 and 12.
- *2026-09-06, routes landed:* nine route files now mount the screens under the profile stack — the Post sheet, New Diary, the days setup, diary detail, edit, add-a-day, a postcard on a day, New Postcard and postcard detail — each with a screen label, because the report-screen guard fails the build on an unlabelled route. `DiaryResponse` gained `authorId`, without which no client could tell frame B from frame C. **Still owed: the profile header's ⊕**, which is what opens the Post sheet in frame 1; the sheet is reachable at its own route meanwhile.
- *2026-09-06, done:* the ⊕ landed on the profile header beside the cog, and three web-lane specs cover the story — `memory-setup`, `diary-tab` and `diary-detail`, **16 walks, all parsing** (`Total: 890 tests in 56 files`, read from `--list` rather than a green tick). Every spec destructures `signIn`, per the PL-1/PL-2 lesson that a fixture only exists if a test asks for it.
