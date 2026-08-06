# 03 — Itinerary cover: header lease, fences, the audience ladder, the published slot

**What to build:** the cover becomes real — uploadable from the create flow and the edit screen, guarded by the plan's existing write regime, and rendered everywhere the itinerary shows its face, including the published header the S4.1 spec claimed and the code never built (spec decisions 7, 11, 13).

**Blocked by:** 02 — avatar end-to-end (the pipeline and the media endpoint it extends).

**Status:** ready-for-agent

- [ ] `POST /v1/itineraries/{id}/cover` uploads + attaches under the **header lease** (409 without it); `DELETE` clears. `coverImageUrl` gains its first writer — an activation, not a shape change (ADR-008 held by design); the no-writer pinning test retires deliberately, replaced by write-path coverage.
- [ ] Media writes are plan writes: refused while published (the freeze) and while archived (the fence), each named in the standard envelope.
- [ ] The itinerary-media audience ladder lands on `GET /v1/media`: private → member 200, non-member 404 (masked, the guard's discipline); published+public → any traveler 200; archived → owner 200, member 404; no token 401 — the guard-IT table, all flavors, not one.
- [ ] Every media URL this story writes matches the backend-URL form — **no provider hostname anywhere in the database**, pinned by an IT.
- [ ] The create flow and edit screen swap the greyed drop-zone for a real uploader, labeled "Upload photo(s)" — the recorded mock deviation (video went to the backlog); the greyed cover surface retires.
- [ ] The cover renders on the workspace header, the preview, and the published header — closing the S4.1 cover-slot doc-vs-code discrepancy on the record; the placeholder treatment when null is unchanged.
- [ ] Suites green, `tsc` clean; the walk covered in the rebuilt preview container.

## Comments
