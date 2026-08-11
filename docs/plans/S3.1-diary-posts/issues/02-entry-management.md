# 02 — Entry management

**What to build:** A postcard stays the author's to shape: caption edits (always — the founder's Q1 ruling), photo add from device or from the dump (cap 5, same copy semantics), photo remove (floor 1 — a postcard never goes photo-less), and entry delete, which removes the entry, its photo rows and both stored variants per photo (the S3.3 deletion discipline), reverting the activity to addable. All author-only through the guard; archive fence refuses the writes.

**Blocked by:** 01 — The postcard on the wire.

**Status:** done

- [x] Caption-only edit works; photo add honors the cap (6th refuses) and the copy rule for dump photos; photo remove honors the floor (removing the last refuses) (spec AC 8).
- [x] Entry delete removes rows and bytes and frees the (traveler, activity) pair — a fresh create for that activity succeeds after (spec AC 10).
- [x] Only the author can touch an entry: another member's edit/delete masks to not-found (IT).
- [x] Archived trip refuses all four writes; the author still reads (fence family).
