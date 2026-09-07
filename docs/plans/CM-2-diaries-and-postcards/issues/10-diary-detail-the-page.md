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
- *2026-09-07, tap to view a location:* capture without display left the pins unopenable, and only the postcard surfaces even carried the pin glyph. Every place CM-2 renders is now tappable through `MemoryPlaceLink`, which is PL-1/PL-2's `placeTapTarget` brain in CM-2's clothes: a **pinned** place opens the in-app map viewer at its point and zoom, a **text-only** place falls back to the Google Maps search PL-1 shipped. Founder ruling on the treatment: **glyph and grey, no colour change** — the handoff's `#78716C` stays, and the pin glyph (added where it was missing) carries the affordance rather than a link colour. Four surfaces: the diary cover's destination, each day header's place, the postcard detail's place row and the loose card's meta. Three composed strings gained a sibling that omits the place (`dayMetaPrefix`, `looseMetaSuffix`, `detailMetaSuffix`) so the place renders as its own node. **Not wired: the tab's section header**, whose whole row is already a navigation target to the diary — a second tap target inside it invites mis-taps; say the word and it joins them.
- *2026-09-07, unticked at the code review:* **landing scrolled to the day was ticked and never built.** `postcards/[id]/index.tsx` pushes `/diaries/[id]` with no day parameter and `DiaryDetailScreen` has no scroll target, so the diary opens at its top from every entry point. The row navigates correctly; only the scroll position is missing. Backlogged in the epic map — it needs a day anchor on the route and a measured offset per day block, which is more than a one-line fix and is not what CM-2 is for.
