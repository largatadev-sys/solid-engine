# 02 — The follower and following lists, public and explorable

**What to build:** the two list endpoints and the two pushed screens behind the stat cells, on both profile rows — canvas frames 1a/1b/1c.

**Blocked by:** 01.

**Status:** done

- [x] **`GET /v1/travelers/{handle}/followers`** and **`GET /v1/travelers/{handle}/following`** — handle-addressed sibling subresources of the profile read (spec decision 12), readable by any signed-in traveler (spec decision 3), pages of `TravelerCardResponse`, cursor pages of 20, ordered `created_at` desc. 404s exactly as the profile read does (unknown handle, un-onboarded).
- [x] **The list screens per frames 1a/1b:** back chevron + title 15/700, count line "{n} followers" / "{n} following" 13/600 muted, plain rows (44px avatar r22, name 15/700, handle 13 muted, chevron #D6D3D1, press #FAFAF9), tap → that traveler's profile. **No follow button in rows.** Infinite scroll, fetch at 5 rows from end; M2 cascade, first 8 rows only, later pages unanimated.
- [x] **The stat cells go pressable** on the public profile *and* the own Profile tab (C4) — Followers/Following push the matching list; Published/Destinations stay inert.
- [x] **Empty states per frame 1c**, copy byte-for-byte: Followers — "No followers yet" / "When travelers follow you, they'll show up here."; Following — "Not following anyone yet" / "Follow travelers to see their postcards in your Home feed." + the filled **Find people** CTA into People search.
- [x] Offline per C7: lists show an inline Retry row, never a blank screen.
- [x] List cursor handling compares with `??`, never `!==` (the S3.1 `nextCursor` trap) — hand the cursor to the infinite query as the existing lists do.
