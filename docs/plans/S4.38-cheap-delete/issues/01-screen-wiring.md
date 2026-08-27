# 01 — Screen wiring: the Delete verbs and their undo toasts

Status: needs-info

**Blocked on the design handoff.** The founder has the screens in Claude Design ("delete buttons frontend — hide in backend, there is also the undo"); this ticket starts when the canvas/frames are handed off and archived into this plan folder. When they land, the mock-is-the-baseline rule binds: copy the frames, icons included, and read the mock's own markup for the answers.

## Scope

Wire the Delete affordances on the Trips screen and the Profile screen against the spec's API contract. No backend change exists in this story; no new repository plumbing should be needed — verify the repository layer already carries archive/unarchive and the diary-entry delete before adding anything (ADR-001: no raw fetch in UI code).

## The wiring map (from the spec's contract — read it first)

- **Owned trip, Delete** → call `archive` immediately; undo toast → `unarchive`. Both return the full `ItineraryResponse`; expect `403 NOT_PERMITTED` (member), masked `404` (non-member), `409 ILLEGAL_STATE_TRANSITION` on repeats — the 409 is a named refusal, safe to surface quietly or ignore on a double-fired undo.
- **Member trip, Leave** → existing `DELETE …/members/{travelerId}` (self). Irreversible: if the screens give it an undo toast, gate the call behind the toast; the existing confirm-dialog pattern is also acceptable.
- **Profile postcard / diary entry, Delete** → `DELETE …/diary/entries/{entryId}`. Irreversible: hide optimistically, defer the call until the toast expires, undo = never send. App death before the flush means nothing happened — the entry is still there, which is the correct failure direction.
- **Query invalidation**: the trips list (both `archived` variants), the profile diary/published listings, and the feed keys after each act; the mutation response itself refreshes the acting screen. Focus-freshness (S4.34) covers everyone else — no new lanes.

## Acceptance

1. Owner deletes an owned trip from the Trips screen: it leaves the default list at once; undo within the toast restores it in place; after the toast, it sits in the Archived list and nowhere else.
2. A member of that trip finds it gone from their lists at next focus, with no residue (no archived-list entry — the archived list is owned-only).
3. Deleting a published trip removes it from Home/Discover/public profile at next focus; undo restores it still-published.
4. Profile postcard delete: card hides at once; undo within the toast restores it with no network call made; after the toast the entry and its photos are gone (and the feed drops the postcard).
5. Repeat/duplicate taps produce no error UI worse than a quiet no-op (the 409 path).
6. Web preview walk (Playwright, container lane) covers 1, 4 and 5; the device walk covers the toast's touch ergonomics — verify at the layer that ships.

## Comments
