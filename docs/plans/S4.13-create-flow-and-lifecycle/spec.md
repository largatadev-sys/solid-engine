# S4.13 — Create-itinerary flow rebuild + the four-state lifecycle

**Status:** ready-for-agent · **Epic:** E4 · **Depends on:** S4.11 (shipped), S4.12 (shipped)

**Immutable point-in-time intent** (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** **ADR-020** (the four-state lifecycle — recorded at this grilling) · ADR-019 (the three axes; its ladder amended, its axes/gate/freeze upheld) · ADR-018 (naming argument, third application: "Finish Planning", never "Complete") · S4.11 (the model this amends; its `WriteFence`, publish gate and migration-stepping discipline all inherited) · S4.9 (the trip surfaces this partially re-draws; the mock-is-baseline rule) · S1.3 (grey-out shell pattern; day/activity screens' first shape) · ADR-013 (day-indexed plans) · ADR-014 (leases — untouched) · ADR-008 (fifth waiver in this family: `active → ongoing` rename + `upcoming` addition, standing ground: the installed clients are the founders' own) · ADR-009 (candidate-capability note below).

## The pull, on the record

The founder brought the final create-itinerary Figma set (seven frames, Trips landing through published-success) for a render and reconciliation on 2026-08-04. The reconcile found 14 divergences from the model that shipped two days earlier (S4.11); the grilling resolved all of them and, in doing so, the founder re-drew the lifecycle with a missing rung: *"draft (planning) → upcoming (planning finished) → ongoing (currently doing the trip) → completed (trip completed)."* That is **ADR-020**. The mock digest is archived beside this spec; the rendered frames + findings table: `https://claude.ai/code/artifact/bd670bbb-10d4-455f-8a23-155b35a9a0c6`.

The central question the grilling opened with — *does "Create Itinerary" produce a trip or a publication?* — resolved as: **a trip, born `draft`**; the publication act stays where ADR-019 put it (owner publishes a `completed` trip to the feed), and the creation flow's terminal act is the new lifecycle step, not publish.

## Goal

A traveler creates a trip through the redrawn flow — trip details, daily schedules, activities with a booking link, preview — and finishes planning, landing the trip at `upcoming`. The Trips screen shows every trip in one of four lifecycle sections. The trip advances through its life by the traveler's taps, and only a completed trip can be published, at which point the existing publish machinery (gate, freeze, success chrome) takes over unchanged.

## Locked decisions *(founder, 2026-08-04, in grilling order)*

### 1 · The lifecycle is four states (ADR-020)

`draft → upcoming → ongoing → completed`. `upcoming` is new — planning finished, trip not started. `active` renames to `ongoing` on the wire (waiver five). Every transition is the traveler's tap; dates never flip state (a date-holding trip may nudge, pull-based — register #10's resolution survives); one-step undo runs down the whole ladder (`upcoming → draft` is "reopen planning"); jumps refused; the lifecycle stays pinned while published. Existing rows: `draft`/`completed` keep their values, `active` rows remap to `ongoing` — a data migration with real rows on deployed dev only, so the migration-stepping IT is mandatory (the S4.11 pattern, sabotage-verified).

### 2 · The creation flow's terminal act is **Finish Planning** (`draft → upcoming`)

Never "Complete" — one word must not name *done planning* and *the trip happened* (ADR-018's naming argument). Finish Planning is a milestone, not a padlock. It lands the traveler on the workspace with at most a toast — no celebration screen.

### 3 · The publish gate stays at `completed`; the freeze stays solely on `published`

Both unchanged from ADR-019/S4.11. No lifecycle state ever locks the plan: `upcoming` stays editable (else Finish Planning becomes a trap travelers learn to avoid) and unpublished `completed` stays editable (completion is when the record gets corrected — the freeze's ground is readers, and readers arrive at publish). `WriteFence` ships untouched.

### 4 · The Trips landing renders four lifecycle sections

**Ongoing · Upcoming · Draft · Completed**, in that order, empty sections hidden — replacing S4.11's chips. The mock drew three sections; `Upcoming` is the model-forced fourth (deviation stated per the mock rule). The card's status slot carries **only** the lease advisory (amber "Currently being edited", any card, while a lease is live); Draft cards keep the mock's "Continue editing your Trip Workspace" subtitle; **no publication/visibility badges yet** (S4.11 decision 7's badge placement deferred to the epic-map backlog, not deleted).

### 5 · The tab bar is four tabs; the FAB dies

**Home · Discover · Trips · Profile**, per the mock. The lifted + FAB and its route come out; creation's only door is the Trips screen's orange **Create Itinerary** CTA. "Search" renames to **Discover** (the ADR-019 vocabulary). Home and Discover stay greyed-with-analytics until S4.3, as S4.9 ruled for their predecessors.

### 6 · "Add a Past Trip" ships greyed

The second CTA renders in the grey-out shell pattern (visible, dead, honest). The founder wants the argument before the door — *"you can just create and complete an itinerary anytime"* — and the argument is parked on the epic-map backlog. Birth stays `draft`-only; no birth-state parameter is minted.

### 7 · The booking card ships whole — one per activity

Purpose · Provider · URL · Estimated Price, exactly as drawn — but **one per activity**, never a repeatable list: the semantics are *what the traveler used to book* (provenance, forked as plan data under INV-6), not an offer menu. The URL rides the existing external URL field; purpose, provider and price join as additive nullable fields. The booking price duplicating the activity's estimated cost is **carried knowingly, on the record** (founder overruled the drift objection). When E6's unfurler lands, these manual cells become its fallback, never its rival.

### 8 · Days own the day count; Duration is creation-time sugar

The create screen's Duration control mints Day 1…N once, at creation, and never reappears. Day count is thereafter edited only where days live (the day-tab **+**, day deletion); every later surface derives "N Days" from the day count — which is what the published projection already does by rule.

### 9 · Media ships greyed; S3.3 stays queued behind this story (option A, founder call)

Cover upload, per-activity photos, and the preview gallery all render as the existing greyed-media pattern. The blob-storage decision rides with S3.3, where it always lived.

### 10 · The preview is honest chrome

The stats card renders as drawn with **true zeros** (Reviews and Forked cannot be nonzero until their stories exist — zero is fact, not fake); the money cell reads **"Est. Cost"** — never "/Person", which asserts a headcount semantic the model refused (S4.1: creator-stated, uninterpreted; per-person is a backlog question). The banner reads *"This is a preview of your itinerary page — what other travelers will see if you publish."* Byline (avatar, name, @handle) resolves to the current owner; Overview/Day-by-Day tabs as drawn.

### 11 · The published-success screen re-homes to the publish act, untouched

Frame 7's chrome — "Your Itinerary is Live!", discover-and-fork copy, Copy Link / Share to…, View Published Itinerary — is a correct publish-success screen pinned to the wrong act. It fires when a `completed` trip publishes (from the workspace), where every line of it is true.

### 12 · Destination stays free text

The mock's picker affordance dies; the traveler types "El Nido, Palawan" as today. The curated-places question stays parked for S4.3, its first genuine reader.

### 13 · The selling-points field is labeled **Standouts**

Never "Trip Highlights" — the exact collision the glossary resolved at S1.3 (**Highlight** is a published Diary's projection). "Add Highlight" becomes "Add Standout". The preview frame already says Standouts; the form follows.

## Wire changes *(one waiver covers all — fifth in this family, standing ground)*

- Lifecycle enum: `upcoming` added; `active` → `ongoing`. The transition endpoint family gains the `draft → upcoming` step and the extended one-step undo; existing `/start`, `/complete`, `/reopen` re-anchor to the four-state ladder.
- Activity: three additive nullable booking fields (purpose, provider, price amount + currency) beside the existing external URL.
- Everything else is client-side.

## Acceptance criteria

1. An itinerary is created `draft`; `state` carries four values on the wire; no `active` value survives anywhere (wire, data, client).
2. **Finish Planning** moves `draft → upcoming` from the creation flow's preview; the traveler lands on the workspace; the trip appears under **Upcoming** on the Trips screen.
3. **Start trip** moves `upcoming → ongoing`; **Mark completed** moves `ongoing → completed`; both are taps; a date-holding trip may nudge but never transitions itself.
4. One-step undo works down the whole ladder (`completed → ongoing`, `ongoing → upcoming`, `upcoming → draft`); two-step jumps are refused naming why; every transition is refused while published.
5. Publishing a `draft`, `upcoming` or `ongoing` trip is refused with the precondition named in the UI (the S4.11 dialog pattern); publishing a `completed` trip succeeds and fires the re-homed success screen.
6. Plan edits work in every unpublished state including `completed`; a published trip refuses plan edits and accepts membership acts (the S4.11 fence, re-verified over four states).
7. The Trips screen renders four sections in order — Ongoing · Upcoming · Draft · Completed — empty sections hidden; section membership derives from `state` alone.
8. The card status slot shows the amber lease advisory on any card whose trip has a live lease, and nothing else; Draft cards show the workspace subtitle; no publication badges render.
9. The tab bar is Home · Discover · Trips · Profile; no FAB; Home and Discover are greyed with analytics taps; creation routes only from the Trips CTA.
10. "Add a Past Trip" renders greyed below Create Itinerary and does nothing, honestly.
11. The creation flow walks the drawn frames: trip details (cover greyed, Standouts labeled and editable, Duration mints days), daily schedules (day tabs + add-day, day title, activity list), activity form (name, time, estimated cost, location free text, description, notes, photos greyed, booking card), preview, Finish Planning.
12. The booking card accepts purpose, provider, URL and price on one activity, round-trips them through the API, and forks with the plan *(fork itself is S4.7 — the AC here is the fields persist and appear in the activity read model)*.
13. Day count changes only via day add/delete after creation; the preview and every surface derive "N Days" from the day count.
14. The preview shows true-zero Reviews/Forked, "Est. Cost" with the derived single-currency total, the owner byline with @handle, and the honest banner copy.
15. The migration remaps `active → ongoing` and is proven by a stepping IT on its own container, sabotage-verified; the deployed-dev check names the database and uses a discriminating probe (the S1.1 rule).
16. Backend and mobile suites green; `tsc` clean; the three-rung verification (API smoke + emulator walk + rebuilt web-preview container) closes the story.

## Testing decisions

- **Highest seams, all existing.** Backend: the `/v1` endpoints through the REST IT harness (the S1.7/S4.11 lifecycle IT pattern extends to four states); the migration-stepping IT on its own container (the S4.11 `ItineraryAxesBackfillIT` pattern — mandatory because deployed dev holds real `active` rows and every other surface sees the remap as a no-op). Mobile: the pure helper modules (the publish/lifecycle control helpers, the section mapping that replaces the category helpers) absorb the model change under unit test; screens through the existing Jest patterns; the repository/query layer is the boundary — screens change, `apiClient`/queries stay (ADR-001), new endpoints enter additively through that layer.
- **Good tests here assert external behavior**: a transition's wire response and refusal codes, a section's membership for a given `state`, the fence's accept/refuse per state × published — never helper internals.
- **The web preview is verified by driving the rebuilt container** (intercepting `window.alert` per the S1.3 lesson), never by render-only checks; device ACs close on the emulator.

## Candidate-capability note *(ADR-009)*

No new candidate. Every act this story adds — the lifecycle taps, Finish Planning, the booking fields — acts on the traveler's own object and grows no footprint. Publishing to the feed remains the story family's one recorded candidate (S4.11's note stands).

## Out of scope

- **S3.3 media** — cover, activity photos, gallery all greyed; blob storage decided there.
- **The discovery feed (S4.3)** — Discover stays greyed; the feed's per-viewer filtering was S4.11's obligation and is untouched here.
- **"Add a Past Trip" behavior** — greyed; the argument is an epic-map backlog line.
- **Repeatable booking options** — parked (epic map, partially discharged); one card per activity only.
- **Per-person cost semantics** — backlog; the cell reads "Est. Cost".
- **Curated destinations / place picker** — parked for S4.3; free text ships.
- **Drag-to-reorder gesture** — arrows remain (standing backlog line); the drawn grip handle stays an affordance promise.
- **Publication badges on Trips cards** — deferred to backlog (decision 4).
- **The friend graph, reviews (S4.5), comments (S4.6), fork (S4.7)** — preview zeros and share chrome reference them; none builds here.

## Comments

*(Append-only. Intent changes during implementation land here, never in the body above.)*
