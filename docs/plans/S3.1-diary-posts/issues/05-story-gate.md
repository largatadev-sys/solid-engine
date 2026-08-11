# 05 — Story gate

**What to build:** The closing pass. Backend ITs (`mvn -o test-compile failsafe:integration-test`, counts read from the summary) and mobile suite green; the full two-traveler walk from the verified pool on the local stack — t1 posts a diary entry on an ongoing trip (device + dump photos), t2 confirms nothing of it is visible anywhere (viewer links are t2's own state, profile stub shows no diary, t2's media GETs refuse) — state which tag played which role; the retro path (completed trip) and the archived-read path walked; analytics events observed in the log (register #2). BUILD_STATUS's S3.1 row flips in the last commit on the feature branch; the squash-merge to `dev` is proposed, not executed.

**Blocked by:** 01 · 02 · 03 · 04.

**Status:** needs-triage

- [ ] Suites green with counts; typecheck clean; the walks close spec ACs 1–12 across web preview and emulator against the local full stack.
- [ ] The author-only proof is the two-account walk, with the discriminating checks (media 404 for t2, stub unchanged) — not the happy path alone.
- [ ] BUILD_STATUS updated in the final branch commit; promotion proposed per the standing workflow.
