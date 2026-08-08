# S4.15 — "Plan a Trip": the simplified create flow + Trips landing reconciliation

**Status:** needs-triage · **Epic:** E4 · **Depends on:** S4.13 (shipped), S3.3 (shipped — thumbnails activate here)

**Immutable point-in-time intent** (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** S4.13 (the create flow this amends; its decision 11 partially reversed on the record below) · ADR-020 (four-state lifecycle — untouched) · ADR-019 (three axes; gate and freeze untouched) · S3.3/ADR-021 (media pipeline — the thumbnail variant this story finally renders; the authenticated-media rule: never a bare `<Image>` URL) · S1.3 (grey-out shell pattern — the `comingSoon` wiring this story reuses) · ADR-016 (Inter + brand tokens — the ground for the font normalization) · ADR-009 (candidate-capability note below). The glossary ratification (Trip / Itinerary) lands in `02-domain-model.md` and closes register #3.

## The pull, on the record

The founder brought a new three-frame Figma CSS export (Trips landing · create-entry · published-success) on 2026-08-08 for a render and reconciliation, with a re-simplified flow: the landing CTA becomes **Plan a Trip**, the form submits as **Create Trip**, and creation lands on a **Trip Created overview** instead of dropping straight into the day builder. The grilling ran two rounds plus a confirm; the mock baseline is archived beside this spec (`create-itinerary-plan.txt`, rendered in `mock-render.html`).

The session's central finding: the request collided with three founder-locked S4.13 decisions (no celebration at creation · lifecycle-only sections · the locked field set), and each collision was resolved explicitly rather than silently — one reversed, one upheld with a compromise, one left standing.

## Goal

A traveler taps **Plan a Trip**, fills a simplified form, taps **Create Trip**, and lands on an overview confirming the trip exists (born `draft`, days minted from Duration). The Trips landing shows cover thumbnails on every card, publication badges where they apply, and the mock's redrawn chrome. Nothing about the lifecycle, the publish gate, or the wire changes.

## Locked decisions *(founder, 2026-08-08, in grilling order)*

### 1 · "Trip" and "Itinerary" are both canonical, split by meaning — register #3 closes

**Trip** = the traveler's journey-object through its whole lifecycle — everything on the traveler's own surfaces is always a trip (Trips tab, trip cards, Trip Workspace, Plan a Trip, Create Trip, Trip Created). **Itinerary** = the plan document the trip carries — **Finish Planning is what turns the working plan into a finished itinerary**, and publishing is what makes that itinerary discoverable/forkable. A trip *has* an itinerary; it never stops being a trip. The founder's framing — *"a trip becomes an itinerary once they finish the planning"* — is honored as the plan crystallizing, not the object renaming under the traveler's feet (the sharpened wording was confirmed against the collision scenario: a finished-planning object still sits under "Upcoming Trips" in the "Trip Workspace"). Code, routes, entities, and the wire stay `Itinerary` — this is UI language only. Ratified in the glossary; discovery surfaces keep saying "itinerary".

### 2 · Creation gains a **Trip Created** overview screen — S4.13 decision 11 partially reversed

Reversed on the record, four days after it was made: creation now ends on a dedicated overview screen (S4.13 had ruled "no celebration screen at creation" and routed create → Day 1). What **stands** from decision 11: the publish-success chrome (`[id]/published.tsx`) remains the publish act's screen, untouched — this new screen is a different route for a different moment. The trip is created on **Create Trip** (born `draft`, Duration mints Day 1…N per S4.13 decision 8 — both unchanged), then `router.replace` to the overview so back lands on Trips. Copy is **state-honest** — the mock's "is now available for travelers to discover and fork" is impossible for a born-`draft` trip under ADR-019 and does not ship. Shipping copy: title **"Trip Created!"**; body **"「title」 is saved to your trips. Open the workspace to start building the days."** Summary card: cover thumb (or placeholder) · title · "Destination • N Days" (destination alone when Duration was skipped).

### 3 · The overview's buttons: a greyed workspace door + a live preview

Primary **"Open Trip Workspace"** ships **greyed** (`comingSoon` pattern — "not yet implemented"): the Trip Workspace redesign has mocks ready but is not built; it is the story immediately after this one, and this button will point at the **new** workspace screen when it lands — it never targets the old `[id]/index`. Secondary **"Preview Trip"** is live → the existing preview screen. Consequences accepted on the record: until the workspace story lands, the forward path after creating is Preview → "Continue Editing" (→ day builder), or back → Trips; Trips-landing card taps keep their current per-state routing this story and re-point at the new workspace in that story; existing old-workspace references elsewhere (preview's published-state button, publish-success's "Back to Trip Workspace") stay untouched here and migrate there.

### 4 · The Trips landing sections stay lifecycle-only — S4.13 decision 4 upheld, with the badge compromise

The mock drew a "Published Trips" section and dropped "Upcoming" — not adopted: a section per publication state mixes ADR-019's axes (a published trip is also `completed` and would double-list). Sections remain the four lifecycle states; labels take the mock's plural style: **Ongoing Trips · Upcoming Trips · Drafts · Completed Trips**, empty sections hidden. In exchange, the **published/private row badges deferred from S4.11 decision 7 pull into this story** (the epic-map backlog line discharges here): publication facts render on the card, not as a section.

### 5 · Trip cards take the mock's anatomy, with real thumbnails

Per card: 76×76 cover thumbnail (radius 12) · date above title · title · the existing status slot (lease advisory / draft subtitle) · publication badge where it applies. The current destinations line **drops** (mock has none). Thumbnails render the S3.3 **thumbnail variant** through the authenticated media path (`useMediaSource` — never a bare `<Image>` URL, the S3.3 trap); a trip with no cover gets a neutral placeholder tile. Backend is untouched — `coverImageUrl` is already on the DTO.

### 6 · Landing chrome: mock adopted, two doors close for good

Header gains the mock's **search + filter icons**, wired to `comingSoon` (the S1.3 shell pattern — the tab bar's Home/Discover precedent). The Trips tab icon becomes the mock's **briefcase** (was map — icon fidelity rule). The **"Archived trips" link is removed** — archive semantics and routes stay, the entry point goes; restoring it is a backlog line. **"Add a Past Trip" is scrapped permanently** (founder: won't be implemented) — the greyed button goes, and the S4.13 backlog line that parked its argument closes as `wontfix`. The landing CTA becomes **"Plan a Trip"** with the mock's plus-circle icon.

### 7 · The create-method chooser retires

The "Create a Trip" chooser (Start from Scratch / Fork) and its redirect shim leave the tree — a door with one exit, already off the primary path. S4.7 (fork) supplies its own entry when it arrives; the epic-map line carrying the chooser's activation is annotated.

### 8 · The form simplifies its words, not its fields

The S4.13 field set is untouched (Trip Title · Destination free text · Duration mints days · Best Time of Year · Trip Description · Standouts; required = title + destination). Screen title **"Plan a Trip"**; submit **"Create Trip"**. Placeholders simplify from sample-content to prompts: Trip Title "Name your trip" · Destination "Where to?" · Duration "Days" · Best Time of Year "Best months to go" · Trip Description "What's this trip about?" · Standout "Add a standout".

### 9 · Styling: the mock's geometry verbatim, normalized to Inter and the token palette

The mock set disagrees with itself (landing in Geist, the other frames in Inter; two gray ramps). Ruled: **normalize to Inter** (the loaded family, ADR-016) and map grays to the nearest existing theme tokens — a stated deviation, treated as mock-set drift. Everything else copies verbatim: sizes, weights, spacing, radii, the filled `#F4F4F5` inputs with the near-black `#121212` 1px border (it appears deliberately on both form frames), the card shadow, the `#F05A28`-family CTA styling via the accent token.

## Deviations from the mock *(stated per the mock rule)*

| Mock | Ships | Why |
|---|---|---|
| "Published Trips" section; no Upcoming | Four lifecycle sections + card badges | Decision 4 upheld; axes don't mix |
| Success copy "available for travelers to discover and fork" | State-honest copy (decision 2) | Born `draft`; ADR-019 gate |
| Secondary button "Save Draft" | "Preview Trip" | The trip is already saved — the slot's job changed |
| Geist on the landing frame | Inter everywhere | Mock-set drift; ADR-016 |
| iOS status bar / home indicator chrome | OS-drawn | Platform |
| Search/filter icons functional | `comingSoon`-wired | Nothing to wire to before S4.3 |
| "Nippon 2027 w/ besties" duplicated across sections; published card reading "Continue editing…" | Real data per state | Mock sample-content artifacts |

## Wire changes

**None.** Every change is mobile UI; badges and thumbnails read fields the wire already carries. No waiver needed.

## Acceptance criteria

1. Trips landing CTA reads **"Plan a Trip"** with the plus-circle icon and opens the form directly; the chooser screen and its shim are gone from the tree.
2. The form is titled **"Plan a Trip"**, submits as **"Create Trip"**, and carries the simplified placeholders (decision 8's exact strings); required-field behavior unchanged.
3. Create Trip → overview screen via `replace`: back (hardware and web) lands on Trips, never the spent form. Overview shows the state-honest copy and the summary card (cover thumb or placeholder · title · "Destination • N Days", destination alone without Duration).
4. Overview primary "Open Trip Workspace" is greyed and fires `comingSoon` on both platforms (web alert fork included — the S1.3 dead-click rule); secondary "Preview Trip" opens the preview.
5. Landing sections render as **Ongoing Trips · Upcoming Trips · Drafts · Completed Trips**, empty sections hidden; membership derived from `state` alone.
6. Trip cards render the mock anatomy: thumbnail (S3.3 thumbnail variant via `useMediaSource`), date above title, no destinations line, placeholder tile when coverless, publication badge on published trips (public/private distinguished), lease advisory and draft subtitle unchanged.
7. Header search + filter icons render and fire `comingSoon`; the Trips tab icon is the briefcase; the "Archived trips" link and the "Add a Past Trip" button are gone.
8. The three-rung smoke passes: backend ITs green · emulator walk of the full flow (create → overview → preview → back → landing shows the new trip with thumbnail after a cover upload) · web preview container walk of the same (drive-preview.js, including the greyed button's web alert).
9. `[id]/published.tsx`, the preview's state-dependent CTAs, lifecycle transitions, and the publish gate are byte-identical in behavior — no test in those areas changes.

## Testing decisions

Unit: placeholder/copy strings pinned where they encode decisions (the state-honest overview copy, the CTA labels) · `tripSections` plural labels · badge selection logic. The overview navigation (`replace`, back-to-Trips) walks on the emulator, not simulated. Thumbnail rendering is verified on device and web preview with a real uploaded cover (the S3.3 `ANON GET` tell watched in the driver's request list). No migration, no IT changes expected.

## Candidate-capability note *(ADR-009)*

No new candidate. Every act this story adds or renames operates on the traveler's own object and grows no footprint; publishing remains the story family's recorded candidate (S4.11's note stands).

## Out of scope

The Trip Workspace redesign (mocks ready — the very next story; owns re-pointing the greyed button, card-tap destinations, and old-workspace references) · search, filters, Discover (S4.3) · restoring the archived-trips entry point (backlog) · any backend or wire change · fork (S4.7).

## Comments

*(append-only)*
