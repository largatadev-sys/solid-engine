# S4.38 — UI spec: Delete, Leave & Unpublish on Profile and Trips

Status: ready-for-agent

*Minted by /to-spec on 2026-08-27, when the founder's design handoff arrived (archived at `design/`; the interactive prototype is the design baseline — read its markup for any fidelity question). This document extends `spec.md` (the grilling record and API contract, which stand unchanged); where the handoff's text collides with the ratified semantics, the Reconciliations section below is authoritative.*

## Problem Statement

A traveler has no consistent way to remove things they see on their own screens. A postcard they regret, a published itinerary they want off the world, a trip that clutters their Trips list, a trip they were added to and are done with — each either has no affordance at all or a different, unfinished one. The result is a Trips list and a Profile that only ever grow.

## Solution

One removal language across both screens, from the handoff: **trips are swiped, everything inside a trip is kebabbed.** A swipe on a Trips-screen card reveals Delete (owned) or Leave (member). A kebab on a Profile postcard or itinerary card opens the house bottom sheet with its menu. The weight of the confirm follows the blast radius: postcard delete and leave get no confirm and a 5-second undo toast; unpublish gets no confirm and a Republish toast; trip Delete — the act that removes the trip from every member's world at once — gets a centre-screen modal with an acknowledgement tick. Under the hood nothing is destroyed when a trip is "deleted": the verb performs archive (the ratified S4.38 semantics), and the owner's Archived list remains the quiet restore path.

## Reconciliations — where the handoff text yields to the ratified semantics

The handoff was authored against the pre-pivot instant-delete model. Its **geometry, motion, components and interaction patterns are adopted whole**; its *semantics prose* is corrected in four places:

- **R1 — Trip Delete is archive-backed.** The modal → collapse → "Trip deleted" toast (no undo) UX ships exactly as drawn, but the commit calls `POST /v1/itineraries/{id}/archive`, not a destruction that does not exist. The Archived list (owned-only, already shipped) is the de-facto bin; the modal does not advertise it.
- **R2 — The modal's copy cannot claim destruction that does not happen.** The prototype's body ("This deletes the plan, the chat, the photo dump and every member's postcards and photos — for everyone, instantly. It cannot be undone.") is factually wrong under archive: nothing is destroyed and the owner can restore. Shipping copy: body — **"This removes the trip for everyone — the plan, the chat, the photo dump, and every member's postcards leave Largata immediately."**; acknowledgement — **"I understand this removes the trip for {n} other members."** The dropped sentence is "It cannot be undone." Every visible effect the new copy names is true the moment archive lands. *Flagged as the story's one named deviation from the mock — semantic, not platform — for founder review at the gate.*
- **R3 — "Trip delete fires immediately — there is no undo window" stands**, and is safe precisely because the backend is archive: a mis-confirmed delete is recoverable from the Archived list even without a toast.
- **R4 — The handoff's API blocker is real and becomes backend work in this story**: the trips listing cannot distinguish Delete from Leave (no viewer role on `ItineraryResponse`) and the acknowledgement needs a member count. Both ship as additive fields (Implementation Decisions below). ADR-008 additivity holds.

## User Stories

1. As a trip owner, I want to swipe a trip card left and delete it, so that my Trips list only shows trips I care about.
2. As a trip owner, I want a modal that makes me acknowledge the effect on other members before the delete commits, so that I never remove a shared trip by accident.
3. As a trip owner, I want the delete to remove the trip from every member's lists and every public surface at once, so that "deleted" means gone, not lingering.
4. As a trip owner who mis-deleted, I want the trip recoverable from my Archived list, so that a mistake costs a minute, not a trip.
5. As a trip member, I want the same swipe on a trip I don't own to offer Leave instead of Delete, so that I can declutter without pretending authority I don't have.
6. As a trip member who left by swipe, I want a 5-second Undo, so that a mis-swipe doesn't cost me my membership.
7. As a traveler on my Profile's Diary tab, I want a kebab menu on each postcard with Delete, so that I can remove a postcard I regret.
8. As a traveler deleting a postcard, I want the row to collapse immediately with a 5-second Undo toast, so that removal feels instant but forgiving.
9. As a traveler who deletes the last postcard in a diary, I want the diary card to collapse with it, so that I never see an empty diary shell.
10. As a traveler who taps Undo on that last postcard, I want the diary card and the postcard both restored in place, so that undo is total.
11. As a traveler on my Profile's Itineraries tab, I want a kebab with Unpublish on a published itinerary, so that I can take a trip off the world without touching the trip itself.
12. As a traveler who unpublished, I want the toast to offer Republish for 5 seconds, so that a mis-tap is a state change and back.
13. As a traveler, I want the kebab's non-destructive entries (edit details, view published page, copy public link) to take me where they say, so that the sheet is the one menu for the object.
14. As a traveler, I want at most one overlay at a time — sheet, then collapse, then toast — so that removal never buries me in chrome.
15. As a traveler who has never seen the swipe, I want the top card to peek once on arrival, so that the gesture is discoverable without a tutorial.
16. As a traveler with Reduce Motion on, I want every rise, collapse, stagger and the peek skipped while scrims still fade, so that the app respects my setting without going broken-looking.
17. As a traveler on any tab of Trips, I want the undo toast to clear the Plan a Trip bar when it is present, so that the safety net never covers the primary action.
18. As a traveler mid-undo-window, I want a newer removal's toast to cleanly replace the older one and commit the older action, so that rapid actions never tangle.
19. As a member of a trip whose owner deleted it, I want it gone from my lists on my next focus with no dead card, so that someone else's cleanup never strands my UI.
20. As a traveler whose postcard delete is deferred behind the toast, I want the app to simply not send the call if I undo, so that undo is instant and free.
21. As the owner of an archived-by-delete trip, I want it listed in Archived trips like any archived trip, so that there is exactly one place old trips live.
22. As a traveler, I want every removal surface to update the acting screen from the mutation response and everyone else by focus-freshness, so that no screen needs a manual refresh (the recorded S4.34 posture).

## Implementation Decisions

- **Backend (additive, /v1-safe):** the itinerary summary payload gains **`viewerRole`** (`"owner" | "member"`, resolved from the requesting traveler's Membership — the guard's resolved role, never a second authority check) and **`memberCount`** (the workspace's member total, for the acknowledgement copy). Both additive on `ItineraryResponse`; old clients ignore them. The itinerary module obtains both over the workspace module's service interface (ADR-002 — the `itineraryIdsFor` seam family), never by reading its tables.
- **No other backend change.** Delete = the existing archive; undo = unarchive; leave = the existing membership DELETE; postcard delete = the existing diary-entry DELETE; unpublish/republish = the existing publish pair. The `spec.md` API contract governs; every endpoint keeps its recorded refusal shapes.
- **Undo mechanics per endpoint nature (ratified Q19):** archive-backed verbs call the server immediately and undo calls the inverse (archive→unarchive; unpublish→republish with the trip's current visibility). Irreversible verbs (postcard delete, leave) defer the call behind the 5s toast — undo means never sending it; the commit point is the timer expiring. App death inside the window means nothing happened, which is the correct failure direction.
- **The toast component:** `FeedToast` widens to optionally carry a trailing action (divider, 44px Undo target, 2px linear drain over the window) — the handoff's one component change. Both screens host their own toast instance; a monotonic token guards every timer so a newer toast cancels the older's teardown and commits its pending action first.
- **The swipe** is a per-row horizontal drag with the handoff's constants (96px reveal, 12px overdrag, 4px engage threshold, snap-open past half, 220ms snap, one card open at a time, tabs close it, pointer capture / RN gesture equivalent). Native uses the reanimated gesture patterns established by the drag-and-drop work; web uses pointer events. The drop/snap math lives in a pure module both platforms share.
- **The sheet** is `members/BottomSheet.tsx` reused verbatim with `MenuEntryRow`/`MenuDivider` entries; menu composition (subject kind → entries, tones, glyphs) is a pure module. Non-destructive destinations: Edit details → the details editor (S4.25); View published page → the published route; Edit postcard / Edit diary details / Copy public link route to their existing surfaces where they exist and take the house measured coming-soon prompt where they do not (S4.36 precedent) — each such stub named in the ticket, never silently dead (the S1.3 lesson).
- **Row collapse/restore** (M7/M8) animates height + opacity + margin with the two-stage `collapsing → gone` state so the row animates before leaving layout; the diary card derives emptiness from its postcards and collapses behind the last one (a projection, exactly like the domain model's Diary).
- **List truth:** the acting screen updates from the mutation response and query invalidation (both `archived` list variants, profile listings, feed keys); everyone else is focus-fresh (S4.34). No WS event — the recorded freshness note stands.
- **Reduce Motion** follows the handoff: drops rises, rotations, collapses, staggers and the peek; keeps scrim fades — as `BottomSheet` already does.
- **Copy** ships from a shared `.ts` copy module so Playwright specs and screens cannot drift (the S4.28 `travelerCopy` pattern), including the R2-corrected modal strings and every toast message in the handoff's table.

## Testing Decisions

Good tests here assert external behavior — what a traveler sees and what reaches the wire — never component internals. Four seams, all pre-existing shapes:

- **Pure modules (Jest):** the swipe math (clamp, engage threshold, snap decision), the undo state machine (token supersession, deferred-commit timing, newer-toast-commits-older), menu composition per subject kind, and diary-collapses-when-empty derivation. Prior art: `landingSlot.ts`, `postcardAnatomy`, `tripTabs`.
- **Backend ITs (failsafe):** `viewerRole` and `memberCount` on the listing for owner and member; absent-field tolerance is ADR-008's own suite. Prior art: the itinerary listing ITs and `TripArchiveContractIT`.
- **Playwright (container lane):** the walks — swipe-delete → modal → ack → gone → present in Archived; member's list after owner's delete (masked, no residue); leave-undo sends nothing (assert by request interception); postcard delete → undo → no DELETE on the wire; unpublish → republish restores the published pill; toast supersession. Prior art: the e2e suite's trip and profile specs; strings imported from the copy module (S4.28 rule).
- **Device rung:** the swipe's touch feel, the peek hint, Reduce Motion, and the toast-over-Plan-a-Trip inset — the classes a suite cannot reach (per the tiers, this is the eye's rung).

## Out of Scope

Any destruction or purge (`DELETE /v1/itineraries/{id}` stays unminted; the bin/destruction story inherits everything) · a marker distinguishing "deleted" archives (ratified Q20) · per-traveler hide of member trips (Leave is the tool) · diary delete as an operation (the diary is a projection; its card collapsing is presentation) · chat message deletion (parked, S4.10) · grouping the stat counts and the 400px photo-stage letterboxing (the handoff's own out-of-scope list) · restyling the shipped Trips screen beyond adding the swipe · any change to publish/visibility semantics (unpublish is the existing act, merely surfaced).

## Further Notes

- The freshness note and candidate-capability note recorded in `spec.md` cover these surfaces unchanged: pull-based everywhere, nothing gated.
- The handoff's prototype (`design/Profile Screen v2.dc.html`) is executable; `support.js` is its runtime and was not archived (runtime-only, per the handoff's own Files note) — fidelity questions are answered by reading the markup, which is the standing rule anyway.
- The Profile screen in the prototype redraws surfaces that already shipped (header, stats, tabs, postcard carousel). Where the prototype and the shipped screen agree, no work; where they differ outside the removal affordances, the shipped screen stands — this story adds removal, it does not re-audit Profile fidelity.
