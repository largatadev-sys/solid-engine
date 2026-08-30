# 06: Trip-derived postcards

**What to build:** the trip flow's postcard life in the new world: a member posts from a plan activity, the activity is snapshotted through the trip module's interface, their trip diary auto-mints on first post — and the author's withdrawal right holds everywhere, archived trips and departed members included.

**Blocked by:** 01 (The trip's new face), 04 (Standalone postcard).

**Status:** done

- [x] A member posts a postcard from a trip activity via the new grammar: the activity's facts are read through the trip module's interface at post time and snapshotted onto the postcard
- [x] The member's trip diary auto-mints on their first post for that trip and is reused for later ones; deleting it and posting again re-mints it
- [x] A second postcard from the same activity by the same member is refused by name; a different member postcards the same activity freely
- [x] Deleting the plan activity leaves the postcard intact with a dangling provenance pointer, and reads tolerate the dangling id
- [x] On an archived trip, the author's postcard delete succeeds — withdrawal crosses the archive freeze — while recaption is refused by the freeze
- [x] A member who has left the trip still deletes their own postcard by its address
- [x] Existing suites pass untouched

## Comments
