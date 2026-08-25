# Handoff: Public Profiles + People Search (S4.36)

*(The designer's handoff note, archived verbatim beside the canvas — glyphs restored from a transit encoding mangle. The repo's reading of this handoff, including what does NOT ship at S4.36, is the digest: `public-profiles-mock-digest.md`.)*

## Overview
Public profile pages for other travelers, plus People in Discover search — suggestions group and a dedicated results screen. Four frames: 1a public profile, 1b empty profile, 1c suggestions with People group, 1d people results + no-results variant.

## About the Design Files
The HTML file is a **design reference** — a live interactive prototype showing intended look and behavior, not production code. Open it in a browser: frame 1a's Follow pill, tabs, and trip sections are tappable; 1c/1d show entrance motion. Implement in the existing Expo/React Native codebase (mobile/), reusing the own-profile components where the anatomy matches.

## Fidelity
**High-fidelity.** Colors, type, spacing, copy, and motion timings are final.

## Design Tokens (house system)
- Font: Inter everywhere (400/500/600/700/800)
- terracotta #EA580C (accent) · ink #1C1917 · body #44403C · muted #78716C · border #E7E5E4 · hairline #F5F5F4 · cream #FFF7ED · chip #FFEDD5 · avatar fallback #FDE4CF with initials #C2410C · input well #FAF9F5 / border #EBE9E2
- Phone frame: 393px wide

## Frame 1a — Public profile (another traveler)
Reuses own-profile anatomy:
- Back chevron (36px hit target) + "Profile" 15/700 header row
- 72×72 avatar, radius 36; fallback #FDE4CF + initials 22/700 #C2410C
- Display name 22/800 ink · meta "@handle · #N" 13px muted · bio 13.5px #44403C
- Stats row: bordered, radius 14, **two cells only** — Published, Postcards (16/700 value, 11px muted label, hairline dividers)
- **Follow pill**: height 40, radius 999, 13.5/700
  - Follow (default): filled #EA580C, white label
  - Following: white bg, 1px #E7E5E4 border, ink label, leading 14px check SVG
- Tabs "Diary | Itineraries": active = 14/700 #EA580C label + 3px terracotta bar (radius 100px 100px 0 0); inactive = 14/500 muted
- Diary: trip sections (44px thumb radius 10, title 15/700, meta 12 muted, rotating chevron) collapsing to postcard cards (photo, title 15/700, Day chip #FFEDD5/#C2410C 11/700, caption 13.5, likes row)
- Itineraries: published itinerary rows (44px thumb, title 15/700, "{days} days · {n} activities · Published" 12 muted, trailing chevron)
- **No cogwheel, no Edit Profile anywhere**

## Frame 1b — Empty public profile
Same header; stats 0 · 0; bio row omitted when empty (no placeholder). Diary empty state, centered: 56px cream circle with postcard icon, "Nothing published yet" 15/700, "When {first name} publishes postcards from their trips, they'll show up here." 13px muted, max-width 240.

## Frame 1c — Discover suggestions with People
- Focused search field: #FAF9F5 well, 1.5px #EA580C border, radius 12, query text 15px ink, blinking terracotta caret, Cancel 14/700 terracotta
- Groups in order: **People, Destinations, Itineraries**; group label 12/800 uppercase letter-spacing 1px #A8A29E; hairline dividers between groups
- People row: 36px avatar/initials, name 14/700, handle 12 muted; hover/press #FAFAF9; **cap 3**
- Footer row: dashed 36px circle with arrow SVG + "See all people" 13.5/700 #C2410C

## Frame 1d — People results
- Header: back chevron + persistent search field (unfocused: 1px #EBE9E2) holding the query
- Count line "{n} people" 13/600 muted
- Row: 44px avatar (radius 22), name 15/700, handle 13 muted, trailing chevron #D6D3D1; tap → public profile
- No-results variant: 48px cream circle with person-search icon, title "No one matches \"zz\"" 15/700, support "Check the spelling, or try a display name instead of a handle." 13px muted

## Contracts
- **C1 Follow state machine:** not_following → pending → following. Optimistic flip; POST in background; failure reverts + toast "Couldn't follow @handle". Tap while Following = confirm-free unfollow, same pattern. Pending taps ignored. Idempotent server-side.
- **C2 Pill treatment:** Follow = filled terracotta (the one primary action on someone else's page); Following = neutral outline + check, matching own-profile Edit pill weight. Press scale 0.96.
- **C3 Header:** two-cell stats only; follower counts not public; bio row omitted when empty; no edit affordances.
- **C4 Privacy:** published content only (public diary postcards grouped by trip, published itineraries). Drafts/private trips never appear. Searching your own handle routes to your own Profile tab, never this screen.
- **C5 Suggestions:** People joins existing pipeline — min 2 chars, 300ms debounce, latest-wins. Prefix match on display name OR handle, case-insensitive. Cap 3 + "See all people" → results with live query. Self excluded.
- **C6 Results:** route /discover/people?q= (addressable, deep-link restores). Cursor pagination, page 20, fetch at 5 rows from end. Count updates with query. Never a blank list.
- **C7 Edge states:** empty-profile copy above; itineraries empty mirrors it. Deactivated/blocked handle → "This profile isn't available". Names ellipsize 1 line, bios clamp 2. Offline: header from cache, lists inline Retry.

## Motion
- **M1 Follow toggle:** press scale 0.96 @120ms ease; fill/label crossfade 180ms ease; check fades with label swap; failure revert uses same crossfade.
- **M2 Tab switch:** label+bar 160ms ease; incoming panel fade + 8px rise 200ms cubic-bezier(.2,0,0,1); outgoing removed, never overlaps. Section expand 180ms same curve; chevron rotates 180° @200ms.
- **M3 Suggestions:** panel fade + 6px drop 160ms cubic-bezier(.2,0,0,1) on first paint of a query's results; people rows stagger 30ms (max 90ms); keystroke re-renders swap in place with NO animation.
- **M4 Results cascade:** rows fade + 6px rise 200ms ease, 40ms stagger, first 8 rows only; later pages append unanimated.
- **M5 Reduce Motion:** all translates/staggers drop → 120ms opacity swaps; chevron rotation and press-scale removed. No meaning conveyed by motion alone.

## Files
- `Public Profiles S4.36 Spec.dc.html` — the four frames + contract/motion cards (live prototype); archived here as `mock-render.dc.html`
- Related codebase tests worth extending: profileCard, profileMetaLine, profileStatsRow, profileDiaryTab, profileItinerariesTab, discoveryDebounce (in mobile/__tests__/)
