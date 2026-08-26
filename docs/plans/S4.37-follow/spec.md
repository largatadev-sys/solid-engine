# S4.37 — Follow: the graph, the counts, and people in executed search

**Status:** ready-for-agent — specced through /to-spec, awaiting owner review · **Epic:** E4 · **Depends on:** S4.36 (shipped — the public profile this story's pill, chip, counts and lists live on, and the People search whose executed-search gap this story closes), S4.22 (shipped — the Home feed the Following filter narrows), S4.3 (shipped — the Discover results screen the People group joins), S4.34 (shipped — the focus-freshness posture every pull surface here rides)
**Grilled:** 2026-08-26 (grill-with-docs, three rounds + a canvas cycle) — founder rulings recorded per decision below. The canvas arrived after round three and matched every recorded ruling; its newly-settled treatments are adopted as drawn (digest). Testing seams confirmed by the founder at /to-spec.
**ADR:** none new; **ADR-019 amended on the record** — consequence (d) anticipated the graph narrowing `public`, and this story resolves it the other way: follow is a pure social edge, narrowing re-parked with its own trigger (the amendment is in the ADR log; the epic map's re-pointed friend-graph line carries the park). ADR-015 (handle = label, id = identity) and ADR-008 (additive /v1) are spent, not changed.
**Candidate-capability note:** following a traveler — a capability, footprint-growing (each edge is a row), not governance; the conceivable gate is a following-count cap.
**Freshness note**: every surface this story adds or changes is **focus-fresh pull** — profile counts, the follower/following lists, the Home Following filter and the combined search results are all public surfaces, and the S4.35 posture keeps public surfaces off the socket (their audience is every online traveler). No topic, no subscription. The one non-pull element is the pill itself, which is **optimistic per the canvas's C1** — the screen flips before the server answers, and reverts with a toast on failure.

**Immutable point-in-time intent** (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** ADR-019 as amended (visibility axes untouched; follow narrows nothing) · ADR-015 (ids are the identity — follow mutations target ids; list reads ride the handle-addressed profile grammar, self-healing via 404 on rename) · ADR-008 (every wire change here is additive within /v1 — no waiver needed) · Artifact 03 (all of this sits deliberately outside the workspace guard, the S4.36/PublishedItinerary precedent; nothing here takes a `Membership`) · the S4.36 spec + digest (the profile this story completes; its canvas's C1/C2/M1 pre-drew this story's pill) · **the Follow S4.37 canvas — the design baseline** (`mock-render.dc.html`, digest in `follow-mock-digest.md`; eight frames, contract cards C1–C8, motion cards M1–M4).

## Problem Statement

S4.36 shipped the public profile with three honest promises in it: a Follow pill that answers "coming soon", Followers/Following stat cells that render an em dash, and a queue position ("story B") for the graph itself. The founder's driver is unchanged and on the record — profiles and follow incentivize real usage beyond the test data — and the queue came due the day S4.36 merged. A traveler who finds a profile they admire currently has nowhere for that interest to go: no follow, no way back to that person's future postcards except remembering the handle.

Separately, S4.36's merge surfaced a flow gap the founder hit within a day (regression-checklist line 31): **executing** a search routes to the itinerary results screen, which contains no people, and the only doors to the People results screen sit inside the suggestions overlay — one of them ("See all people") gated on *more than 3 matches*, which the current traveler count never produces. People search works and cannot be reached by the gesture everyone tries first.

## Solution

Follow becomes real: one edge table and a pair of idempotent, optimistic endpoints make the pill live; the profile read grows counts and two viewer-relative facts so the em dashes retire and a "Follows you" chip renders; public follower/following lists open from the stat cells on both profile rows; Home gains an All/Following chip filter whose Following lane shows only postcards from travelers the viewer follows; and the executed search lands on a combined results screen with People above Trips, rendering from the first match. Follow grants nothing and narrows nothing — it is a social signal whose only consumers are the counts, the lists, and the Home filter.

## User Stories

1. As a traveler on someone's public profile, I want to tap Follow and see it take effect immediately, so that following feels like one act rather than a request form.
2. As a traveler whose follow request failed in the background, I want the pill to revert with a toast naming the person, so that the screen never lies about my state.
3. As a traveler who followed someone, I want to tap Following and unfollow with no confirmation dialog, so that leaving is as light as joining.
4. As a traveler who double-taps a slow pill, I want the extra taps ignored while the first is in flight, so that I never toggle myself into a state I didn't choose.
5. As a traveler, I want real Followers and Following counts on any profile I view, so that the numbers mean something about a real person.
6. As a traveler on my own Profile tab, I want the same real counts, so that my own page and my public page agree.
7. As a traveler, I want to tap a Followers or Following stat cell and see the actual list, so that the graph is explorable rather than just countable.
8. As a traveler reading a follower list, I want to tap any row and land on that traveler's profile, so that the graph leads to people.
9. As a traveler viewing someone who follows me, I want a quiet "Follows you" chip on their profile, so that following back is one glance and one tap.
10. As a traveler on Home, I want an All/Following filter, so that the feed can be the people I chose and not everyone at once.
11. As a traveler who follows nobody yet, I want the Following lane to point me at People search instead of showing a blank, so that the empty state teaches the loop.
12. As a traveler reopening the app, I want Home to land on All, so that the public feed is never hidden behind a toggle I forgot.
13. As a traveler typing a person's name into Discover and pressing search, I want the results to contain that person, so that the natural gesture works.
14. As a traveler whose query matches one person, I want "See all people" to appear anyway, so that the door to the full People screen doesn't depend on how many people exist.
15. As a traveler whose query matches only people, I want the Trips section to say so honestly, so that an empty half never reads as a broken search.
16. As a traveler, I want my email to stay unsearchable and the graph to expose nothing beyond what a viewer could already discover, so that the social loop doesn't widen the enumeration surface.
17. As the founder, I want follow and unfollow measured server-side, so that the stories behind this one (invite suggestions, a following feed) are grilled on numbers that actually exist.

## Implementation Decisions

*(Founder rulings, 2026-08-26, in grilling order; mechanics follow from them. All wire changes are additive within /v1.)*

1. **Follow is asymmetric and open.** Any onboarded traveler follows any onboarded traveler, effective immediately — no approval, no request state, no private accounts. "Friend" leaves the vocabulary; the glossary entry is **Follow**, and mutuality is not a state — it is two independent edges, surfaced only as the Follows-you chip.
2. **Follow narrows nothing — the ADR-019 must-answer, resolved.** `public` keeps meaning every onboarded traveler. The graph is a pure social signal whose only consumers are this story's own surfaces. Whether any graph ever narrows `public` is re-parked on the epic map with its own trigger (a real privacy ask, or friends-only demand at the validation gate); ADR-019's consequence (d) is amended on the record.
3. **Both lists are public to any signed-in traveler**, on every profile, opened from the pressable Followers/Following stat cells — public profile and own Profile tab alike. The enumeration posture holds: these are real edges the viewer could discover anyway, not a browse-all-people door; People search's fences are untouched.
4. **Design baseline = the founder's Follow S4.37 canvas** (eight frames, C1–C8, M1–M4; archived with digest). List rows are **plain** — avatar, name, handle, chevron, tap opens the profile; **no follow button in rows** — the pill lives on the profile one tap away. Cursor pages of 20, fetch at 5 rows from end, newest edge first.
5. **The Follows-you chip ships, on the profile header only** — read-only, beside the handle meta line, never on the own profile, never on list rows, never a tap target, and it does not change the pill's treatment (C5).
6. **The defensive features are parked as one block** — remove-follower, private accounts, blocking. Epic-map line with trigger: the first real-user privacy complaint, or the validation gate. Unfollow (the traveler's own outbound edge) is in.
7. **ADR-032's invite-suggestions v2 annex stays out**, queued immediately behind S4.37 as its own epic-map line with the trigger recorded as fired twice — the founder ruled S4.37 stays at its scoped minimum.
8. **Follow touches Home only.** An All · Following chip row under the Home header: All is today's feed unchanged and the default; Following shows only postcards from travelers the viewer follows, filtered in the query, never in the client. **Cold start always lands on All**; the selection is remembered only while the app runs, never persisted. The Following-empty state carries a "Find people" CTA into People search. Discover, People ranking and the feed cards are untouched (C6).
9. **No notifications.** "X followed you" is recorded on the notifications backlog line as its first candidate event; until that line un-parks, the Follows-you chip is the poor man's version.
10. **The demand numbers are skipped, and the instrument is fixed going forward.** S4.36's decision 12 promised this grilling would open with numbers; the grilling found the mobile analytics call is a console log, so the Follow-tap and People-tap events were never recorded anywhere (epic-map line, folded into the register-#2 durable-sink story). This story emits **`follow_created` / `follow_removed` server-side**, after commit, ids only (P3), so its successors grill on numbers that exist. The client-side follow-tap and people-tap events retire with the coming-soon prompt.
11. **The story carries the S4.36 executed-search fix** (regression-checklist line 31), shape founder-ruled: submitting a query lands on a **combined results screen** — a People group at the top (cap 3, the suggestions row grammar, a "See all people" footer into the full People results screen) above the Trips results unchanged, the group rendering whenever **at least one** person matches. The suggestions overlay's "See all people" drops the same more-than-3 gate to at-least-1. The count line reads "{p} people · {t} trips", singular-aware. The search fences are unchanged: 2+ chars, no empty-query browse, handle + display name only, never email (C8).
12. **Wire addressing follows ADR-015's split.** Follow/unfollow mutations target the traveler **id** — a label must never route a mutation, since a released-and-reclaimed handle would hit the wrong person. The list reads ride the handle-addressed profile grammar as sibling subresources of the profile read, self-healing via 404 on rename exactly as the profile read does.
13. **Schema:** one additive migration — a `follow` table of (follower id, followee id, created-at): primary key on the pair, foreign keys to the traveler, a check constraint making self-follow structurally impossible, and the index the follower-list read needs. Follow insert is idempotent (insert-on-conflict-do-nothing); unfollow delete is idempotent by nature. Counts are computed at read time, not denormalized — MVP dial; a counter column is a later optimization with evidence, not a default.
14. **API contract:** follow and unfollow answer 204 and are idempotent both ways; an unknown or un-onboarded target answers the profile-read 404; self-follow answers 4xx (unreachable from the UI anyway — the own profile never renders the pill). The public profile response gains followers count, following count, followed-by-viewer and follows-viewer; the own stats read gains the two counts; the feed endpoint gains one optional scope parameter whose absence changes nothing. The list endpoints page the existing traveler-card shape.
15. **Mobile structure:** all calls through the typed repository layer (ADR-001, no raw fetch); the pill's optimistic state machine extracted as a **pure module** (the confirmed new seam — the one new seam this story adds) so both platforms share one definition and Jest can reach it; user-visible copy in shared plain-TS modules that components and e2e specs both import.

## Testing Decisions

A good test here asserts **external behavior at the confirmed seams** — what the wire answers, what the screen shows, what a second traveler sees — never the internals that produce it. The seams, confirmed by the founder at /to-spec:

- **Backend — the HTTP surface, via integration tests against the real server and a real Postgres** (the repo's standard top seam; prior art: the S4.36 profile and fence ITs). Proven here: the follow/unfollow contract (idempotency both ways; self-follow refused at the endpoint *and* by the constraint, each proven independently; un-onboarded target 404), counts and viewer-relative flags on both profile reads, list pagination and ordering, the feed scope parameter — including that its **absence** changes nothing, asserted byte-for-byte — the search fences holding on the combined path, and the after-commit analytics events via a recording analytics bean, ids only.
- **Mobile — pure modules under Jest** (prior art: the drag math and like-state modules). The pill state machine (optimistic flip, in-flight tap swallowing, revert), chip-filter state, count-line copy including the singular, and the copy modules. Structural guards in the house style where a trap has a named test pattern.
- **End-to-end — the existing Playwright harness against the preview container**, two pool travelers with named roles (**t1 = follower, t2 = followed**; the test-identity legibility rule): the follow walk (follow → counts move on both profiles → t2's view of t1 shows Follows-you → confirm-free unfollow → counts revert) with the failure path driving a refused request and asserting the revert plus the printed toast wording; the lists walk (cells → lists → row tap → profile; empty-state copy); the Home filter walk (All unchanged, Following narrowed, empty state with its CTA, cold start on All); and the executed-search walk — **type a person's name, submit, see the person** — which is the walk that graduates regression-checklist line 31 from manual to automated, plus the at-least-1 "See all people" gate.
- **Process gates:** one full Jest run before any push that adds a source file (the recorded changed-since blind spot); the Playwright list check after adding specs; the backend counts read from the test summary, never the exit code alone.
- **Device rung:** still blocked repo-wide on the missing Google services file (S4.35's blocker — a console download only the founder can make). This story ships web-proven at its gate; its device scope (real-touch chips, the pill on device) joins the standing device-pass queue behind S4.35, founder's call at the gate — the S4.36 precedent.

## Out of Scope

- **Any visibility narrowing** — decision 2's re-park; the epic-map line owns it and its trigger.
- **Remove-follower, private accounts, blocking** — decision 6's park.
- **The invite-suggestions v2 annex** — decision 7; queued immediately behind this story.
- **Notifications** — decision 9.
- **A following feed beyond the Home filter, or follow-weighted ranking anywhere** — Discover and People results are untouched; a future story argues from the `follow_created` counts this story starts recording.
- **Per-row follow pills in lists** — decision 4; the canvas draws plain rows deliberately.
- **The likes row the canvas's feed cards draw** — prototype decoration, the same named non-shipping deviation the S4.36 digest recorded; no real like exists until S4.4/S4.6.
- **Follow rows' fate under account deletion/anonymization** — story C / S5.5's question; the table's id-only shape is anonymization-safe by construction.

## Further Notes

- The canvas's C1 names an internal "pending" state; it is not a third pill treatment — the pill renders Follow or Following only, and "pending" is the in-flight window during which further taps are ignored. No spinner, no disabled paint (digest).
- The stories queued behind this one, both re-pointed on the epic map: the invite-suggestions annex (trigger fired twice), and story C (permanent deletion). Neither blocks this story; both read its results.
- The S4.36 stub follow-count helpers lost their last production caller at that story's close; this story deletes the follow half of the stub-metrics machinery outright, as the S4.36 comments anticipated.
- If the combined results screen needs a people **total** the people-search endpoint does not yet return, it is added additively and recorded in the owning ticket.

## Comments

*(none yet)*
