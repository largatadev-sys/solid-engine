# S1.9 — Itinerary archive · spec

**Status:** intent locked 2026-07-28 — grilling session, founder-confirmed. Immutable point-in-time intent (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** 02 (Trip Workspace machine `active → completed → archived`; register #12's `state` column lands here; the Invitation status list gains a value) · 03 §69 (owner-only operations name "archive"; the resolved `Membership`; 404-masking) · S1.5 (hard-delete precedent, `releaseHeldBy`, the "reads as data loss" copy lesson, `OWNER_CANNOT_LEAVE`) · S1.6 (`voided` = the system's act; membership-scoped My Trips; offer/accept) · S1.7 (action-endpoint idiom, the `NOT_PERMITTED` envelope, `ILLEGAL_STATE_TRANSITION`, the enforcement surface it declined) · ADR-014/S1.4 (the edit lease) · ADR-008 (additive within /v1) · ADR-009 amendment (the candidate-capability note — S1.9 is the first story bound by it) · the V5/`WorkspaceBackfillIT` pattern (a backfill is invisible to every local surface).

## The re-scope, on the record

The epic map and BUILD_STATUS called this story **"itinerary delete (owner-only; INV-4 + workspace lifecycle — added at S0.3)"**. At this grilling the founder ruled **archive only**: *"we only do archive for now"*, then *"archive now, and no talks about delete but we park it."* S1.9 is therefore **the archive story**, and delete parks with a trigger.

The map anticipated exactly this. Its backlog line for the workspace `state` column (2026-07-28) assigned the archive story's trigger to *"S1.9 at the earliest, since delete and archive answer neighbouring questions about a trip's end of life"* and required whoever pulled it to **decide whether archive is MVP at all** before writing the column. It is; the column ships here.

**Consequence accepted, stated plainly:** nothing in the product can destroy a trip. A mis-created trip is archived, never removed. Pre-alpha the answer to "get this row out of my database" is psql — the same answer S1.7 accepted for a mis-tapped transition. The parked backlog line carries the trigger.

## Goal

The owner can take a trip out of circulation — archived: present, readable, restorable, and frozen against every act on the trip itself. Members keep their membership and can still leave; nothing is destroyed and nothing is evicted. Unarchive is the way back. This is the first story in the product that freezes a whole trip, so the fence is built once, explicitly, with a test that enumerates it.

## Locked decisions *(grilling 2026-07-28, in decision order)*

### 1 · Archive, not destruction — and delete parks

Founder ruling, first decision of the session. Rejected on the record: **hard delete** (the shape the schema anticipated — V7's `day` and V8's `edit_lease` already carry `ON DELETE CASCADE` naming S1.9) and **soft delete** (a `deleted_at` filter every read path can forget — the default-by-omission pattern Artifact 03 rejects for authorization and S1.5 cited when refusing membership tombstones).

The hard-delete case that was *not* taken, recorded because it will be re-litigated: destruction would have collided with `ownership_transfer`, which V10's own header names as surviving account-deletion anonymization so that *"the creator of any itinerary is derivable forever"*. Archive sidesteps that conflict entirely — nothing is destroyed, so nothing needs reconciling.

**The parked delete line's trigger:** *the first real request to permanently remove a trip, or the pre-alpha data-cleanup pass* — whichever comes first. Archived is the natural gate for it if it ever ships (archive → destroy, the two-step), which is why the `DELETE` verb is deliberately left unspent (decision 7).

### 2 · `archived` lives on `workspace.state`, projected onto the itinerary read model

Canon's placement (02's Trip Workspace machine), against the fact that every act in this product is **itinerary**-addressed (S1.5 kept "workspace ids off the wire"). The 1:1 is guaranteed by S1.1's atomic formation, so the split is safe: the workspace stores it, the itinerary read model exposes it.

**Rejected: a fourth itinerary state.** `archived` is *orthogonal* to the itinerary machine's terminal `published` — an archived-then-published trip has no single correct value — and two orthogonal facts in one enum is a permanent error under ADR-008. It would also need a backward edge on a machine S1.7 made forward-only.

### 3 · The archive check is a sibling of the guard, never inside it

The guard answers **who you are**; archive answers **what's allowed now**. Widening the guard's contract to carry writability would make it the place every future gate accretes — and it is stop-rule territory besides. The check takes the `Membership` the guard already resolved and is called explicitly (decision 11).

### 4 · The fence: acts on the trip freeze; acts on your own membership do not

Canon says `archived` is *"fully read-only storage — no writes of any kind"*. Taken literally that also freezes membership, which the founder corrected at the grilling: *"they should be able to leave an archived itinerary anytime, but it's not mandatory — like when an itinerary is archived, they will be automatically kicked out."* The line that survives is a **rule, not an exception**: acts on the trip freeze, acts on your own relationship to it do not.

| Act on an archived trip | Outcome |
|---|---|
| Itinerary field edit (`PATCH`), day CRUD/reorder, activity CRUD/move | **refused** — `TRIP_ARCHIVED` |
| Lifecycle (`POST /start`, `/complete`) | **refused** |
| Edit lease acquire / renew | **refused** (any live lease was released at archive — decision 12) |
| Invitation send / revoke | **refused** |
| Remove **another** member | **refused** — an act on the trip's roster |
| **Leave (self-removal)** | **allowed, always** |
| Ownership offer / accept / decline / revoke | **refused** — governance moves on a live trip; unarchive first |
| `POST /archive`, `/unarchive` | the owner's way in and out |

**No automatic eviction.** Memberships are untouched by archive: the roster survives, so unarchive restores a working trip rather than an empty one. (Voiding pending *invitations* — decision 13 — does not conflict: an invitation is an unaccepted offer to join, not a membership.)

**Rejected:** a general "governance stays open" carve-out — a category needs a rule and rules accrete exceptions ("is *my* op governance?"); the self-membership line is narrower and states itself. **Rejected:** the fully literal freeze — a non-owner member would have no act available at all and no way to unarchive, leaving them stuck on someone else's decision.

**The residue, named rather than discovered later:** the **owner** cannot leave their own archived trip. INV-4 and S1.5's `OWNER_CANNOT_LEAVE` are unchanged, the owner's exit is still transfer-first (S1.6), and transfer is refused while archived — so the path is unarchive → transfer → the new owner may re-archive. Coherent, and the owner always holds the lever.

### 5 · Unarchive ships; canon's "deliberately absent" is amended with its reason

02 records *"unarchive is deliberately absent from v1; add only if real usage demands it."* That held while archive was one of two end-of-life acts. It does not hold now: **archive is the only one** (decision 1), so a mis-tap goes from cosmetic to total — a one-way freeze with no destruction and no undo leaves psql as the only recourse for a trip's entire existence. Decision 4's fence and unarchive are a package; neither ships without the other.

### 6 · The state column: canon's three values, nothing else

`workspace.state` ships as `ACTIVE | COMPLETED | ARCHIVED` — 02's machine, verbatim. **Register #12 closes here**, after deferring S1.2 → S1.7 → S1.9 on the discipline "the column ships with the first story that reads a state value." This story is that reader: the fence reads it, the list filter reads it.

**Rejected: `archived_at`.** S1.7's write-once stamps shipped because they are **attribution of an unrepeatable fact** — a trip starts once, and not recording it destroys data retroactively. Archive is repeatable and reversible: it is a *current state*, not a historical event, so "when was this last archived" has no reader, no invariant, and no backfill problem when something finally asks. **Rejected: an archive event log** — refused twice already on this exact shape (S1.5's `membership_event`, S1.7's transition log).

### 7 · API — two action endpoints; the `DELETE` verb stays unspent

| Endpoint | Actor | Result |
|---|---|---|
| `POST /v1/itineraries/{id}/archive` | owner | **200** + updated itinerary — workspace `→ ARCHIVED` |
| `POST /v1/itineraries/{id}/unarchive` | owner | **200** + updated itinerary — workspace `→ ACTIVE \| COMPLETED` (decision 8) |

No request body — the act carries no data. Ladder, S1.5-ordered (**authority before state**): **401** unauthenticated · **404** guard-mask (non-member) · **403** `NOT_PERMITTED` (member, not owner — S1.6's envelope, per S1.7's correction that `NOT_TRIP_OWNER` is a class name and not a wire code) · **409** `ILLEGAL_STATE_TRANSITION` (archiving an archived trip; unarchiving a live one).

**Rejected: `DELETE /v1/itineraries/{id}` meaning archive.** It lies in the contract; it fights Artifact 05's *"DELETE → 204, always, idempotent"* (which cannot carry the 409 an illegal transition needs); and under ADR-008 it would **permanently spend the verb** the parked delete story is the natural owner of. **Rejected: a single toggle with a body** — S1.7 rejected the same machinery-over-fixed-cases shape at its decision 7.

### 8 · Archive is legal from any itinerary state

`draft`, `active`, or `completed` — all archivable. Canon's workspace machine lists *"skipping completed"* as illegal; **that line is amended**, because it would mean a cancelled draft — the single most likely real use of archive — could never be archived.

Unarchive restores the state the workspace held before: `COMPLETED` if the itinerary is `completed`, else `ACTIVE`. Since workspace state below `ARCHIVED` is derivable from the itinerary (decision 9's mirror is what keeps that true), unarchive recomputes rather than remembering — no "previous state" column.

### 9 · `/complete` mirrors `workspace.state = COMPLETED`, and a migration backfills

Canon's edge *"workspace: active → completed — mirrors the itinerary completing"* becomes live the moment the column exists. Without the mirror, `COMPLETED` is a value nothing ever writes — **documentation, not data** — and the first person to query `WHERE state = 'COMPLETED'` gets zero rows with no way to tell "no completed trips" from "this value is never written." That is the zero-rows trap this repo has hit three times (the `/gsi/button` watcher, S1.1's deploy probe, V4's would-be `WHERE role = 'owner'` index).

So S1.7's completion transaction gains the mirrored write (additive — a write, not a semantic change), and a migration backfills existing completed trips. **The backfill needs a migration-stepping IT** (`WorkspaceBackfillIT` is the pattern, on its own container, `.target(V(n-1))` → seed the legacy shape in raw SQL → `.target(V(n))` → assert): CLAUDE.md's rule is that a data migration is invisible to every test surface this repo owns — fresh-DB local, Testcontainers, CI all run it against zero rows and report success whether the SQL is right or a typo. Deployed `dev` holds completed trips from S1.7's verification right now.

**Not shipped: a backward mirror.** Nothing re-opens a completed trip (the itinerary machine is forward-only). Recorded so it is not a surprise if that ever changes.

### 10 · My Trips — archived trips filtered out, reachable in an archived view

`GET /v1/itineraries` gains `?archived=true`, defaulting to **false** — additive under ADR-008 because the default preserves today's behaviour exactly. The list is membership-scoped since S1.6, so this applies to owners and members alike, and the filter belongs in the **membership → itinerary-ids** step, not the keyset page: narrowing the id set leaves S1.6's `id < cursor` seek semantics untouched.

**Rejected: archived trips staying in the default list** — the reason to archive is a shorter list; an archive that doesn't tidy is not archive. **Rejected: hiding archived trips from members entirely** — that recreates, one level up, the exact failure S1.5 had to fix in copy: a trip vanishing with no explanation *"reads as data loss rather than a membership change"*.

Members see the state and a frozen surface; the archive/unarchive lever is the owner's alone (the S1.5/S1.6/S1.7 don't-advertise-dead-ends pattern). **Discovery is by pull**, per the standing founder ruling — no notification of any kind.

### 11 · The fence is one checker, proven by an enumeration test

One method takes the guard-resolved `Membership` and either passes or throws `TRIP_ARCHIVED`; every write path calls it. **Rejected: a scattered `if` per service** — a fence you must remember to build at every gate is Artifact 03's default-by-omission. **Rejected: an AOP annotation** — this codebase has no AOP, and S0.2's filter-ordering history says invisible interception in this stack fails in ways that name nothing.

The residual risk is honest: a *future* endpoint can still forget the call. The mitigation is **an IT that enumerates the write surface** — every mutating endpoint against an archived trip — and **it has two outcomes by construction**: all of them refuse, **except self-removal, which succeeds** (decision 4). That positive control is what makes it a check rather than a tautology — a fence test where everything returns the same thing cannot distinguish "correctly refused" from "endpoint doesn't exist" (the repo's indistinguishable-outcomes rule).

### 12 · Archive releases any live edit lease, transactionally

S1.5's reasoning, verbatim: safety needs nothing (the fence already refuses every write), this is about **the others** — without it the plan shows *"«X» is editing"* on a trip nobody can edit, for up to a TTL. It keeps a latent invariant true — **a lease exists only on a writable trip** — so no code reasons about the impossible case.

The existing `EditLeaseService.releaseHeldBy(itineraryId, travelerId)` filters by holder, which the archiving owner does not know; this story needs a **holder-agnostic sibling** (release whoever holds it), additive alongside it. **Unarchive does not restore the lease** — leases are ephemeral concurrency control, not domain state; whoever wants to edit acquires fresh.

**Rejected: refusing archive while a lease is held** — that hands any member a veto over an owner-only governance act, inverting ADR-014's rule (written for member-vs-member contention, never member-vs-owner).

### 13 · Pending invitations and offers void at archive, transactionally

Both are pending *acts* on a trip that is being taken out of circulation, and both are accepted by the **other** party — an invitee is not even behind the guard yet. Leaving them pending means either an inbox entry that can only ever fail (the dead-end pattern this repo refuses to advertise) or a new member/owner arriving on a frozen trip.

S1.6 built **`voided`** for exactly this — *the system's act*, distinct from the owner's `revoked` and the target's `declined` — and its trigger there (departure invalidates a pending offer) is the same shape. Ownership offers reuse it directly.

**Invitations need the value added**: the shipped enum is `PENDING → ACCEPTED | DECLINED | REVOKED | EXPIRED` (verified — no `voided` today). Adding `VOIDED` is additive and ADR-008-clean, and it preserves *why*: `revoked` means the owner changed their mind, `voided` means the system invalidated it. Collapsing them into `revoked` would lose that distinction permanently.

**No resurrection on unarchive.** An invitation is a point-in-time act by the owner; silently reviving it weeks later — possibly toward someone the owner has since thought better of — is worse than re-inviting, which S1.5 established as the zero-code path.

### 14 · Candidate-capability note *(ADR-009's standing duty — S1.9 is the first story bound by it)*

**None.** Archive and unarchive fail the potentially-gated test on its explicit exclusion: they are **governance** — role authority over a workspace the traveler already owns — and the amendment states that governance (owner-ness) belongs to Membership, never to a tier. They also create no entity and consume no meterable resource: the footprint after archiving is smaller, not larger.

Recorded as a negative rather than omitted, so the eventual wiring walk (ADR-009's amendment) sees a considered "no" instead of a gap.

### 15 · Analytics — one event per act

`itinerary_archived` · `itinerary_unarchived` — after-commit, per register #2's standing default set. No event on a 409.

## Backend scope

One additive migration: `state` on `workspace` (`ACTIVE | COMPLETED | ARCHIVED`, NOT NULL, existing rows resolved from their itinerary's state — the backfill of decision 9) — **no `DEFAULT`**, per the V3 gotcha this repo already paid for once, and the storage spelling is the enum **name** (V4's lesson) with a pinning test.

The workspace module gains the state read/write; a new archive operation lands in `membership`-style module placement resolved at the ticket (S1.5's precedent: the operation goes where it can reach both sides without closing an ADR-011 package cycle — it touches `workspace` (the row), `itinerary` (the lease), and `invitation` (voiding), so the cycle question is real and must be answered before code). `EditLeaseService` gains the holder-agnostic release. `InvitationStatus` gains `VOIDED`. `ItineraryController` gains the two POSTs; `ItineraryService` gains the transitions; the list query gains the archived filter. `TRIP_ARCHIVED` conflict envelope. The fence checker + its call sites. Events per decision 15.

## Mobile scope

Repository/typed-`apiClient` layer: archive + unarchive mutations (ADR-001 — no raw fetch) · My Trips defaults to unarchived, with an archived view · archived badge on the itinerary screen for everyone · owner-only archive/unarchive control · a frozen-surface treatment so refusals read as intentional rather than broken (the S1.5 copy lesson: name the cause) · `confirmWith` on both acts, platform-forked (the `Alert.alert` web-no-op gotcha) · queries invalidate after each mutation · web parity verified in the preview container.

## Acceptance criteria

| # | Criterion | Closed by |
|---|---|---|
| 1 | Archive: 200, workspace `ARCHIVED`; ladder 401 · 404 non-member · 403 member (`NOT_PERMITTED`) · 409 on an already-archived trip | IT |
| 2 | Archive is legal from `draft`, `active` **and** `completed` — three trips, three 200s | IT |
| 3 | Unarchive: 200, and the restored state is `COMPLETED` for a completed itinerary, `ACTIVE` otherwise; 409 unarchiving a live trip | IT |
| 4 | **The fence, enumerated with a positive control:** every mutating endpoint refuses on an archived trip with `TRIP_ARCHIVED` — **except self-removal, which succeeds** (one test, two outcomes) | IT |
| 5 | **No eviction:** archive leaves every membership row intact; unarchive yields a working trip with the same roster | IT |
| 6 | Lease released: a member holds a live lease → owner archives → the lease row is gone; unarchive does not restore it | IT |
| 7 | Pending invitation and pending ownership offer both `VOIDED` at archive, transactionally; neither returns on unarchive | IT |
| 8 | The mirror: `POST /complete` sets `workspace.state = COMPLETED` | IT |
| 9 | **The backfill, on its own container:** migrate to V(n−1), plant a completed itinerary + its workspace in raw SQL, migrate to V(n), assert the mirror — **and prove the test can fail** (sabotage it, per S1.1's rule) | Migration-stepping IT |
| 10 | Storage: the DB holds `'ARCHIVED'` (enum-name spelling — the V4 lesson) and the column has no `DEFAULT` | IT (storage) |
| 11 | List: archived trips absent from `GET /v1/itineraries`, present with `?archived=true`; keyset paging unaffected across both | IT |
| 12 | Events after commit only, one per act, none on a 409 | IT |
| 13 | Device (dev build, pool accounts, tags stated): **t1 = owner, t2 = member.** t1 archives — confirm-cancel leaves it live, confirm-accept archives; the trip leaves both accounts' default My Trips and appears in the archived view for both; t2 sees the archived state and **no** archive control; t2 can still leave; t1 unarchives and the trip returns | Device AC |
| 14 | Web preview container: archive and unarchive driven as t1 with CDP-intercepted confirm (cancel and confirm both), and an attempted plan edit on an archived trip shows the frozen treatment, not a generic error | `drive-preview.js` |
| 15 | Post-merge on deployed `dev`: one archive → unarchive loop via a pool account; the SQL check **names the `railway` database** and reads `workspace.state` at each step | Deployed-dev probe |

**Deliberate omissions, on the record:** permanent deletion in any form (parked, decision 1) · `archived_at` or any archive history (decision 6) · notification of archive to members (pull, standing ruling) · auto-eviction of members (decision 4) · unarchive by anyone but the owner · a "previous state" column (unarchive recomputes, decision 8) · a backward `completed → active` mirror (decision 9) · bulk archive.

## Out of scope

Publish + visibility (S4.1, register #11) · permanent delete (parked backlog line) · account deletion / anonymization (S5.5) · the entitlement seam (S1.8) · any change to guard semantics, INV-4, or ledger.

## Comments

*(none yet — implementation notes append here)*
