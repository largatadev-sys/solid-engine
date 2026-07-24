# S1.3 — Itinerary days + activities CRUD + field edit, collaborative · spec

**Status:** intent locked 2026-07-23 — grilling session against the 07/18 create-and-publish Figma mock, owner-confirmed. Immutable point-in-time intent (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.
**Context anchor:** Epic 1, third story · S1.1 (the row-backed guard every endpoint here calls) · S1.2 (members exist — the collaborators this story serves; its two-account fixtures prove the collaborative ACs) · Artifact 02 (amended at this grilling: **Day** + **Activity** entities, **Standout** reserved) · **ADR-013** (day-indexed plans — minted at this grilling) · ADR-002 (module boundaries) · ADR-008 (additive /v1) · 2026-07-17 UX rulings (**last-write-wins**, no locking, no activity history) · epic-map date-picker backlog line (discharged here) · mock digest: `figma-mock-digest.md` in this directory *(the raw Figma CSS export can be dropped beside it as `css.txt`)*.

## The pull (what this is and why now)

S1.1 built the walls, S1.2 built the door — and inside there is nothing to collaborate *on*: an Itinerary is a title, destinations, and two optional dates. This story is the plan itself — the content E1's hypothesis ("groups plan better together") actually tests. It is also the story three parked decisions converge on by appointment: the LWW ruling's "last edited by" column pair (2026-07-17, "decidable at S1.3's spec"), the date-picker backlog line ("S1.3 is the natural home"), and the first real exercise of member-authorized (not owner-authorized) writes through the guard.

## Goal

Any member of a trip builds and edits a day-indexed plan: days with titles, activities with time/cost/place/links, reordered by hand, edited by whoever got there last — with attribution. The mock's screens are adopted; what doesn't exist yet is greyed and answers taps gracefully; what isn't decided yet isn't rendered. The S0.3/S1.1/S1.2 guard ACs stay green, untouched.

## Locked decisions

### Scope: the mock spans five stories; S1.3 takes the plan-building slice (grilling Q1)

The 07/18 mock is "create **and publish**" — but publishing from `draft` is illegal in the canon state machine, and register #11 holds publish semantics for S4.1 by appointment. S1.3 = create/edit flow + daily schedules + activities, collaborative. The preview/publish/success screens, fork/review/handle/Follow chrome all park as S4.1+ spec inputs (epic-map E4-inputs line, enriched). Pulling publish forward was considered and rejected: it drags visibility semantics, the public read surface, and fork provenance into E1 and inverts the launch sequence.

### ADR-013 — plans are day-indexed; dates stay itinerary metadata (grilling Q2)

**Day** joins the Itinerary aggregate: contiguous ordinal 1…N, optional title. Activities belong to a Day. `startDate`/`endDate` remain optional itinerary metadata; Day N's calendar date is *derived* (start + N−1), never stored. **No date-span↔day-count invariant** — under LWW it would couple two members' independent edits into mutual invalidation; S1.7 revisits when dates start meaning something. Full reasoning in ADR-013 (Artifact 04).

### The noun is Activity (grilling Q3)

Founder call: canon renames Itinerary Item → **Activity** (glossary updated; the name reads narrower than it means — transport, meals, stays included). Accepted knowingly: `/v1` speaks `days`/`activities` permanently within v1 (ADR-008). **`type` and `source` stay canon shape but defer as columns to their first reader** (E6/E4) — the S1.2 state-column discipline; a later `'manual'` backfill is trivially true for every pre-E6 row.

### Field dispositions (grilling Q4–Q5)

**Ship:** itinerary `description` · activity `title`, optional local **time-of-day** (timezone-free), optional **estimated cost** (amount + currency; null = unstated, 0 = "Free"), free-text **place**, `description`, **`notes` (private planning semantics)**, one optional **`externalUrl`**, manual sort order, `last_edited_by/at`.
**Park:** best time of year + Standouts → S4.1 publish metadata (**Standout** reserved in the glossary now — the mock's "Trip Highlights" label collided with canon's **Highlight**, a published-Diary projection) · cover + activity photos → S3.3 · the notes-vs-creator-tips split → S4.1 (one private field now; a public `tips` field is additive later) · geotag/structured place → backlog (trigger: Place Search or first map surface).
**Boundary sentence, now in canon:** estimated cost is **planning money, never ledger money** — it feeds no balance, no INV-7/8 path; the ledger stays the only record of actual spend.

### One URL, no booking panel (grilling Q6)

The mock's Booking Integration panel (N options × purpose/provider/price/URL) parks whole → backlog, trigger E6. Every manual field in it already lives on the Activity; the group-side "alternatives" use case is E2's Decision wearing different clothes; the consumer-side belongs to E4. One `externalUrl` keeps E6's unfurl target singular, as designed.

### Editing mechanics (grilling Q7)

**Manual sort order is authoritative; time is display metadata** — a drag never snaps back against a typed time. Day ops: append · rename · delete (cascades activities after UI confirm; **ordinals renumber to stay contiguous**). **Cross-day move ships** (the activity's day is editable). Day *reorder* (swap ordinals) deferred — not in the mock, additive later. **LWW, whole-entity writes** (2026-07-17 ruling, restated). **The `last_edited_by`/`last_edited_at` pair ships now, on Itinerary and Activity** — the one deliberate exception to defer-to-first-reader, because attribution is the one column whose deferral destroys data retroactively; it costs nothing (the resolved `Membership` is already in every service method's hand).

### Authority: members shape the plan (grilling Q8)

Any member creates/edits/deletes days and activities **and edits the itinerary's own fields** (title, destinations, dates, description). The owner-only set is unchanged and structural: invitations (S1.2), delete (S1.9/INV-4), publish + lifecycle (register #10/#11), ownership transfer (INV-4). Rule of thumb, now on record: **members shape the plan; only the owner changes its lifecycle, membership, or existence.** Role authority lives in the service against the guard's resolved `Membership` — not the entitlement seam (ADR-009 gates tiers, not roles; the S1.2 precedent).

### The date-picker debt is discharged here (grilling Q8)

A real date picker wherever dates are entered; component choice at the ticket (community picker vs platform modal — a native-dependency addition goes through a config plugin if needed; CNG rules apply). Web fork = browser-native date input (standing principle: web and mobile identical except native-only functions). The duration control ("5 Days") rides along.

### Adopt the mock; grey the future; park the undecided (grilling Q9–Q10)

Founder ruling: the app adopts the mock's layouts now. The line, precisely — **grey-out changes pixels, never ownership**; every greyed element's semantics still belong to its owning story:

| Mock element | Treatment in S1.3 |
|---|---|
| Create form · Daily Schedules · Add/Edit Activity | **Real** — mock-faithful, on existing theme tokens (never the mock's literal palette; that's the pre-E4 visual-direction decision) |
| Cover-photo tile · activity photo tiles | **Greyed, disabled** — tap answers with a graceful "photos arrive with a later update" (the S0.5 cosmetic-button pattern: never a dead click); S3.3 activates them |
| "Preview Itinerary" CTA on Daily Schedules | **Rendered disabled** + graceful message — the button is a position-promise; the flow behind it is S4.1's |
| Four-tab bottom nav (Home / Discover / Trips / Profile) | **Ships** — Trips live; the other three disabled-with-message. Dead chrome until E4, accepted knowingly by the founder |
| Preview/Publish/success screens · Booking panel · Standouts + best-time fields | **Not rendered** — semantics are open register items; pixels would pre-decide them |
| Trips-entry chooser (scratch/fork cards) | **Not built** — create hangs off the existing My Trips list; the chooser earns its screen when fork (S4.7) supplies the second card |

### API surface: additive, itinerary-addressed, member-gated

Constraints locked here; exact wire details (reorder mechanism, PATCH partial-update semantics) are the tickets' to refine *within them*: additive-only (ADR-008) · every endpoint through `requireMember` (404-mask for non-members, 401 for visitors — the standing S0.3 posture) · itinerary-addressed, workspace IDs stay off the wire (S1.2 precedent) · LWW whole-entity writes, no version/ETag machinery.

| Endpoint | Who | Notes |
|---|---|---|
| `POST /v1/itineraries` *(existing)* | any traveler | gains optional `description`, `durationDays` — mints N contiguous empty Days |
| `PATCH /v1/itineraries/{id}` | member | field edit: title, destinations, dates, description; stamps last-edited |
| `POST /v1/itineraries/{id}/days` | member | append (optional title) |
| `PATCH /v1/itineraries/{id}/days/{dayId}` | member | rename |
| `DELETE /v1/itineraries/{id}/days/{dayId}` | member | cascades activities; renumbers ordinals |
| `POST /v1/itineraries/{id}/days/{dayId}/activities` | member | create |
| `PATCH /v1/itineraries/{id}/activities/{activityId}` | member | edit any shipped field; `dayId` change = cross-day move; order change = reorder; stamps last-edited |
| `DELETE /v1/itineraries/{id}/activities/{activityId}` | member | delete |
| `GET /v1/itineraries/{id}` *(existing)* | member | response grows `description`, `lastEdited{by,at}`, `days[{id, ordinal, title, activities[…]}]` — additive; the plan is small enough to embed whole |

**Migration is purely additive** (`day` + `activity` tables; `description` + last-edited columns on `itinerary`): zero-day itineraries are *valid* — every pre-S1.3 row simply has no days, and the UI must handle that shape (it also occurs when `durationDays` is omitted). **No backfill ⇒ no migration-stepping IT** (the S1.2 precedent; S1.1's machinery has nothing to test here).

### Mobile scope

Screens per the grey-out map, through the repository/typed-`apiClient` layer only (ADR-001 — no raw fetch in UI) · date picker + duration control · pull-based refresh (no notifications, standing ruling) · register-#2 analytics log events: `day_added/removed`, `activity_created/edited/deleted`, `itinerary_field_edited` · web parity comes free from the shared codebase; verified in the preview container (standing rule), `drive-preview.js` for evidence.

## Deliberate deferrals (recorded, not silent)

| Deferred | To | Why |
|---|---|---|
| Preview/publish/success flow (mock screens) | S4.1 (register #11, enriched) | Publish semantics genuinely open (transition vs snapshot vs two modes); rendering would pre-decide. Publish-from-creation is now a *twice*-made UX proposal register #11 must reconcile with the state machine. |
| Standouts + best time of year | S4.1 publish metadata | Audience-facing; no reader until the public surface. **Standout** reserved in the glossary now. |
| Cover + activity photo upload | S3.3 (+ S4.1 metadata) | No media pipeline; tiles ship greyed with graceful taps. |
| Booking options panel | E6 elaboration (epic-map backlog) | One URL is the E1 baseline and E6's designed unfurl target; alternatives-per-activity duplicates E2's Decision; consumer framing belongs to E4. |
| `type` / `source` columns | First reader (E6/E4) | S1.2 column discipline; `'manual'` backfill trivially true later. |
| Activity geotag / structured place | Place Search (reg. #9) or first map surface (backlog) | Free text serves planning; structured place needs absent infrastructure. |
| Day reorder (swap ordinals) | If real usage demands | Not in the mock; additive. |
| Date-span↔day-count invariant | S1.7 | Cross-field coupling under LWW; dates start meaning something at lifecycle. |
| Create-method chooser screen | S4.7 (backlog) | A chooser with one method is a door with one exit. |
| Notes → public creator-tips split | S4.1 | One private field now; a public `tips` field is additive. |

## ACs → proof map

| # | AC | Proven by |
|---|---|---|
| 1 | Create with `durationDays: 5` yields five contiguous Days (1–5); omitted → zero days, and the plan renders/works | Contract IT + mobile test |
| 2 | Day ops: append/rename/delete; deleting Day 2 of 5 cascades its activities and renumbers to 1–4 — contiguity pinned at the storage layer | Service IT + storage IT (the `MembershipStorageIT` pattern) |
| 3 | Activity CRUD + ordering: manual order persists and round-trips; reorder within a day; cross-day move lands the activity at the target day; a typed time never changes order | Service/contract ITs |
| 4 | **A member who is not the owner** edits itinerary fields, creates/edits/deletes days and activities — and every write stamps `last_edited_by/at` with *that member* | IT through guard + service with the S1.2 two-account fixture |
| 5 | Authority boundary: the owner-only set (invite/delete/publish/lifecycle/transfer) rejects members exactly as before — no widening rode along | Existing suites + targeted IT |
| 6 | Guard regression: every new endpoint 404-masks non-members and 401s visitors; S0.3 + S1.1 + S1.2 guard ACs pass **unmodified** | Contract ITs + existing suites, zero edits |
| 7 | LWW semantics: two members' sequential whole-entity writes — the second silently wins, attribution follows; no 409/locking surface exists | IT (pins the *absence* of a conflict mechanism) |
| 8 | Est-cost isolation: the itinerary module gains no ledger/workspace-money reference; estimated cost appears in no balance path | Dependency check at review (no such path exists to test yet — the AC is the boundary staying clean) |
| 9 | Date picker + duration control work on the device; the web preview forks to the browser-native input | Device AC (dev build — no release-signed behavior differs here) + preview container |
| 10 | The grey-out map, exactly: greyed tiles/CTAs/tabs render disabled and answer taps with the graceful message — never a dead click, nothing undecided rendered | Device AC + `drive-preview.js` (page text, no console errors) |
| 11 | The founder-visible loop on the layer that ships: post-merge on deployed `dev`, A creates a 5-day plan, B (invited via S1.2) retitles a day, edits an activity, adds one — A sees all three with B's attribution after refresh | Post-merge check on deployed `dev` (closes the gate; name the database if SQL is involved — the S1.1 lesson) |

**Deliberate omissions, on the record:** no migration-stepping IT (purely additive, no backfill — see above) · no concurrent-write race ACs beyond AC 7's semantics (LWW *is* the designed answer to races; testing interleavings further is testing Postgres) · no offline-queue ACs (ADR-001's queued writes remain the mobile layer's standing behavior, not this story's new surface).

## Out of scope

Publish, preview, visibility, or any state transition · Standouts / best-time-of-year fields · photo upload of any kind · booking options panel · `type`/`source` columns · geotag / place search · locking, presence, edit history · comments (S1.4) · fork + create chooser (S4.7) · day reorder · notifications · palette/brand values (tokens only) · any non-additive /v1 change.

## Comments

- **2026-07-24 (S1.4 grilling, founder-ruled):** two of this spec's premises are superseded after shipping, deliberately. (1) **AC 7's pinned behavior — last-write-wins, no 409/locking surface — is reversed by ADR-014**: S1.4 ships a whole-itinerary single-writer edit lock, and the AC-7 IT that pins the *absence* of a conflict mechanism is removed/replaced there (the new tests pin the lock's presence instead). The `last edited by/at` attribution this spec shipped is retained. (2) **"comments (S1.4)" in Out of scope no longer points anywhere** — private comments were deleted from the domain at the S1.4 re-scope; Comment is public-only (S4.6, register #5). This spec body stays as point-in-time intent; see `docs/plans/S1.4-itinerary-edit-lock/spec.md`.
