# 11: The diary's owner acts — add a day, add a postcard to a day, edit, delete

**What to build:** from the diary page the owner adds a day, adds a postcard to a day, edits the diary's fields, or deletes the diary or a day behind a confirm that names the count. Frames D, E, F, K2, L1 and L3 of the mock set, wired to the acts of tickets 01, 02, 03 and 04.

**Blocked by:** 10 (Diary detail, the page).

**Status:** ready-for-agent

- [ ] Add a postcard to a day (frame D) is the single-day card — place, Photos grid, "What happened?" — and returns to the diary with that day expanded and the new postcard washed for a second; a failure stays with the dark toast copy
- [ ] Add a day (frame E) shows the server's next ordinal and default date, lets the date be changed in the calendar's single-date mode, and posts the day; a date already holding a day shows the server's refusal inline
- [ ] Edit diary (frame F) saves title, destination, cover and dates on the CTA, shows the "dates don't add or remove days" helper, and Back with unsaved changes asks before discarding
- [ ] The kebab (frame K2, from the section and from the page) offers Edit diary and Delete diary; Delete shows L1 with the server's postcard count
- [ ] On confirm the diary exits optimistically and the Diaries stat decrements; deleting from the page pops to the profile first, then plays the exit there; a failed request brings the row back with the dark toast
- [ ] Deleting a day shows L3 with its count, exits the day optimistically, and leaves the other days' numbers alone
- [ ] Deleting the last of everything shows the empty Diary tab
- [ ] The web-lane Playwright walk adds a day and a postcard, edits the title, deletes a day, and deletes the diary; a Jest suite pins the optimistic-delete revert

## Comments
