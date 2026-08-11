# 01 — The pool on the wire

**What to build:** A member can put a photo into their trip's shared pool, list everyone's, and take their own out — entirely over the API. The polymorphic photo storage takes a new dump subject keyed by the itinerary (no schema migration — the S3.3 table was built discriminated for this); a new per-kind audience serves dump media to trip members only; upload runs the unchanged S3.3 ingest (INV-11, as-uploaded framing, two variants, 10 MB). Upload, cursor-paginated list (upload order), and delete all resolve Membership through the guard first. Deletion is uploader-or-owner with a named refusal for anyone else, and removes row + both variants. Dump writes are workspace acts, not plan writes: no lease, no plan-version bump, no history; the archive fence refuses writes; the publish freeze does not apply (spec decisions 2, 3, 5).

**Blocked by:** None — can start immediately.

**Status:** done

- [x] A member uploads, lists, and deletes their own photo over the API; the owner deletes anyone's; a member deleting another member's photo gets the named refusal (spec AC 3).
- [x] Non-member masking IT on all three endpoints, and the load-bearing audience IT: a non-member's `/v1/media` GET for a dump photo 404s while a member's succeeds (spec AC 2, 5).
- [x] Ingested dump photos carry no embedded metadata and serve in two variants; deletion removes the row and both stored objects (spec AC 4, 5 — the S3.3 IT families extended to the new kind).
- [x] Archived trip refuses upload/delete while the owner still reads; a **published** trip accepts uploads — the freeze-is-the-plan check (spec AC 6).
- [x] The list pages in the standard cursor shape, upload order (spec AC 8).
