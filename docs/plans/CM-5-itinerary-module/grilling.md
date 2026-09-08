# CM-5 — the grilling record (2026-09-09)

**Why this file exists.** CM-5 was minted at TW-1's grilling on 2026-09-07 with one instruction: *grilled when pulled*. The founder pulled it on 2026-09-09, the day after TW-1 merged and the same day ADR-039 adopted the modular-monolith standard, by invoking `/grill-with-docs` on the epic-map line. This is that record. The spec beside it is written from it, and where the two disagree this file wins. Rounds are recorded as asked; the founder's answers are quoted verbatim; the reading under each answer is the agent's and is what the next round was built on. Two of the agent's questions rested on a wrong premise and are corrected in place rather than rewritten, because the correction is the more useful record.

**Facts established before round 1, so the questions rested on them.** "Frozen" in the code means *archived*; publishing gates the workspace through a different port, `PublicationState`: plan edits answer `409 ITINERARY_PUBLISHED`, invites and removals answer `409 MEMBERSHIP_FROZEN`, join links read as closed, and chat consults it. The object read (`GET /v1/publications/{id}`) answers `{id, tripId, publishedAt, plan}`; the page renders a creator card, fork count, provenance, an estimated cost, a pin and photos, and the snapshot carries neither the pin nor the photo ids. Everything public is keyed by the trip id today: the page route, share links, discovery cards, fork, `fork_relationship.source_itinerary_id`. Five shipped client screens still call the old diary-entry paths. The local stack held 28 published trips and 0 objects. ADR-039's decisions 3 and 4 (fork's act to the itinerary module; `discovery` and `feed` as composition modules) were settled the same morning and were not re-asked.

## Round 1 — the root's children

**Q1 — does publishing still freeze the trip?** Options: (a) no freeze, the Itinerary is a snapshot and the trip keeps living; (b) keep the freeze exactly as it is; (c) freeze the plan only. Recommended (a). Founder: *"b"*.
Reading: the freeze stays whole — plan edits, membership, join links, chat. The trip's *record* is untouched by publishing; its *workspace* is fenced for as long as a live Itinerary exists. `PublicationState` therefore survives, re-implemented by the itinerary module over the object, and "published" comes to mean exactly "a live Itinerary exists for this trip" — retiring or hard-deleting the object unfreezes the trip. This reverses ADR-039 decision 5's "`PublicationState` dies with the flag" and is recorded there.

**Q2 — does the trip record still say it is published?** Options: (a) keep `published` and `publishedAt`, add a nullable `itineraryId`, all read through a port the itinerary module implements; (b) drop the fields; (c) keep the column and let the itinerary module write it. Recommended (a). Founder: *"yes"*.
Reading: (a). Additive on `/v1/trips/{id}`; the client's badge, settings items and row tap target need no change; the columns stop being written.

**Q3 — the public identity: the object's id or the trip's?** Recommended the object id everywhere public, with `/published/{tripId}` links already shared kept resolving through a by-trip read. Founder: *"agreed"*.

**Q4 — published trips with no Itinerary: backfill, read-fallback, or neither?** Recommended (a), a data migration minting an object per flagged trip, and leaving the flag columns dead. Founder: *"it should be C"*.
Reading: **neither**. On cutover every trip published by the old flag-flip reads as unpublished and, under Q1, unfrozen; its owner republishes. On `dev` that is roughly 290 trips and the seeded demo set; Discover shows the handful of real objects until the seeders run through the new route. The second half of the question (the columns) was not ruled here and was confirmed in round 2 Q8.

**Q5 — how does Discover filter an Itinerary?** Recommended denormalized columns on `itinerary_object` written at mint and refresh. Founder: *"agreed"*.

**Q6 — what happens to the old Trip Diary screens?** Five shipped screens still call the old diary-entry paths. Recommended (a): the old package's diary half relocates into `postcard` as legacy adapters under unchanged paths, so the old package can go without touching the client, and the screens' cutover plus the adapters' deletion becomes its own story with the original trigger; the eight diary routes therefore outlive the root's sunset as a dated exception to ADR-037's "sunsets whole". Founder: *"agreed"*.

**Q7 — the story's shape.** Recommended two PRs inside one story — readers and client cutover with the old root still served, walked on `dev`; then the deletion and the sunset — with the cycle rule plus principal move and the seven owed guards as their own small PRs ahead. Founder: *"agreed,"*.

**Q8 — where does the profile live?** Recommended (a), a `profile` composition module on the same shape as `discovery` and `feed`, per-object lists staying in their modules. Founder: *"agreed"*.

**Q9 — who owns the photos a published page shows?** Recommended (a), photos referenced from media under an audience rule, with copying into the Itinerary's custody as the recorded evolution. Founder: *"shoudlnt it be a since media is a basically a separate module consumed by trip, diaries, etc"*.
Reading: (a), and the founder's reason is the better one: media is a shared module every subject consumes, so an Itinerary is one more consumer of it, not a custodian. The audience rule as *worded* in this question was wrong and is corrected at round 3 (below).

**Q10 — the `itinerary` table holds trips; does anything rename?** Recommended (a), nothing now. Founder: *"a"*.

## Round 2 — what round 1 unblocked

Stated as assumptions before the round, not objected to and therefore standing: the port stays in `common.authz` until the kernel dissolution ADR-039 scheduled after this story; the preview route moves into the itinerary module and answers the page's shape; discovery, feed and profile paths keep their shapes; the workspace's published badge stays pull-fresh, since no publish event exists today and the mutation already refetches.

**Q1 — the glossary says "the trip itself is untouched", and the freeze was kept. Which wording holds?** Recommended (a): amend the Publish row — the record is untouched, the workspace is fenced while a live Itinerary exists. Founder: *"agreed"*.

**Q2 — fork on the wire, and the old fork rows.** `POST /v1/publications/{id}/fork` in the itinerary module, creating a Trip through a `TripApi.createFrom(snapshot, forker)` port; `fork_relationship.source_itinerary_id` records the object id from now on; the old route sunsets. Old rows on `dev` hold trip ids. Recommended (a): leave them; attribution for those forks resolves to nothing, the same fate Q4 gives their sources. Founder: *"agreed"*.

**Q3 — links already shared as `/published/{tripId}`.** Recommended (a): the page fetches `GET /v1/publications/{id}`, on a miss tries `GET /v1/trips/{tripId}/itinerary`, then rewrites the URL to the object id; a courtesy with a dated end on the epic map. Founder: *"agreed"*.

**Q4 — the page's shape.** Recommended (a): widen the object read additively — `creator`, `forkCount`, `forkedFrom`, `estimatedCost`, `pin`, typed `days[]` beside the raw `plan` — with the snapshot gaining the pin and per-activity photo ids at mint; the five objects already on `dev` render without them until republished. Founder: *"agreed"*.

**Q5 — who may load a published page's photos?** *Asked on a wrong premise — see round 3.* The question claimed the page was fenced by the owner's Profile Visibility and recommended that photos match it. Founder: *"agreed"*. The premise came from CM-1's object-contract row, which contradicts ADR-034; the ruling that stands is round 3's: the Itinerary's audience is every signed-in traveler, and photos referenced by a live Itinerary take that audience — which is what the media rule already does today. No change to media's behaviour.

**Q6 — archiving a published trip: does the Itinerary go down with it?** Recommended (a), today's posture: archived hides the page and the card, unarchive restores them. Founder: *"agreed"*.

**Q7 — republishing and `publishedAt`.** Recommended (a): republish keeps the object's id and refreshes `publishedAt`, so a republished Itinerary rises to the top of Discover. Founder: *"agreed"*.

**Q8 — the dead columns and the dead tests, confirmed.** `published` and `published_at` on the trip table stop being written and are left in place until the schema story; the old package's 39 integration tests die with it, their contracts re-proven by new tests in `itinerary`, `discovery`, `feed` and `profile` written *before* the old ones are deleted so the second PR can diff assertion lines. Founder: *"agreed"*.

## Round 3 — one audience case, and a wrong premise

**Q1 — a member of the trip not admitted by the owner's Profile Visibility: can they read the Itinerary?** Recommended (a): the owner's visibility plus the trip's current members. Founder: *"an itinerary is supposed to be public. that's why we decoupled it from a trip."*
Reading, after re-reading the record: the question was built on a mislabelled contract row. ADR-034 (S4.39, the founder's own ruling) says Profile Visibility *never governs an Itinerary* and *a published itinerary is readable by every signed-in traveler*; the old page does exactly that (published and not archived, everyone signed in; its `caller` parameter is unused). What contradicts ADR-034 is **CM-1's object read**, which fences `GET /v1/publications/{id}` by the owner's Profile Visibility (`PublicationController` line 55) under a contract row that cites ADR-034 while doing the opposite — CM-1 was built five days before ADR-034 and the row was relabelled at its landing without the code moving. It is dark, so no traveler has met it. **The founder's answer is ADR-034 restated, not a reversal.** Consequences: the visibility fence comes off the object read at CM-5; fork, Discover and the page's photos follow ADR-034; round 2 Q5 is corrected as above; there is no member special case because there is no fence.

## Round 4 — public to whom

**Q1 — every signed-in traveler, or anyone with the link?** Recommended (a): signed-in, as ADR-034 says; an anonymous page becomes an epic-map line with "the first share link sent to someone without the app" as its trigger, the join-link crawler preview being the precedent shape, and a security-chain change on its own. Founder: *"a"*.

## The frontier is empty

The shared understanding was restated after round 3 and confirmed by the founder's round-4 answer, with one substitution applied everywhere: "the Itinerary's audience, the owner's Profile Visibility" reads "every signed-in traveler, masked while the trip is archived". The model — an Itinerary is created from a Trip by publishing and is the thing every public surface reads, keyed by its own id; the trip's record is untouched and its workspace is fenced while a live Itinerary exists; retire, hard delete and republish behave as ADR-035 wrote them, republish refreshing `publishedAt`; archive hides the page; fork is an act on the Itinerary from its snapshot into a new Trip through a trip port. The cutover — no backfill, no fallback, the flag columns left dead. The modules — `publication` becomes `itinerary`; `discovery`, `feed` and `profile` compose with no table; `trip` never depends on `itinerary`; the diary half becomes legacy adapters inside `postcard`; photos stay in media. The shape — two small PRs ahead, then one story in two PRs with the new tests written before the old 39 die.

## What was written from this record

*(the spec is not part of this PR: it follows at `/to-spec`, typed by the founder once this record has been checked — the sequence in `docs/agents/story-workflow.md`)* · the glossary (the Itinerary, Publish, Fork and Fork Relationship rows amended) · ADR-037 (a dated amendment: the freeze stays, the audience is ADR-034's, the eight diary routes are an exception to the sunset, no backfill) · ADR-039 (decision 5: the port survives) · `08-object-contracts.md` (the publication rows corrected and widened, a by-trip read and a fork row added, the old-flow and legacy rows annotated) · the epic map (the CM-5 line annotated grilled; three lines minted: the old Trip Diary screens' cutover, the signed-out Itinerary page, the legacy link courtesy's end) · the BUILD_STATUS row. One docs-only PR, on the TW-1 precedent; the spec follows at `/to-spec` and the tickets at `/to-tickets`, each after the founder's check.
