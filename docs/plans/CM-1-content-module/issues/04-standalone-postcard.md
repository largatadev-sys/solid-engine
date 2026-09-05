# 04: Postcard — the atom, standalone

**What to build:** a traveler posts a postcard from nothing but a moment — photos, caption, optional place — into one of their diaries or loose, then reads, recaptions, and deletes it by the postcard's own address. Authorship is the only authority.

**Blocked by:** 03 (Standalone diary).

**Status:** done

- [x] A traveler creates a standalone postcard — photos through the media seam, caption, optional place — into one of their own diaries, or loose (no diary)
- [x] Creating into someone else's diary answers as if that diary did not exist
- [x] The author reads, recaptions, and deletes the postcard by its own address; delete destroys its photo rows and their stored objects
- [x] A non-author's recaption or delete answers the masked not-found; a repeat delete answers not-found
- [x] A postcard references at most one diary, or none — proven at the storage seam
- [x] Standalone postcards are unlimited (no per-activity rule applies to them)
- [x] The new table's migration is proven by a stepping IT; existing suites pass untouched

## Comments

- *2026-08-30:* the media seam needed one additive constant — `PhotoSubject.POSTCARD` — in `media/PhotoSubject.java`, a pre-existing keeper-module file. Unreachable through every existing flow; recorded in ADR-035 and the contract doc as CM-1's one keeper-module change.
