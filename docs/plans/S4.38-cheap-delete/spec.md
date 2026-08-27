# S4.38 — Cheap delete: the archive-backed Delete verb

**Grilled 2026-08-27, grill-with-docs, four rounds.** This story began the same day as "story C" (permanent itinerary deletion, trigger fired 2026-08-25) and **supersedes that session's instant-delete ruling by founder pivot, on the record**: the demand behind delete was *decluttering the traveler's screens*, not destruction. Nothing destructive ships. The screens say **Delete**; the backend performs **archive** — which S1.9/S4.1 already built to do everything decluttering needs.

**What ships:** zero backend change. The deliverables are (1) the API contract below, which the screen wiring is written against, and (2) the screen wiring itself (ticket 01), whose design baseline is the founder's Claude Design canvas — handoff pending. The mock-is-the-baseline rule binds the wiring ticket when the screens land.

**Why archive already is the cheap delete** (verified against the code this session):

- The default trips list excludes archived **for every member, not just the owner** (`WorkspaceService.itineraryIdsFor(travelerId, archived=false)`).
- The archived list is **owned-trips-only** (`findOwnedItineraryIdsIn`) — a member never sees an archived trip in any list. For members, archive is observationally identical to deletion. INV-1 ratifies this: an archived workspace narrows to the owner alone.
- The feed withholds an archived trip's postcards (`PostcardFeedService` archived filter), discovery excludes it, the published page narrows to owner-only (the S4.1 audience ladder).
- Undo exists: unarchive, owner-only, recomputes state — published stays published (S1.9 decision 8).
- Archive already voids pending invitations and any pending ownership offer, and releases edit leases (S1.9).

So the owner's Archived list is the **de-facto bin** — the exact owner-only-bin-list shape the parked deletion-bin line pre-decided — with unarchive as restore and no purge yet. The future destruction story stops being a rework and becomes "add real deletion + the purge sweep", inheriting the bin line's pre-decisions whole.

## Decisions

1. **No destruction ships. `DELETE /v1/itineraries/{id}` stays unminted** *(founder pivot, 2026-08-27 — supersedes the same-day instant-delete ruling)*. The wire is untouched, so nothing shipped now constrains the future destruction story; ADR-008 never enters the picture. All destruction pre-decisions (cascade gaps, the creator-derivable-forever reconciliation, the 30-day bin's answers) transfer to that story.
2. **Delete is a UI verb, not a domain operation.** On a Trip it performs Archive; on a Diary Entry it is the real per-entry deletion. One glossary line records this (02-domain-model, added this story) so nobody greps for a delete operation that doesn't exist.
3. **Verb inventory** *(Q18)*: Trips screen — Delete on **owned** trips → archive, undo → unarchive; **member** trips get Leave (existing endpoint), never Delete. Profile screen — per-postcard/diary-entry Delete → the existing entry delete; a Delete on the Published tab, if the screens draw one, maps to archive too (it hides the trip everywhere); unpublish stays its own separate act. No per-traveler hide is built.
4. **Undo mechanics are honest to each endpoint** *(Q19)*: archive-backed verbs call the server **immediately** and undo calls unarchive — server-truthful at once, consistent across devices. Irreversible verbs (diary-entry delete; Leave, if a screen gives it a toast) are **client-gated**: the screen hides optimistically and defers the API call until the toast expires; undo means the call is never sent. The contract labels every endpoint reversible or irreversible.
5. **The Archived list becomes a mixed bag, permanently, with no marker** *(Q20)*: intentionally-archived and "deleted" trips are indistinguishable, to the UI and to the future destruction story. Accepted — a marker column is mechanism for a hypothetical reader (the pattern this repo parks); the destruction story lets travelers re-delete from the Archived list instead of migrating intent it cannot know.
6. **Owner-only, matching archive's authority** *(Q14/Q18)*: member → 403 `NOT_PERMITTED`, non-member → masked 404 `ITINERARY_NOT_FOUND`. A member decluttering a trip they're in has exactly one tool: Leave.
7. **Fork provenance untouched**: the glossary already rules it — archiving a source deletes nobody's fork and never decrements its count.
8. **One story, one wiring ticket** *(Q2/Q21)*: the contract lives in this spec (single source); ticket 01 wires the screens and is blocked on the design handoff. Story id S4.38, the "story C" working name retires here.

## API contract — what the screens wire against

Every call goes through the repository layer's typed `apiClient` (ADR-001, P6) — the mobile repositories already carry archive/unarchive and the entry delete; wiring is affordances + query invalidation, not new plumbing.

### Trip Delete (owned trips; Trips screen, and the profile Published tab if drawn)

| | |
|---|---|
| Act | `POST /v1/itineraries/{id}/archive` |
| Undo | `POST /v1/itineraries/{id}/unarchive` |
| Returns | `200` with the full `ItineraryResponse` (both directions) |
| Authority | Owner only. Member: `403 NOT_PERMITTED`. Non-member: `404 ITINERARY_NOT_FOUND` (masked). |
| Repeats | `409 ILLEGAL_STATE_TRANSITION` — "This trip is already archived." / "This trip is not archived." A double-fired undo or a stale screen gets a named refusal, not corruption. |
| Reversible server-side | **Yes** — call archive immediately; toast Undo calls unarchive. If undo itself fails, the trip sits in the Archived list (the slow undo). |
| Effects the screen may rely on | Trip leaves every member's default list; owner's Archived list gains it; feed postcards of the trip withheld; published page owner-only; discovery excludes it; edit leases released; pending invitations and any pending ownership offer voided; chat read-only; write fence on. Unarchive restores state by recomputation — published stays published. |
| Works from any state | Draft-less lifecycle (upcoming/ongoing/completed), published or not — archive-from-any-state is ratified canon (S1.9 amendment). |

### Diary-entry Delete (profile screen postcards; also the diary stream)

| | |
|---|---|
| Act | `DELETE /v1/itineraries/{itineraryId}/diary/entries/{entryId}` → `204` |
| Authority | Author only, masked: non-author gets `404 DIARY_ENTRY_NOT_FOUND`; non-member gets `404 ITINERARY_NOT_FOUND`. |
| Reversible server-side | **No.** There is no un-delete; the entry's photos and their stored blobs go with it. **The toast must gate the call**: hide optimistically, send on toast expiry, undo = never send. |

### Leave (member trips; Trips screen)

| | |
|---|---|
| Act | `DELETE /v1/itineraries/{itineraryId}/members/{travelerId}` (own travelerId) → `204` |
| Authority | Self-leave for a non-owner; the owner exits only via ownership transfer (S1.6). |
| Reversible server-side | **No** — rejoining needs a fresh invitation or join request. If the screens give Leave an undo toast, it is client-gated like entry delete; the existing confirm-dialog pattern also remains acceptable. |

### The rest of the delete family (already wired in-workspace; listed for completeness)

| Object | Endpoint | Authority | Server-reversible |
|---|---|---|---|
| Day | `DELETE …/days/{dayId}` | member (in session) | no |
| Activity | `DELETE …/days/{dayId}/activities/{activityId}` | member (in session) | no |
| Activity photo | `DELETE …/activities/{activityId}/photos/{photoId}` | lease holder | no |
| Photo-dump photo | `DELETE …/photo-dump/{photoId}` | uploader or owner | no |
| Entry photo | `DELETE …/diary/entries/{entryId}/photos/{photoId}` | author (not the last photo) | no |
| Poll | `DELETE …/polls/{pollId}` | creator or owner | no |
| Cover | `DELETE …/cover` | member | no |
| Chat message | — none; append-only by ruling (S4.10), stays closed | | |

## Freshness note *(standing rule)*

Every surface this story touches takes the **focus-fresh pull** lane (S4.34's helper): the trips list, the Archived list, the profile tabs, and the Home feed all reconcile at next focus. The acting owner's own screen updates from the mutation response itself. **No topic event is added** — archive/unarchive emit analytics only today, and this story keeps that posture. The deviation from "workspace surfaces go live" is argued thus: the act is the owner's own, the other members' next guard-checked touch already refuses, archive has been pull-based since S1.9 without a complaint, and S4.35's reconnect-marks-stale covers live subscribers. Nothing is deliberately static.

## Candidate-capability note *(standing rule)*

None. Delete/archive/unarchive/leave are governance acts on existing data — owner authority and self-departure — failing the potentially-gated test on its governance clause. Nothing joins register #14.

## Deliberate omissions, on the record

No `DELETE /v1/itineraries/{id}` · no destruction of any rows or blobs · no 30-day bin or purge sweep (the parked line, now folded into the future destruction story) · no marker distinguishing "deleted" archives from intentional ones · no per-traveler hide for member trips · no WS event · no change to unpublish, publish, or visibility semantics · chat message deletion stays parked (S4.10 line) · the Trip-vs-Itinerary wire-vocabulary housekeeping stays parked (its own backlog line, minted at the morning grilling).

## Comments

- *2026-08-27, at the spec's writing:* the morning grilling's two epic-map lines (deletion bin; vocabulary housekeeping) were authored in a separate context window and adopted onto this story's branch by founder instruction; the bin line carries the superseding note pointing here.
- *2026-08-27, later the same day:* the design handoff arrived (archived at `design/`) and the founder asked for the behavior and motions to be implemented (/to-spec). The UI half's full spec is **`ui-spec.md`**, which extends this document. Scope grew in one backend respect: the handoff's own API blocker — the trips listing cannot tell Delete from Leave — becomes two additive fields on the itinerary summary (`viewerRole`, `memberCount`). The handoff also surfaces **Unpublish/Republish** on the profile itinerary kebab (existing endpoints, newly surfaced). The handoff's prose was written against the pre-pivot instant-delete model; ui-spec's Reconciliations R1–R4 correct its semantics (trip Delete stays archive-backed; the modal's copy is revised to stop claiming destruction — the story's one named deviation from the mock, held for founder review at the gate). Everything ratified in this document stands.
