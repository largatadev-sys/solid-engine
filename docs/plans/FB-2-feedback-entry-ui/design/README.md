# Handoff: Global feedback entry point (FeedbackDock + FeedbackSheet)

## Overview
Largata has no way for a traveler to say "this is broken" from where it broke. This work adds
one: a single floating control that exists on **every** screen — signed in or out — and a small
sheet behind it that collects three fields and sends them.

The data layer is **already shipped**. This is UI on top of it. Nothing in this handoff asks you
to invent an endpoint, a failure string, or a draft format.

| Shipped, do not rewrite | What it does |
|---|---|
| `src/feedback/reportDraft.ts` | `newReportDraft(segments)` mints a v4 reportId + screen string |
| `src/feedback/reportScreen.ts` | `screenStringOf` pairs a human label with the route pattern, capped at 200 chars |
| `src/feedback/screenLabels.ts` | `SCREEN_LABELS` — every route the app ships, guarded by a test |
| `src/feedback/submitReport.ts` | `submitReport(draft, fields)`, releases the draft on success only |
| `src/feedback/reportFailure.ts` | `failureOf(thrown)` → `{ message, retryable }` |
| `src/repositories/reportRepository.ts` | multipart POST to `/v1/reports`, caps screenshots at 3 |
| `src/feedback/useReportDraft.ts` | binds the draft to the live route segments |
| `src/feedback/appBuild.ts` | `appVersion()`, `reportPlatform()` |

## The two decisions worth reading before you build

**1. The button floats and the user positions it.** Not docked. A fixed button has to know about
every bottom action rail, every keyboard, every tab bar, on every screen — and it will still be
wrong on the screen nobody thought about. A draggable one is wrong once, and then the user fixes
it permanently. This deletes a whole class of rules: no keyboard-withdraw behaviour, no rail-height
context, no per-screen knowledge. The cost is discoverability while dimmed, paid back with a
launch wake.

**2. The UI says "feedback", never "report".** `PHOTO_SHEET_REPORT` in `src/feed/feedCopy.ts`
already means *reporting another traveler's postcard* — a moderation action, a different job. The
API route keeps its name. The UI does not borrow it.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended
look and behaviour, not production code to copy. The task is to **recreate these designs in the
Largata React Native / Expo app** using its existing components, tokens and motion constants.

`Feedback Button.dc.html` is **interactive** — open it in a browser and drive it:
- drag the bubble, it snaps to the nearer rail and keeps its y
- tap it, a real v4 uuid and a real screen string are minted from the simulated route
- the **Simulated response** panel picks what `POST /v1/reports` answers (201 / offline / 413 / 400)
  so every state is reachable
- **Fill to 1,847 characters** surfaces the counter, which is otherwise unreachable by hand

## Fidelity
**High-fidelity.** Colours, type, spacing, radii, durations and copy below are final and taken from
the codebase's own tokens. Recreate pixel-for-pixel using the app's existing primitives; where a
value below duplicates a token, use the token.

---

## Component 1 — FeedbackDock

Mounted **once** in `app/_layout.tsx` as a sibling above the navigator, inside the safe-area
provider and inside `MobileFrame`. **No props.** Never rendered per screen — that is how it reaches
`sign-in`, `verify-code`, `onboarding/*` and `join/[token]` without any of them knowing it exists.

### Anatomy
- 40×40 disc — `controls.navControl`, `borderRadius: radii.pill`.
- Surface `colors.surface`, 1px `colors.border`.
- Glyph 18px in `colors.accent`.
- Shadow rest `0 4px 14px rgba(27,38,59,0.10), 0 1px 2px rgba(27,38,59,0.06)`.
- Shadow dragging `0 10px 24px rgba(27,38,59,0.22), 0 2px 6px rgba(27,38,59,0.10)`.
- 44 hit target via `hitSlop: 2`.

### States
| State | Treatment |
|---|---|
| **Idle** | Opacity 0.4 after 2,600ms untouched. Still fully tappable — dimming is not disabling. |
| **Awake** | Opacity 1. On touch down, on hover with a mouse, on focus, and for 2,600ms after launch. |
| **Pressed** | `usePressFeedback` unchanged — scale 0.97, opacity 0.85, surface to #FAF9F6. |
| **Dragging** | Scale 1.08, deeper shadow, edge rails fade in behind it over 160ms. |
| **Sheet open** | Opacity 0, inert. It must not float over its own sheet. |

### Geometry
- **Horizontal is quantised.** On release it goes to the left or right rail — whichever its centre
  is nearer — at inset 16. It never rests mid-screen.
- **Vertical is free, then clamped**: between `safeArea.top + 12` and `safeArea.bottom + 12`.
  It may sit over the tab bar. The user put it there.
- **Drag starts after 4px.** Below that it is a tap — same threshold as the Trips swipe, so the two
  gestures read the same way.
- **Pointer capture on grab**, exactly as swipe-to-reveal does.
- **Default** `{ edge: 'right', y: 1 }` — right rail, bottom of the clamp.
- 12px of overdrag past each rail while the finger is down.

### Hooks
| Hook | Status |
|---|---|
| `useReportDraft()` | shipped. Called **on press**, so the draft carries the route the user was actually looking at. |
| `useSafeAreaInsets()` | shipped. Feeds the clamp — **floor top and bottom at 12** (see Web). |
| `useDockPosition()` | **new, platform-split.** `{ edge: 'left' \| 'right', y: number }`, y a 0–1 fraction of the clamped range, key `feedback.dock.position`. |

Use `Animated.ValueXY` for the live drag and `Animated.spring` for the snap. The drag writes
`translate`, never `left`/`top` — that is what keeps it composited on the web build.

### Accessibility
`accessibilityRole="button"`, label **"Send feedback"**. Last in the reading order on every screen,
so it never steals first focus. Screen readers and keyboards get the tap and an arrow-key nudge of
24px; the drag is a pointer affordance and the default position is already sensible.

---

## Component 2 — FeedbackSheet

A sheet, not a route — the screen being reported stays visible behind it, which is also the screen
the draft captured.

**Props:** `draft: ReportDraft | null` (presence opens it) · `onClose: () => void`.

**Owns:** `type`, `description`, `screenshots`, one `phase` of
`'editing' | 'sending' | 'failed' | 'sent'`, and the `ReportFailure` from `failureOf`.

> **Scope every async completion to a session token.** Increment a monotonic counter on open and on
> close; a submit callback that finds its captured token stale must return without writing state.
> Without this, a request from a previous open/close cycle lands after the reset and strands the
> sheet in `sending`. This is the same guard the delete-undo work uses.

### Chrome
- Container `colors.surface`, top corners `travelerRadii.sheet` 20, shadow `0 -8px 32px rgba(28,25,23,0.14)`, `padding-bottom: 24`.
- Grabber 36×4 radius 100 `colors.border`, `margin: 10px auto 0`.
- Scrim `colors.scrim` rgba(27,38,59,0.55).
- Header row padding `14px 20px 0`: title **"Send feedback"** 22/28 w700 `colors.textPrimary`;
  close 40×40 disc, 1px `colors.border`, 16px glyph.
- Body padding `16px 20px 0`, gap 20.

### Fields — exactly three, nothing else
**1 · Type** — two chips, row gap 8, each `flex: 1`, height 44, radius `radii.md` 12.
- Selected: fill `colors.accentTint`, 1px `colors.accent`, label 14/17 w600 `colors.accent`.
- Unselected: fill `colors.surface`, 1px `colors.border`, label 14/17 w600 `colors.textSecondary`.
- **Defaults to Problem.** Required in the contract either way, and the frustrated user is who this
  exists for.

**2 · Description** — label 14/17 w600 `colors.textPrimary`, text swaps with type:
"What happened?" / "What's your idea?".
- Field 140 tall, radius 12, **1px `colors.inputBorder` (#121212)**, padding `14px 16px`,
  16/22 w400. Placeholder "Tell us what you were doing and what went wrong."
- Hard-capped at 2,000. Nothing is silently truncated on send.
- **Counter** absent until 1,800, then 11/14 w600 `#A59E99`, turning `#C2410C` at the cap —
  the same rule the chat composer already uses.

**3 · Screenshots** — label 14/17 w600 + right-side note "Optional · up to 3" → "2 of 3".
- Tiles `flex: 1`, height 104, radius 12, filling left to right; the add tile is always last and
  disappears at `MAX_REPORT_SCREENSHOTS`.
- Add tile: fill #FAF9F6, 1px dashed #D6D3D1, 20px plus glyph + "Add" 11/14 w600, both `colors.textSecondary`.
- Remove: 24px disc `rgba(27,38,59,0.70)` at inset 6, 11px white X at stroke 3.

**No metadata section, no "which screen?" field, no identity fields — for anyone.** The bearer is
attached by the client when there is one; signed-out reports send no `Authorization` header and the
form looks identical.

### Send button
`Button` at height `controls.buttonHeight` 51, radius `radii.md`, `colors.accent`.
Inert at opacity 0.55 until the description has a character.

### Submitting
Fields dim to 0.55 and go inert, close is held, the button shows a spinner **and the word
"Sending…"**. Duplicates are impossible server-side, but a silent button reads as a dropped tap.

### Failure — one pattern, two behaviours
Banner above the button: `colors.surface`, 1px `colors.danger`, radius 12, padding 12, gap 10;
18px danger info glyph; message 14/20 w400 `colors.textPrimary` — the border and glyph carry the
alarm, the copy stays readable.

**Copy is rendered verbatim from `REPORT_FAILURES`. The banner never composes its own string.**

| Status | Retryable | Behaviour |
|---|---|---|
| offline (0) | yes | Button relabels to **"Try again"**. Form untouched. |
| 429 | yes | Same. |
| 5xx / unexpected | yes | Same. |
| 413 | no | Button stays **"Send"**, held inert until the user edits. Screenshots label and tile borders turn `colors.danger`. |
| 400 | no | Same, but the description border and counter turn `colors.danger`. |

Record the field values at the time of failure so a non-retryable error re-enables Send the moment
anything actually changes. **Nothing is ever cleared.**

Retry replays the **same reportId** — the draft is released only on success and the server
deduplicates, so the retry button can be prominent and guilt-free.

### Discard guard
Scrim tap or swipe-down with a non-empty description does **not** discard. The sheet stays and the
description border flashes `colors.danger` for 300ms. Only the close X discards, and it discards
outright. A frustrated user should not lose the paragraph they just typed to a stray tap.

> Read the live description from state inside the handler, not from a value closed over at render —
> otherwise the guard tests a stale string and dismisses when it should block.

### Thank-you — terminal
No status, no ticket number, no "my reports". Contents crossfade in place.
- 64px disc `colors.surfaceMuted`, 30px `checkCircle` in `colors.success`.
- Title "Thanks — that helps" 22/28 w700, margin-top 36.
- Body "A real person reads every one of these. There is nothing else for you to do." 13/20 w400
  `colors.textSecondary`, centred, max-width 266.
- **One exit:** "Done", full width, height 51, `colors.accent`, margin-top 36. The close X is gone
  in this state. Scrim tap still dismisses. No auto-dismiss — let them read it.

---

## Web

The app ships a web build — `MobileFrame.web.tsx`, the `e2e/web` suite, and a `.web.ts` half for
every platform-sensitive module. A floating draggable control has more web failure modes than a
docked one, so they are enumerated rather than discovered later.

### Rules
- **Anchor to the frame, not the window.** The app renders inside `MOBILE_FRAME_WIDTH` 393, centred
  in a much wider page. Mount the dock inside `MobileFrame`'s own relatively-positioned container so
  `position: absolute` resolves against 393 on web and the screen on native. **Never `position: fixed`** —
  a transformed ancestor silently breaks it.
- **`touchAction: 'none'` on the 40px disc only.** Without it a mobile browser treats the drag as a
  page scroll. Scoped, so the feed still scrolls around it.
- **Pointer events, not touch events** — one path for finger, mouse and stylus, with
  `setPointerCapture` on grab so a fast drag is not dropped when the pointer outruns the disc.
- **Suppress the click after a drag** — a pointer-up past 4px must not also fire the tap.
- **Suppress the long-press menu** — `onContextMenu → preventDefault`, `user-select: none`,
  `-webkit-touch-callout: none`. Holding the bubble to move it should not offer to save an image.

### Differences
- **Storage.** `useDockPosition.native.ts` → AsyncStorage; `.web.ts` → `window.localStorage` behind
  the same `typeof window === 'undefined'` guard `recentsStore.web.ts` already uses. Same shape, same key.
- **Safe areas are zero on web.** `useSafeAreaInsets()` returns 0s in a browser, so the clamp would
  run to the very edge. Floor top and bottom at 12 rather than trusting the hook.
- **The viewport resizes constantly.** Mobile browsers collapse the URL bar on scroll; desktop windows
  get dragged. Because y is a fraction, re-clamp on layout change and the dock keeps its proportional
  place instead of drifting under the toolbar.
- **Hover exists.** Wake on hover with `cursor: grab` / `grabbing`. Under `@media (pointer: fine)`
  skip the idle fade entirely — a mouse user is not obstructed by it and dimming only costs discoverability.
- **Keyboard reachable.** Focusable, 2px `colors.accent` `:focus-visible` ring at 2px offset.
  Enter and Space open the sheet; arrow keys nudge 24px, then it re-snaps and persists like a drag.

---

## Motion

| Moment | Constant | Behaviour |
|---|---|---|
| Launch wake | `launchWakeMs` 2600 | Full opacity on cold start, then settles. Once per session. |
| Idle fade | `idleAfterMs` 2600 · `idleFadeMs` 400 · `idleOpacity` 0.4 | Untouched 2.6s → 40%. Skipped under a fine pointer. |
| Wake | `wakeMs` 120 | Touch down, hover, or focus. |
| Grab | `liftMs` 120 · `liftScale` 1.08 | Scale up, shadow deepens, pointer captured, rails fade in 160ms. |
| Drag | none | Follows the pointer 1:1, 12px overdrag past each rail. |
| Snap | `snapMs` 340 · stiffness 220 · damping 26 | Springs to the nearer rail. Vertical kept, then clamped. |
| Press | `pressInMs` 100 · `pressOutMs` 150 | `usePressFeedback`. |
| Keyboard nudge | `nudgePx` 24 · `snapMs` 340 | Re-snaps and persists like a drag. |
| Scrim in / out | `scrimInMs` 200 · `scrimOutMs` 150 | Shipped workspace drawer values. |
| Sheet in / out | `travelInMs` 300 · `travelOutMs` 200 | Travels from below, no stagger. |
| Type chip select | `rowSelectMs` 150 | Border and label cross to accent, fill washes in. |
| Screenshot added | `popMs` 200 · from scale 0.5 | Tile pops, add tile slides right over `layoutMs` 200. |
| Screenshot removed | `layoutMs` 200 | Row closes the gap, add tile reappears. |
| Counter appears | `crossfadeMs` 150 | At 1,800. Colour crosses at 2,000. |
| Send pressed | `inFlightOpacity` 0.85 | Fields dim to 0.55 and lock. |
| Failure banner | `advisoryInMs` 200 · `advisoryRisePx` 6 · `advisoryOutMs` 150 | Rises above the button; button relabels on the same frame. |
| Discard flash | `stateChangeMs` 150 ×2 | Description border to danger and back, once. |
| Form → thank-you | `crossfadeMs` 150 then `popMs` 200 | Then sheet height animates down over `layoutMs` 200. |

**Reduce Motion.** Snap becomes a 150ms linear move rather than a spring; the drag lift drops to a
shadow change with no scale; rises and pops become plain crossfades. The launch wake **stays** — it
is information, not decoration. The idle fade stays. On web read
`prefers-reduced-motion` as well as `AccessibilityInfo`.

---

## Changes to shipped code

Only three. Everything else composes existing parts.

1. **`src/components/Button.tsx`** — add optional `busyLabel?: string`. When busy and set, render
   the spinner and label side by side with gap 10 instead of the spinner alone. Default behaviour
   unchanged everywhere else.
2. **`src/components/Icon.tsx`** — add `'feedback'`: the existing `comment` bubble path plus a
   3.6-unit stem and a dot at 12.4. It has to read as "something is wrong here", not "reply".
3. **`src/theme/workspaceTokens.ts`** — add the block below. Dragging has no precedent in the app,
   so the snap and idle need their own constants.

```ts
export const feedbackDockMotion = {
  dragThresholdPx: 4,
  liftScale: 1.08,
  liftMs: 120,
  snapMs: 340,
  snapStiffness: 220,
  snapDamping: 26,
  snapMass: 1,
  idleAfterMs: 2600,
  idleOpacity: 0.4,
  idleFadeMs: 400,
  wakeMs: 120,
  launchWakeMs: 2600,
  nudgePx: 24,
} as const;
```

No new colour, radius, spacing step or type ramp entry is introduced by this work.

### One inconsistency to note, not to fix here
The description field uses `colors.inputBorder` (#121212) per the brand spec for inputs. Shipped
`FormField.tsx` renders `colors.border` (#E2E4E8) instead. The sign-in mock in the canvas draws
what `FormField` actually ships. Worth reconciling app-wide — but not as a side effect of this work.

---

## Design Tokens

### Colour — all from `src/theme/tokens.ts`
| Token | Value | Use |
|---|---|---|
| `background` | #FAF9F6 | screen, tab bar |
| `surface` | #FFFFFF | sheet, dock, cards |
| `surfaceMuted` | #F2F1ED | thank-you disc |
| `border` | #E2E4E8 | hairlines, dock border, close disc |
| `textPrimary` | #1B263B | titles, body, field labels |
| `textSecondary` | #5C6470 | sublines, add tile, notes |
| `textOnAccent` | #FFFFFF | CTA labels |
| `accent` | #D96C4A | glyph, selected chip, CTA, focus ring |
| `accentTint` | rgba(217,108,74,0.0627) | selected chip fill |
| `scrim` | rgba(27,38,59,0.549) | sheet scrim |
| `danger` | #B3261E | banner border/glyph, field-at-fault marks, discard flash |
| `success` | #2F6B47 | thank-you check |
| `inputBorder` | #121212 | description field |

Non-token literals used: #FAF9F6 add-tile fill, #D6D3D1 add-tile dash, #A59E99 counter,
#C2410C counter at cap — all already present elsewhere in the app's screens.

### Radius
`radii.md` 12 (chips, field, tiles, banner, CTA) · `travelerRadii.sheet` 20 (sheet top corners) ·
`radii.pill` 100 (dock, grabber, remove disc, thank-you disc).

### Spacing
`spacing`: 4 · 6 · 8 · 10 · 12 · 16 · 20 · 24 · 36. Sheet gutter 20. Dock inset 16.
Hit targets never below **44**.

### Type — Inter
| Size / line | Weight | Use |
|---|---|---|
| 22 / 28 | 700 | sheet title, thank-you title |
| 16 / 22 | 400 | description input |
| 16 / 19 | 600 | CTA labels (`typography.action`) |
| 14 / 20 | 400 | failure message |
| 14 / 17 | 600 | field labels, type chips (`typography.label`) |
| 13 / 20 | 400 | screenshot note, thank-you body (`typography.caption`) |
| 11 / 14 | 600 | counter, add-tile label |

## Assets
No bitmap assets. Screenshot tiles in the prototype are linear-gradient placeholders standing in for
gallery images. All glyphs are inline stroke SVG at Feather/Lucide geometry (stroke-width 2, round
caps/joins) — use the app's existing `Icon` set: `feedback` (new), `close`, `plus`, `checkCircle`,
`info`, plus the tab-bar icons.

## Files
- `Feedback Button.dc.html` — **the primary reference.** Interactive: draggable dock, live sheet,
  simulated API responses, all four failure shapes, thank-you. Also carries the geometry diagram,
  the browser mock, the motion table and the wiring notes.
- `Feedback Entry & Report Flow.dc.html` — the earlier canvas. Static artboards of the form in
  context (signed-in feed, signed-out sign-in), the empty / filled / at-limit form, submitting and
  both error shapes, and the thank-you. **Its placement sections (01–04) are superseded** by the
  draggable dock; its form and error specification still stands.
- `support.js` — prototype runtime only. **Not** part of the design; do not port.
