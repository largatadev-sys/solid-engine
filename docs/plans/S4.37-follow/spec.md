# S4.37 — Follow: the graph, the counts, and people in executed search

**Status:** specced — awaiting owner review of spec + tickets · **Epic:** E4 · **Depends on:** S4.36 (shipped — the public profile this story's pill, chip, counts and lists live on, and the People search whose executed-search gap this story closes), S4.22 (shipped — the Home feed the Following filter narrows), S4.3 (shipped — the Discover results screen the People group joins), S4.34 (shipped — the focus-freshness helper every pull surface here rides)
**Grilled:** 2026-08-26 (grill-with-docs, three rounds + a canvas cycle) — founder rulings recorded per decision below. The canvas arrived after round three and matched every recorded ruling; its newly-settled treatments are adopted as drawn (digest).
**ADR:** none new; **ADR-019 amended on the record** — consequence (d) anticipated the graph narrowing `public`, and this story resolves it the other way: follow is a pure social edge, narrowing re-parked with its own trigger (see the amendment in `adr-log.md` and the epic map's re-pointed line). ADR-015 (handle = label, id = identity) and ADR-008 (additive /v1) are spent, not changed.
**Candidate-capability note:** following a traveler — a capability, footprint-growing (each edge is a row), not governance; the conceivable gate is a following-count cap.
**Freshness note**: every surface this story adds or changes is **focus-fresh pull** — profile counts, the follower/following lists, the Home Following filter and the combined search results are all public surfaces, and the S4.35 posture keeps public surfaces off the socket (their audience is every online traveler). No topic, no subscription. The one non-pull element is the pill itself, which is **optimistic per C1** — the screen flips before the server answers, and reverts with a toast on failure.

**Immutable point-in-time intent** (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** ADR-019 as amended (visibility axes untouched; follow narrows nothing) · ADR-015 (ids are the identity — follow mutations target ids; list reads ride the handle-addressed profile grammar, self-healing via 404 on rename) · ADR-008 (every wire change here is additive within /v1 — no waiver needed) · Artifact 03 (all of this sits deliberately outside the workspace guard, the S4.36/PublishedItinerary precedent; nothing here takes a `Membership`) · the S4.36 spec + digest (the profile this story completes; its canvas's C1/C2/M1 pre-drew this story's pill) · **the Follow S4.37 canvas — the design baseline** (`mock-render.dc.html`, digest in `follow-mock-digest.md`; eight frames, C1–C8, M1–M4).

## Problem Statement

S4.36 shipped the public profile with three honest promises in it: a Follow pill that answers "coming soon", Followers/Following cells that render `—`, and a queue position ("story B") for the graph itself. The founder's driver is unchanged and on the record — profiles and follow incentivize real usage beyond the test data — and the queue came due the day S4.36 merged. Separately, S4.36's merge surfaced a flow gap the founder hit within a day (regression-checklist line 31): **executing** a search routes to the itinerary results screen, which contains no people, and the only doors to the People results screen sit inside the suggestions overlay — one of them gated on *more than 3 matches*, which the current traveler count never produces. People search works and cannot be reached by the gesture everyone tries first.

## Solution

One `follow` table and a pair of idempotent, optimistic endpoints make the pill real; the profile read grows counts and two viewer-relative booleans so the em dashes retire and the Follows-you chip renders; public follower/following lists open from the stat cells on both profile rows; Home gains an All/Following chip filter; and the executed search lands on a combined results screen with People above Trips, rendering from the first match. Follow grants nothing and narrows nothing — it is a social signal whose only consumers are the counts, the lists, and the Home filter.

## User Stories

1. As a traveler on someone's profile, I want to tap Follow and see it take effect immediately, so that following feels like one act, not a request form.
2. As a traveler who followed someone, I want to tap Following to unfollow with no interrogation, so that leaving is as light as joining.
3. As a traveler, I want to see real Followers and Following counts on any profile including my own, so that the numbers mean something.
4. As a traveler, I want to tap those counts and see who they are, so that the graph is explorable, not just countable.
5. As a traveler on someone's profile, I want to see when they follow me, so that following back is one glance and one tap.
6. As a traveler on Home, I want a Following filter, so that the feed can be the people I chose and not everyone at once.
7. As a traveler who follows nobody yet, I want the Following feed to point me at People search instead of showing a blank, so that the empty state teaches the loop.
8. As a traveler typing a person's name into Discover and pressing search, I want the results to contain that person, so that the natural gesture works.
9. As the founder, I want follow and unfollow measured server-side, so that the stories behind this one (suggestions, a following feed) are grilled on numbers that actually exist.

## Decisions

*(Founder rulings, 2026-08-26, in grilling order; mechanics follow from them.)*

1. **Follow is asymmetric and open.** Any onboarded traveler follows any onboarded traveler, effective immediately — no approval, no request state, no private accounts. "Friend" leaves the vocabulary; the glossary entry is **Follow**, and mutuality is not a state — it is two independent edges, surfaced only as the Follows-you chip.
2. **Follow narrows nothing — the ADR-019 must-answer, resolved.** `public` keeps meaning every onboarded traveler. The graph is a pure social signal whose only consumers are this story's own surfaces. Whether any graph ever narrows `public` is re-parked on the epic map with its own trigger (a real privacy ask, or friends-only demand at the validation gate); ADR-019's consequence (d) is amended on the record.
3. **Both lists are public to any signed-in traveler**, on every profile, opened from the pressable Followers/Following stat cells — on the public profile and the own Profile tab alike. The enumeration posture holds: these are real edges the viewer could discover anyway, not a browse-all-people door; People search's fences are untouched.
4. **Design baseline = the founder's Follow S4.37 canvas** (eight frames, C1–C8, M1–M4; archived with digest). List rows are **plain** — 44px avatar, name, handle, chevron, tap → profile; **no follow button in rows** — the pill lives on the profile one tap away. Cursor pages of 20, fetch at 5 rows from end.
5. **The Follows-you chip ships, on the profile header only** — read-only, beside the `@handle · #N` meta line, never on the own profile, never on list rows, never a tap target, and it does not change the pill's treatment (C5).
6. **The defensive features are parked as one block** — remove-follower, private accounts, blocking. Epic-map line with trigger: the first real-user privacy complaint, or the validation gate. Unfollow (the traveler's own outbound edge) is in.
7. **ADR-032's invite-suggestions v2 annex stays out**, queued immediately behind S4.37 as its own epic-map line with the trigger recorded as fired twice — the founder ruled S4.37 stays at its scoped minimum.
8. **Follow touches Home only.** An All · Following chip row under the Home header: All is today's feed unchanged and the default; Following shows only postcards from travelers the viewer follows. **Cold start always lands on All**; the selection is remembered only while the app runs, never persisted. The Following-empty state carries a "Find people" CTA into People search. Discover, People ranking and the feed cards are untouched (C6).
9. **No notifications.** "X followed you" is recorded on the notifications backlog line as its first candidate event; until that line un-parks, the Follows-you chip is the poor man's version.
10. **The demand numbers are skipped, and the instrument is fixed going forward.** S4.36's decision 12 promised this grilling would open with numbers; the grilling found the mobile `track()` is `console.log`, so `follow_tapped` and `people_result_tapped` were never recorded anywhere (epic-map line, folded into the register-#2 durable-sink story). This story emits **`follow_created` / `follow_removed` server-side** (the S0.3 after-commit pattern, ids only per P3), so its successors grill on numbers that exist.
11. **The story carries the S4.36 executed-search fix** (regression-checklist line 31), shape founder-ruled: submitting a query lands on a **combined results screen** — a People group at the top (cap 3, same row grammar as suggestions, "See all people" footer into the full People results screen) above the Trips results unchanged, the group rendering whenever **at least one** person matches. The suggestions overlay's "See all people" drops the same ">3" gate to ≥1. The search fences are unchanged: 2+ chars, no empty-query browse, handle + display name only, never email (C8).
12. **Wire addressing follows ADR-015's split**: follow/unfollow mutations target the traveler **id** (a label must never route a mutation — a released-and-reclaimed handle would hit the wrong person); the list reads ride the handle-addressed profile grammar as sibling subresources (`/v1/travelers/{handle}/followers` · `/following`), self-healing via 404 on rename exactly as the profile read does. All additive within /v1.

## Mechanics (spec-level; tickets carry the detail)

- **Table** (V41, additive): `follow(follower_id, followee_id, created_at)` — PK on the pair, FKs to traveler, a `CHECK (follower_id <> followee_id)` making self-follow structurally impossible, and an index serving the follower-list read. Follow insert is idempotent (`ON CONFLICT DO NOTHING` shape); unfollow delete is idempotent by nature. Lists order by `created_at` desc, cursor-paginated at 20.
- **Endpoints** (all additive): `POST /v1/travelers/{travelerId}/follow` · `DELETE /v1/travelers/{travelerId}/follow` (204, idempotent both; 404 for unknown or un-onboarded targets — the profile-read rule; 4xx on self-follow, unreachable from the UI anyway since the own profile never renders the pill) · `GET /v1/travelers/{handle}/followers` · `GET /v1/travelers/{handle}/following` (pages of `TravelerCardResponse`).
- **Profile reads grow additively**: `PublicProfileResponse` gains `followersCount`, `followingCount`, `followedByViewer`, `followsViewer`; the own-profile stats read gains the two counts. Counts are computed (`COUNT(*)`), not denormalized — MVP dial; a counter column is a later optimization with a trigger, not a default.
- **Home filter**: one additive query parameter on the existing feed endpoint (`scope=following`); absent = today's behavior, byte-for-byte.
- **Mobile**: repository methods on the typed apiClient (ADR-001); the pill's C1 state machine as an optimistic mutation with rollback + toast; chips, lists and the combined results screen per the canvas; copy strings in shared `.ts` modules both the components and the specs import (the S4.28 Playwright-transform rule).

## Out of Scope

- **Any visibility narrowing** — decision 2's re-park; the epic-map line owns it.
- **Remove-follower, private accounts, blocking** — decision 6's park.
- **The invite-suggestions v2 annex** — decision 7; queued immediately behind.
- **Notifications** — decision 9.
- **A following feed beyond the Home filter, or follow-weighted ranking anywhere** — Discover and People results are untouched; a future story argues from `follow_created` counts.
- **Per-row follow pills in lists** — decision 4; the canvas draws plain rows deliberately.
- **The likes row the canvas's feed cards draw** — prototype decoration, same named deviation as the S4.36 digest; no real like exists until S4.4/S4.6.
- **Follow rows' fate under account deletion/anonymization** — story C / S5.5's question; the table's id-only shape is anonymization-safe by construction.

## Testing Decisions

- **Backend ITs**: the edge's contract (idempotent follow, idempotent unfollow, self-follow refused by both the endpoint and the DB constraint, un-onboarded target 404), the counts and viewer-relative flags on both profile reads, list pagination + ordering, the feed's `scope=following` filter (and that the parameter's absence changes nothing), and the search fences still holding on the combined-results path.
- **Playwright e2e against the preview container**: the follow walk with two pool travelers — state which tag plays which role (e.g. **t1 = follower, t2 = followed**): follow → counts move on both profiles → Follows-you chip renders for t2's view of t1 → unfollow reverts; the lists walk (cells → lists → row tap → profile); the Home filter walk (All unchanged, Following narrowed, empty state with the CTA); and the executed-search walk that closes regression line 31 — **type a person's name, submit, see the person** — plus the ≥1 "See all people" gate. Failure-path: the revert + toast via a refused request.
- **Jest**: the pure seams — pill state machine, chip-filter state, count-line copy (singular "1 person"), copy modules; the structural guards this repo's style demands (no bare `animated: true`, labels from shared modules).
- **Full `npx jest` before any push that adds a `src/` file** (the S4.28 `--changedSince` blind spot), and `npx playwright test --list` after adding specs.
- **Device rung**: still blocked repo-wide on the missing `mobile/google-services.json` (S4.35's blocker — a Firebase-console download only the founder can make). This story ships web-proven at its gate; its device scope (real-touch chips, the pill on device) joins the standing device-pass queue behind S4.35's AC 12, founder's call at the gate — the S4.36 precedent.
- **Server-side analytics asserted in ITs**: `follow_created`/`follow_removed` emitted after commit, ids only (P3).

## Comments

*(none yet)*
