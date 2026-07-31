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

### Implementation notes, tickets 01–05 *(2026-07-31, at the code review)*

Deviations and judgement calls the build surfaced. None changes the intent above; each is recorded because the next reader would otherwise have to re-derive it.

1. **The `visibility` column already existed** — V3 created `visibility TEXT NOT NULL DEFAULT 'private'` at S0.3, three epics before anything could write it. So ticket 01's "additive `visibility` column lands by migration" is satisfied in outcome (no shipped field changes shape, every existing row reads private) without adding a column. V18 instead asserts the premise that makes "no data migration" true rather than hoped-for, and drops V3's lower-case default — the same lying-default trap V12 removed from `state`.

2. **`PATCH /v1/itineraries/{id}` is whole-header replace, and the two new fields deliberately break that symmetry.** `description` shipped at S0.3 as replace-or-null; changing *that* would itself be the ADR-008 break. But a client that predates Standouts and best-time cannot send them, and under replace semantics its ordinary title edit would silently erase both. So for the two **new** fields only, an absent value means *unchanged* and an empty value (`[]` / `""`) means *cleared*. The asymmetry is forced by additivity, not by carelessness, and `ItineraryTest` pins all three behaviours — including the shipped one — so the next person adding a header field can see which convention applies and why.

3. **The audience fence shipped at two of its three doors.** `GET /v1/itineraries/{id}` and `/members` were fenced; `GET /v1/itineraries/{id}/invitations` was not, so a member of an archived trip could still read its pending invitations. Caught in review, not by a test — the same shape as the E1 gate's "fence tripwire watching 2 of its 4 doors". Fixed, and `AudienceFenceCoverageTest` now fails the build when a workspace-scoped GET resolves a membership without fencing or being named as an exception; the tripwire was sabotage-checked before it was trusted.

4. ~~**The preview shows two tabs, the consumer five.**~~ **Superseded by the founder, 2026-08-01** — see amendment 6 below. *(Original reasoning, kept because it is why the split existed: mock frame 6 hides Comments and Reviews with `display:none`, while the published-itinerary mock draws all five, so each screen copied the frame it came from.)*

5. **The cover slot renders on the preview too, though frame 6 does not draw it.** Decision 10 puts the cover slot in the *shared* header, and the preview's whole purpose is WYSIWYG — a preview missing a slot the public page has would defeat it. Spec over digest, deliberately.

6. **The amber preview banner uses the terracotta tint, not the mock's `#FFF7ED`/`#C2410C`.** ADR-016 adopted the brand palette as token values globally and the 07/18 digest's own note says the token layer is authoritative for colour; the palette carries no amber. Flagged rather than silently approximated.

7. **The success screen has no back affordance and no header bar**, per frame 7 — you cannot go back to a publish you already performed. It is the one named exception to S4.9's every-screen-draws-its-own-heading invariant, and the exception is *checked*: the exempt screen must take the safe-area inset itself, which is the reason that invariant exists.

8. **No shared public URL exists yet.** Copy Link produces the browser origin on web and the `largata://` deep link on device. "The public" means signed-in travelers until the backlogged web read-only surface — the recorded scope, restated because the copied link's shape is the first place it becomes visible.

### The story gate *(2026-07-31, ticket 06)*

Roles throughout: **`t1` = owner (publishes, unpublishes, archives) · `t2` = member · `t3` = non-member consumer.**

**Green.** 100 backend unit tests · 434 backend ITs · 1556 mobile tests · `smoke-publish.js` **30/30** against the local full stack (fresh DB, V18 and V19 applied and read out of `flyway_schema_history`) · `drive-publish.js` **31/31** in the preview container, zero console and page errors · the device walk on the emulator against the local backend, all three roles.

**The device walk, on the record.** `t1` unpublished from the Details tab (confirm copy read back verbatim), published through preview → success, copied the link, opened the **real Android system share sheet** carrying `Island Hopping in El Nido — largata://published/<id>`, then archived and unarchived (both confirms read back, both naming the published page). `t3` opened the published route and read the projection; `t3` on the *member* route got **"Trip unavailable"** — the guard masking while the projection serves, the two halves visible on one device. The backend log shows `Itinerary visibility:` flipping `published`/`private` six times, and the local `largata` database ends holding `visibility = PUBLISHED` with `state = DRAFT` — publish orthogonal to the lifecycle, proven in storage rather than inferred.

**One defect the gate found, and how.** The five-tab bar **overflowed a 393px frame and painted "Rev"** where "Reviews" belonged. The preview walk had asserted all five tab labels and passed, because `innerText` returns the whole string however little of it is painted. It was found by opening the screenshot the same run had already written. Fixed by making the tab strip scroll horizontally — a platform-forced deviation from the mock, which draws five tabs fitting: at 13px with these labels they do not, and scrolling beats truncating. Regression checklist gains **line 12** (take the screenshot and look at it) and **line 13** (the partial fence, from the review).

### Founder review of the shipped build *(2026-08-01)*

Five changes on sight of the running app. Three of them **reverse locked decisions in this spec**, so they are recorded here rather than absorbed — the intent above stays immutable, and these are the amendments.

1. **The cover slot leaves the published header.** Decision 10 lists the shared header as "cover slot · destination pill + duration · creator block · stats board", and ticket 03's AC required the placeholder treatment. The founder's ruling: *"itinerary overview should not have a cover photo, there will be photo area in the overview tab."* The Overview tab's photo gallery (already greyed to S3.3) is the one photo surface. The `coverImageUrl` **API field and column are untouched** — this is a UI removal, and S3.3 still activates into the same shape.

2. **The published day card carries title, location, Creator Tips and the booking link — nothing else.** This reverses **decision 8's** *"Per-activity costs cross the wall on the day cards"* and drops the time rail the published-itinerary mock draws. Cost still reaches the consumer as the header's derived **Est. Total**, so the fact is not lost — it stops being itemised. Flagged at the time: AC 5's first clause ("per-activity costs render") no longer holds on the published surface, and its second (the single-currency total, and no "/Person") still does. The *editor* is untouched — time, cost and description are all still captured, they simply do not cross the wall.

3. **View Booking Options greys out.** *"grey it out for now as this is not implemented yet. still need to workout booking links."* It joins the register-#2 discipline — `comingSoon('booking')` with analytics — rather than opening a raw URL. The link is still stored and still crosses the projection; only the tap changes. E6 remains the owner of what a booking link becomes.

4. **The Trips screen gains categories: Draft · Private · Published**, plus an All chip. Founder-chosen **after being shown the overlap**: `draft` is a lifecycle state and `private`/`published` are the visibility fact, so a new trip legitimately appears under *both* Draft and Private. That is the ruling, and `TripCategoryFilterIT` pins it as intended behaviour so nobody later "fixes" it. It is a **query-level filter** (`GET /v1/itineraries?category=…`, optional, additive — absent behaves exactly as before), not a client-side filter of a fetched page: the list is cursor-paginated, so filtering after the fetch would silently shrink pages and break the cursor. An unknown category is refused with `UNKNOWN_TRIP_CATEGORY` rather than ignored.
   *Note for whoever picks up S4.3:* this reintroduces `draft` to the UI vocabulary, which the E1 promotion gate deliberately removed. The lifecycle **controls** stay gone — there is still no Start/Complete anywhere — so what returns is a filter that reads the state, not a prompt to change it.

5. **Back goes to the actual previous page.** `router.back()` is a no-op when the history stack is empty, which is exactly what happens after a `router.replace` (create → days) and on every **deep link** — the two ways these screens are most often reached. `useSafeBack(parent)` pops when there is something to pop and otherwise replaces with the screen's declared parent, so back is never dead. Every trip screen now names its parent; the fallback is Trips.
   **Still open, deliberately:** the published consumer page has no back control at all, because the mock draws no header bar there. Platform back and the tab bar are the way out. Say the word and it gets one.

6. **The preview carries the same five-tab shell as the public page** — founder's call, chosen over the alternative of cutting the published page down to two. This supersedes implementation note 4 above: the two screens no longer differ, so the preview is WYSIWYG for the *shell* as well as the content, which is what the preview exists to promise. The greyed tabs behave identically on both (a message, never a dead click). **`audience` survives with one job**: the Follow button, which stays consumer-only — frame 6 hides it, and offering a creator the chance to follow themselves is a control that could never apply. Say the word if you want it visible-but-greyed there too.

8. **The model itself is being re-drawn — ADR-018, proposed 2026-08-01, not built.** Later the same day the founder replaced the binary visibility fact with a three-valued publication status (`draft` editable · `private` and `public` both published and both **frozen**, public the default) and ruled that **unpublish returns an itinerary to draft**, the only way back to editing. That supersedes decisions 1, 2, 5 and 12 of this spec — including the live-projection premise the whole projection was designed around. **It is deliberately not implemented here:** it is a wire break, it is story-sized, and one question blocks it (the new `draft` collides with `ItineraryState.DRAFT` on the same object). Everything above stands as what S4.1 shipped; ADR-018 in `adr-log.md` and the epic-map backlog line carry what comes next.

7. **A draft trip's row opens the workspace, not the day planner.** Founder's call. Implemented per-trip (`state === 'draft'`), not per-chip, because the same trip appears under both the Draft and Private chips and a row that navigated differently depending on the active filter would be the same object with two behaviours. Archived still wins over everything, as before. The reasoning: for a trip nobody has started, the workspace is where the next act lives — publish, invite, edit the details — while the planner is where a trip under way is worked on.

**AC 12 is not closed and cannot be here.** It is a *post-merge* probe on deployed `dev`, and promotions are propose-first — the merge is the founder's checkpoint, not the agent's. When it runs: `LARGATA_API_BASE_URL=https://api-dev.largata.com node scripts/smoke-publish.js`, then the SQL check **naming the `railway` database** (`postgres.railway.internal:5432/railway`), reading `visibility` on the walked trip before and after. Every other AC (1–11) is closed above or by a named IT.
