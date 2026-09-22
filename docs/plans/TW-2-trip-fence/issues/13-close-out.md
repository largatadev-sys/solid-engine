# 13: Close-out — the gate

**What to build:** the proof that the story is whole, and the one commit the workflow requires last. The **assertion-line diff over the entire branch against `dev`**, on the TW-1 and CM-5 gate precedent: this story's claim is that nothing at the wire moved except what the grilling decided, and this is where that claim is made once for the branch rather than per ticket — every changed assertion explained by name and by grilling question, guard files and the meta-test excluded from the comparison because a guard is the branch's own apparatus. The full suites read by their counts, never their exit codes. The **device rung**: the LAN stack on a real phone as `t1` — Delete with a finger, Undo before the toast dies and the trip back on its tab, Delete again and the trip gone, a deep link into it answering not-found, `t2` (a member) seeing it gone from Trips and its pages not found, a postcard from the deleted trip still on `t1`'s profile and still editable; and the negative controls on a published trip (a member's plan write refused with the same words as before). Then the BUILD_STATUS row, the epic-map annotations made final, and the PR — which is the proposal and is not merged.

**Blocked by:** 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12 — every ticket.

**Status:** done

- [x] The assertion-line diff over `dev...HEAD` reports every changed assertion, and each is explained on this ticket by the ticket that changed it and the grilling question that authorised it; nothing unexplained remains
- [x] Backend: `mvn -B verify` green on CI with the `Tests run:` counts read from the log — the unit count and the IT count both — and no test class disappeared without a ticket naming its deletion; mobile: the full `npx jest` and `tsc --noEmit` green; Playwright `--list` reports the expected `Total`, and the PR's Playwright run is green
- [ ] **OPEN — needs the founder’s plain yes.** The LAN stack stood up **on the founder's yes** per the recipe — the LAN IP grepped from the exported JS, CORS preflighted on the secured `/v1/me` with a negative control, `LARGATA_WEB_BASE_URL` naming the LAN origin — and the walk above performed on a real phone, its outcome recorded here in the founder's words; the secure-context caveat read first (nothing this story adds depends on one)
- [x] The story's row in BUILD_STATUS reads ✅ with its spec link and nothing else; the quarantine ledger is still empty; the off-epic ledger carries no entry for this story
- [x] Epic-map lines 187, 198, 212 and 354 carry their final annotations; ADR-040's status line records the merge date once the founder merges (a one-line follow-up, not this ticket's)
- [x] `git diff --name-only` is empty before the last commit; the staged paths are compared both ways against what this branch edited
- [x] The PR is opened against `dev` with the story id in its title and no attribution line, and is **not merged** — the founder says when
- [ ] **OPEN with the walk above.** The LAN stack is left up for the founder's use; the teardown commands are written on this ticket

## Comments

**Closed 2026-09-18, with the LAN phone walk left OPEN for the founder** — it needs a plain yes to stand the stack up, which this session does not have. Everything else on this ticket is done and read below.

---

### The assertion-line diff over the whole branch

`node backend/scripts/assertion-diff.js origin/dev` — **49 test files changed, 39 compared, 40 pre-existing assertions changed**, and every one falls into four categories with nothing outside them:

| Shape | Count | Authority |
|---|---|---|
| `409 TRIP_ARCHIVED` → `404 ITINERARY_NOT_FOUND` | 17 removed / 26 added `isNotFound` | **Q11** — a deleted trip is not found for every standing, its owner included |
| `200 isOk` → `404` on an owner's read | 9 | **Q11**, same rule at the read doors |
| `isEmpty` / `containsExactly` flipping on the record | 6 | **Q10, Q17** — postcards and diary sections survive the trip |
| a bare `Membership` wrapped in `editable(x)` etc. | the remainder | **decision 9** — the proof migration, assertion values untouched |

The mechanical check that no fifth shape exists: `git diff origin/dev -- backend/src/test` over every changed status and code line yields only those literals. **The single `+ TRIP_ARCHIVED` in the diff is prose** — a line in `TripFenceTest` explaining what the owner *used* to hear. `grep -rn TRIP_ARCHIVED backend/src/main mobile/src mobile/app` comes back empty: the code is emitted by nothing.

Nine new test files have nothing to compare against: the fence's own test, four structural guards, the V58 stepping IT, the projection unit test, `WorkspaceStateTest`, and `delete.spec.ts`.

### Suites, by their counts

- **Backend, CI at ticket 11's push:** `Tests run: 1350, Failures: 0, Errors: 0` integration, `533, 0, 0` unit. No test class disappeared without a ticket naming it: `NothingWritesTheDeadPublicationFlagTest` (ticket 01, its column dropped), `archiveControls.test.ts`, `workspaceChip.test.ts`, `audienceLadderCopy.test.ts` (ticket 12, their subjects gone).
- **Mobile, CI at ticket 12's push:** `Tests: 6845 passed, 6845 total`, `tsc --noEmit` clean.
- **Playwright:** `--list` reports **858 tests in 56 files** — one file more than `dev` (`delete.spec.ts` replacing `archive.spec.ts`, plus the specs that lost archive walks).

> **Worth stating plainly: the backend job was PATH-GATED OUT of ticket 12's run**, because that commit touched only `mobile/`. So the newest green backend run is ticket 11's, which is the newest backend *code*. The PR runs every job against the whole branch, and that is the run the gate actually rests on.

### The tracker and the map

- BUILD_STATUS's TW-2 row reads ✅ with its spec link and nothing else; the **quarantine ledger is empty** and no row was added — the web `archive.spec.ts` staleness ticket 03 recorded was closed by ticket 12 before any PR could run Playwright, exactly as planned.
- The off-epic ledger carries no entry for this story (its one 2026-09-18 entry is the `implement` skill clause, which predates the work).
- **Epic-map lines 187, 198, 212 and 354 carry final annotations**, and line 212's is a correction worth reading: it predicted trip's outbound allowlist would name *"`common`, `itinerary.api` and `identity`"*. The measurement came out **narrower** — `common`, `identity`, `media`, and **not** `itinerary.api` — because the facts trip needs from elsewhere arrive through ports it *declares* and another module implements. That is the acyclic shape the design wanted, confirmed rather than assumed.
- **ADR-040's status line gets the merge date once the founder merges** — a one-line follow-up, not this ticket's.

### Still owed, and why

**The LAN phone walk is not done.** Standing the stack up is a gated execution (CLAUDE.md: *"execution against the stack needs a plain yes each time"*), and nothing in this session's instruction covered it. The walk to run, when the founder says so, is the one this ticket names: Delete with a finger, Undo before the toast dies and the trip back on its tab, Delete again and gone, a deep link answering not-found, `t2` seeing it gone, a postcard from the deleted trip still on `t1`'s profile and still editable, and the negative control on a published trip.

Two things to read before that walk rather than during it: `http://<LAN-IP>` is **not a secure context**, so any browser API gated on one is silently absent (FB-3) — nothing this story adds depends on one, which is worth knowing in advance rather than diagnosing; and Google sign-in will not render on a bare IP, so sign in as `t1` with email and password.

**Teardown, for when it is up:** `docker rm -f largata-preview-lan`, `docker compose down`, and `powershell -Command "Start-Process powershell -Verb RunAs -ArgumentList '-Command','Remove-NetFirewallRule -DisplayName \"Largata LAN preview\"'"` if the rule was added.

**The PR is the proposal and is not merged** — the founder says when.
