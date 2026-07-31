# 01 — Subject-typed leases + history capture (backend)

**Status:** implemented — closed on the local rig at ticket 06

**What to build:** the ADR-014 amendment, server-side. The whole-itinerary Edit Lease becomes subject-typed — `header | day | activity` — with the original per-row semantics (holder + expiry, ~3-min TTL, renewal, release, expiry self-heals, no force-take), and every plan-write endpoint re-pointed to demand the right lease: header for itinerary fields, day for the day's title and deletion, activity for that activity's edits and deletion. Adds stay unguarded. Day add/delete becomes owner-only (interim — spec decision 3). Reorder becomes version-checked. In the same pass, every plan write appends an `activity_history` row — actor, act, subject, at — because this ticket has all the write paths open and capture cannot be backfilled. Leases are ephemeral minutes-scale state: the migration may drop and recreate the lease table rather than convert it.

**Blocked by:** —

- [x] Two members hold leases on different activities of one day and both writes land (spec AC 1)
- [x] A write without the matching subject lease is rejected; acquire against a held subject fails typed (spec AC 2)
- [x] Activity delete requires that activity's lease (spec AC 3)
- [x] Day delete requires the day lease and 409s, naming the holder, while any contained activity is leased by another member (spec AC 4)
- [x] Member day add/delete → 403; owner succeeds (spec AC 5; the ADR-008 waiver note from the spec applies)
- [x] Itinerary-field writes demand the header lease; a concurrent field edit is rejected (spec AC 6)
- [x] Stale reorder (set or order) → 409; fresh reorder persists (spec AC 7)
- [x] Plan read payloads additively carry lease holder per subject (id + handle) and the last-editor handle on activities (spec ACs 8, 14 — server half)
- [x] Every plan write appends exactly one history row; nothing reads it (spec AC 9); rows carry actor/act/subject/at
- [x] Expiry semantics survive the re-scope: an expired row counts as no lock, renewal pushes expiry, a departing member's leases release transactionally (the S1.5 rule, now per subject)
- [x] The existing lease ITs are replaced deliberately, not deleted silently — the S1.4 AC-replacement precedent: new tests pin the finer surface

## Comments
