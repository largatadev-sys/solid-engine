# 06: The old entry endpoints become adapters over the new tables

**What to build:** nothing changes for the shipped app. The trip-rooted entry paths, the per-trip diary lists on the profile and on `me`, and the postcard feed keep their shapes and answer from the new tables; a postcard posted through the old door lands in the new world as an activity-derived postcard in the author's derived diary. Deleting these paths stays parked.

**Blocked by:** 05 (The readers cut over).

**Status:** ready-for-agent

- [ ] Posting an entry through the old trip-rooted path creates a postcard on the author's derived diary and day, and answers the old entry shape unchanged
- [ ] Reading, recaptioning, deleting an entry, and the photo add / remove / from-dump acts through the old paths answer their old shapes from the new rows
- [ ] The old per-trip diary lists on the profile and on `me` answer their old shapes from the new tables, including the departed-trip rule S4.23 set
- [ ] The old postcard feed path answers its old shape from the new table
- [ ] **The proof is the old world's own suites**: every pre-existing entry, feed and profile IT passes without an edited assertion, and the Playwright API diary walk passes unchanged
- [ ] The old entry table receives no writes after this ticket; a structural test pins that no code path inserts into it
- [ ] The epic map carries the parked deletion line with its trigger (the client's last old-path call gone) and the contract doc marks each old path as an adapter

## Comments
