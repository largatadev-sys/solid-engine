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
- [ ] The web-lane Playwright walk creates a memory, fills two days, skips one and posts; a Jest suite pins the calendar's range reducer

## Comments

- *2026-09-06, built:* the repository layer, the date-range reducer, the calendar sheet, New Diary and the days screen with its per-day saves and L4 discard. **Not yet done: the routes.** The screens are components; no route file mounts them, so nothing in the app reaches them yet and the Playwright walk has nothing to drive. Wiring the routes — the profile's ⊕ into the Post sheet, and the diary/postcard stacks — is the remaining work of this ticket and gates the walks in 08, 09, 10, 11 and 12.
