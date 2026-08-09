# S4.19 — Workspace editing pass: the chip, the day pencil, one trip form

**Status:** ready-for-agent *(owner review passed 2026-08-09 — "all good")* · **Epic:** E4 · **Depends on:** S4.17 (shipped — both workspace surfaces this story edits), S4.15 (shipped — the create form the unification absorbs)

**Immutable point-in-time intent** (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** ADR-022 (two surfaces — untouched) · S4.17 decision 6 (the inline day rename this story re-affords; superseded in part, Comment appended there) and decision 10 (the details edit path — untouched) · S4.15 decision 8 (the create field set — amended here; Comment appended there) · S4.13 decision 8 (Duration mints days — untouched) · ADR-019/020 (lifecycle — untouched; the viewer chip keeps its four states) · S4.18, parked (buffered editing — it changes *when* edits persist, never how they are entered; no conflict, no dependency either way) · S4.16, declined (the four-call cover sequence this story must not break) · ADR-008 (no wire change here) · the glossary amendment (the editor's badge copy) lands in `02-domain-model.md` at implementation.

## The pull, on the record

The founder asked to "smooth out the trip workspace screens" (2026-08-09) with four changes; the grilling ran five rounds (grill-with-docs) and the code sweep contradicted three of the four premises — there is no screen title saying "Draft trip workspace" (the string is the editor's badge chip; the title is always the trip's name) · day renaming already exists behind an invisible tap-the-title affordance (S4.17 decision 6) · the edit-details screen already exists, headlined "Edit Trip", reachable from the editor's header pencil and the Details tab (S4.17 decision 10). Each collision was resolved explicitly rather than silently. The founder split the surviving work into two stories (this one and S4.20 — travelers → profile); this is the editing pass: the chip copy, the day pencil, the create/edit unification, one dead-string cleanup.

## Goal

The Draft Workspace's chip reads "Trip Workspace"; renaming a day is a visible pencil — the same icon the activity rows use; creating and editing a trip are one form component with two modes instead of two screens drifting apart; and the orphaned eyebrow label family is gone. No wire change, no lifecycle change, no day-count semantics change.

## Locked decisions *(founder, 2026-08-09, in grilling order)*

### 1 · The editor chip reads "Trip Workspace" — founder copy, held twice over the glossary flag

The editor surface's badge chip drops `Draft TRIP Workspace` for **"Trip Workspace"** (the uppercase render is the style's, unchanged). The viewer chip stays lifecycle-only: Draft / Ready / Ongoing / Completed, colors untouched. The glossary collision was flagged twice — canon names the *viewer home* "Trip Workspace" and the *editor* "Draft Workspace" (S4.15 ratification, register #3) — and the founder held both times: *"trip workspace if you are editing the itinerary. otherwise, use the lifecycle."* The glossary gets one amendment line at implementation: the surface canon names stay; the editor's *badge copy* is "Trip Workspace". The chip is where you are; the lifecycle chips are where the trip is.

### 2 · The day pencil replaces the invisible tap-to-rename

The activity rows' edit icon (the pencil-square, 16px accent) joins the **expanded day header** beside the existing trash, mirroring the activity row's pencil+trash pair. Tapping it opens the **existing** inline rename input — placeholder, blur-commit, mutation all unchanged. **The title's own tap-to-rename retires**: the pencil is the one rename affordance (*"remove the title tap. pencil will be the editing feature"*). The "Day N" prefix stays static and uneditable, exactly as today; the optional name is what renames. Authority is unchanged: renaming is member-wide plan editing (S4.17 decision 9), so members see the pencil; the trash stays owner-only. Both the pencil and the tap-removal are founder amendments to the S4.17 mock baseline, which draws no day-edit affordance at all (its digest names the trash as the only deviation there).

### 3 · One trip form, two modes — create and edit stop diverging by accident

The create form ("Plan a Trip") and the edit screen become **one shared form component with a mode contract**, on the founder's reason on record: *"that edit screen is different now from the create itinerary screen, right? it should be [one component]."* The mode contract, exactly as confirmed at the grilling's round 5:

- **Shared in both modes:** cover picker · Trip Title · **Destinations — multi in both, so create gains "+ Add destination"** (a recorded amendment to the S4.15 mock baseline, which draws a single Destination field) · Trip Description · Standouts · Best Time of Year. Required = title + at least one destination, both modes.
- **Create-only:** Duration (days) — still mints Day 1…N (S4.13 decision 8, untouched).
- **Edit-only:** Start/End dates.
- **Create chrome, unchanged:** headline "Plan a Trip", submit "Create Trip", `replace` to the Trip Created overview (S4.15 decision 2). The create flow is not re-designed here; it is re-housed.
- **Edit chrome:** headline "Edit Trip" (as shipped), submit **"Save"** (was "Save changes"), success returns to the origin screen. The header edit-lock acquisition and the archived/published frozen notices carry over unchanged.

No new entry points: the founder confirmed the itch was the divergence itself, not a missing door (q22 = nothing else). The edit screen keeps its two existing doors — the editor header pencil and the Details tab link.

### 4 · Dates and days stay decoupled — "the days will be affected" is dead

Confirmed twice (q17, q23 — both "a"). Editing start/end dates never touches the day list: the update endpoint edits header fields only, and day count changes only through Add a Day / day delete in the editor. Edit mode gets **no Duration field**. The original ask's premise ("full details editing… the days will be affected but it's fine") described coupling that has never existed; the grilling killed building it — a form field that silently deletes a planned day and its activities is a footgun the editor's explicit, one-at-a-time day management exists to prevent.

### 5 · Cover handling stays per-mode inside the shared form

The one place the unification can break something silently, pinned as its own decision: **create stages the cover and attaches it after the POST** (the four-call sequence S4.16 recorded — trip → lock → cover → unlock, with the lease ordering enforced server-side, so no client reordering can shorten it), while **edit uploads live under the header lease it already holds**. The shared component takes cover behavior from the mode, not from common code; a naive unification that gave edit's live-upload path to create would 409 against the server's lease rule and every unit test would stay green. S4.15's local-preview behavior on create is preserved as shipped.

### 6 · The eyebrow label family deletes

The `workspaceEyebrow` label system ("Draft Workspace", "Planning Finished", "Trip Under Way", …) is exported and consumed by nothing but its own test — an orphan since the S4.17 redesign, and dead strings in exactly the family this story edits. It goes, with its test.

## Deviations from the mock *(stated per the mock rule)*

| Mock (S4.17 set, frame 1) | Ships | Why |
|---|---|---|
| Badge "Draft TRIP Workspace" | "Trip Workspace" | Founder amendment (this story's pull, held twice over the glossary flag) |
| No day-edit affordance drawn | Pencil-square beside the trash in the expanded day header | Founder amendment; an invisible tap is not an affordance |
| *(S4.17 decision 6, shipped)* tap-the-title rename | Retired — pencil only | Founder amendment on the record |
| **(S4.15 set)** single Destination field on create | Multi-destination with "+ Add destination" | Founder amendment via the unification ruling |

## Wire changes

**None.** Create already posts `destinations` as a list (today always length one) — more entries ride the same field. The update endpoint is untouched. No waiver needed.

## Candidate-capability note *(ADR-009)*

None — no new capability. Renaming days, editing trip fields, and multi-destination all exist on the wire today; this story re-affords and unifies UI over existing acts.

## Acceptance criteria

1. The Draft Workspace chip reads "TRIP WORKSPACE" (rendered); the viewer chip is unchanged in all four lifecycle states.
2. The expanded day header shows pencil + trash for owners, pencil alone for members; the pencil opens the rename input; a committed name persists on blur and renders after the "Day N" prefix; **tapping the day title itself does nothing**.
3. One form component serves both modes. Create walks end-to-end exactly as S4.15 shipped it — plus multi-destination — through the Trip Created overview; a created trip carries every entered destination.
4. Edit round-trips every field (title, destinations, description, standouts, best time, dates), submits from a button labelled "Save", and returns to the screen it came from; back-exit abandons cleanly with the lock released; the archived/published frozen notices still render.
5. Creating with a cover still attaches it through the staged post-create sequence; editing a cover still uploads live under the held lease — neither path regresses (decision 5).
6. Editing start/end dates in any direction leaves the day list untouched: count, names, activities.
7. `workspaceEyebrow` and its test are gone; nothing else in the tree references it.
8. Dev-verified on the three rungs (API green · emulator walk · web-preview container walk) — the smoke rule.

## Testing decisions *(the seams — highest existing ones, one new; confirm at owner review)*

- **The one new seam is the form's mode contract**: a pure module declaring, per mode, the field set, the chrome (headline, submit label), and the submit shape. Unit-tested the way `validateItineraryForm` and `tripCreatedCopy` are — table-driven, no component harness. The component consumes the contract; the contract is what the tests pin.
- **`stateBadge` unit seam** (existing — `workspaceControls` test family): the editor-surface label asserts "Trip Workspace"; the four viewer states assert unchanged.
- **Validation converges** into one mode-aware validator (prior art: the `validateItineraryForm` tests): required = title + one destination in both modes; date rules edit-only.
- **Day-affordance logic** rides the existing `workspaceAffordances` pure-logic family if the pencil needs visibility logic beyond what `showsDayDelete` already models; the rename input's behavior itself is proven on the walk, not by a new harness ("renders on web" is not "works on web" — the S1.3 lesson).
- **The story gate is the highest seam**: the three-rung walk, with screenshots of the chip against S4.17 frame 1 and of the day header before/after; the create walk re-run because this story re-houses it (regression: S4.15's flow must be pixel-and-behavior identical apart from the added destination rows).

## Out of scope

S4.18's buffering (parked; when it lands it stages the same rename input this story re-affords) · any backend or wire change · the travelers tab, profile stub, and members retirement (S4.20) · any date↔day coupling · any create-flow redesign beyond re-housing (S4.15's decisions stand) · new entry points to the edit screen.

## Comments

*(append-only)*

### 2026-08-09 — implementation: the edit screen took create's styling, and the Standouts hint is the one real loss

Raised by the spec review, recorded here rather than in the deviation table because the body is immutable point-in-time intent.

Decision 3 pinned edit's *chrome* ("Edit Trip", "Save") but not its **skin**, and one component cannot wear two. The unification had to pick a visual language, and AC 3 pins create as behavior-identical to what S4.15 shipped while edit carries no equivalent pin — so create's styling won and the edit screen moved to meet it: docked CTA instead of the pill, `colors.surface` instead of `colors.background`, prompt placeholders instead of sample content ("Island Hopping in El Nido", "Palawan", "Dec – Apr" are gone), minus icons instead of text "Remove" buttons, and Best Time of Year now above Trip Description.

**The one content loss is the Standouts hint, "Shown on your published page."** — an explanation of where standouts surface, which create never had and edit now no longer shows. Nothing else deleted here carries information; that line does. It is a backlog line rather than a silent drop.

**Standouts reordering is per-mode, and the contract says so out loud.** Decision 3 lists Standouts flatly under "shared in both modes", but edit shipped ↑↓ arrows and create never had them: giving create the arrows regresses the pixels AC 3 protects, and taking them from edit drops a shipped feature nobody asked to lose. The mode contract carries `standoutsReorder` so the asymmetry is declared and tested rather than left to whichever screen was edited last — which is the drift this story exists to end.

**Clearing a date is still a no-op** (`updateRequestFrom` omits an empty `startDate`/`endDate`, exactly as the pre-S4.19 edit screen did). Carried over verbatim, not introduced here, and out of scope for a re-housing — but AC 4's "round-trips every field" is not strictly true in that one direction. Backlog line.
