# S4.21 — Profile page: the showcase surface (own view)

**Mock:** root `Profile.dc.html` (Claude Design project, frames 2a "Diary tab" / 2b "Itineraries tab") — the design baseline per the fidelity rule. **Grilled:** 2026-08-11, founder-ruled throughout. **Branch:** `feature/S4.21-profile-page`.

## The pull, on the record

The founder brought the profile mock on 2026-08-11 and ruled it becomes the actual profile tab. Canon already reserved this surface: register #13's standing answer names *the author's profile* as where published diaries will land, and the epic map's "profiles story" references all point at a future public projection. This story builds the surface **as own view only** — the profiles/S4.2 story inherits the layout, the register, and the dump-photo consent must-answer when visibility ever widens. ADR-024's author-only diary visibility is untouched.

## Problem statement

The profile tab is a utility card — wordmark, a card, four stacked buttons. It is nobody's profile: it shows no work, tells no story, and looks nothing like the product the founders are building toward. The founders want to eyeball the real showcase surface — their trips, their diary, their published itineraries — with the screen fully dressed, including the social affordances that aren't built yet.

## Solution

The mock's profile becomes the profile tab: a header (avatar, name, handle, vanity number, bio), a four-cell stats row, and two tabs — **Diary** (your postcards, grouped by trip, collapsible) and **Itineraries** (published itineraries you own, as showcase cards). Everything the domain can back renders real; everything it can't (followers, following, likes, ratings, price) renders as deliberately fake random numbers behind a single kill-switch, so the founders can eyeball the dressed screen today and strip the fakes the day the real features land. The current profile screen survives as the account page behind a cogwheel.

## User stories

1. As a traveler, I want my profile tab to show who I am — avatar, name, handle, vanity number, bio — so that the tab is actually a profile and not a settings page.
2. As a traveler, I want a Diary tab grouping my postcards by trip, so that I can browse my own record the way a visitor eventually will.
3. As a traveler, I want trip sections that expand and collapse on tap, so that a long diary stays navigable.
4. As a traveler, I want the most recent diary trip first and already expanded, so that the freshest memories greet me without a tap.
5. As a traveler, I want each postcard to show its photos, title, day-and-time badge, and caption, so that the entry reads at a glance.
6. As a traveler, I want to tap a postcard and land on its full entry screen, so that the profile is a doorway, not a dead end.
7. As a traveler, I want an Itineraries tab showing only the published itineraries I own, so that the tab is my showcase, not my working pile.
8. As a traveler, I want each itinerary card to carry its cover, title, destinations, and length, so that the card sells the trip.
9. As a traveler, I want tapping an itinerary card to open its published view, so that I see exactly what an audience sees.
10. As a traveler, I want real Published and Trips counts in my stats row, so that the two numbers that can be true are true.
11. As a founder, I want the unbuilt social numbers — followers, following, likes, ratings, price — rendered as random stand-ins, so that I can eyeball the dressed screen before those features exist.
12. As a founder, I want all the fakery behind one switch, so that flipping it off shows the honest screen and shipping the real features means deleting one module.
13. As a traveler, I want an Edit Profile button where the mock puts it, so that changing my name, handle, bio, or photo is one tap away.
14. As a traveler, I want a cogwheel that opens my account page, so that Sign out and Reload still exist without cluttering the showcase.
15. As a traveler with no handle, bio, or vanity number yet, I want those lines simply absent, so that a sparse profile looks clean rather than broken.
16. As a traveler with nothing published, I want the Itineraries tab to say so gracefully, so that an empty showcase invites rather than shames.
17. As a traveler with no diary entries anywhere, I want the Diary tab's empty state to point me at my trips, so that I know where postcards come from.
18. As a product owner, I want no new act on this surface to widen any audience, so that the public-profile decision stays with the story that owns it (S4.2).

## Locked decisions *(founder, 2026-08-11, in grilling order)*

### 1 · Own view only

The profile tab renders the signed-in traveler's own data. No public route, no visitor audience, no cross-traveler read of anything. The profiles/S4.2 story inherits this layout for the public projection; the diary's author-only rule (ADR-024) stands.

### 2 · The Itineraries tab is published-and-owned, only

Not everything the traveler belongs to — itineraries the traveler **owns** that are **published**. Drafts and member-trips live in the Trips tab; this tab is the showcase. Designed empty state when nothing qualifies.

### 3 · Workspace tokens, Inter

The screen ships on the workspace token set (the mock's own accent). The mock's Figtree/Outfit render as Inter — the same mapping every mock-derived surface since the workspace redesign has used. No new fonts, no theme work.

### 4 · The unbacked numbers are random, firm, behind one switch

Followers and following: random integer 1–100 each. Likes per postcard: random integer 1–100. Rating per itinerary card: random 1.0–5.0, one decimal. Price per itinerary card: random ₱10,000–₱20,000 in hundreds, rendered with the mock's "/ person". Plain `Math.random()`, **re-rolled every render** (founder-ruled over stable seeding). All derivations live in one clearly-named module with one exported on/off constant; **off** renders the honest fallbacks — zeros for followers/following, no likes row, muted star with no number, no price pill. **Kill condition, recorded here and as a register note bound to S4.2: the stubs die or hide before this surface is ever visible to anyone but its owner.**

### 5 · Price is random even though a real total exists

The published itinerary carries a real derived single-currency estimated total, but it is not per-person and canon ruled per-person off ("nothing in the system knows a headcount to divide by"). Founder ruled: the profile card's pill is a random stub like the others; the real total keeps rendering where it already does (the published view). The two screens showing different numbers is accepted, knowingly, for the stub era.

### 6 · Published and Trips counts are real

The two stats-row cells the domain can back render true values: count of published itineraries the traveler owns, count of trips the traveler belongs to.

### 7 · The Diary tab lists trips with entries, as S3.1 built it

The existing my-diary-trips listing serves the tab unchanged: trips **having entries**, newest entry first (already the endpoint's order). The mock's empty-trip section does not ship. First section expanded, the rest collapsed. Postcard tap → the existing diary entry screen; itinerary card tap → the existing published view.

### 8 · The cogwheel opens the current profile screen, relocated

Founder override of the mock's glyph: the top-right icon is a **cogwheel**. It opens the current profile screen moved to its own route as the de-facto account page — keeping its card and Edit profile / Reload / Sign out buttons, **dropping its My Diary section** (the Diary tab is the diary's one home). The new design takes the profile tab route.

### 9 · The vanity number renders verbatim, prefixed

"#" + the served string, exactly as the wire delivers it — the S4.14 render-verbatim rule holds; the `#` is presentation chrome, and no client ever parses the number.

### 10 · The postcard component is reused, not forked

The profile's postcards are the diary surface's postcard component with the likes row as an optional prop. One component, one seam; a second postcard implementation is the silent-divergence trap the fidelity rule exists to catch.

## Mechanics *(the decisions' consequences)*

- Header composition: avatar via the existing authenticated-media path with initials fallback · display name · `@handle` · `· #<vanityNumber>` · bio — each of the last three omitted entirely when null. Cogwheel top-right. Edit Profile pill routes to the existing profile editor in edit mode.
- Stats row: four cells in mock order — Published (real) · Trips (real) · Followers (stub) · Following (stub). Not tappable.
- Diary tab: the existing my-diary-trips infinite query provides the sections; a trip's postcards load when its section is expanded, via the existing per-trip entries listing. Carousel per postcard: 1–5 photos with the mock's counter pill and dots.
- Itineraries tab: a new traveler-scoped listing (below) provides the cards; cover, title, PUBLISHED badge, destinations · N days, ★ stub, ₱ stub.
- The account screen keeps its current composition minus the My Diary section, at a new route the cogwheel opens; the profile tab route serves the new screen. The wordmark header lives or dies with that screen — it relocates as-is.
- The stub module is presentation-layer only: no persistence, no wire traffic, no per-entity stability.

## Wire changes *(all additive — no ADR-008 waiver needed)*

- **New: list my published itineraries** — traveler-scoped (the my-diary-trips precedent: resolved from the token, no workspace guard bypass — it reads only the caller's own memberships), cursor-paged, carrying what the card renders: id, title, destinations, day count, cover image. Exact shape at ticket level.
- **New: profile stats** — published count and trips count for the caller. Whether this is its own small endpoint or fields on the listing above is a ticket-level call; either way additive.
- Nothing existing changes. No diary wire changes. The diary trips listing already orders and pages as this story needs it.

## Candidate-capability note *(ADR-009)*

None — the story is a read-only projection over existing data plus presentation-layer stubs; no new footprint-growing act ships. The potentially-gated act on this surface (making a profile publicly visible) belongs to the profiles/S4.2 story.

## Deviations from the mock

1. The top-right glyph is a cogwheel, not the mock's dot-in-circle *(founder override, on the record)*.
2. The social numbers are generated stubs, not the mock's literals — and flip to honest fallbacks with the switch off.
3. The empty-trip diary section (the mock's third trip) does not ship — trips-with-entries only *(founder)*.
4. Figtree/Outfit render as Inter via the workspace tokens *(house rule for every mock-derived surface; no new fonts)*.
5. The status bar and home indicator are phone chrome, not built UI.
6. The price pill's number is random; its "/ person" text ships as drawn *(founder, with the real-total conflict accepted knowingly)*.

## Acceptance criteria

1. The profile tab renders the mock's surface: header (avatar or initials, name, `@handle`, `#number`, bio), stats row, Diary/Itineraries tabs, unchanged bottom tab bar.
2. Diary tab: one section per diary trip, newest first, first expanded; expanding a section loads and renders its postcards (carousel with counter and dots, title, day-and-time badge, caption, likes row); tapping a postcard opens its entry screen.
3. Itineraries tab: exactly the traveler's published-and-owned itineraries as cards (cover, title, PUBLISHED badge, destinations · N days, ★, ₱ "/ person"); tapping a card opens the published view; the empty state renders when none qualify.
4. Stats row: Published and Trips render true counts (proven against a fixture with a known mix of owned-published, owned-draft, and member-only trips); Followers and Following render integers in 1–100.
5. With the stub switch off: followers/following render 0, no likes row, muted star with no number, no price pill. With it on: every generated value falls in its ruled range and format across repeated renders.
6. The cogwheel opens the account screen — card, Edit profile, Reload, Sign out, and **no** My Diary section; Sign out signs out.
7. A traveler with null handle, bio, or vanity number renders a clean header with those lines absent.
8. On the phone frame, no trailing label truncates (the S3.1 `flexShrink` class) — closed by emulator screenshot, not by any web rung.
9. The web preview walk passes: tab switch, section expand/collapse, postcard navigation, card navigation, cogwheel navigation.

## Testing decisions *(seams confirmed with the founder at the seam check, 2026-08-11)*

- **The stub module** — pure functions, the story's one new seam. Unit tests assert range and shape over many draws (integers 1–100; one-decimal 1.0–5.0; hundreds-only 10,000–20,000) and the off-switch's honest fallbacks. No test asserts a specific value — reroll-per-render is the ruling. Prior art: the extracted pure-logic seams (drop math, label helpers).
- **The new listing and counts** — integration tests at the controller seam against the real database, the house pattern. The discriminating case: a traveler who owns published trips, owns drafts, and is a plain member of someone else's published trip sees exactly the owned-published set, and the counts match the fixture. Prior art: the membership-scoped listing ITs.
- **The screen** — Jest with mocked repositories for tab switching, expansion state, empty states, and header null-handling; the postcard component's optional likes row pinned where its existing tests live.
- **The walks** — the web preview driver for the flow assertions; the emulator for layout verdicts (screenshots, per the fidelity rule) and the phone-frame truncation check the web viewport cannot catch.

## Out of scope

Public route or any non-owner audience · friend graph · real likes, stars, reviews (S4.4/S4.5) · per-person cost (E5) · any diary visibility change (ADR-024 untouched) · Home/Discover tab activation · palette convergence between the two token sets (epic-map backlog line) · rendering the vanity number anywhere new beyond this header.

## Comments
