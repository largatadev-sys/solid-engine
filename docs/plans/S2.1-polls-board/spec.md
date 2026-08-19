# S2.1 — Polls: the trip voting board

**Status:** specced — awaiting owner review *(flips to ready-for-agent at the owner's pass — the S4.19/S4.20 precedent)* · **Epic:** E2 · **Depends on:** S4.17 (shipped — the workspace tab row whose greyed Polls tab goes live), S1.5 (shipped — membership hard-delete, which is what makes votes-die-with-the-membership one FK), S4.20 (shipped — the roster projection voter identity reuses)

**Immutable point-in-time intent** (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** 02-domain-model as amended this session (Decision → **Poll**; INV-10 reworded) · Artifact 03 (the guard; every endpoint takes the resolved Membership) · INV-10 (one vote per member per poll; members only) · ADR-008 (all wire changes additive — no waiver) · ADR-002 (own module, workspace referenced by ID + service interface) · the 2026-07-17 founder ruling that voting is **pull-based in alpha** (no push notifications) · the S4.16 finding that this codebase deliberately has **no scheduler** — which shapes how a deadline closes · the Claude Design polls canvas (design baseline — link and digest below).

## The pull, on the record

E2's trigger was named on 2026-07-29: *"the founders' E2 UX-flow discussion, where the attachment question gets ruled."* That discussion happened here — grilled 2026-08-20 (grill-with-docs, two rounds plus a lifecycle sidebar), founder ruling in the opening sentence: **"no connection with the day-by-day, this is just a voting board for now."** The attachment question the epic map carried for three weeks is ruled **free-standing**. The poll frames parked at S4.17 return as the design baseline, amended where they contradict the ruling (the winner card's "Added to Itinerary" label is cut — see the digest). A lifecycle re-cut (three states, draft deleted) was raised in the same session and **parked to the epic map as its own story** — it and polls are structurally independent, and the founder pulls it after this one.

## Goal

Every member of a trip can put a question to the group on the workspace's Polls tab, vote on anyone's, change their mind while voting is open, and see who voted for what. Polls close at their deadline or when closed early; a closed poll shows its winner. Nothing connects to the plan.

## Locked decisions *(founder, 2026-08-20, in grilling order)*

### 1 · The entity is Poll, and the epic is one story

Canon's *Decision* renames to **Poll** everywhere — the name every surface and every founder sentence already used; 02-domain-model, INV-10, and Artifact 04's module diagram amended. **S2.2 (close with outcome) is absorbed**: with lazy deadline-close settled, "close" is one endpoint and a badge, not a story.

### 2 · Free-standing — no connection to the plan

A poll is not attached to a day, an activity, or anything else, and its outcome writes nothing anywhere. The mock's **"Added to Itinerary"** winner label is **cut** (a lie under this ruling); the **star stays** as the computed-winner marker. "Poll outcome feeds the plan" is parked to the epic map with its trigger.

### 3 · Any member creates; creator or owner closes early and deletes

The same authority shape membership acts use everywhere. Delete is hard (poll + votes, confirm dialog first) — planning ephemera, the S1.5 posture, not ledger.

### 4 · Multiple polls open concurrently

The board framing ("vote on anything") — dinner and the day-2 activity vote at the same time. This is also half of why decision 10 dismisses the offer/accept extraction: no one-pending-per-workspace rule exists here.

### 5 · Single-choice, one vote per member, changeable until close

INV-10 as an upsert: select → **Submit Vote**; re-voting replaces the previous vote; no separate retract. The mock's hidden "Allow multiple votes" toggle stays cut — single-choice is fixed.

### 6 · Votes are attributed and always visible

Avatar clusters + counts beside every option, before and after you vote. Hidden-until-voted was considered and declined — a bias rule with no alpha value on a four-person trip. Voter identity reuses the S4.20 roster projection; no new identity shape.

### 7 · Every poll has a required deadline, and closing is lazy

Picked at creation (default +24h), stored as a UTC instant, rendered device-local ("Poll closes in 3 hours · Oct 24, 6:00 PM"). **No scheduler exists and none ships**: a poll past its deadline *reads* as closed — closed-ness is computed at read time, the S4.16-shaped structural answer. Early-close (decision 3) stamps a stored fact; deadline close stores nothing.

### 8 · Winner = computed plurality; ties star every leader; zero votes star nothing

No tiebreak rule, no closer-chooses-outcome: the star marks the leading option(s) as counted. Honest and rule-free.

### 9 · No edit after creation — the deadline included

Editing a question or options under existing votes silently changes what people voted for; extending a live deadline is the same shape. Delete and recreate. If a typo hurts enough, that pain buys "edit until first vote" later.

### 10 · The offer/accept extraction trigger is dismissed on the record

The epic map predicted E2's voting as the third proposal shape ("at three the extraction stops being speculative"). It isn't one: Invitation and OwnershipOffer are one-target proposals with four terminal transitions; a Poll is many-voters, two states, no per-target resolution, no one-live-at-a-time rule. The predicted third instance did not arrive — the extraction stays unfired at two, and its backlog line closes.

## Mechanics *(the decisions' consequences, settled at the grilling)*

- **Own `poll` module** (the invitation precedent): canon's "inside the Trip Workspace aggregate" framing holds — INV-10 is enforced transactionally against the workspace's membership — while the implementation references the workspace by ID + Membership per ADR-002/Artifact 03. Two additive tables: poll (id UUIDv7, workspace id, question, created-by membership… closes-at, closed-at nullable, closed-by nullable) and poll option/vote storage with a **unique index on (poll id, membership id)** — INV-10 as schema.
- **Votes reference the Membership with cascade delete.** S1.5 hard-deletes the membership row on leave/removal, so a departed member's votes vanish with them — counts and the "N of M" denominator both shrink, and no vote ever outlives its voter's membership (the departed-postcards strand, refused here structurally).
- **Closed-ness is derived**: `closed_at != null OR now ≥ closes_at`. The wire carries `status: open | closed` computed per read, plus the winner option id(s) on closed polls. No state machine, no transition table.
- **Denominator** = current member count, owner included, read live.
- **Board ordering**: active polls newest-first *(the canvas's rule — it supersedes the grilling's provisional closing-soonest-first; baseline wins)*; completed polls most-recently-closed-first.
- **Caps**: 2–10 options · option text ≤ 80 · question ≤ 120 (the title-cap precedent) · deadline strictly future at creation · ≤ 25 open polls per trip (PlanLimitExceeded-style refusal).
- **Reachability**: the Polls tab un-greys on the shipped tab row (Day-by-Day · Polls · Travelers · Photo Dump · Chat — identical on viewer and editor, S4.17). The board is live in **every unpublished lifecycle state** — ongoing is the headline use (tonight's dinner). Once a trip publishes, the workspace yields to the published view and the board is unreachable with it — accepted eyes-open. **Archive posture is S4.23's, unchanged**: non-owner members 404, owner reads frozen with writes answering the honest 409. Poll acts are workspace acts, not plan writes: **no Editing Session, no lease, no `planVersion` bump, no activity history** (the S3.4 decision-5 shape).
- **Early close needs no confirm; delete does** *(canvas rule)*: closing is recoverable in spirit — results survive, and the deadline was going to do it anyway; delete is destructive and cross-member, so the dialog names the poll and its vote count. On a closed poll the kebab offers Delete only.
- **Pull-based**: no push, no badge counts shipped; the board refreshes on focus / pull-to-refresh (register-#2 analytics on the taps, per the standing pattern).
- **No ADR mints for this story, deliberately**: nothing here is hard-to-reverse (attachment could be added additively; every mechanism is a named existing precedent — P9 patterns: guard-resolved Membership, masked-404 reads, cursor pagination where lists page, lazy derivation over schedulers, hard delete for ephemera).

## Wire changes *(all additive — no ADR-008 waiver)*

- `POST /v1/itineraries/{id}/polls` — question, options, closes-at → the created poll.
- `GET /v1/itineraries/{id}/polls` — the board: both sections' polls with options, per-option voter lists (roster projection), counts, viewer's own vote, computed status, winner id(s) when closed, denominator.
- `PUT /v1/itineraries/{id}/polls/{pollId}/vote` — body = option id; the INV-10 upsert; re-vote is the same call. Refused with a named code on a closed poll.
- `POST /v1/itineraries/{id}/polls/{pollId}/close` — early close, creator or owner; idempotent-refusing on already-closed.
- `DELETE /v1/itineraries/{id}/polls/{pollId}` — creator or owner; hard delete.
- Every endpoint resolves Membership through the guard first — non-members see not-found on all five, list included.

## Candidate-capability note *(ADR-009)*

**`poll.create`** — a capability act, footprint-growing, not governance → register #14. (Option-count and open-poll caps ship as plain limits, not gates.)

## Design baseline & deviations

**The design baseline is the Claude Design polls canvas** — a live mock whose annotations are normative, the S4.22 precedent: [`Polls Spec.dc.html`](https://claude.ai/design/p/34e84995-d099-46dd-a784-3b762a09d6f4?file=Polls+Spec.dc.html) in the founder's Claude Design project, handed at the grilling's close and imported the same session. Digest archived beside this spec (`design-baseline-digest.md`) — six frames: empty board · open-not-voted · voted/changing (the two-grammar vote states) · closed (winner/tie/zero) · creator-owner kebab + delete confirm · Create a Poll. It was seeded from the founder's Figma CSS export (the S4.17-parked pair; archived in the same Claude project as `uploads/poll.txt`) with the grilling's three amendments already applied: the **"Added to Itinerary" label is cut** (decision 2) · the **"Allow multiple votes" toggle stays cut** (decision 5) · the export's **stale tab row and workspace chrome are corrected** to the shipped row (Notes never entered; Details died at S4.25). One canvas rule supersedes a grilling-round default: **active polls order newest-first**, not closing-soonest-first.

## Acceptance criteria

1. A member creates a poll (question, 2–10 options, deadline defaulting +24h); it renders under ACTIVE POLLS for every member on both rungs, newest-first.
2. Any member votes; the option shows their avatar and count immediately; re-voting moves the vote (never adds one); the progress line reads N of M with M = current members. One vote per member per poll survives concurrent submission (INV-10 IT — the unique index, not service courtesy).
3. A poll past its deadline reads CLOSED with the winner starred — with no write having happened (the lazy-close IT: create with a near deadline, advance `MutableClock`, read). Ties star every leader; a zero-vote close stars nothing.
4. Creator and owner can close early and delete (confirm first); a plain member gets the named refusal on both (IT per endpoint). Voting on a closed poll is refused with a named code.
5. A non-member sees not-found on all five endpoints (guard-masking IT family, re-asserted per endpoint).
6. A member who leaves or is removed disappears from every option they voted on, and the denominator drops (IT: the cascade, asserted through the board read).
7. Archived trip: owner reads the board frozen, poll writes answer 409 for the owner and not-found for a non-owner member (S4.23 fence family IT).
8. The tab is live on both surfaces — no `comingSoon`; empty state renders with the Create a Poll CTA; the create form refuses < 2 options, > 10, over-length text, and past deadlines with visible messages.
9. Caps enforced server-side: option 11, question 121, option-text 81, past deadline, and the 26th open poll each get a named 4xx (IT).
10. The whole flow walks on the web preview via the Playwright suite (create → vote as two pool travelers → change vote → early close → winner starred) and on the emulator by hand — the three-rung rule; multi-account checks use the verified pool (t1 = creator/owner, t2 = second voter), stated in the write-up.

## Testing decisions *(the seams — highest existing ones, none new; confirm at owner review)*

Backend: HTTP-seam ITs on `PostgresTestBase` + `RestTestClient` — the guard-masking family per endpoint, the INV-10 unique-index race (two concurrent PUTs, one row), the `MutableClock` lazy-close family (the S1.1 rule: never `Instant.now()` in what a test must steer), the cascade-on-membership-delete assertion, and the caps family. Mobile: pure-module Jest for board anatomy (sections, ordering, winner/tie/zero-star, progress math, deadline copy) — the `landingSlot.ts` precedent of extracting the pure math; repository tests per the existing families. Walks: one Playwright spec driving the preview with two pool travelers; an emulator walk for the native picker-free form. No new seams; the deadline picker reuses the platform-forked DatePicker.

## Out of scope

Any plan connection (parked: "poll outcome feeds the plan") · poll editing or deadline extension · multi-choice polls · anonymous or hidden-until-voted voting · push or badge notifications (pull-based ruling stands) · a scheduler · entitlement code (`poll.create` is a note, not a gate — ADR-009) · the lifecycle re-cut (its own parked story) · any published/consumer surface for polls — the board never projects.

## Comments

*(none yet)*
