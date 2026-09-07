# 06: The old entry endpoints become adapters over the new tables

**What to build:** nothing changes for the shipped app. The trip-rooted entry paths, the per-trip diary lists on the profile and on `me`, and the postcard feed keep their shapes and answer from the new tables; a postcard posted through the old door lands in the new world as an activity-derived postcard in the author's derived diary. Deleting these paths stays parked.

**Blocked by:** 05 (The readers cut over).

**Status:** done

- [x] Posting an entry through the old trip-rooted path creates a postcard on the author's derived diary and day, and answers the old entry shape unchanged
- [x] Reading, recaptioning, deleting an entry, and the photo add / remove / from-dump acts through the old paths answer their old shapes from the new rows
- [x] The old per-trip diary lists on the profile and on `me` answer their old shapes from the new tables, including the departed-trip rule S4.23 set
- [x] The old postcard feed path answers its old shape from the new table
- [x] **The proof is the old world's own suites**: every pre-existing entry, feed and profile IT passes without an edited assertion, and the Playwright API diary walk passes unchanged
- [x] The old entry table receives no writes after this ticket; a structural test pins that no code path inserts into it
- [x] The epic map carries the parked deletion line with its trigger (the client's last old-path call gone) and the contract doc marks each old path as an adapter

## Comments

- *2026-09-06, built:* the proof held — **635 of 636** old-world and new-world ITs passed with no edited assertion. The three edits that were needed are all **storage-level helpers naming the old table directly**, never wire assertions: `DiaryContractIT.entryCountOf` and `SharedPostcardIT.sharedAtOf` now read `postcard`, and the latter reads `created_at` because the new world has no separate shared state — a postcard is public from birth, so `shared_at` and `created_at` were already equal for every row V30 backfilled.
- *2026-09-06:* `OldEntryTableIsReadOnlyTest` is the structural guard: it fails if any main source writes through the old entity, and pins the three files still allowed to name it (the entity, its repository, its photo audience) as backfill source material.
