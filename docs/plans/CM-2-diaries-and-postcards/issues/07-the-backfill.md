# 07: The backfill — every old entry becomes a postcard with its id kept

**What to build:** a traveler who posted before this story sees every postcard exactly where it was, with the same photos and the same links. One migration moves the old entries into the new tables: ids preserved, one derived diary per author per trip minted with the trip's fields, a day per trip day resolved from the activity or from the entry's own day label, photo rows re-pointed. It ships with the adapters, never before them.

**Blocked by:** 06 (The old entry endpoints become adapters).

**Status:** ready-for-agent

- [ ] The migration creates a postcard per old entry with the **same id**, the same author, caption, place, snapshot fields and timestamps, and the same trip and activity references (dangling ones included)
- [ ] It mints one diary per author per trip that has entries, with the trip's title, destination and dates, and no cover
- [ ] It mints one diary day per distinct trip day among an author's entries — from the activity's day where the activity exists, from the entry's "Day N" label where it does not — with the ordinal, title and date snapshotted
- [ ] It re-points every entry photo's subject to the postcard, so the media seam keeps serving the same ids
- [ ] The **stepping IT** owns its container, targets the migration before this one, seeds legacy trips, days, activities, entries and photos through raw SQL for provisioned travelers (the S4.39 orphan lesson), migrates, and asserts every row above; it is sabotage-checked with the resource recompile the S4.13 lesson demands, and the sabotage is proven to have landed before the run is believed
- [ ] After the migration the profile sections, Home and the adapters all show the migrated postcards; proven end to end in one IT that seeds the legacy shape, migrates, and reads through the new doors
- [ ] The deploy note in the ticket's comments records that 06 and 07 promote together

## Comments
