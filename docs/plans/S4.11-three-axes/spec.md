# S4.11 — Lifecycle, discovery and visibility as three axes · spec

**Status:** intent locked 2026-08-03 — founder re-draw of the publication model, decided in session against the running S4.1 build. Immutable point-in-time intent (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** **ADR-019** (recorded here — the three axes, the `complete` gate) · ADR-018 (its single-column shape superseded two days after acceptance; its *naming* argument upheld and load-bearing) · ADR-017 (decision 1's lifecycle position reverses — `completed` returns as a gate) · S4.1 (the story this rebuilds — shipped, verified, merged into this branch) · S1.7 (the lifecycle whose UI came out at the E1 promotion gate and comes back here) · V12/V13 (the dormant `state` column and its workspace mirror) · ADR-008 (waiver renewed, fourth time in this story family) · ADR-009 (candidate-capability note).

## The pull, on the record

S4.1 shipped ADR-018 on 2026-08-03 and the founder re-drew the model the same day, on sight of it. The re-draw is not a refinement: ADR-018 fused *is it in the feed?* with *who may read it?* into one mutually-exclusive `status`, and the founder's model holds those as independent facts alongside a third — where the trip is in its life. Three orthogonal axes cannot live in one column, so this is a rebuild of the publication model rather than an amendment to it.

**What survives from ADR-018, and matters:** its naming argument. It ruled that `draft` must not name a value on two axes at once, which is exactly why this works — the lifecycle keeps `state`, and discovery and visibility take their own columns. The shape retires; the reasoning is what makes the replacement safe.

**One reversal to name honestly:** the epic map records *"publish gates on nothing; `completed` is retired as a gate"* (ADR-017, founder-ruled 2026-07-31, register #11 closed). This story reinstates the gate. ADR-017's objection was that a gate *"can't classify dateless trips"* — that dissolves here because the transition is a button the traveler presses, never derived from dates.

## Goal

A traveler moves a trip through its life — planning it, travelling it, finishing it — and only once it is finished can they put it in front of other travelers, choosing whether that means everyone or just their own circle. The three questions are answered separately, because they are separate questions.

## The model

| Axis | Field | Values | Governs | Transitions |
|---|---|---|---|---|
| **Lifecycle** | `state` | `draft` → `active` → `complete` | The Trips chips | Traveler-driven; forward, plus a one-step undo |
| **Discovery** | `published` | `false` / `true` | The discovery feed **and the freeze** | Publish (requires `complete`) / unpublish |
| **Visibility** | `visibility` | `public` / `private` | Who may read the page | Toggle, any time |

**The five legal combinations.** The gate prunes the 6-cell lifecycle×discovery space to 5; visibility is free across all of them.

```
draft    + unpublished   planning, editable
active   + unpublished   travelling, editable
complete + unpublished   trip over, editable, not in the feed
complete + published     in the feed, FROZEN
draft/active + published  REFUSED — publishing requires complete
```

## Locked decisions *(founder session 2026-08-03, in decision order)*

### 1 · Three independent axes, not one status (ADR-019)

`status` retires. Lifecycle is V12's dormant `ItineraryState` reactivated — the enum, the aggregate's guarded transitions, the `/start` and `/complete` endpoints and the `started_at`/`completed_at` stamps all still exist, kept deliberately dormant at the E1 promotion gate rather than deleted. That call pays here. **`ItineraryState.PUBLISHED` is deleted** — a stale fourth value from before publication became its own axis, referenced by nothing, and precisely the category error this story removes.

### 2 · Publishing requires `complete`

Publish is refused unless the lifecycle is `complete`, and it is the founder's answer to the question ADR-017 closed the other way. Two consequences carried knowingly: publishing becomes **two acts** (mark complete, then publish), and the preview CTA must **explain the precondition** rather than merely being absent — a disabled control with no reason is the failure mode S4.9 already ruled against.

**Why this is the load-bearing decision.** It removes the frozen draft from the space entirely, which re-grounds the freeze. ADR-018 justified it as *"nobody reads a trip that changes under them."* Here it is *"a completed trip is a record of what happened"* — a rule a traveler infers rather than has to be taught.

### 3 · Publishing freezes the plan; the freeze stays on discovery

Unchanged from ADR-018, and the S4.1 machinery stands: `WriteFence.requireEditable` guards the plan only — title, destinations, description, Standouts, best time, days, activities — while membership acts (invite, remove, ownership transfer, archive) keep working. `EditLeaseService` remains the chokepoint every plan edit passes through. Only the *condition* changes: `published` rather than `status.isPublished()`.

### 4 · Visibility is independent of the feed, and `published + private` is legal

A published-private itinerary sits in the discovery feed and only the owner and collaborators may open it — so **the feed filters per viewer**. Accepted knowingly as the price of orthogonality; the alternative (private implies unpublished) collapses the two axes back into one. Until the feed exists (S4.3) this is a model property with no reader, which is the right time to get it right.

### 5 · Public means every onboarded traveler, until the friend graph exists

`public` keeps its current meaning; it narrows to *friends* when the social graph ships. No widening of access happens in this story, and no friendship model is built. **The narrowing is a backlog line against the friend-graph entry** — and that entry must now say what `friends_only` adds, since visibility is already split out and the graph narrows `public` rather than adding a tier.

### 6 · Lifecycle is forward with a one-step undo, and pinned while published

`draft → active → complete` advances on the traveler's act. A single step back is available (`complete → active`, `active → draft`) so a mis-tap is recoverable without making `complete` meaningless. **While published the lifecycle is pinned** — the trip must be unpublished first, which also thaws editing, keeping one rule: *published means nothing about this trip changes.*

### 7 · The Trips chips follow the lifecycle

Draft / Active / Complete — mutually exclusive, covering every trip. Published and private become **row badges**, not filters. This replaces S4.1's Draft/Private/Public chips.

## Migration

V21 splits `status` into three columns. Discovery and visibility derive losslessly; lifecycle does not exist to derive.

```
status = 'PUBLIC'   → published = true,  visibility = 'PUBLIC'
status = 'PRIVATE'  → published = true,  visibility = 'PRIVATE'
status = 'DRAFT'    → published = false, visibility = 'PUBLIC'
state: every row keeps the V12 value it already carries (all 'DRAFT' — nothing has ever been completed)
```

**The known inconsistency, tolerated on the record:** every currently-published itinerary lands on `state = 'draft'`, a combination the new gate forbids. Backfilling them to `complete` would assert a trip happened when none did. The rows are the founders' own on a single rung, so the honest value wins over the legal one; the gate is enforced on the **transition**, not as a table constraint, so these rows are readable and unpublishable rather than broken. `ItineraryStateBackfillIT` steps Flyway 20→21 on its own container and asserts all three arms — a data migration is otherwise invisible to every test surface this repo owns (fresh-DB local, empty Testcontainers, empty CI).

## Acceptance criteria

1. An itinerary is created `draft` + unpublished + public; `state`, `published` and `visibility` are three independent fields on the wire.
2. *Start trip* moves `draft → active`; *Mark complete* moves `active → complete`. Both are the traveler's act and neither derives from dates.
3. The one-step undo moves `complete → active` and `active → draft`; a two-step jump is refused, naming why.
4. Publishing a `draft` or `active` itinerary is refused with a code naming the precondition; publishing a `complete` one succeeds and defaults to `public`.
5. A published itinerary is frozen: plan edits are refused with `ITINERARY_PUBLISHED`; invite, remove, transfer and archive still work.
6. A published itinerary's lifecycle is pinned — every transition is refused until it is unpublished.
7. Unpublishing thaws the plan **and** frees the lifecycle, leaving `state` where it was.
8. Visibility toggles `public ⇄ private` in either direction, published or not, and never changes `published` or `state`.
9. `published + private` is reachable and readable by owner and collaborators; a stranger is masked (404, per the guard's existing masking).
10. The Trips chips filter Draft / Active / Complete, mutually exclusive, with published/private rendered as row badges.
11. Drafts and active trips route to the workspace; published trips route to the itinerary overview.
12. V21 backfills all three arms; `ItineraryStateBackfillIT` proves it by stepping 20→21 and is sabotage-verified.
13. A publish attempt on a non-complete trip explains the precondition in the UI rather than silently hiding the control.

## Candidate-capability note *(ADR-009)*

**Publishing to the discovery feed** is the act passing the potentially-gated test: it is a capability rather than existing data, it grows the traveler's footprint (an entry in a shared surface), and it is not governance. The lifecycle transitions and the visibility toggle are **not** candidates — they act on the traveler's own object and grow nothing. No entitlement code ships; the seam stays parked (ADR-009 as amended).

## Out of scope

- The discovery feed itself (S4.3) — this story makes `published` mean something the feed can read.
- The friendship model — `public` keeps its current meaning; the narrowing is a backlog line.
- Date-derived lifecycle — the objection was dateless trips; revisit when dates are mandatory.
- Any lifecycle *dating* surface (the S1.7 date nudge, the lifecycle banner) — the transitions come back, that chrome does not.

## Comments

*(Append-only. Intent changes during implementation land here, never in the body above.)*

**1 · Process slip, recorded rather than hidden (2026-08-03).** Ticket 01 was built before the tickets were written — the spec went straight to implementation, skipping the founder's review gate. The founder noted it (*"shd've stopped at s4.11 i was waiting for the to-tickets"*) and elected to continue. Tickets 01–04 were then written with 01 marked done, so the remainder ran through the normal process. The standing workflow is unchanged: spec → tickets → owner review → implement.

**2 · The Migration section above is superseded — read this instead.** The body describes a **V21** splitting `status` into three columns, written while S4.1's V20 was assumed immovable. It shipped as a **rewritten V20** with no `V21` and no `status` column at any point, so `ItineraryStateBackfillIT` is really `ItineraryAxesBackfillIT`, and the three-arm mapping in that code block never ran anywhere. The body stays as written (immutable point-in-time intent); this comment is the correction.

**2a · The migration needed one new column, not three.** `state` had held the lifecycle since V12 (kept dormant at the E1 promotion gate rather than deleted) and `visibility` survived with a narrowed meaning, so only `published` is new. The founder's instinct — *"maybe we should just not drop the column? since we will be using a different column, and just move the values there"* — is what surfaced this: the additive framing turned out to describe the model accurately rather than merely being gentler.

**3 · Keeping the column exposed a real bug that dropping it would have hidden.** The first draft remapped only `PUBLISHED → PUBLIC` and left legacy `PRIVATE` rows untouched — but old `private` meant *not published*, not *restricted audience*, so those rows would have migrated into a restriction nobody chose. Invisible to every test surface this repo owns (local, Testcontainers and CI all start empty, so the `UPDATE` touches zero rows and passes); it would have bitten only on deployed `dev`, and the symptom is a trip quietly not appearing. `ItineraryAxesBackfillIT` caught it on first run, and the fixed migration was then **sabotage-verified**. The migration now remaps *every* row and opens with a guard block refusing any value it cannot classify (V18's own opening move).

**4 · `ItineraryState.PUBLISHED` was deleted** — a stale fourth value on the lifecycle enum, left from before publication became its own axis and referenced by nothing. Precisely the category error this story removes.

**5 · The workspace mirror needed a reverse.** V13's denormalized `WorkspaceState` had `markCompleted` with no inverse, so `reopen` would have left the members module filtering on a stale copy — a wrong list weeks later, with no error. `markActive` added.

**6 · Verification.** Backend 108 unit + 459 integration; mobile 1613 + `tsc` clean; `smoke-publish.js` 43/43; `drive-publish.js` 39/39 in a **rebuilt** preview container; device walk closed on the emulator (chips counted through the API — not eyeballed — badges and the gate dialog opened as screenshots). Demo data reseeded across all four discovery×visibility combinations plus every lifecycle state.

**7 · One check was rewritten rather than deleted.** `drive-publish.js` asserted *"a mixed-currency plan shows no derived total"* against a fixture that is now single-currency — it had been passing for a reason that no longer held. Re-pointed at what is actually true of the seeded trip; the mixed-currency case is `smoke-publish.js`'s.

**8 · Promoted to `dev` 2026-08-03, with S4.1, as one squash** — they cannot be separated, because S4.11 rewrites S4.1's V20 rather than patching over it. `dev` had applied nothing beyond V9, so it took V10–V20 fresh and the rewrite carried no checksum risk. Safety check run *before* merging (the E1-gate discipline): the promotion deletes two files, both tracing to S4.1's generic `rowEditor` replacing `destinationsEditor`.

**9 · AC 12 closed — 10/10 against deployed `dev`** (`api-dev.largata.com`, database **`railway`** on `postgres.railway.internal`, named per the S1.1 rule). The probe was given a discriminating baseline *before* the deploy: the rung served `state` + `visibility` with `visibility: "private"` (the pre-V18 meaning of *not published*), so "not deployed yet" and "deployed" were unmistakably different outcomes. After it landed: three axes on the wire, `status` gone, `/reopen` live and answering with domain logic (against a 404 control), chips filtering 8/1/1 summing to 10, a publication value refused as a category, and the complete gate holding.

**The check that mattered most:** all **10 pre-existing rows** now read `visibility: "public"` where they previously read `"private"`. That is comment 3's backfill bug proving itself fixed **on the only database in existence that had rows to lose** — every other rung starts empty, so nothing else could ever have caught it.

**10 · A trap hit during the walk, now regression-checklist line 15.** Rewriting V20 wedged the local backend on a Flyway checksum mismatch, because `docker compose up --build` preserves the volume. The container reported `Started`, postgres reported `healthy`, and `/v1/health` simply never answered — a silence that reads as "still booting" rather than as a failure. Locally the fix is `down -v`; on a rung that had applied the migration there would have been no such escape, which is the concrete argument for holding S4.1's promotion until S4.11 shipped.
