# 13: Close-out — the gate

**What to build:** the proof that the story is whole, and the one commit the workflow requires last. The **assertion-line diff over the entire branch against `dev`**, on the TW-1 and CM-5 gate precedent: this story's claim is that nothing at the wire moved except what the grilling decided, and this is where that claim is made once for the branch rather than per ticket — every changed assertion explained by name and by grilling question, guard files and the meta-test excluded from the comparison because a guard is the branch's own apparatus. The full suites read by their counts, never their exit codes. The **device rung**: the LAN stack on a real phone as `t1` — Delete with a finger, Undo before the toast dies and the trip back on its tab, Delete again and the trip gone, a deep link into it answering not-found, `t2` (a member) seeing it gone from Trips and its pages not found, a postcard from the deleted trip still on `t1`'s profile and still editable; and the negative controls on a published trip (a member's plan write refused with the same words as before). Then the BUILD_STATUS row, the epic-map annotations made final, and the PR — which is the proposal and is not merged.

**Blocked by:** 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12 — every ticket.

**Status:** ready-for-agent

- [ ] The assertion-line diff over `dev...HEAD` reports every changed assertion, and each is explained on this ticket by the ticket that changed it and the grilling question that authorised it; nothing unexplained remains
- [ ] Backend: `mvn -B verify` green on CI with the `Tests run:` counts read from the log — the unit count and the IT count both — and no test class disappeared without a ticket naming its deletion; mobile: the full `npx jest` and `tsc --noEmit` green; Playwright `--list` reports the expected `Total`, and the PR's Playwright run is green
- [ ] The LAN stack stood up **on the founder's yes** per the recipe — the LAN IP grepped from the exported JS, CORS preflighted on the secured `/v1/me` with a negative control, `LARGATA_WEB_BASE_URL` naming the LAN origin — and the walk above performed on a real phone, its outcome recorded here in the founder's words; the secure-context caveat read first (nothing this story adds depends on one)
- [ ] The story's row in BUILD_STATUS reads ✅ with its spec link and nothing else; the quarantine ledger is still empty; the off-epic ledger carries no entry for this story
- [ ] Epic-map lines 187, 198, 212 and 354 carry their final annotations; ADR-040's status line records the merge date once the founder merges (a one-line follow-up, not this ticket's)
- [ ] `git diff --name-only` is empty before the last commit; the staged paths are compared both ways against what this branch edited
- [ ] The PR is opened against `dev` with the story id in its title and no attribution line, and is **not merged** — the founder says when
- [ ] The LAN stack is left up for the founder's use; the teardown commands are written on this ticket

## Comments

*None yet.*
