# 04: Workspace moves; the exemption, the two windows and the script are born

**What to build:** the first physical move, and the apparatus every later move runs behind. Workspace is the one slice that can move alone: after ticket 03 its only outbound reference into another module is the trip api's own membership-arrived event, and its only inbound callers are the old package and membership, both of which are about to follow. Its eleven files become the trip module's workspace slice, the two row-backed resolvers that implement the authorization seams moving with it, and its seven integration tests take package and import edits only.

Three things are born with it. The trip guard gains its **permanent legacy exemption**: the old package alone is named as a permitted consumer of trip internals, with a sabotage check that the predicate selects more than thirty classes and a message naming the decommissioning story as its dissolution — the content half reaches in today and is deleted at that story, not rewritten here. Both guards gain one **named, branch-local window** each: the regex guard's lets a moved trip file name an unmoved old-world class, the allowlist guard's lets an unmoved satellite depend on a moved trip internal; each is sabotage-checked while it lives and is deleted by ticket 07. And the **assertion-diff script** lands: a short script that takes each changed test file's assertion lines before and after the branch's changes and fails on any difference. It runs here first and is the headline of every move ticket after.

**Blocked by:** 03 (The three interfaces, implemented in place, and eight consumers cut over).

**Status:** ready-for-agent

- [ ] The workspace package no longer exists; its files live in the trip module's workspace slice; the seven workspace integration tests pass with package and import edits only
- [ ] The legacy exemption names the old package alone, selects more than thirty classes, and carries a message naming the decommissioning story
- [ ] Each guard has exactly one window, named as such, and each is sabotage-checked: emptying it turns the guard red on the breach it is holding open — recorded in this ticket's comments with the failure line read
- [ ] The assertion-diff script exists, is invoked by one documented command, reports zero differences for this ticket's test edits, and fails when an assertion is deliberately changed — recorded in this ticket's comments
- [ ] Hibernate's schema validation passes at the first context boot, proving no table moved
- [ ] Every integration test passes with no edited assertion

## Comments
