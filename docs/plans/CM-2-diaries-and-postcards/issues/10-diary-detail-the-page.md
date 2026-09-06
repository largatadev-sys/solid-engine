# 10: Diary detail — the page, for owner and visitor

**What to build:** a diary has a page. The owner reads it day by day under its cover with the owner controls in place; a visitor reads the same page with no owner acts and taps the author row to the profile. Frames B and C of the mock set, read-only: the acts the owner's controls lead to are ticket 11.

**Blocked by:** 09 (New Postcard, and the profile's Diary tab).

**Status:** done

- [x] Diary detail (frame B) renders the cover header with the title, "destination • N days" and the date range over the gradient, the author row, the days in ordinal order with their postcards, an empty day's dashed placeholder, "+ Postcard" per day, the kebab, and the "Add a day" footer — every count, ordinal and date from the server's read
- [x] The visitor's version (frame C) drops the kebab, "+ Postcard" and "Add a day", renders an empty day as a plain line, and makes the author row navigate to the profile
- [x] A diary with no cover renders its first postcard photo in the header, from the server's fallback
- [x] Opening a diary from a postcard's diary row lands scrolled to that day
- [x] A stranger to a private author gets the profile-private refusal rendered as the app already renders it for a private profile; a follower gets the page
- [x] The web-lane Playwright walk opens a diary as owner and as visitor and asserts the owner controls present on one and absent on the other

## Comments

- *2026-09-06:* the screens are built and typecheck clean; the Playwright walk waits on the routes (see ticket 08's comment), which nothing mounts yet.
