# 10: Diary detail — owner and visitor, add a day, add a postcard to a day, edit, delete

**What to build:** a diary has a page. The owner reads it day by day and adds a day, adds a postcard to a day, edits the diary, or deletes it with a confirm that names the count; a visitor reads the same page with no owner acts and taps the author row to the profile. Frames B, C, D, E, F, K2, L1 and L3 of the mock set.

**Blocked by:** 09 (New Postcard, and the profile's Diary tab).

**Status:** ready-for-agent

- [ ] Diary detail (frame B) renders the cover header, the author row, the days in ordinal order with their postcards, an empty day's dashed placeholder, "+ Postcard" per day and the "Add a day" footer; the visitor's version (frame C) drops the kebab and the owner acts and makes the author row navigate
- [ ] Add a postcard to a day (frame D) is the single-day card and returns to the diary with that day expanded and the new postcard washed for a second
- [ ] Add a day (frame E) shows the server's next ordinal and default date, lets the date be changed in the calendar's single-date mode, and posts the day
- [ ] Edit diary (frame F) saves title, destination, cover and dates on the CTA, shows the "dates don't add or remove days" helper, and Back with unsaved changes asks before discarding
- [ ] The section and detail kebab (frame K2) offers Edit diary and Delete diary; Delete shows L1 with the server's postcard count; on confirm the section exits optimistically and the stat decrements, and a failed request brings the row back with the dark toast
- [ ] Deleting a day shows L3 with its count and leaves the other days' numbers alone
- [ ] Deleting from the detail pops to the profile first, then plays the exit there; deleting the last of everything shows the empty state
- [ ] The web-lane Playwright walk opens a diary as owner and visitor, adds a day and a postcard, edits the title, and deletes a day; a Jest suite pins the optimistic-delete revert

## Comments
