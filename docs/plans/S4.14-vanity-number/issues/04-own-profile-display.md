# 04 — Own-profile display + story close

**What to build:** the traveler sees their vanity number on their own profile — the badge finally visible, in the slot that today shows the raw UUID. No other surface renders it. This ticket also closes the story: the three-rung smoke and the tracker flip run here, last.

**Blocked by:** 01 (the wire field). The closing criteria (smoke + tracker flip) also wait for 03, so this ticket completes last.

**Status:** ready-for-agent

- [ ] The typed client model gains the vanity-number string; every access goes through the repository layer's typed client (ADR-001) — no raw fetch anywhere.
- [ ] The traveler's own profile screen renders the served string verbatim where the raw id shows today; rosters, cards, and every other surface are untouched.
- [ ] Render tests cover both shapes: a founder's `"0"` and a scheme value like `"010042"`.
- [ ] Three-rung smoke per the standing rule: API assertion; emulator walk with the number visible on the profile; web-preview driver walk with the number visible and a clean error report.
- [ ] BUILD_STATUS: the S4.14 row flips to done with its spec link in the last commit on the feature branch, before any merge.
