# S4.22 — Home feed: public postcards

**Status:** specced — awaiting owner review *(flips to ready-for-agent at the owner's pass — the S4.19/S4.20 precedent)* · **Epic:** E4 · **Depends on:** S3.1 (shipped — the postcard model this story widens), S3.4 (shipped — dump-photo provenance, which the consent rule reads), S4.21 (shipped — the stub-metrics pattern and kill-switch this story reuses), S4.13 (shipped — the four-tab bar whose Home stub this story fills)

**Immutable point-in-time intent** (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** **ADR-025** (this story's decision record — the shared postcard; INV-2a amended, the absence rule re-grounded) · ADR-024 (the postcard model this builds on) · ADR-019/020 (the three axes — read, never moved: trip publish/lifecycle stay untouched) · ADR-008 (all additive, no waiver) · Artifact 03 (guard; the feed read follows the S4.1 guard-bypass projection pattern) · INV-2's absence rule (honoured by reasoning, not exemption — ADR-025 decision 6) · register #13 / S4.2 (re-pointed again) · **Design baseline: the Claude Design project** — `https://claude.ai/design/p/34e84995-d099-46dd-a784-3b762a09d6f4?file=Home+Feed+Spec.dc.html` (project `34e84995-d099-46dd-a784-3b762a09d6f4`, file `Home Feed Spec.dc.html`; readable via the claude_design MCP, auth via /design-login). The mock is live — its six behavior cards are part of the baseline, not illustration. The `uploads/home.txt` Figma export in the same project is the static original; where the two differ, the interactive mock's own "UI changes" card records the deltas and this spec's deviations section records ours.

## The pull, on the record

The founder opened the session asking for **"the home page button"** — the dead Home stub becoming real, fed by public diary entries. The grilling (grill-with-docs, 2026-08-12, two rounds plus two re-asks) surfaced that the mock quietly assumes four subsystems that do not exist (likes, comments, saves, a follow graph) and collides with canon's parked trajectory for diary publicness (S4.2's *published diaries on published itineraries* — which, under the `completed` publish gate, could never show a live trip). The founder ruled: **build the whole mock's surface and behaviors now, stub the engagement backends the S4.21 way, and mint the publicness primitive as per-entry opt-in sharing, independent of trip publish** — ADR-025. S4.2 re-points again; the feed's follow-based empty-state copy deviates until the friend graph exists.

## Problem Statement

A traveler's postcards are locked to their author — deliberately (ADR-024) — so the app has nothing to show a traveler who isn't currently planning or living a trip. The Home tab is a dead "coming soon" stub, the app opens into a utility surface (Trips), and there is no way to see what other travelers are doing, no reason to return daily, and no loop from *seeing* a trip to *wanting* one. Meanwhile a traveler who wants to show a postcard to the world has no act that does it.

## Solution

A traveler can **share** any of their postcards to the public feed — a deliberate, per-postcard, reversible act, off by default. The Home tab becomes that feed: a global, newest-first stream of every shared postcard, visible to any signed-in traveler, rendered as the mock's cards — author, trip context, photo carousel, activity tag, caption — with the trip line linking through to the published itinerary once it exists. The app opens on Home. Engagement chrome (hearts, comments, share/save, search, bell) renders per the mock with stubbed numbers behind the S4.21 kill-switch; taps without a backend say so honestly.

## User Stories

1. As a traveler, I want to share a postcard publicly when I post it, so that people beyond my trip can see the moment while it's fresh.
2. As a traveler, I want sharing to be off by default, so that my diary stays the private record ADR-024 promised unless I deliberately act.
3. As a traveler, I want to share an old postcard from my diary after the fact, so that memories I already captured can reach the feed.
4. As a traveler, I want to unshare a postcard at any time, so that a privacy decision is reversible and mistakes can be pulled back.
5. As a traveler, I want the composer to say plainly who will see my postcard when the share toggle is on, so that the author-only promise and the public act never blur.
6. As a traveler on an ongoing trip, I want my shared postcard to appear in the feed now, so that the feed reflects trips as they are lived, not only archives.
7. As a signed-in traveler, I want Home to open on a feed of shared postcards, so that the app has something for me even when I have no trip of my own.
8. As a feed reader, I want newest-shared-first ordering with infinite scroll, so that fresh content is always at the top and history is one flick away.
9. As a feed reader, I want to swipe through a postcard's photos with dots and a counter, so that multi-photo postcards are browsable in place.
10. As a feed reader, I want to double-tap a photo to like it (with the heart burst, never un-liking), and tap the heart to toggle, so that reacting feels the way every feed I know feels.
11. As a feed reader, I want to expand a clamped caption in place, so that reading more never navigates me away from the feed.
12. As a feed reader, I want to tap the trip line on a published trip's postcard and land on that published itinerary, so that a moment I like leads me to the plan behind it.
13. As a feed reader, I want pull-to-refresh and a "New posts" pill when fresh content arrives, so that I control when the feed moves and it never yanks under me.
14. As a feed reader, I want the header to hide as I scroll down and return as I scroll up, so that the feed uses the whole screen while reading.
15. As a feed reader, I want re-tapping the Home tab to scroll me to the top (and refresh if already there), so that getting back to the newest is one tap.
16. As a feed reader, I want skeleton cards while the next page loads and an inline retry when it fails, so that loading and failure never take over the screen.
17. As a feed reader, I want a clear end-of-feed state, so that I know I'm caught up rather than watching a spinner forever.
18. As a feed reader returning from a detour, I want my scroll position restored, so that the feed doesn't restart on every navigation.
19. As a co-traveler, I want it understood that photos I dump may live on in others' postcards, shared ones included, so that contributing to the pool is an informed act rather than a surprise.
20. As a co-traveler on a shared trip, I want no public surface to identify me — no roster, no names but the author's — so that another member's sharing choice exposes them, not me.
21. As a postcard author, I want deleting an entry to remove it from the feed with it, so that delete means gone everywhere.
22. As a founder, I want the engagement chrome visible with plausible stubbed numbers behind the existing kill-switch, so that the surface demos as designed before its backends exist.
23. As a founder, I want every backendless control to say "not implemented yet" when tapped, on web and device alike, so that nothing on this surface is a silent dead click.

## Implementation Decisions *(locked at the grilling, founder-ruled 2026-08-12, in grilling order)*

### 1 · The shared postcard *(ADR-025)*

A diary entry gains one per-entry state: **shared** (with the instant it was shared). Default private; **the share is the author's sole act** (INV-2a amended), off by default at the composer. Unshare exists and is symmetric: the entry leaves the feed on the next fetch, masked to not-found for non-authors again — hidden, never tombstoned. Deleting a shared entry removes it from the feed as part of the existing delete. Everything ADR-024 ruled about unshared entries is untouched.

### 2 · Dump photos ride along — the consent must-answer, discharged by the dump's purpose

*(Ruled "own photos only" at the grilling, **reversed by the founder at spec review the same day, on the record**: "photo dumps on an itinerary … [are] only shared to the collaborators so they can reference a post to add to their diary" — and the t1/t2 public-share case was put to the founder explicitly before the reversal.)* Contributing a photo to the trip's Photo Dump consents to co-travelers using it in their postcards, **shared postcards included** — the dump exists so members build their diaries from it, and the entry's copy belongs to the entry's author outright (S3.1's copy semantics, unchanged). Sharing therefore reads **nothing** about a photo's origin: no provenance column, no refusal, no consent machinery. The dump surface itself stays member-only, untouched. Two costs accepted knowingly: **tightening this later cannot be done quietly** (a stricter rule retro-blocks postcards already shared — a new ADR and a migration story); and **a contributor's control ends at the copy** — deleting from the dump reaches nothing already referenced, so a contributor who regrets a photo's public life has the moderation/report line as their only recourse (which is part of why that backlog line is marked pull-on-first-incident).

### 3 · Independent of trip publish and lifecycle — the feed shows live trips

Sharing is legal from the moment the entry exists (entries already require `ongoing`/`completed` — S3.1 decision 5). The trip's `published`/`visibility`/lifecycle axes are read, never moved. The card exposes: author identity (name, avatar), **trip name**, snapshot day label, snapshot activity title, caption, the entry's photos, and time-since-shared — never the roster, absolute dates, lifecycle state, or any plan content. The trip-context line and activity tag are **tinted, navigable affordances only when the trip is published** (they land on the published itinerary / its day); on an unpublished trip they render as plain un-tinted text — a recorded mock deviation that self-heals the moment the trip publishes.

**The absence rule, re-grounded rather than excepted** (ADR-025 decision 6): INV-2 forbids the *plan's projection* from revealing absence because that exposure is involuntary. A shared postcard is the author's own deliberate broadcast, and the only person it identifies is its consenting author — no public surface carries the roster, so co-travelers stay unidentifiable. Recency ("2h") is therefore legal on the shared postcard while remaining forbidden on the published itinerary.

### 4 · Audience: any signed-in traveler, via the guard-bypass projection pattern

The feed read and the shared-entry read follow the S4.1 pattern — public reads bypass the membership guard into a rule-scrubbed projection, with an `admits()`-family visibility check on the object. The diary-entry media audience widens conditionally: photos of a **shared** entry serve to any authenticated traveler; photos of unshared entries stay author-only. Unauthenticated web stays exactly where it was — the backlogged web read-only surface; nothing here weakens the everything-requires-auth posture.

### 5 · The feed: global firehose, shared-time order, cursor-paged

One global stream of all shared postcards, ordered by shared-time descending (retro-sharing an old entry surfaces it at the top — the point of retro-sharing), keyed for a stable cursor, in the standard `{items, nextCursor}` shape. The card's timestamp is time-since-shared. No follow graph, no per-viewer filtering — when the friend graph ships it narrows `public` per the standing backlog line, and the feed narrows with it.

### 6 · Share/unshare affordances

A **"Share to feed" toggle in the composer** (default OFF) and a **share/unshare action on the entry in My Diary** — both places, so the feed can be seeded from existing diaries and mistakes pulled back. S3.1's composer info note — *"Only you can see your diary. It shows up on your profile."* — becomes state-aware: with the toggle on, it must say the postcard goes public, or the pinned copy ships as a lie beside the control that breaks it. Final wording at implementation, founder veto on sight (the empty-state precedent).

### 7 · Home becomes the front door

The Home stub becomes the feed screen and **Home becomes the landing route**; Trips keeps its tab and surfaces but its index leaves "/" — every harness or deep link that reaches Trips by the root path re-points (route groups keep all other URLs stable, the S4.13 property). Discover stays greyed until S4.3. Tab re-tap: scrolled → smooth scroll to top; at top → refresh.

### 8 · The whole mock ships, with the S4.21 stub boundary

All six behavior cards are implemented as specced in the design file: paged carousel (directional lock, rubber-band ends, dots with the >5 sliding window, fading n/N counter, per-card index memory, ±1 preload) · double-tap like (burst, haptic, idempotent — never unlikes; single tap deliberately a no-op) · optimistic heart toggle with count animation and compact formatting · hide-on-scroll header · pull-to-refresh, infinite scroll with two skeleton cards, inline retry row, terminal card · the ~60s new-posts poll and pill (a real poll of the first page — never yanks scroll; tap = scroll to top + prepend) · caption 2-line clamp with inline "more" · every icon target padded to ≥44px.

**Stubbed, behind the same kill-switch as S4.21's profile metrics:** like and comment **counts** (random). **Stubbed as an honest refusal (the platform-forked alert — web `Alert` is a no-op, the S1.3 trap):** comment, the share icon, save, the long-press sheet (Save to trip ideas / Share / Report), avatar/name tap (no other-traveler profile surface exists yet), header search, the notifications bell. The heart itself toggles locally over the random base (real optimism, no backend). Nothing on the surface dead-clicks silently.

### 9 · Tokens win over the mock's palette

The feed renders in the app's tokens (terracotta accent, token typography) — the mock's `#FF5A3C`/Figtree is the drift its own reconciliation card warns about, and an app-wide retheme is not this story. Layout, spacing, iconography, and behavior copy the mock exactly.

## Wire changes *(all additive — no ADR-008 waiver needed)*

- Share entry · unshare entry — author-only acts on the existing entry resource, both fenced by archive like every diary write; the share reads nothing about photo origin (decision 2).
- The public feed read — cursor-paged, any authenticated traveler, serving the scrubbed card projection.
- The diary-entry media audience admits any authenticated traveler **for shared entries only**; unshared entries unchanged (author-only).
- Register-#2 analytics events for share, unshare, and the stubbed-tap refusals.

## Candidate-capability note *(ADR-009)*

**Share a postcard to the public feed** — a capability act, footprint-growing (public exposure, feed row), not governance. Joins the accumulating register #14 wiring map.

## Deviations from the mock *(all deliberate, per the fidelity rule — deviate only where forced, and say so)*

- **Accent + typography**: app tokens, not `#FF5A3C`/Figtree (decision 9 — the mock's own drift warning).
- **Empty/terminal-state copy loses the follow language** ("Follow more travelers…") — no follow graph exists; the copy speaks to sharing instead (final wording at implementation, founder can veto on sight).
- **Trip line and activity tag un-tinted and non-navigable on unpublished trips** (decision 3) — the published itinerary they'd land on doesn't exist yet; self-heals at publish.
- **Engagement counts are stubs and backendless taps refuse honestly** (decision 8) — the mock's numbers imply backends that are later stories.
- **iOS status-bar furniture in the mock frame** (9:41, battery) is the frame, not the product — platform chrome stays native.

## Acceptance criteria

1. A traveler posts a postcard with "Share to feed" on; a **different, non-member traveler** sees it at the top of Home — web preview and emulator both, photos arriving bearer-authenticated (the S3.3 tell watched in the driver).
2. Retro-share: sharing an old entry from My Diary surfaces it at the feed's top, ordered by shared-time not posted-time (IT).
3. Sharing an entry that contains a co-traveler's dump photo **succeeds** — the implied-consent ruling pinned as a test, so any future tightening must announce itself by breaking it (IT).
4. Unshare: the entry leaves the feed, and a non-author's direct entry read and media GET mask to not-found again (IT — the discriminating pair).
5. Mid-trip: a shared postcard from an `ongoing`, unpublished trip renders with trip name + day label, trip line un-tinted and inert; after the trip publishes, the same card's trip line navigates to the published itinerary (walk).
6. The feed projection carries no roster, no absolute dates, no lifecycle state (IT asserting absence, the INV-2 discipline).
7. Cursor: pages walk to exhaustion ending in the terminal card, `nextCursor` null handled (`??`, never `!==` — the S3.1 lesson), no repeat-cursor spin (walk + IT).
8. Carousel on the **real-touch rung** (emulator browser, port 8083, and the native walk): paged swipe with directional lock, dots + fading counter, no wrap-around; per-card index survives recycling (walk).
9. Double-tap bursts and likes, never unlikes; the heart toggles optimistically over the stubbed count; counts format compactly past 999 (Jest on the pure modules + walk).
10. Every stubbed control — comment, share, save, long-press sheet, avatar, search, bell — refuses visibly on **web and device** (the forked alert helper; the web walk intercepts `window.alert` and prints the wording).
11. Cold start lands on Home; Home re-tap scrolls to top, and at top refreshes; header hides on downward scroll and returns on upward (walk).
12. The new-posts pill appears while scrolled down when fresh posts exist, prepends on tap without ever moving scroll uninvited; pull-to-refresh prepends and toasts "caught up" when nothing is new (walk).
13. Deleting a shared entry removes it from the feed (IT).
14. Kill-switch off: engagement numbers vanish cleanly, layout intact (walk).
15. Register-#2 events emit for share, unshare, and stubbed-tap refusals.

### The mock's behaviors, one criterion each *(amended 2026-08-13, founder — "I think those should be ACs")*

**Why these are separate.** ACs 8, 9 and 12 above each bundled several independent behaviors behind an `and`, and decision 8 compressed all six behavior cards into a paragraph. Two defects reached the founder's screen straight through that gap: the caption's inline "more" had **no criterion at all** and rendered unconditionally, and the burst was bundled with the like — so the like passing carried the burst unexamined on the web rung. One claim per line, from here. The full audit, including what verifies each today, is `behavior-coverage.md` beside this file.

**B1 · Photo carousel**
- B1.1 Horizontal paged swipe, one photo per page, on the real-touch rung.
- B1.2 Directional lock: the first ~10px decides the axis; a horizontal drag never scrolls the feed.
- B1.3 The ends rubber-band and the overscroll does not chain to the feed.
- B1.4 No wrap-around at either end.
- B1.5 Dots are always visible on a multi-photo card.
- B1.6 Past five photos the dot window slides, edge dots shrink, and the active page is always inside it.
- B1.7 The n/N counter appears on swipe…
- B1.8 …and fades after ~1.5s idle.
- B1.9 Only the current photo and its neighbours load.
- B1.10 A card's page index survives being scrolled off-screen and back.

**B2 · Double-tap to like**
- B2.1 Double-tapping the photo likes it.
- B2.2 The white heart burst is drawn over the photo.
- B2.3 *(deviation)* The burst draws and fades but not on the mock's spring/hold/fade profile.
- B2.4 A light haptic fires on trigger (native only; no harness can observe it).
- B2.5 Idempotent: a second double-tap replays the burst and never unlikes.
- B2.6 A single tap on the photo does nothing.
- B2.7 A press that moves more than 10px is a swipe, not a tap.

**B3 · Like / engagement row**
- B3.1 The heart toggles optimistically, fill and count changing instantly.
- B3.2 The heart pops 1 → 1.3 → 1 on toggle.
- B3.3 *(deviation)* The count changes by one but does not tween — see Comments.
- B3.4 Counts compact past 999 ("1.2k").
- B3.5 *(deviation)* Comment, share and save refuse honestly; their backends are later stories.
- B3.6 Every icon target is at least 44×44 including hit-slop.

**B4 · Feed scrolling & header**
- B4.1 The header hides after 24px of downward scroll…
- B4.2 …and returns on any upward scroll, without flapping on jitter.
- B4.3 The status-bar area stays opaque.
- B4.4 Pull-to-refresh is tinted terracotta *(device rung only — RefreshControl is not drivable headless)*.
- B4.5 *(deviation)* Refresh refetches rather than prepending; the observable result matches.
- B4.6 "You're caught up" appears only when the refresh found nothing new.
- B4.7 Re-tapping Home while scrolled scrolls smoothly to the top.
- B4.8 Re-tapping Home at the top refreshes instead.
- B4.9 The scroll offset is restored on return from a detour.

**B5 · Pagination & fresh content**
- B5.1 Cursor pagination walks to exhaustion without repeating a cursor.
- B5.2 The next page is fetched about three cards from the end.
- B5.3 Two skeleton cards render while a page loads.
- B5.4 The terminal card ends the feed; no spinner loop.
- B5.5 A page failure shows the inline retry row, never a full-screen error.
- B5.6 The poll runs about every 60s while the screen is mounted.
- B5.7 The pill appears below the header when fresh posts exist and the traveler is scrolled down.
- B5.8 Tapping it goes to the top with the fresh postcard first.
- B5.9 Scroll never moves without the traveler asking.

**B6 · Tap targets & navigation**
- B6.1 Avatar and name reach the traveler profile (stubbed — refuses honestly).
- B6.2 The trip line reaches the published itinerary once the trip is published, and is inert before.
- B6.3 *(deviation)* The trip line lands on the trip, not its day; the Trip Post badge is not a tap target.
- B6.4 The location pin shows the activity's **place** and is hidden when there is none.
- B6.5 *(deviation)* The pin lands on the trip, not the activity.
- B6.6 The caption clamps at two lines and offers "more" **only when it actually overflows**.
- B6.7 "more" expands in place — the card grows and nothing navigates.
- B6.8 Long-pressing the photo opens the sheet: Save to trip ideas · Share · Report, each refusing by its own name.

## Testing Decisions *(the seams — highest existing ones, one new pure module; confirm at owner review)*

A good test here asserts **external behavior at the wire or the screen**, never implementation: what a non-member can and cannot read is the load-bearing check, and the pair with distinguishable outcomes (shared serves / unshared masks) is the one that proves the audience rather than decorating it.

- **Backend, HTTP seam** (`PostgresTestBase` + `RestTestClient`, the standing families): the share/unshare acts under the guard (author-only, archive-fenced) · the implied-consent pin (a share containing a co-traveler's dump photo succeeds — AC 3) · the feed read as a *non-member* (the S4.1 guard-bypass projection family) · the media-audience pair (stranger reads a shared entry's photo; 404s an unshared one — the S3.1 media-audience IT family, widened) · cursor walk with the repeat-cursor guard · projection absence assertions (INV-2 discipline) · delete/unshare removal from the feed.
- **Mobile, pure modules first** (the `landingSlot.ts` precedent — extract the math, keep reanimated out of Jest): carousel index/dot-window math (the >5 sliding window, the `Math.round(-0.5)` family of asymmetries), header hide/show reducer, count compaction, relative shared-time formatting, the stub-map gate. Component tests per the existing feed-adjacent families; `nextCursor` handed to react-query (`null` = exhausted, the infinite-query precedent).
- **Walks, entered through the real affordance** (the S4.18 lesson): the web driver against the preview container — feed, share/unshare round trip, alert-stub wording printed, ANON-vs-bearer request list watched; carousel dragged via in-page PointerEvents with the `PAGING` fork respected (the S4.21 lessons); the emulator walk closing AC 1/5/8 end-to-end with screenshot-before-tap discipline. The four standing rungs; **no new backend or driver seams** — the one new seam is the pure feed-math module, proposed because the carousel/header math is exactly the kind reanimated makes untestable in place.

## Out of Scope

Real likes, comments, saves/bookmarks, notifications, search — each its own story with its own backend · the post-detail screen · other-traveler profiles (the profiles story) · the follow graph (backlog §106 — it narrows `public` when it arrives) · Discover (S4.3) · diary-level publish + Highlights (S4.2, re-pointed) · moderation/report backend (backlog line minted by this story) · unauthenticated web (backlogged) · the unpublished-trip "teaser" projection (backlog line minted by this story) · an app-wide retheme to the mock's palette · any entitlement code (ADR-009).

## Further Notes

- **The design project must be re-imported in any future context window** working this story: project `34e84995-d099-46dd-a784-3b762a09d6f4`, file `Home Feed Spec.dc.html` (the live behaviors are normative; `support.js` is runtime, not design).
- **S4.2's register entry re-points again** (this story's ADR-025 carries it): per-entry sharing is the primitive; diary-level publish, if S4.2 still wants it, becomes sugar over it ("share all"), and Highlights consumes shared entries.
- **Moderation is now a real gap on a real surface** — the mock's long-press Report is stubbed, and this is the app's first strangers-see-strangers content. It is also the *contributor's* only recourse: control of a dumped photo ends at the copy (decision 2), so a member who regrets a photo's public life has Report and nothing else. The backlog line is marked pull-on-first-incident.
- **The Photo Dump surface should say, at its next touch, that dumped photos may appear in co-travelers' postcards, shared ones included** — one info line keeping the implied-consent ruling honest at the point of contribution. Not this story's scope; noted for whichever story next touches the dump.
- The new-posts poll is real but cheap (first page refetch, ~60s, only while the screen is focused); it is not a notifications system.

## Comments

**2026-08-12, at implementation — the navigable trip reference is stricter than ticket 02 says, deliberately.** The ticket reads "only when the trip is published"; the code requires **published AND publicly visible AND not archived**. The feed projection is viewer-independent — one row, served identically to every reader — so a link on a `published + private` trip (a legal combination since ADR-019) would send every stranger to a 404, and an archived trip is owner-only under S1.9's ladder. Both narrow to the same rule: *offer the link only where every reader of this card can follow it*. Recorded rather than changed; the un-tinted inert line is the correct rendering in all three cases, and it self-heals identically.

**2026-08-12 — two copy strings shipped for founder veto on sight** (decision 6 and the empty-state precedent). Composer note with the toggle ON: *"This postcard goes to the Home feed, where any Largata traveler can see it. You can unshare it any time."* Terminal card, replacing the mock's follow language: *"You're all caught up"* / *"Share a postcard from your own trip to add to the feed."*

**2026-08-12 — one state added beyond the mock: a load-failure card.** The mock specifies an inline retry row for *page* failures only. With the first page failing and zero cards, the screen would otherwise render "Nothing shared yet" — asserting an emptiness it cannot know, which on bad connectivity reads as a lie about other travelers rather than about the network. The empty state now shows only when the feed genuinely loaded empty; a failed load says so and offers a retry.

**2026-08-12 — two bugs the gate caught that no unit test could.** The new-posts poll was armed in an effect keyed on the shown entry ids, so every refresh, heart tap and page merge restarted its 60-second timer: it worked on an idle feed and never fired once on a feed being read. And a null `activityId` reached `findById` and 500ed rather than answering not-found — reached by a walk that tried to add an activity to a frozen published trip and did not check the refusal. Both are fixed and pinned; both were only observable by running the thing.

**2026-08-12 — decision 3's activity tag ships as an affordance, but lands on the trip, not the day.** The decision reads *"the trip-context line **and activity tag** are tinted, navigable affordances only when the trip is published (they land on the published itinerary **/ its day**)"*. Both halves now tint and navigate together, and both render inert on an unpublished trip. What is **not** built is the day anchor: `PublishedItineraryScreen` has no scroll-to-day mechanism at all, so "its day" would mean adding one — a new capability on a surface this story otherwise only reads. The tag therefore lands where the trip line lands. Recorded as a gap rather than left silent; whichever story next touches the published surface can close it, and the wire needs no change until then (the day reference would be additive).

**2026-08-13 — the behavior cards become acceptance criteria, and three findings from doing it.** The founder's call on the running build: *"I think those should be ACs. I'm seeing some inconsistencies within the behavior."* Correct, and two defects had already reached their screen through exactly that gap — the caption's inline "more" had no criterion and rendered unconditionally, and the burst was bundled into AC 9 with the like, so the like passing carried the burst unexamined on web. The 41 behaviors are now numbered criteria above (B1–B6), one claim per line. The audit that produced them, including what verifies each today, is `behavior-coverage.md`.

Three things the audit found that the story had counted as done:

- **B1.3 rubber-band ends** — the mock's `overscroll-behavior-x: contain` was simply absent from the strip. Fixed; the horizontal overscroll no longer chains outward.
- **B5.2 "fetch three cards from the end"** — shipped as `onEndReachedThreshold: 0.3`, and RN's own source states the units are *visible list length*, so 0.3 was about **one** card at this card height, not three. The threshold is now derived from the measured card and viewport, so the mock's number means what it says.
- **B3.3 count animates ±1** — **deviation, recorded rather than built.** The count changes correctly and compacts correctly; nothing tweens between the two values. The number it would animate is `stubLikeCountFor`'s random draw, so a tween would be motion over invented data. The story that gives likes a backend inherits this line.

Also corrected here, because the first verbal summary of this audit was wrong twice and that is the reason it got written down: the **hit areas are fine** (54px, not the 42px first reported — `hitSlop` stacks on the control's own padding), and **preload, haptic and single-tap are built**, merely untested, which is a smaller debt than absent. Tests now cover the four source-only behaviors where a silent regression would reach a traveler: per-card page memory, the single-tap no-op, the page-failure retry row, and expand-in-place.

**2026-08-13 — the trip line and the pin keep their colour whatever the trip's state. Decision 3's un-tinting is REVERSED on the record** *(founder: "we are losing the colors of the header subtitle, and the location… when a trip is finished or not, it doesn't have to signal anything")*. Decision 3 said the trip line and activity tag render "plain un-tinted text" on an unpublished trip, tinting only once the link exists. Built that way, the tint was keyed on `publishedItineraryId`, which is non-null only when the trip is **published** — and publishing requires `completed` (ADR-019's gate). So the colour had quietly become a **lifecycle indicator**: terracotta meant "this trip is over", grey meant "still running". Nobody designed that; it fell out of tying a visual to a field that carries more meaning than the visual intended.

Two reasons to reverse rather than tune. First the founder's, which is sufficient: the card has no business signalling whether someone's trip has ended. Second, INV-2's absence rule — the projection must not reveal lifecycle state, and a colour that appears only on completed trips reveals exactly that to anyone who notices the pattern. The original intent was honest (*don't dress a dead link as a live one*) but the signal it produced was not the one it meant.

**Now:** the trip line and the location pin always render in the accent. Only *tappability* varies with `publishedItineraryId`, which is invisible until touched — and a tap that goes nowhere on an unpublished trip is a smaller cost than leaking, in colour, that a traveler's trip is finished. The "un-tinted and inert" line in the deviations section is superseded by this comment; B6.2/B6.5 keep their navigation behaviour unchanged.

**2026-08-13 — the Trip Post badge opens a PUBLIC trip diary, a surface this story did not plan** *(founder: "i was hoping for a public version of that diary view, because the published itinerary needs more improvement so we can just settle for that first")*. The mock routes the badge to the published itinerary; that surface is not ready, and the founder would rather the feed's core loop land somewhere good than somewhere specified. Decision 3's badge destination is superseded for now — it can return to the published itinerary whenever that surface earns it, and B6.2 keeps the trip *line* pointing there already.

**Why the existing diary screen could not be reused, which is the whole reason this is new code.** `/diary/{tripId}` reads `GET /v1/itineraries/{id}/diary/entries` — guard-protected, 404 for a non-member (pinned by `DiaryContractIT`) — and it returns **every** entry the author wrote for that trip, shared or not. Pointing a public badge at it would have 404'd for the entire audience the feed exists for, and widening the endpoint to fix that would have published the private record ADR-024 promised. The new read is public *by construction* rather than by relaxation: `GET /v1/feed/postcards/trips/{itineraryId}/by/{authorId}` filters on `sharedAt IS NOT NULL` in the query itself and reuses the feed's own scrubbed projection, so an unshared postcard cannot reach it by any path.

**What it exposes is what the feed already exposed**: author card, trip name, day label, activity title, place, caption, photos, shared instant. No new field crosses — the card gains `itineraryId`, which is only the key to this same shared-only read. Three properties are pinned rather than assumed: a trip with nothing shared is **not-found, never empty** (so the response cannot confirm a trip exists); unsharing the last postcard **closes the view again**; and the read is scoped by author as well as trip, so two members of one trip keep separate public diaries and asking after a member who shared nothing is not-found even while their co-traveler's is open — the roster staying invisible on a surface that could easily have leaked it.
