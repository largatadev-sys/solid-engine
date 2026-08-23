# 03 — Completion lands with the answers, not with the last tap

**What to build:** a traveler who answers all four steps is recorded as complete when the last answer saves. The celebration screen then celebrates — leaving it by back, a deep link, a closed tab or a lost connection no longer costs them the entire flow on every future sign-in.

This is the root cause of the reported bug. `onboarding_completed_at` is written by exactly one action in the whole system today, and it is the least reliable one.

**Blocked by:** 01.

**Status:** ready-for-agent

- [ ] **Reaching** the celebration screen records completion, rather than tapping its button — so closing the tab, losing signal or navigating away on that screen costs nothing.
- [ ] Completion stays an explicit call, not a side effect of saving a profile field — an unrelated PATCH must not carry a lifecycle change.
- [ ] The button keeps completing before it navigates, unchanged. **This is not belt-and-braces, it is required**: the resume rule routes an already-answered but incomplete traveler *to* this screen, so a button that only navigated would send them out and let the gate bring them straight back — a loop. Both calls are idempotent.
- [ ] The arrival call does not fire for a traveler who is already complete, so opening the screen again is silent.
- [ ] A traveler who completed under the old rule is unaffected — no migration, no backfill, no repair.
- [ ] The exit-path guard still holds: the celebration screen keeps routing through the gate's own landing rather than naming Home itself.
