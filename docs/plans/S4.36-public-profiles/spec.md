# S4.36 — Public profiles: the traveler page + People search

**Status:** ready-for-owner-review · **Epic:** E4 · **Depends on:** S4.21 (shipped — the layout the projection inherits), S4.3 (shipped — the Discover surface and its suggestions grammar), S4.22/ADR-025 (shipped — every diary entry is public), S4.23 (shipped — bylines carry the handle on the wire), S4.14 (shipped — the vanity number), S4.28 (shipped — member management re-homed to the Travelers tab, which this story therefore does **not** owe)
**Grilled:** 2026-08-25 (grill-with-docs, two rounds, 18 questions) — founder rulings recorded per decision below.
**ADR:** none new, none amended. ADR-019 already defines `public` as every onboarded traveler; ADR-015 already rules the handle a label and the id the identifier — this story spends both and changes neither. The follow-shape must-answer (does the graph narrow `public`?) is deliberately **not** answered here: it belongs to story B, per the epic map's re-pointed friend-graph line.
**Candidate-capability note:** none — every act in this story is a read of existing public data; nothing footprint-growing, nothing gated. (Follow — story B — will carry its own.)
**Freshness note** *(the first spec bound by the 2026-08-25 rule)*: every surface this story adds or changes is **focus-fresh pull** — the public profile and People search are public surfaces, and the S4.35 posture keeps public surfaces off the socket (their audience is every online traveler). Deliberately no topic, no subscription.

**Immutable point-in-time intent** (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** ADR-019 (visibility is its own axis; `public` means every onboarded traveler) · ADR-015 (the handle: a unique, changeable **label**, never a key — ids stay the identifier everywhere) · ADR-008 (every endpoint here is additive within /v1 — no waiver needed) · Artifact 03 (public reads sit deliberately outside the workspace guard — the PublishedItinerary/PostcardFeed precedent; nothing in this story takes a `Membership`) · ADR-032 (its "public profiles landing" trigger for the invite-suggestions v2 annex is deliberately held for story B — see Out of scope) · the S4.21 mock digest (`docs/plans/S4.21-profile-page/profile-mock-digest.md`) — the design baseline, inherited with the three named deltas below.

## Problem Statement

Everything profile-shaped shipped so far is deliberately owner- or member-scoped: S4.21's Profile tab is the own view, S4.20/S4.28's traveler surfaces are member-scoped, and every author tap in the product refuses — `TravelerDialog`'s "Visit profile — coming soon", the published view's follow/rating chrome, S4.3's explicit "People group is not built". Four registered obligations have accumulated against "the public-profile story": the public projection, People search, the vanity number's public rendering, and the stub must-answer (fake numbers must die or hide before a non-owner sees a profile). The founder's driver, on the record: profiles and the social loop incentivize real usage — checking profiles, and following people whose itineraries exist beyond the test data.

## Solution

One public projection of the Profile screen, addressed by handle, readable by any signed-in traveler; a People group in Discover's suggestions with a dedicated results screen behind deliberate enumeration fences; every author tap in the product routed to the real page; a Follow pill that is honest about being a promise — it fires a coming-soon prompt and logs a demand event, so story B opens with numbers instead of instincts.

## User Stories

- As a traveler, I tap an author's byline anywhere — a discovery card, a feed postcard, a published itinerary — and land on their profile.
- As a traveler, I search people by handle or name in Discover and open anyone I find.
- As a traveler, I see honest numbers on a profile: counts of things I can see on that very screen, never invented ones.
- As a traveler tapping my own byline, I see exactly what others see, plus the way back to editing it.

## Locked decisions *(founder, 2026-08-25, in grilling order)*

### 1 · Identity
S4.36, branch `feature/S4.36-public-profiles`. The story every register line has been calling "the public-profile story" finally gets its number.

### 2 · Signed-in only *(Q2)*
The profile and People search sit behind auth exactly like Discovery. Pre-auth visibility, share links and profile OG cards stay with S4.8's must-answers — widening later is additive; narrowing later is a broken promise.

### 3 · Every onboarded traveler has one; un-onboarded accounts have none *(Q3, Q15)*
No opt-out, no publishing threshold: `public` already means every onboarded traveler (ADR-019), and the handle, avatar and diary content are individually public on shipped surfaces — the profile aggregates facts, it does not create them. An un-onboarded account resolves 404 and never appears in search — an AC, not an accident. The onboarding gate refuses completion without a claimed handle, so every profile-holder has a handle: exactly the population the address scheme needs.

### 4 · The projection is the Profile screen, minus owner chrome *(Q4)*
What the own Profile screen shows is what projects: avatar, display name, `@handle · #vanity` meta line, bio, the stats row (per decision 6), the Diary and Itineraries tabs. **Named exclusion list — never in any payload of this story: email, country, home city, preferred currency, goals, interests.** A future field addition argues its way past this list in a spec, not a diff.

### 5 · Design baseline: the S4.21 frames, three named deltas *(Q5, Q13)*
No new canvas. The mock rule is satisfied by inheritance plus this delta list, which is the ruling:
1. The **Edit Profile pill becomes the Follow pill** — same slot, same geometry (height 40, radius 999, 13.5px/700). Tapping it fires the app-drawn coming-soon prompt (the `comingSoonMessage` pattern, platform-forked — the `Alert.alert` web trap family) and logs the follow-demand event. It performs no mutation.
2. The **cogwheel is absent** — settings are the owner's.
3. The **stats row carries two cells, not four** (decision 6). Story B restores the four-cell rhythm with real Followers · Following.

On self-view the Follow pill does not render; an **Edit affordance** appears instead, reaching the Profile tab.

### 6 · Stats: Published · Postcards *(Q6)*
Two real counts of things the viewer can see on this very screen. Chosen over the alternatives deliberately: four cells with stubs shows fake numbers about a real person; Published · Trips leaks the count of private trips (`statsFor.tripCount` counts every membership). This discharges the registered stub must-answer for this surface — **stub metrics stay owner-only behind `STUB_METRICS_ON`** and never render to a non-owner.

### 7 · Search fences — the enumeration posture *(Q7)*
S4.9 refused fuzzy people-search as an enumeration surface; this story builds it with the fences as definition: minimum query length **2** · no results without a query — no browse-all-people, anywhere · matches on handle and display name only, **never email** — an email-shaped query matches nothing even when it equals a traveler's email · suggestions People group capped at **3** with "See all" · results cursor-paginated. Ranking (spec-level default): exact handle → handle prefix → display name, case-insensitive.

### 8 · Every author tap routes *(Q8)*
Discovery card authors, feed postcard bylines, the published itinerary's traveler chrome, `TravelerDialog`'s "Visit profile" CTA, and People results — all route to the profile. Nothing is left refusing: a surviving "coming soon" after profiles exist is a bug report waiting to be filed.

### 9 · Self-view: the same route, plus the way home *(Q9)*
One route, no call-site special-casing. Viewing yourself shows the public projection — doubling as "what others see" — with the Edit affordance per decision 5.

### 10 · The handle is the address; the id stays the identity *(Q10, Q14)*
Routes and endpoints are keyed by handle (`/travelers/[handle]`, by-handle resolution — the `HandleController` precedent). ADR-015 is untouched: payloads and storage keep ids; the handle **resolves to** a traveler, it never identifies one. The one edge, accepted: after a rename the old address 404s, and the app self-heals because every tap site carries the current handle from a fresh payload (`TravelerCardResponse` rides on every byline). No redirect is built.

### 11 · The Follow pill ships now, honest about what it is *(Q13)*
Founder call over an empty slot: the pill renders, prompts "coming soon", and is measured — the S4.9 "From Your Network" precedent of shipping the affordance as an instrument. Follow's mechanics, table and semantics are story B, queued immediately behind.

### 12 · Three demand events join register #2 *(Q18)*
Profile view · People-result tap · Follow tap. Story B's grilling opens with real numbers about who looks at whom.

### 13 · People results get their own screen *(Q16)*
`DiscoveryResultsScreen`'s destination/duration filter model means nothing for people; "See all" opens a dedicated cursor-paginated list.

### 14 · An empty profile renders honestly *(Q17)*
A traveler with nothing published and no postcards still renders: header, `0 · 0`, tabs with honest empty copy (final wording at build, against existing copy patterns). Search results never dead-end.

## Mechanics *(the decisions' consequences)*

**Backend — all additive within /v1:**
- `GET /v1/travelers/{handle}/profile` → the projection: traveler card (id, handle, displayName, avatarUrl), bio, vanityNumber, `publishedCount`, `postcardCount`. 404 for an unknown handle or an un-onboarded traveler.
- `GET /v1/travelers/{handle}/profile/published` → `Page<ShowcaseItineraryResponse>` filtered by the S4.3 public predicate (published + public + non-archived) — **not** `listMyShowcase`, which is the owner's list.
- `GET /v1/travelers/{handle}/profile/diary` → the trip-grouped postcard read mirroring the own Diary tab's anatomy. Trip-title exposure is precedented: `FeedPostcardResponse.tripTitle` already ships on the public feed.
- `DiscoverySuggestionsResponse` gains a People group (additive field); `GET /v1/discovery/travelers?q&cursor&limit` serves See-all. Both enforce the decision-7 fences server-side.
- A **new** stats method (`publicStatsFor` or equivalent) — `statsFor` is not reused, so `tripCount` structurally cannot reach this surface.
- No new tables. At most a search index on handle/display name if the query plan wants one (additive migration if so).

**Mobile:**
- Route `/travelers/[handle]`, reusing the S4.21 profile components with a viewer≠owner state; the three deltas; the platform-forked prompt.
- Entry-point wiring replaces every refusal (decision 8); the People group and results screen in Discover; the three analytics events.
- Both new surfaces take `useRevalidateOnFocus` (the freshness note's lane).

## Acceptance criteria

1. Signed in as t1, opening `/travelers/{t2's handle}` shows: avatar, display name, `@handle · #vanity`, bio, stats **Published · Postcards**, Diary and Itineraries tabs — the S4.21 layout with the three deltas and nothing else. *(Pool accounts; state which tag played which role.)*
2. No payload in this story ever contains email, country, home city, preferred currency, goals, or interests — an IT asserts absence **on the serialized wire**, not the DTO.
3. An unknown handle 404s. A provisioned-but-un-onboarded traveler is unreachable by any route and absent from search even on a display-name match.
4. The Itineraries tab lists only published + public + non-archived — a private or archived trip never appears (predicate IT).
5. The Diary tab shows the subject's postcards grouped by trip, matching the own-tab anatomy; only trips with shared postcards contribute section headers.
6. People search returns nothing anywhere for an empty or 1-character query; 2+ characters match handle and display name only; an email-shaped query returns nothing even when it equals a traveler's stored email.
7. Suggestions show at most 3 People plus "See all"; the results screen paginates by cursor.
8. Every entry point routes to the profile: discovery card author, feed postcard byline, published itinerary traveler chrome, `TravelerDialog` CTA, People result. No "coming soon" remains on any of them.
9. My own byline lands me on the public route showing exactly the public projection, with the Edit affordance and **no** Follow pill.
10. The Follow pill renders on every non-self profile, fires the app-drawn coming-soon prompt on web **and** device, performs no mutation, and logs the demand event.
11. The three register-#2 events fire: profile view, People-result tap, Follow tap.
12. Stats are real: a traveler with three private trips and nothing public shows `0 · 0` — `tripCount` never renders anywhere on this surface.
13. After a handle rename, the old address 404s and navigation from any live byline (which carries the current handle) succeeds.
14. The empty profile (AC 12's subject) renders header + stats + honest empty copy per tab, and is reachable from search.
15. Both new surfaces revalidate on focus; neither holds a socket subscription.

## Testing decisions *(the seams)*

- **AC 2 is the load-bearing test** — serialize the real response and assert field absence; the exclusion list is the privacy contract.
- Multi-account walks use the verified pool (t1 = viewer, t2 = subject); tags named in every write-up.
- Playwright: the profile walk, the search-fences walk, and an entry-point sweep; the coming-soon prompt asserts through the app-drawn dialog (headless Chrome swallows native ones — the harness already stubs and prints them).
- Device rung: real-touch search and the prompt on Android (the `Alert` fork family is exactly what only a device or the forked web path can prove).
- Un-onboarded fixture: provision without completing onboarding (no handle claimed) — driven over HTTP, not psql.
- Rungs: backend ITs → web preview container → device walk (the standing three).

## Out of scope

- **Follow mechanics** — story B: the table, the endpoints, real Followers · Following, and the ADR-019 must-answer (does the graph narrow `public`?).
- **Stars, reviews, public comments** (S4.4 / S4.5 / S4.6) — rating and price stubs stay owner-only.
- **Pre-auth profiles, share links, profile OG cards** — S4.8's must-answers.
- **Block / report, discoverability opt-out** — new lines if demand appears.
- **ADR-032's invite-suggestions v2 annex** — its trigger ("public profiles landing") fires here by the letter; **held for story B by founder call**, recorded so it reads as deferred, not missed.
- **Member management** — discharged at S4.28, not owed here; the stale S4.20 park line is corrected in this story's docs pass.
- Any change to `stubMetrics` beyond it never rendering on the public surface.

## Comments

*(none yet)*
