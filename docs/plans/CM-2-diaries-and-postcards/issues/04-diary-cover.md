# 04: The diary cover — upload, serve, and the first-photo default

**What to build:** a diary has a face. The author uploads a cover photo, replaces it, and removes it; a diary with no cover shows its first postcard's photo; the cover serves through the media seam under the author's Profile Visibility.

**Blocked by:** 01 (The Diary re-cut).

**Status:** done

- [x] Uploading a cover (multipart, one photo, ingest-framed like the trip cover) answers `200` with the diary carrying its cover; uploading again replaces it and the old stored object is gone
- [x] Removing the cover answers `204` and the diary read falls back to its first postcard's photo; a diary with neither reports no cover
- [x] The cover serves through the standard media route under a new photo subject owned by the diary module, and a stranger to a private author gets the media seam's masked not-found while a follower gets the bytes
- [x] A non-author's upload answers the masked not-found
- [x] A derived diary takes no copy of and no reference to the trip's cover; it falls back to its first postcard like any other
- [x] The contract doc records the cover act and the fallback rule

## Comments

- *2026-09-06, built:* remove-cover answers **`200` with the diary** rather than the ticket's `204`, so the client re-renders the fallback (the first postcard's photo) from the same response instead of issuing a second read. Every other cover act answers the diary for the same reason.
