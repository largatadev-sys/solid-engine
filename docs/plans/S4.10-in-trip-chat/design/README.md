# Handoff: Chat Tab (Workspace) — Largata

> **Archival note (agent, 2026-08-20).** This is the founder's handoff for the Claude Design chat canvas, transcribed clean — the copy that reached the session had its encoding mangled in transfer, so the original `Chat Spec.dc.html` + `support.js` are **not** archived from that copy. **Founder: drop the original two files beside this README, or record the live canvas link here** (the S2.1 precedent). The contracts below are normative either way (spec: Design baseline & deviations).

## Overview

The in-trip group chat for planning: one thread per trip, all members, **text only**. New feature — the tab exists as a coming-soon stub (`WorkspaceTabRow.tsx` key `'chat'`, `comingSoonSurface: 'chat'`); this ships the real surface.

## About the design files

`Chat Spec.dc.html` is a **design reference built in HTML** — open it in a browser with `support.js` beside it. It is not production code. Recreate it in this repo (React Native / Expo) using its established patterns and the theme module. Frame 0 (bottom right of the spec) is a **working demo** of the thread + composer running the exact motion contract — verify your build against it, including the failed-send flow (its "Fail next send" tweak).

## Fidelity

**High-fidelity.** Built on `src/theme/workspaceTokens.ts`. Use token names, not raw hex: accent = `workspaceColors.accent` (#EA580C), pressed accent = `accentFocus` (#E8613A), ink = `title` (#1C1917), muted (#78716C), hairline (#E7E5E4), pressed (#F5F5F4), placeholder (#A59E99). Wells: soft #FAFAF9, warm #FFF7ED with #FED7AA border. Copy strings are exact.

## Calls made beyond the brief (UX) — founder-ratified with the canvas

1. My bubbles are the **warm tinted well** (#FFF7ED, 1px #FED7AA), not solid accent — planning messages run long, ink-on-well reads better than white-on-orange at paragraph length, and accent stays reserved for the one action on screen (Send).
2. Avatar + handle render **once per sender group**, top-aligned; grouped bubbles sit 2px apart, groups 14px.
3. The character counter is **invisible until 1,900**; it never nags mid-message.
4. A failed message **holds its place** in the thread at 55% opacity — no modal, no toast, no reflow.
5. Composer grows to 4 lines then scrolls internally; the thread never loses more than 4 lines to input.

## Files to change (this repo)

- `src/itineraries/WorkspaceTabRow.tsx` — remove `comingSoonSurface: 'chat'` so the tab routes to the real screen.
- New: `src/chat/` — thread list, MessageBubble, Composer, failed-send row, empty + read-only states. Follow the shape of `WorkspaceTravelersTab.tsx` for the tab-content component contract (`itineraryId` prop).
- Wire the tab content where the other workspace tabs mount under `app/(tabs)/(trips)/itineraries/[id]/`.
- Avatar tints: stable per-member assignment from the existing profile palette (`profileColors.avatarWell`/`avatarInk` family).

## Component contracts — normative

### C1 · Thread + grouping

One thread per trip, newest at bottom, bottom-anchored (inverted FlatList). The thread body scrolls; no persistent scrollbar (platform transient indicator only). Consecutive messages from one sender within **5 min** group: avatar + handle once, bubbles 2px apart, last bubble gets the 6px sender-side corner. Inter-group gap 14. New content while scrolled up: keep scroll position, show a quiet "↓ New messages" pill (accent text on white, hairline border) — the only new-message affordance.

### C2 · MessageBubble

Text 14/19 ink both sides, max-width 256, padding 9×13, radius 18.

- **Others:** #FAFAF9 bg + 1px #E7E5E4; 28px initials avatar (stable per-member tint) + handle 11/600 muted (e.g. @mayasantos), once per group.
- **Mine:** #FFF7ED bg + 1px #FED7AA, right-aligned, never an avatar or handle. (Deliberate: warm well, not solid accent — long planning messages stay readable; accent is reserved for Send.)
- Long-press: platform copy-text sheet — nothing else.

### C3 · Time + date

Centered timestamp 11/600 #A59E99 only on gaps ≥ 20 min. Date separator = hairline · label · hairline between calendar days ("Today" / "Yesterday" / "Tuesday, March 3"). Never per-bubble timestamps.

### C4 · Composer

Docked bottom, hairline top. Field #FAFAF9 + 1px #E7E5E4, radius 20, padding 10×16, text 14/19, placeholder "Message…" #A59E99. Send = 36px circle, arrow-up: disabled (empty/whitespace) #F5F5F4 fill + #A59E99 glyph; enabled #EA580C + white, pressed #E8613A. Grows to 4 lines (~97px) then scrolls internally — no persistent scrollbar (web: `scrollbar-width: none`). Counter appears at 1,900 chars ("1,968 / 2,000", 11/600 #A59E99), turns #C2410C at the 2,000 hard cap. Enter = newline. Draft persists per trip across tab switches. Send clears the field immediately (optimistic append). Rides the platform keyboard animation — never custom timing.

### C5 · Failed send

Optimistic bubble dims to opacity 0.55; beneath it, right-aligned: "Couldn't send" 11/600 #B91C1C + **Retry** (12/600 accent) · **Discard** (12/600 muted), 44px hit areas. Retry restores opacity and re-attempts in place; Discard removes the bubble. Never a modal, toast, or auto-retry. Composer stays usable throughout.

### C6 · Empty + read-only

- Empty: 64px #FAF9F6 glyph well (muted chat-bubble outline) + one line 13/19 muted centered: **"Say hello — the plan starts here."** Composer present and auto-focused. No title, no CTA.
- Archived trip: thread renders normally; composer replaced by a notice bar — #FAFAF9, hairline top, 13/18 muted centered, exact copy **"This trip is archived — chat is closed."** No input, no failed-send affordances (undelivered drafts discarded on archive).

## Motion contract (native-first) — normative

Shared app vocabulary (from Polls/Profile): color/opacity 150ms ease-out · layout 200ms ease-in-ease-out · press 100ms in / 150ms out. Chat deliberately skips the 200ms bounce-pop and 300ms travel values.

- **M1 · Message entrance** — new bubble fades in + rises 8px, 150ms ease-out; opacity + translateY only, `Animated.timing` with `useNativeDriver: true`. No spring, no scale. Same for incoming. History loaded on scroll-back: **no animation**.
- **M2 · Send button** — disabled → enabled crossfades fill + glyph 150ms ease-out. No pop on send.
- **M3 · Composer growth** — height 200ms ease-in-ease-out per line up to 4 (`LayoutAnimation.easeInEaseOut`; thread rides the same layout pass). Web: explicit CSS height transition, same 200ms (LayoutAnimation is a no-op on react-native-web). Keyboard: platform animation.
- **M4 · Failed send** — dim to 0.55 over 150ms; error row fades in 150ms (no rise — it's an annotation, not a message). Retry: back to 1 over 150ms. Discard: fade out 150ms, list closes the gap with the 200ms layout value. Counter fades in 150ms at 1,900.
- **M5 · Press feedback** — Send, Retry, Discard, New-messages pill: opacity 1→0.85, 100ms in / 150ms release.

**Nothing else animates.** All motion transform/opacity, native driver. Reduce Motion: M1 and M3 jump-cut; the 150ms opacity fades stay.

## Ruled out — must not render anywhere

Read receipts, delivered/seen ticks, presence/online dots, typing indicator, unread badges or tab counts, reactions, reply-threading, mentions, and any attachment/camera/photo affordance. Chat is text-only by design.

## Files

- `Chat Spec.dc.html` — the spec: 5 artboards, contracts, live interactive demo (open in a browser) — **to be dropped in by the founder, see the archival note**
- `support.js` — runtime required by the spec file (keep beside it) — **ditto**
