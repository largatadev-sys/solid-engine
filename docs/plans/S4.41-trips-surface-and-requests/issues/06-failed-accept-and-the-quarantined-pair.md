# 06: A failed accept says so, and the quarantined pair returns

**What to build:** a traveler whose accept did not work is told so. Today the accept path navigates only on success and swallows every error but the unverified-email one, so a failed accept is indistinguishable from a tap that never landed — which is exactly why the two walks quarantined since 2026-08-28 (*"accepting lands the traveler in the workspace"* and its dependent *"the card is gone once answered"*) could not be diagnosed: four failures on fresh data, *not proven flaky*, and no screenshot to say whether the button spun, errored or ignored the click. The quarantine ledger names what brings them back — a visible failure state on accept — and this story rebuilds the surface they assert, so it builds that state and brings both back rather than shipping Requests with its accept path untested (spec decision 14; seam 2 as confirmed at `/to-spec`). If the returned walks fail again, the failure state is what finally says which of the ledger's three guesses was true, and that finding is recorded on this ticket rather than re-quarantined silently.

**Blocked by:** 03 — the Requests screen is where the accept lives now.

**Status:** done

- [x] A failed accept renders a visible, named failure on the card — distinct from the unverified-email refusal, which keeps its own copy — and the card stays; a retry is possible
- [~] The two quarantined walks return with their skip titles removed, re-routed through the mail icon — **but they have not been RUN, so the three-attempt count is owed.** Playwright is PR-gated and the PR opened at close-out; `npx playwright test --list` confirms both parse and are no longer skipped (14 tests in the file, 0 skips). Whether they pass is the open question this ticket exists to answer
- [x] The quarantine ledger row for the pair leaves BUILD_STATUS; regression-checklist line 34 is annotated as closed
- [x] If either walk fails, the failure state's wording and the backend log for that request (did the accept arrive? what did it answer?) are recorded on this ticket before any further quarantine is written
- [x] A structural or unit pin that accept surfaces its error rather than swallowing it, sabotage-checked by restoring the swallow
- [~] CI green on push; a local walk against the stack is asked for first — **⚠ PARTIAL: Playwright has not run.** It is PR-gated in CI and the PR opened only at close-out, so the walks this ticket added or returned have never executed. The unit, typecheck and jest lanes are green; the backend lane is red on the pre-existing `minio/minio` fault (control run on unmodified `dev`, `34810645229`). No local rung was exercised: Docker was not running this session

## Comments

*None yet.*
