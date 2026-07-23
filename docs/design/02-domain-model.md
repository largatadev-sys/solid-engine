# 02 · Domain Model — Largata  `[PRODUCTION DEPTH]`

**Architect's question:** *What are the true entities, what are the rules that must always hold, and where are the consistency boundaries?*

_Derived from Artifact 00 (§3–4) and the working sessions. Status: **proposed — pending founder ratification.** Open items are marked `OPEN → register #N` inline; they are transition/policy details that do not block the model's structure, but must be resolved before the story that touches them ships._

---

## Glossary — the ubiquitous language  `OPEN → register #3 (UX confirms nouns canonical)`

| Term | Precise meaning |
|---|---|
| **Traveler (User)** | An authenticated account. The sole platform actor in v1. |
| **Visitor** | An unauthenticated reader. Strictly read-only (INV-3). Not an entity — an access level. |
| **Itinerary** | The plan: a standalone, forkable, publishable object owning Days and their Activities. |
| **Day** | One ordinal slot of the plan (Day 1…N), optionally titled ("Arrival & Sunsets"). Owns its Activities and their order. Plans are **day-indexed, not date-anchored** (ADR-013); when the itinerary has dates, a Day's calendar date is derived, never stored. *(Added at the S1.3 grilling, 2026-07-23.)* |
| **Activity** | One element of a Day's plan — transport, meal, stay, sight, anything scheduled. The name reads narrower than it means, deliberately *(renamed from **Itinerary Item** at the S1.3 grilling, 2026-07-23 — founder call: the UI says "Activity" and canon follows; the wire noun is permanent within /v1, accepted knowingly in ADR-013)*. Carries a `source`. |
| **Fork Relationship** | Provenance record: this Itinerary was copied from that one. |
| **Trip Workspace** | The private collaboration space around one Itinerary: membership, decisions, comments, ledger. |
| **Membership** | A Traveler's role in one Workspace: `owner` or `member`. |
| **Decision / Vote** | A poll within a Workspace (where to eat, which hotel); one vote per member (INV-10). |
| **Comment** | Discussion attached to workspace content (private) or to a published Itinerary (public surface — `OPEN → register #5`). |
| **Review** | A post-trip assessment attached to a published Itinerary. Rules `OPEN → register #4`. |
| **Star / Upvote** | A lightweight reaction on a published Itinerary. |
| **Diary** | A first-class album: one author-owner, consented contributors, references one Itinerary. |
| **Diary Entry** | One contribution (text/photos/geotag) inside a Diary, by an identified contributor. |
| **Highlight** | A published Diary as surfaced on its published Itinerary. A projection, not a separate entity. **Never** the creator-listed selling points on a published plan — those are **Standouts**. |
| **Standout** | *Reserved term, S4.1 (register #11):* a creator-listed selling point on a published Itinerary ("Big Lagoon Kayaking"). Not built yet; reserved at the S1.3 grilling (2026-07-23) because the 07/18 mock labeled these "Trip Highlights", colliding with **Highlight** above. |
| **Ledger** | The Workspace's money record: Expenses, Splits, Transfers. Append-only (INV-8). |
| **Expense** | A cost incurred on the trip, split across members (INV-7). Contributes to trip total. |
| **Transfer** | A settlement / waiver / reassignment between members. Changes balances, never the trip total. |
| **Invitation** | An email invite into a Workspace; the co-traveler onboarding path. |
| **Discovery** | The surface for browsing/searching **published Itineraries** (E4; UX flow 5). Never means finding places or activities — that is Place Search. *(Added 2026-07-17, UX reconciliation — the two were colliding in conversation.)* |
| **Place Search** | *Reserved term, future phase (register #9):* searching destinations/POIs **inside the app** to build a plan. Not the unfurler (which enriches a link the traveler already found elsewhere) and not in MVP scope. |

---

## High-level flow — the journey (per actor)

**Traveler (organizer):** sign up → create Itinerary (scratch or fork) → invite co-travelers → Workspace forms → collaborate (days + activities, comments, decisions) → trip runs (diary + expenses accrete) → trip completes → reviews → publish Itinerary (choose visibility).

**Traveler (co-traveler):** receive email invite → authenticate → land in Workspace as member → collaborate, vote, log expenses, contribute to consented diaries → review after completion.

**Traveler (consumer):** browse/discover published Itineraries → view plan, Highlights, aggregate cost → star, comment, review → **fork** → become an organizer. *The loop closes: consumption feeds creation.*

**Diary author (any of the above):** create Diary referencing an Itinerary → grant contributors → entries accrete (including mid-trip) → publish at will — **including while the trip is live** (live-trip sharing is a diary behavior, not an itinerary state). A published diary on a still-private itinerary surfaces via the author's profile/feed only; it becomes a Highlight when the itinerary publishes. `OPEN → register #13 (confirm surface)`

**Visitor:** view public/unlisted published content, including reviews and comments. Nothing else (INV-3).

---

## Entities & key attributes

| Entity | Key attributes | Purpose |
|---|---|---|
| **Traveler** | id, email, display name *(non-unique — a human label, never an identifier or lookup key; S0.2)*, auth identity | The account. Deletion = **anonymization**: PII erased; ledger entries and ownership-transfer records survive anonymized (reconciles with INV-4/8). |
| **Entitlement** | traveler id, tier (`free \| subscriber`), source, status | The capability flag the entitlement service resolves — `can(traveler, capability, context?)`; the optional context (e.g. a workspace) keeps the unit-of-entitlement question (per-person vs per-workspace, register #14) open without touching call sites later. v1: everyone `free` with full access. Billing itself is owned by the platform stores (Epic 7, ADR-009); money is never modeled in the domain. Standing rule: entitlements gate capabilities, never existing data. |
| **Itinerary** | id, owner id, title, destination(s), description, date range *(optional metadata — the plan's structure is its Days, ADR-013; **no span↔day-count invariant in MVP**, S1.7 revisits)*, **visibility** (`private / unlisted / public`; `friends_only` reserved, deferred), **state**, fork lineage (via Fork Relationship), **published aggregate cost** (derived), last-edited (by, at) | The plan. The forkable/publishable unit. |
| **Day** | id, itinerary id, ordinal (contiguous 1…N — deletion renumbers), optional title | One slot of the day-indexed plan (ADR-013). When the itinerary has dates, Day N's calendar date is *derived* (start + N−1), never stored. *(S1.3, 2026-07-23.)* |
| **Activity** | id, day id, sort order *(manual, authoritative — time is display metadata)*, title, optional time-of-day *(local, timezone-free)*, optional estimated cost (amount + currency), place *(free text in v1 — geotag arrives with Place Search, epic-map backlog)*, description, notes *(private planning semantics; publish-time disposition — scrub / publish / split a public tips field — is S4.1's, register #11)*, one optional external URL, unfurled metadata (image, description, price…), last-edited (by, at), **source: `manual \| link_unfurl \| api:<provider>`**, type | One plan element *(renamed from Itinerary Item, S1.3)*. **Estimated cost is planning money, never ledger money** — it feeds no balance and no INV-7/8 path; the ledger stays the only record of actual spend. `type`/`source` are canon shape but **defer as columns to their first reader** (E6/E4 — the S1.2 state-column discipline). The `source` field is the designed upgrade path: v1 = manual + link_unfurl (share-sheet/paste → server-side unfurler, Tier 1 OG + Tier 2 JSON-LD, graceful degradation to bare link); **v1.5 candidate** = in-app webview capture (same `link_unfurl` pipeline, nicer front door); **future** = `api:<provider>` search (register #9). |
| **Fork Relationship** | id, source itinerary id, forked itinerary id, forked-at | Provenance (INV-6). Plan data only crosses. |
| **Trip Workspace** | id, itinerary id (1:1), state | The collaboration shell and access-control boundary (tenancy §03). |
| **Membership** | workspace id, traveler id, role (`owner \| member`), joined-at | Exactly one `owner` per workspace at all times (INV-4). |
| **Invitation** | workspace id, email, status (`pending → accepted \| declined \| revoked \| expired` — all terminal; re-inviting = a new row; at most one `pending` per workspace+email) | Email-invite onboarding. **Issued by the workspace owner only** *(S1.2 grilling, 2026-07-20 — role authority, not an entitlement; widening to members would be additive)*. Accepting = authenticate + join as member — **requires the accepting account's *verified* email to match the invited address** (case-insensitive; Google sign-ins arrive pre-verified; unverified email/password accounts must verify first — without the verified check, email-match is theater: anyone can *claim* an address at Firebase sign-up). **No bearer token:** the email is a pure notification; the in-app invitation inbox is the accept surface — a magic-link join is an additive post-validation option. *(S1.2 grilling, 2026-07-20.)* |
| **Decision** | id, workspace id, question, options, status | A poll. |
| **Vote** | decision id, member id, option | One per member per decision (INV-10). |
| **Comment** | id, target (workspace content or published itinerary), author id, body | Private collaboration or public surface per target. |
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

- **Itinerary aggregate** — root: Itinerary; inside: Days and Activities. **Strong consistency within** (day-ordinal contiguity, activity ordering, edits). Collaborative editing is **last-write-wins**, whole-entity writes (2026-07-17 ruling — no locking, no history entity), with `last edited by/at` attribution on Itinerary and Activity (S1.3). Carries visibility, lifecycle state, fork lineage. Exposes: **published aggregate cost** — a *derived value* computed from its Workspace's ledger (**expenses only, transfers excluded**), live-derived (a late expense updates it), and **the only ledger fact that ever crosses the boundary** (INV-2).
- **Trip Workspace aggregate** — root: Workspace; inside: Memberships, Invitations, Decisions+Votes, Comments (private), and the **Ledger as a bounded module** (Expenses, Splits, Transfers — own tables, own service interface, touched only through it; promotable to its own aggregate/service in the payments phase by addition). **Strong consistency within** — INV-4, 7, 8, 10 are enforced here, transactionally.
- **Diary aggregate** — root: Diary; inside: Contributor Grants, Diary Entries. Owner-consistent (INV-2a, 5). **References** its Itinerary by ID — never contained by it.
- **Cross-aggregate rules:** references by ID only; eventual consistency across (stars, feed, discovery counts may lag seconds — recorded in 01's NFRs). Reviews, Stars, and public Comments attach to *published* Itineraries. Fork copies Itinerary-aggregate data only (INV-6).

---

## Invariants (normative — restated from Artifact 00 §4, attached to their owning aggregate)

**Workspace aggregate**
- **INV-1.** Only members view/modify a non-published Workspace's contents.
- **INV-4.** Exactly one owner at all times; ownership transfers or is claimed — never vanishes.
- **INV-7.** Σ(splits) = expense total, always, transactionally.
- **INV-8.** Ledger is append-only: corrections/waivers/settlements/reassignments are new Transfer entries. Nothing silently edited or deleted.
- **INV-10.** One vote per member per decision; members only.

**Itinerary aggregate**
- **INV-2.** Publishing exposes: the plan, its published diaries (Highlights), aggregate trip cost only. Never ledger detail, raw diaries, or workspace membership.
- **INV-6.** Every fork records provenance; forked content is plan data only.

**Diary aggregate**
- **INV-2a.** One author-owner; contribution requires the owner's grant; publication is the owner's sole act.
- **INV-5.** Every Diary references exactly one Itinerary; every entry has an identified, granted contributor.

**Platform-wide**
- **INV-3.** Visitors are strictly read-only; all interaction requires an account.

---

## State machines

### Itinerary
**States:** `draft → active → completed → published`

| From → To | Trigger |
|---|---|
| draft → active | **Owner explicitly starts the trip** — `OPEN → register #10 (team confirms; alternative: start-date arrival)` |
| active → completed | Owner marks complete (or end-date passes — same open item) |
| completed → published | Owner publishes, choosing visibility (FigJam flow 12) |

**Illegal:** publishing from `draft`/`active` (live sharing is a **Diary** behavior, not an itinerary state) · any backward transition except `OPEN → register #11` (can a published itinerary be edited / unpublished / versioned?).

### Trip Workspace
**States:** `active → completed → archived` — active from creation (formation is atomic with the itinerary, S1.1). *(Register #12 resolved 2026-07-20 at S1.2's grilling: `forming` is collapsed — no behavior anywhere branches on it (INV-1 gates on membership, not state), and every backfilled pre-E1 workspace is solo-owner yet actively in use, so it would have been born in a factually wrong state.)*

| From → To | Trigger |
|---|---|
| active → completed | Mirrors the itinerary completing |
| completed → archived | **Owner's explicit act only — never automatic.** |

**Semantics:** `completed` is the **working afterlife** — ledger still accepts Transfers (post-trip settling), reviews get written, diaries publish. `archived` is fully **read-only storage** — binned/pushed aside; no writes of any kind.
**Illegal:** archived → anything (unarchive is deliberately absent from v1; add only if real usage demands it) · skipping completed.

### Diary
**States:** `private → published` — the author's sole act (INV-2a), permitted at any point including mid-trip. Published diaries surface as Highlights once their itinerary publishes; before that, via the author's profile/feed only (`OPEN → register #13`).

---

## Open items in this artifact

| Register # | Item | Blocks |
|---|---|---|
| 3 | Glossary nouns confirmed canonical (UX) *(drift observed 2026-07-17: UX artifacts say "User" and "workspace leader" — canon remains **Traveler** and **owner**)* | Nothing structural; naming in code |
| 4 | Review rules: who, how many, editable *(UX proposal on record, 2026-07-17, flow 11: eligible = confirmed members of a **completed, forked** workspace; the review lands on the **original** published itinerary; dimensions overall/accuracy/pacing/value + optional photos)* | The review story |
| 5 | Public-comment surface details *(UX inputs 2026-07-17, flow 9: threaded replies, report action, creator badge; public comments are **not copied on fork**)* | The public-itinerary story |
| 10 | draft→active trigger (owner-start vs date) *(UX input 2026-07-17, flow 11: end-of-itinerary prompts, the owner marks complete explicitly — supports owner-start with the date as a nudge)* | The itinerary lifecycle story |
| 11 | Edit-after-publish policy (freeze / unpublish / version) *(enriched 2026-07-17: UX flow 12 proposes **snapshot-publish** — a new public itinerary copied from the workspace, private data scrubbed; rationale = protect member data, though INV-2 achieves that by rule rather than by copy. Flow 6 separately shows publish-from-creation. Resolve transition-vs-snapshot-vs-two-modes at the publish story, together with publish metadata (tags/trip type/cover image) and the est-vs-actual cost question — INV-2's aggregate is live-derived, which a frozen snapshot cannot be)* *(enriched again 2026-07-23, S1.3 grilling: the 07/18 create-and-publish mock — archived in `docs/plans/S1.3-days-and-activities/` — is spec input: publish-from-creation appears a **second** time; publish-metadata candidates grow **best time of year** + **Standouts** (glossary); decide the publish-time disposition of activity **notes** — scrub / publish / split a public tips field, additive; per-activity **estimated cost** now exists (S1.3) and feeds the est-vs-actual question)* | The publish story |
| 12 | ~~Workspace `forming` state — keep or collapse~~ **Resolved 2026-07-20 (S1.2 grilling): collapsed — active-from-creation.** The `state` column itself ships with the first story that *reads* a state value (S1.7, the lifecycle story) — same discipline as S1.1's deferral. | ~~The invite story~~ closed |
| 13 | Published-diary surface pre-itinerary-publish | The diary-publish story |

_None blocks Artifact 03 or 04. Each blocks exactly one future story, and is marked so the design-scan catches it there._

**Resolution: ☑ Agreed as structure** *(proposed solo — pending founder ratification; open items registered)*
