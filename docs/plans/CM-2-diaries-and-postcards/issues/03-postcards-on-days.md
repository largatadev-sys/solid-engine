# 03: Postcards on days — onto a diary day, onto a trip day, and filing a loose one

**What to build:** a postcard lands on a day. The author posts one onto a diary day; a trip member posts one onto a trip day with no activity behind it, which mints the derived diary and day if they do not exist; a loose postcard is filed onto a diary day once. A postcard with no place of its own renders its day's place.

**Blocked by:** 02 (Diary Days).

**Status:** done

- [x] Posting onto a diary day (multipart, 1–5 photos, caption ≤2000, place optional) answers `201` with the postcard carrying its diary and day; a candidate day materialises as a stored day on its first postcard
- [x] Posting onto a trip day with no activity answers `201`, mints the author's derived diary and that day when absent, carries no activity in the snapshot, and respects the trip-started gate and the archive freeze exactly as the activity-derived postcard does
- [x] A non-member posting onto a trip day answers the masked not-found; a day outside the trip answers not-found
- [x] Filing a loose postcard onto a diary day by patching it with a diary and a day answers `200` and the postcard reads back on that day; filing onto someone else's diary answers the masked not-found; filing a postcard already on a day is refused by name
- [x] The postcard read and every list carry the day reference and, when the postcard has no place, the day's place as its rendered place
- [x] The one-per-activity-per-author rule still holds for activity-derived postcards; day-bound postcards without an activity are unlimited
- [x] Recaption and delete keep CM-1's authority and freeze rules; deleting a postcard leaves its day standing
- [x] The contract doc's postcard section records the three births, the filing act and the refusal codes

## Comments

- *2026-09-06, built:* the trip-day post refuses a day outside the trip with **`DAY_NOT_FOUND`**, a new code, rather than reusing `ACTIVITY_NOT_FOUND` — the subject genuinely differs. Recorded in the contract doc's CM-2 vocabulary list.
