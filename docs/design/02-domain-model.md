# 02 · Domain Model — Largata  `[PRODUCTION DEPTH]`

**Architect's question:** *What are the true entities, what are the rules that must always hold, and where are the consistency boundaries?*

_Derived from Artifact 00 (§3–4) and the working sessions. Status: **proposed — pending founder ratification.** Open items are marked `OPEN → register #N` inline; they are transition/policy details that do not block the model's structure, but must be resolved before the story that touches them ships._

---

## Glossary — the ubiquitous language  `OPEN → register #3 (UX confirms nouns canonical)`

| Term | Precise meaning |
|---|---|
| **Traveler (User)** | An authenticated account. The sole platform actor in v1. |
| **Handle (@username)** | The Traveler's unique, changeable public label (`@janedoe`): 3–20 chars, lowercase, globally unique. **A label, never a key** — ids remain the identifier everywhere, which is what makes free change safe (ADR-015). Distinct from **display name**, which stays non-unique. *(Added 2026-07-30, S4.0 grilling — supersedes the 07-17 "no handles in MVP" ruling.)* |
| **Visitor** | An unauthenticated reader. Strictly read-only (INV-3). Not an entity — an access level. |
| **Itinerary** | The plan: a standalone, forkable, publishable object owning Days and their Activities. |
| **Day** | One ordinal slot of the plan (Day 1…N), optionally titled ("Arrival & Sunsets"). Owns its Activities and their order. Plans are **day-indexed, not date-anchored** (ADR-013); when the itinerary has dates, a Day's calendar date is derived, never stored. *(Added at the S1.3 grilling, 2026-07-23.)* |
| **Activity** | One element of a Day's plan — transport, meal, stay, sight, anything scheduled. The name reads narrower than it means, deliberately *(renamed from **Itinerary Item** at the S1.3 grilling, 2026-07-23 — founder call: the UI says "Activity" and canon follows; the wire noun is permanent within /v1, accepted knowingly in ADR-013)*. Carries a `source`. |
| **Fork Relationship** | Provenance record: this Itinerary was copied from that one. |
| **Trip Workspace** | The private collaboration space around one Itinerary: membership, decisions, ledger. *(Comments removed 2026-07-24 — see **Comment**.)* |
| **Membership** | A Traveler's role in one Workspace: `owner` or `member`. |
| **Ownership Offer** | The owner's pending proposal to hand their Workspace's ownership to a named member. At most one pending per Workspace; accepting it executes the transfer (INV-4). Ownership moves by consent, never imposition. *(S1.6, 2026-07-28.)* |
| **Decision / Vote** | A poll within a Workspace (where to eat, which hotel); one vote per member (INV-10). |
| **Comment** | Public discussion attached to a **published** Itinerary — one meaning only (rules `OPEN → register #5`; builds at S4.6, after publish exists). **There are no planning/private comments** *(removed 2026-07-24, S1.4 grilling — founder ruling: trip groups coordinate in their own channels; in-app private discussion duplicates them without value)*. |
| **Review** | A post-trip assessment attached to a published Itinerary. Rules `OPEN → register #4`. |
| **Star / Upvote** | A lightweight reaction on a published Itinerary. |
| **Diary** | A first-class album: one author-owner, consented contributors, references one Itinerary. |
| **Diary Entry** | One contribution (text/photos/geotag) inside a Diary, by an identified contributor. |
| **Highlight** | A published Diary as surfaced on its published Itinerary. A projection, not a separate entity. **Never** the creator-listed selling points on a published plan — those are **Standouts**. |
| **Standout** | A creator-listed selling point on a published Itinerary ("Big Lagoon Kayaking"): an ordered list of short free-text strings, edited under the header lease, rendered on the published Overview. **Builds at S4.1** *(term reserved at the S1.3 grilling, 2026-07-23, because the 07/18 mock labeled these "Trip Highlights", colliding with **Highlight** above)*. |
| **Ledger** | The Workspace's money record: Expenses, Splits, Transfers. Append-only (INV-8). |
| **Expense** | A cost incurred on the trip, split across members (INV-7). Contributes to trip total. |
| **Transfer** | A settlement / waiver / reassignment between members. Changes balances, never the trip total. |
| **Invitation** | An email invite into a Workspace; the co-traveler onboarding path. |
| **Discovery** | The surface for browsing/searching **published Itineraries** (E4; UX flow 5). Never means finding places or activities — that is Place Search. *(Added 2026-07-17, UX reconciliation — the two were colliding in conversation.)* |
| **Place Search** | *Reserved term, future phase (register #9):* searching destinations/POIs **inside the app** to build a plan. Not the unfurler (which enriches a link the traveler already found elsewhere) and not in MVP scope. |
| **Active (workspace)** | The `WorkspaceState` value a live (non-archived) trip holds — what the workspace screen's status chip renders (S4.9). **Never** the dormant itinerary-lifecycle `active` (S1.7, UI removed at the E1 gate): the words collide, the concepts must not. *(Added 2026-07-31, trip-surfaces reconciliation.)* |
| **In-trip Chat** | *Reserved term, S4.10:* workspace-scoped conversation among members during planning. Not the deleted private Comment (2026-07-24 — stays deleted) and not the public Comment (S4.6). Entered launch scope 2026-07-31, reversing the no-planning-conversation ruling on the record; UX flow + grilling due before elaboration. |
| **Visibility (itinerary)** | The itinerary's audience fact, **orthogonal to its dormant lifecycle**: `private` (owner + collaborators — INV-1) or `published` (everyone). Binary — unlisted deleted; `friends_only` reserved as a future additive value awaiting the friend graph. Publish/unpublish flip it — the owner's act, allowed from any lifecycle state (ADR-017). The **audience ladder** puts archive above it: an archived trip is owner-only-visible regardless of visibility — archive dominates publish. *(Added 2026-07-31, S4.1 grilling.)* |
| **Creator Tips** | The Activity's `notes` field, re-semanticized at S4.1 *(2026-07-31, founder-ruled — supersedes S1.3's private planning semantics; ADR-008 waiver)*: per-activity guidance for the trip itself ("book the 8 AM slot"), **public when the itinerary publishes, copied on fork** (plan data under INV-6). Distinct from **planning notes** — private member coordination, never built, parked on the epic-map backlog (S4.10's chat likely covers it). |

---

## High-level flow — the journey (per actor)

**Traveler (organizer):** sign up → create Itinerary (scratch or fork) → invite co-travelers → Workspace forms → collaborate (days + activities, decisions — plan editing is leased per subject: activity, day, or itinerary header; ADR-014 as amended 2026-07-31) → **publish at will — any point from creation onward** *(ADR-017, S4.1: the projection leaks no dates or state, so publishing before or during the trip is safe)* → trip runs (diary + expenses accrete) → trip completes → reviews.

**Traveler (co-traveler):** receive email invite → authenticate → land in Workspace as member → collaborate, vote, log expenses, contribute to consented diaries → review after completion.

**Traveler (consumer):** browse/discover published Itineraries → view plan, Highlights, aggregate cost → star, comment, review → **fork** → become an organizer. *The loop closes: consumption feeds creation.*

**Diary author (any of the above):** create Diary referencing an Itinerary → grant contributors → entries accrete (including mid-trip) → publish at will — **including while the trip is live** (live-trip sharing is a diary behavior, not an itinerary state). A published diary on a still-private itinerary surfaces via the author's profile/feed only; it becomes a Highlight when the itinerary publishes. `OPEN → register #13 (confirm surface)`

**Visitor:** view published content, including reviews and comments. Nothing else (INV-3). *(Unlisted deleted at S4.1 — visibility is binary; accountless reach itself arrives with the backlogged web read-only surface, until which "the public" means signed-in Travelers.)*

---

## Entities & key attributes

| Entity | Key attributes | Purpose |
|---|---|---|
| **Traveler** | id, email, display name *(non-unique — a human label, never an identifier or lookup key; S0.2)*, **handle** *(unique, changeable label — still never a key: ids stay the identifier everywhere; ADR-015, S4.0)*, auth identity, **profile** *(S4.0: avatar — Google-imported v1, upload activates at S3.3 · bio · country · preferred currency — the default for E5 expense logging; no FX anywhere · home city · goals · interests · onboarding-completed marker)* | The account. Goals/interests/bio are **knowingly reader-less until E4/E5** *(S4.0 grilling, 2026-07-30 — collected deliberately ahead of a consumer; "Earn from my itineraries" is analytics signal only)*. Deletion = **anonymization**: PII erased — the S4.0 profile fields (avatar, bio, home city, handle) are PII and erase with it; ledger entries and ownership-transfer records survive anonymized (reconciles with INV-4/8). |
| **Entitlement** | traveler id, tier (`free \| subscriber`), source, status | The capability flag the entitlement service resolves — `can(traveler, capability, context?)`; the optional context (e.g. a workspace) keeps the unit-of-entitlement question (per-person vs per-workspace, register #14) open without touching call sites later. v1: everyone `free` with full access. Billing itself is owned by the platform stores (Epic 7, ADR-009); money is never modeled in the domain. Standing rule: entitlements gate capabilities, never existing data. A **capability** is a gateable *act* — it grows the traveler's footprint (creates entities or consumes a meterable resource); never access to existing data, and never governance (role authority — owner-ness — belongs to Membership, not the tier). *(Seam parked out of E1 2026-07-28 → ships at register #14's decision; ADR-009's amendment carries the candidate map.)* |
| **Itinerary** | id, owner id, title, destination(s), description, date range *(optional metadata — the plan's structure is its Days, ADR-013; **no span↔day-count invariant** — stays decoupled permanently: resolved at S4.1, the projection derives duration from day count and the span never crosses the wall)*, **visibility** (`private / published` — binary, orthogonal to lifecycle; unlisted deleted, `friends_only` reserved additive — ADR-017, S4.1), **state** *(the dormant lifecycle)*, lifecycle stamps (`started-at` / `completed-at` — write-once at each transition, recording the owner's *act*, not travel; the plan's dates carry the traveled-when claim — S1.7; **never on the projection**), **publish metadata** *(S4.1: Standouts — ordered short strings · best time of year — short free text · cover reference — null until S3.3 activates upload; all header-lease-guarded)*, fork lineage (via Fork Relationship), **published aggregate cost** (derived; until E5's ledger, the projection shows the derived estimated total of activity costs, single-currency only — S4.1), last-edited (by, at — never on the projection) | The plan. The forkable/publishable unit. |
| **Day** | id, itinerary id, ordinal (contiguous 1…N — deletion renumbers), optional title | One slot of the day-indexed plan (ADR-013). When the itinerary has dates, Day N's calendar date is *derived* (start + N−1), never stored. *(S1.3, 2026-07-23.)* |
| **Activity** | id, day id, sort order *(manual, authoritative — time is display metadata)*, title, optional time-of-day *(local, timezone-free)*, optional estimated cost (amount + currency — **creator-stated, uninterpreted**: not per-person, not verified; the meaning is the creator's own framing — S4.1), place *(free text in v1 — geotag arrives with Place Search, epic-map backlog)*, description, notes *(**Creator Tips** — public on publish, copied on fork; re-semanticized at S4.1, 2026-07-31, superseding S1.3's private planning semantics; ADR-008 waiver — see glossary)*, one optional external URL, unfurled metadata (image, description, price…), last-edited (by, at), **source: `manual \| link_unfurl \| api:<provider>`**, type | One plan element *(renamed from Itinerary Item, S1.3)*. **Estimated cost is planning money, never ledger money** — it feeds no balance and no INV-7/8 path; the ledger stays the only record of actual spend. `type`/`source` are canon shape but **defer as columns to their first reader** (E6/E4 — the S1.2 state-column discipline). The `source` field is the designed upgrade path: v1 = manual + link_unfurl (share-sheet/paste → server-side unfurler, Tier 1 OG + Tier 2 JSON-LD, graceful degradation to bare link); **v1.5 candidate** = in-app webview capture (same `link_unfurl` pipeline, nicer front door); **future** = `api:<provider>` search (register #9). |
| **Edit Lease** | itinerary id, **subject** (`header \| day \| activity` + subject id), holder traveler id, expires-at | The single-writer lock on plan editing, **per subject** (ADR-014 as amended 2026-07-31; S1.4 shipped it whole-itinerary, S4.9 re-scopes it): the header lease guards the itinerary's fields, a day lease the day's title and deletion (never its activities), an activity lease that activity's edits and deletion. Adds are unguarded; reorder is version-checked, not leased. An expired row counts as no lock; renewal pushes expiry while the holder's edit surface is open. Never force-taken, owner included. Holder identity is readable (additively, pull-based) for the advisory "being edited by" indicator — never presence. A concurrency control, not domain history — carries no audit meaning (that is the Activity History Entry's job). |
| **Activity History Entry** | id, itinerary id, actor traveler id, act (`create \| edit \| delete \| reorder`), subject (day/activity + id), at | Append-only change log of plan writes. **Capture ships at S4.9** — pulled ahead of its reader because capture cannot be backfilled (the S1.3 attribution rule generalized); the reading surface ships at S4.10. *(The flow-12 publish-scrub feed obligation was **discharged at S4.1, 2026-07-31** — superseded by the live-projection preview, which is WYSIWYG scrubbing by rule (ADR-017); history's readers are S4.10's surface and E4's social-proof signal.)* |
| **Fork Relationship** | id, source itinerary id, forked itinerary id, forked-at | Provenance (INV-6). Plan data only crosses. |
| **Trip Workspace** | id, itinerary id (1:1), state | The collaboration shell and access-control boundary (tenancy §03). |
| **Membership** | workspace id, traveler id, role (`owner \| member`), joined-at | Exactly one `owner` per workspace at all times (INV-4). |
| **Ownership Offer** | workspace id, target traveler id, offered-at, status (`pending → accepted \| declined \| revoked \| voided` — all terminal; re-offer = a new row; at most one `pending` per workspace) | Consent-gated ownership transfer (S1.6 — offer/accept, never unilateral: acceptance is what guarantees the new owner knows they hold INV-4's load-bearing role). The target must be a member; departure voids a pending offer transactionally (`voided` — the system's act, distinct from the owner's `revoked` and the target's `declined`). |
| **Ownership Transfer** | id, workspace id, from traveler id, to traveler id, transferred-at | The durable record of ownership moving (INV-4); survives account-deletion anonymization (01 Compliance). Written at accept, in the transfer transaction. The creator of any itinerary is derivable forever: the earliest transfer's `from`, else the current owner. `kind` (claim) arrives with E5/S5.5. |
| **Invitation** | workspace id, email, status (`pending → accepted \| declined \| revoked \| expired \| voided` — all terminal; re-inviting = a new row; at most one `pending` per workspace+email; `voided` = the **system's** act — archive voids pending invitations, S1.9 — distinct from the owner's `revoked`, the same three-way split Ownership Offer made first) | Email-invite onboarding. **Issued by the workspace owner only** *(S1.2 grilling, 2026-07-20 — role authority, not an entitlement; widening to members would be additive)*. Accepting = authenticate + join as member — **requires the accepting account's *verified* email to match the invited address** (case-insensitive; Google sign-ins arrive pre-verified; unverified email/password accounts must verify first — without the verified check, email-match is theater: anyone can *claim* an address at Firebase sign-up). **No bearer token:** the email is a pure notification; the in-app invitation inbox is the accept surface — a magic-link join is an additive post-validation option. *(S1.2 grilling, 2026-07-20.)* |
| **Decision** | id, workspace id, question, options, status | A poll. |
| **Vote** | decision id, member id, option | One per member per decision (INV-10). |
| **Comment** | id, published itinerary id, author id, body | Public surface only (S4.6; rules `OPEN → register #5`). No planning/private variant *(removed 2026-07-24)*. |
| **Review** | id, published itinerary id, author id, body, rating | Post-trip assessment. Who/how-many/editable: `OPEN → register #4`. |
| **Star** | published itinerary id, traveler id | One reaction per traveler per itinerary. |
| **Diary** | id, **author-owner id**, itinerary id (reference), title, state (`private / published`) | The album (INV-2a, 5). |
| **Contributor Grant** | diary id, traveler id, granted-at | Owner-consented contribution right. |
| **Diary Entry** | id, diary id, contributor id, body, media, geotag, timestamp | One lived moment. Contributor must hold a grant. |
| **Expense** | id, workspace id, payer member id, amount, currency, description, timestamp | A trip cost. Splits must sum to amount (INV-7). Counts toward trip total. |
| **Split** | expense id, member id, share amount | Who owes what for one expense. |
| **Transfer** | id, workspace id, type (`settlement \| waiver \| reassignment`), from/to member, amount, timestamp | Balance movement between members. **Never** changes trip total. Append-only with everything else (INV-8). |

---

## Aggregates & consistency boundaries

- **Itinerary aggregate** — root: Itinerary; inside: Days and Activities. **Strong consistency within** (day-ordinal contiguity, activity ordering, edits). Collaborative editing is **leased per subject — activity / day / itinerary header** (ADR-014 as amended 2026-07-31 at the trip-surfaces reconciliation; originally whole-itinerary, 2026-07-24 — both supersede the 07-17 last-write-wins ruling that S1.3 shipped), with adds unguarded, reorder version-checked, and `last edited by/at` attribution on Itinerary and Activity retained (S1.3). Live editing is the declared post-gate replacement. Carries visibility, lifecycle state, fork lineage. Exposes: **published aggregate cost** — a *derived value* computed from its Workspace's ledger (**expenses only, transfers excluded**), live-derived (a late expense updates it), and **the only ledger fact that ever crosses the boundary** (INV-2).
- **Trip Workspace aggregate** — root: Workspace; inside: Memberships, Invitations, Ownership Offers + Ownership Transfer records (S1.6), Decisions+Votes *(Comments removed 2026-07-24 — Comment is public-only, attached to published Itineraries, S4.6)*, and the **Ledger as a bounded module** (Expenses, Splits, Transfers — own tables, own service interface, touched only through it; promotable to its own aggregate/service in the payments phase by addition). **Strong consistency within** — INV-4, 7, 8, 10 are enforced here, transactionally.
- **Diary aggregate** — root: Diary; inside: Contributor Grants, Diary Entries. Owner-consistent (INV-2a, 5). **References** its Itinerary by ID — never contained by it.
- **Cross-aggregate rules:** references by ID only; eventual consistency across (stars, feed, discovery counts may lag seconds — recorded in 01's NFRs). Reviews, Stars, and Comments attach to *published* Itineraries. Fork copies Itinerary-aggregate data only (INV-6).

---

## Invariants (normative — restated from Artifact 00 §4, attached to their owning aggregate)

**Workspace aggregate**
- **INV-1.** Only members view/modify a non-published Workspace's contents; an **archived** Workspace narrows further, to the owner alone *(the audience ladder — S4.1/ADR-017, 2026-07-31)*.
- **INV-4.** Exactly one owner at all times; ownership transfers or is claimed — never vanishes.
- **INV-7.** Σ(splits) = expense total, always, transactionally.
- **INV-8.** Ledger is append-only: corrections/waivers/settlements/reassignments are new Transfer entries. Nothing silently edited or deleted.
- **INV-10.** One vote per member per decision; members only.

**Itinerary aggregate**
- **INV-2.** Publishing exposes: the plan (Creator Tips included), its publish metadata (Standouts, best time, cover), its published diaries (Highlights), creator-stated estimated costs with their derived single-currency total, aggregate trip cost (E5), and **the owner's public identity** — the byline, resolved to the *current* owner at render (S4.1). Never: ledger detail, raw diaries, the roster, per-field edit attribution — **and never anything that reveals current or future absence: no absolute dates, no lifecycle state, no lifecycle stamps** *(the absence rule — S4.1/ADR-017; binds every future projection surface: diary-entry recency inherits it, register #13)*.
- **INV-6.** Every fork records provenance; forked content is plan data only.

**Diary aggregate**
- **INV-2a.** One author-owner; contribution requires the owner's grant; publication is the owner's sole act.
- **INV-5.** Every Diary references exactly one Itinerary; every entry has an identified, granted contributor.

**Platform-wide**
- **INV-3.** Visitors are strictly read-only; all interaction requires an account.

---

## State machines

### Itinerary
**Two orthogonal machines** *(split at S4.1, 2026-07-31 — ADR-017; formerly one four-state chain)*: the **dormant lifecycle** `draft → active → completed`, and the **visibility fact** `private ⇄ published`.

**Lifecycle** *(dormant — see the ⚠ note)*:

| From → To | Trigger |
|---|---|
| draft → active | **Owner explicitly starts the trip** *(register #10 resolved 2026-07-28, S1.7 grilling: owner-explicit, confirm-guarded; a past start date nudges — pull-based, client-side — **never automatic**. Stamps `started-at`.)* |
| active → completed | **Owner marks complete** *(same resolution: explicit only; a past end date nudges. Stamps `completed-at`.)* |

**Visibility** *(S4.1, ADR-017)*:

| From → To | Trigger |
|---|---|
| private → published | **Owner publishes** — allowed from any lifecycle state, creation onward; frozen while archived (the S1.9 fence) |
| published → private | **Owner unpublishes** — the page masks to not-found; social objects hide, never delete; forks survive |

**Semantics:** `completed` **gates nothing — permanently** (S1.7 designed it so; S4.1 retired it as a gate, ADR-017): its remaining reader is E4's social-proof signal, a display fact. Lifecycle transitions are forward-only, so the stamps are write-once facts. A trip that ended while still `draft` passes through `active` — two deliberate acts, no skip edge. Visibility flips freely, both directions, the owner's act; the projection is live and rule-scrubbed (INV-2), so publishing before or during a trip leaks nothing — the absence rule keeps dates, state, and stamps off the page. *("Live sharing is a Diary behavior" survives as a statement about diaries — it no longer gates publish.)*

> **⚠ `active` and `completed` are DORMANT — no UI surface, pending S4.1** *(founder ruling 2026-07-29, on sight of the shipped S1.9 build; epic-map backlog carries the full entry and the work)*. The founder's reading, which canon adopts as the open question: **the itinerary's lifecycle is `draft → published`**; `active` and `completed` are *statuses* — optional labels of the same family as `archived` — not stages every plan passes through. Nothing reads either value (S1.7 designed `completed` to gate nothing; S1.9 confirmed no branch exists), and `completed`'s real value is reframed as a **usage signal for E4** ("how many forkers actually travelled this"), not a gate. The transitions above therefore stand **on the wire and in the data** — ADR-008 makes shipped /v1 semantics permanent, and the stamps are attribution, which the S1.3 rule says never to defer — but their **client surface is removed**: no lifecycle banner, no date nudge, no state badge. **S4.1 decides whether publish gates on `completed` at all, or hangs directly off `draft`** — and must also answer register #11's absence-leak constraint, which is what made the live `active` state a safety question rather than only a modelling one. **Resolved 2026-07-31 (S4.1, ADR-017): publish gates on nothing — visibility is orthogonal to the lifecycle; `completed` is retired as a gate; the absence leak is answered structurally by the projection's absence rule (INV-2).**
**Illegal:** skipping a lifecycle state (`draft → completed`) · any backward lifecycle transition. *(The former "publishing from `draft`/`active`" prohibition and register #11's backward-transition question both resolved at S4.1: publish is not a lifecycle transition at all — ADR-017.)*

### Trip Workspace
**States:** `active → completed → archived` — active from creation (formation is atomic with the itinerary, S1.1). *(Register #12 resolved 2026-07-20 at S1.2's grilling: `forming` is collapsed — no behavior anywhere branches on it (INV-1 gates on membership, not state), and every backfilled pre-E1 workspace is solo-owner yet actively in use, so it would have been born in a factually wrong state.)* *(The `state` column deferred S1.2 → S1.7 → S1.9 and **ships at S1.9** — the archive story, its first true reader; the recursive deferral ends. S1.9 grilling, 2026-07-28.)*

| From → To | Trigger |
|---|---|
| active → completed | Mirrors the itinerary completing *(the mirror is written by the completion transaction, live from S1.9; S1.9 also backfills pre-existing completed trips)* |
| active / completed → archived | **Owner's explicit act only — never automatic.** *(S1.9: archivable from any itinerary state — the "skipping completed is illegal" line was amended, because a cancelled `draft` trip is archive's single most likely real use.)* |
| archived → active / completed | **Unarchive — owner's explicit act.** Restores the state derivable from the itinerary (`completed` ↔ `COMPLETED`, else `ACTIVE`); no "previous state" is stored. *(S1.9, 2026-07-28 — supersedes "unarchive is deliberately absent from v1": archive became the **only** end-of-life act when delete parked, so a one-way freeze would make a mis-tap total rather than cosmetic, with psql the only recourse. Unarchive and the write fence are a package.)* |

**Semantics:** `completed` is the **working afterlife** — ledger still accepts Transfers (post-trip settling), reviews get written, diaries publish. `archived` freezes **acts on the trip** — plan edits, lifecycle, invitations, offers, removal of others, **publish/unpublish (S4.1)** — while **acts on one's own membership survive**: a member can always leave (founder ruling, S1.9 grilling: the line is a rule, not an exception — your relationship to the trip stays yours). **Archived also hides the trip from everyone but the owner** *(the audience ladder — S4.1/ADR-017, 2026-07-31, superseding S1.9's "archive evicts nobody" **sight** while the memberships themselves stay untouched)*: members' lists exclude it, their reads mask to not-found, and a published trip's public page goes down — **archive dominates publish**. Unarchive restores a working trip **and the prior audience, the public page included**. Self-leave stays permitted on the wire (ADR-008) but is unreachable from UI while hidden — accepted on the record. Pending invitations and ownership offers are `voided` transactionally at archive and never resurrected. The owner cannot leave an archived trip (INV-4, transfer-first — and transfer is frozen too): the path is unarchive → transfer.
**Illegal:** skipping a state on the forward edges · archive/unarchive by anyone but the owner.

### Diary
**States:** `private → published` — the author's sole act (INV-2a), permitted at any point including mid-trip. Published diaries surface as Highlights once their itinerary publishes; before that, via the author's profile/feed only (`OPEN → register #13`).

---

## Open items in this artifact

| Register # | Item | Blocks |
|---|---|---|
| 3 | Glossary nouns confirmed canonical (UX) *(drift observed 2026-07-17: UX artifacts say "User" and "workspace leader" — canon remains **Traveler** and **owner**)* | Nothing structural; naming in code |
| 4 | Review rules: who, how many, editable *(UX proposal on record, 2026-07-17, flow 11: eligible = confirmed members of a **completed, forked** workspace; the review lands on the **original** published itinerary; dimensions overall/accuracy/pacing/value + optional photos)* *(enriched 2026-07-27, S1.5 grilling: membership rows are **hard-deleted** at removal/leave, so "was a member" has no durable record after departure — if eligibility needs membership-at-completion, S4.5 must capture that fact itself (e.g. snapshot at completion) or gate on something that survives)* | The review story |
| 5 | Public-comment surface details *(UX inputs 2026-07-17, flow 9: threaded replies, report action, creator badge; public comments are **not copied on fork**)* *(enriched 2026-07-24, S1.4 grilling: the founder's published-itinerary mock is design input — five-tab view, flat comment list + composer, one threaded "(Creator)" reply; digest archived in `docs/plans/S1.4-itinerary-edit-lock/`. Comment is now **public-only** — the private half was deleted at the S1.4 re-scope, so this register owns the entire comment surface.)* | The public-itinerary story |
| 10 | ~~draft→active trigger (owner-start vs date)~~ **Resolved 2026-07-28 (S1.7 grilling): owner-explicit for both transitions, the date as a pull-based client-side nudge — never automatic.** *(The UX input — 2026-07-17, flow 11 — supported exactly this.)* | ~~The itinerary lifecycle story~~ closed |
| 11 | ~~Edit-after-publish policy (freeze / unpublish / version)~~ **Resolved 2026-07-31 (S4.1 grilling — ADR-017): publish = a binary visibility flip (`private ⇄ published`) on the one itinerary, a live rule-scrubbed projection — no snapshot, no versioning, no lifecycle gate; symmetric unpublish (hidden-not-deleted, forks survive); the safety constraint answered structurally by the absence rule (no dates/state/stamps on the projection — INV-2); metadata: Standouts + best time ship, tags → S4.3, cover field → S3.3; notes = Creator Tips (public, forked); est-vs-actual: creator-stated derived total now, ledger actual joins at S5.4; the audience ladder re-rules archive sight (owner-only). Spec: `docs/plans/S4.1-publish/spec.md`.** *(Enrichment history, kept for the record:)* *(enriched 2026-07-17: UX flow 12 proposes **snapshot-publish** — a new public itinerary copied from the workspace, private data scrubbed; rationale = protect member data, though INV-2 achieves that by rule rather than by copy. Flow 6 separately shows publish-from-creation. Resolve transition-vs-snapshot-vs-two-modes at the publish story, together with publish metadata (tags/trip type/cover image) and the est-vs-actual cost question — INV-2's aggregate is live-derived, which a frozen snapshot cannot be)* *(enriched again 2026-07-23, S1.3 grilling: the 07/18 create-and-publish mock — archived in `docs/plans/S1.3-days-and-activities/` — is spec input: publish-from-creation appears a **second** time; publish-metadata candidates grow **best time of year** + **Standouts** (glossary); decide the publish-time disposition of activity **notes** — scrub / publish / split a public tips field, additive; per-activity **estimated cost** now exists (S1.3) and feeds the est-vs-actual question)* *(enriched 2026-07-29, founder ruling on the S1.9 build — **a safety constraint, the sharpest input this register has**: a published itinerary **must not reveal whether its traveler is currently away from home**. The naive reading is "hide the `active` state", and that reading is wrong on its own: the **dates** leak the same fact more precisely — a public plan reading *Palawan, Jul 26 – Aug 2* broadcasts an empty house until August 2nd whether or not a state field exists, and so does a live-updating diary. So the constraint binds the **whole published projection**, not one field: state, date range, diary recency, and anything derivable from their combination. Candidate resolutions for S4.1 to weigh — publish only *past* trips (which the "usage signal" reading of `completed` supports), publish dates as season/duration rather than absolute ("7 days, best in October"), or make absolute dates an explicit opt-in with the consequence stated. Note this is the first constraint on this register that is about **traveler safety** rather than product shape, so it outranks the convenience questions above it)* | ~~The publish story~~ closed |
| 12 | ~~Workspace `forming` state — keep or collapse~~ **Resolved 2026-07-20 (S1.2 grilling): collapsed — active-from-creation.** The `state` column deferred S1.2 → S1.7 → S1.9 on the ship-when-read discipline and **ships at S1.9, the archive story — fully closed 2026-07-28** (S1.9's fence and list filter are the readers; archive confirmed MVP at that grilling). | ~~The invite story~~ closed |
| 13 | Published-diary surface pre-itinerary-publish | The diary-publish story |

_None blocks Artifact 03 or 04. Each blocks exactly one future story, and is marked so the design-scan catches it there._

**Resolution: ☑ Agreed as structure** *(proposed solo — pending founder ratification; open items registered)*
