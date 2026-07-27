# S1.6 — Ownership transfer (offer/accept) · spec

**Status:** intent locked 2026-07-28 — grilling session, founder-confirmed. Immutable point-in-time intent (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** INV-4 (02 — exactly one owner, always; ownership transfers or is claimed, never vanishes) · Artifact 03 §77 (owner departure is transfer-first; the claim arm belongs to account deletion) · S1.5 (the `OWNER_CANNOT_LEAVE` dead end this story unblocks; the departure transaction this story extends; the `com.largata.membership` module whose javadoc reserves this story's seat) · S1.2 (Invitation — the offer/accept precedent: terminal statuses, at-most-one-pending, in-app accept surface with no notifications) · ADR-008 (fully additive) · ADR-014 (edit lease untouched — transfer moves no lease) · Artifact 05 (envelopes, idempotency, 404-masking) · E5/S5.5 (receives the owner-deletion claim flow, see decision 1) · epic-map backlog: the owner-scoped My Trips bug (discharged here, decision 2).

## Goal

The owner can hand a trip to a member — by **offer and acceptance**, never imposition — and thereby unlock the exit S1.5 refused them. Accepting executes the transfer atomically: roles swap, the durable transfer record is written, and the ex-owner becomes an ordinary member who can now leave through S1.5's door. My Trips simultaneously becomes membership-scoped, so a transferred trip stays on the ex-owner's home screen and joined trips finally appear on members'.

## Locked decisions *(grilling 2026-07-27/28, in decision order)*

### 1 · Transfer only — the claim flow moves to E5

The epic map bundled "ownership transfer + owner-deletion claim flow"; the bundle predates the slicing. A claim mechanism needs a deletion trigger, and **account deletion does not exist until S5.5** — a claim flow built now would be a mechanism with no trigger (the discipline that deferred S1.2's state column and rejected S1.5's event log). INV-4 stays whole: until deletion exists, transfer covers every owner exit that can happen. S5.5 absorbs the claim arm and adds the `kind` discriminator to this story's transfer record (decision 6) when it does.

### 2 · My Trips becomes membership-scoped — one list

The S1.5 discovery (owner-scoped `GET /v1/itineraries`, members see zero joined trips) is fixed here, per its backlog trigger "S1.6 at the latest" — transfer makes it absurd (hand a trip over and it vanishes from your own list while you're still on it). **One merged list**, same ordering, **nothing new on the list wire**: since S1.1 every owner has a membership row, so a membership-scoped query returns owned and joined trips uniformly. Old clients render more rows and nothing else changes. **Rejected:** two sections / a `role` field on list items — API surface and UI for a distinction an alpha of friend groups doesn't need; additive later if real usage asks. ADR-002 note for the ticket: the itinerary module never touches membership tables — the caller's itinerary-id set crosses by service interface, with its own index on the membership side (the membership PK leads on `workspace_id`, so `traveler_id` lookup needs one).

### 3 · Offer/accept, not unilateral — consent is the discovery guarantee

**The grilling first locked unilateral transfer and the founder reversed it at the checkpoint; the reversal's reasoning is the record.** Under the no-notifications posture, both designs have an unnoticed-case, and they are not symmetric: an unnoticed *offer* leaves a present, capable owner in place — a delay, benign, socially nudgeable. An unnoticed *imposed* ownership moves INV-4's load-bearing role to someone who doesn't know they hold it — the only person who can remove members, transfer, or (S1.9) delete, oblivious. Unilateral transfer can quietly *manufacture* the dormant-owner problem the E5 claim flow exists to fix; acceptance is what guarantees the new owner knows. S1.2 proved the pattern works pull-based.

**Recorded trade-off, accepted:** the owner's exit stays blocked until a member accepts. If nobody ever accepts, the owner stays owner — that is INV-4 working, not a bug. **Rejected:** the unilateral path (above) · any notification surface (founder posture, E2/S1.5 precedent).

### 4 · The Ownership Offer entity

Mirrors Invitation, which solved this shape at S1.2:

- **Ownership Offer:** workspace id, target traveler id, offered-at, status **`pending → accepted | declined | revoked | voided`** — all terminal; re-offering = a new row; history is free.
- **At most one `pending` per workspace** (partial unique index; the `'PENDING'` spelling in its predicate is pinned by a storage IT — the V4 lesson). One crown, one outstretched hand: offering to C while B's offer is pending requires **explicit revoke** first — no silent supersede; the owner should know they are retracting.
- **No TTL.** An expiry job is machinery with no reader; `expired` can join the enum additively if usage demands it.
- The target must be an **existing member** (canon, Artifact 03) — an offer never admits anyone; it re-ranks people already inside the walls.

### 5 · Departure voids a pending offer, transactionally

S1.5's two doors (leave, removal) can slam on the offeree. The offer cannot stay `pending` — the target can no longer legally accept, and at-most-one-pending would let a ghost offer block the workspace. So: **`voided`**, a distinct terminal status (`revoked` = the owner's act, `declined` = the target's, `voided` = the system's consequence of departure — collapsing them would make the events lie about who acted), written **inside S1.5's departure transaction** (`MANDATORY`, like the lease release — a departure and its offer-void cannot commit separately). **Removal never blocks on a pending offer** — the owner removing the offeree voids it in passing; the offer is the owner's own outstretched hand. New latent invariant, sibling of S1.5's lease rule: **an offer's target is always a member.**

### 6 · Accept executes the transfer — one transaction, four effects

1. **Role swap** — demote the owner's row to `member`, then promote the target's (that order: V4's partial index allows at most one `OWNER` per statement). The demote is **conditional on `role = 'OWNER'` with its update-count checked** — that is what resolves two concurrent accepts/transfers to exactly one owner instead of a lost update.
2. **`itinerary.owner_id` syncs** — one UPDATE; membership remains the sole authority (the guard never reads the column), but no column in the schema lies. A frozen column would silently pre-decide E4's "(Creator)" question by accident.
3. **The durable `ownership_transfer` row** — `(id, workspace_id, from_traveler_id, to_traveler_id, transferred_at)`. This sits between two precedents that point opposite ways, and the S1.3 side wins: this is ownership **attribution** ("deferring attribution is the one deferral that destroys data retroactively"), named in canon three times as surviving anonymization (01 Compliance, 02 Traveler, 03 §77) — not workspace *history*, the category S1.5 rejected. **The creator of any itinerary is derivable forever**: earliest transfer's `from`, else the current owner — so the influencer program and the E4 creator badge need zero retrofit. No `kind` column until E5's claim writes a second value.
4. **Offer → `accepted`.**

The ex-owner stays a member; exit remains S1.5's Leave, which now works for them — the two operations compose with zero new code at the seam. **Rejected:** a combined transfer-and-leave act (duplicates S1.5's whole departure path for the one case where the intents coincide).

### 7 · API — an itinerary-addressed singleton

At-most-one-pending makes "the offer" a well-defined resource; no offer ids on the wire, workspace ids stay off as always; all on `TripMembershipController`'s URL space:

| Endpoint | Actor | Result |
|---|---|---|
| `POST /v1/itineraries/{id}/ownership-offer` body `{travelerId}` | owner | **201** + offer |
| `DELETE /v1/itineraries/{id}/ownership-offer` | owner | **204** — revoke; idempotent (revoking the absent offer is 204, Artifact 05) |
| `POST /v1/itineraries/{id}/ownership-offer/accept` | offeree | **204** — executes decision 6 |
| `POST /v1/itineraries/{id}/ownership-offer/decline` | offeree | **204** |

Ladders, S1.5-ordered (authority before state):

- **Create:** 401 · 404 guard-mask · 403 `NOT_TRIP_OWNER` · 409 `TARGET_NOT_A_MEMBER` (invite them first — not 404: the caller passed the guard and can read the roster; nothing to mask) · 409 `CANNOT_OFFER_TO_SELF` (a create endpoint doesn't silently no-op) · 409 `OFFER_ALREADY_PENDING` (revoke first, decision 4).
- **Accept / decline:** 401 · 404 guard-mask · no pending offer → **404** (acting on an absent singleton) · pending offer exists but caller isn't its target → **403**. This makes the stale-accept race safe **by construction**: B's late accept after revoke-and-reoffer-to-C hits "pending targets C, caller is B" → 403; B can never seize C's crown.
- **Revoke:** 401 · 404 guard-mask · 403 `NOT_TRIP_OWNER` · absent → 204.

**Discovery on the wire:** `MemberResponse` gains one additive field — **`ownershipOffered: true`** on the target's row (absent otherwise; at most one row ever carries it). The roster every member already fetches answers both UI questions — *who is offered* and *is it me* — with zero new reads. Offer visibility to **all members** is deliberate: governance state of a shared trip, workspace-walled like roles (INV-1), and the group seeing the unaccepted crown is itself a discovery aid. Bonus, wording only: `OWNER_CANNOT_LEAVE`'s message now names the remedy ("offer ownership to a member first").

### 8 · Mobile — Members screen + one discovery banner

- **Owner:** **Offer ownership** on every non-self row; while one is pending, the target's row wears an **"Ownership offered"** badge and gains **Revoke offer**, and Offer disappears from other rows (at-most-one-pending rendered as absence — don't-advertise-dead-ends). All computed in the pure `memberControls` function (S1.5), which is where the Jest table lives.
- **Offeree:** own row carries the badge + **Accept** / **Decline** — and the **trip screen shows a discovery banner** (*"You've been offered ownership of this trip"* → Members). The banner exists because of decision 3's rationale: burying the offer one screen deep would undercut the reversal that won it. Cost accepted: the trip screen fetches the roster (bounded, TanStack-cached, shared with the Members screen).
- **All four acts** (offer, revoke, accept, decline) through the platform-forked `confirmWith`; accept's wording names the authority gained, offer's names what acceptance will cost the owner; exact copy at the ticket; CDP-intercepted on web, cancel and confirm both driven (S1.5's rule).
- **Everything else is pull:** the ex-owner discovers acceptance when they next look (their row now shows Leave; the crown moved). Roster invalidation after each mutation. My Trips needs no client work — both parties remain members throughout.

### 9 · Analytics — one event per act

`ownership_offer_created` / `_revoked` / `_declined` / `_voided` (each naming the true initiator) · **`ownership_transferred`** at accept — no separate `offer_accepted` event; accept *is* the transfer and one act must not count twice (S1.5's discipline). All after-commit.

## Backend scope

Two additive migrations: `ownership_offer` (+ the at-most-one-pending partial unique index) and `ownership_transfer`; the membership-side index for the My Trips query. The `membership` module gains its first tables and the four offer operations (caller's resolved `Membership` in, role logic on the capability object — Artifact 03), reaching `workspace` (role swap, with the INV-4 defence below the service: the conditional demote/promote) and `itinerary` (`owner_id` sync) by service interface (ADR-002). `MembershipService.depart` gains the offer-void. `TripMembershipController` gains the singleton surface; `MemberResponse` gains `ownershipOffered`. My Trips list becomes membership-scoped, ADR-002-cleanly. New conflict envelopes: `TARGET_NOT_A_MEMBER`, `CANNOT_OFFER_TO_SELF`, `OFFER_ALREADY_PENDING`. `OWNER_CANNOT_LEAVE` message reworded. Events per decision 9.

## Mobile scope

Repository/typed-`apiClient` layer: four mutations + the `ownershipOffered` field (ADR-001 — no raw fetch) · `memberControls` extended for the full control matrix · trip-screen banner off the shared roster query · `confirmWith` on all four acts · web parity via the shared codebase, verified in the preview container.

## Acceptance criteria

| # | Criterion | Closed by |
|---|---|---|
| 1 | Offer create: 201, roster shows `ownershipOffered` on the target's row; 403 non-owner; 409 × `TARGET_NOT_A_MEMBER` / `CANNOT_OFFER_TO_SELF` / `OFFER_ALREADY_PENDING` | IT |
| 2 | Revoke: 204, offer `revoked`, flag gone; revoking the absent offer is 204 | IT |
| 3 | Decline: 204, terminal; a fresh offer to the same or another member succeeds after | IT |
| 4 | **Accept executes all four effects in one transaction** — roles swapped, `owner_id` synced, `ownership_transfer` row written, offer `accepted` — asserted in one test so they stand or fall together | IT |
| 5 | **Stale-accept race:** offer B → revoke → offer C → B's accept **403**, C's accept 204; INV-4 intact | IT |
| 6 | **Voided on departure, both doors:** offeree leaves → `voided`; owner removes offeree → `voided`, removal not blocked; after each, a fresh offer succeeds | IT |
| 7 | INV-4 under everything: exactly one `OWNER` row survives every test in the suite, including the concurrency guard (conditional, count-checked demote — a test that fails if the `WHERE role` clause vanishes) | IT |
| 8 | My Trips membership-scoped: a member sees a joined trip; keyset pagination pages correctly across the join; the ex-owner still sees the trip post-transfer | IT |
| 9 | The at-most-one-pending partial index's `'PENDING'` spelling pinned | IT (storage) |
| 10 | One event per act, after commit only; `ownership_transferred` at accept, no `offer_accepted` | IT |
| 11 | Guard-mask 404 for non-members and 401 unauthenticated across the whole new surface | IT |
| 12 | Device (dev build, two pool accounts, tags stated): t1 offers → **t2's trip screen shows the banner** → t2 accepts → crown moves on both rosters, **both** My Trips keep the trip → t1's row shows Leave → **t1 leaves** — the S1.5 dead end proven open | Device AC |
| 13 | Web preview container: as t1, offer driven with CDP-intercepted confirm (cancel keeps the roster bare, confirm sets the badge); as t2, accept driven the same double way | `drive-preview.js` |
| 14 | Post-merge on deployed `dev`: one offer → accept loop between pool accounts; the SQL check **names the `railway` database** and reads offer `accepted`, transfer row present, roles swapped | Deployed-dev probe |

**Deliberate omissions, on the record:** the claim flow (E5/S5.5) · the unilateral path (rejected, decision 3) · TTL/expiry · notifications of any kind · the `kind` column · a `role` field on the list wire · a My Trips offer badge · itinerary delete (S1.9).

## Out of scope

Owner-deletion claim flow (S5.5) · account deletion itself (S5.5) · itinerary delete (S1.9) · workspace lifecycle/state (S1.7) · notification infrastructure (post-gate) · offer expiry · any change to invitation or departure semantics beyond the offer-void.
