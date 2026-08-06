# 04 — Activity photos + the derived gallery

**What to build:** members photograph the plan — up to five photos per activity under the activity lease — and the published Overview's gallery composes itself from what the plan already holds: the cover plus the activities' photos, in plan order. No new noun, no album (the Gallery is a projection — glossary; Diary is the album concept) (spec decisions 2, 10, 11).

**Blocked by:** 03 — the itinerary cover (the audience ladder and the lease/fence refusal tables it establishes).

**Status:** ready-for-agent

- [ ] `POST /v1/activities/{id}/photos` and `DELETE .../photos/{photoId}` run under the **activity lease** — add *and* delete both (the cap makes adds non-commuting, so the unguarded-adds rule does not extend here); any lease-holding member manages photos (plan content is collectively owned; the uploader is attribution, never authority).
- [ ] The cap of 5 is enforced transactionally; the 6th upload is refused with a named error — **a constant, not a tier branch**: beyond-5 is a pre-decided premium capability that waits for the seam (register #14; zero entitlement code in this diff).
- [ ] Photos join `ActivityResponse` and `PublishedActivityResponse` — id, url, thumbUrl, in upload order; the freeze and fence refusals cover photo writes.
- [ ] The activity form swaps the greyed photo row for a real strip — add up to 5, delete, thumbnails render; the greyed activity-photo surface retires.
- [ ] The gallery composes cover + activity photos in plan order on the preview and the published Overview — the "+N" overflow treatment, the empty state when the plan has no photos; the gallery strip's coming-soon tap dies.
- [ ] Published photos ride the ladder: a public published trip's photos readable by any traveler; unpublish hides them with the page.
- [ ] Suites green, `tsc` clean; add/delete/gallery walked in the rebuilt preview container.

## Comments
