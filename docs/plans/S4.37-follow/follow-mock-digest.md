# S4.37 — follow mock digest *(source: the founder's Claude Design canvas "Follow S4.37 Spec", delivered 2026-08-26; archived 1:1 in `mock-render.dc.html`, handoff in `mock-handoff.md`)*

The canvas is the **design baseline** (CLAUDE.md mock rule) for everything S4.37 ships, and the direct successor of the S4.36 canvas whose C1/C2/M1 cards pre-drew the follow states this story now builds. Eight frames: **1a** followers list · **1b** following list · **1c** the two list empty states · **2** public profile in the Following state with the Follows-you chip and live stat cells · **3** Home with the All/Following filter · **3b** its empty state · **4** executed search with People above Trips · **4b** the people-only variant — plus contract cards C1–C8 and motion cards M1–M4. This digest records the load-bearing values read from the canvas's own markup, and the boundary between what the frames draw and what this story builds.

**Handling notes.** Handoff fidelity: high — colors, type, spacing, copy, and motion timings final. Frames are 393px; Inter throughout. Status bar is phone chrome, not built UI (the standing S4.21 deviation). Glyphs (`·`, `—`, `→`, `≥`) were restored from a transit encoding mangle at archive time, the same mangle the S4.36 digest records; every **shipping copy string** is plain ASCII and was transcribed byte-for-byte. The interactive render needs the Claude Design dc runtime (`support.js`) beside the file, which is not committed; the markup is the normative artifact either way.

## What S4.37 builds from this canvas

**Frames 1a/1b — the follower/following lists.**
- Pushed screen: back chevron in a 36px hit target + title "Followers" / "Following" 15/700; count line **"{n} followers"** / **"{n} following"** 13/600 muted.
- Row: 44px avatar r22 (#FDE4CF fallback, initials #C2410C, the 135° hatch), name 15/700 ink, handle 13 muted, trailing chevron #D6D3D1, press #FAFAF9; tap → that traveler's profile. **Plain rows — no follow button in rows** (the pill lives on the profile, one tap away).
- Infinite scroll, cursor pages of 20, fetch at 5 rows from end (C3); cascade per M2 (fade + 6px rise 200ms, 40ms stagger, first 8 rows only; later pages append unanimated).

**Frame 1c — list empty states** (the S4.36 empty grammar: 48px cream circle + small SVG, title 15/700, support 13px muted max-width 240):
- Followers: **"No followers yet"** / **"When travelers follow you, they'll show up here."**
- Following: **"Not following anyone yet"** / **"Follow travelers to see their postcards in your Home feed."** + a filled **"Find people"** CTA (36px pill) → People search.

**Frame 2 — the profile, Following state.**
- The pill's two treatments (C2): **Follow** = filled #EA580C, white 13.5/700 label (as shipped at S4.36) · **Following** = white fill, 1px #E7E5E4 border, ink label, **leading 14px check glyph**. Height 40, radius 999, press scale 0.96, **no width jump between states**. State machine per C1: optimistic flip, background request, failure reverts + toast; **unfollow is confirm-free**; pending taps ignored; idempotent server-side.
- **Failure toast**: dark pill (#1C1917, white 11/600), bottom-anchored, 2.5s — **"Couldn't follow @handle"**.
- **Follows-you chip** (C5): beside the `@handle · #N` meta line — #F5F5F4 well, 11/700 muted label, radius 999. Read-only, never a tap target, never on your own profile, and it does not change the pill's treatment.
- **Stats row**: four cells with real numbers — Published · Destinations · **Followers** · **Following**; the follow pair pressable (press #FAFAF9, r8) → the matching list; Published/Destinations stay inert (C4). The S4.36 em dashes retire. Same on the own Profile tab.

**Frames 3/3b — Home filter.**
- Chip row under the existing Home header (wordmark + search + bell, all unchanged): **All** (default) · **Following** — height 32, radius 999, 13/700; active = filled #EA580C white; inactive = white, 1px #E7E5E4 border, #57534E label. Chip/panel motion per M3.
- Semantics per C6: **cold start always lands on All**; the selection is remembered only while the app runs, never persisted. Following shows only postcards from travelers you follow; **feed cards unchanged**.
- Empty (3b): 56px cream circle + person-add SVG, **"No postcards yet"** / **"Postcards from travelers you follow will show up here."** + the **"Find people"** CTA. One state covers both causes — following nobody, and follows with no posts.

**Frames 4/4b — executed search.**
- Submit always lands on the **combined results screen**: back chevron + the persistent field holding the query, count line **"{p} people · {t} trips"** 13/600 muted — note the singular **"1 person"** in 4b.
- **PEOPLE group at the top** whenever ≥1 traveler matches: label "PEOPLE" 12/800 uppercase ls1 #A8A29E; up to 3 rows (36px avatar, name 14/700, handle 12 muted, tap → profile); footer **"See all people"** 13.5/700 #C2410C (dashed 36px circle + arrow SVG) → the full People results screen. Hairline divider, then "TRIPS" in the same label style, then the itinerary results unchanged (C8).
- C8 also retires the old gate: the People group and the suggestions overlay's "See all people" render whenever **at least one** person matches — the "only if more than 3" rule is gone. Fences unchanged: min 2 chars, no empty-query browse, handle + display name only, never email.
- 4b: only people match — the people group + the trips empty state: **'No trips match "{q}"'** / **"Try a destination or itinerary name."**

**Motion contract**: M1 (pill crossfade ~160ms, revert reuses it — no bounce), M2, M3 adopted as written; **M4 (Reduce Motion) normative** — translates and staggers drop to 120ms opacity swaps, press-scale removed, nothing conveys meaning through motion alone.

## What this canvas draws that S4.37 does NOT build — named, so the frame is never read as scope

- **The likes row on the feed cards ("♥ 31 likes") does not ship** — the same named deviation the S4.36 digest recorded for the same row. No real like exists (S4.4/S4.6 territory) and no invented number reaches a stranger. The handoff's own line governs: *"feed cards unchanged (frame 3 cards are abbreviated in the prototype)"* — frames 3/3b's cards are context, and the shipped `FeedCard` renders exactly as today under either chip.
- **Frame 2's body below the pill is S4.36 context, not scope**: the Diary/Itineraries tabs and the trip row are the shipped screen, drawn to place the header work; the trip row's abbreviated meta ("Kyoto, Japan · 6 days") is prototype shorthand, not a change to the shipped row anatomy.
- **C1's "pending" is an internal state, not a third treatment**: the pill renders Follow or Following only; "pending" is the in-flight window during which further taps are ignored. No spinner, no disabled paint.

## Canvas lines that were decisions — all pre-ruled at the 2026-08-26 grilling, none new here

The canvas arrived after the grilling closed, and every decision it draws matches a recorded ruling: plain list rows (Q4) · the chip on the profile header only, never on list rows (Q5) · All/Following with cold-start-All and session-only memory (R2-Q1 / C6) · the combined results screen with the ≥1 gate (R3-Q1 / C8). What the canvas newly *settles* are treatments the rulings left open — the Following pill's neutral-outline-plus-check, the toast's dark-pill grammar and 2.5s dwell, the chip geometry, and the singular/plural count-line copy — all adopted as drawn.
