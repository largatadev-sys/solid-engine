# 04 — Activity photos + the derived gallery

**What to build:** members photograph the plan — up to five photos per activity under the activity lease — and the published Overview's gallery composes itself from what the plan already holds: the cover plus the activities' photos, in plan order. No new noun, no album (the Gallery is a projection — glossary; Diary is the album concept) (spec decisions 2, 10, 11).

**Blocked by:** 03 — the itinerary cover (the audience ladder and the lease/fence refusal tables it establishes).

**Status:** done *(the preview-container walk belongs to ticket 05)*

- [x] `POST .../activities/{id}/photos` and `DELETE .../photos/{photoId}` run under the **activity lease** — add *and* delete both (the cap makes adds non-commuting, so the unguarded-adds rule does not extend here); any lease-holding member manages photos (plan content is collectively owned; the uploader is attribution, never authority).
- [x] The cap of 5 is enforced transactionally; the 6th upload is refused with a named error — **a constant, not a tier branch**: beyond-5 is a pre-decided premium capability that waits for the seam (register #14; zero entitlement code in this diff).
- [x] Photos join `ActivityResponse` and `PublishedActivityResponse` — id, url, thumbUrl, in upload order; the freeze and fence refusals cover photo writes.
- [x] The activity form swaps the greyed photo row for a real strip — add up to 5, delete, thumbnails render; the greyed activity-photo surface retires.
- [x] The gallery composes cover + activity photos in plan order on the preview and the published Overview — the "+N" overflow treatment, the empty state when the plan has no photos; the gallery strip's coming-soon tap dies.
- [x] Published photos ride the ladder: a public published trip's photos readable by any traveler; unpublish hides them with the page.
- [x] Suites green, `tsc` clean; add/delete/gallery walked in the rebuilt preview container. *(Container walk → ticket 05.)*

## Comments

**1 · The route is nested under the itinerary, not flat.** The ticket proposed `/v1/activities/{id}/photos`; as built it is `/v1/itineraries/{itineraryId}/days/{dayId}/activities/{activityId}/photos`, matching every other activity endpoint. The reason is the guard: its permanent signature is `requireMember(traveler, itineraryId)` (ADR-011), so a flat route would have to resolve the itinerary from the activity *before* it could authorize — inverting the chokepoint. The nested route hands the guard its key directly.

**2 · The audience ladder is now one policy object, shared.** Ticket 03 put the ladder inside `CoverAudience`; activity photos need the identical rule, and two copies of a privacy decision is how they drift. Extracted to **`TripMediaAudience`** — `CoverAudience` and `ActivityPhotoAudience` are now thin adapters that resolve their subject to an itinerary and ask it. `ActivityPhotoAudience` walks activity → day → itinerary.

**3 · `PublishedProjectionIT`'s allowlist caught the new field, exactly as designed.** Adding `photos` to `PublishedActivityResponse` failed `theProjectionCarriesExactlyTheseFieldsAndNothingElseEverLeaks` on the first run — the INV-2 absence-rule guard doing its job. The field was then added to the allowlist deliberately, which is the only way a new projection field is supposed to arrive.

**4 · The plan read is batched, not N+1.** `DayService.plan` was the one place a per-activity photo lookup would have multiplied by every activity in a trip. It fetches every activity id first and asks `PhotoService.allOfEach` once.

**5 · The gallery is a pure function, tested as one.** `galleryOf` composes cover + activity photos in plan order and is unit-tested for the empty case, the cover-leads case, cross-day ordering, and the absent-cover case; `galleryOverflow` covers the "+27" tile. Nothing about it is an entity — Q2's ruling holds mechanically.

**6 · A new activity cannot hold photos, and says so.** Like the cover on the create screen, photos need a saved subject. The form shows a real strip when editing and an honest one-line hint when the activity is unsaved — no greyed tile, no dead click.

**7 · `activityPhoto` leaves `COMING_SOON_SURFACES`, which empties the media half of that registry.** Both greyed media surfaces are now gone; the remaining entries are all genuinely unbuilt (chat, home, search, fork, diary, comments, reviews, …).

**8 · Verification.** `ActivityPhotoContractIT` **8/8** first run (cap, lease, cross-activity photo-id rejection, ladder, projection crossing); `PublishedProjectionIT` **19/19** after the deliberate allowlist change; backend **136 unit**; mobile **1732 / 54 suites**, `tsc` clean. Against the running stack `smoke-media.js` is now **30/30** end to end.
