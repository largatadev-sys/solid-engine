# S4.25 — Itinerary details pass

Status: ready-for-agent
Date: 2026-08-18 (grilled and specced the same day; frontier closed before writing)
ADR: **ADR-028** reserved — the ADR-008 waiver + the two model moves (currency to the Itinerary, destination to a scalar). Full text lands in `docs/design/adr-log.md` with the story's docs ticket.
Discharges (epic map): *Currency moves from the Activity to the Itinerary* · *A trip has ONE destination* · *Trip dates have no writer* · *Clearing a trip's start or end date is a silent no-op* (corrected — see Further Notes) · *The Standouts hint dies in S4.19's form unification*.

## Design baseline — do not lose this

- **Claude Design project:** "Design improvement request", project id `34e84995-d099-46dd-a784-3b762a09d6f4`
- **File:** `Itinerary Details Spec.dc.html` (canvas; imports `support.js`, the generic runtime)
- **Link:** <https://claude.ai/design/p/34e84995-d099-46dd-a784-3b762a09d6f4?file=Itinerary+Details+Spec.dc.html>
- **Re-import for a fresh session:** the `claude_design` MCP (`https://api.anthropic.com/v1/design/mcp`, auth via `/design-login`) or the DesignSync tool — `get_file` against the project id above.
- The four artboards are the binding design baseline (CLAUDE.md fidelity rule: copy the frame, markup included): **1** workspace header + tab row (facts line, cog, five tabs) · **1b** cog overflow, published-trip and editable-trip variants · **2** trip form edit mode (dates with drawn ✕ clears, currency picker, standouts hint) · **3** currency-change confirm dialog (exact copy) · **4** create mode (hint only).
- **One mock annotation is superseded by a founder ruling that post-dates the frames** (2026-08-18): artboard 4's note "currency defaults silently from the traveler's preference" — the default is **PHP** (decision 1). Artboard 2's "owner-only" note *stands*: the founder ruled details editing owner-only at spec time, reversing this same grilling's earlier any-member answer. Everything else in the frames was verified against the shipped baseline before adoption (cover block and standout reorder arrows are existing edit-mode behavior; the header's provenance slot exists; field order is unchanged).

## Problem Statement

A trip's basic facts are half-writable and scattered. Dates have had no writer since S4.19 retired the pickers — every trip created since shows a blank date eyebrow on its card, and the Details tab renders "Dates to be decided" forever with no way to decide them. Currency is a per-activity fact nobody sets deliberately: it is almost always the prefill, yet one odd activity collapses the published cost total to nothing. The wire carries a destinations *list* for a product that ruled one destination per trip — and the edit form already silently truncates legacy lists to their first entry on save. The Details tab duplicates the edit form's job while burying "where and when is this trip" behind a sixth tab. And travelers fill the Standouts field without being told what it is for.

## Solution

One pass over the trip's own facts. The trip gains a single **Trip Currency** (defaulting to ₱ PHP) and a single **Destination**. Dates become settable and clearable. The Details tab is deleted: destination and dates move to a read-only facts line under the workspace title, visible from every tab; a settings cog carries Edit details, View published, and Unpublish. The shared trip form's **edit mode** becomes the single post-creation editor of trip details — an owner act — gaining date fields with working clears and a currency picker. Create stays minimal. The standouts hint returns in both modes. Dates never appear on any public surface; duration remains the public fact.

## User Stories

1. As a trip owner, I want one place to edit my trip's details, opened from the trip itself, so that I never hunt for where a fact gets changed.
2. As a trip owner, I want to set my trip's start and end dates after creating it, so that the trip reflects plans as they firm up.
3. As a trip owner, I want to clear a date I set, so that a postponed trip honestly reads "Dates to be decided" instead of keeping a stale date.
4. As a trip owner, I want my trip to have a single currency, so that every activity price reads in one money and the published total can never silently vanish on a mixed plan.
5. As a trip owner, I want new trips to start in ₱ PHP without asking, so that the common case needs no decision.
6. As a trip owner, I want to change the trip's currency and be told plainly what happens to existing prices, so that relabeled amounts never surprise me.
7. As a trip owner, I want my trip to name one destination, so that cards, trending, and the published page read cleanly without a list nobody curates.
8. As a trip owner, I want destination and dates visible under the trip title on every workspace tab, so that the trip's frame is one glance away.
9. As a trip owner, I want details editing reserved to me, so that the trip's identity changes only by my hand while the plan stays collaborative.
10. As a trip owner, I want View published and Unpublish behind a quiet settings affordance, so that they are reachable without dominating the workspace.
11. As a trip owner, I want the Standouts field to say where standouts appear, so that I know why I am filling it.
12. As a trip owner, I want creating a trip to stay one short form — no dates, no currency — so that starting stays cheap.
13. As a collaborator, I want to see the trip's destination and dates in the header, so that I know the plan's frame without asking.
14. As a collaborator, I want to keep adding and editing days and activities exactly as before, so that planning stays collaborative.
15. As a collaborator, I want activity prices to carry the trip's currency automatically, so that I never choose a currency per activity.
16. As a collaborator, I want the settings cog to show me only what I can do, so that I am never offered an act that will be refused.
17. As a traveler browsing Discovery, I want every trip to name one destination, so that destination filters and trending buckets stay honest.
18. As a visitor on a published itinerary, I want to see the trip's duration and never its dates, so that published plans are useful without exposing when people travel.
19. As a traveler with an old trip that listed several destinations, I want it to keep its first destination, so that the trip still names where it went.
20. As a traveler with an old trip priced in another currency, I want existing prices to keep displaying in their stored currency until the owner changes the trip's currency, so that history stays honest.
21. As a future expense logger (E5), I want the trip to already know its currency, so that expense entry inherits it with no FX anywhere.

## Implementation Decisions

1. **Trip Currency joins the Itinerary** — a nullable currency value on the itinerary, **defaulting to `PHP` at creation, server-side** *(founder, 2026-08-18: "default to PH peso for now" — deliberately not seeded from the traveler's preferred currency; preferred currency keeps its one recorded meaning, the E5 expense default)*. Editable only through the details editor. Once set it is replace-only: on the wire, absent = keep, and an explicit null is refused like a null title.
2. **Backfill** — one migration: existing itineraries take the **unanimous non-blank currency of their activities when the activities agree, else `PHP`** (fallback adjusted from "owner's preferred" by the same ruling). Deterministic, no data destroyed — activity rows keep their own stored currency.
3. **Destination narrows to a scalar** — the same migration adds the scalar, backfills **keep-first** from the legacy list, and **drops the list column**. Keep-first is an owner-approved destructive step, chosen with the join alternative declined on the record (2026-08-18); it is safe in practice because the seeder appended its derived region *last*, so keep-first retains the authored place and drops the noise. Every response shape that carried the list (itinerary, published projection, discovery card, showcase, diary trip, suggestions) moves to the scalar; discovery search, trending, and typeahead stop unnesting.
4. **One ADR-008 waiver — ADR-028 — covers three /v1 semantics changes at once** *(standing ground: the installed clients are the founders' own)*:
   a. the destinations list becomes scalar `destination` on requests and responses;
   b. the itinerary update endpoint adopts **merge-patch semantics**: absent = keep, explicit null = clear, for the clearable fields (description, best time of year, start date, end date, standouts); title and destination remain required and refuse null. This replaces today's full-replace-with-exceptions behavior and becomes the standing convention in the API conventions doc for every future clearable field;
   c. **trip-details editing narrows to owner-only** *(founder, 2026-08-18, reversing this grilling's earlier any-member answer on the record: "edit details / publish are owner only; collaborators can just add to activities")*. A collaborator's field edit is refused the way other owner acts are refused, with the owner-act error, and plan writes (days, activities) stay member-wide, unchanged.
5. **Activity currency on save + bulk relabel** — the activity wire keeps its per-activity currency (additivity; old rows stay honest). On every activity save, the trip's currency is written into the activity. Changing the trip's currency **bulk-relabels every priced activity transactionally** — numbers untouched, labels swapped, no FX ever. The client shows the confirm dialog (artboard 3, exact copy) only when priced activities exist; otherwise Save proceeds silently.
6. **The Details tab is deleted** — the tab component, its tab-row key, and its entry in the tab-param mapping all go; a stale `?tab=details` deep link degrades to Day-by-Day via the existing fallback. Nothing else may render the tab.
7. **Facts line** — destination · dates joins the workspace header through the header's existing provenance slot, visible to every member on every tab. Exact strings per artboard 1: `Boracay · 12–19 Mar 2027` / `Boracay · Dates to be decided`. Exactly two facts; nothing else joins the line.
8. **Cog + overflow menu** — items are role- and state-filtered: **Edit details** (owner ∧ trip editable) · **View published** (any member ∧ published) · **Unpublish** (owner ∧ published, existing owner-act rules). The cog renders only when the menu has at least one item for this viewer — a collaborator on an unpublished trip sees no cog.
9. **The form** — edit mode is the single post-creation details editor, reached only via cog → Edit details. It gains start/end date fields (each with a drawn clear affordance — the web date input has none of its own) and the currency picker; the standouts hint "Shown on your published page." lands under the label in both modes. Create mode changes by the hint alone. Existing edit-mode behavior (cover block, standout reorder) and field order stay baseline. Date validation is unchanged: chronological when both present, either may be absent.
10. **Currency vocabulary unifies** — one canonical currency module: the 18-code supported list (sign + code + name) drives the picker per the mock; sign lookup falls back to the uppercased code, so legacy values outside the list still display correctly — they simply cannot be re-selected once changed away, accepted "for now". The two overlapping client maps (the sign map and the onboarding symbols map) collapse into it.
11. **Leases unchanged** — details editing still requires the header edit lease, exactly as the edit screen requires today. No new lease semantics.
12. **Dates are workspace-private — named invariant** — no public or published surface ever carries dates; duration is the public fact. Already true on the wire and pinned by the publish contract test; the spec names it so it stops being an accident.
13. **Seeder riders** — the fixture sets move to single destinations and the region-append logic is deleted (they must change anyway: they write lists against a wire that will refuse them). Reseeding any deployed rung remains gated on its own explicit approval.
14. **Docs land with the story** — ADR-028 in the ADR log; glossary gains **Trip Currency** and re-scopes **Destination** to singular; the API conventions doc gains the merge-patch section; the epic map closes the four discharged lines and corrects the clear-a-date line (see Further Notes); BUILD_STATUS gains the row before the merge.

**Candidate capability:** per-activity currency override — a trip priced in more than one currency (a capability, footprint-growing, not governance).

## Testing Decisions

A good test asserts external behavior at a seam — the wire, the rendered screen, the migration's before/after — never the implementation. Two 404-alike or 200-alike outcomes must be discriminated by code/body, not status alone (the repo's indistinguishable-outcomes rule).

- **Backend integration tests** (existing IT families are the prior art): a merge-patch matrix per field (absent keeps · null clears · null title/destination refused); the collaborator's details edit refused with the owner-act error while the same traveler's plan write succeeds (the discriminating pair); bulk-relabel transactionality (all priced activities relabel or none); creation defaulting to PHP.
- **Migration-stepping IT** (prior art: the workspace backfill IT): its own container, step to the prior version, seed legacy shapes by raw SQL — multi-destination rows with the region last, mixed-currency and unanimous-currency trips — then apply and assert keep-first and unanimous-else-PHP. **Sabotage-checked** (alter one seeded row, expect the named diagnosis) and run with compile-the-resources in the goal list, per the standing rule.
- **Mobile contract tests** (pure-module Jest, existing pattern): the form contract emits explicit nulls for cleared fields and the currency in the update request; the facts-line strings; the cog-menu visibility matrix (role × editable × published); the confirm predicate (currency changed ∧ priced activities exist). The two tests that pin the DatePicker's absence from the trip form flip to pin its presence — the ruling they enforced was reversed by its own author.
- **Playwright specs** (the H1 suite is the harness): the owner walk — facts line renders, cog opens, Edit details round-trips a date set + clear across reload, currency change passes through the confirm, the Details tab is gone; the collaborator walk — no Edit details offered, plan editing intact; the existing publish spec keeps pinning dates off the public wire.

## Out of Scope

The activity form (the shipped read-only currency sign simply starts reading the trip currency) · every public/published surface's design · preferred-currency editability and the searchable picker redesign (E5 riders) · the per-activity currency override (the candidate capability) · restoring an archive affordance (side-observation recorded on the epic map, not this story) · trips-list freshness · the crash/error telemetry story (its own pull, before S4.6/S4.8).

## Further Notes

- **Ruling provenance** (all founder, in-session): spec-drives-UI with Claude Design aligning after · one story S4.25 · scalar destination via waiver · keep-first backfill · bulk relabel behind a confirm · merge-patch convention · Details tab deleted with facts line + cog (reshaped mid-grilling from an earlier Details-tab edit-state design, on the founder's "do we need that tab?") · owner-only details editing (2026-08-18, reversing the earlier any-member answer in the same grilling) · PHP default (2026-08-18, superseding preferred-currency seeding).
- **The clear-a-date epic-map line was stale**: it recorded "the endpoint treats an absent field as unchanged", but the shipped endpoint is full-replace — absent and null both already clear dates. The defect it described did not exist in that form; what the line was really owed is the convention this story ratifies (absent = keep, null = clear) so a second writer can exist safely. The epic-map correction rides the docs ticket.
- **Multi-destination provenance**, for whoever reads the migration: the plural column was born from the original domain doc's "destination(s)" wording; the form was briefly multi during S4.19 and reversed by founder ruling at that story's close; the overwhelming population is seeder fixtures (roughly half the fixture trips carry 2–4 entries, plus a derived region appended last — which is what makes keep-first safe).
- The Claude Design frames may be visually refined in the project after this spec freezes; behavior, fields, and states in the frames are bound by this spec — a behavioral change in the canvas is a raise, not a baseline update.

## Comments
