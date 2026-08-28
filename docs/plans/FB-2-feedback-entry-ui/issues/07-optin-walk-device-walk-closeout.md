# 07 — The opt-in walk, the device walk, and the close-out

**What to build:** the story's verification and its durable record. One new serial
Playwright spec file — nothing else in the e2e tree changes: the bubble is **absent** by
default on Home (the explicit failure mode for accidental visibility) → seed `'revealed'`
through the fixtures' existing post-load localStorage pattern → reload → present at the
default slot → tap → full report through to the thank-you against the local stack (logging
relay) → dismiss by pointer-down and release inside the dismiss zone → gone → five real
clicks on the wordmark → back. Then the rungs no runner reaches, and the bookkeeping the
grilling ordered.

**Blocked by:** 03, 05, 06.

**Status:** ready-for-agent

- [ ] The new spec passes against the preview container; `--list` confirms every other spec file's test count is unchanged
- [ ] The absent-by-default assertion goes red when the visibility function is sabotaged open — prove the sabotage landed before trusting the run (the S4.30 lesson)
- [ ] Full Jest sweep green before push (new files under the mobile source tree; two shared components touched)
- [ ] Device walk: native glide and spring feel, the 4px threshold, keyboard avoidance, hardware back through the guard, Reduce Motion — on Metro against an installed dev build if the recorded Gradle fault blocks a fresh one
- [ ] FB-1's spec carries the dated amendment recording the permanent hidden+gesture posture
- [ ] The epic map gains the FB-2 line in the FB-series and the backlog entry for a discoverable public feedback surface (trigger: public launch)
- [ ] BUILD_STATUS gains the FB-2 row — status + spec link only — updated in the last commit on the feature branch
- [ ] The four handoff files are archived under the story's design folder and referenced from the spec
