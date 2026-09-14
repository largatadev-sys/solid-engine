# S4.41 — Trips surface and Requests: `mytrips` takes the list out of the trip controller, the inbox moves behind a mail icon with a live count, seen is a fact on the Invitation

**Status:** ready-for-agent — grilled 2026-09-14 (`/grill-with-docs`, five rounds; the record is `grilling.md` beside this file, and every decision below cites it); written at `/to-spec` the same day with the three test seams confirmed by the founder (*"okay go ahead"*); awaiting `/to-tickets`.
**Grilled:** 2026-09-14 with the tree as it stood after the module-layout series (ticket 13 merged as `a3570e85`). Where the record and this spec differ, the record wins.
**ADR:** none minted. ADR-039 decision 4 was amended with the record — a read-surface module is minted where the surface owns its wire contract, not by counting the modules it reads; the Middle Man clause stands. ADR-029 is untouched (no fourth ladder tab). ADR-008 holds: every wire change here is additive.
**Candidate-capability note:** none. A read surface and a seen mark — neither a capability, nor footprint-growing, nor governance. Answering an invitation was noted at S1.2 and is unchanged here.
**Freshness note:** the Trips root's count and the Requests screen are **live over the traveler's own topic** — the subscription already exists from the root layout, `invitation.received` is absorbed into the inbox cache, `membership.granted` and `join-requests.changed` refetch — **plus one new event, `invitations.changed`**, fanned out on revoke, archive-void, decline and seen so the count falls live as well as rises (record, round 5). Reconnect-marks-stale applies as it does today. The trips list itself stays **focus-fresh pull** as built at S4.34 and S4.35; nothing about it changes. The Requests screen also revalidates on focus, the S4.34 helper, because a traveler returning from a workspace should not read a card the server has already retired.

## Problem Statement

A traveler opening Trips today meets two things in one list: the trips they are in, and — pinned above them on every lifecycle tab — the trips they are not in yet, as a header of invitation and join-request cards that appears and disappears with the data and pushes the trips down when it is there. The header's magnifying-glass icon promises a search that does nothing (*"Search trips, coming soon"*). There is no way to know, without opening the tab and reading, whether anything is waiting on them; and because nothing remembers what they have already looked at, there is nothing to tell the phone that the web preview already showed them the same invitation. Underneath, the Trips screen is the only one of the four tabs that assembles its content on the device from separate server lists, and the only one whose server-side composition lives in a controller inside the module that owns the tables — with a query per row that the other five lookups on the same screen already avoid.

## Solution

Trips shows trips. A mail icon in the header — where the dead search icon was — carries a count of the invitations the traveler has not yet seen, and opens a **Requests** screen holding everything pending in either direction: invitations waiting on them to answer, and join requests they sent that wait on an owner. Opening Requests clears the count, on every device the traveler is signed in on, because seen is recorded on the Invitation itself. The count moves live: an invitation arriving raises it, and one revoked, voided by an archive, or answered elsewhere lowers it, without a refresh. The Trips header takes the same size as the other three roots. Behind the screen, a `mytrips` read-surface module owns the list the way `feed`, `discovery` and `profile` own theirs, and the per-row query is gone.

## User Stories

1. As a traveler, I want the Trips tab to show only my trips, so that the list I scroll is the list I am in.
2. As a traveler, I want a mail icon in the Trips header, so that what waits on me has one place to live instead of a header that comes and goes.
3. As a traveler, I want the mail icon to show how many invitations I have not yet seen, so that I know at a glance whether anything needs me.
4. As a traveler, I want the count to disappear once I open Requests, so that it means "new to me" rather than "still pending".
5. As a traveler, I want that clearing to hold on my other devices, so that the web preview does not show me a count for an invitation I already read on my phone.
6. As a traveler, I want the count to rise the moment an invitation arrives while the app is open, so that I am not reading a stale number.
7. As a traveler, I want the count to fall when an invitation is revoked, voided or answered on another device, so that the number never overstates what waits on me.
8. As a traveler, I want Requests to list the invitations sent to me, so that I can accept or decline them where I expect to.
9. As a traveler, I want Requests to also list the join requests I have sent, so that I can see what I am waiting on and withdraw one if I change my mind.
10. As a traveler, I want my own join requests never to be counted on the icon, so that the number is about what needs me, not what I already did.
11. As a traveler, I want accepting an invitation to land me in the trip's workspace as it does today, so that nothing about answering has changed except where I answer.
12. As a traveler, I want a failed accept to say so, so that a tap that did not work is distinguishable from a tap that did not land.
13. As a traveler, I want declining to ask first and to say the inviter will not be told, exactly as today, so that the confirm I know is the confirm I get.
14. As a traveler, I want Requests to open as a screen above Trips, with the tab bar hidden, so that I am looking at one thing and can come back with one tap.
15. As a traveler, I want the Requests screen to look like the other screens pushed off Trips, so that it reads as part of the same place.
16. As a traveler, I want an empty Requests screen to say there is nothing pending, so that empty does not read as broken.
17. As a traveler, I want to pull to refresh on Requests, so that I can check for myself when I doubt the screen.
18. As a traveler, I want the Trips title to be the same size as Home, Discover and Profile, so that the four roots read as one app.
19. As a traveler using a screen reader, I want the mail icon to announce the count, so that the number is not only visual.
20. As a member of a published trip, I want opening Requests to mark my invitations seen without a refusal, so that the publish freeze — which blocks issuing, revoking and accepting — does not block a glance.
21. As a founder testing across the phone and the web preview, I want seen to be one fact on the server, so that what I saw on one rung is what the other rung shows.
22. As a maintainer, I want `GET /v1/trips` to keep exactly its shape, so that every client and every test reaching it today stays correct without an edit.
23. As a maintainer, I want the Trips list served by a read-surface module with no table, guarded like the three others, so that the four tabs are one shape and a future "why is this one different" has no answer to find.
24. As a maintainer, I want the per-row workspace query on the list gone, so that a page of thirty trips is six queries and not thirty-six.
25. As a maintainer, I want seen to be a column on the Invitation and nothing new anywhere else, so that a later "New" pill or an unseen-for-a-week nudge reads the same fact.
26. As a maintainer, I want the two quarantined accept walks back with the failure state the ledger named, so that the Requests screen does not ship with its accept path untested.

## Implementation Decisions

Numbers in brackets cite the grilling record's round and question.

1. **A `mytrips` read-surface module is minted** [R2 Q5, R1 Q1]. It owns `GET /v1/trips` — the wire shape byte-for-byte unchanged — and composes it from `trip`'s published api and the publication-state port. It owns no table, no repository and no query, and its boundary guard follows the `feed`/`discovery`/`profile` pattern exactly: an allowlist of `trip.api` and `common`, the owns-no-table rule, and classification in the guard meta-test at birth. The name is `mytrips`, not `trips`: `trip` and `trips` would sit one letter apart in every listing, grep and allowlist.
2. **The criterion that mints it is the wire contract, not a module count** [R1 Q1]. ADR-039 decision 4 read "the surface composes cards from several apis"; measured, the Trips list already composed seven calls across two owners inside `TripController`. The amendment recorded with the grilling says a read-surface module exists where the screen's contract is the surface's own and not any data module's; a module wrapping one call is still not minted. No canon has to move again at the kernel dissolution.
3. **`trip.api` grows one batched call** that answers the six facets the list needs — edit-lease state, day counts, ownership, member counts, workspace state, and the page itself — for a list of ids in a fixed number of queries. The per-row workspace lookup dies inside it. `TripController` keeps its ten acts and loses the list.
4. **The publication-state port is read where it lives today** [R1 Q4]. When the kernel dissolution moves it into `trip.api`, one line of the guard's allowlist moves with it. This story does not wait on TW-2, whose record does not exist on disk.
5. **Scope is the Trips tab and nothing else** [R1 Q3]. Home, Discover and Profile are untouched; their corrections stay on the epic-map line with the notes this grilling added to it.
6. **The inbox leaves the list header and goes behind a mail icon** [R1 Q2, R2 Q2]. The icon replaces the search stub in the Trips header — the stub, its coming-soon message and the test that pinned it retire. Tapping it pushes a **Requests** screen inside the trips route group; the tab bar hides by the standing rule with nothing to add. The screen's header is the shared pushed-screen header with a back control; its list container copies the archived-trips screen, the closest existing pushed list off Trips [R2 Q3]. The cards are the existing inbox cards, moved unchanged. ADR-029's three lifecycle tabs are untouched.
7. **Requests lists both directions** [R2 Q1]: invitations sent to the traveler, and the join requests the traveler sent. The title is **"Requests"** [R3 Q2], ruled with the glossary collision on the table: *Join Request* and *Follow Request* already carry the word. No new glossary noun is minted; the *Invitation* and *Join Request* rows each name the surface they are listed on together.
8. **The count is the traveler's unseen invitations** [R3 Q1, R4 Q2]. Derived on the client from the inbox query the Trips root already holds: the invitations in the cache with no seen mark. Outgoing join requests are never counted. It is rendered only when non-zero, and the structural test for that exists because Home's bell dot is an unconditional stub and must not be the shape copied. The wire has no total for a page, so a second page of pending invitations is not counted — accepted at the grilling and recorded here rather than hidden.
9. **Seen is a fact on the Invitation, on the server** [R4 Q1, R5 Q1]: an additive nullable `seen_at` column in the invitation module's own migration folder; a `seenAt` field on the inbox response; a `POST /v1/invitations/seen` route that marks every pending invitation of the caller seen and answers the same whether it changed one row or none. Marking seen is not a consent act: it does not refuse on a published trip, and it does not touch join requests.
10. **Opening Requests clears the count** [R3 Q1]. On focus the client posts seen and refetches the inbox; the count falls to zero; a later arrival raises it again.
11. **The count is live in both directions** [R5]. Arrivals already are. Removals gain one event: the invitation module fans out `invitations.changed` on the traveler's own topic — after commit, the shape the inbox topic already uses — on revoke, on archive voiding, on decline, and on seen; the client's event map gains one handler that refetches the inbox. Expiry is lazy on read and needs no event.
12. **The two device calls stay** [R2 Q4]. Requests keeps fetching invitations and join requests separately and merging them on the device as today. A server-composed endpoint would mint `join`'s api and is recorded on the backlog as the follow-up, not built here.
13. **The Trips header drops to the other roots' size** [R2 Q3]: 22px extra-bold, the token Discover uses, replacing the 28px title. This is the founder's ruling over the S4.26 canvas, which drew 28, and it closes the epic-map note that recorded the gap.
14. **The accept path gains a visible failure state** (seam 2, confirmed at `/to-spec`). Today accept navigates only on success and swallows every error but the unverified-email one, so a failed accept is indistinguishable from a click that never landed. The two quarantined walks return with it.
15. **Everything on the wire is additive** — a column, a field, a route, an event. Nothing shipped is renamed, retyped or removed.

## Testing Decisions

A good test here asserts what a traveler or a client observes at a seam the story does not own — the wire, or the screen — and never the extraction's internals. The extraction's whole proof is that nothing at the wire changed.

- **The wire, backend ITs.** `GET /v1/trips`: no new test. The fifteen ITs that reach it today pass **unedited**, and the assertion-line diff script from TW-1's gate proves that no assertion moved. `POST /v1/invitations/seen` and the `seenAt` field: one IT on the invitation contract pattern — mark, read back, and not refused on a published trip. `invitations.changed`: one IT on the pattern the ws module's event ITs use, asserting the four acts each fan out to the traveler's topic after commit. The batched `trip.api` call: a plain IT in `trip`.
- **The Playwright web walks.** Every walk that meets the inbox as a header today re-routes through the mail icon; one new walk carries the count's lifecycle — arrive, one; open, zero; revoke elsewhere, stays zero without a refresh. The quarantined accept pair returns, its dependent with it, and the failure-state walk is the one that would have said which of the ledger's three guesses was true.
- **Structural guards.** The `mytrips` boundary test on the three-surface pattern; the guard meta-test; the api-is-never-wire rule. On the client: the tab-routing pin flips from "search greyed" to "mail replaces search"; the coming-soon key list; the event-map test gains the handler; a pure-module test for the unseen count; the conditional-count pin.
- **The device rung.** The LAN walk on a real phone for the icon's tap target and the header's new size, and for the pushed screen's safe area — regression-checklist line 11 names a docked surface whose CTA sat under the home indicator, and a pushed list is the shape that hides it.

## Out of Scope

The Home, Discover and Profile corrections from the same epic-map line · a server-composed Requests endpoint · a "New" marker per row · a fourth ladder tab · seen state on join requests · consolidating the three 22px title tokens into one · the `trip` module's missing outbound allowlist (its own backlog line) · the TW-2 record · trip search, which was never built and whose stub this story removes.

## Further Notes

- **Two defaults were taken at the read-back and stand unless changed on this branch:** the `invitations.changed` event is in (put to the founder as strike-or-keep and not struck), and the id is S4.41 (every Trips-tab story so far sat in Epic 4).
- **Where the documents land changed with this story.** By the founder's ruling at the end of the grilling, the record, this spec, the tickets and the build ride one feature branch and one squash. `docs/agents/story-workflow.md` is amended with the record. Four findings from the grilling are true on `dev` today regardless of this story — the stale quarantine row, the three-surfaces-parked note, the `trip` over-drop note, the `trip` outbound-guard line — and land with this branch unless the founder asks for them earlier; the split is one command.
- **The stale quarantine row is settled as a ticket of this story.** `ItineraryPublicationIT` (fifteen tests, out since CM-5 ticket 01) was to be deleted with the old route; it already calls `/v1/trips`. Its successor covers eight cases. The ticket diffs the fifteen against the eight, deletes what is covered, and repairs or re-pins the rest on the trip grammar; the row leaves when the class is gone or green.
- **Design baseline.** The S4.26 canvas remains the Trips screen's baseline, with two founder-ruled deviations recorded at the grilling: the header size, and the mail icon in the search icon's place. No canvas exists for Requests; it is built from the pushed-screen primitives the trip screens already use.

## Comments

*None yet.*
