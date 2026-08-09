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

### 2026-08-09 — founder addendum 4: the form goes back to the S4.15 mock, and multi-destination is reversed

*Founder, with `S4.15-plan-a-trip/mock-render.html` open: "why did we change the overall look of the screen? there was a mock screen there for create itinerary. that is the one we should use. just change the texts to what we have now."*

**The founder was right and the mock rule was not followed.** Rendering frame 2 beside the shipped screen showed four structural drifts nobody had recorded as deviations: the mock stacks a **bare chevron above a large 28px title** (we put a circled chevron inline beside a smaller one) · its cover button reads **"Upload from camera roll"** (we shipped "Upload photo(s)") · **Destination and Duration share one row** via `.fieldrow` (we stacked them full-width) · and **Duration is a dropdown** `.input-dd`, 120px wide with a `⌄` (we shipped a free-text number input). The text changes *were* correct — the mock's own note ratifies "Plan a Trip"/"Create Trip"/simplified placeholders — so the founder's summary was exact: keep the texts, restore the frame. Values were read from the mock's own CSS per the standing rule, not eyeballed.

**Duration becomes a dropdown, 1–30 days plus a blank.** It reuses the existing `OptionPicker` (modal + `⌄`, already cross-platform) rather than a new component, and it makes the *"Duration must be a whole number of days"* validation unreachable from the UI. The server's 366-day cap is no longer expressible on create — a deliberate narrowing, since the mock draws a picker and 30 days covers the trips this flow is for.

**Multi-destination is reversed in BOTH modes — and the founder then settled the question underneath it: "a trip can only have one destination."** That ruling is what makes the reversal correct rather than merely mock-faithful. S4.19 decision 3 (multi in both modes, the founder's own amendment at this story's grilling) is superseded on the record, and edit loses a capability it had *before* S4.19 — deliberately, because it was modelling something the domain does not have.

**Consequence, asked as its own question before the ruling arrived and unchanged by it: destinations 2+ are dropped on save.** `tripFormValuesFrom` keeps only `destinations[0]`, so the first save of a legacy multi-destination row writes one. Walked for real: `{Hanoi,Sapa,"Ha Long","Ninh Binh"}` → **`{Hanoi}`**. With one destination ruled canonical this is a **model correction, not data loss** — the extras were never reachable for editing and should not have existed. The contract test pins the behaviour so it stays deliberate.

**What is left over is plumbing, and it is on the epic map:** `destinations` is still a `List<String>` on the wire and in the column, and `TripRow`/`tripCardAnatomy`/the published projection still join every entry — so a legacy row *displays* four until someone saves it. Narrowing to a single `destination` is a `/v1` change needing the ADR-008 waiver conversation plus a backfill decision, so it is parked with the next schema-touching story rather than smuggled into this one.

### 2026-08-09 — founder addendum 3: the date pickers retire, reversing the same day's "keep them" call

*Founder, third pass on the same question: "the edit screen is different from the create screen right? why can't we reuse the create screen for editing?"*

**The premise was already false and the third asking is what made that worth investigating rather than restating.** `/edit` had shared `TripForm` with `/new` since ticket 04; screenshotting both side by side showed identical cover tile, field styling, labels and docked CTA, differing only in headline, submit label, Duration and dates. **The question was not "why are they different screens" but "why does one have fields the other lacks"** — and the founder's answer, when the two images were put side by side, was to drop the dates.

**Reverses the "Keep the pickers" call made hours earlier in this same session, with the same consequence restated before proceeding:** `startDate`/`endDate` stay on the wire and existing values keep rendering, but **nothing can now set them** — the pickers were their only writer, so `tripCardAnatomy`'s "Mar 2027" eyebrow will be blank on every new trip. Stated twice, chosen twice; recorded here so it is not rediscovered as a bug.

**The trap this could have shipped, and the check that caught it:** removing a field from a form removes it from the *wire* when the endpoint replaces rather than merges (regression checklist line 22). `updateRequestFrom` still sends the hydrated `startDate`/`endDate`, and the walk proved it on a trip that **had** dates — title changed to "S4.19 dates survive", `2027-11-02`/`2027-11-14` unchanged in the database afterwards. Verifying on a fresh trip would have proven nothing, because a fresh trip has no dates to lose.

**The validator keeps its date rules**, now keyed on `mode === 'edit'` rather than a field flag: the values still arrive from the server and a malformed row must not silently pass. `showsDates` is deleted rather than left `false` in both modes — an unread flag is exactly what the code review made this story delete once already.

### 2026-08-09 — founder addendum 2: no lifecycle act may run while another traveler holds the Editing Session

*Founder: "the owner cant finalize an itinerary if it is still locked, like someone is still editing it."*

**This was a real hole in the backend, not a missing button state, and it predates this story.** `ItineraryService.finishPlanning` did `authorizeAndLoad` → mutate → record, with **no lease check at all** — and neither did `start`, `complete`, `reopen` or `publish`. An owner could end planning while a member was mid-edit, and the member's editor would keep writing into a trip that was no longer a draft. A parameterized IT proved it before the fix: **all 5 refusal cases failed, while the holder-passes and lease-expiry cases already passed** — so the guard was the only thing missing on every act.

**Why it stayed invisible until now:** Finalize used to live *inside* the Draft Workspace, so reaching it required holding the session. Moving it to the viewer (addendum 1, above) turned a latent hole into a reachable one — the founder found it the same day the door opened.

**Fix: a lease-only guard on all five acts** (founder's scope choice). It throws `EditLockedException` → **409 `EDIT_LOCKED`** naming the holder, and correctly lets the session *holder* through, so an owner editing their own trip is never blocked by themselves.

**The first attempt reused `requireNoForeignSession` and was wrong — caught by the full suite, not by the new test.** That method opens with `fence.requireEditable`, which refuses **any published trip**, so putting it on the lifecycle acts made a published trip answer `ITINERARY_PUBLISHED` where it had always answered `ILLEGAL_STATE_TRANSITION` (`ItineraryPublicationIT.aPublishedTripPinsItsLifecycleUntilItIsUnpublished`). The publication fence is a *different* concern that these acts already enforce through their own domain rules, and folding it in would have masked the real refusal with a misleading code. `requireSessionFreeForLifecycle` checks the session and nothing else; the existing method is untouched for its `DayService`/`ActivityService` callers. **The new IT gained a case pinning exactly this** — reopening a published trip must still raise `IllegalStateTransitionException`, so the guard can never swallow that refusal again.

**Semantics change, stated rather than assumed.** `publish` gains a failure mode it never had, which touches CLAUDE.md's *"changing publish/visibility semantics"* stop rule — raised with the founder, who chose all five knowing that. It is **additive under ADR-008** (no rename, retype or removal; a new error path on an existing endpoint), so no waiver is needed, but old app versions can now see a 409 from `publish` where they previously could not.

**Client half:** `ladderCta` takes the viewer's traveler id and returns `blockedBy` when a foreign session is live; the workspace greys the CTA and prints *"Being edited by @handle"* above it (founder's choice over hiding it — a disappearing button reads as a bug). Verified the greyed control is genuinely inert, not merely dim: the click raises no sheet and the state does not move — the S1.3 dead-click check.

Walked on both rungs with the verified pool (t1 owner, t2 member, seeded through the real invite → accept): owner's `finish-planning` returned **409** with the trip still `DRAFT`; after t2 released, the same call returned **200** → `upcoming`. Web showed Finalize greyed on a draft, mobile showed **Start Trip** greyed on a Ready trip — the same guard on two different rungs.

### 2026-08-09 — founder addendum: Finalize moves to the Trip Workspace, and the editor's rail becomes Save Changes alone

*Founder, on the running build: "you don't need to edit the workspace to be able to finalize it. just like how the start trip button appears, its not on the workspace mode."*

**The asymmetry, which nobody had named:** `LADDER` carried `draft: null`, so Start Trip, Complete Trip and Publish Itinerary all sat on the **viewer** as one-tap acts, while Finalize — the act that ends planning — was reachable *only* by entering the Draft Workspace and acquiring an Editing Session. Three of four lifecycle steps were free; the fourth demanded a lease. Draft now gets its rung (`finish-planning` / "Finalize Itinerary") and the rule reads cleanly in one line: **the workspace drives the lifecycle, the editor edits.**

**Moved, not duplicated** (founder's choice when asked): the editor's rail is now **Save Changes alone**. `showsFinalize` is deleted from `WorkspaceAffordances` rather than left unread — the viewer's Finalize is gated by `ladderCta`'s existing `isOwner` check, so owner-only holds without a second flag, and the member case was already covered by the "hides every ladder CTA from a member" test that loops all four states.

**The confirmation sheet travels with the button** (founder's choice): `FinalizeSheet` now renders on the viewer, so a tap on the trip list's workspace cannot end planning by accident. Verified on both rungs — the tap opens the sheet with the state still `DRAFT`, and only confirming flips it to `UPCOMING`.

Three of the founder's four notes in the same message needed **no change** — they described behaviour that already shipped, which is worth recording so it is not "fixed" again: only the owner can finalize (`showsFinalize` was already `editing && isOwner`); the editor rail already had exactly one Save Changes; and the edit screen already *is* the create screen (this story's own unification — the founder read the new shared form as the old screen because it still carries dates). The dates were queried as leftovers and **kept** on the founder's call: they are the only writer of `startDate`/`endDate`, which `tripCardAnatomy` reads for the Trips card eyebrow.

### 2026-08-09 — implementation: the edit screen took create's styling, and the Standouts hint is the one real loss

Raised by the spec review, recorded here rather than in the deviation table because the body is immutable point-in-time intent.

Decision 3 pinned edit's *chrome* ("Edit Trip", "Save") but not its **skin**, and one component cannot wear two. The unification had to pick a visual language, and AC 3 pins create as behavior-identical to what S4.15 shipped while edit carries no equivalent pin — so create's styling won and the edit screen moved to meet it: docked CTA instead of the pill, `colors.surface` instead of `colors.background`, prompt placeholders instead of sample content ("Island Hopping in El Nido", "Palawan", "Dec – Apr" are gone), minus icons instead of text "Remove" buttons, and Best Time of Year now above Trip Description.

**The one content loss is the Standouts hint, "Shown on your published page."** — an explanation of where standouts surface, which create never had and edit now no longer shows. Nothing else deleted here carries information; that line does. It is a backlog line rather than a silent drop.

**Standouts reordering is per-mode, and the contract says so out loud.** Decision 3 lists Standouts flatly under "shared in both modes", but edit shipped ↑↓ arrows and create never had them: giving create the arrows regresses the pixels AC 3 protects, and taking them from edit drops a shipped feature nobody asked to lose. The mode contract carries `standoutsReorder` so the asymmetry is declared and tested rather than left to whichever screen was edited last — which is the drift this story exists to end.

**Clearing a date is still a no-op** (`updateRequestFrom` omits an empty `startDate`/`endDate`, exactly as the pre-S4.19 edit screen did). Carried over verbatim, not introduced here, and out of scope for a re-housing — but AC 4's "round-trips every field" is not strictly true in that one direction. Backlog line.
