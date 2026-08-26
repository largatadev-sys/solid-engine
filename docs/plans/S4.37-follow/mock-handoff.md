# Handoff: Follow (S4.37)

## Overview
Makes Follow real and surfaces people in executed search. Eight frames: 1a followers list, 1b following list, 1c list empty states, 2 public profile with Following pill + Follows-you chip + live stat cells, 3 Home All/Following filter, 3b its empty state, 4 combined search results (People above Trips), 4b people-only variant. Sibling of S4.36 — reuses its visual grammar exactly.

## About the Design Files
The HTML file is a **design reference** — a live interactive prototype showing intended look and behavior, not production code. Open it in a browser: frame 2's Follow pill toggles, frame 3's All/Following chips switch feed panels, lists show the M2 cascade. Implement in the existing Expo/React Native codebase (mobile/), extending the S4.36 profile and discovery components.

## Fidelity
**High-fidelity.** Colors, type, spacing, copy, and motion timings are final. All shipping copy strings are plain ASCII.

## Design Tokens (house system)
- Font: Inter everywhere (400/500/600/700/800)
- terracotta #EA580C (accent) · terracotta-dark #C2410C · ink #1C1917 · body #44403C · muted #78716C · light muted #A8A29E · border #E7E5E4 · hairline #F5F5F4 · cream #FFF7ED · chip #FFEDD5 · avatar fallback #FDE4CF with initials #C2410C · input well #FAF9F5 / border #EBE9E2 · chevron #D6D3D1
- Cards radius 14, pills radius 999. Phone frame: 393px wide

## Frames 1a/1b — Follower / Following lists
- Pushed screen: back chevron (36px hit target) + title "Followers" / "Following" 15/700
- Count line "{n} followers" / "{n} following" 13/600 muted
- Row: 44px avatar radius 22 (fallback initials), name 15/700, handle 13 muted, trailing chevron #D6D3D1; press #FAFAF9; tap → that traveler's profile
- **PLAIN rows — no follow button in rows** (the pill lives on the profile)
- Infinite scroll, cursor pages of 20, fetch at 5 rows from end

## Frame 1c — List empty states
S4.36 empty grammar (48px cream circle + small SVG, title 15/700, support 13px muted max-width 240):
- Followers: "No followers yet" / "When travelers follow you, they'll show up here."
- Following: "Not following anyone yet" / "Follow travelers to see their postcards in your Home feed." + filled **Find people** CTA (36px pill) → People search

## Frame 2 — Public profile, Following state
- Follow pill height 40, radius 999, 13.5/700: **Follow** = filled #EA580C white label; **Following** = white fill, 1px #E7E5E4 border, ink label, leading 14px check SVG. Tap = optimistic toggle, no confirm on unfollow.
- **Follows-you chip**: next to "@handle · #N" meta line — #F5F5F4 well, 11/700 muted, radius 999. Read-only; never on your own profile.
- Stats row now 4 cells with real counts: Published · Destinations · **Followers** · **Following**; the last two are pressable (press #FAFAF9) → matching list screen. Em dashes retired.
- Failure toast: dark pill, bottom-anchored, 2.5s — "Couldn't follow @handle"

## Frames 3/3b — Home feed filter
- Under Home header (Largata wordmark 22/800 left, search + bell 36px targets right): chip row **All** (default) · **Following**; active chip filled #EA580C white 13/700, inactive white + 1px #E7E5E4 border, height 32, radius 999
- Following shows only postcards from travelers you follow; **feed cards unchanged** (frame 3 cards are abbreviated in the prototype)
- Empty (3b): 56px cream circle + person-add icon, "No postcards yet" 15/700, "Postcards from travelers you follow will show up here." + Find people CTA

## Frames 4/4b — Executed search
- Submitting a query always lands on the combined results screen: back chevron + persistent search field holding the query, count line "{p} people · {t} trips" 13/600 muted
- **PEOPLE group at the top** when any traveler matches: label "PEOPLE" 12/800 uppercase ls1 #A8A29E; up to 3 rows (36px avatar, name 14/700, handle 12 muted, tap → profile); footer "See all people" 13.5/700 #C2410C → full People results screen
- Hairline divider, then "TRIPS" label same style, then itinerary result cards unchanged
- 4b: only people match — people group + trips empty state ('No trips match "{q}"' + "Try a destination or itinerary name.")

## Contracts
- **C1 Follow state machine:** not_following → pending → following (inherited from S4.36). Optimistic flip, background request; failure reverts + toast "Couldn't follow @handle". Tap while Following = confirm-free unfollow, same pattern. Pending taps ignored; idempotent server-side.
- **C2 Pill treatments:** as frame 2; press scale 0.96; no width jump between states.
- **C3 List pagination + count:** infinite scroll, pages of 20, fetch at 5 from end; count line 13/600 muted; plain rows.
- **C4 Stat-cell taps:** Followers/Following pressable on both own Profile tab and public profiles → list screens. Published/Destinations inert.
- **C5 Follows-you chip:** shown when profile owner follows the viewer; quiet, read-only, never on own profile, never changes the pill.
- **C6 Home filter semantics:** cold start always lands on All; selection remembered only while the app runs — never persisted. Following = postcards from follows only; cards unchanged. Empty per 3b (following nobody OR no posts from follows).
- **C7 Offline:** header from cache; lists and results show inline Retry; follow taps fail fast into revert + toast — no queued mutations.
- **C8 Executed-search semantics:** submit always → combined results screen. People group renders whenever ≥1 person matches (old "only if more than 3" rule removed); same for "See all people" in the suggestions overlay. Fences unchanged: min 2 chars, no empty-query browse, handle + display name only, never email.

## Motion
- **M1 Pill crossfade:** fill/border/label crossfade ~160ms ease; check fades with label swap; press scale 0.96 @120ms; failure revert reuses the crossfade.
- **M2 List cascade:** rows fade + 6px rise 200ms ease, 40ms stagger, first 8 rows only; later pages append unanimated.
- **M3 Chip switch:** chip fill/label 160ms; incoming feed panel fade + 8px rise 200ms cubic-bezier(.2,0,0,1); outgoing removed, never overlaps.
- **M4 Reduce Motion:** all translates/staggers drop → 120ms opacity swaps; press-scale removed. No meaning conveyed by motion alone.

## Files
- `Follow S4.37 Spec.dc.html` — the eight frames + contract/motion cards (live prototype)
- Related codebase tests worth extending: profileStatsRow, profileMetaLine, publicProfile, feedBehaviors, feedDynamics, discoveryDebounce, discoveryFilters (in mobile/__tests__/)
