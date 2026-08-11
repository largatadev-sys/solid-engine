# 01 — The postcard on the wire

**What to build:** A traveler mints and reads diary entries entirely over the API. One new table (the story's only migration): entries keyed by traveler + itinerary, provenance to the activity that clears structurally on activity deletion, snapshot columns (title, day label, time of day), caption, timestamps; uniqueness of (traveler, activity) as a partial index where provenance survives. Create is one transactional multipart act — entry JSON (activity, caption, selected dump-photo ids) plus 0–5 device photos — that snapshots the activity, copies dump photos into a new diary-entry photo kind, ingests device photos (INV-11), and refuses wholesale outside 1–5 total. Create is lifecycle-gated (`ongoing`/`completed`, named refusal). The mine-list endpoint returns only the caller's entries for a trip. The diary-entry media audience serves the author alone — co-travelers 404 at the media endpoint. Not plan writes: no lease, no plan-version bump, no history; archive fence refuses writes, entries stay author-readable (spec decisions 1–3, 5–6, mechanics).

**Blocked by:** S3.4 ticket 01 — The pool on the wire *(cross-story: the from-dump copy path needs dump photos to exist; every device-photo path is buildable before it)*.

**Status:** needs-triage

- [ ] Create with device photos + a dump photo round-trips; the dump photo is copied (new row, new bytes) and survives its deletion from the dump (spec AC 7).
- [ ] Lifecycle gate: `draft`/`upcoming` create refuses with the named code; `ongoing` and `completed` both accept (spec AC 2, 3).
- [ ] Second create for the same activity refuses; the index would catch the race (spec AC 4).
- [ ] Snapshot: rename → move → delete the activity via the plan endpoints; the entry reads unchanged throughout, provenance nulled at the delete (spec AC 5).
- [ ] Author-only, the discriminating checks: mine-list returns only the caller's; a co-member's media GET for a diary photo 404s while the author's succeeds (spec AC 6).
- [ ] Caps and floor at create: zero photos refuses, six refuses (spec AC 8); non-member masking on every endpoint; archived trip refuses create while existing entries stay readable (fence IT).
