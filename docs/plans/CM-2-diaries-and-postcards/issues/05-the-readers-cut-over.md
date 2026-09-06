# 05: The readers cut over — profile sections, the author's diaries, Home, the media audiences

**What to build:** every surface that shows postcards reads the new tables. A traveler's profile answers its diaries as sections with days and postcards inside, loose postcards separated, and a diaries count; the author's own diaries list orders by last update for the filing picker; Home returns loose postcards beside derived ones; the photo audiences answer from the new rows.

**Blocked by:** 03 (Postcards on days), 04 (The diary cover).

**Status:** done

- [x] A traveler's profile sections read answers, in one call, the diaries most recently updated first — each with its four fields, cover or first-photo fallback, day count, days in ordinal order and postcards inside — plus loose postcards newest first, and the counts the stats row shows
- [x] A section carries the published-itinerary link only when its trip has a published itinerary, and nothing when the trip is gone or unpublished
- [x] The author's diaries list answers most recently updated first with a cursor page, for the filing picker
- [x] Home's postcard feed reads the new table: derived postcards render exactly as before, loose postcards appear with no trip fields, and a private author's postcards leave a stranger's feed and stay on a follower's, in the S4.39 pattern
- [x] Every read on this surface is fenced by the author's Profile Visibility — stranger 403 on the sections, follower 200 — and the fence-coverage scan names the doors
- [x] Postcard photos and diary covers serve through audiences that read the new rows
- [x] The contract doc records the sections read, the ordering rules and the count fields

## Comments

- *2026-09-06, built:* the stats row's Itineraries, Followers and Following counts stay on the existing profile read (`GET /v1/travelers/{handle}`) rather than being duplicated into the sections read — a count in two places is a fact that rots. The sections read carries `diaryCount` alone, which is the number this story introduces.
