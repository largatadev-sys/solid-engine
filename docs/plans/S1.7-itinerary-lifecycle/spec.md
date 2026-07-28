# S1.7 — Itinerary lifecycle (draft → active → completed) · spec

**Status:** intent locked 2026-07-28 — grilling session, founder-confirmed. Immutable point-in-time intent (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** 02 (Itinerary state machine `draft → active → completed → published`, forward-only; register #10 resolves here; register #12's pointer lands here and defers again) · S1.3/ADR-013 (Days are the structure, dates optional metadata; the span↔day-count deferral discharges here; "members edit plan content, the owner keeps lifecycle") · S1.4/ADR-014 (the edit lease guards plan content — lifecycle acts don't take it) · S1.5/S1.6 (governance-act precedents; `NOT_TRIP_OWNER` envelope reused; `confirmWith` + CDP-driven confirm rule) · S4.1 (the future reader: publish is legal from `completed` only — register #11's story) · Artifact 03 (guard: resolved `Membership` in, 404-masking) · Artifact 05 (action-endpoint idiom; 409 = illegal state transition) · ADR-008 (additive within /v1) · the V3 gotcha (enum storage spelling; the dead `DEFAULT 'draft'` dies here).

## Goal

The system learns when a trip starts and when it ends — from the owner's explicit act, never a clock. Two guarded transitions (`draft → active`, `active → completed`), each stamping a write-once timestamp; dates nudge, pull-based and client-side. `completed` gates nothing yet: it is the recorded fact S4.1's publish gate will read.

## Locked decisions *(grilling 2026-07-28, in decision order)*

### 1 · Register #10 resolved: owner-explicit, date as nudge

Both transitions are the owner's explicit acts (S1.3's ruling: members edit plan content, the owner keeps lifecycle). The dates' only lifecycle role is a **pull-based, client-side nudge** — `draft` with a past `startDate` suggests Start, `active` with a past `endDate` suggests Complete — computed at render against the device-local date, nothing stored, no backend involvement. **Rejected:** automatic transition on date arrival — dates are optional (an undated trip could never leave `draft`), and the machinery is either a scheduler (new infrastructure) or state-computed-on-read (a stored column that lies about itself — the V3 family). Matches the UX flow-11 input and the workspace-archive precedent: *explicit act, never automatic*.

### 2 · `completed` gates nothing

Plan edits, invites, removal, leave, and ownership transfer all keep working after completion — canon's workspace afterlife is *working*, not frozen (E5 settles post-trip; reviews and diary publishing arrive later and need the workspace live). `completed`'s readers in this story are the transition legality checks, the UI surface, and the nudge; its future reader is S4.1's publish gate. **Rejected:** freezing plan content (a state check plus tests across every plan-write endpoint, and S4.1's pre-publish cleanup edits would fight it) · freezing membership ops (contradicts the afterlife; INV-4 needs transfer possible always).

### 3 · Forward-only, confirm-guarded

No backward edges — canon's illegal list holds. The mis-tap is real and accepted: since `completed` gates nothing, a wrong state is cosmetic pre-E4 (premature publish *eligibility* at worst — publishing stays a separate explicit act); each transition gets a confirm dialog through the platform-forked `confirmWith` (the `Alert.alert` web-no-op gotcha). Forward-only is also what makes the timestamps write-once facts. Undo becomes a story only if real usage demands it; pre-alpha, the fix is psql.

### 4 · Register #12, applied recursively: the workspace `state` column defers again

Register #12 pointed the column here ("the first story that reads a state value"). The premise failed on examination: **S1.7 reads only itinerary state.** INV-1 gates on membership; decision 2 removed any completed-gating; and until `archived` exists, workspace state is fully derivable from the itinerary's (the relationship is 1:1) — storing it would duplicate a fact and mirror a write no reader consumes. The column's first true reader is **the archive story** (S1.9 or later — which also decides whether archive is MVP at all: `archived`'s "no writes of any kind" is exactly the enforcement surface this story declined for `completed`, and it needs its own AC set). Canon updated (02).

### 5 · The span↔day-count deferral, discharged: stays decoupled

S1.3 parked the invariant here because LWW coupled two members' edits into mutual invalidation. That objection died with ADR-014 (single-writer) — but the friction survives concurrency: a hard `endDate − startDate + 1 = dayCount` rule forces ordered edit sequences on the one editor, only fires when both optional dates are set (a rule with holes), and guards a coherence **nothing reads until publish**. Dates and days stay decoupled; the coherence question routes to **S4.1**, where the plan first gets an external audience. **Rejected:** the hard invariant · a soft mismatch warning (new UI surface nothing demands pre-alpha).

### 6 · `started_at` / `completed_at` ship, and record the act

Two nullable columns, each written once by its transition, immutable under forward-only. **Semantics, stated:** they record **when the owner performed the act**, not when travel physically happened — the plan's dates carry the traveled-when claim (a forgetful owner completing a week late produces `started_at` past `endDate`, and that is the truthful record of what the system was told, and when). The completion moment is register #4's anchor (review eligibility may need facts captured *at* completion) — the S1.3 precedent: deferring attribution is the one deferral that destroys data retroactively. **Not on the wire yet** — no client reader exists; the response fields are additive whenever one arrives. **Rejected:** no timestamps (retroactively destructive) · a transition-event log (records nothing two columns don't while transitions are forward-only — the S1.5 `membership_event` rejection).

### 7 · API — two action endpoints; PATCH pinned shut

The repo's action-endpoint idiom (`/accept`, `/move`, `/renew`), additive within /v1, on `ItineraryController`'s URL space:

| Endpoint | Actor | Result |
|---|---|---|
| `POST /v1/itineraries/{id}/start` | owner | **200** + updated itinerary — `draft → active`, stamps `started_at` |
| `POST /v1/itineraries/{id}/complete` | owner | **200** + updated itinerary — `active → completed`, stamps `completed_at` |

No request body — the act carries no data (publish, which does, gets its own endpoint at S4.1; a generic `{to:…}` transition endpoint was rejected as machinery over two fixed cases that publish wouldn't fit anyway). Ladder, S1.5-ordered (authority before state): **401** unauthenticated · **404** guard-mask (non-member) · **403** `NOT_TRIP_OWNER` (member, not owner — S1.6's envelope reused) · **409** `ILLEGAL_STATE_TRANSITION` (wrong current state; one code, the message names from→to — the client's response to any 409 here is the same: refetch and re-render). The strict machine means `/complete` on a `draft` is a 409, not a shortcut (decision 9). **A pinning test proves `PATCH /v1/itineraries/{id}` cannot move `state`** — the field-edit door and the lifecycle door stay separate, or the machine has an unguarded side entrance.

### 8 · Mobile — banner + badge

- **My Trips rows** carry a small state badge, member-visible (state is a workspace-visible fact under INV-1, and already on the wire since S0.3).
- **The itinerary screen:** the owner sees a lifecycle banner — Start on a draft, Complete on an active trip — highlighted with nudge copy when the relevant date is past (*"Start date was Jul 20 — trip underway?"*). Members see the state badge only: the lever is the owner's (the S1.5/S1.6 don't-advertise-dead-ends pattern). No dismissed-state storage — the banner is passive, which is why it isn't a modal.
- Both acts through the platform-forked `confirmWith`; exact copy at the ticket; CDP-intercepted on web, cancel and confirm both driven (S1.5's rule).
- Everything is pull: members discover the change on next fetch; the itinerary and list queries invalidate after each mutation.

### 9 · The forgetful owner: strict two taps

A trip that ended while still `draft` reaches `completed` through two deliberate acts: the overdue-draft banner offers **Start**; once active, the complete nudge appears. No `draft → completed` edge (the machine keeps meaning "the phases every trip passes through") and no client-side call-chaining (one tap hiding two acts, with mid-chain failure handling, for a rare case). One extra confirmed tap is the accepted cost.

### 10 · Precedent-decided positions *(stated at the grilling, unobjected)*

- **Transitions don't take the edit lease** — they are governance acts, not plan-content edits (ADR-014's lease guards content; S1.5 removal and S1.6 transfer set the precedent).
- **Transitions don't touch the last-edited pair** — it attributes plan edits (S1.3).
- **The migration drops V3's dead `DEFAULT 'draft'`** — the CLAUDE.md gotcha names that default as the trap for "the next migration that copies it"; this is that migration. Non-destructive: Hibernate always supplies the value and no other INSERT path exists. Founder sign-off at the grilling.

### 11 · Analytics — one event per act

`itinerary_started` · `itinerary_completed` — after-commit, per register #2's standing default set. No event on a 409.

## Backend scope

One additive migration (V12 at time of writing): `started_at` / `completed_at` (nullable timestamps) on `itinerary`, plus the `state` `DROP DEFAULT`. No new tables; the list query is untouched. `ItineraryService` gains `start`/`complete` (resolved `Membership` in, owner check on the capability object — Artifact 03; a `ConflictException` subtype carries `ILLEGAL_STATE_TRANSITION`). `ItineraryController` gains the two POSTs. `ItineraryResponse` unchanged (`state` is already there; timestamps wait for a reader). Events per decision 11.

## Mobile scope

Repository/typed-`apiClient` layer: two mutations (ADR-001 — no raw fetch) · state badge on My Trips rows and the itinerary screen · owner lifecycle banner with the client-side date nudge · `confirmWith` on both acts · web parity via the shared codebase, verified in the preview container.

## Acceptance criteria

| # | Criterion | Closed by |
|---|---|---|
| 1 | Start: 200, `active`, `started_at` set; ladder 401 · 404 non-member · 403 member (`NOT_TRIP_OWNER`) · 409 from `active` and `completed` | IT |
| 2 | Complete: 200, `completed`, `completed_at` set; 409 from `draft` (no skip edge) and from `completed` | IT |
| 3 | The pin: `PATCH /v1/itineraries/{id}` cannot move `state` | IT |
| 4 | Timestamps write-once: after a 409'd re-attempt both values unchanged; the last-edited pair untouched by transitions | IT |
| 5 | Storage: DB holds `'ACTIVE'` / `'COMPLETED'` (enum-name spelling — the V4 lesson) and the `state` column default is gone | IT (storage) |
| 6 | Events after commit only, one per act, none on a 409 | IT |
| 7 | Device (dev build, pool accounts, tags stated): t1 = owner — confirm-cancel leaves `draft`, confirm-accept moves it; badge on both accounts' next look; t2 = member sees badge, no banner/CTA; an overdue draft's banner offers Start, not Complete | Device AC |
| 8 | Web preview container: as t1, both transitions driven with CDP-intercepted confirm (cancel keeps state, confirm moves it); badge renders on My Trips | `drive-preview.js` |
| 9 | Post-merge on deployed `dev`: one start → complete loop via a pool account; the SQL check **names the `railway` database** and reads `state='COMPLETED'` with both timestamps present | Deployed-dev probe |

**Deliberate omissions, on the record:** the `published` transition (S4.1) · workspace state column + machine including archive (the archive story — S1.9 or later) · any completed-gating · backward transitions / undo · the span↔day-count invariant (decoupled; coherence → S4.1) · timestamps on the wire (no reader yet; additive later) · notifications, scheduler, auto-transitions of any kind.

## Out of scope

Publish + visibility (S4.1, register #11) · itinerary delete (S1.9) · workspace lifecycle/archive · the entitlement seam (S1.8) · any change to edit-lease, invitation, or membership semantics.

## Comments

**2026-07-28 — the 403's envelope code is `NOT_PERMITTED`, not `NOT_TRIP_OWNER` (decision 7 / AC 1 correction).**

Decision 7 and AC 1 name the owner-refusal code `NOT_TRIP_OWNER`, and ticket 01 repeats it as "S1.6's envelope reused". **That prose was wrong about what S1.6 ships, and the code review caught the divergence.** `NOT_TRIP_OWNER` exists nowhere in the codebase: S1.6's spec used the same phrase, but its `MembershipExceptions.NotTripOwnerException` carries the code **`NOT_PERMITTED`** — and its javadoc records why, deliberately. The *class* is named for the situation; the *wire code* is Artifact 05's shared vocabulary, and "you are a member but this is the owner's to do" is one situation from the client's side. A second code for it would mean two branches for one meaning. The invitation module's `NotWorkspaceOwnerException` made the same call before that.

S1.7 therefore ships `NOT_PERMITTED` — genuinely reusing S1.6's envelope, which is what the ticket asked for, rather than minting a fourth code for the same client branch. Under ADR-008 this is the permanent contract, so the correction is recorded rather than silently absorbed: **read every `NOT_TRIP_OWNER` in this spec as `NOT_PERMITTED`.** The intent (403, owner-only, distinct from the guard's 404) is unchanged.

**2026-07-28 — three review findings fixed, two argued down.**

Fixed: (1) `transitionsDoNotTouchTheLastEditedPair` had **no failure mode** — it used a never-edited trip, so both fields were null before and after and it would have passed had a transition stamped them. It now has a member edit the trip first and asserts the member's attribution survives both transitions. (2) `TripLifecycleBanner`'s javadoc claimed the banner "appears rather than flickering away" during roster load; the behaviour is the opposite (hidden until the roster lands) and the comment now states that, with the reasoning for why that direction is the right one. (3) The controller javadoc named a test class that does not exist.

Argued down, with reasons on the record: (a) **month-name date formatting in the nudge copy** — the spec's "Jul 20" is illustrative prose in a decision about nudge *behaviour*, and `formatDates` renders raw ISO on every other surface, so this banner would become the only place in the app formatting dates differently. (b) **Returning the transition's own result instead of a second `viewPlan` read** — the re-read is the shape `view` and `update` already ship (a concurrent write between the two is a pre-existing property of every endpoint here, not something S1.7 introduces); changing it is a refactor of shipped endpoints, which belongs to its own story rather than riding this one.
