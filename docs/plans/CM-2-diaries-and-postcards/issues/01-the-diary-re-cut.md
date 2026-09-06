# 01: The Diary re-cut — four fields, a Day level, the memory create

**What to build:** a traveler creates a diary of a trip they took with a title and dates (destination optional), the server answers with the diary and its candidate days, and the diary reads back day by day. Editing the diary's fields never touches its days; deleting it takes everything under it. A derived diary minted from a trip now snapshots the trip's title, destination and dates and is the author's to edit afterward. This is the schema the rest of the story stands on.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] The first CM-2 migration (V53) gives the diary its destination, start and end dates, adds the Diary Day table (ordinal, date, place, and the trip day it snapshots when derived), and gives the postcard a nullable day reference; a stepping IT proves the shape against seeded CM-1 rows
- [x] Creating a standalone diary takes a title and dates (destination optional; title ≤120; end not before start; no future dates) and answers `201` with the diary and its **candidate days**, one per date in the range, none of them stored
- [x] Creating a diary with a blank title, missing dates or a reversed range is refused by name
- [x] Reading a diary answers its four fields, its stored days in ordinal order with their postcards inside, a postcard count, and the days' places
- [x] Editing title, destination or dates answers `200`, and changing the dates neither creates nor deletes a day — proven with a day outside the new range still standing
- [x] Deleting a diary destroys its days, postcards, photo rows and stored objects in one transaction, proven at the storage seam; a non-author's delete answers the masked not-found
- [x] A derived diary minted at the author's first trip postcard carries the trip's title, destination and dates, and a later edit to the trip does not rewrite them
- [x] The title-only standalone create from CM-1 is gone from the contract; the contract doc's diary section is rewritten for the new shape
- [x] Every read of a diary is fenced by the author's Profile Visibility — stranger 403, follower 200 — in the CM-1 rot-fix pattern

## Comments

- *2026-09-06, built:* V53 backfills CM-1's dateless diaries to `created_at::date` for both dates — the only honest value a CM-1 row can supply — and the range check is added after the backfill so it cannot refuse rows the backfill wrote. Two guards beyond the ticket: a diary may not start in the future (`DIARY_HAS_NOT_HAPPENED_YET`) and may not span over 365 days (`DIARY_TOO_LONG`), since the create mints one candidate day per date and an unbounded range would mint an unbounded list.
