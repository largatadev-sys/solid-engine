# S4.1 — Publish · spec

**Status:** intent locked 2026-07-31 — grilling session (grill-with-docs), founder-confirmed. Immutable point-in-time intent (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** Register #11 (resolved by this story — the model, the gate, edit-after-publish, publish metadata, est-vs-actual, and the 2026-07-29 absence-leak safety constraint) · **ADR-017** (the publish model — recorded at this grilling) · 02 (state machines split here · INV-1/INV-2 amended · **Standout** un-reserved · **Creator Tips** enters the glossary) · the 07/18 create-and-publish mock frames 5–7 (preview / publish / success — archived in `docs/plans/S1.3-days-and-activities/`) · the published-itinerary mock digest (the five-tab consumer screen — `docs/plans/S1.4-itinerary-edit-lock/`) · S4.9 (the workspace screen publish lands on; activity-history capture) · S1.9 (archive — its visibility re-ruled here) · S1.7 (`completed` — retired as a gate here) · ADR-008 (waivers renewed: `notes` semantics · archived-visibility narrowing) · ADR-009 (candidate-capability note) · ADR-002 (the projection read crosses modules by service interface only).

## The pull, on the record

S4.1 is E4's publish story, pulled next per S4.9's recorded order. The grilling walked register #11's six weeks of accumulation branch by branch. Two rulings reverse recorded decisions on the record: **S1.9's "archive evicts nobody"** (archived trips narrow to owner-only sight — the audience ladder) and **S1.3's private `notes` semantics** (the field is **Creator Tips** — public on publish, copied on fork). One assigned question closes: **`completed` is retired as a publish gate** (the 2026-07-29 dormant-states ruling's open half). The ADR-008 waiver is renewed for both semantics changes — defensible only while the installed clients are the founders' own.

## Goal

An owner can put a plan in front of everyone at any moment: publish flips the itinerary public, the public page is a live, rule-scrubbed projection of the real plan — never a copy — and nothing on it can reveal whether its travelers are away from home. Unpublish takes it back. Archive hides the trip from everyone but the owner, public page included.

## Locked decisions *(grilling 2026-07-31, in decision order)*

### 1 · Publish is a visibility flip; the public page is a live projection (ADR-017)

One itinerary, one identity. No snapshot, no copy: the public surface is a projection of the live object, and what crosses the wall is defined by rule (decisions 4–9), not by a copy pipeline. Post-publish plan edits flow to the public page; no versioning, no freeze. This keeps INV-2's aggregate cost live-derivable (E5), gives Stars/Reviews/Comments/Forks one identity to attach to, and keeps the publish transition side-effect-free — S1.7's race-test exemption holds.

### 2 · Visibility is binary and orthogonal: `private → published`

- **Private** = owner + collaborators (INV-1, as today). **Published** = everyone. **Unlisted is deleted** from canon; **`friends_only` is reserved** as a future additive value awaiting the friend graph (post-validation).
- Visibility is a **second fact beside the dormant lifecycle**, not its fourth state — an itinerary that is *completed and published* is the product's most important object (the only kind a review can land on, register #4) and one enum can't hold both facts. The dormant `draft → active → completed` chain ships untouched (ADR-008).
- **`completed` is retired as a gate.** Its declared reader never materializes; its real value survives as E4's social-proof signal ("how many forkers actually travelled this") — a display fact, not a permission fact.

### 3 · No gate: publish from creation onward, owner-only, symmetric

Publish is available from any lifecycle state — the twice-proposed publish-from-creation UX ships as drawn. Publish and unpublish are the **owner's acts**; members see the visibility fact, hold no control. An empty or half-built itinerary can publish — accepted knowingly; S4.3's feed can rank or floor later, and inventing a content threshold would be a gate we decided not to have.

### 4 · The absence rule: the projection carries no absolute dates, ever

The register's safety constraint — a published itinerary must not reveal that its traveler is away from home — is answered structurally, not by opt-in:

- The projection shows **duration derived from the day list** ("5 Days"), the creator-entered **best time of year**, and never the date span, the lifecycle state, or the `started_at`/`completed_at` stamps. The 07/18 published mock draws exactly this (destination pill + duration + best-time row; no calendar dates anywhere).
- Stated as the standing obligation (INV-2 amendment): **nothing on the published projection may reveal current or future absence.** E3/S4.2 inherit it for diary-entry recency (register #13 carries the note).
- The S1.7 span↔day-count deferral discharges: the public "N Days" derives from the day count; the private date span never crosses, so the two can disagree privately forever.

### 5 · Unpublish: symmetric, hidden-not-deleted

`published → private`, owner-only. The public page answers not-found afterwards (indistinguishable from never-published — the S1.6 masking pattern). Attached social objects (stars, comments, reviews — future stories) are **hidden with the projection, never deleted**; republish restores them. **Forks survive untouched** (a fork is someone else's copy; INV-6's provenance row survives, its attribution rendering as "a private itinerary" while the source is private). Discovery drops the itinerary on its next read — eventual consistency across aggregates, already canon.

### 6 · Publish metadata: Standouts + best time ship; tags park; cover is API-shape-only

- **Standouts** (glossary term un-reserved): an ordered list of short free-text strings on the itinerary, edited under the header lease, rendered on the published Overview as the mock's check-circle rows.
- **Best time of year**: short free text ("Dec – Apr"). Structure (month enums for discovery filters) is additive later, with its reader.
- **Tags / trip type: not built** — no mock has ever drawn them; they arrive additively at S4.3 if discovery wants them (ship-when-read).
- **Cover image**: the nullable API field ships now (as S4.9 recorded); UI stays greyed until S3.3 activates upload; the projection renders the placeholder treatment.

### 7 · `notes` is Creator Tips: public on publish, copied on fork

Founder ruling, reversing S1.3's recorded private-planning semantics: the field holds **per-activity guidance for the trip itself** ("book the 8 AM slot") — it crosses the wall at publish and is **plan data under INV-6** (S4.7 copies it on fork). The wire name `notes` stays (renaming is the real additivity break); the editor label becomes the mock's "Notes & Creator Tips" with the public-on-publish disposition visible. ADR-008 waiver renewed; no real traveler has written under the private promise yet, which is why now is the cheap moment. **"Planning notes"** — private member coordination — is a *different, unbuilt* concept, parked to the epic-map backlog (S4.10's chat likely covers it).

### 8 · Costs: creator-stated and uninterpreted; the total is derived

Activity estimated cost is a **creator-stated number with no enforced semantics** — not per-person, not verified; what it represents is the creator's own framing (founder ruling: "it's up to their interpretation"). Per-activity costs cross the wall on the day cards. The header stat is the **derived total of activity costs** — live, never creator-typed — rendered **only when every priced activity shares one currency** (a mixed-currency sum is a number that lies; the per-activity prices still show). **The mock's "/Person" label is overruled on the record** — the stat renders as an estimated total. The ledger-derived *actual* joins as a second, differently-trusted number at S5.4; that display question stays S5.4's.

### 9 · Only the owner's identity crosses; the byline is the current owner

INV-2 gains a precise carve-out: the **owner's public identity** (display name, handle, avatar) crosses as the byline — resolved **at render time**, so an ownership transfer moves it; the original creator stays derivable forever from the transfer records if authorship credit is ever wanted (additive, later). **The roster never crosses. Per-field `last edited by` never crosses** — a published plan reads as one authored object, not a change log. Co-traveler tagging/credit is a recorded future improvement (needs consent mechanics; epic-map backlog).

### 10 · The consumer screen: five-tab shell, two tabs real

The published-itinerary screen ships as the mock digest describes — shared header (cover slot · destination pill + duration · creator block · stats board) over tabs **Overview · Day-by-Day · Diary Entry · Comments · Reviews** — resolving the digest's five-vs-four-tab inconsistency **in Overview's favor** (the four-tab Reviews frame reads as a mock slip).

- **Real:** Overview (description, Standouts, best-time, derived cost stat; gallery greyed to S3.3) · Day-by-Day (read-only day accordions; activity cards with time rail, place, cost, tips, bare booking link — the E6 panel stays parked).
- **Greyed** (`comingSoon` + register-#2 analytics, the standing discipline): Diary Entry (E3/S4.2) · Comments (S4.6) · Reviews (S4.5) · the stats board's rating (S4.5) and fork count (S4.7) · Follow (friend graph).
- **Reachability, honest:** until S4.3 a published itinerary is reached by direct route only (the success screen's Copy Link / deep link), and **"the public" means signed-in travelers** — the app is auth-gated, so accountless Visitors (INV-3) become real at the backlogged web read-only surface, not here.

### 11 · The publish flow: workspace entry → preview → success; quiet unpublish

- **Entry: a Publish action on the workspace screen** (its recorded home per S4.9 decision 15; exact placement read off the mock frames at the ticket).
- **The preview is the scrub.** Frame 6 renders literally the public page (dates absent, tips visible, roster absent) before the confirm — WYSIWYG. **Flow 12's history-fed publish-scrub obligation is discharged as superseded**: a rule-scrubbed live projection has nothing for a history feed to scrub; Activity History's readers stay S4.10 and E4's signal.
- **Success per frame 7**: Copy Link (the published page's route — ticket detail) + Share to… via the system sheet.
- **Unpublish: a quiet link in the Details tab** (the S1.9 demotion precedent), confirm copy stating the consequence — page disappears, social objects hide, forks keep existing.
- **The workspace eyebrow renders the visibility fact**: Private Workspace ↔ the published variant (final copy at the ticket).

### 12 · The audience ladder: archived < private < published

Founder ruling, reversing S1.9's "archive evicts nobody" **sight** on the record — visibility is one audience axis and archive sits on it:

| State | Who sees it |
|---|---|
| **Archived** | Owner only |
| **Private** | Owner + collaborators |
| **Published** | Everyone |

- **Archive dominates publish**: archiving a published trip takes the public page down instantly — archive *is* the kill switch. The `published` fact survives underneath; **unarchive restores the prior audience, public included** (the archive confirm copy says so).
- **Members lose sight of archived trips entirely**: their trip lists exclude them; workspace-scoped reads mask to not-found (the S1.6 pattern). Memberships and all content survive hidden — unarchive restores a working trip, exactly as S1.9 built.
- **Self-leave stays permitted on the wire** (ADR-008; S1.9's "your relationship stays yours" stands) but is unreachable from UI while hidden — accepted on the record.
- **The S1.9 fence covers the new verbs**: publish and unpublish are acts on the trip — frozen while archived; the path is unarchive first.
- This narrowing is an **isolation-semantics change on shipped behavior** — stop-rule territory, authorized by this ruling; ADR-008 waiver renewed (clients founders-only).

### 13 · Candidate-capability note *(ADR-009's standing duty)*

**`itinerary.publish`** — a capability, not access to existing data; grows the traveler's public footprint (a plausible free-tier cap: N published itineraries). Recorded with the caveat that it is governance-adjacent (owner-only today); the register #14 decision rules whether it gates.

## Backend scope

Additive `visibility` on itinerary (`private | published`, default private) + migration · `POST /v1/itineraries/{id}/publish` and `/unpublish` (owner-only; guard, then the archive fence) · **the public projection read path — a new deliberate endpoint, never the member view stripped**: serves the published projection to any authenticated traveler; masks to not-found when private *or archived* (workspace state consulted by service interface, ADR-002; the authorization guard itself is untouched and keeps governing all workspace access) · projection field set exactly as decisions 4–9 (title, destinations, derived duration, description, best time, Standouts, cover, owner byline, days, activities with tips/cost/URL, single-currency derived total — and structurally absent: dates, state, stamps, roster, attribution) · additive itinerary fields: Standouts (ordered strings), best time, cover reference — header-lease-guarded writes · **archived-visibility narrowing**: member reads of archived workspaces mask to not-found, member trip lists exclude archived (owner unaffected).

## Mobile scope

Workspace screen: Publish action + published eyebrow variant · preview screen (frame 6 — the live projection + Publish / Continue Editing) · success screen (frame 7 — Copy Link + Share) · Details tab: quiet unpublish with consequence copy; archive confirm copy updated (page down now, back on unarchive) · the published-itinerary consumer screen per decision 10 (five tabs, two real, three greyed with analytics) · Standouts + best-time editors on the trip-fields surface (header lease) · the tips field relabeled with its public disposition · member-side: archived trips vanish from list and mask on direct route.

## Console & infra work

None — no new external services, no new secrets. (Named per the S0.6 lesson.)

## Harness impact

Pool accounts three-way: `t1` = owner (publishes), `t2` = member, `t3` = non-member consumer — state which tag played which role. `drive-preview.js` gains the publish walk (workspace → preview → publish → success) and the consumer view by direct route. Device walk covers the share sheet; the projection field-set assertion is an IT, not a screenshot.

## Acceptance criteria

1. `t1` publishes a **never-started** trip (lifecycle `draft`): preview → publish → success; `t3` opens the published page by direct route and sees the projection (IT + device + preview).
2. **The projection's field set is pinned exactly** — an IT asserts the serialized payload contains no date span, no lifecycle state, no stamps, no roster, no per-field attribution; the absence rule has a test that fails when a field leaks.
3. `t3`'s read of a private itinerary → not-found; after publish → 200; after unpublish → not-found again; republish serves the **same id** (IT).
4. Tips render on the published day cards; the editor labels the field "Notes & Creator Tips" with the public disposition visible (IT + UI).
5. Per-activity costs render; the total renders only when all priced activities share one currency — a mixed-currency plan shows prices but no total; the "/Person" label appears nowhere (IT + UI).
6. Standouts and best-time: edited under the header lease, rendered on Overview; a concurrent header edit is rejected (IT).
7. Publish and unpublish by `t2` (member) → 403; by `t1` (owner) → 200 (IT).
8. Byline = current owner: after an S1.6 ownership transfer, the projection's byline follows (IT).
9. **The ladder**: archived → `t2`'s list excludes the trip and direct reads mask to not-found while `t1` retains access; publish/unpublish on an archived trip → fence rejection; a published-then-archived trip's public page masks for `t3`; unarchive restores `t2`'s sight and the public page (IT).
10. Empty itinerary publishes (accepted knowingly) (IT).
11. Greyed tabs and stats (Diary/Comments/Reviews, rating, fork count, Follow) fire analytics and dead-click nowhere on web (preview driver).
12. Post-merge on deployed `dev`: one publish → consumer-view → unpublish loop via pool accounts; the SQL check **names the `railway` database** and reads `visibility` flipping both ways.

## Out of scope

Discovery feed (S4.3) · stars (S4.4) · reviews (S4.5) · public comments (S4.6) · fork (S4.7) · Highlights / diary surfaces (E3/S4.2, register #13) · media + cover upload (S3.3) · the web read-only surface / accountless Visitors (backlog epic) · `friends_only` (friend graph, post-validation) · booking panel (E6) · ledger-derived actual cost (S5.4) · tags/trip type (S4.3, additive) · planning notes (backlog) · co-traveler tagging (backlog) · any entitlement code (ADR-009).

## Comments

*(append-only; intent above is immutable)*
