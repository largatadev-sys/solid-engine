# 03 — Completion lands with the answers, not with the last tap

**What to build:** a traveler who answers all four steps is recorded as complete when the last answer saves. The celebration screen then celebrates — leaving it by back, a deep link, a closed tab or a lost connection no longer costs them the entire flow on every future sign-in.

This is the root cause of the reported bug. `onboarding_completed_at` is written by exactly one action in the whole system today, and it is the least reliable one.

**Blocked by:** 01.

**Status:** ready-for-agent

- [ ] Answering the last data step records completion, so a traveler who never reaches the celebration screen is still complete.
- [ ] Completion stays an explicit call, not a side effect of saving a profile field — an unrelated PATCH must not carry a lifecycle change.
- [ ] The celebration screen's button only navigates. Reaching that screen twice, or leaving and returning, changes nothing (the completion call is already idempotent).
- [ ] A traveler who completed under the old rule is unaffected — no migration, no backfill, no repair.
- [ ] The exit-path guard still holds: the celebration screen keeps routing through the gate's own landing rather than naming Home itself.
