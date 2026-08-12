# S4.22 — the mock's behaviors against the spec's ACs

**Why this exists.** *(founder, 2026-08-13, on the running build: "I think those should be ACs. I'm seeing some inconsistencies within the behavior.")* The spec compressed all six of the design file's behavior cards into **one decision** (decision 8) and produced **three** acceptance criteria from roughly twenty distinct behaviors — AC 8 for the carousel, AC 9 for liking, AC 12 for the pill. Each of those criteria bundles several independent claims behind a single `and`, so one half passing carries the other half unexamined.

Two defects reached the founder's screen through exactly that gap, and both are instructive:

- **The caption's inline "more" had no AC at all.** It rendered unconditionally, so a one-line caption offered a "more" that expanded nothing. Nothing in the story was obliged to look, and no walk asserted a caption until the founder pointed at it.
- **The heart burst was bundled into AC 9** with the like. The like worked, so the criterion passed — while the burst had never been observed on web by any check, only on a device screenshot.

This file is the audit before the amendment: every behavior the design file specifies, what verifies it today, and where the holes are. **Read the Verdict column as the honest answer, not the intention.**

Source: `Home Feed Spec.dc.html` in the Claude Design project `34e84995-d099-46dd-a784-3b762a09d6f4` — behavior cards 1–6 plus the phone frame. The mock is normative (spec Further Notes).

---

## Card 1 — Photo carousel

| # | Behavior, as the mock states it | Verified by | Verdict |
|---|---|---|---|
| 1.1 | Horizontal paged swipe, snaps one photo per page | device `dev2/dev4.png` (real touch, 3/3 then lands 2/3); web drag 239px then snap restored | ✅ |
| 1.2 | Directional lock — first ~10px decides the axis; once horizontal, vertical scroll is dead until release | web: diagonal drag moves strip 120, feed 0. Structural via pointer capture (web) and `pagingEnabled` (native) | ✅ |
| 1.3 | Rubber-band overscroll at the ends | — | ❌ **no check, and the mock's `overscroll-behavior-x: contain` is absent from the implementation** |
| 1.4 | No wrap-around | `feedCarousel.test.ts` — `landingPage` clamps at both ends | ✅ Jest |
| 1.5 | Dots always visible | device screenshots | ✅ |
| 1.6 | Sliding window, max 5 dots, shrinking edge dots past 5 | `feedCarousel.test.ts` — window slides, pins at both ends, active page always inside | ⚠️ Jest only — never rendered with >5 photos on any rung |
| 1.7 | "n/N" counter appears on swipe | device `dev2.png` (visible right after a swipe) | ✅ |
| 1.8 | …and fades after 1.5s idle | device `dev4.png` (absent after settle) | ⚠️ observed once, not timed |
| 1.9 | Preload current ±1 only | `loadsPage()` in the render; `feedCarousel.test.ts` covers the predicate | ⚠️ Jest + source; no rung proves neighbours-only actually loads |
| 1.10 | Per-card page index survives recycling | page map held by the screen, not the row | ⚠️ **source-only — no test, no walk** |

## Card 2 — Double-tap to like

| # | Behavior | Verified by | Verdict |
|---|---|---|---|
| 2.1 | Double-tap anywhere on the photo likes | device `dev5.png` (56→57); web walk | ✅ |
| 2.2 | White heart burst draws over the photo | device `dev5.png`; web walk measures the SVG mid-animation (drawn, 92px, opacity 1) | ✅ *(added 2026-08-13 — the founder's finding)* |
| 2.3 | Burst timing: spring ~280ms, hold, fade | — | ❌ **no check; drawn is proven, timed is not** |
| 2.4 | Light haptic on trigger | `lightHaptic()` at the call site, platform-forked | ⚠️ **source-only; no test asserts the call, and a device haptic is unobservable to any harness** |
| 2.5 | Idempotent — a second double-tap replays the burst and never unlikes | `feedEngagement.test.ts` (`burstLiked`); web walk (Like → Unlike → Unlike) | ✅ |
| 2.6 | Single tap on the photo is a deliberate no-op | `photoTapped` only records a point | ⚠️ **source-only — no test, no walk** |
| 2.7 | Taps that move >10px are swipes, not taps | `doubleTap.test.ts` — `TAP_SLOP` in both axes | ✅ Jest |

## Card 3 — Like / engagement row

| # | Behavior | Verified by | Verdict |
|---|---|---|---|
| 3.1 | Heart toggles optimistically, instant fill + count | web walk round trip 771→772→771; device | ✅ |
| 3.2 | Scale pop 1 → 1.3 → 1 (~150ms) | `POP_SCALE`/`POP_MS` in the component | ⚠️ **source-only** |
| 3.3 | Count animates ±1 | value change proven; the *animation* is not — the count is re-rendered, not tweened | ❌ **specified, not built** |
| 3.4 | Compact formatting past 999 ("1.2k") | `feedCard.test.ts` (truncation, boundaries); seen as "1.2k"/"1.3k" on the rung | ✅ |
| 3.5 | Comment opens post detail | out of scope — the post-detail screen is a later story; refuses honestly | ✅ deviation, recorded |
| 3.6 | Share sheet / Save with toast + undo | stubbed; refuses under its own name | ✅ deviation, recorded |
| 3.7 | Every 16–18px icon padded to ≥44×44 | `HIT_SLOP` 12 on each side, **on top of** the control's own 6px vertical padding: 18 + 12 + 24 = 54px for the heart | ✅ by arithmetic; ⚠️ never measured on a rung |

## Card 4 — Feed scrolling & header

| # | Behavior | Verified by | Verdict |
|---|---|---|---|
| 4.1 | Header hides after 24px of downward scroll | `headerVisibility.ts` + 7 Jest cases; web walk (rest 0 → down −51) | ✅ |
| 4.2 | Reappears on any upward scroll | same, plus the jitter case | ✅ |
| 4.3 | ~180ms ease | `HEADER_SLIDE_MS` | ⚠️ source-only |
| 4.4 | Status-bar area stays opaque | the header is inside the safe-area inset; screenshots show it opaque | ✅ |
| 4.5 | Pull-to-refresh, terracotta tint | `RefreshControl` with `colors.accent` | ⚠️ **source-only — no walk pulls it; RefreshControl is not drivable in headless Chrome** |
| 4.6 | Prepends new posts | it **refetches** rather than prepending; observable result matches | ⚠️ mechanic deviation, recorded in Comments |
| 4.7 | "You're caught up" toast when nothing new | web walk, read promptly (the toast lives <2s) | ✅ |
| 4.8 | Home re-tap: scrolled → smooth to top | web walk (1200 → 0) | ✅ |
| 4.9 | Home re-tap at top → refresh | web walk (feed re-read, then the toast) | ✅ |
| 4.10 | Scroll offset restored on return | web walk (500 out, 500 back) | ✅ |

## Card 5 — Pagination & fresh content

| # | Behavior | Verified by | Verdict |
|---|---|---|---|
| 5.1 | Cursor-based pagination | `PostcardFeedIT` walks to exhaustion with a repeat-cursor guard | ✅ IT |
| 5.2 | Fetch next when 3 cards from the end | `prefetchThreshold` 0.3 | ⚠️ source-only, and 0.3 of viewport ≠ "3 cards" — an approximation |
| 5.3 | Two skeleton cards while loading | `SKELETON_CARDS = 2`; rendered in the pending state | ⚠️ source + pending-state render; not observed mid-page-load |
| 5.4 | Terminal card, no spinner loops | web walk (terminal card at exhaustion) | ✅ |
| 5.5 | ~60s poll while scrolled down | walk waits one real cycle; asserts the poll RAN | ✅ |
| 5.6 | Pill drops below the header when fresh posts exist | web walk | ✅ |
| 5.7 | Tap → scroll to top + prepend | web walk (y=0, fresh caption first) | ✅ |
| 5.8 | Never yanks scroll uninvited | web walk (700 → 700 across a whole poll cycle) | ✅ |
| 5.9 | Page failure → inline retry row, not full-screen | `FeedFooter` failed branch | ⚠️ **source-only — no rung induces a page failure** |

## Card 6 — Tap targets & navigation

| # | Behavior | Verified by | Verdict |
|---|---|---|---|
| 6.1 | Avatar / name → traveler profile | web walk taps the avatar; refuses ("Traveler profiles") | ✅ stub |
| 6.2 | Trip line + Trip Post badge → the published itinerary, scrolled to that day | web walk + IT for the reference. The trip line reaches the published itinerary; **the badge reaches the author's public trip diary instead** (founder, 2026-08-13 — the published surface is not ready), and the day anchor does not exist | ⚠️ partial, recorded in Comments |
| 6.3 | Location tag → the activity within the itinerary | the pin now reads `place` and navigates where the trip line does *(founder correction, 2026-08-12; V29 snapshots it)* | ⚠️ lands on the trip, not the activity |
| 6.4 | Caption clamps at 2 lines with inline "more" | `captionClamp.ts` + 5 Jest cases; web walk asserts "more" on the long caption and NOT the short; device screenshot | ✅ *(fixed 2026-08-13 — the founder's finding)* |
| 6.5 | Expands in place, card grows, no navigation | `expanded` state, no router call | ⚠️ source-only — no walk expands it and re-measures |
| 6.6 | Long-press → sheet: Save to trip ideas · Share · Report | web walk (real press-and-hold, three labels, Report refuses by name); device `dev7.png` | ✅ |

---

## The honest tally

**41 behaviors. 23 fully verified on a rung. 15 source-only or Jest-only. 3 not built as specified.**

The three that are **not built** — these need a decision, not just a test:

1. **1.3 Rubber-band ends** — the mock's `overscroll-behavior-x: contain` is simply missing from the strip. A one-line fix.
2. **3.3 Count animates ±1** — the count re-renders rather than tweening. Cosmetic, and the number is correct either way.
3. **5.2 "Fetch when 3 cards from the end"** — implemented as `onEndReachedThreshold: 0.3`, which is 0.3 of a viewport, not three cards. An approximation, not the stated rule.

Two more are **partial rather than absent**: 2.3 (the burst draws and fades, but not on the mock's spring/hold/fade profile) and 6.2/6.3 (the trip line and pin navigate, but the day anchor and activity anchor do not exist — already recorded in Comments).

Corrections to the earlier verbal summary, which this audit exists to replace: **3.7 hit areas are fine** — I had mis-added, forgetting that `hitSlop` stacks on the control's own padding (54px, not 42px). And the three items that summary called gaps — preload, haptic, single-tap — are all **built and source-verifiable**; they lack tests, which is a smaller debt than being absent.

## What the amendment should do

- Promote each behavior card to its own **numbered AC block**, one line per behavior above, so no `and` hides a second claim.
- Close the four not-built items, or record each as a deviation with its reason.
- Convert the highest-value source-only items into checks: 1.10 (per-card index), 2.6 (single tap), 5.9 (page-failure retry), 6.5 (expand in place). These are the ones where a silent regression would reach a traveler.
- Leave as source-only, with the reason stated: 2.4 (a haptic no harness can observe), 4.3/3.2 (animation durations), 4.5 (`RefreshControl` is undrivable in headless Chrome — the device rung is its only honest home).

---

## Amended 2026-08-13 — what changed after this audit

The behaviors above are now **numbered acceptance criteria B1–B6 in the spec**, one claim per line. What the amendment did to the four open items:

| Item | Then | Now |
|---|---|---|
| **B1.3** rubber-band ends | absent — the mock's `overscroll-behavior-x` was never applied | **built.** `SNAP_STYLE` carries `overscrollBehaviorX: 'contain'`; verified in the served bundle, not just the source |
| **B5.2** three cards from the end | `onEndReachedThreshold: 0.3` — RN's units are visible-length, so ~1 card | **built.** `prefetchThreshold(cardHeight, viewport)` derives the fraction from the measured geometry; 5 Jest cases including the pre-measurement fallback |
| **B3.3** count tween | not built | **deviation, recorded.** The number it would animate is a random stub; the real-likes story inherits it |
| **B3.6** hit areas | reported as 42px, two short | **was never wrong** — I had mis-added. `hitSlop` stacks on the control's padding: 54px |

Four source-only behaviors gained tests, chosen because a silent regression in each reaches a traveler: **B1.10** (page memory lives on the screen and is keyed by card id, so recycling cannot lose it), **B2.6** (the single tap records and returns — no like, no burst, no navigation), **B5.5** (the retry row renders in the footer, and the full-screen state is reserved for a first load with nothing to show), **B6.7** (expanding drops the clamp and calls no router, and nothing re-clamps).

Left source-only deliberately, with the reason: **B2.4** the haptic (no harness can observe a vibration), **B3.2 / B4.3** animation durations, **B4.4** `RefreshControl`'s tint (undrivable in headless Chrome — the device rung is its only honest home).
