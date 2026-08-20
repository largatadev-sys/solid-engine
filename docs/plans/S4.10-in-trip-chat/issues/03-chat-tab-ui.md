# 03 — The Chat tab: contracts C1–C6 and motion M1–M5, verbatim

**What to build:** the surface, to the canvas. The design baseline is normative (`design/README.md` beside this spec — the founder's handoff, contracts transcribed exactly). Copy the frames; read the canvas markup for any answer before inventing one; deviate only where the platform forces it, and say so.

**Blocked by:** 02 — the data layer it renders.

**Status:** ready-for-agent

- [ ] `src/chat/`: thread list (inverted, bottom-anchored), `MessageBubble`, `Composer`, failed-send row, empty state, read-only notice — the tab-content component takes the `WorkspaceTravelersTab` contract (`itineraryId` prop); mounted where the other workspace tabs mount; `comingSoonSurface: 'chat'` removed from `WorkspaceTabRow`.
- [ ] C1 thread + grouping: 5-min sender groups (avatar + handle once, 2px intra / 14px inter, 6px sender-corner on the last bubble); on new content while scrolled up, **keep position** + the "↓ New messages" pill — the only new-message affordance; token names, never raw hex.
- [ ] C2 bubbles: others `#FAFAF9`/hairline + 28px initials avatar (stable per-traveler tint from the profile palette) + handle 11/600; mine the warm well (`#FFF7ED`/`#FED7AA`), right-aligned, never avatar or handle; long-press = platform copy sheet, nothing else.
- [ ] C3 time: centered gap timestamps ≥ 20 min only; date separators Today/Yesterday/weekday-form, device-local from UTC instants; never per-bubble.
- [ ] C4 composer: docked, 4-line growth then inner scroll (no persistent scrollbar), send-button state pair, counter at 1,900 → red at the 2,000 hard stop, Enter = newline, platform keyboard animation only.
- [ ] C5 failed send + C6 empty (exact copy, composer auto-focused) and read-only archived (exact copy, no input, no failed-send affordances) — copy strings verbatim from the baseline.
- [ ] Motion M1–M5 exactly: 150ms entrance fade-rise (no animation on history pages), 150ms send-button crossfade, 200ms composer growth (`LayoutAnimation` native / CSS height transition on web — the Profile M2 fallback), M4's failure/recovery fades, 100/150 press. **Nothing else animates**; Reduce Motion cuts M1/M3, keeps the fades.
- [ ] Pure modules in `chatThread.ts` (grouping, gap/date rules, counter thresholds, tint assignment) — Jest without rendering (the `landingSlot.ts` precedent); the RN-web seams this surface will meet are documented: `Pressable`-in-`Link` style rules (S4.26), `nativeEvent.timestamp` never read (S4.22 — the clock is read directly), `flexShrink: 0` on trailing controls in rows (S3.1).
- [ ] Register-#2 analytics on send; the archived state discards the draft (ticket 02's store hook).
