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

**2026-07-27 — implementation notes (tickets 01–03).**

1. **The departure operation could not go in the `workspace` module, and a new one was created (spec §Backend scope said "the workspace module gains the departure operation").** `workspace` imports nothing at all — it is the leaf — and `itinerary → workspace` already exists for `formAround`. Reaching from `WorkspaceService` into `EditLeaseService` would therefore have closed the exact package cycle ADR-011's resolver seam was built to prevent. Departure also has no honest existing home: `invitation` orchestrates *admission* because the trigger is an invitation, and departure's trigger is neither an invitation nor an itinerary act. New `com.largata.membership` module, one service, no tables — it reaches `workspace` (the row) and `itinerary` (the lease) by service interface (ADR-002), and it is where **S1.6's ownership transfer** lands. The row write stays in `WorkspaceService.removeMember` and the lease release in `EditLeaseService.releaseHeldBy`, both `MANDATORY`, so neither can commit without the other. The `DELETE` mapping stays on `TripMembershipController` for URL cohesion (one place answers `/members`).

2. **Spec AC 11's "B's My Trips drops the trip" was written on a false premise, and chasing it found a real bug.** `GET /v1/itineraries` is owner-scoped, so a joined trip was **never in a member's My Trips to begin with** — there was nothing to drop. Verified directly, same account and instant: roster `200`, direct `GET` `200`, `My Trips` `items: []`. Pre-existing since S1.2, not an S1.5 regression, and S1.2's own client comment asserts the opposite intent. Recorded as its own epic-map backlog line with a trigger of "next story touching My Trips, or S1.6 at the latest" — deliberately **not** fixed here: it changes a shipped `/v1` list's semantics and needs its own ACs and index thinking. **The eviction half of AC 11 was closed properly** by the S0.3 deep-link probe with a positive control: as the same removed traveler, `largata://itineraries/<a trip they are still in>` renders the plan and `largata://itineraries/<the trip they were removed from>` shows the missing state — two outcomes from one probe seconds apart, so the failure mode is visible. **§5's "My Trips refetch drops the trip" is void for the same reason** (flagged at code review, which caught that this note originally stopped at AC 11): a leaver is always a member — the owner cannot leave — so their My Trips never held the trip either. `onMembershipEnded` still invalidates the list on leave: it costs one cache flag, it is already correct for the day the list becomes membership-scoped, and deleting it would remove the last thing in the code pointing at the gap. Both the function and its test now say so rather than claiming a drop that cannot happen.

3. **The missing-state copy was changed, not merely checked (ticket 02's item 6).** It read *"Trip not found / No such itinerary."* — true when a bad link was the only way to reach it, and false the moment removal exists: it tells a just-removed member their trip never existed, which reads as data loss rather than a membership change. Now *"Trip unavailable / This trip either no longer exists or you don't have access to it."*, extracted to a shared `missingItineraryMessage` (two screens showed it; duplicated copy drifts). Naming **both** possibilities is what keeps Artifact 03's mask intact — the same sentence for both causes — while ceasing to assert the wrong one.

4. **`confirmDestructive` was generalised rather than duplicated.** Its wording was hardcoded to "Delete X? / This cannot be undone." with a `Delete` button, which is wrong for both new doors. Both forks now export `confirmWith(wording, onConfirm)` and `confirmDestructive` delegates to it; the S1.3 call sites are untouched. The `confirmLabel` lives in the shared wording module even though `window.confirm` cannot render it — so the *word* stays identical across platforms where the browser will not show it, and the two dialogs cannot diverge in what they claim. Both forks annotate against a shared `ConfirmWith` type, per the `moduleSuffixes` convention (tsc resolves `.native` only, so nothing else would catch drift).

5. **A test bug worth recording, because it would recur.** The first draft of the "an evicted member cannot write the plan" IT asserted 404 and got 400: Spring runs `@Valid @RequestBody` validation during argument resolution — *before* the controller body, therefore before `guard.requireMember(...)` — so an incomplete body answers 400 regardless of authority. Not a masking leak (that 400 is decided by the caller's own payload, never by server state), but **any guard assertion against a write endpoint must send a body the validator accepts**, or it passes through a path that never consulted authorization.

6. **Code review found two real defects, both fixed before commit** (`/code-review`, two axes in parallel against the spec commit).
   - **INV-4 had no defence below `MembershipService`** (Spec axis). `WorkspaceService.removeMember` was public, took bare ids, and would happily delete a sole owner's row — and V4's partial unique index cannot catch it, because it enforces *at most* one owner, not at least one. The invariant CLAUDE.md rates Full-rigor rested on two `if`s in another module, with S1.6 about to add a second caller. The row write now refuses the `OWNER` role loudly (`IllegalStateException`, `admitMember`'s idiom), pinned by two tests in `MembershipStorageIT` — the refusal *and* a member deleting cleanly through the same call, so the check has a visible failure mode.
   - **P3 breach: one business outcome logged in two layers** (Standards axis) — `WorkspaceService` and `MembershipService` both logged the departure. The richer line (which names the initiator) survives.
   - Also actioned: the members-screen gating moved into a pure `memberControls` function with its own tests, because ticket 02 claimed "Jest pins the gating" while nothing rendered the screen (P8 — a screen cannot be rendered under jest-expo, S0.3, which is exactly why the decision belongs outside it); and a note on `releaseHeldBy` explaining why it must *not* be de-duplicated against `release` (different propagation, and delegating would be a self-invocation that silently drops it — the S0.2 gotcha).

7. **Evidence.** Backend: 24 new/changed ITs green, full suite **205 tests, 0 failures**. Mobile: **492 tests** green, clean `tsc`. Web preview container (true build path, CDP): the leave flow driven with `window.confirm` intercepted, run **twice** — cancel keeps the membership (2 rows, stays on `/members`), confirm destroys it (1 row, lands on My Trips) — because a confirm that ignores "no" is worse than none. Device (dev build, two accounts): owner sees `Remove` on the member's row and **none on their own**, no Leave control at all; the native dialog names the person; removal drops the roster to one and the DB to one row.
