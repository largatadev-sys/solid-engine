# 02: Diary Days — add, place, delete, and the ordinal that comes from the date

**What to build:** a day in a diary exists once it holds something. The author adds a day with a date and a place, edits its place, and deletes it with everything on it; the server numbers days from their dates so a skipped day leaves a gap instead of renumbering its neighbours, and a day outside the range widens the range. A derived diary gets its days minted per trip day the first time its author posts there.

**Blocked by:** 01 (The Diary re-cut).

**Status:** ready-for-agent

- [ ] Adding a day to a standalone diary takes a date and an optional place and answers `201` with the day; its ordinal is the date's distance from the diary's start plus one, so a diary with Mar 15, 16 and 19 filled reads Day 1, Day 2, Day 5
- [ ] A second day on the same date is refused by name; a date before the start or after the end is accepted and the diary's range extends to include it
- [ ] Editing a day's place answers `200`; a day's date and ordinal are immutable after birth
- [ ] Deleting a day destroys its postcards, photo rows and stored objects; the remaining days keep their ordinals; a non-author's write answers the masked not-found
- [ ] The diary read returns a postcard count per day, which is what the delete confirm shows
- [ ] A day with no place and no postcard is never stored — the candidate list is the only place it exists
- [ ] The first postcard an author posts on a given trip day mints that diary day with the trip day's ordinal, title and derived date snapshotted; a second postcard on the same trip day reuses it
- [ ] The contract doc's day section records the acts, the ordinal rule, the range rule and the refusal codes

## Comments
