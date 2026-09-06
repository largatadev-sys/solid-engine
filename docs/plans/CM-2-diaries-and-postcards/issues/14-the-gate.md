# 14: The gate

**What to build:** the proof that CM-2 is what it claims: a traveler can tell a past trip and post a moment from nowhere, everything posted before still reads the same, and the old app still works.

**Blocked by:** 13 (ADR-036, the glossary re-cut, and the epic-map lines).

**Status:** ready-for-agent

- [ ] The full backend suite is green with every new IT and every pre-existing one — counts read from the `Tests run:` lines, never the exit code
- [ ] Playwright is green in both lanes on the preview container, the `Total:` line read before the tick
- [ ] The device walk closes what no suite reaches: the native picker into a day card, real touch on the calendar and the sheets, Reduce Motion on the toasts and confirms, safe-area insets on the compose screens — each recorded in the ticket's comments with the tag that played each role
- [ ] The backfill has been rehearsed against a database holding real pre-story postcards, and the same postcards read back through the new profile and the old paths with the same photo ids
- [ ] The BUILD_STATUS row lands in the branch's last commit before the PR, status and spec link only
- [ ] The PR to dev is opened as the proposal, with the four owner rulings' outcomes recorded in its body, and never merged unasked

## Comments

## Comments

- *2026-09-06, partial — the walks have run once:* on the local stack (fresh DB, the backend rebuilt with the candidate-dates read), the three CM-2 web walks ran against the **Metro lane** with one worker — the container lane blows the 30s hook budget's twin, and one worker is what removed the false timeouts three parallel spec files produced on a cold bundle. **16 of 16 pass** (`memory-setup` 4, `diary-tab` 4, `diary-detail` 8), after four assertions were moved to the frames the fidelity pass built. A fourth spec, kept out of the tree, drove every frame and screenshotted it for the review artifact — 23 frames, all read against the handoff. **Still owed at this gate:** the preview-container lane (the documented one, `npm run smoke` shape), the API lane, the device walk, the BUILD_STATUS row, and the PR.
- *2026-09-06, owed:* the Diary tab honours Reduce Motion (M5) as the public tab it replaced did; the other memory primitives — the sheet's rise, the toast's drop, the confirm's fade, the check's pop, the day cards' entrance — still animate at full length under Reduce Motion. A pass over `MemorySheet`, `MemoryToast`, `MemoryConfirm`, `PhotoTiles` and `DiaryDaysScreen` through `useReducedMotion` is owed before the device walk signs off motion.
