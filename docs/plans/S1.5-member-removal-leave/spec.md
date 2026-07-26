# S1.5 — Member removal + leave · spec

**Status:** intent locked 2026-07-27 — grilling session, founder-confirmed. Immutable point-in-time intent (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** INV-4 (02 — exactly one owner, always) · Artifact 03 (owner-only operations name "remove member"; owner departure is transfer-first; guard masking) · ADR-014/S1.4 (the edit lease this story must not leave in a ghost's hands) · S1.2 (invitation statuses are terminal; the members surface this story extends) · ADR-008 (fully additive this time — no waiver needed) · S1.6 (owns the owner's exit; this story deliberately refuses it) · register #4 (enriched by this story's one destruction).

## Goal

The owner can remove any member; a member can leave. Departure destroys the membership row, releases any edit lease the departing traveler holds, and closes the walls — the ex-member's next request is 404-masked, their My Trips refetch drops the trip. Re-entry is an ordinary re-invite. The owner can neither leave nor be removed until S1.6's transfer exists.

## Locked decisions *(grilling 2026-07-27, in decision order)*

### 1 · Authority matrix

| Actor → target | Outcome |
|---|---|
| Owner removes a member | allowed |
| Member removes themselves (= leave) | allowed |
| Member removes another member | forbidden — owner-only authority (Artifact 03) |
| Owner leaves / owner removed | impossible in S1.5 — INV-4; the transfer-then-leave path is S1.6's whole job |

**One domain operation, two doors.** Removal and leave are the same act distinguished only by who initiated it; that fact survives as two analytics events (`member_removed` / `member_left`), never as two code paths. The owner sees no Leave control at all (the members screen's don't-advertise-dead-ends pattern); the API enforces regardless.

### 2 · The membership row is hard-deleted

Per canon (Artifact 03: "the departing membership row is removed"; the entity javadoc: "S1.5 deletes them"). Mechanically forced, too: the row's identity is the composite key `(workspace_id, traveler_id)` — a soft-delete tombstone would collide with its own traveler on re-join, and every consumer (the guard's `findRole` hot path, the INV-4 partial index, `findMembers`) would need a filter it can never forget — the default-by-omission pattern Artifact 03 rejected for authorization.

**The foreclosure is recorded, not silent:** register #4's entry in 02 now notes that "was a member" has no durable record after departure — if review eligibility needs membership-at-completion, S4.5 must capture that fact itself. **Rejected:** a `membership_event` history log — a new entity with zero readers (the S1.2 state-column discipline).

### 3 · Departure releases the departing traveler's edit lease, transactionally

New system-level `EditLeaseService.releaseHeldBy(itineraryId, travelerId)` — the existing `release()` takes the holder's own `Membership` capability, which the owner doesn't hold when removing someone else. Called in the same transaction as the membership delete.

**Why:** safety needs nothing (the guard 404-masks the ex-member instantly) — this is about the *others*: without it the plan stays ghost-locked up to one TTL, with "«removed person» is editing" as the message. The release keeps a latent invariant true — **a lease holder is always a member** — so no code ever reasons about a non-member holding the lock. **Not a force-take:** ADR-014's rule governs member-vs-member contention and survives intact. This is the story's only cross-module write (ADR-002-clean: one method behind a service interface).

### 4 · API — one additive endpoint

`DELETE /v1/itineraries/{itineraryId}/members/{travelerId}` (itinerary-addressed like the rest of the S1.2 surface; workspace ids stay off the wire).

| Caller | Target | Result |
|---|---|---|
| owner | a member | **204** — removal |
| member | themselves | **204** — leave |
| member | anyone else | **403** — only the owner removes others |
| owner | themselves | **409** `OWNER_CANNOT_LEAVE` — transfer first (S1.6) |
| owner | not-a-member target | **204** — idempotent (Artifact 05: deleting the deleted is 204; no leak — the caller can read the roster) |
| non-member caller | anything | **404** — guard masks, as everywhere |

**Authority before idempotency:** a non-owner member targeting anyone else gets 403 even if that someone is already gone — authority errors never depend on the target's state. **Rejected:** a second `POST …/leave` route — the client already knows its own traveler id, and additive-only means a second route is carried forever for nothing.

### 5 · Mobile stop-line

Members screen: owner gets Remove on every non-self row; a non-owner member gets Leave trip (danger-styled); both through the platform-forked `confirmDestructive` (the S1.3 Alert-no-op discipline). Leave navigates to My Trips and drops the trip's queries from the cache.

**The removed member finds out by pull, deliberately.** No toast, no notification surface (post-gate by founder ruling; E2 voting set the pull precedent). My Trips refetch drops the trip; open itinerary screens 404 into the existing `ITINERARY_NOT_FOUND` missing state on their next fetch — this story verifies the wording reads sensibly for eviction (covering deletion and removal without distinguishing them) but builds no new eviction UX. The stale read-cache window between removal and next refetch is accepted: INV-1 gates the server, every write already fails, and minutes-stale reads of a plan the person could have screenshotted is not a wall breach.

### 6 · Re-entry — the zero-code default

Anyone removed or left can be immediately re-invited by the owner through the ordinary flow: invitation statuses are terminal, re-inviting is a new row, and `ALREADY_A_MEMBER` clears the moment the row is deleted. A re-join is a genuinely new membership with a new `joined_at`. **Rejected, on the record:** cooldown/ban list (moderation is a post-gate backlog line; an invite-only alpha has no abuse surface justifying it) · any invitation-table write at departure (the historical `accepted` row records something that truly happened). **Noted:** remove → re-invite → accept yields a `joined_at` postdating trip activity the person took part in; nothing reads `joined_at` semantically today, and the register #4 note covers the hole if anything ever gates on "member since."

## Backend scope

No migration — departure destroys rows, it doesn't shape new ones. The workspace module gains the departure operation (caller's resolved `Membership` + target traveler id; role logic on the capability object, never inline — Artifact 03) · `EditLeaseService.releaseHeldBy` · the DELETE handler on the trip-membership surface · `OWNER_CANNOT_LEAVE` conflict envelope · analytics `member_removed` / `member_left` (initiator-distinguished, after-commit — these only mean something if the delete commits).

## Mobile scope

Members screen Remove/Leave through the repository/typed-`apiClient` layer (ADR-001 — no raw fetch) · `confirmDestructive` on both doors · leave → My Trips + cache drop · missing-state wording checked for eviction-fit · web parity via the shared codebase, verified in the preview container.

## Acceptance criteria

| # | Criterion | Closed by |
|---|---|---|
| 1 | Owner removes a member: 204, row gone, roster no longer lists them | IT |
| 2 | Member leaves: 204, same destruction | IT |
| 3 | Non-owner member targeting anyone else: 403 — **even if the target is already gone** (authority before idempotency) | IT |
| 4 | Owner self-target: 409 `OWNER_CANNOT_LEAVE`; the owner row survives every path in this suite — INV-4 | IT |
| 5 | Idempotency: repeating a DELETE, or targeting a never-member, is 204 | IT |
| 6 | Non-member caller is 404-masked on the endpoint; unauthenticated is 401 | IT |
| 7 | **Eviction discriminates:** the same probe (target's GET on the itinerary) returns 200 before removal and 404 after, in one test | IT |
| 8 | **Lease freed:** target holds a live lease → removal → another member's acquire succeeds immediately, clock untouched | IT |
| 9 | Re-invite round-trip: remove → invite (no `ALREADY_A_MEMBER`) → accept → member again, fresh `joined_at` | IT |
| 10 | `member_removed` vs `member_left` emitted by initiator, after commit | IT |
| 11 | Two accounts on the emulator: owner removes B → B's My Trips drops the trip; deep-link `largata://itineraries/<id>` as B lands in the missing state (the S0.3 direct-address probe, reused as the eviction check) | Device AC (dev build) |
| 12 | Web preview container: leave flow end-to-end, confirm dialog proven via CDP interception (never "it renders") | `drive-preview.js` |
| 13 | Post-merge on deployed `dev`: the founder-visible loop once — remove on one account, eviction observed on the other | Deployed-dev probe |

**Deliberate omissions, on the record:** no removed-notification of any kind (pull-based) · no live eviction of an open screen · no member-initiated remove UI · no cooldown/ban · no membership history · the owner's exit in its entirety (S1.6).

## Out of scope

Ownership transfer + owner-deletion claim (S1.6) · itinerary delete (S1.9) · moderation tooling (backlog) · notification infrastructure (post-gate) · membership history / event log (rejected above) · any invitation-semantics change · cache-eviction-on-404 beyond what the query layer does naturally.

## Comments

*(empty — accretes during implementation)*
