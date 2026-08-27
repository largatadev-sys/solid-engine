# Handoff: Delete, Leave & Unpublish patterns (Profile + Trips)

> Archived verbatim from the founder's Claude Design handoff, 2026-08-27. This bundle is the
> S4.38 design baseline (mock-is-the-baseline rule applies). One reconciliation overrides its
> text where it collides with the ratified archive-backed semantics — see `../ui-spec.md`,
> Reconciliations. The interactive prototype is `Profile Screen v2.dc.html`; `support.js` is
> the prototype runtime only (not part of the design; do not port).

## Overview
Largata has no consistent way to remove things. This work defines one: how a user deletes a
postcard, unpublishes an itinerary, deletes a trip they own, and leaves a trip they don't.
It covers two screens — **Profile** (Diary / Itineraries tabs) and **Trips** (the shipped
landing screen) — plus the shared bottom sheet, confirmation modal and undo toast.

The governing rule: **the weight of the confirm follows the blast radius, not the word
"delete."** A sheet is for choosing, a modal is for stopping, a toast is the safety net after
the fact. Nothing in the app confirms twice.

| Action | Scope | Confirm | Recovery |
|---|---|---|---|
| Delete postcard | One item, user's own | None | 5s Undo toast |
| Unpublish itinerary | Reversible state change | None | 5s Republish toast |
| Delete trip (owner) | Cascades to every member's data | Modal + acknowledgement tick | **None — permanent** *(superseded: archive-backed, see ui-spec)* |
| Leave trip (member) | Self only | None | 5s Undo toast |
| Delete diary | — | **Does not exist.** See below. |

**Diary has no delete and needs none.** A diary *is* the collection of its postcards. Delete
the last postcard and the diary card collapses out of the list behind it, so an empty diary is
never shown. Undo restores the postcard and the diary together. There is also no diary DELETE
endpoint, so this matches the API as it stands.

**Removing an itinerary from the world is "Unpublish," not "Delete."** The trip survives
untouched and the action is reversible, so the label has to say so.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended
look and behaviour, not production code to copy. The task is to **recreate these designs in the
Largata React Native / Expo app** using its existing components, tokens and animation constants.
Nearly everything here already exists in the codebase (`BottomSheet`, `MenuEntryRow`,
`MenuDivider`, `FeedToast`, `TripRow`, `TripTabRow`, `usePressFeedback`, `travelerRadii`,
motion constants) — this spec is mostly about *composition and copy*, not new primitives.

**One component change is requested:** `FeedToast` must widen to carry a trailing action
(divider + 44px Undo target + draining progress line). Everything else composes existing parts.

## Fidelity
**High-fidelity.** Colours, type, spacing, radii, durations and copy below are final and taken
from the codebase's own tokens where they exist. Recreate pixel-for-pixel using the app's
existing primitives; where a value below duplicates a token, use the token.

---

## Screen 1 — Profile

**Purpose:** the user reviews their own diaries, postcards and published itineraries, and edits
or removes any of them.

**Frame:** 393 × 852 (iPhone 14/15 logical). Background `#FFFFFF`. Vertical flex:
status bar (48px) → scrollable content → tab bar (64px + 20px safe area).

### Header block (padding `12px 20px 0`, column gap 16px)
- **Avatar** 72×72, radius 36 (full round), background `#FDE4CF`, initials 22/28 w700 `#C2410C`.
- **Name** 22/28 w800 `#1C1917`, single line, ellipsis.
- **Handle** 13/17 w400 `#78716C` — format `@handle · #10428`.
- **Bio** 13.5/18 w400 `#44403C`.
- **Settings button** 38×38, radius 19, border `1px #E7E5E4`, gear glyph 16px `#68615E`
  stroke-width 2. Hover `#FAFAF9`; press scale 0.985.

### Stat strip
Row, border `1px #E7E5E4`, radius 14, padding `10px 0`. Four equal cells divided by
`border-left: 1px #F5F5F4`. Value 16/20 w700 `#1C1917`; label 11/14 w400 `#78716C`.
Cells: Published 6 · Destinations 14 · Followers 1204 · Following 318.
Followers/Following are tappable.
*Known issue, out of scope:* counts are ungrouped (`1204` should be `1,204`).

### Edit Profile button
Full width, height 40, radius 999, border `1px #E7E5E4`, label 13.5/17 w700 `#1C1917`.
Hover `#FAFAF9`.

### Tab row — Diary / Itineraries
Two equal cells, padding `10px 0 11px`, `border-bottom: 1px #E7E5E4`, `margin-top: 6px`.
Active label 14/18 w700 `#EA580C`; inactive 14/18 w600 `#78716C`.
Underline: 50% width, 3px, `#EA580C`, top corners radius 100, slides via
`translateX(0 → 100%)` over 200ms `cubic-bezier(0.2,0.7,0.2,1)`.
Opens on **Diary**.

### Diary tab content (padding `16px 20px 32px`, gap 12)
**Diary card** — border `1px #E7E5E4`, radius 16, overflow hidden.
Header row padding 12, gap 10:
- Cover thumb 44×44 radius 10.
- Title 15/19 w700 `#1C1917`; subline 12/15 w400 `#78716C` = `{destination} · {n} days`.
- **Kebab** `moreHorizontal` 20px `#A59E99` in a 44×44 hit area (`margin-right:-8px`),
  radius 22, hover `#FAFAF9`, press 0.985. Same glyph/size/colour `MemberRow` already uses.
- **Chevron** 9×9 box with `border-right`/`border-bottom` 2.5px `#A8A29E`; rotates
  `-45deg` (collapsed) → `45deg` (expanded) over 260ms `cubic-bezier(0.2,0.7,0.2,1)`
  — it rotates *with* the body opening, never snaps.

Body: `max-height` 0 → 1400px + opacity, 260ms / 200ms. Inner padding `0 12px 12px`, gap 12.

**Postcard card** — border `1px #F5F5F4`, radius 14, background `#FFFFFF`.
- **Photo stage** 400px tall. Multi-photo postcards use a horizontal
  `scroll-snap-type: x mandatory` strip of 325px pages, scrollbar hidden.
  - Counter pill top-right (inset 10px): `rgba(28,25,23,0.72)`, radius 999,
    padding `3px 9px`, 10/13 w700 `#FFFFFF`, text `{page}/{total}`, `pointer-events:none`.
  - Dots bottom-centre (inset 10px), 6×6 radius 3, gap 5; active `#FFFFFF`,
    inactive `rgba(255,255,255,0.5)`, colour transition 200ms.
  *Known issue, out of scope:* the fixed 400px stage letterboxes landscape shots.
- Meta block padding 12, gap 6:
  - Title 15/19 w700 `#1C1917`.
  - **Day pill** background `#FFEDD5`, radius 999, padding `2px 9px`,
    11/14 w700 `#C2410C`, text `Day 6 · 4:20 PM`, nowrap.
  - Caption 13.5/19.6 w400 `#44403C`.
  - Likes row: heart 14px filled `#EA580C`, count 12/15 w600 `#78716C`;
    kebab right-aligned (44×44, `margin:-10px -10px -10px 0`).

Empty state (all postcards gone): 12/15 w400 `#78716C`, `padding-top: 4px` —
"No diary entries yet. Open a trip and add your first postcard."

### Itineraries tab content (padding `16px 20px 32px`, gap 14)
Card: border `1px #E7E5E4`, radius 16, background `#FFFFFF`, tappable.
- Cover 140px tall; **price pill** top-right inset 10px, `rgba(28,25,23,0.75)`,
  radius 999, padding `3px 10px`, 11/14 w700 `#FFFFFF`, e.g. `$1,240 / person`.
- Meta padding 12, gap 6: title 17/22 w700 `#1C1917`;
  **PUBLISHED pill** background `#DCFCE7`, radius 999, padding `2px 8px`,
  10/13 w700 letter-spacing 0.4 `#15803D`;
  subline 13/17 w400 `#78716C`; rating row — star 13px `#F59E0B`, value 13/17 w700
  `#1C1917`, kebab right.

### Tab bar (both screens)
Background `#FAF9F6`, `border-top: 1px #E2E4E8`, `padding-bottom: 20px`.
Four cells, height 64, icon 24px + label 13/20. Inactive `#5C6470` w400;
active `#EA580C` w600. Order: Home · Discover · Trips · Profile.

---

## Screen 2 — Trips

This is `app/(tabs)/(trips)/trips.tsx` **as shipped**, with swipe-to-reveal added. Do not
restyle it — the values below document what is already there so the swipe can be dropped in.

**Frame:** 393 × 852, background `#FAF9F6`. Note the palette shift: Trips runs on navy
`#1B263B` and terracotta `#D96C4A`; Profile runs on orange `#EA580C`. Both are current.

### Header
Padding `16px 24px 8px`. Title "Trips" 28/34 w700 letter-spacing −0.3 `#1B263B`.
Search glyph 20px `#1B263B` in a 44×44 target (`margin:-10px -12px -10px 0`) — coming soon,
inert, press opacity 0.85.

### Tab row (`TripTabRow`)
Height 44, `border-bottom: 1px #E2E4E8`, three equal cells.
Active 14/18 w700 `#1B263B`; inactive 14/18 w400 `#5C6470`.
Underline 33.3333% wide, 3px, `#D96C4A`, `bottom: -1px`, top corners radius 100,
`translateX(tabIndex * 100%)` over 200ms `cubic-bezier(0.2,0.7,0.2,1)`.
Tabs: Upcoming · Ongoing · Completed. **Opens on Ongoing** (per `landingTab`).

### Trip row (`TripRow`)
List padding 16, gap 8. Card: background `#FFFFFF`, border `1px #E2E4E8`, radius 16,
padding 12, gap 12, `touch-action: pan-y`, cursor grab.
- Cover 76×76 radius 12. No cover → `#F2F1ED` fill with a 24px box glyph
  `#5C6470` stroke 1.8, centred.
- Title 15/20 w700 `#1B263B`; subline 12/16 w400 `#5C6470` = `{destination} · {n} days`.
- **Live-edit advisory** (when another member is editing): gap 6, `padding-top: 2px` —
  dot 8×8 radius 100 `#D97706` pulsing (opacity 1→0.35, scale 1→0.7, 1800ms
  `ease-in-out` infinite), label 11/14 w600 `#B45309` "Currently being edited".
- **Publication pill** right-aligned: background `rgba(217,108,74,0.0627)` (`accentTint`),
  radius 100, padding `2px 8px`, 11/14 w600 `#D96C4A`. Values: Published / Private / none.

### Plan a Trip bar — **Upcoming tab only**
Padding `8px 16px 16px`, background `#FAF9F6`. Bar height 51, radius **4**,
background `#D96C4A`, label 15/18 w600 `#FFFFFF` + 16px plus-circle glyph, gap 8.
Press opacity 0.85.

### Archived trips link — **Completed tab only, and only when the tab has rows**
Centred, padding `16px 0 4px`, 12/16 w600 `#5C6470`, underlined.

### Empty states (per tab, unchanged copy)
- Upcoming — "No trips on the horizon yet."
- Ongoing — "No trip underway right now."
- Completed — "Trips you've travelled will collect here."
Centred, `padding: 96px 24px 0`, 13/20 w400 `#5C6470`.

---

## The swipe (Trips only)

Trips are **swiped**; everything *inside* a trip is **kebabbed**. That split is the whole
navigation model — a trip row has no kebab, and a postcard has no swipe.

- Drag a card left to reveal a **96px action panel** behind it (`REVEAL = 96`).
- Track: `x = clamp(base + dx, -108, 0)` — 12px of overdrag past the panel.
- Movement threshold 4px before the drag engages, so taps still land.
- Release: snaps **open** if `x < -48` (past half), otherwise springs back.
  Snap = `transform 220ms cubic-bezier(0.2,0.7,0.2,1)`; no transition while the finger is down.
- **Only one card open at a time**; switching tabs closes it.
- Use pointer capture (`setPointerCapture`) / the RN equivalent so the drag survives
  leaving the card bounds.

### Panel
Absolutely filled behind the card, radius 16, content right-aligned in a 96px column,
centred, gap 5, icon 20px `#FFFFFF` stroke 2, label 12/15 w600 `#FFFFFF`.
- **Owner** — fill `#B3261E` (`colors.danger`), trash glyph, label **Delete**.
- **Member** — fill `#5C6470` (`textSecondary`), log-out glyph, label **Leave**.

This is the only filled destructive surface in the app, and it is earned: swiping is cheap,
so the reveal has to look like a live wire.

### First-run hint
On first arrival the top card peeks **−14px** and settles: out at 760ms, back at 1660ms
(≈900ms visible). Once per session. **Skipped entirely under Reduce Motion.**

---

## Bottom sheet (Profile only)

Reuse `members/BottomSheet.tsx` verbatim.
- Grabber 36×4 radius 100 `#E7E5E4`, `margin: 0 auto 10px`.
- Title 17/22 w700 `#1C1917`, padding `4px 20px 12px` — the subject's own name.
- Container radius 20 top corners (`travelerRadii.sheet`), background `#FFFFFF`,
  padding `10px 0 24px`, shadow `0 -8px 32px rgba(28,25,23,0.14)`.
- Scrim `rgba(28,25,23,0.4)`, fades 150ms. Tap scrim to dismiss; swipe-dismiss at 60px.
- Entries follow `MenuEntryRow`: glyph 19px, label 15/20 w600, padding `14px 20px`,
  min-height 44, hover `#FAFAF9`. `MenuDivider` (`1px #F5F5F4`, `margin: 0 20px`)
  between rows, never above the first.
- Tones: default `#1C1917`; destructive `#B91C1C`; cautionary (Unpublish) `#B45309`.

### Menus
| Subject | Entries |
|---|---|
| Diary | Edit diary details · Copy public link |
| Postcard | Edit postcard · **Delete postcard** (`#B91C1C`) |
| Itinerary | Edit details · View published page · **Unpublish** (`#B45309`) |

Non-destructive entries close the sheet, then (after 150ms) fire a plain toast:
"Opening editor" / "Link copied" / "Opening published page".

---

## Delete-trip modal (owner only)

A modal, not a sheet — this is the one action in the app that cannot be undone.
**Never stacked on the sheet:** the swipe panel goes straight to the modal.

- Scrim `rgba(27,38,59,0.549)`, 150ms fade, tap to cancel.
- Card: full width inside 24px padding, background `#FFFFFF`, radius 14,
  padding `20px 20px 12px`, shadow `0 24px 60px rgba(27,38,59,0.28)`.
  Enters opacity 0→1 + scale 0.96→1 over 200ms `cubic-bezier(0.2,0.7,0.2,1)`.
- Title 17/22 w700 `#1B263B`, `padding-bottom: 8px` — "Delete {trip title}?"
- Body 13.5/19 w400 `#5C6470`, `padding-bottom: 14px`, `text-wrap: pretty`:
  "This deletes the plan, the chat, the photo dump and **every member's postcards and
  photos** — for everyone, instantly. It cannot be undone." (bold span `#1B263B` w600)
  *(superseded copy — see ui-spec Reconciliation R2)*
- **Acknowledgement**, required: row background `#FAF9F6`, border `1px #E2E4E8`,
  radius 8, padding 12, `margin-bottom: 16px`, gap 10, whole row tappable.
  Box 20×20 radius 4, border `2px #B3261E`; checked fill `#B91C1C` with a 12px white
  tick (stroke 3.4), both 140ms. Label 12.5/17 w600 `#1B263B` —
  "I understand {members − 1} other members lose their postcards and photos."
  *(superseded copy — see ui-spec Reconciliation R2)*
- **CTA** height 51 radius 4, label 16/20 w700.
  Unticked: `#F5F5F4` / `#A8A29E`, `cursor: not-allowed`, inert.
  Ticked: `#B91C1C` / `#FFFFFF`. Transition 160ms. Press opacity 0.85.
- **Cancel** below, centred, min-height 44, 15/20 w600 `#5C6470`.

---

## Undo toast

`FeedToast` geometry, widened to carry an action. **This is the one component change.**

**Shared:** 13/17 w600 `#FFFFFF` label, nowrap with ellipsis, in 180ms / out 180ms
(`SHOW_MS`). Plain toasts hold `HOLD_MS` 1600; undo toasts hold 5000.
Padding `10px 18px` plain, `11px 6px 11px 16px` with an action.
Action zone: `1px rgba(255,255,255,0.2)` divider (height 20 / 18), then a 44px min-height
target, padding `0 16px`.
Progress line: 2px, full width, `transform-origin: left`, animates
`scaleX(1 → 0)` **linear** over `UNDO_MS − 160` = 4840ms.

> Implementation note: paint the resting `scaleX(1)` frame *before* starting the drain
> (double `requestAnimationFrame` with a 90ms timer floor), or the bar jumps straight to 0
> when frames are throttled.

| | Profile toast | Trips toast |
|---|---|---|
| Shape | radius 14 | pill (radius 100) |
| Fill | `rgba(28,25,23,0.92)` | `#1C1917` |
| Accent | `#FDBA74` | `#EFC9BA` |
| Undo label | 13.5/17 w700 | 13/17 w600 |
| Inset | `left/right: 20px`, `bottom: 104px` | `left/right: 32px`, `bottom: 116px` |

**Trips toast lifts to `bottom: 191px` on the Upcoming tab** to clear the Plan a Trip bar.

### Messages
| Trigger | Toast | Action |
|---|---|---|
| Delete postcard | "Postcard deleted" | Undo (5s) |
| Undo postcard | "Postcard restored" | — (1.6s) |
| Unpublish itinerary | "Itinerary unpublished" | Undo (5s) |
| Undo unpublish | "Itinerary republished" | — (1.6s) |
| Leave trip | "Left the trip" | Undo (5s) |
| Undo leave | "You are back in the trip" | — (1.6s) |
| Delete trip | "Trip deleted" | — (1.6s, no undo) |

---

## Interactions & Behaviour

### Delete a postcard
1. Kebab → sheet opens (scrim 150ms, sheet rises 420px over 200ms, entries stagger
   40ms + 40ms each).
2. Tap "Delete postcard" → sheet closes (150ms).
3. Row collapses: `max-height → 0`, opacity → 0, `margin-bottom: -12px`,
   280ms `cubic-bezier(0.4,0,1,1)`. It collapses rather than vanishing so the list stays
   legible.
4. Undo toast for 5s. Undo → row expands back over 260ms, then the confirmation toast.
5. If the last postcard in a diary goes, the diary card collapses behind it on the same
   curve. Undo restores both.

**Only one overlay at a time, the whole way through:** sheet → collapse → toast.

### Unpublish an itinerary
Same path; the card collapses out of the Itineraries list and the toast offers Republish.

### Delete a trip (owner)
Swipe → Delete → modal → tick acknowledgement → "Delete trip".
Panel closes, 120ms beat, row collapses 280ms, "Trip deleted" toast (no undo).

### Leave a trip (member)
Swipe → Leave. **No modal** — it affects only the user. Row collapses, 5s Undo toast.

### Press feedback
`scale(0.985)` on kebabs, menu entries and CTAs (`usePressFeedback`), or
`opacity: 0.85` where the shipped Trips screen already uses opacity.

---

## Motion

Every duration is a constant that already exists in the codebase.

| | What | Timing |
|---|---|---|
| M1 | Screen entrance — header, stats, pill, tabs, then sections rise 8px and fade | `listRiseMs` 150, 60ms stagger |
| M2 | Stat bloom — counts fade up on arrival | `valueBloomMs` 180 (delays 240/290/340/390ms) |
| M3 | Tab swap — underline slides; label colour; panel rises | `underlineMs` 200, `labelColorMs` 150, 150 |
| M4 | Section expand — body opens, chevron rotates with it | 260ms `cubic-bezier(0.2,0.7,0.2,1)` |
| M5 | Sheet — scrim, then sheet rises 420px; entries stagger behind | `scrimInMs` 150, `sheetInMs` 200, out 150, 40ms stagger |
| M6 | Undo bar drains full width to zero, linear | 4840ms |
| M7 | Delete — row collapses to nothing | 280ms `cubic-bezier(0.4,0,1,1)` |
| M8 | Toast in/out; undo restore expands the row back | 180 / 180; hold 1600 or 5000; restore 260 |
| M9 | Press feedback | `scale(0.985)` / `opacity(0.85)` |
| — | Swipe snap | 220ms `cubic-bezier(0.2,0.7,0.2,1)` |
| — | Swipe hint peek | −14px, 760ms → 1660ms |

**Reduce Motion** drops every rise, rotation, collapse and stagger, and skips the swipe hint.
It keeps the scrim fade, as `BottomSheet` already does.

---

## State Management

Per screen (names from the prototype):
- `tab` — Profile: `'diary' | 'itineraries'`.
- `tripTab` — `'upcoming' | 'ongoing' | 'completed'`, default `'ongoing'`.
- `openA`/`openB` — diary card expansion.
- `page` — active photo in a postcard strip, derived from `scrollLeft / clientWidth`.
- `sheet` — id of the subject whose sheet is open, or null. Keep `lastSheet` so the
  sheet keeps its title and rows while it animates *out*.
- `collapsing: string[]` → `gone: string[]` — two stages, so the row animates before it
  leaves layout.
- `pending` — the id held for undo; `bar` — whether the drain has started.
- `swipe: { [tripId]: number }` — at most one entry; `dragging` — the id under the finger.
- `modal` — trip id awaiting confirmation; `ack` — acknowledgement ticked.
- Toast state is duplicated per screen (`toast`/`pending`/`bar` and
  `toastB`/`pendingB`/`barB`) because each screen owns its own toast host.
- A monotonic `token` guards every toast timer so a newer toast cancels the older one's
  teardown.

### Data
- **Delete is optimistic and deferred.** The row goes immediately; the `DELETE` request is
  held client-side until the 5s window closes. Undo therefore costs no round trip and needs
  no restore endpoint. The commit point is the timer expiring.
- **Trip delete fires immediately** — there is no undo window to hold it in.
- Unpublish is a state change on the itinerary, not a delete; the trip is untouched.

### ⚠️ API blocker
`ItineraryResponse` carries **no owner or role field**, so the trips list cannot tell whose
trip it is — and the swipe must choose between **Delete** and **Leave** *before* it opens.
**The trips payload needs a viewer role.** Until then the swipe cannot ship correctly.
Also confirm the member count used in the acknowledgement copy is available on the list payload.

---

## Design Tokens

### Colour — Profile (orange)
| Value | Use |
|---|---|
| `#EA580C` | accent, active tab, underline, likes |
| `#C2410C` | accent on tint (avatar initials, day pill text) |
| `#FFEDD5` | day pill fill |
| `#FDE4CF` | avatar fill |
| `#FDBA74` | toast accent + Undo label |
| `#1C1917` | primary ink |
| `#44403C` | body copy |
| `#78716C` | secondary ink |
| `#A8A29E` | tertiary ink, disabled |
| `#A59E99` | kebab glyph |
| `#68615E` | icon stroke |
| `#E7E5E4` | border |
| `#F5F5F4` | hairline divider, disabled fill |
| `#FAFAF9` | hover fill |
| `#FFFFFF` | surface |

### Colour — Trips (navy / terracotta)
| Value | Use |
|---|---|
| `#1B263B` | primary ink, device bezel |
| `#D96C4A` | accent, underline, Plan a Trip |
| `rgba(217,108,74,0.0627)` | `accentTint` — publication pill |
| `#EFC9BA` | toast accent |
| `#5C6470` | secondary ink, Leave panel |
| `#E2E4E8` | border |
| `#FAF9F6` | screen + tab-bar background |
| `#F2F1ED` | empty cover fill |

### Colour — status
| Value | Use |
|---|---|
| `#B3261E` | `colors.danger` — swipe panel, ack box border |
| `#B91C1C` | destructive text, ack fill, modal CTA |
| `#B45309` | cautionary text (Unpublish, live-edit label) |
| `#D97706` | live-edit dot |
| `#15803D` | PUBLISHED pill text |
| `#DCFCE7` | PUBLISHED pill fill |
| `#F59E0B` | rating star |

### Overlays
Sheet scrim `rgba(28,25,23,0.4)` · modal scrim `rgba(27,38,59,0.549)` ·
Profile toast `rgba(28,25,23,0.92)` · Trips toast `#1C1917` ·
photo pills `rgba(28,25,23,0.72)` / `0.75`.

### Shadows
Sheet `0 -8px 32px rgba(28,25,23,0.14)` · modal `0 24px 60px rgba(27,38,59,0.28)`.

### Radius
2 (progress line) · 4 (CTA bars, ack box) · 8 (ack row) · 10 (small cover) ·
12 (trip cover) · 14 (postcard, modal, Profile toast) · 16 (diary/trip/itinerary card) ·
20 (sheet, `travelerRadii.sheet`) · 100 / 999 (pills, grabber, dots).

### Spacing
2 · 4 · 5 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 32.
Screen gutters: Profile 20, Trips 16 (header 24). Hit targets never below **44**.

### Type — Inter
| Size / line | Weight | Use |
|---|---|---|
| 28 / 34 | 700 | Trips screen title (ls −0.3) |
| 22 / 28 | 800 | profile name; avatar initials 700 |
| 17 / 22 | 700 | sheet title, modal title, itinerary title |
| 16 / 20 | 700 | stat value, modal CTA |
| 15 / 20 | 600–700 | menu entry, trip title, Plan a Trip, Cancel |
| 15 / 19 | 700 | diary + postcard title |
| 14 / 18 | 400–700 | tab labels |
| 13.5 / 19.6 | 400 | postcard caption |
| 13.5 / 19 | 400 | modal body |
| 13.5 / 18 | 400 | bio |
| 13.5 / 17 | 700 | Edit Profile, Undo (Profile) |
| 13 / 20 | 400–600 | tab-bar labels, empty copy |
| 13 / 17 | 400–700 | handle, sublines, toast label, rating |
| 12.5 / 17 | 600 | acknowledgement copy |
| 12 / 16 | 400–600 | trip subline, Archived link |
| 12 / 15 | 400–600 | diary subline, likes, swipe panel label |
| 11 / 14 | 400–700 | stat labels, pills, live-edit label |
| 10 / 13 | 700 | PUBLISHED pill (ls 0.4), photo counter |

---

## Assets
No bitmap assets. All covers and photos in the prototype are **linear-gradient placeholders**
standing in for user photography — replace with real image sources. All glyphs are inline
stroke SVG at Feather/Lucide geometry (stroke-width 2, round caps/joins); use the app's
existing icon set: `moreHorizontal`, `edit/pencil`, `link`, `trash`, `eyeOff`, `logOut`,
`search`, `star`, `heart`, `box`, `plusCircle`, `settings`, `check`, plus the tab-bar icons.

## Files
- `Profile Screen v2.dc.html` — the interactive prototype. Both screens side by side with
  a written spec column on the left. Everything is live: tabs, expansion, photo strip,
  kebab → sheet → collapse → undo on Profile; tabs, swipe, modal, undo on Trips.
  Two props are exposed for checking states: **Reduce Motion** and an accent colour.
- `support.js` — prototype runtime only. **Not** part of the design; do not port.

Related specs already in this project, for context on the primitives reused here:
`Trips Spec.dc.html`, `Profile Motion Spec.dc.html`, `Action Specs.dc.html`.
