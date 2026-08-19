# S4.7 — Fork: a published itinerary becomes your own trip (plan-only copy + Fork Relationship, INV-6)

**Status:** ready-for-agent *(the owner-review pass happened live — every decision below was founder-ruled in the 2026-08-19 grilling, two rounds of fourteen questions, and the seams were confirmed before publication)* · **Epic:** E4 · **Depends on:** nothing in flight — S4.1 (published projection + fence), S1.1/ADR-011 (atomic workspace formation), S4.15 (Trip Created pattern), S4.17 (the reserved subtitle slot), S4.25/ADR-028 (single destination + Trip Currency) are all shipped.

**Immutable point-in-time intent** (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** **INV-6 as amended 2026-08-06** (provenance recorded; plan data only; media never crosses; Creator Tips cross — words fork, images do not) · the **Fork Relationship** entity (domain model: id, source itinerary id, forked itinerary id, forked-at) · ADR-013 (ordinal days — *"copied absolute dates are someone else's trip"*) · ADR-017 (forks survive unpublish; social objects hide, never copy) · ADR-019/020 (three axes; a fork is born `draft`, unpublished) · S4.23 decision 5 (stranger surfaces show handles, never names) · registers **#4** (review eligibility will read fork + completed at S4.5 — the relationship's declared future reader) and **#5** (public comments never copy) · S4.25's dates-are-workspace-private invariant. **Design baseline:** `Fork Spec.dc.html` in the [Claude Design project](https://claude.ai/design/p/34e84995-d099-46dd-a784-3b762a09d6f4?file=Fork+Spec.dc.html), archived verbatim beside this spec as `design-baseline.dc.html` (the mock-fidelity rule binds; the baseline's Screen 1 deliberately overrides the older orange `fork.txt` layout, which survives in the project's `uploads/` as provenance).

## Problem Statement

The domain model's consumer flow ends *"…star, comment, review → fork → become an organizer. The loop closes: consumption feeds creation."* The loop does not close: a traveler reading a published itinerary they want to travel has no way to make it theirs short of re-typing the whole plan into Plan a Trip, day by day, activity by activity. The pieces have waited on this story from four directions — the "Forked" stat is a greyed 0 wired to a coming-soon toast, the workspace subtitle slot has been reserved since S4.17 with nothing to render, the Fork Relationship entity has no table, and the create-method chooser was retired at S4.15 with the note that S4.7 supplies its own entry when it arrives.

## Solution

A docked **Fork This Trip** CTA on the published page, a zero-input confirm sheet, and the traveler owns the plan: a new trip in its own workspace, born `draft` with them as sole owner, carrying the whole plan — days in order, activities with times, places, tips, booking facts and costs, the Trip Currency — and none of the source's photos, dates, members, history or social record. A permanent Fork Relationship row records provenance one hop back. Attribution renders live as **"Original by @handle"** on the workspace subtitle, the success screen's pill, and the fork's own published page if it ever publishes. The success screen mirrors Trip Created: one primary into the new workspace, back lands on Trips. The source's Forked stat becomes a real count.

## User Stories

1. As a traveler reading a published itinerary, I want a Fork This Trip button, so that I can make this plan mine without re-typing it.
2. As a forking traveler, I want the confirm sheet to say what forking does — keeps credit with the author, creates my own Trip Workspace, lets me invite my group — so that I know what I'm creating before I commit.
3. As a forking traveler, I want the sheet to state that the plan copies but photos and dates don't, so that my photo-less copy reads as the rule working, not a bug.
4. As a forking traveler, I want the fork to collect nothing, so that one tap is enough and every detail stays editable afterward in the workspace.
5. As a forker, I want the full plan copied — every day in order with its title, every activity with its time, place, description, Creator Tips, external link, booking details and cost — so that my copy is the trip I just read.
6. As a forker, I want the title, destination, description, standouts, best time of year and Trip Currency to carry over verbatim, so that the copy is recognizably the same plan.
7. As a forker, I want the source's estimated cost to survive through the copied activity costs, so that the budget I saw is the budget I start from.
8. As an original author, I want none of my photos or my cover on anyone's fork, so that my memories stay mine (INV-6).
9. As a forker, I want no dates on my copy, so that my trip is not pre-booked onto someone else's calendar.
10. As a forker, I want my copy born as an unpublished draft with me as sole owner, so that I decide who joins and what happens next.
11. As a forker, I want to invite my travel group into the new workspace the normal way, so that planning together works exactly as on any trip I created from scratch.
12. As a forker, I want the success screen one tap from my new workspace, so that I can start making the plan mine immediately.
13. As a forker, I want back from the success screen to land on Trips — the same way Trip Created behaves — so that the acquisition ends where my trips live.
14. As a forker, I want my copy in Trips' Draft section immediately, so that it is findable without the success screen.
15. As a forker, I want "Original by @handle" on my workspace subtitle, so that provenance stays visible where I plan.
16. As a forker whose fork later completes and publishes, I want my public page to carry "Original by @handle", so that the credit promise survives onto the published copy.
17. As an original author, I want forks to credit my @handle and never my display name, so that credit does not leak my name to strangers (S4.23 posture).
18. As an original author without a handle, I want forks to say "Original by a traveler", so that the privacy fallback never defeats the posture.
19. As an original author, I want the Forked count on my published page to be real, so that I can see the plan travels.
20. As an original author, I want unpublishing or archiving my itinerary to delete nobody's fork, so that what others built on my plan stays theirs (ADR-017).
21. As a forker, I want the attribution pill to link to the source while it is visible and fall back to plain text when it is not, so that I never dead-click into a 404.
22. As a forker of a fork, I want attribution to name the itinerary I actually tapped Fork on — one hop — so that credit stays honest and simple regardless of how long the chain is.
23. As a traveler, I want to fork the same itinerary again later, so that a second run of the trip is a fresh copy.
24. As an author, I want to fork my own published itinerary, so that running it again costs one tap — no special case.
25. As a member of the original trip, I want to fork it like anyone else, so that membership never blocks acquisition.
26. As a traveler who cannot view an itinerary (unpublished, archived, or not visible to me), I want fork refused exactly like view is refused, so that the fence stays one wall.
27. As a double-tapper, I want Fork It to guard while the copy runs, so that I don't mint two trips by accident.
28. As a future reviewer (S4.5), I want my forked workspace and its completion recorded the normal way, so that review eligibility can find them later without new capture (register #4).

## Implementation Decisions

All founder-ruled at the 2026-08-19 grilling (Rounds 1–2, Q1–Q14).

1. **The act is server-side and atomic.** One transaction paralleling scratch creation: copy the itinerary aggregate → form the workspace with the forker as owner (the S1.1 `formAround` pattern, `MANDATORY` propagation) → copy days and activities → write the Fork Relationship row. Any failure rolls back everything — a fork never half-exists (S1.1's property, extended).
2. **The endpoint** follows the house action-endpoint pattern: a POST on the itinerary's `fork` action returning **201 + the created itinerary resource**. The source must pass the same audience fence as the published view; every refusal is the fence's own 404, indistinguishable from not-found. **No 409 exists**: a published source is frozen (the freeze rides `published`), and a concurrent unpublish loses to the in-transaction fence check → the same 404.
3. **The copy set** (INV-6 applied to today's schema). **Crosses:** title **verbatim** (no "Copy of" prefix) · destination · description · standouts · best time of year · Trip Currency · per day: ordinal position and title · per activity: sort order, title, time-of-day (zoneless wall clock, by design), cost amount + currency, place, description, Creator Tips, external URL, booking purpose/provider/price. **Cleared or reset:** start/end dates · cover · every photo · members (the forker is sole owner) · lifecycle → `draft` · `published` false · visibility at the newborn default, never the source's · plan version fresh · activity history empty · publish/start/complete stamps null · last-edited attribution = the forker at fork time.
4. **Social objects never copy**: comments, reviews, stars, diary entries (registers #4/#5; ADR-017's hide-not-delete posture is untouched).
5. **Fork Relationship: one additive table, one hop.** Exactly the entity's shape — id, source itinerary id, forked itinerary id, forked-at. The row names the itinerary the traveler tapped Fork on; no chain-walking, no root pointer, unless a real reader ever appears (a chain remains computable from the rows if one does). No update or delete path exists — rows are permanent provenance.
6. **Attribution renders live, never as copied text.** Resolved at read time from the source itinerary's current owner: **@handle**, or **"A traveler"** when no handle exists (S4.23 decision 5 applied; display names never reach stranger surfaces). It therefore survives author rename, source unpublish/archive, and S5.5 anonymization with no stored PII.
7. **Read models grow additively.** The itinerary read model and the published projection each gain a nullable `forkedFrom` block — source itinerary id, source owner handle (nullable), and a read-time **`sourceVisible`** boolean computed by the fence — so the client can render link vs. plain text without a discovery tap. The published projection also gains **`forkCount`**: the count of Fork Relationship rows naming this itinerary as source. It increments at fork creation — whatever the copy later becomes — and never decrements.
8. **Four surfaces, per the design baseline.** *(a)* The published page gains the docked CTA bar (consumer audience only — the pre-publish preview never shows it) and the Forked stat goes real as a **plain, non-tappable stat** — the coming-soon tap retires. *(b)* The zero-input confirm sheet: title, body, three highlight rows naming the source's @handle, the honesty line ("The plan copies. Photos and dates don't."), primary Fork It with an in-flight state (spinner, Cancel disabled), secondary Cancel. *(c)* Fork success on the Trip Created skeleton: fork-glyph halo, title "Trip Forked!", summary card whose thumb shows the **placeholder deliberately** (INV-6 made visible), attribution pill (linked or plain by `sourceVisible`), one primary **Open Trip Workspace** — no secondary. Navigation is the Trip Created pattern: replace, so **back lands on Trips**. *(d)* The S4.17 workspace subtitle slot renders "Original by @handle" with the same link/plain behavior.
9. **Eligibility: fork availability = view availability.** Any authenticated traveler who passes the fence can fork — the author and the source trip's members included, with no special cases. Re-forks of the same source by the same traveler are allowed; the server dedupes nothing; the client's in-flight guard is the only double-tap defence.
10. **Entry: the docked CTA is the only one.** The chooser retired at S4.15 stays retired; the epic-map chooser-activation line closes as discharged by this entry (annotated with this story).
11. **Analytics:** `itinerary_forked` after commit, per register #2's standing default; no event on a refusal.
12. **Docs ride the story:** the glossary gains the **Fork** verb entry; the Fork Relationship entity row gains the one-hop + live-identity note; S4.9 note *(a)* — Tentative Dates as fork's one open field — is **superseded on the record** (the fork collects nothing; dates went workspace-private at S4.25). **No new ADR**: INV-6 is already canon and nothing here is hard-to-reverse beyond it.

## Testing Decisions

Behavior only, at the three seams confirmed pre-publication — the story adds no new seam:

1. **Backend ITs at the API door (the primary seam).** All copy semantics live server-side, so the fork endpoint proves them the way every controller IT works (real server, Testcontainers Postgres): the 201 and the copy field-by-field **including the exclusions** (photo-less, date-less, member-less, history-less, stamp-less, born `draft`); the relationship row; atomicity by forced failure (nothing half-exists — S1.1's AC pattern); the fence (unpublished, archived, and not-visible sources refuse with the **code asserted, not the status alone** — two 404s with different codes would pass a status-only assertion in both worlds and prove nothing); owner membership formed; re-fork allowed; `forkCount` counting; `forkedFrom` with `sourceVisible` in both outcomes. Both fence-coverage scans must see the new read paths.
2. **Mobile pure modules (Jest).** Attribution label (@handle / "A traveler"), the pill's link-vs-plain decision from `sourceVisible`, sheet and success copy — the Trip Created copy-module precedent: tiny pure functions, no component tests.
3. **One Playwright spec (the H1 suite).** The whole walk in the web project: sign in from the verified pool, open a seeded published itinerary, CTA → sheet (copy asserted) → Fork It → success (pill, placeholder thumb) → Open Trip Workspace (subtitle renders) → back lands on Trips → the draft sits in Trips' Draft section → the source page shows the incremented count. Surface scope while iterating; full suite at the gate.
4. **Standing rungs unchanged.** The migration is a plain additive CREATE TABLE — no legacy-row transform, so no migration-stepping IT is owed. Story close runs the three-rung smoke plus the device walk.

A good test asserts what a traveler or client observes — a field on the wire, a refusal code, a rendered label, a count that moved — never the internals that produce it.

## Out of Scope

- **"Forked by" lists, fork notifications, and the social-proof signal** ("how many forkers actually travelled it") — the count is the author's only signal; the social-proof line stays parked on the epic map.
- **Chain or root attribution** beyond one hop.
- **Stars, reviews, comments** (S4.4–S4.6): the Reviews stat stays greyed at 0; register #4's review-eligibility reader lands at S4.5 on the rows this story writes.
- **Visitor (unauthenticated) fork** — S4.8 owns the sign-in gate when the visitor surface arrives.
- **Any entitlement code** (ADR-009) — the candidate capability is recorded below, nothing is gated.
- **Rate limiting / abuse controls** — ride the S4.6+S4.8 grilling per the systems-review placement.
- **Media crossing of any kind** (INV-6 stands) and **any non-additive /v1 change** (ADR-008).

## Further Notes

- **Candidate-capability note** (standing rule): **`itinerary.fork`** — an act (not existing data), footprint-growing (a new itinerary, workspace, membership and rows per tap), not governance → register #14 candidate.
- **Fork count is a read-time COUNT over relationship rows** — no denormalized counter until it ever costs something measurable.
- The fork's estimated cost re-derives from the copied activity costs; S4.24's partial-total semantics ("From ‹sum›") apply to it unchanged.
- Register #4's future reader needs nothing extra captured here: the relationship row plus ordinary membership and lifecycle already answer "confirmed members of a completed, forked workspace."
- The design baseline names the concrete component tokens (terracotta primary at 53px, linen highlight card, 18px terracotta outline icons, pill at radius 100); the mock-fidelity rule applies to it, not to the older `fork.txt` layout it supersedes. Named deviations: none yet — any found in build land here per the standing rule.
