# 03 — The Chat tab: contracts C1–C6 and motion M1–M5, verbatim

**What to build:** the surface, to the canvas. The design baseline is normative (`design/README.md` beside this spec — the founder's handoff, contracts transcribed exactly). Copy the frames; read the canvas markup for any answer before inventing one; deviate only where the platform forces it, and say so.

**Blocked by:** 02 — the data layer it renders.

**Status:** done

- [x] `src/chat/`: thread list (inverted, bottom-anchored), `MessageBubble`, `Composer`, failed-send row, empty state, read-only notice — the tab-content component takes the `WorkspaceTravelersTab` contract (`itineraryId` prop); mounted where the other workspace tabs mount; `comingSoonSurface: 'chat'` removed from `WorkspaceTabRow`.
- [x] C1 thread + grouping: 5-min sender groups (avatar + handle once, 2px intra / 14px inter, 6px sender-corner on the last bubble); on new content while scrolled up, **keep position** + the "↓ New messages" pill — the only new-message affordance; token names, never raw hex.
- [x] C2 bubbles: others `#FAFAF9`/hairline + 28px initials avatar (stable per-traveler tint from the profile palette) + handle 11/600; mine the warm well (`#FFF7ED`/`#FED7AA`), right-aligned, never avatar or handle; long-press = platform copy sheet, nothing else.
- [x] C3 time: centered gap timestamps ≥ 20 min only; date separators Today/Yesterday/weekday-form, device-local from UTC instants; never per-bubble.
- [x] C4 composer: docked, 4-line growth then inner scroll (no persistent scrollbar), send-button state pair, counter at 1,900 → red at the 2,000 hard stop, Enter = newline, platform keyboard animation only.
- [x] C5 failed send + C6 empty (exact copy, composer auto-focused) and read-only archived (exact copy, no input, no failed-send affordances) — copy strings verbatim from the baseline.
- [x] Motion M1–M5 exactly: 150ms entrance fade-rise (no animation on history pages), 150ms send-button crossfade, 200ms composer growth (`LayoutAnimation` native / CSS height transition on web — the Profile M2 fallback), M4's failure/recovery fades, 100/150 press. **Nothing else animates**; Reduce Motion cuts M1/M3, keeps the fades.
- [x] Pure modules in `chatThread.ts` (grouping, gap/date rules, counter thresholds, tint assignment) — Jest without rendering (the `landingSlot.ts` precedent); the RN-web seams this surface will meet are documented: `Pressable`-in-`Link` style rules (S4.26), `nativeEvent.timestamp` never read (S4.22 — the clock is read directly), `flexShrink: 0` on trailing controls in rows (S3.1).
- [x] Register-#2 analytics on send; the archived state discards the draft (ticket 02's store hook).

## Comments

**2026-08-21 — the surface, built against the canvas the founder supplied at implementation.** The original `Chat Spec.dc.html` + `support.js` arrived with this ticket's work and are now archived in `design/`, closing the spec's archival note. Every number below was read off the canvas markup rather than inferred from the transcription: bubble geometry (max-width 256, padding 9×13, radius 18 with the 6px sender corner on the group's last bubble), the 28/2/14 avatar-and-gap metrics, the composer's 40px floor and 4-line ceiling, the counter's 1,900 threshold and its `#C2410C` at cap.

**The motion contract maps onto values this app already had**, which is the point of the canvas's "shared vocabulary" block: `tripTabMotion` already carried 150ms/8px (M1) and 100/150/0.85 (M5), and the poll module already had the `LayoutAnimation`-vs-CSS platform fork M3 requires. `chatMotion` names the values for chat rather than minting new numbers. M2's crossfade uses `useNativeDriver: false` deliberately — it interpolates `backgroundColor`, which the native driver cannot animate; everything else (M1, M4, M5) is transform/opacity on the native driver.

**Reduce Motion cuts M1 and M3 and keeps the fades**, exactly as the contract says: `MessageEntrance` sets its value to 1 outright rather than animating, `animateComposerGrowth` is skipped, and M2/M4's opacity timings are untouched.

**Three RN-web seams were respected up front rather than discovered.** Every `Pressable` style is a `StyleSheet.flatten([...])` object, never a function or array (S4.26 — a function is silently dropped and an array white-screens). The clock is read directly with `Date.now()`/`new Date()`, never `nativeEvent.timestamp` (S4.22). The trailing send button carries `flexShrink: 0` so it cannot lose the row's last pixels (S3.1).

**The ruled-out list is enforced by a test, not by care.** `chatTab.test.ts` greps the five surface components for unread/receipt/typing/reaction/presence/seen/delivered/mention/badge as **word-boundary regexes**. The first draft used plain substrings and failed on `unseen` — my own scroll state, which decision 7 explicitly permits (the pill is a client-side affordance, not unread state). A substring scan would have forced a rename to satisfy a test that was wrong; the word-boundary version tests the actual rule, and a companion case pins that the pill's copy carries no digit.

**Two pre-existing tests legitimately retired.** Chat was the last greyed tab, so `pollsTab`'s *"stays greyed for the surfaces S2.1 did not build"* and `photoDumpGrid`'s anti-vacuity guard (`greyed.length > 0`) both became false. Rather than delete the coverage, the first now asserts Chat is live and the second was replaced by a stronger claim — **every** tab on the row opens to itself.
