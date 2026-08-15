# S4.24 — Edit-in-place: the soft lock retires, and activity price goes optional for real

**Status:** ready-for-agent *(the owner-review pass happened live — every decision below was founder-ruled in the 2026-08-15 grilling, three rounds plus an addendum, and the seams were confirmed before publication)* · **Epic:** E4 · **Depends on:** nothing in flight — S4.17/ADR-022 (the two surfaces + the session), S4.18/ADR-023 (the staged buffer + version-checked save), ADR-019/020 (the three axes), S4.1 (the published projection) are all shipped.

**Immutable point-in-time intent** (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** **ADR-027** (this story's decision record — supersedes ADR-022 decision 2) · ADR-022/023 (the surfaces, the Editing Session, the staged buffer — all stand) · ADR-019/020 (ladder, gate and freeze — untouched) · the mock-fidelity rule (two **named founder-ruled deviations** from the S4.17 frames, listed under Further Notes) · the glossary as updated 2026-08-15 (Itinerary Workspace · Ready · Active · absent-price semantics).

## Problem Statement

Editing a trip that is past planning costs a state. Edit Itinerary on any unpublished non-draft trip fires one `reopen` before the editor opens, so a mid-trip correction demotes the trip the traveler is physically on — it reads "Ready" until Start Trip is re-tapped, the diary refuses new postcards while demoted (entry creation gates on ongoing/completed), and non-draft editing is owner-only because reopen is an owner act. Plans change mid-way; adding, changing or removing an activity must not cost a state.

Separately, the activity form refuses to save an activity without a price — not by design, but because the currency field arrives prefilled with the traveler's home currency and the both-or-neither pairing rule then demands an amount. Price was already optional in the domain, the API and the database; the form's convenience prefill made it mandatory by accident.

## Solution

Edit Itinerary opens the editor — now the **Itinerary Workspace** — in place, from every unpublished, unarchived lifecycle state, for any member. No reopen, no state change, no re-climb, no diary blackout. Ready softens from "sealed" to "declared travel-ready"; Finish Planning survives as the milestone gating Start Trip; Step back grows to Ready so a mis-tapped Finalize keeps its undo. The `ongoing` state presents as **"Active"** (label only). The prefilled currency becomes a hint that turns into data only when an amount is typed, so a price-less activity saves cleanly; the published estimated total says **"From ‹sum›"** whenever at least one activity is unpriced, so the optionality never quietly understates a trip's cost.

## User Stories

1. As a trip owner, I want Edit Itinerary on a Ready trip to open the editor without demoting the trip, so that fixing the plan doesn't cost me the state I already declared.
2. As a trip owner mid-trip, I want to add, change or remove an activity while the trip stays Active, so that the plan tracks reality without bookkeeping detours.
3. As a trip owner mid-trip, I want editing the plan to leave the diary open, so that a plan correction never blocks my co-travelers from posting postcards.
4. As a trip owner of an unpublished Completed trip, I want to correct the record directly, so that completion means "the trip happened", not "the plan is locked".
5. As a trip member, I want Edit Itinerary available to me on Ready, Active and unpublished Completed trips, so that mid-trip changes — usually my information — don't have to route through the owner.
6. As a trip member, I want the Editing Session to keep serializing edits ("being edited by …", Edit disabled while held), so that in-place editing doesn't become blind co-editing.
7. As a trip owner, I want Finish Planning to keep marking the plan travel-ready and gating Start Trip, so that the milestone survives even though it no longer locks anything.
8. As a trip owner, I want later edits to never retract Ready, so that the declaration I made stays mine to make and unmake.
9. As a trip owner, I want a quiet Step back on a Ready trip, so that a mis-tapped Finalize has an undo now that Edit Itinerary no longer reopens.
10. As a traveler, I want the trip being lived to read "Active" on its badge and list rows, so that the label says what the state means.
11. As a traveler in the editor, I want the header chip to read "Trip Workspace" in every state, so that the chip tells me where I *am* while the viewer's chip tells me where the *trip* is.
12. As a trip owner of a published trip, I want Edit Itinerary to stay absent and the plan frozen, so that publishing keeps its meaning (out-of-scope guard, unchanged behavior).
13. As a trip owner of an archived trip, I want editing to stay refused, so that archive keeps freezing acts on the trip (unchanged behavior).
14. As a traveler adding an activity, I want to leave the price empty and save, so that I can plan things whose cost I don't know yet.
15. As a traveler adding an activity, I want the prefilled currency to cost me nothing when I skip the amount, so that a convenience never becomes a requirement.
16. As a traveler adding a free activity, I want to state 0 explicitly and see "Free", so that free and unknown stay different facts.
17. As a forker reading a published itinerary, I want the estimated total to read "From ‹sum›" when some activities are unpriced, so that a partial total never poses as a complete one.
18. As a forker reading a published itinerary where nothing is priced, I want no cost stat rather than "From ‹0›", so that absence reads as absence.
19. As a traveler, I want every amount rendered in its stated currency's own sign (₱ for my PHP data), so that numbers keep their meaning.
20. As a trip owner unpublishing a trip, I want the confirm dialog to say what unpublish does — takes the page down and thaws editing — so that it stops claiming a state change ("returns to a draft") that has never been true since the axes split.

## Implementation Decisions

All founder-ruled at the 2026-08-15 grilling; the durable record is **ADR-027**.

1. **The demotion removal is client-only.** The backend already permits session acquire and plan save in every unpublished state — the write fence checks `published`/archived, never lifecycle. No endpoint changes, no schema changes, no migration. `reopen` keeps its endpoint (ADR-008) and its one remaining UI home, Step back.
2. **`editItineraryAction` returns `edit` in every unpublished, unarchived state, for members too.** The `reopen-then-edit` action kind retires; the non-draft owner-only branch retires with it (its excuse was reopen's owner-ness). The blocked/hidden cases (session held by another, archived, published, no edit permission) are unchanged.
3. **The viewer's edit handler stops calling `reopen`** — it routes straight to the editor. The lifecycle CTA rail (Finalize · Start Trip · Complete Trip · Publish), the published-trip redirect and the archive banner are untouched.
4. **`showsStepBack` grows the `upcoming` rung** (owner-only, quiet, same treatment as ongoing/completed). Copy for the Ready rung: reopen planning.
5. **`stateBadge`: the editor chip reads "Trip Workspace" in every state** (the S4.19 ruling generalized — the draft-only special case becomes the rule); the `ongoing` badge label becomes **"Active"** everywhere state renders. **Label only:** the wire, the TS union and the stored enum keep `ongoing` — the wire rename was priced (waiver + literals at minimum, a data migration at full depth) and declined; the drift is documented in the domain model's lifecycle section, the `upcoming`/"Ready" precedent.
6. **Editor chrome for non-draft trips: Save Changes is the only act.** Finalize remains reachable only where it is today (the draft flow); lifecycle acts live on the viewer. Session semantics — exclusive hold, staged buffer, version-checked bulk save, TTL self-heal, session-free requirement on lifecycle transitions — are all unchanged (ADR-022/023).
7. **The activity form's prefilled currency is a hint, not data.** With the amount empty, validation passes regardless of the currency field's content and the request carries neither cost field. A typed amount still requires a currency (the pairing rule's real job survives). The dormant booking-price field is untouched.
8. **Absent price means "not stated"; free is an explicit 0.** No display currently renders per-activity cost outside the published total, and this story adds none.
9. **The published estimated total gains a partial fact.** Partial = at least one activity has no stated cost (an explicit 0 counts as stated). The published response grows one additive boolean beside the existing estimated-cost object; the mobile label renders "From ‹formatted sum›" when it is set. The single-currency collapse (no total when stated prices span currencies) is unchanged, partial or not. Amounts keep rendering via the existing per-currency sign map.
10. **The unpublish confirm copy is corrected** to state what unpublish does: the public page comes down, editing thaws. No behavior change.

## Testing Decisions

Behavior only, at existing seams — the story adds no new seam (confirmed with the founder pre-publication):

1. **`workspaceControls` pure-function tests (Jest)** — the story's decision core: `edit` in every unpublished state and for members, `reopen-then-edit` gone, Step back on `upcoming`, "Active" label, editor chip uniform. Extends the existing test file.
2. **Activity-form pure tests (Jest)** — `validateActivityForm` passes on empty amount + prefilled currency; `buildActivityRequest` omits both cost fields when the amount is blank; typed-amount-needs-currency still refuses.
3. **Published-projection tests, both sides** — backend failsafe IT on the published view (S4.1 prior art) for the partial boolean's rules (one unpriced ⇒ partial; none priced ⇒ absent; explicit 0 counts as stated; mixed currencies still collapse); mobile Jest on the projection/format helpers for the "From" label and the no-stat case.
4. **Backend edit-path IT (existing failsafe seam)** — pins the domain rule the UI now leans on: Editing Session acquire + bulk plan save succeed at `upcoming`, `ongoing` and unpublished `completed`; refused when published or archived. Expected to pass against today's server unchanged — its job is making the rule regression-proof.
5. **The walk** — the buffered-plan web walk extends: enter the editor from a *Ready* trip through the real Edit Itinerary affordance, save, assert the state never moved. Story close runs the standing three-rung smoke (API + emulator + web preview).

A good test here asserts what a traveler or a client can observe — an action's availability, a state that didn't change, a label, a refusal code — never the internals that produce it.

## Out of Scope

- The publish freeze and everything published-side beyond the additive partial boolean (ADR-019/020 explicitly out of scope; the unpublish *flow* is untouched — only its confirm copy is corrected).
- The archive fence and the audience ladder (S4.23's posture stands).
- Any wire or storage rename of `ongoing` — priced and declined; label only.
- Per-activity or per-day cost rendering on any card (still consumer-less today) and any mixed-currency total improvement.
- The booking card's dormant editing UI and its price field.
- Trips-list freshness (its own deferred backlog line) and anything Editing Session-structural (TTL, exclusivity — ADR-022/023 stand).

## Further Notes

- **Candidate-capability note** (standing rule): none new — the story cheapens an existing capability (plan editing) and loosens a form; nothing footprint-growing, nothing gateable.
- **Named mock deviations** (mock-fidelity rule, founder-ruled at the grilling): Step back rendered on a Ready trip, and Edit Itinerary live on non-draft viewers — the S4.17 frames draw neither, and ADR-027 records both.
- **Why the price rider shrank:** the backlog line billed it as "a validation loosening, additive within /v1"; inspection found price optional at every layer since V7, with the mandatory *feel* produced by the prefill/pairing collision. The fix is form semantics plus canon, not wire.
- The grilling's full decision trail (three rounds + addendum, eleven questions + eight follow-ups) is summarized in ADR-027; the glossary and epic-map updates landed with it on 2026-08-15.

## Comments

**2026-08-15, implementation — an all-free plan still renders no total, and this story deliberately did not change it.** Decision 9 rules that "an explicit 0 counts as stated", and the partial boolean implements exactly that: a plan of `500 PHP` + `0 PHP` totals `₱500` and is **not** partial. But a plan where *every* activity is an explicit `0` has produced **no estimated total at all** since S4.1 — `EstimatedCost.derivedFrom` discards zero-amount activities when deciding whether a total exists (`counted.isEmpty()` → `Optional.empty()`), which is also what makes "a plan priced entirely in one currency plus some free items" pick the right currency. So the free/not-stated distinction this story made load-bearing **collapses in that one corner**: "everything is free" and "nothing is priced" both render as absence, where story 16 wants them different.

It was left alone knowingly. Changing it means reversing a rule an existing test pins on purpose (`aPlanOfNothingButFreeActivitiesHasNoEstimatedTotal`), on the published projection — a surface whose cost semantics were founder-ruled at S4.1 — for a case no ticket names and no user story describes. Decision 9 scopes this story's published-side change to *"one additive boolean beside the existing estimated-cost object"*, and a second, different change to what the stat shows is outside it.

**The question for whoever picks it up:** should a fully-priced free plan read **"Free"** (or `₱0`) rather than showing no cost stat? If yes, the fix is small — split "does a total exist" (any *stated* price) from "which currency does it take" (the non-zero ones) — but it needs the founder's call on what a `₱0` published trip should say, and a matching answer for the currency-less case. Carried to the epic-map backlog with that trigger.

**Also corrected here, uncommissioned:** `FINALIZE_SHEET_BODY` promised *"the itinerary will be locked for your group to follow"* — the soft lock this story retires. Shipping a dialog that promises a lock we removed is a false claim on the exact act the story redefines, so it was rewritten to say what Finalize now does (marks travel-ready, gates Start Trip, editing continues). No ticket asked for it; recorded here rather than left silent.

**Step back's confirm reaches all three rungs, not only Ready.** Ticket 01 asks for "reopen-planning confirm wording" on Ready, where the undo previously did not exist. `ongoing` and `completed` had a Step back that fired `reopen` **silently** — and stepping back from Active closes the diary for every co-traveler, which is precisely the consequence this story spent its length removing from the edit path. Leaving Ready as the only rung that asks, while the rung with the real side effect stays silent, would have been incoherent; all three now carry per-state wording. Disclosed on the epic map's named-deviation line.
