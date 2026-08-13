# S4.3 — Discovery / browse feed

Status: ready-for-agent
Story id: S4.3 · Epic 4 (Social surface) · Grilled 2026-08-13 (two rounds + one micro-round, 19 founder rulings) · MVP dial per 06a/06b

**Design baseline (normative, except the recorded deviations below):** the Claude Design project `34e84995-d099-46dd-a784-3b762a09d6f4` —

- UI + behavior spec: `Discovery Spec.dc.html` — https://claude.ai/design/p/34e84995-d099-46dd-a784-3b762a09d6f4?file=Discovery+Spec.dc.html (live mock: landing, search mode, results, filter sheet; behavior cards 1–6; edge-case grid; consistency flags)
- Action one-pagers: `Action Specs.dc.html` — https://claude.ai/design/p/34e84995-d099-46dd-a784-3b762a09d6f4?file=Action+Specs.dc.html — **the Discover half only**; the Home half is the future engagement story's baseline, not this story's scope

## Problem Statement

A traveler can publish an itinerary, but nobody can find it. Today a published itinerary is reachable only by a direct link (the publish-success screen's Copy Link) or through a shared postcard's trip line — there is no browsing and no search anywhere in the app. The Discover tab has sat greyed since S4.13, refusing every tap. Publishing therefore shouts into a void: the owner has no in-app route back to their own published page, and a traveler looking for trip inspiration has nowhere to look. The social loop the product hypothesis depends on — plan, record, *share into a surface where strangers browse* — is missing its last leg.

## Solution

The Discover tab goes live as **Discovery** (the glossary term): the surface for browsing and searching published Itineraries. The landing offers two rails — Trending destinations (where people are publishing trips lately) and Recommended itineraries (recently published, cover-first) — above a search bar that opens a full-screen search mode with on-device recents and suggested searches. Searching or tapping a destination lands on a results list with a live count, a destination + duration filter sheet whose Apply button previews the outcome ("Show 23 itineraries"), and infinite scroll. Every card opens the existing published itinerary view. The feed shows **published + public, non-archived itineraries only** — the strangers' surface, identical for every signed-in traveler.

## User Stories

1. As a traveler, I want the Discover tab to open a real screen instead of refusing my tap, so that the app's promise of finding trips is finally kept.
2. As a traveler, I want a Trending destinations rail ranked by where trips were recently published, so that I can see where other travelers are actually going.
3. As a traveler, I want each trending destination card to show a real cover photo from that destination's itineraries, so that the rail feels like a window into real trips rather than stock chrome.
4. As a traveler, I want tapping a trending destination to show me that destination's itineraries, so that a spark of interest turns into concrete plans in one tap.
5. As a traveler, I want a Recommended itineraries rail of recently published trips with covers, so that fresh content greets me without my having to search.
6. As a traveler, I want the Recommended rail capped with a "See all" card, so that I can flow into the full browse list when the rail hooks me.
7. As a traveler, I want to swipe both rails with a peek of the next card and snapping (dots on the Recommended rail), so that the carousels advertise their own swipeability.
8. As a traveler, I want my carousel positions preserved when I switch tabs and return, so that the screen doesn't reset under me.
9. As a traveler, I want tapping the search bar to open a full-screen search mode with the keyboard up, so that searching feels immediate.
10. As a traveler, I want my recent searches remembered on this device — deduplicated, individually removable, clearable — so that repeat searches cost one tap.
11. As a traveler, I want suggested search chips in search mode, so that an empty query still gives me somewhere to go.
12. As a traveler, I want typed queries to suggest matching Destinations and Itineraries as I type, so that I can jump straight to what I meant.
13. As a traveler, I want submitting a search to show a results list with a count ("67 itineraries"), so that I know the search ran and how much there is.
14. As a traveler, I want results filterable by destination and duration through a sheet whose edits are a draft until I press Apply, so that fiddling with filters never half-applies.
15. As a traveler, I want the Apply button to preview the live result count as I adjust filters, so that I never commit into an empty screen.
16. As a traveler, I want a zero-count Apply to disable with "No exact matches", so that loosening a filter — not a dead end — is my next move.
17. As a traveler, I want a Reset control that appears only when my draft differs from defaults, so that recovering from over-filtering is one tap.
18. As a traveler, I want the filter button to show how many filter groups are active, so that I can see at a glance why the list is narrow.
19. As a traveler, I want results to load more as I approach the end (with skeleton cards while loading), so that browsing feels endless without pagination chrome.
20. As a traveler, I want a failed page-load to show an inline Retry row while my loaded results stay put, so that a network blip never wipes the list.
21. As a traveler, I want a failed search to keep the last good results visible under a retry banner, so that stale results beat a blank screen.
22. As a traveler, I want a no-results state that names my query and offers "Clear filters" (keeping the query), so that I'm never stranded on a blank list.
23. As a traveler, I want each card to show title, destination, day count, author handle and avatar, and cover, so that I can judge a trip at a glance.
24. As a traveler, I want tapping a card to open the published itinerary view, so that browsing connects to the full plan.
25. As a traveler, I want tapping an author to get the honest "profiles coming soon" refusal, so that a dead-looking control never silently ignores me.
26. As a traveler, I want the bookmark on cards to tell me honestly that saving isn't built yet, so that I'm not tricked into believing a save happened.
27. As a traveler, I want the results screen to be deep-linkable with the query and filters in the route, so that a shared search restores exactly what I saw.
28. As a traveler, I want a first-visit landing to show ghost cards while loading and cached content instantly on repeat visits, so that the screen feels alive rather than blank.
29. As a traveler on a bad connection, I want section-level failures to retry independently, so that one dead rail doesn't kill the whole landing.
30. As an itinerary owner, I want my trip to appear in Discovery the moment it is published and public, so that publishing has a visible payoff — and browsing back to my own page replaces the link I lost.
31. As an itinerary owner, I want republishing a trip to surface it as newly published again, so that returning content gets seen.
32. As the owner of a published-but-private trip, I want it absent from Discovery, so that visibility means what it says.
33. As the owner of an archived trip, I want it absent from Discovery regardless of its publish state, so that archive keeps dominating everything.
34. As a founder demoing the app, I want the stub rating and price on any given itinerary to be identical on every phone, session, and device, so that two founders comparing screens never see the product contradict itself.
35. As a traveler on day one, I want an honest empty state when nothing is published yet, so that an empty marketplace doesn't masquerade as a broken screen.
36. As a traveler using a screen reader, I want the tab, rails, cards, and sheet controls properly labeled, so that Discovery is navigable without sight.

## Implementation Decisions

1. **Feed scope — the strangers' surface.** The discovery read model admits exactly: `published = true` AND `visibility = public` AND workspace not archived. Enforced **in the query's WHERE clause, never post-read** — S4.22's feed filtered archived trips after the page read and needed a client workaround for empty-pages-with-a-cursor; discovery does not inherit that shape. Audience: any signed-in traveler (the published-projection pattern); identical results for every viewer. `published + private` trips are absent for everyone, owner included — Discover is not a "my trips" surface.
2. **New read surface, `/v1/discovery/*`, additive.** Five endpoints in the itinerary module, reading the published projection: a cursor-paginated **list** (`q`, `destination`, `duration`, cursor; default page 20, max 50), a **count** with identical filter semantics (the sheet's live preview), **trending destinations**, **recommended** (the landing rail), and **suggestions** (decision 5). Separate landing endpoints are deliberate: the one-pager requires section-level independent failure and retry. Pagination uses the established one-true-shape: opaque cursor over `(published_at DESC, id DESC)`, the feed's instant-cursor pattern.
3. **`published_at` — additive column, set on every publish.** Written each time the itinerary flips to published (republish bumps it — "what's newly visible" is the question the ordering answers); retained-but-unread on unpublish, overwritten on the next publish. Backfill for already-published rows: `completed_at` where present (publishing requires `completed`), else migration-time now. This is a data migration and therefore carries the migration-stepping IT obligation and the `test-compile` invocation discipline.
4. **Search: substring match, recency-ordered.** Case-insensitive substring (ILIKE) over title and destination strings; minimum 2 characters (server-validated), maximum 80; results ordered by `published_at` desc. **No relevance ranking** — "matching, newest first", revisited only if someone actually complains (recorded here, deliberately no backlog line). Client: 300ms debounce, latest-wins request sequencing, query saved to recents on submit only.
5. **Suggestions endpoint.** One endpoint takes the partial query and returns two groups — matching **Destinations** (distinct normalized destination strings from the published set) and **Itineraries** (title matches) — max 3 each, "See all" per group landing on the results screen. The **People** group is not built (public profiles don't exist).
6. **Trending destinations — a derived projection, never an entity.** GROUP BY normalized destination (trim + lowercase) over published+public itineraries whose `published_at` falls in the trailing 30 days, ranked by count. Counting *publishes*, never creations: private activity must not leak, even as a count. A legacy multi-destination row counts toward each of its entries. Display casing: the most recently published occurrence's original spelling. Card image: the destination's newest published cover, tinted-gradient fallback. Tap → the results screen pre-filtered to that destination — no separate destination page.
7. **Recommended — the curated rail whose real meaning is promoted placement.** V1 source: newest published itineraries that have a cover image, distinct authors, capped at 8, with a "See all" end card into the browse-all results. The label stays "Recommended" because the slot's long-term meaning is **promoted vendor placements** (epic-map line minted at this grilling) — a curated slot, not a personalization promise. Deliberately not interest-matched: interests stay reader-less until the tagging story supplies something to match against.
8. **Filter sheet: destination + duration only, draft-state model.** Destination is a single-select typeahead over the published destination set; duration is the four presets (1–3 / 4–7 / 8–14 / 15+ days) mapped over the projection's day count. Sheet edits mutate a draft; Apply commits and closes; any dismissal (scrim, drag, back) discards the draft — no silent partial application. Live count via the count endpoint, debounced; if the count can't load, the button falls back to "Show results" with no in-sheet error. Zero-count Apply: disabled, reading "No exact matches". Reset renders only when the draft differs from defaults and needs Apply to commit. Filter-button badge = count of non-default filter groups.
9. **No category chips, no trip-type filter.** Both need per-itinerary data that doesn't exist; they arrive together with their data writer in the tagging follow-up story (chips row, trip-type multi-select, publish-flow inputs, and the interests reader — one coherent story, epic-map line minted). The results header keeps the filter button and count line; the chips row's absence is a recorded mock deviation.
10. **Sort: newest only.** The mock's Top rated / Price sorts have nothing real to rank by (no ratings server-side; price is a client-side stub). The sort control is omitted until a second real sort exists; ordering is `published_at` desc. Recorded deviation.
11. **Cards.** Title (1 line, ellipsized), "destination · N days" meta, author handle + avatar, cover image with tinted-gradient fallback (cards never collapse on failed loads), **stub rating and stub price rendered exactly as the profile's showcase cards render them** — price pill with the "/ person" suffix included (founder-ruled profile parity; see 12), bookmark chip. Card tap → the existing published itinerary view. Author tap → the existing coming-soon profile refusal (no route to another traveler's profile exists; Discovery mirrors the feed). Bookmark tap → the existing coming-soon "saved" refusal with its analytics — the same stub the feed's "Save to trip ideas" action uses; the real Trip Ideas collection is a minted backlog story.
12. **Stub metrics go deterministic.** Founder-ruled: rating and price stay random stubs (profile-page consistency), but the stub module switches from per-session randomness to **seeding by subject id** — the same itinerary shows the same fake numbers on every device, session, and viewer, killing the two-phones-disagree tell. Still behind the module's single kill-switch; the profile and feed inherit the determinism. The epic-map stubs-must-die line gains discovery cards to its inventory: these numbers are now visible to strangers, and S4.4/S4.5 (or the kill-switch) are what retire them.
13. **Tokens: the app-wide set.** Discovery consumes the existing app-wide tokens (terracotta accent, ADR-016). The mock's `#FF5A3C` is not adopted (the mock itself flags the accent question; same call the Home spec made). No third token set is minted — the token-convergence backlog line must not grow.
14. **Recents and suggested searches are client-local.** Recents: strings only (never ids — a stale recent still runs as a plain query), cap 8, deduplicated, removable, clearable, saved on submit only. The "trending searches" chips render the trending destinations' names — same data as the rail, zero new backend; real query-derived trending rides with any future search-analytics story.
15. **Client data access through a typed repository** (ADR-001): a discovery repository + infinite query mirroring the feed's, including the null-cursor coercion the wire demands (`nextCursor ?? undefined` — the S3.1 gotcha).
16. **Deep-linkable results.** The results screen carries query + filters in route params, so shared searches restore exact state.
17. **Empty and error states.** A landing section with no rows hides itself; both sections empty → one full-screen honest empty state with search still reachable. No-results keeps the query and offers Clear filters. Search failure keeps last good results under a thin retry banner; pagination failure is an inline Retry row; section failures on the landing retry independently.
18. **Offline: read-side caching only.** Repeat visits render cached content instantly and refresh quietly (the query cache — free). The one-pager's offline write-queue and "Showing saved content" banner are **cut from v1** (backlog line minted); with bookmarks stubbed there is nothing to queue anyway.
19. **Carousels reuse the feed's modules.** The dot-window math and paging behavior already live in the feed's carousel module; Discovery consumes them rather than minting a third implementation. The S4.22 carousel-unification backlog line stays a separate sweep — this story adds no new copy of the shared three functions.
20. **Keyboard edges per the mock:** suggestion list scrolls under the keyboard inset; tapping a result dismisses the keyboard first so ghost taps can't fire.

## Testing Decisions

A good test asserts **external behavior at the highest seam available** — what the endpoint returns, what the screen does — never internals. Four seams, all existing (confirmed with the owner at spec time):

1. **Backend HTTP integration tests** (real Spring context + Testcontainers Postgres, the failsafe suite — prior art: the postcard-feed and published-itinerary ITs). The load-bearing cases: the exclusion proofs (a published+private trip, an unpublished trip, and an archived published trip are each provably absent from list, count, trending, and suggestions); the signed-in guard (anonymous → 401 envelope); cursor pagination walked to exhaustion (no empty-page-with-cursor possible); filter correctness for `q`/destination/duration singly and combined; **list and count agreeing under identical filters** (the sheet's promise — worth its own test); `published_at` written on publish and bumped on republish; trending's 30-day window, publish-only counting, and case/whitespace normalization; recommended's cover-required + distinct-author constraints.
2. **The migration-stepping IT** for the `published_at` backfill (prior art: the workspace backfill IT): own container, Flyway to n−1, legacy rows seeded via raw SQL (published with `completed_at`, published without, unpublished), migrate to n, assert the backfill and the now-fallback — then sabotage the SQL once under `test-compile` to prove the test can fail.
3. **Mobile pure-module Jest tests** (prior art: the drag-math, carousel, and like-state modules): the filter-sheet draft model (edit/apply/discard/reset, badge counting, zero-count disable), search gating (min-chars, debounce contract, latest-wins sequencing), the recents store (strings-only, cap, dedupe, submit-only writes), duration-preset mapping, and stub determinism (same id → same numbers across module reloads; the kill-switch still nulls everything).
4. **The walk rungs** for the story gate: a new web-preview discovery walk (landing sections render with data, search mode opens, a query reaches results, the sheet applies with a live count, stub taps print their refusal wording) added to the smoke runner and recorded in the web-walk flow inventory so the Playwright port inherits it; plus the emulator walk. Standing rule: all three rungs before the promotion proposal, scaled to work stage while iterating.

## Out of Scope

- **Tagging** — category chips, trip-type filter, publish-flow tag inputs, and the interests reader: one follow-up story (backlog line minted).
- **People search** — waits for the public-profile story.
- **Trip Ideas / real bookmarking** — backlog story; this story ships only the honest stub.
- **Real ratings and reviews** (S4.4/S4.5), and with them the Top rated / Price sorts and the mock's "New"-tag display rule (reviewCount < 3), which needs a review count to read.
- **Offline write-queue and the cached-content banner** — backlog.
- **Home-feed engagement activation** (like/save/share for real) — its own story; baseline already named.
- **Relevance-ranked search** — recorded as declined-until-complaint, deliberately not even a backlog line.
- **Promoted vendor slots** in Recommended — backlog; v1 ships the editorial default.
- **Per-person cost semantics** — stays parked (the stub price is a placeholder, not a semantics decision).
- **The unpublished-trip teaser projection** — stays parked; Discovery links only published pages, so the line's trigger doesn't fire here.
- **Place Search** — Discovery never means finding places (glossary); register #9 unaffected.

## Further Notes

**Candidate-capability note (standing rule):** *promoted placement in the Recommended rail* — a capability, footprint-growing, not governance; the natural first buyer of the entitlement seam's vendor-facing side.

**Recorded deviations from the design baseline** (each founder-ruled at the grilling): chips row + trip-type filter absent (tagging story) · People suggestions group absent (profiles story) · sort control absent, Newest is the order (S4.5 reactivates) · rating rendered as deterministic stub, the "New"-tag rule deferred (S4.5) · price rendered as deterministic stub in the profile's pill shape — the "/ person" suffix ships (profile parity), only the "Free itinerary" null-rule waits for real price semantics · accent = terracotta tokens, not `#FF5A3C` · bookmark is an honest stub · offline write-queue + "Showing saved content" banner cut. The mock's self-flagged unifications (one search placeholder, "Trips" tab label) are adopted as drawn.

**Epic-map obligations discharged by this spec:** five backlog lines minted (tagging story · Trip Ideas · offline write-queue · promoted vendor slots · Home-feed engagement activation with `Action Specs.dc.html`'s Home half as baseline) · the stubs-must-die line amended (+discovery cards) · the owner-route-back line discharged (browse reachability; the workspace CTA stays unbuilt) · per-person cost and unpublished-teaser lines untouched and parked.

**Glossary entries — drafted, reviewed, and PARKED; the domain model is unchanged by this story** *(founder call, 2026-08-14 at the gate: "put it in the backlog, we'll decide later")*. The three were held from mid-grilling per the owner's interrupt, presented for review at the gate, and deferred rather than ratified — **Trending Destinations**, **Recommended (Discover)**, **Trip Ideas**. The drafts and the argument for each (including why *Recommended* is the one that earned the park: it writes a monetisation intent into the ubiquitous language) live on the epic map's backlog line, "Three S4.3 glossary entries, drafted and parked rather than ratified". Nothing load-bearing lives only in a conversation; nothing was applied to `02-domain-model.md`.

**Incidental cleanup:** the feed screen carries a multi-line code comment (the empty-page pull-through explanation) — a standing-rule violation. If this story touches that file, remove it; otherwise it's an off-epic ledger line.

**Day-one content:** the founder populates rungs by seeding/migrating mock data and expects alpha onboarding to populate prod; the empty states above are the honest fallback, not the plan.
