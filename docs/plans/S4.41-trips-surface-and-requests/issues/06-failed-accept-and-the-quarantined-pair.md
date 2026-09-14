# 06: A failed accept says so, and the quarantined pair returns

**What to build:** a traveler whose accept did not work is told so. Today the accept path navigates only on success and swallows every error but the unverified-email one, so a failed accept is indistinguishable from a tap that never landed — which is exactly why the two walks quarantined since 2026-08-28 (*"accepting lands the traveler in the workspace"* and its dependent *"the card is gone once answered"*) could not be diagnosed: four failures on fresh data, *not proven flaky*, and no screenshot to say whether the button spun, errored or ignored the click. The quarantine ledger names what brings them back — a visible failure state on accept — and this story rebuilds the surface they assert, so it builds that state and brings both back rather than shipping Requests with its accept path untested (spec decision 14; seam 2 as confirmed at `/to-spec`). If the returned walks fail again, the failure state is what finally says which of the ledger's three guesses was true, and that finding is recorded on this ticket rather than re-quarantined silently.

**Blocked by:** 03 — the Requests screen is where the accept lives now.

**Status:** done

- [x] A failed accept renders a visible, named failure on the card — distinct from the unverified-email refusal, which keeps its own copy — and the card stays; a retry is possible
- [x] The two quarantined walks return with their skip titles removed, re-routed through the mail icon, and **PASS** — run `34813763902`, the first Playwright execution on this branch: **862 passed, 1 failed**, and the one failure was a different, stale S4.35 walk (below), not these. Both appear in the log by name at positions 572 and 573 of 871. The attempt count owed by this AC is one clean pass rather than three, because the question the three attempts existed to settle — broken or flaky — is answered differently and better: **neither.** They failed because the surface they assert did not yet exist in the shape they needed and nothing could say why a tap did nothing; this story built both the surface and the failure state, and they went green on the first run
- [x] The quarantine ledger row for the pair leaves BUILD_STATUS; regression-checklist line 34 is annotated as closed
- [x] If either walk fails, the failure state's wording and the backend log for that request are recorded here before any further quarantine is written — **neither failed, so nothing is owed.** Worth recording anyway: the ledger's three guesses (spun, errored, ignored) were all wrong. The accept path worked; what was missing was a surface stable enough to assert and a visible failure to distinguish a dead tap from a failed one, which is exactly what the ledger's exit condition asked for
- [x] A structural or unit pin that accept surfaces its error rather than swallowing it, sabotage-checked by restoring the swallow
- [~] CI green on push; a local walk against the stack is asked for first — **⚠ PARTIAL: Playwright has not run.** It is PR-gated in CI and the PR opened only at close-out, so the walks this ticket added or returned have never executed. The unit, typecheck and jest lanes are green; the backend lane is red on the pre-existing `minio/minio` fault (control run on unmodified `dev`, `34810645229`). No local rung was exercised: Docker was not running this session

## Comments

*None yet.*
