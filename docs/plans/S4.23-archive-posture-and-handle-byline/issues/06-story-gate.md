# 06 — Story gate

**What to build:** The closing pass, the S3.4/S4.18 shape: full verification on the rungs that matter, the record updated, nothing riding along. Backend ITs (`mvn -o test-compile failsafe:integration-test`, counts read from the summary, never the exit code) and the full mobile suite + typecheck. `smoke-all` against the fresh local stack. The founder-visible fix walked through the UI with two pool travelers (state which tag played which role): the owner archives a trip both hold postcards on — the member's diary tab no longer lists it, the owner's still does; a member-side write probe answers the mask on the wire. The byline walked on web **and eyeballed on the emulator** — trailing text in a row is the phone-frame defect class nothing else catches. Confirm the ADR-017 amendment, the ADR-008 waiver, the discharged backlog lines and the new departed-postcards line all landed with the spec commit. BUILD_STATUS's S4.23 row flips in the last commit on the feature branch; squash-merge to `dev` proposed, not executed (promotions are propose-first).

**Blocked by:** 01 · 02 · 03 · 04 · 05.

**Status:** ready-for-agent

- [ ] Backend and mobile suites green with counts read from the summaries; typecheck clean; `smoke-all` run and read.
- [ ] The two-traveler archive walk closes spec ACs 1–5 through the UI on web preview, with the member-arm wire probes on the API rung.
- [ ] Byline ACs closed on web walk + emulator screenshot (spec ACs 7, 9).
- [ ] The record is whole: canon amendments landed, BUILD_STATUS row updated in the final branch commit, promotion proposed not executed.
