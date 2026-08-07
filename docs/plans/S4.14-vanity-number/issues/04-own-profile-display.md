# 04 — Own-profile display + story close

**What to build:** the traveler sees their vanity number on their own profile — the badge finally visible, in the slot that today shows the raw UUID. No other surface renders it. This ticket also closes the story: the three-rung smoke and the tracker flip run here, last.

**Blocked by:** 01 (the wire field). The closing criteria (smoke + tracker flip) also wait for 03, so this ticket completes last.

**Status:** ready-for-agent

- [ ] The typed client model gains the vanity-number string; every access goes through the repository layer's typed client (ADR-001) — no raw fetch anywhere.
- [ ] The traveler's own profile screen renders the served string verbatim where the raw id shows today; rosters, cards, and every other surface are untouched. *(Founder call at implementation, 2026-08-08: the vanity number **replaces** the raw UUID rather than sitting beside it — the spec's problem statement calls the UUID "machine identity, meaningless to a human", and keeping both would have left the meaningless one on screen. The id is still in every `/v1/me` response and the database, so nothing is lost for debugging.)*
- [ ] Render tests cover both shapes: a founder's `"0"` and a scheme value like `"010042"`. *(Adjusted at implementation: this repo has no React render-testing library and adding one is a dependency decision outside this story. Both shapes are covered where the decision actually lives — `VanityNumberTest` pins the founder `"0"` and the scheme formatting including overflow, and `VanityNumberAllocationIT` asserts both shapes over HTTP. The screen itself renders the served string verbatim with no logic to test.)*
- [ ] Three-rung smoke per the standing rule: API assertion; emulator walk with the number visible on the profile; web-preview driver walk with the number visible and a clean error report.
- [ ] BUILD_STATUS: the S4.14 row flips to done with its spec link in the last commit on the feature branch, before any merge.
