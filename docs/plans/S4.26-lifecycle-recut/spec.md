# S4.26 — Lifecycle re-cut: three states, trips born `upcoming`, and the Trips surface becomes tabs

**Status:** specced — grilled 2026-08-20 (two rounds + a facts round, this spec is the ratified record) · awaiting `/to-tickets` and the owner's pass · **Epic:** E4 (the lifecycle family: S1.7 → S4.11 → S4.13 → this) · **Depends on:** S2.1 (shipped — the E2 grilling where the re-cut was ruled), S4.13 (shipped — the four-state ladder this re-cuts), S4.24 (shipped — edit-in-place, which drained `draft` of its last mechanical meaning) · **the Claude Design canvas** (pending — seeded from `design-brief.md` §3; the UI half does not build until it lands)

**Immutable point-in-time intent** (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** The epic-map park (E2 grilling, 2026-08-20 — pulled here; the trigger, *immediately after S2.1*, fired at S2.1's merge) · **ADR-029** (this story's decision record — supersedes ADR-020's ladder, upholds its gate and freeze; amends ADR-027: the "Active" label and the Step back UI retire) · ADR-022 (its Finalize/Ready language retires with the state) · ADR-008 (**waiver #3, on the record**) · V21 + its migration-stepping IT (the remap precedent) · `DiaryService` (capture already gated `ONGOING`/`COMPLETED` — the diary needs nothing) · `design-brief.md` beside this spec (the behavior spec, the data contract, and the canvas seed prompt).

## The pull, on the record

The re-cut was ruled at the E2 grilling (2026-08-20, the lifecycle sidebar) and parked deliberately as its own story; the trigger — *the founder pulls this immediately after S2.1* — fired at S2.1's merge. The pull grilling (same day, three rounds) ratified the park's L2–L6 proposals **in amended form** and absorbed a founder raise: **the Trips surface presents the lifecycle as tabs.** Sections die with the fourth state.

## Locked decisions *(founder, 2026-08-20 — E2 grilling for 1–5, the pull grilling for 6–11)*

### 1 · The ladder is three states, and trips are born `upcoming`

**`upcoming` (planning — the birth state) → `ongoing` → `completed`.** `draft` deletes. The creation flow's screens do not change — a created trip simply lands in `upcoming` with no terminal declaration to make.

### 2 · The Finalize act retires with its state

The act, the `FinalizeSheet`, ADR-022's Finalize/Ready language, and the "Ready" label all go. The CTA ladder collapses to: `upcoming` → **Start Trip** → `ongoing` → **Complete Trip** → `completed` → **Publish**.

### 3 · The diary gate needs nothing

Capture is already server-gated to `ONGOING`/`COMPLETED` (`DiaryService`), so "ongoing is when you can add to diary" is current behavior, untouched.

### 4 · This is an ADR-008 waiver (#3), taken deliberately

Trips born `upcoming` · `draft` never emitted again · `finish-planning` answers a permanent named 409 — **dormant, never removed**; old clients cannot reach it, because after the remap they never see a draft, so their Finalize button never renders · `category=draft` stays **accepted-and-empty**. Standing ground unchanged from waivers #1–2: every installed client is a founder's own.

### 5 · One remap migration, owner-gated

`draft → upcoming`, one `UPDATE` (V36; the V21 precedent, migration-stepping IT included). Approved in principle at the ruling; **the file is still proposed to the owner before it runs anywhere** — a data-rewriting migration is beyond the story's additive tables, stop-rule territory by the letter.

### 6 · The Trips surface becomes three fixed tabs: Upcoming | Ongoing | Completed

Ladder order, left to right — supersedes the park's "three sections" proposal (L2) and today's stacked `SectionList`. Tabs are fixed chrome: **all three always render** (sections hid when empty; tabs cannot). Per-tab empty states, one line each; **the create CTA lives only on Upcoming's empty state** (creation births `upcoming` — that is where a new trip lands). **Archived stays off the tab row** — it is a different axis (ADR-019's discipline), remaining a quiet separate route. *Recorded fact: that route (`itineraries/archived`) currently has **no door from anywhere** — same orphan family as the archive act itself (epic-map line). Whether the tabs surface gives it a quiet link is the canvas's call; this story does not owe the archive act a door (the cog-menu line stands).*

### 7 · Landing is adaptive

Land on **Ongoing if it holds a trip, else Upcoming.** Mid-trip is the one moment the surface's answer is obvious; most travelers have zero ongoing trips most of the time. Cost accepted: walks must seed state before asserting the landing tab.

### 8 · Row anatomy inside a tab: the lifecycle badge dies

The tab *is* the lifecycle fact — a state badge on every row of its own state's tab says nothing. The **publication badges** (S4.15) and the amber **lease advisory** stay: facts the tab does not carry. The Draft subtitle dies with its state.

### 9 · "Active" dies as a lifecycle label — everywhere *(amends ADR-027)*

The tab says **Ongoing**, so every surface says Ongoing: the workspace viewer badge reads **"Ongoing"**, the glossary drops Active as `ongoing`'s presentation, and the axis collision ADR-027 reintroduced (lifecycle "Active" vs workspace "Active" = not-archived) dissolves — one state, one name, every surface. "Ready" dies with the declaration it described (decision 2).

### 10 · Step back retires from the UI; `reopen` stays functional-but-unsurfaced

Only the forward CTA survives on the viewer. The **no-undo consequence is accepted on the record**: a mis-confirmed Start Trip has no in-app walk-back. The `reopen` endpoint stays on the wire, **functional** (ADR-008 — removing UI is free; hard-409ing a working, harmless endpoint buys nothing and burns the correction path): `completed → ongoing → upcoming`, refusing at `upcoming` with the named 409 — **the floor**, since `draft` no longer exists. A rare genuine mis-tap is one API call away, not psql.

### 11 · Both forward transitions gain a confirmation drawer

**Start Trip and Complete Trip each confirm in a bottom drawer before acting** — the mitigation that replaces Step back's undo. Today neither confirms (`lifecycle.mutate` fires straight off the tap); a mis-tapped Complete Trip would land where the publish gate opens with no way back. One transition-drawer component, per-state wording (the `stepBackWording` table's shape, pointed forward); FinalizeSheet's visual pattern survives as this component even as FinalizeSheet itself dies. Publish keeps its existing preview flow; unpublish keeps its confirm.

## Mechanics *(the decisions' consequences)*

- **`ItineraryState`**: `DRAFT` deletes; `next()`/`previous()` re-anchor with `upcoming` as the floor; `admitsPublishing()` unchanged (`COMPLETED`).
- **`TripCategory`**: `DRAFT` **stays parse-accepted** and maps to no state — the accepted-and-empty branch (today `parse` throws `UnknownTripCategoryException` → 400 on unknowns; `draft` must not become unknown). The other three categories are untouched.
- **`finish-planning`**: stays mapped (`ItineraryController`), permanently refusing with a named 409 — the dormant-endpoint posture.
- **Migration V36**: remap `state = 'DRAFT' → 'UPCOMING'` (enum **storage** spelling is uppercase — the `@Enumerated(STRING)` contract; the wire's lowercase is a different contract). Stepping IT per the `WorkspaceBackfillIT` pattern: own container, `.target(V35)`, seed legacy `DRAFT` via raw SQL, migrate to V36, assert — sabotaged once under `mvn -o test-compile failsafe:integration-test` to prove it can fail (the S4.13 lesson).
- **Mobile — the re-cut half**: `workspaceControls` (BADGES lose `draft`, "Ready" → "Upcoming", "Active" → "Ongoing"; LADDER loses `finish-planning`; `showsStepBack`/`stepBackWording` die; a forward-confirm wording table joins for decision 11), `FinalizeSheet.tsx` dies whole, the transition drawer is born.
- **Mobile — the tabs half**: `tripSections` re-cut to a tabs module (three tabs, ladder order, adaptive-landing helper — pure functions, Jest-first); `trips.tsx` swaps `SectionList` for the tab row + per-tab list. Tab row idiom: reuse the existing in-page pattern (`ProfileTabs` precedent) with `role=tab` (the S4.20 harness lesson — drivers match roles, and tabs are not buttons). Data shape: the listing already takes `?category=` server-side; per-tab query vs client grouping is the ticket's call — no wire change either way.
- **Blast radius** (measured at the grilling, grown by the pull rulings): ~6 backend files + ~7 mobile files + docs. The real cost is mechanical churn — **29 backend IT files** call `finishPlanning` in fixtures, **9 mobile Jest files** and **12 Playwright specs** reference draft/Finalize/sections/Step back/Active. Fixtures re-anchor to born-`upcoming` (the call simply drops); no shim, no compat layer.

## Wire changes *(ADR-008 waiver #3 — all recorded in ADR-029)*

- `POST /v1/itineraries` births `upcoming` (semantics change; fork inherits — a fork is born `upcoming` too).
- `state` never emits `draft` again, on any response or projection.
- `POST /v1/itineraries/{id}/finish-planning` → permanent named 409 (dormant, never removed).
- `POST /v1/itineraries/{id}/reopen` — **functional, floor at `upcoming`**: named 409 there (previously stepped to `draft`). No UI renders it.
- Trips listing `?category=draft` → 200 with an empty list, permanently.

## Candidate-capability note *(ADR-009)*

**None.** The story removes a state and its ceremony and re-clothes a listing; no new act exists, nothing grows footprint, nothing passes the potentially-gated test.

## Design baseline & handoff

**The design baseline is a Claude Design canvas that does not exist yet.** `design-brief.md` beside this spec carries: **§1** the normative behavior spec (tabs, landing, empties, row anatomy, drawers), **§2** the data contract (every field the surface can render — no wire change needed), **§3** the paste-ready canvas seed prompt. The founder seeds the canvas from §3 (the S2.1 flow, inverted to prompt-first); the canvas comes back as the design baseline under the mock-fidelity rule; its digest is archived beside this spec before the UI tickets build. The re-cut half (backend + remap + wording tables) is not gated on the canvas; the Trips-surface and drawer UI is.

## Docs this story amends *(ride the feature branch)*

ADR-029 minted · ADR-020/022/027 index rows annotated · 02-domain-model: the ladder, the journey, and the glossary (Ready, Active-as-lifecycle-label, Finish Planning retire; Upcoming becomes the birth state; Fork births `upcoming`) · the epic-map line struck as pulled · the BUILD_STATUS row (flips ✅ in the last commit before merge).

## Acceptance criteria

1. A created trip is born `upcoming`: the create response says so, and no code path — create, fork, remap — can produce `draft` (IT).
2. `finish-planning` answers the named 409 for every state, owner included; the route stays mapped (IT).
3. The forward ladder walks `upcoming` → Start Trip → `ongoing` → Complete Trip → `completed` → Publish on both rungs — **each of Start/Complete through its confirmation drawer** (cancel leaves state untouched; confirm transitions). No Step back affordance renders anywhere, in any state, either surface (Jest + spec).
4. `reopen` steps `completed → ongoing → upcoming` and answers the named 409 at `upcoming` (IT only — no UI drives it).
5. V36 remaps every `DRAFT` row to `UPCOMING`: the stepping IT passes, and a sabotage run under `test-compile` was seen to fail first (stated in the write-up).
6. `category=draft` answers 200-and-empty, not 400 (IT).
7. Trips renders the three fixed tabs **Upcoming | Ongoing | Completed** in that order; landing is Ongoing iff it holds a trip, else Upcoming (walk seeds both cases); each tab shows its empty state when empty, with the create CTA on Upcoming's alone; rows carry no lifecycle badge, and the publication badges + lease advisory still render (Jest + spec).
8. The workspace viewer badge reads **"Upcoming" / "Ongoing" / "Completed"** — "Ready" and "Active" appear nowhere in the app (Jest string bans, the `completionSummary` precedent).
9. Diary capture is unchanged: `upcoming` refuses, `ongoing`/`completed` accept (existing IT family re-anchored, none deleted).
10. The publish gate and the freeze are unchanged: publish refuses below `completed`; the freeze binds on `published` alone (existing ITs re-anchored, none weakened).
11. The shipped UI matches the canvas frame-for-frame (mock-fidelity rule), deviations named.
12. The full sweep runs once, before the promotion proposal: backend ITs (counts read from the summary, never the exit code), the mobile Jest suite, and `npm run smoke` — the churn is this story's cost and the sweep is the proof it is paid.

## Testing decisions *(the seams — all existing, none new)*

Backend: the touched IT families exist (lifecycle transitions, publish gate, diary gate, guard masking, listing filters); the work is re-anchoring fixtures from `finishPlanning(...)`-then-act to born-`upcoming`. The one new test is the V36 stepping IT (own container — never `PostgresTestBase`'s singleton). Mobile: the tabs module and the forward-confirm wording table are pure functions, Jest-first (the `landingSlot` precedent); `workspaceControls` tests re-cut. Walks: the 12 affected Playwright specs re-anchor; the create→ladder→publish spec (drawers included) is the story's walking proof; adaptive landing gets both seedings.

## Out of scope

Any new lifecycle surface beyond the tabs (banners, nudges — dead since the E1 gate, stay dead) · the social-proof signal (its own backlog line, E4) · permanent deletion (parked) · an archive door (the cog-menu line stands; the canvas may give the archived *list* a quiet link, the archive *act* is not this story) · publish/visibility/archive semantics (untouched) · entitlement code (none exists; none improvised).

## Comments

**2026-08-20 — the design baseline landed** (`Trips Spec.dc.html` + README, seeded from `design-brief.md` §3; reconciliation in `design-baseline-digest.md`). The UI half's gate is met. The canvas **resolves** the open choices (archived link drawn — Completed tab only; no tab counts; stateful cancel labels) and **amends** four spec details on the record: the Plan a Trip bar rides the Upcoming tab always (not only its empty state — amends decision 6's wording), the tab selection is session-sticky over the adaptive landing, the card gains a destination · day-count sub-line and drops the date overline, the advisory goes amber. It also adds a normative motion contract (M1–M4; M2 becomes the app-wide sheet pattern). **One conflict is open for the founder**: the day count is not on the listing wire (`summaryOf` sends empty days) — additive `dayCount` field (recommended) vs dropping the count from the sub-line; this amends "tabs need zero wire changes" either way it lands.

**2026-08-20 — day count ruled (a), tickets published.** The founder took the recommendation: an **additive `dayCount` on the listing response** (no waiver — additive), riding ticket 01; the canvas's card sub-line ships as drawn. Five tickets published to `issues/` in dependency order (01 → 02 ∥ 03 → 04 → 05), breakdown owner-approved at the quiz; statuses flip to ready-for-agent at the owner's pass over the files, and implementation starts on the owner's word — the S2.1 flow.

**2026-08-20, owner review — passed.** All five tickets verified as written; statuses flipped `needs-triage` → `ready-for-agent`. Implementation deliberately not started — the owner triggers the build.
