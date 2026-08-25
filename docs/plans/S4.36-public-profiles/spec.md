# S4.36 — Public profiles: the traveler page + People search

**Status:** ready-for-agent · **Epic:** E4 · **Depends on:** S4.21 (shipped — the layout the projection inherits), S4.3 (shipped — the Discover surface and its suggestions grammar), S4.22/ADR-025 (shipped — every diary entry is public), S4.23 (shipped — bylines carry the handle on the wire), S4.14 (shipped — the vanity number), S4.28 (shipped — member management re-homed to the Travelers tab, which this story therefore does **not** owe)
**Grilled:** 2026-08-25 (grill-with-docs, two rounds, 18 questions) — founder rulings recorded per decision below. Seams confirmed by the founder the same day; **the device walk is deferred by founder call** (see Testing Decisions).
**ADR:** none new, none amended. ADR-019 already defines `public` as every onboarded traveler; ADR-015 already rules the handle a label and the id the identifier — this story spends both and changes neither. The follow-shape must-answer (does the graph narrow `public`?) is deliberately **not** answered here: it belongs to story B, per the epic map's re-pointed friend-graph line.
**Candidate-capability note:** none — every act in this story is a read of existing public data; nothing footprint-growing, nothing gated. (Follow — story B — will carry its own.)
**Freshness note** *(the first spec bound by the 2026-08-25 rule)*: every surface this story adds or changes is **focus-fresh pull** — the public profile and People search are public surfaces, and the S4.35 posture keeps public surfaces off the socket (their audience is every online traveler). Deliberately no topic, no subscription.

**Immutable point-in-time intent** (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** ADR-019 (visibility is its own axis; `public` means every onboarded traveler) · ADR-015 (the handle: a unique, changeable **label**, never a key — ids stay the identifier everywhere) · ADR-008 (every endpoint here is additive within /v1 — no waiver needed) · Artifact 03 (public reads sit deliberately outside the workspace guard — the PublishedItinerary/PostcardFeed precedent; nothing in this story takes a `Membership`) · ADR-032 (its "public profiles landing" trigger for the invite-suggestions v2 annex is deliberately held for story B — see Out of Scope) · the S4.21 mock digest — the design baseline, inherited with the three named deltas below.

## Problem Statement

Everything profile-shaped shipped so far is deliberately owner- or member-scoped: the Profile tab is the own view, the traveler surfaces of S4.20/S4.28 are member-scoped, and every author tap in the product refuses — the traveler dialog's "Visit profile — coming soon", the published view's follow chrome, S4.3's explicit "People group is not built". Four registered obligations have accumulated against "the public-profile story": the public projection, People search, the vanity number's public rendering, and the stub must-answer (fake numbers must die or hide before a non-owner sees a profile). The founder's driver, on the record: profiles and the social loop incentivize real usage — checking profiles, and following people whose itineraries exist beyond the test data.

## Solution

One public projection of the Profile screen, addressed by handle, readable by any signed-in traveler; a People group in Discover's suggestions with a dedicated results screen behind deliberate enumeration fences; every author tap in the product routed to the real page; a Follow pill that is honest about being a promise — it fires a coming-soon prompt and logs a demand event, so story B opens with numbers instead of instincts.

## User Stories

1. As a traveler, I want to tap an author's byline on a discovery card and land on their profile, so that a trip I admire leads me to the person who made it.
2. As a traveler, I want to tap an author's byline on a feed postcard and land on their profile, so that the Home feed connects me to people, not just posts.
3. As a traveler, I want to tap the traveler chrome on a published itinerary and land on the author's profile, so that a published plan credits a reachable person.
4. As a traveler, I want the traveler dialog's "Visit profile" to actually work, so that a co-traveler on my roster is one tap from their public page.
5. As a traveler, I want to search people by handle in Discover, so that I can find someone whose handle I know.
6. As a traveler, I want to search people by display name in Discover, so that I can find someone whose handle I don't know.
7. As a traveler, I want a People group in the search suggestions capped small, with a "See all" opening the full list, so that people results don't crowd out trips.
8. As a traveler, I want a found person's profile to show their published itineraries, so that I can browse what they've made public.
9. As a traveler, I want their profile to show their shared postcards grouped by trip, so that their diary reads the way my own does.
10. As a traveler, I want the numbers on a profile to be real counts of things I can see on that screen, so that I'm never shown an invented number about a real person.
11. As a traveler, I want a Follow pill on every profile that isn't mine, so that the intent to follow has somewhere to go — even before following exists.
12. As a traveler tapping Follow today, I want an honest "coming soon" answer, so that the pill never pretends to have done something it didn't.
13. As a traveler, I want tapping my own byline to show me exactly what others see, plus the way back to editing, so that I can check my public face without guessing.
14. As a traveler, I want my email, country, home city, currency, goals and interests kept off my public profile, so that going public never publishes what I gave the app for its own use.
15. As a traveler who has published nothing, I want my profile to render honestly with zeros and empty tabs, so that being found in search never dead-ends the person who found me.
16. As a traveler, I want private and archived trips to never appear on anyone's public showcase, so that the audience rules I rely on hold on this new surface too.
17. As a traveler who renames their handle, I want live surfaces to keep reaching me at the new handle, so that a rename is safe.
18. As a traveler, I want people search to require a real query, so that the traveler list can never be enumerated by browsing.
19. As a traveler, I want searching an email address to find nobody — even if it's the right one — so that knowing someone's email never unlocks their presence here.
20. As the founder, I want profile views, people-search taps and Follow taps measured, so that the follow story is grilled against real demand rather than instinct.

## Implementation Decisions

*(Founder rulings, 2026-08-25, in grilling order; mechanics follow from them.)*

1. **Identity.** S4.36, branch `feature/S4.36-public-profiles` — the story every register line has been calling "the public-profile story" gets its number.
2. **Signed-in only.** The profile and People search sit behind auth exactly like Discovery. Pre-auth visibility, share links and profile OG cards stay with S4.8's must-answers — widening later is additive; narrowing later is a broken promise.
3. **Every onboarded traveler has a Public Profile; un-onboarded accounts have none.** No opt-out, no publishing threshold: `public` already means every onboarded traveler (ADR-019), and the handle, avatar and diary content are individually public on shipped surfaces — the profile aggregates facts, it does not create them. An un-onboarded account resolves 404 and never appears in search. The onboarding gate refuses completion without a claimed handle, so every profile-holder has a handle — exactly the population the address scheme needs.
4. **The projection is the Profile screen, minus owner chrome.** Avatar, display name, `@handle · #vanity` meta line, bio, the stats row (decision 6), the Diary and Itineraries tabs. **Named exclusion list — never in any payload of this story: email, country, home city, preferred currency, goals, interests.** A future field argues its way past this list in a spec, not a diff.
5. **Design baseline: the S4.21 frames, three named deltas** (the mock rule is satisfied by inheritance plus this list, which is the ruling): *(a)* the Edit Profile pill becomes the **Follow pill** — same slot, same geometry; *(b)* the cogwheel is absent — settings are the owner's; *(c)* the stats row carries two cells, not four. On self-view the Follow pill does not render; an **Edit affordance** appears instead, reaching the Profile tab.
6. **Stats: Published · Postcards.** Two real counts of things the viewer can see on this very screen. Rejected deliberately: four cells with stubs (fake numbers about a real person) and Published · Trips (the trip count includes private memberships and would leak how many private trips a person has). This discharges the registered stub must-answer for this surface — **stub metrics stay owner-only behind the existing kill switch** and never render to a non-owner. The public stats read is a **new** service method; the owner's stats read is not reused, so the private trip count structurally cannot reach this surface. Story B restores the four-cell rhythm with real Followers · Following.
7. **Search fences — the enumeration posture.** S4.9 refused fuzzy people-search as an enumeration surface; this story builds it with the fences as definition: minimum query length **2** · no results without a query — no browse-all-people, anywhere · matches on handle and display name only, **never email** — an email-shaped query matches nothing even when it equals a traveler's stored email · suggestions People group capped at **3** with "See all" · results cursor-paginated · fences enforced server-side. Ranking (spec-level default): exact handle → handle prefix → display name, case-insensitive.
8. **Every author tap routes.** Discovery card authors, feed postcard bylines, the published itinerary's traveler chrome, the traveler dialog's CTA, and People results — all route to the profile. Nothing is left refusing.
9. **Self-view: the same route, plus the way home.** One route, no call-site special-casing. Viewing yourself shows the public projection — doubling as "what others see" — with the Edit affordance per decision 5.
10. **The handle is the address; the id stays the identity.** Routes and endpoints are keyed by handle (by-handle resolution — the handle-lookup precedent from invites). ADR-015 is untouched: payloads and storage keep ids; a handle **resolves to** a traveler, it never identifies one. The accepted edge: after a rename the old address 404s, and the app self-heals because every tap site carries the current handle from a fresh payload — the traveler card already rides on every byline. No redirect is built.
11. **The Follow pill ships now, honest about what it is.** Founder call over an empty slot: the pill renders, prompts "coming soon" through the app-drawn platform-forked prompt (the web-Alert trap family), performs no mutation, and is measured — the S4.9 "From Your Network" precedent of shipping the affordance as an instrument. Follow's mechanics, table and semantics are story B, queued immediately behind.
12. **Three demand events join register #2:** profile view · People-result tap · Follow tap — so story B's grilling opens with real numbers about who looks at whom.
13. **People results get their own screen.** The trip results' destination/duration filter model means nothing for people; "See all" opens a dedicated cursor-paginated list.
14. **An empty profile renders honestly.** Header, `0 · 0`, tabs with honest empty copy (final wording at build, against existing copy patterns). Search results never dead-end.
15. **API contract — all additive within /v1, no waiver:** a by-handle profile read (traveler card + bio + vanity number + the two counts; 404 for unknown or un-onboarded), a by-handle published-showcase page filtered by the S4.3 public predicate (published + public + non-archived — never the owner's list), a by-handle trip-grouped postcard read mirroring the own Diary tab's anatomy (trip-title exposure is precedented — the public feed already ships it), a People group added to the suggestions response (additive field), and a cursor-paginated people-search read. No new tables; at most an additive search index if the query plan wants one.
16. **Freshness lane:** both new surfaces revalidate on focus (the shared helper); neither holds a socket subscription.

## Testing Decisions

- **What makes a good test here:** external behavior at the wire or the walk — never implementation details. The privacy contract is asserted on the **serialized response**, not the DTO; a fence is asserted by querying through it, not by reading the query. Every check names its failure mode before it's trusted (the standing doctrine).
- **Backend web-layer ITs** (the dominant seam — the existing controller-IT pattern with the shared Postgres container): the exclusion list absent from every payload; unknown-handle and un-onboarded 404s; the search fences (short query, empty query, email-shaped query); the showcase predicate (a private and an archived trip planted and proven absent); cursor pagination. Prior art: the published-itinerary and discovery controller ITs.
- **Pure-module Jest**: the search gating/ranking module and the shared copy module both the components and the e2e specs import — so asserted strings cannot drift, and Playwright never imports a component (the established constraint). Prior art: the discovery search-gating module and the traveler-copy module.
- **Playwright e2e against the preview container** (the harness suite): the profile walk with two pool travelers (state which tag played which role), the search-fences walk, the entry-point sweep proving no "coming soon" survives on the routed taps, and the Follow pill's prompt through the app-drawn dialog the harness auto-accepts and prints. Prior art: the existing multi-account harness walks.
- **The device walk is deferred — founder call, 2026-08-25, at the seam check.** The device rung is currently blocked repo-wide anyway (the gitignored Google services file needs a console download). What the deferral leaves unproven on a device, recorded so the story that closes the rung picks it up: real-touch people search, and the native half of the coming-soon prompt (the web fork proves the app-drawn dialog).
- **Fixtures:** multi-account via the verified pool; the un-onboarded subject provisioned over HTTP without completing onboarding (no handle claimed) — never planted with psql.

## Out of Scope

- **Follow mechanics** — story B: the table, the endpoints, real Followers · Following, and the ADR-019 must-answer (does the graph narrow `public`?).
- **Stars, reviews, public comments** (S4.4 / S4.5 / S4.6) — rating and price stubs stay owner-only.
- **Pre-auth profiles, share links, profile OG cards** — S4.8's must-answers.
- **Block / report, discoverability opt-out** — new lines if demand appears.
- **ADR-032's invite-suggestions v2 annex** — its trigger ("public profiles landing") fires here by the letter; **held for story B by founder call**, recorded so it reads as deferred, not missed.
- **Member management** — discharged at S4.28, not owed here; the stale S4.20 park line is corrected in this story's docs pass.
- Any change to the stub-metrics module beyond it never rendering on the public surface.

## Further Notes

- This story discharges four registered obligations at once: the public projection, People search (S4.3's refusals replaced), the vanity number's public rendering, and the stub must-answer for this surface.
- Stories queued behind it, both re-pointed in the epic map on 2026-08-25: **story B** (follow) and **story C** (permanent itinerary deletion, whose parked trigger the founder fired the same day).
- The spec was first hand-written after the grilling and then regenerated through the spec skill at the founder's prompt; the rulings are identical — the structure and the deferred device walk are what changed.

## Comments

### 2026-08-25 — the design baseline arrives: the S4.36 canvas *(founder-supplied, same day as the grilling)*

Decision 5's "no new canvas" is superseded: the founder ran the design prompt and the canvas (**four frames + contracts C1–C7 + motion M1–M5**) is now the **normative design baseline**, archived beside this spec (`mock-render.dc.html`, handoff in `mock-handoff.md`, load-bearing values in `public-profiles-mock-digest.md`). What changes and what doesn't:

- **The open pill-treatment question is answered: Follow = filled terracotta, white label** (C2's first half). The three deltas of decision 5 survive intact — the canvas simply draws them.
- **The canvas deliberately draws story B too, and the digest fences it off:** C1's follow state machine, C2's Following treatment, and M1's crossfade are **story B's design input, not this story's scope**. S4.36's pill has one state and its tap fires the coming-soon prompt per decision 11 — unchanged.
- **One named deviation from the frame:** the postcard card's likes row ("♥ 31 likes") does not ship — decision 6 forbids invented numbers in front of strangers and no real count exists until S4.4/S4.6. Stated per the mock rule rather than passed silently.
- **C7's "This profile isn't available" copy is adopted as the 404 state's rendering** (unknown/renamed handle, un-onboarded account); no block/deactivation feature exists or ships here.
- **New chrome adopted:** the pushed screen's header row (back chevron, "Profile" title), the People-first group order in suggestions, the addressable `/discover/people?q=` results route with its pagination values, the no-results state, and M2–M5 as the motion contract, Reduce Motion normative.

**Two canvas lines are decisions, not values, and await founder ruling:** *(a)* C4 routes self-search to the own Profile tab, **contradicting decision 9** (one route + Edit affordance, grilled and ruled) — tickets build to decision 9 until re-ruled; *(b)* C5 excludes self from suggestions — new, recommended for adoption, pending the same breath.
