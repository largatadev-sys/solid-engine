# 01 — The share on the wire

**What to build:** The publicness primitive, provable entirely over the API. The story's one migration: a shared-at instant on the diary entry, null meaning private — born private, flipped only by its author. Share and unshare are author-only acts on the existing entry resource, archive-fenced like every diary write, reading nothing about a photo's origin (spec decision 2 — dump-implies-consent, the founder's reversal on the record). Unshare hides on next fetch, never tombstones (spec decision 1). The diary-entry media audience widens conditionally: a shared entry's photos serve any authenticated traveler; an unshared entry's stay author-only, co-travelers included (spec decision 4, the S3.1 audience widened). Register-#2 analytics events emit for share and unshare.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Share flips the discriminating media pair: before the share a non-member's photo GET masks to not-found; after it, the same GET succeeds while a different, unshared entry's photo still 404s (spec decision 4).
- [ ] The implied-consent pin: sharing an entry that contains a co-traveler's dump photo **succeeds**, so any future tightening announces itself by breaking this test (spec AC 3).
- [ ] Only the author shares or unshares: a co-member's and a non-member's attempts mask; the archive fence refuses both acts while existing entries stay author-readable.
- [ ] Unshare restores the mask: the stranger's photo GET returns to not-found and no public read path serves the entry (spec AC 4).
- [ ] Deleting a shared entry removes its rows and bytes exactly as S3.1's delete does — nothing about sharing survives it (spec AC 13's wire half).
- [ ] Register-#2 events emit for share and unshare (spec AC 15).
