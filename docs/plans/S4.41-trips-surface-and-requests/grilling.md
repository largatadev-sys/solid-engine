# S4.41 — the grilling record (2026-09-14)

**Why this file exists.** The founder pulled the epic map's *four tab surfaces* backlog line (minted 2026-09-11 from the component-map review) on 2026-09-14 and typed `/grill-with-docs`. Rounds are recorded as asked; the founder's answers are quoted verbatim; the reading under each answer is the agent's and is what the next round was built on. Corrections are made in place. Where this record and the later spec disagree, this record wins. It rides the story's feature branch with the spec, the tickets and the build, by the founder's ruling at the end of this session (below).

**How the story was pulled.** Asked what was next, the agent measured the tree: the strangler arc (CM-1 → CM-5, TW-1, ADR-039, the module-layout series) had closed on 2026-09-11, eleven consecutive commits were architecture, and the last traveler-visible feature was ten days old. The agent recommended E5 (the ledger). The founder asked instead what TW-2 Q4 was, then oriented on the backlog line: *"oh okay i remember, this is for making a trip as a read, same with discovery, home, and profile?"* and *"I see, so the reason it doesnt have its own read surface because it is only composed of trips?"* — and typed `/grill-with-docs`.

## Facts measured before round 1, because they overturned the line's premise

The line said a trips surface "reads a single module's `api`" and might not pass the deletion test. Measured, it does not read one module:

- **`TripController.listMine` is already a server-side composition living in a controller.** It fans out to six lookups — edit leases, day counts, ownership, member counts, `PublicationState.liveAmong` (sole implementation: `ItineraryBackedPublicationState` in the `itinerary` module) — and a per-row `workspaces.findByItineraryId` inside the mapper, an N+1 beside five batched calls. Seven calls, two owners, in the owning module's controller. The story is an extraction, not a mint.
- **ADR-039 decision 4 refuses the shape the line worried about by name:** *"A module wrapping one call would be a Middle Man and is not minted."* A trips surface does not wrap one call.
- **Trips is the only tab that merges two server collections on the device.** `InvitationInbox` fetches `/v1/invitations` and `/v1/join-requests` separately and interleaves them in `inboxCards`. Round trips on open: Home 1 · Discover 2 · Profile 2 · Trips 3; Discover's and Profile's pairs feed disjoint regions.
- **`/v1/travelers/{handle}/**` is three modules' surface** — `profile`, `diary` (`/diaries`), `identity` (`/follow`, binding `{travelerId}` as a UUID where the other two bind `{handle}`).
- **"Diaries" has four spellings across three packages**: the `diary` module, its profile listing, `postcard/legacy` (the old trip-attached entries, reaching into `trip`'s entities through a standing exemption), and `profile`'s own `/diary/trips`. Two `DiaryTripResponse` classes, two `DiaryService` classes.
- **The three existing surface guards enforce what the line claims**: each `…OwnsNoTableAndNoQueryOfItsOwn` rule fails the moment a composition module grows an entity or a repository.
- **No TW-2 record exists on disk.** The epic map says TW-2 was grilled 2026-09-10 and that this story should sequence with it; there is no `docs/plans/TW-2-*`.

Also found, recorded for the backlog rather than this story: `trip` has **no outbound allowlist** (its guard is inbound-only, so `TripController` importing `common.authz` is unpoliced); `profile`'s guard prose names a `publication.api` that does not exist; `feed`'s guard says "naming only API packages, never the modules" while allowlisting `identity..` and `media..` whole; four of `DiscoveryController`'s routes bind `@CurrentTraveler` and never read it.

## Round 1 — the canon question, the inbox, scope, sequencing

Round 1 was issued twice. The first issue asked four questions on the line's own premise; the measurement above arrived before the founder answered and disproved the premise of two of them, so the round was re-issued whole (Q1–Q4 replaced, Q5–Q7 added from the newly settled frontier) rather than let the founder rule against a false fact. The founder's answers are to the re-issued round, except Q1, read below.

**Q1 — what does "several modules" count?** Re-issued as: (a) data owners reached — a port's implementer is the module you depend on; (b) api packages read. Founder: *"q1 - c"*.
Reading: the re-issued Q1 had no (c). The **first** issue's (c) was *"amend the rule's wording — the real criterion isn't 'several modules' but 'the surface's wire contract is owned by the surface, not by a data module.'"* That is the reading taken, and it fits the measurement: `TripResponse.summaryOf` is a screen contract, and `listMine` already composes it. Consequence: **ADR-039 decision 4 is amended** to name that criterion; the Middle Man clause stays — a pure pass-through is still not minted. The founder is told this reading before `/to-spec` and has not contradicted it.

**Q2 — the inbox, and the founder's word "only".** The line rules Trips shows *"only trips, with their lifecycles"*; an invitation is not a trip. (a) stays, composes server-side; (b) leaves the Trips screen; (c) stays device-side. Founder: *"q2 - invitations should have it's own tab on the trip screen"*.
Reading: none of the three as offered — the inbox stays on the Trips screen, in its own place rather than as a header above every lifecycle tab. What "its own tab" means was asked in round 2.

**Q3 — scope: four modules, four guard redraws, four screens.** (a) one story; (b) two — the trips extraction, the three content corrections; (c) four. Founder: *"q3 - this should only over trip. we are not doing any change on other tabs"*.
Reading: the story is the **Trips tab alone** — its screen and its backend surface. The Home, Discover and Profile corrections stay on the backlog line. **Q5, Q6 and Q7 dissolve** for this story (below).

**Q4 — sequencing against TW-2 and the kernel dissolution.** (a) write the TW-2 record first, then sequence; (b) proceed alone, read `PublicationState` from `common.authz` where it is, one allowlist line moves at the dissolution; (c) fold. Founder: *"q4 - B"*.
Reading: proceed alone. The TW-2 record's absence is noted, not this story's to fix.

**Q5 — which "diaries"?** *(dissolved by Q3)* Recommended the `diary` module, never `postcard/legacy`, and that `profile`'s `/diary/trips` be marked to die with the old screens. Recorded on the backlog line for the next puller.

**Q6 — does `ProfileDiariesController` fold into `profile`?** *(dissolved by Q3)* Recommended yes, with `/follow` staying in `identity` as an act whose `{travelerId}` UUID is shipped wire (ADR-008).

**Q7 — the `trip` edges the predicted redraw drops may be load-bearing.** *(dissolved by Q3, but the finding is recorded on the backlog line.)* `feed`'s guard reads `trip.api` for the teasers **and the archived-set fence**; `profile` reads it for teasers; a postcard from an unpublished trip is still public (S4.22), so its teaser cannot come from `itinerary.api`. The line's predicted allowlist over-drops `trip` on that edge; the fence belongs in `postcard.api`'s page call per decision 4.

## Round 2 — the tab

A cost found on the way, stated at the top of the round: `join` has **no `api` package** (module-layout ticket 11 deleted it) and `invitation.api` holds one method, so anything composing the inbox server-side must mint both.

**Q1 — what is in the tab?** Today's inbox holds invitations sent to me and join requests I sent. (a) both; (b) invitations received only. Founder: *"q1 - a"*.
Reading: both directions. The word "Invitations" would then be wrong for the surface; a title was asked in round 3.

**Q2 — where does the tab sit, and how does a traveler know it has something?** (a) a fourth peer tab after Completed with a count badge, Upcoming the default landing — amends ADR-029's "three fixed tabs"; (b) a separate control above the ladder. Founder: *"q2 - b. replace the magnfying icon as mail icon, use that to check for requests."*
Reading: not a tab in the ladder at all. The Trips header's search icon — measured, a `comingSoon('tripSearch')` stub that does nothing — becomes a **mail icon**; tapping it opens the inbox as a pushed screen. ADR-029 is untouched. The tab bar hides on the pushed screen by the standing rule (`showsTabBar` over `MAIN_SCREENS`; nothing to add). The `mail` glyph already exists in the `Icon` set.

**Q3 — design baseline.** S4.26's tab row came from a canvas; there is no frame for this. (a) extend the existing primitive by ruling; (b) the founder supplies a canvas. Founder: *"q3 - a. maybe also align this header with the other 4 in terms of text size. make sure to also align the styling with the trip screens"*.
Reading: (a), plus two riders. **Header size:** measured, Trips' title is `typography.title` (28px bold) where Home (`feedTypography.wordmark`), Discover (`profileTypography.displayName`) and Profile (`memoryTypography.displayName`) are all **22px extraBold**; Trips takes 22 extraBold via the token Discover uses. This is the founder's override of the S4.26 canvas and closes the CM-2.1 epic-map note that recorded the 28-vs-22 gap as an unasked change. **"Align the styling with the trip screens"** is read as: the pushed inbox screen uses the same primitives the pushed trip screens use — `ScreenHeader` with back, and the list container `archived.tsx` uses (the closest analogue, a pushed list off Trips); the `InvitationInbox` cards move unchanged. The founder was told this reading and has not corrected it.

**Q4 — a composed endpoint for the tab, or today's two calls?** (a) keep the two device calls; the `mytrips` module composes only `trip.api` + `PublicationState`; (b) one composed endpoint, the merge server-side, minting `join.api`. Founder: *"q4 - a"*.
Reading: (a). Honest cost recorded: Trips stays the one tab merging two paginated collections on the device. (b) is the follow-up on the backlog line.

**Q5 — the module's name.** (a) `mytrips`; (b) `trips`. Founder: *"q5 - a"*.
Reading: `mytrips` — `com.largata.trip..` and `com.largata.trips..` would sit one letter apart in every listing and grep.

## Round 3 — the badge and the title

Facts stated at the top: `Page<T>` is `{items, nextCursor?}` with **no total**, and the inbox fetches one page of each collection; Home's bell dot renders unconditionally — a stub; the glossary defines *Invitation* ("the trip asking a traveler") and *Join Request* ("a traveler asking the trip") as the two consent directions and has no umbrella term, and "Request" already names *Join Request* and *Follow Request*.

**Q1 — what does the mail icon show when something is pending?** (a) a dot, conditional; (b) a count of loaded items; (c) nothing. Founder: *"q1 - b - but when the screen is viewed, the count is removed."*
Reading: a **count**, and it is *new-since-last-viewed*, not total-pending — opening the screen clears it and later arrivals raise it again. The wire's limit stands as the founder accepted it: with no total, a second page is not counted. The count needs a *seen* mark; where it lives was asked in round 4.

**Q2 — what is the screen called?** (a) "Pending"; (b) "Requests" — collides with two glossary terms and reads as "things asking me"; (c) "Invitations". Founder: *"q2 - B"*.
Reading: **"Requests"**, ruled with the collision on the table. No new glossary noun — a screen title is not a domain concept; the *Invitation* and *Join Request* rows each gain a clause naming the surface they are listed on together, so the next reader meets the collision where the terms live.

## Round 4 — where "seen" lives, and what is counted

Facts stated: Discover's search recents are the on-device persistence pattern (a pure module between `.native`/`.web` forks); chat has an "unseen since last look" in session memory only; nothing server-side carries seen or read state.

**Q1 — where does "seen" live?** (a) on the device, durably, the recents pattern — per device; (b) session memory, chat's pattern; (c) on the server — `seen_at`, additive column plus a mark-seen route, consistent across devices, a schema change in a read-surface story. Recommended (a). Founder: *"q1 - this should be on server"*.
Reading: **(c)**, against the recommendation. The count is consistent across the founder's rungs (phone and web preview). This is the story's one write and its one schema change; both are additive.

**Q2 — does the count include join requests you sent?** (a) invitations received only; (b) both. Founder: *"q2 - a"*.
Reading: only invitations are counted; outgoing join requests are listed but never counted — nothing about a request is new to its sender, and its outcome already leaves the list (approval refetches trips on `membership.granted`; decline is silent by the glossary's rule). The seen mark therefore touches invitations alone.

## Round 5 — the shape of "seen"

**Q1 — a fact about each Invitation, or a watermark on the traveler's inbox?** (a) `seen_at` on the Invitation row; `InboxInvitationResponse` gains `seenAt`; `POST /v1/invitations/seen` marks every pending invitation of the caller seen; count = pending with no `seenAt`. (b) a per-traveler "requests last viewed at" — on `traveler` a coupling magnet in a module whose split is a grilled story, or its own table for one number. Founder: *"q1 - a"* and, on the same line, *"also the count should be updated live"*.
Reading: (a). The *Invitation* glossary row gains the attribute; the *Join Request* row does not.

**"The count should be updated live."** Measured after the ruling: delivery is mounted at the root layout and subscribes to `traveler:<id>`; `invitation.received` writes into the inbox cache, `join-requests.changed` and `membership.granted` refetch — so **arrivals are live already**, and the count, derived on the client from the inbox cache, rises live for free. **Removals are not**: the invitation module fans out exactly one event today (`broadcastInvitationReceived`), so revoke, archive-void, decline on another device and seen on another device all leave the count stale until a refetch; the old header has the same gap. Expiry is lazy on read (`Invitation.isExpired(now)`, no scheduler) and needs no event. Honouring the ruling means one generic **`invitations.changed`** on those four acts (the `join-requests.changed` shape) and a client handler that refetches the inbox. This was put to the founder as a yes/no in the read-back and was **not struck**; it is in.

## The read-back, and the frontier is empty

The shared understanding was restated whole — the story in a paragraph, every ruling with the fact it rests on, what "live" costs, what is deliberately out, the two corrections below, what would be written from the record, and the story id. Two items were left for the founder: strike the `invitations.changed` event or keep it, and the id (**S4.41** recommended — every Trips-tab story so far sat in Epic 4: S4.9, S4.13, S4.15, S4.26). The founder typed **`/to-spec`** without answering either, which is taken as confirmation of the record with both defaults: the event stays, the id is S4.41. Both are cheap to change on this branch before it merges.

**Deliberately out:** the Home, Discover and Profile corrections · a server-composed inbox endpoint · a "New" pill per row · a fourth ladder tab (ADR-029 untouched) · seen state on join requests · consolidating the three 22px title tokens · `trip`'s missing outbound guard (its own backlog line).

## Corrections made in this session's own record

- The agent said the client's inbox had **no live subscription**. Wrong — the grep ran against the wrong directory. `tripEvents.ts` maps `invitation.received` to `absorbInvitationIntoInbox`, delivered over the traveler topic from the root layout. Corrected before round 3 and the freshness reading above is the corrected one.
- The agent said the quarantined `ItineraryPublicationIT` would be **deleted with the old route** by CM-5 ticket 11. The class already calls `/v1/trips` and `/v1/me` — it was migrated to the trip grammar — so the ledger row's exit condition ("deletion, not repair, when ticket 11 sunsets the route") no longer describes it. Ticket 11 has shipped; the row is stale for a different reason and is re-examined on this branch (its eight-test successor `PublishedMeansALiveItineraryIT` covers fewer cases than the fifteen it quarantines, so "redundant" is a claim to check, not assume).

## After the grilling — whether this record exists, and where it lives

With `/to-spec` typed and the record unwritten, the founder asked whether grilling writes its own document now that the skills were updated. Measured: neither `grilling` nor `grill-with-docs` instructs a file (both trees identical, no git diff); only `docs/agents/story-workflow.md` requires the record. The founder considered dropping it (*"i am aware that it should only spec that generates doc for the spec"*); the agent argued to keep it — the record carries what was *said*, verbatim, the spec what will be *built*; the "record wins on disagreement" rule needs a record; and this very session was compacted mid-way, which is the case `/to-spec`'s "synthesize what you already know" cannot see. Founder: *"i see. okay keep it then. then that document will become the subject for the to spec skill right? thats better but the doc should also be included in the commit for the same branch with the feature"*.

Reading: the record stays and is `/to-spec`'s input; **it rides the story's feature branch** with the spec, the tickets and the build — one branch, one PR, one squash — not the docs-only PR `story-workflow.md` currently prescribes. That doc's "Where the documents land" section is amended to say so. Open at the time of writing: whether the *canon this record amends* rides the same branch (the glossary clause, ADR-039's clause and the BUILD_STATUS row describe what the branch builds and belong with it) while **findings that outlive the story** — the stale quarantine row, the three-surfaces-parked and `trip`-over-drop notes, the `trip`-outbound-guard line — are true today regardless of the story and would otherwise wait weeks on `dev`. The agent's proposal is that split; the founder decides.

## What will be written from this record

On this branch: the spec (`spec.md`, at `/to-spec`, after the seam check) · ADR-039 decision 4's clause (the wire-contract criterion; the Middle Man clause kept) · the *Invitation* glossary row (`seen_at`, and the Requests clause) and the *Join Request* row (the Requests clause) · the S4.26 canvas deviations, in the spec's design-baseline section · the BUILD_STATUS row for S4.41 · `story-workflow.md`'s "Where the documents land" amendment. Where the outliving findings land is the open question above.
