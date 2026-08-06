# 03 — Itinerary cover: header lease, fences, the audience ladder, the published slot

**What to build:** the cover becomes real — uploadable from the create flow and the edit screen, guarded by the plan's existing write regime, and rendered everywhere the itinerary shows its face, including the published header the S4.1 spec claimed and the code never built (spec decisions 7, 11, 13).

**Blocked by:** 02 — avatar end-to-end (the pipeline and the media endpoint it extends).

**Status:** done *(the preview-container walk belongs to ticket 05)*

- [x] `POST /v1/itineraries/{id}/cover` uploads + attaches under the **header lease** (409 without it); `DELETE` clears. `coverImageUrl` gains its first writer — an activation, not a shape change (ADR-008 held by design); the no-writer pinning test retires deliberately, replaced by write-path coverage.
- [x] Media writes are plan writes: refused while published (the freeze) and while archived (the fence), each named in the standard envelope.
- [x] The itinerary-media audience ladder lands on `GET /v1/media`: private → member 200, non-member 404 (masked, the guard's discipline); published+public → any traveler 200; archived → owner 200, member 404; no token 401 — the guard-IT table, all flavors, not one.
- [x] Every media URL this story writes matches the backend-URL form — **no provider hostname anywhere in the database**, pinned by an IT.
- [x] The create flow and edit screen swap the greyed drop-zone for a real uploader, labeled "Upload photo(s)" — the recorded mock deviation (video went to the backlog); the greyed cover surface retires.
- [x] The cover renders on the workspace header, the preview, and the published header — closing the S4.1 cover-slot doc-vs-code discrepancy on the record; the placeholder treatment when null is unchanged.
- [x] Suites green, `tsc` clean; the walk covered in the rebuilt preview container. *(Container walk → ticket 05.)*

## Comments

**1 · The create flow could not upload, and the fix is a held pick rather than a greyed tile.** A cover needs an itinerary id to hang on, and on the create screen no itinerary exists yet. Rather than leave the drop-zone greyed on the one screen the mock draws it largest, the pick is **held in state, previewed live from its local `file:`/`blob:` uri, and uploaded the moment creation succeeds**. `mediaSourceFor` already passes non-`/v1/media/` uris through untouched, so the same `CoverPicker` renders the local preview and the stored photo with no branch. If that follow-up upload fails the traveler **keeps the trip** — losing a cover must not cost a created itinerary.

**2 · `CoverAudience` is sabotage-verified, and it is the one place a privacy leak could hide.** Nine ITs cover the ladder (member/stranger/visitor/published/unpublished/archived-owner/archived-member). Replacing the published-and-public test with an unconditional `true` failed exactly two — the private-trip stranger and the unpublish transition — which is the leak those tests exist to catch.

**3 · Two shipped tests were deliberately rewritten, because they asserted the cover was greyed.** `tabRouting`'s *"greys the cover drop-zone"* and `comingSoon`'s registry inventory were both correct until this ticket. `coverPhoto` is now **removed from `COMING_SOON_SURFACES` entirely** — a stale entry would be a lie, and `tsc` caught the one test still naming it. `activityPhoto` stays until ticket 04.

**4 · The published byline now renders real photos.** Ticket 02 deferred this to ticket 05, but the cover slot put me in the same component, so `CreatorAvatar` shipped here — photo when there is one, initials otherwise. `AvatarStack` remains for ticket 05.

**5 · Verification.** `CoverContractIT` **9/9** first run, sabotage-verified; backend **136 unit**, mobile **1713 / 53 suites**, `tsc` clean. Against the running stack `smoke-media.js` is now **23/23**, covering the whole ladder live: lease-less upload 409, private hidden from a stranger, publish opens it, the freeze refuses a change, unpublish closes it again, and the projection carries the cover.
