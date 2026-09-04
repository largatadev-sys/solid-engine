# S4.39 — Private profiles: the model, the follow request and the fences (backend)

**Status:** ready-for-agent — grilled 2026-09-04; testing seams confirmed by the founder at /to-spec (2026-09-04); not started · **Epic:** E4 · **Depends on:** S4.37 (shipped — the follow edge this story makes an authority for private profiles), S4.36 (shipped — the public profile read this story extends), S4.22 (shipped — the Home feed this story filters per viewer), S4.11 (shipped — the itinerary visibility axis this story retires), S4.28 (shipped — the Join Request whose request-row grammar the Follow Request copies)
**Grilled:** 2026-09-04 (grill-with-docs, four rounds, 26 questions) — founder rulings recorded per decision below. **Backend-only by founder decision:** this story ships the contracts, the fences and the migration, and not one screen. Every screen is **S4.40**'s, which wires to what this story answers and dictates nothing back.
**ADR:** **ADR-034** (new) — visibility is a property of the Profile, not the Itinerary. Supersedes ADR-019's third axis; re-amends ADR-019's consequence (d) (follow is an authority for private profiles, and only for them); amends ADR-025 / INV-2a (a postcard is public to the audience its author's profile admits). **ADR-008 is upheld, not waived** — every wire change here is additive (decisions 14 and 15); the first story in this family that needs no waiver.
**Candidate-capability note:** setting a profile private, and approving followers — capabilities, not existing data; footprint-growing (each request is a row); not governance. The conceivable gate is a private-profile tier.
**Freshness note:** this story adds **no surface**. Every endpoint it adds or changes is read by S4.40's screens, which declare their own lanes; the recorded posture they start from is **focus-fresh pull** for all of them — the profile, the lists, the feed, and the follow-request inbox, which rides the same lane the invitation inbox rides today. **No socket frame is minted here** (decision 12); the parked "inbox updates over the socket" line now names both inboxes.

**Immutable point-in-time intent** (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** ADR-034 (this story's ruling — read it first) · ADR-019 as re-amended (two axes remain: lifecycle and `published`; the gate on `completed` and the freeze on publish are **untouched**) · ADR-025 as amended (postcards have no state of their own; the fact moves to the author) · ADR-015 (ids are the identity — every mutation here targets a traveler id; list reads ride the handle-addressed profile grammar) · ADR-008 (additive within /v1, upheld) · Artifact 03 (the workspace guard is untouched; the new fence is a **profile** fence beside it, the S4.36/PublishedItinerary precedent — nothing here takes a `Membership`) · the S4.37 spec (the open edge this story qualifies) · the S4.28 spec (Join Request — the request-row grammar).

## Problem Statement

Everything a traveler authors as a person is public to every signed-in traveler the moment it exists: a postcard is on Home when it is posted, a profile's diary tab and both of its lists are open to anyone, and follow — deliberately, at S4.37 — grants nothing and can be refused by nobody. There is no circle. The founder's driver, on the record: *"Follow, requests and profiles give a traveler a reason to open the app between trips, when there is no plan to work on; the goal is that everyone we onboard keeps using it."* A traveler who would post past trips to people they approved has nowhere to do it, and a traveler who is followed by someone they would rather not be has no way to say so.

The itinerary, meanwhile, carries a public/private switch of its own that answers a different question — who may open a *published* plan — and has already cost two ADRs of confusion (ADR-018, ADR-019). With privacy moving to the person, that switch is a second place the word "private" means something else.

## Solution

One fact on the Traveler — **Profile Visibility**, `public | private`, default public — decides who may read what the traveler authors as a person: their postcards wherever they appear, and their follower and following lists. A private profile still shows its header, its four counts, its published itineraries and turns up in People search; only the authored content is behind the door. The key to the door is **follow**: following a private profile creates a **Follow Request** the owner approves or declines, approval creates the edge, and the owner may remove any follower at any time. The itinerary loses its own visibility switch entirely — `published` is its one exposure, and a published itinerary is readable by every signed-in traveler. Trips, workspaces and their contents are untouched: members only, always (INV-1).

The story ships all of it on the wire, with every fence enforced server-side and proven at the HTTP seam, and no screen. The shipped app behaves identically until a screen exists that can flip a profile, which is the whole ADR-008 argument.

## User Stories

1. As a traveler, I want to set my profile private through the profile edit I already have, so that what I post reaches only people I approved.
2. As a private traveler, I want my published itineraries to stay in Discover and my header, counts and search presence to stay visible, so that being private does not make me disappear.
3. As a traveler following a private profile, I want my follow to become a request the owner decides, and the API to tell me which happened, so that no screen has to guess my state.
4. As a private traveler, I want to list my pending requests and approve or decline each by the requester, so that my circle is mine to curate.
5. As a traveler declined by a private profile, I want no announcement and the freedom to ask again, so that a decline is quiet rather than a verdict.
6. As a traveler, I want to remove any follower without them being told, on a public or a private profile alike, so that saying no is always available.
7. As a traveler going private, I want everyone already following me to keep following me, so that the flip changes the future and not the past.
8. As a traveler going public, I want every pending request approved in the same act, so that nobody who asked keeps waiting on a door that is now open.
9. As a stranger reading a private profile, I want the lists and the diary to refuse with a code that names privacy, so that a client can show a lock instead of an empty page.
10. As a co-traveler of a private author, I want no special access to their postcards from our shared trip, so that the one key is follow and nothing else.
11. As a traveler whose photo sits in a trip's Photo Dump, I want nothing about that consent to change with my privacy, so that the rule I already agreed to stays one rule.
12. As a traveler reading a published itinerary, I want it to be readable whoever published it and whatever their profile says, so that "published" keeps one meaning.
13. As an owner of a trip published as private today, I want it unpublished rather than exposed when the switch goes, so that nothing I hid becomes visible without my act.
14. As a shipped client that still sends an `audience` at publish and still reads `visibility` on every trip, I want a constant answer and a named refusal rather than a missing field, so that I keep working until my replacement lands.
15. As the founder, I want privacy, requests, approvals, declines and removals measured server-side, so that S4.40 and the stories behind it are grilled on numbers that exist.

## Implementation Decisions

*(Founder rulings, 2026-09-04, in grilling order; mechanics follow from them. Every wire change is additive within /v1.)*

1. **Profile Visibility is a fact on the Traveler**, `public | private`, one additive column with a default, changed only by the traveler through the existing profile edit. It is not on the account (the account is the Firebase identity, ADR-006) and not on any itinerary. The term is **Profile Visibility**; "account privacy" is not used.
2. **What a private profile hides, exactly.** From a non-follower: postcards everywhere (the Home feed in both scopes, the profile's diary tab, the per-trip diary by author, and the postcard **photo bytes**), the followers list and the following list. What stays visible to every signed-in traveler: the header (handle, display name, avatar, bio, vanity number), the four counts, the published showcase, and presence in People search. Counts visible, lists hidden — a count leaks nothing a stranger could not already infer.
3. **The itinerary's visibility axis retires.** Public/private applies to profiles only. An itinerary has two axes left: lifecycle `state` and `published`. **Published means readable by every signed-in traveler**, always — in Discover, forkable, with pins, Creator Tips, cover and the owner's handle; "published + private" no longer exists. **The Trip Workspace is unchanged: members only, always** (INV-1); the published projection was always the plan alone (INV-2), and stays so. **The gate and the freeze are unchanged:** publishing still requires `completed`, still pins the lifecycle, still freezes the plan (ADR-019/020, upheld on the record — loosening the gate is its own ADR with its own trigger, which ADR-019 already names).
4. **The Follow Request is an entity** in the Invitation / Join Request / Ownership Offer grammar: `pending → approved | declined | cancelled`, all terminal; at most one `pending` per requester-and-target; re-request is a new row. Approval — by the target, or by the target's profile going public (decision 6) — creates the Follow edge. **Decline is silent**: the requester's relation returns to `none` and they may request again at once; the nag vector this opens is recorded on the rate-limiting backlog line, not answered with a cooldown nobody asked for. A request from someone the target already follows is still a request. Following a **public** profile creates no request and behaves exactly as S4.37 shipped it.
5. **Follow and unfollow keep their paths and gain a state.** `POST …/follow` answers with `state: following | requested`; `DELETE …/follow` removes the edge or cancels a pending request, idempotent either way — no separate cancel verb.
6. **The transitions follow Instagram's flow** *(the founder asked how Instagram does it; it auto-accepts pending requests at the flip and tells you to delete the ones you do not want first)*. **Going private keeps every existing follower** — nothing is revoked. **Going public approves every pending request** in the same transaction: each row goes `approved`, each edge is created. Postcards are untouched in storage either way: visibility is a query-time filter, and nothing rewrites `shared_at`.
7. **Remove-follower ships**, silent, on public and private profiles alike: the edge is dropped, the removed traveler's relation becomes `none`, and they may follow or request again. **Blocking stays parked.** Without removal a private profile's approvals would be permanent, which is not privacy.
8. **A gated read refuses by name.** The diary tab, the per-trip diary by author, the followers list and the following list answer **`403 PROFILE_PRIVATE`** to a non-follower of a private profile. Not the guard's 404 mask — existence is not secret here: the profile is searchable and its header renders. The profile read itself stays `200` and carries `visibility` and a `viewerRelation` of `none | requested | following`, so a client can pre-empt the refusal. **Postcard photo bytes answer `404`** to a non-follower, as media already does — nobody renders a reason on a byte endpoint.
9. **Co-travelers get nothing extra.** Membership in a shared trip does not open a private co-traveler's postcards from that trip; the one key is follow. The Photo Dump inside the workspace is shared exactly as today. *(Today a workspace shows a member only their own diary; a co-traveler's postcards are reached only through Home, the profile and the per-trip-by-author read — so nothing a member sees today is taken away except what the profile fence now hides everywhere.)*
10. **Dump-implies-consent is untouched** (ADR-025 decision 2). A private traveler's photo dumped into a trip may appear in a public co-traveler's public postcard. Profile Visibility governs what a traveler *authors*, not what they handed to the trip. The dump surface's owed info line lands with S4.40.
11. **Default public, no backfill, onboarding does not ask.** Every existing and new Traveler is `public` by the column default; nothing changes for anyone until they choose.
12. **The inbox is in this story, pull-only.** `GET /v1/me/follow-requests` (cursor) plus approve and decline, **keyed by the requester's traveler id** — ADR-015 says mutations target identity, and one pending per pair makes the id unambiguous. **No socket frame**: the invitation inbox is pull today and its move to the socket is a deliberately parked line since S4.28; that line now names both inboxes, so they go live together or not at all.
13. **No outgoing-requests list.** `viewerRelation: requested` on each profile is the requester's whole view of their own pending asks. A list is a screen, and the screen is not here.
14. **ADR-008 is upheld — every change is additive, and the interval is safe by construction.** Fewer feed rows and gated sub-resources are additive when the default is public: every existing row answers identically until someone flips. The new fields (`profileVisibility`, `visibility`, `viewerRelation`, `state`) are additions; the old ones (`followedByViewer`, `followsViewer`) stay. **The shipped app cannot reach a private target until S4.40 ships the toggle** — the only way to flip a profile before then is the API directly, i.e. a pool traveler on `dev` during verification, where the shipped pill would render "Following" on a `requested` answer. Bounded, named, accepted.
15. **The itinerary switch retires without breaking a phone.** The `visibility` field on every itinerary response **stays and always reads `public`** — keeping a field is never a break. A publish request carrying `audience: private` is **refused with `400 VISIBILITY_RETIRED`**, never silently accepted (the dead-click pattern this repo refuses); `audience: public` and no `audience` both publish as today. The **column drops** in this story's migration, after decision 16 has run. The shipped client's toggle therefore errors honestly on `dev` for the days until S4.40 deletes it.
16. **Rows published as private today are unpublished by the migration** — `published` goes false, the lifecycle stays where it is, the plan thaws, and the owner republishes with one tap if they want the trip back in Discover. Nothing becomes visible that was not. *(Owner's ruling on a stop rule — publish semantics and a data migration — recorded here.)* The migration gets the stepping IT (the `WorkspaceBackfillIT` pattern), sabotage-checked.
17. **Five demand events, server-side, after commit, ids only** (P3): `profile_visibility_changed`, `follow_requested`, `follow_request_approved`, `follow_request_declined`, `follower_removed`. `follow_created` / `follow_removed` keep firing as S4.37 shipped them, including for approvals and removals.
18. **The driver and its measures go on the record.** Driver: the sentence in the Problem Statement. Measures S4.40's successors grill on: the share of profiles flipped private; requests to approvals; postcards per private author versus per public author.
19. **Two stories, not one.** S4.39 is this backend story, its own branch, PR and tracker row; **S4.40** is the UI, queued behind it, with its own spec — the WS-1 → S4.10 and FB-1 → FB-2 shape. One id with two specs was considered and declined: one branch and one PR per story means the backend could not reach `dev` before the UI, and the tracker row cannot say "half landed".

## API Contract

*(The deliverable. Every path is under `/v1`; every change is additive; refusal codes are stable machine strings the client branches on, per Artifact 05.)*

**Existing endpoints that change what they answer**

| Endpoint | Change |
|---|---|
| `GET /me` | + `profileVisibility: "public" \| "private"` |
| `PATCH /me` | + optional `profileVisibility`; absent means unchanged, as every field on this patch. A flip to `public` runs decision 6 in the same transaction. |
| `GET /travelers/{handle}` | + `visibility`, + `viewerRelation: "none" \| "requested" \| "following"`. `followedByViewer` and `followsViewer` stay. Always `200` for an onboarded traveler, private or not. |
| `GET /travelers/{handle}/diary/trips` | `403 PROFILE_PRIVATE` unless the viewer is the owner or an approved follower, when the profile is private. |
| `GET /travelers/{handle}/followers` · `/following` | same fence, same code |
| `GET /travelers/{handle}/published` | unchanged — published itineraries are public whoever published them |
| `GET /feed/postcards?scope=all\|following` | per-viewer filter: entries whose author is public, or whom the viewer follows, or is the viewer. Shape unchanged. |
| `GET /feed/postcards/trips/{itineraryId}/by/{authorId}` | `403 PROFILE_PRIVATE` under the same rule as the diary tab |
| `GET /media/…` for a `DIARY_ENTRY` photo | `404` unless the entry is readable by the viewer under the same rule |
| `POST /travelers/{travelerId}/follow` | `200 { "state": "following" \| "requested" }` (was `204`, no body — the shipped client posts `void` and reads nothing, so `200` is a safe widening). Public target: edge created, `following`, idempotent. Private target: a pending request created or found, `requested`; if an edge already exists, `following`. |
| `DELETE /travelers/{travelerId}/follow` | `204`; removes the edge **or cancels the pending request**; idempotent |
| `POST /itineraries/{id}/publish` | `audience: "private"` → `400 VISIBILITY_RETIRED`; `audience: "public"` or absent → publishes as today |
| every itinerary response carrying `visibility` | the field stays; its value is the constant `"public"` |

**New endpoints**

| Endpoint | Answer |
|---|---|
| `GET /me/follow-requests?cursor&limit` | a page of `{ traveler: TravelerCard, requestedAt }`, pending only, newest first, the one pagination shape |
| `POST /me/follow-requests/{travelerId}/approve` | `204`; the request goes `approved`, the edge is created. `404 FOLLOW_REQUEST_NOT_FOUND` when no request from that traveler is pending. |
| `POST /me/follow-requests/{travelerId}/decline` | `204`; the request goes `declined`, silently. `404 FOLLOW_REQUEST_NOT_FOUND` likewise. |
| `DELETE /me/followers/{travelerId}` | `204`, idempotent; drops the edge if it exists. Any profile visibility. |

**Codes introduced:** `PROFILE_PRIVATE` (403) · `FOLLOW_REQUEST_NOT_FOUND` (404) · `VISIBILITY_RETIRED` (400). Self-follow, self-request and self-removal are refused as self-follow is today.

**The read rule, stated once, used by every fence above.** A traveler *V* may read what traveler *A* authored as a person iff *A* is public, or *V* is *A*, or a Follow edge *V → A* exists. `PROFILE_PRIVATE` is the answer whenever this is false on a list; `404` whenever it is false on bytes; the feed simply omits.

**Schema (the next free `V` numbers at implementation time; all additive except the drop in decision 15):**
- `traveler.profile_visibility` — text, not null, default `'PUBLIC'` (the enum's storage spelling; pinned by a storage IT, per the `@Enumerated` gotcha).
- `follow_request` — id, requester id, target id, status, requested-at, decided-at; foreign keys to traveler; a check that requester ≠ target; a **partial unique index on (requester, target) where status = pending**; the index the inbox read needs (target, requested-at desc).
- Itinerary: `UPDATE … SET published = false WHERE published AND visibility = 'PRIVATE'` (decision 16, counted and logged in the migration as V18/V20 do), then `ALTER TABLE itinerary DROP COLUMN visibility`. The Discover query and the trip-media audience lose their `visibility = 'PUBLIC'` clause; `published AND NOT archived` is the whole rule.

## Testing Decisions

A good test here asserts **what the wire answers to whom** — never the internals. The seams:

- **Backend — the HTTP surface, via integration tests against the real server and a real Postgres**, at **Full rigor** because every one of these is an isolation fence. Proven per endpoint, for each of the four roles: the private owner, an approved follower, a requester still pending, and a stranger — and, separately, a co-traveler who does not follow (decision 9). The transitions (decision 6) proven as state tables: going private keeps followers; going public approves every pending request and creates every edge in one transaction. Idempotency of follow, unfollow-as-cancel, approve, decline and remove. The `VISIBILITY_RETIRED` refusal, and the constant `visibility` field asserted byte-for-byte against today's response for a public publish. The events via the recording analytics bean, ids only. **Every fence sabotage-checked** — flip the read rule and watch the right assertion go red, then restore.
- **The migration — a stepping IT in the `WorkspaceBackfillIT` mould**: its own container, Flyway to the version before, raw-SQL seed of published-and-private rows plus published-and-public and unpublished controls, migrate, assert exactly the private ones are unpublished and nothing else moved; then that the column is gone. Sabotage the SQL, confirm the test catches it, restore — and `test-compile` before the sabotage run (the S4.13 trap).
- **End-to-end — the Playwright API suite against the preview container**, the contract's first client: `follow.spec.ts`, `diary.spec.ts`, `media.spec.ts`, `publish.spec.ts` and `discovery.spec.ts` gain cases. Roles named per the test-identity rule: **t1 = private owner, t2 = approved follower, t3 = stranger, t4 = requester, t5 = co-traveler who does not follow**. The walks: flip t1 private → t3 sees header and counts, gets `PROFILE_PRIVATE` on lists and diary, `404` on a postcard photo, and t1's postcards vanish from t3's Home while t2's Home still shows them → t4 follows and gets `requested` → t1's inbox lists t4 → approve → t4 reads everything → t1 removes t4 → t4 is back to `none` → t1 flips public with t3's fresh request pending → t3 is following. The itinerary walk: publish with `audience: private` refused by name; a public publish unchanged; a private-profile owner's published trip still in Discover for t3.
- **No mobile change, so no Jest and no device rung.** The shipped client is exercised only as decision 14's interval check: one manual look at the shipped pill against a curl-flipped pool traveler, recorded in the gate ticket, not automated.
- **Process gates:** backend counts read from the test summary, never the exit code alone (`failsafe:verify` appended); the Playwright list check after adding specs; one Maven run at a time.

## Out of Scope

- **Every screen** — the toggle, the lock, the request inbox, the pill's third state, the removed badge. **S4.40.**
- **Blocking** — decision 7; stays on the defensive-follow line with its trigger.
- **A socket frame for requests or approvals** — decision 12; the parked inbox-over-socket line now names both inboxes.
- **An outgoing-requests list** — decision 13.
- **Notifications** — the notifications backlog line gains "request received" and "request approved" as candidate events.
- **A cooldown or throttle on re-request** — decision 4; the rate-limiting line owns the vector.
- **Any change to the publish gate or the freeze** — decision 3, upheld.
- **Revisiting dump-implies-consent** — decision 10.
- **Highlights (S4.2)** — when built, it shows a viewer only the postcards the author's profile admits; diary-level publish is retired by ADR-034 and does not return as sugar.
- **The Diary as its own object, decoupled from the trip** — a later story the founder named at this grilling (epic-map line); this story changes nothing about where a Diary lives.
- **Account deletion / anonymization** — S5.5's question; both new tables are id-only and anonymization-safe by construction.
- **The past-trip door** — closed `wontfix` at S4.15; re-raised at this grilling as the supply-side dependency of the driver (a private circle still needs something to post about). The `wontfix` stands until the founder reverses it; noted on the epic-map line.

## Further Notes

- **Vocabulary check, done at the grilling.** The founder's sentence — *"the trip is only visible to its members; the itineraries, postcards and diaries are the exposed objects"* — is already how canon reads (INV-1, INV-2, the Trip/Itinerary split ratified at S4.15). Nothing in it is new; what changes is only the deleted switch. The Trip-vs-Itinerary wire housekeeping line stays where it is.
- **The two rulings that changed during the grilling, for the record:** auto-approve on the flip to public was first ruled out, then adopted once the Instagram behaviour was looked up; and "keep pending" would have needed a `superseded` state for a requester who simply follows an already-open profile — that state is not minted, because the flip now resolves every pending row.
- **What S4.40 inherits as must-answers:** the lock treatment on a private profile; the pill's `requested` state and its cancel; the inbox surface and its lane (pull by default); the dump surface's consent info line; deleting the itinerary Public/Private control and the card badge; and the register-#2 measures in decision 18.
- Sources consulted for decision 6: [TechWiser](https://techwiser.com/what-happens-when-you-make-your-instagram-account-public-or-private/), [Quora](https://www.quora.com/If-you-change-your-Instagram-from-private-to-public-do-your-pending-follower-requests-automatically-get-accepted).

## Comments

**Gate note, 2026-09-04 — what was verified where.** Backend green in CI on the branch: **393 unit + 1218 integration** on real Postgres, counts read from the summary rather than the exit code. Every fence was **sabotage-checked**, not merely watched to pass — inverting the read rule turned exactly the two refusal assertions red and nothing else; dropping the feed's hidden-author set turned exactly the three feed assertions red, the co-traveler one included; removing `asks.cancel` from remove-follower turned exactly the new pending-request test red; inverting V48's predicate turned exactly two migration assertions red; and removing one `requireAudience` made the new structural guard name that exact door. All restored and re-run green. The Playwright API specs run at the PR, which is where that job is gated.

**Three deviations from the body, all narrowings, none reversing a decision.**

1. **`POST /itineraries/{id}/audience` was not named in the contract and needed a ruling.** Decision 15 settles `/publish`; this second route exists only to move the retired value. It now **validates and answers the current state**: `audience: private` is refused `400 VISIBILITY_RETIRED` as everywhere else, `public` or absent answers `200` with the itinerary unchanged. Refusing it outright was implemented and reverted — a shipped client may legitimately send `public`, and ADR-008 says that keeps working. What it no longer does is emit `itinerary_audience_changed` on an unchanged row, which would have polluted the very measures decision 18 names.
2. **Remove-follower also cancels a pending request.** Decision 7 says removal returns the traveler to `none`; without this a private owner could remove someone who had *asked* and leave them reading `requested` for ever, which is the one state decision 7 exists to prevent. The body implies it; the implementation now does it.
3. **The shipped client never posts an audience at all**, so decision 15's predicted interval — "the shipped client's toggle errors honestly on `dev` for the days until S4.40 deletes it" — does not arise. `publishControls.ts` still exports the audience helpers, but no screen calls them; the toggle was already gone from the UI. The refusal is still built and tested, because a *future* client or a curl could send it.

**Decision 14's interval look is NOT closed, and is deliberately left open rather than reported as done.** The manual check it asks for — flip a pool traveler private with curl, open the shipped preview as another, tap Follow, and record what the pill shows on a `requested` answer — needs the local stack and the preview container running, which is an execution the founder gates. The expected answer is unchanged: "Following", the bounded lie the spec already names and accepts, which S4.40's pill fixes. Nothing in the build contradicts that prediction; it simply has not been watched.

**One trap earned a CLAUDE.md line.** Two ITs (`LifecycleRespectsEditingSessionIT`, `ForkRollbackIT`) publish trips owned by a bare `UUID.randomUUID()` — never a traveler row. Every backend IT shares one Postgres, so those orphans sat on the strangers surface, where Discover's count includes them and its list drops them. They were invisible for as long as those fixtures published **private**, because the `visibility = 'PUBLIC'` clause excluded them; retiring that clause exposed them, and two Discovery classes this story never edited went red — **passing in isolation and passing across their whole package**, so only the full suite saw it. The fixtures now provision real travelers; no query, service or migration changed to make it pass, and the count-versus-list asymmetry itself stays on the backlog. The generalisation recorded: *when removing a filter, ask what that filter was accidentally hiding.*
