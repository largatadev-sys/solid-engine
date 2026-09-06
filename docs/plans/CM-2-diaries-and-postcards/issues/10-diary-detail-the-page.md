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
- *2026-09-06, fidelity pass:* frames B and C rebuilt to the handoff README — the 260pt cover under a real gradient with the round overlay buttons, the white Outfit title and Geist meta over it, the author row with the 28pt avatar, Outfit 16 day headers with Geist 13 meta, the owner's dashed empty box against the visitor's plain line, and the outlined "Add a day". **Backend, additive:** `DiaryResponse` and `PostcardResponse` now carry an `author` traveler card beside `authorId`, resolved in the two services through the identity module's `TravelerService` — without it no visitor could draw the author row the frames put on B, C, G1 and G2, since the app has no traveler-by-id fetch.
- *2026-09-06, the walk ran:* the confirm and toast stations were mounted on the profile screen only, so a deep link into the diary page (or any other CM-2 screen) had nothing to show a confirm or a toast with — the kebab's Delete silently did nothing. Both stations now live once in the profile stack's layout, beneath every route in it.
- *2026-09-06, the walk's fence test:* it asked a *follower* to be refused — the seeded demo pool has `t1` following `t2`, and a follower is admitted to a private author by design (S4.39). The walk now asks as `t3`, who follows nobody in the pool, and says why in its assertion.
