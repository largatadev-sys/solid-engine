# 09: New Postcard, and the profile's Diary tab that shows it all

**What to build:** a traveler posts a postcard from nowhere, and the profile's Diary tab shows loose postcards above diary sections that collapse and expand, with the stats row, the empty state and the two toasts. Frames 4, 5, 6, 7 and K1 of the mock set.

**Blocked by:** 05 (The readers cut over), 08 (The memory setup on the device).

**Status:** done

- [x] New Postcard (frame 4) takes the picked photos, a caption and a place; Post is disabled until the photos are picked and the caption or the place is set; posting lands on the Diary tab with the "Postcard posted!" toast and the new loose card at the top; a failure stays on compose with the dark toast copy
- [x] The Diary tab renders the server's sections read: loose postcard cards above, diary sections below with thumbnail, title, "destination • N days", the itinerary link only when the server sends one, the kebab and the collapse chevron; postcards inside carry the "Day N" meta
- [x] The stats row reads Diaries · Itineraries · Followers · Following from server fields, and the tab label stays Diary
- [x] The empty Diary tab shows frame K1's icon and copy and no button
- [x] No engagement row, heart, count or chat icon appears anywhere on this surface, and the word "entry" is gone from its copy
- [x] Toasts drop in, hold two seconds and leave with the mock's timings; one at a time
- [x] The web-lane Playwright walk posts a loose postcard and reads it at the top of the tab, then reads a private author's tab as a stranger and as a follower; strings asserted live in a plain module both sides import

## Comments

- *2026-09-06:* the screens are built and typecheck clean; the Playwright walk waits on the routes (see ticket 08's comment), which nothing mounts yet.
- *2026-09-06, fidelity pass:* frames 4, 5, 6, 7 and K1 rebuilt to the handoff README. **The stats-row line above was a false tick in the first pass** — the row still read Published · Destinations; it now reads Diaries · Itineraries · Followers · Following, with the Diaries count from the sections read and the Itineraries count from the profile stats. The profile header is frame 5's: a "Profile" title row with the ⊕ and the ≡ as 36pt round buttons with no ring (the ≡ replaces the cog and opens the same account screen), avatar 72 on the #FDE4CF well, Inter 800/22 name, 13 handle, 13.5 bio; the tabs are Geist 700/14 on the 3pt bar. **One deviation:** the Edit Profile pill stays below the stats — the frame does not draw it and the README does not mention it, but it is the app's only way into profile editing and CM-2 does not own that flow; moving it into the ≡ is a decision for its own story.
