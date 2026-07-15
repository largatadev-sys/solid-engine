# 02 · Domain Model — Largata  `[PRODUCTION DEPTH]`

**Architect's question:** *What are the true entities, what are the rules that must always hold, and where are the consistency boundaries?*

_Derived from Artifact 00 (§3–4) and the working sessions. Status: **proposed — pending founder ratification.** Open items are marked `OPEN → register #N` inline; they are transition/policy details that do not block the model's structure, but must be resolved before the story that touches them ships._

---

## Glossary — the ubiquitous language  `OPEN → register #3 (UX confirms nouns canonical)`

| Term | Precise meaning |
|---|---|
| **Traveler (User)** | An authenticated account. The sole platform actor in v1. |
| **Visitor** | An unauthenticated reader. Strictly read-only (INV-3). Not an entity — an access level. |
| **Itinerary** | The plan: a standalone, forkable, publishable object owning Itinerary Items. |
| **Itinerary Item** | One element of the plan (stay, flight, activity, meal…). Carries a `source`. |
| **Fork Relationship** | Provenance record: this Itinerary was copied from that one. |
| **Trip Workspace** | The private collaboration space around one Itinerary: membership, decisions, comments, ledger. |
| **Membership** | A Traveler's role in one Workspace: `owner` or `member`. |
| **Decision / Vote** | A poll within a Workspace (where to eat, which hotel); one vote per member (INV-10). |
| **Comment** | Discussion attached to workspace content (private) or to a published Itinerary (public surface — `OPEN → register #5`). |
| **Review** | A post-trip assessment attached to a published Itinerary. Rules `OPEN → register #4`. |
| **Star / Upvote** | A lightweight reaction on a published Itinerary. |
| **Diary** | A first-class album: one author-owner, consented contributors, references one Itinerary. |
| **Diary Entry** | One contribution (text/photos/geotag) inside a Diary, by an identified contributor. |
| **Highlight** | A published Diary as surfaced on its published Itinerary. A projection, not a separate entity. |
| **Ledger** | The Workspace's money record: Expenses, Splits, Transfers. Append-only (INV-8). |
| **Expense** | A cost incurred on the trip, split across members (INV-7). Contributes to trip total. |
| **Transfer** | A settlement / waiver / reassignment between members. Changes balances, never the trip total. |
| **Invitation** | An email invite into a Workspace; the co-traveler onboarding path. |

---

## High-level flow — the journey (per actor)

**Traveler (organizer):** sign up → create Itinerary (scratch or fork) → invite co-travelers → Workspace forms → collaborate (items, comments, decisions) → trip runs (diary + expenses accrete) → trip completes → reviews → publish Itinerary (choose visibility).

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
| **Itinerary** | id, owner id, title, destination(s), date range, **visibility** (`private / unlisted / public`; `friends_only` reserved, deferred), **state**, fork lineage (via Fork Relationship), **published aggregate cost** (derived) | The plan. The forkable/publishable unit. |
| **Itinerary Item** | id, itinerary id, type, title, date/time, place (geotag), external URL, unfurled metadata (image, description, price…), **source: `manual \| link_unfurl \| api:<provider>`** | One plan element. The `source` field is the designed upgrade path: v1 = manual + link_unfurl (share-sheet/paste → server-side unfurler, Tier 1 OG + Tier 2 JSON-LD, graceful degradation to bare link); **v1.5 candidate** = in-app webview capture (same `link_unfurl` pipeline, nicer front door); **future** = `api:<provider>` search (register #9). |
| **Fork Relationship** | id, source itinerary id, forked itinerary id, forked-at | Provenance (INV-6). Plan data only crosses. |
| **Trip Workspace** | id, itinerary id (1:1), state | The collaboration shell and access-control boundary (tenancy §03). |
| **Membership** | workspace id, traveler id, role (`owner \| member`), joined-at | Exactly one `owner` per workspace at all times (INV-4). |
| **Invitation** | workspace id, email, token, status | Email-invite onboarding. Accepting = authenticate + join as member. |
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

- **Itinerary aggregate** — root: Itinerary; inside: Itinerary Items. **Strong consistency within** (ordering, dates, item edits). Carries visibility, lifecycle state, fork lineage. Exposes: **published aggregate cost** — a *derived value* computed from its Workspace's ledger (**expenses only, transfers excluded**), live-derived (a late expense updates it), and **the only ledger fact that ever crosses the boundary** (INV-2).
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
**States:** `forming → active → completed → archived`

| From → To | Trigger |
|---|---|
| forming → active | First member accepts an invite — `OPEN → register #12 (UX: does forming exist, or active-from-creation?)` |
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
| 3 | Glossary nouns confirmed canonical (UX) | Nothing structural; naming in code |
| 4 | Review rules: who, how many, editable | The review story |
| 5 | Public-comment surface details | The public-itinerary story |
| 10 | draft→active trigger (owner-start vs date) | The itinerary lifecycle story |
| 11 | Edit-after-publish policy (freeze / unpublish / version) | The publish story |
| 12 | Workspace `forming` state — keep or collapse | The invite story |
| 13 | Published-diary surface pre-itinerary-publish | The diary-publish story |

_None blocks Artifact 03 or 04. Each blocks exactly one future story, and is marked so the design-scan catches it there._

**Resolution: ☑ Agreed as structure** *(proposed solo — pending founder ratification; open items registered)*
